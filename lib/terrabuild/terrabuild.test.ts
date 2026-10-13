import { describe, expect, it } from 'vitest';
import { CASA_REFERENCIA, FAZENDA_001 as P } from '@/content/projetos/fazenda-inteligente-001';
import { balancoAgua, fracaoCheiaTalhao, riscoClimatico, simularCultura } from './agro';
import { classificar, INTENCOES, responder, SUGESTOES, type ContextoAssistente } from './assistente';
import { avaliarCenarios } from './cenarios';
import { CLASSE, CLASSES, orcamento } from './custos';
import { mzn, variacao as fmtVariacao } from './formato';
import { cantos, intersectam } from './geometria';
import { interferencias, poligonosElemento } from './interferencia';
import { avancar, concluida, iniciar, NADA_GUARDADO, PASSOS } from './marcos';
import { capitalTotal, contarNaFase, estadoNaFase, hectaresPorTalhao, resumoCapital } from './obra';
import { medidas, quantidades, type CasaConfig } from './quantidades';
import { posicaoSol } from './sol';
import { altura, curvasDeNivel, fracaoCheia, grelha } from './terreno';
import { compararVersoes } from './variacao';

const casa110: CasaConfig = { ...CASA_REFERENCIA, comprimento: 11, largura: 10 };

describe('quantidades e custos', () => {
  it('mede a casa de referência (90 m²) com fórmulas à vista', () => {
    const m = medidas(CASA_REFERENCIA);
    expect(m.area).toBe(90);
    expect(m.perimetro).toBe(38);
    expect(m.areaParedes).toBeGreaterThan(100);
    for (const l of quantidades(CASA_REFERENCIA)) {
      expect(l.quantidade, l.id).toBeGreaterThan(0);
      expect(l.formula.length, l.id).toBeGreaterThan(5);
    }
  });

  it('o total soma as categorias e vem com a faixa da classe', () => {
    const o = orcamento(CASA_REFERENCIA, 'conceptual');
    const soma = Object.values(o.porCategoria).reduce((s, v) => s + v, 0);
    expect(soma).toBe(o.total);
    expect(o.faixa[0]).toBe(Math.round(o.total * 0.7));
    expect(o.faixa[1]).toBe(Math.round(o.total * 1.5));
  });

  it('as faixas apertam à medida que a classe amadurece', () => {
    const larguras = CLASSES.map((c) => CLASSE[c].menos + CLASSE[c].mais);
    for (let i = 1; i < larguras.length; i++) expect(larguras[i]).toBeLessThan(larguras[i - 1]!);
  });

  it('telha cerâmica pede mais madeira do que chapa', () => {
    const chapa = quantidades(CASA_REFERENCIA).find((l) => l.id === 'madeira')!.quantidade;
    const telha = quantidades({ ...CASA_REFERENCIA, cobertura: 'telha-ceramica' }).find((l) => l.id === 'madeira')!.quantidade;
    expect(telha).toBeGreaterThan(chapa);
  });
});

describe('variação entre versões', () => {
  it('de 90 para 110 m² o custo sobe e a frase diz porquê, com os números da tabela', () => {
    const v = compararVersoes(CASA_REFERENCIA, casa110);
    expect(v.percentagem).toBeGreaterThan(10);
    expect(v.percentagem).toBeLessThan(30);
    expect(v.frase).toContain('aumentar a casa de 90 m² para 110 m²');
    expect(v.frase).toContain('subiu');
    expect(v.frase).toContain(mzn(v.delta));
    expect(v.fatores).toHaveLength(3);
    expect(v.frase).toContain(v.fatores[0]!.nome.toLowerCase());
  });

  it('sem mudanças diz que não mudou', () => {
    expect(compararVersoes(CASA_REFERENCIA, CASA_REFERENCIA).frase).toMatch(/não mudou/);
  });

  it('baixar o acabamento diz «baixar», não «subir»', () => {
    const v = compararVersoes({ ...CASA_REFERENCIA, acabamento: 'superior' }, { ...CASA_REFERENCIA, acabamento: 'medio' });
    expect(v.frase).toContain('baixar o acabamento para médio');
    expect(v.delta).toBeLessThan(0);
  });

  it('formata a variação com sinal', () => {
    expect(fmtVariacao(17.4)).toBe('+17 %');
    expect(fmtVariacao(-3.6)).toBe('−4 %');
  });
});

describe('interferências da implantação', () => {
  it('a posição de referência está livre', () => {
    expect(interferencias(P, CASA_REFERENCIA)).toEqual([]);
  });
  it('encostada à estrada transversal, acusa sobreposição', () => {
    const c = interferencias(P, { ...CASA_REFERENCIA, y: 155 });
    expect(c.map((x) => x.elemento)).toContain('estrada-transversal');
    expect(c.find((x) => x.elemento === 'estrada-transversal')!.tipo).toBe('sobreposicao');
  });
  it('perto da vedação, acusa o limite', () => {
    expect(interferencias(P, { ...CASA_REFERENCIA, x: 3 }).some((x) => x.tipo === 'limite')).toBe(true);
  });
  it('dentro da área de expansão, avisa que está reservada', () => {
    expect(interferencias(P, { ...CASA_REFERENCIA, x: 60, y: 222 }).some((x) => x.tipo === 'area-futura')).toBe(true);
  });
});

describe('sol', () => {
  it('ao meio-dia do equinócio, a 19° S, o sol está a norte a ~71°', () => {
    const s = posicaoSol(12, 80);
    expect(s.elevacao).toBeGreaterThan(69);
    expect(s.elevacao).toBeLessThan(73);
    expect(Math.min(s.azimute, 360 - s.azimute)).toBeLessThan(3);
  });
  it('de manhã vem de este e à tarde de oeste', () => {
    expect(posicaoSol(8, 80).azimute).toBeGreaterThan(45);
    expect(posicaoSol(8, 80).azimute).toBeLessThan(135);
    expect(posicaoSol(16, 80).azimute).toBeGreaterThan(225);
    expect(posicaoSol(16, 80).azimute).toBeLessThan(315);
  });
});

describe('terreno', () => {
  it('é determinístico e desce de noroeste para sudeste', () => {
    expect(altura(P.terreno, 100, 100)).toBe(altura(P.terreno, 100, 100));
    expect(altura(P.terreno, 20, 280)).toBeGreaterThan(altura(P.terreno, 380, 20));
  });
  it('tem uma zona de cheia, mais no talhão 4 do que no 1', () => {
    const g = grelha(P.terreno, 10);
    expect(fracaoCheia(g)).toBeGreaterThan(0.01);
    expect(fracaoCheia(g)).toBeLessThan(0.3);
    expect(fracaoCheiaTalhao(P, 't4')).toBeGreaterThan(fracaoCheiaTalhao(P, 't1'));
  });
  it('gera curvas de nível', () => {
    const c = curvasDeNivel(grelha(P.terreno, 10), 2);
    expect(c.length).toBeGreaterThan(3);
    expect(c.every((x) => x.d.startsWith('M'))).toBe(true);
  });
});

describe('dados fictícios coerentes', () => {
  it('é uma demo, com 10 fases por ordem', () => {
    expect(P.demo).toBe(true);
    expect(P.fases.map((f) => f.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it('cada elemento está dentro do terreno e aponta para um componente existente', () => {
    const comps = new Set(P.componentes.map((c) => c.id));
    for (const e of P.elementos) {
      for (const pol of poligonosElemento(e))
        for (const [x, y] of pol) {
          expect(x, e.id).toBeGreaterThanOrEqual(-0.5);
          expect(y, e.id).toBeGreaterThanOrEqual(-0.5);
          expect(x, e.id).toBeLessThanOrEqual(P.terreno.largura + 0.5);
          expect(y, e.id).toBeLessThanOrEqual(P.terreno.profundidade + 0.5);
        }
      if (e.componente) expect(comps.has(e.componente), e.id).toBe(true);
      expect(e.fases[0]).toBeLessThanOrEqual(e.fases[1]);
    }
  });
  it('as construções não se sobrepõem umas às outras nem às estradas', () => {
    const solidos = P.elementos.filter((e) => ['caixa', 'cilindro', 'painel'].includes(e.forma.tipo));
    const estradas = P.elementos.filter((e) => e.id.startsWith('estrada'));
    for (let i = 0; i < solidos.length; i++) {
      const a = poligonosElemento(solidos[i]!)[0]!;
      for (let j = i + 1; j < solidos.length; j++)
        expect(intersectam(a, poligonosElemento(solidos[j]!)[0]!), `${solidos[i]!.id} × ${solidos[j]!.id}`).toBe(false);
      for (const r of estradas) for (const q of poligonosElemento(r)) expect(intersectam(a, q), `${solidos[i]!.id} × ${r.id}`).toBe(false);
    }
  });
  it('os cenários só usam elementos e culturas que existem, dentro da área cultivável', () => {
    const ids = new Set(P.elementos.map((e) => e.id));
    const ha = hectaresPorTalhao(P);
    const arLivre = ['t1', 't2', 't3', 't4'].reduce((s, t) => s + (ha[t] ?? 0), 0);
    for (const c of P.cenarios) {
      for (const e of c.elementos) expect(ids.has(e), `${c.id}: ${e}`).toBe(true);
      const ar = c.culturas.filter((x) => !['banana', 'tomate-estufa'].includes(x.cultura)).reduce((s, x) => s + x.hectares, 0);
      expect(ar, c.id).toBeLessThanOrEqual(arLivre + 1e-9);
      for (const x of c.culturas) expect(P.culturas.some((k) => k.id === x.cultura), x.cultura).toBe(true);
    }
  });
  it('o orçamento dos componentes bate com o capital do terreno (±10 %)', () => {
    const r = resumoCapital(P);
    const capital = capitalTotal(P, CASA_REFERENCIA);
    expect(Math.abs(r.orcamento - capital) / capital).toBeLessThan(0.1);
    expect(r.libertado).toBeLessThanOrEqual(r.orcamento);
  });
});

describe('obra por fase', () => {
  it('na fase 0 nada está construído; no fim tudo está concluído ou reservado', () => {
    expect(contarNaFase(P, 0).ausentes).toBe(P.elementos.length);
    const fim = contarNaFase(P, 9);
    expect(fim.concluidos + fim.futuros).toBe(P.elementos.length);
  });
  it('a casa principal está em obra na fase atual (cobertura)', () => {
    const casa = P.elementos.find((e) => e.id === 'casa-principal')!;
    expect(estadoNaFase(casa, P.faseAtual)).toBe('em-obra');
  });
});

describe('agricultura e cenários', () => {
  it('simula produção, receita, equilíbrio e água', () => {
    const milho = P.culturas.find((c) => c.id === 'milho')!;
    const r = simularCultura(milho, 2);
    expect(r.producaoT).toBeCloseTo(18);
    expect(r.receita).toBeCloseTo(18_000 * 18);
    expect(r.precoEquilibrio!).toBeLessThan(milho.preco);
    expect(r.aguaM3).toBe(20_000);
    expect(simularCultura(milho, 2, 'pessimista').receita).toBeLessThan(r.receita);
  });
  it('a água do furo cobre o milho em 2 ha e o risco climático é calculável', () => {
    const milho = P.culturas.find((c) => c.id === 'milho')!;
    const b = balancoAgua(P, simularCultura(milho, 2).aguaM3);
    expect(b.cobertura).toBeGreaterThan(100);
    expect(['baixo', 'medio', 'alto']).toContain(riscoClimatico(milho, b.cobertura, 0.3).nivel);
    expect(riscoClimatico(milho, 50, 0).nivel).not.toBe('baixo');
  });
  it('A < B < C em investimento; todos com retorno finito e B mais rápido do que A', () => {
    const [a, b, c] = avaliarCenarios(P, CASA_REFERENCIA);
    expect(a!.investimento).toBeLessThan(b!.investimento);
    expect(b!.investimento).toBeLessThan(c!.investimento);
    for (const r of [a, b, c]) {
      expect(r!.retornoAnos, r!.id).not.toBeNull();
      expect(r!.retornoAnos!, r!.id).toBeLessThan(25);
    }
    expect(b!.retornoAnos!).toBeLessThan(a!.retornoAnos!);
    expect(a!.emissoesEvitadasT).toBe(0);
  });
});

describe('marcos (simulação)', () => {
  it('percorre os 8 passos e termina sem guardar nada', () => {
    const comp = P.componentes.find((c) => c.id === 'solar')!;
    let s = iniciar(comp);
    for (let i = 1; i < PASSOS.length; i++) s = avancar(s, comp);
    expect(concluida(s)).toBe(true);
    expect(s.registo.at(-1)).toBe(NADA_GUARDADO);
    expect(avancar(s, comp)).toBe(s);
  });
  it('não avança com outro componente', () => {
    const [a, b] = P.componentes;
    const s = iniciar(a!);
    expect(avancar(s, b!)).toBe(s);
  });
});

describe('assistente guiado', () => {
  const ctx: ContextoAssistente = {
    projeto: P,
    referencia: CASA_REFERENCIA,
    casa: casa110,
    classe: 'conceptual',
    fase: P.faseAtual,
    cultura: 'milho',
    hectares: 2,
  };
  it('reconhece as perguntas sugeridas', () => {
    for (const s of SUGESTOES) expect(classificar(s.pergunta), s.pergunta).toBe(s.intencao);
  });
  it('responde a todas as intenções sem buracos', () => {
    for (const i of INTENCOES) {
      const r = responder(i, ctx);
      expect(r.texto, i).not.toMatch(/undefined|NaN|Infinity|\[object/);
      expect(r.texto.length, i).toBeGreaterThan(40);
    }
  });
  it('a variação usa a casa atual', () => {
    expect(responder('variacao', ctx).texto).toContain('110 m²');
  });
  it('sem intenção, diz o que sabe responder', () => {
    expect(classificar('qual é a capital da França?')).toBe(null);
    expect(responder(null, ctx).texto).toMatch(/respondo sobre/);
  });
});

describe('geometria', () => {
  it('cantos de um retângulo rodado 90° trocam largura e profundidade', () => {
    const p = cantos({ cx: 0, cy: 0, w: 10, d: 2, rot: 90 });
    const xs = p.map((q) => q[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2);
  });
});
