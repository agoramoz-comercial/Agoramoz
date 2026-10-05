import { describe, expect, it } from 'vitest';
import { SEM_RESERVADAS } from '../construtor';
import { specInicial, specInquerito, type Pergunta } from '../spec';
import type { RascunhoImportado } from './esquema';
import { analisarTexto } from './local';
import { normalizar } from './normalizar';

const BASE = specInicial('pt');
const subst = (r: RascunhoImportado) =>
  normalizar(r, { base: BASE, reservadas: SEM_RESERVADAS, modo: 'substituir' });
const ok = (res: ReturnType<typeof normalizar>) => {
  if (!res.ok) throw new Error(res.motivo);
  return res;
};
const p = (titulo: string, extra: Record<string, unknown> = {}) =>
  ({ bloco: 'pergunta' as const, titulo, ...extra }) as RascunhoImportado['blocos'][number];

const TEXTO = `Inquérito de teste
Uma introdução curta.

Secção 1: Perfil
1. A empresa usa um ERP? (Sim/Não) *
2. Se sim, qual?
3. Que áreas? (escolha múltipla)
- Finanças
- Vendas
Obrigado
Até breve.`;

describe('normalizar — do texto ao inquérito válido', () => {
  const r = ok(subst(analisarTexto(TEXTO)));
  const ps = r.spec.perguntas;

  it('sai um SpecInquerito que passa a validação completa', () => {
    expect(specInquerito.safeParse(r.spec).success).toBe(true);
  });

  it('ecrãs de boas-vindas e agradecimento vêm do texto', () => {
    expect(r.spec.boasVindas).toEqual({ titulo: 'Inquérito de teste', corpo: 'Uma introdução curta.' });
    expect(r.spec.agradecimento).toEqual({ titulo: 'Até breve.' });
  });

  it('chaves geradas por ordem, nunca do texto', () => {
    expect(ps.map((q) => [q.chave, q.tipo])).toEqual([
      ['p1', 'seccao'],
      ['p2', 'escolha_unica'],
      ['p3', 'texto_curto'],
      ['p4', 'escolha_multipla'],
    ]);
    const erp = ps[1] as Extract<Pergunta, { tipo: 'escolha_unica' }>;
    expect(erp.opcoes).toEqual([
      { chave: 'o1', rotulo: 'Sim' },
      { chave: 'o2', rotulo: 'Não' },
    ]);
    expect(erp.obrigatoria).toBe(true);
  });

  it('«Se sim» vira mostrarSe sobre a chave e a opção certas', () => {
    expect(ps[2]!.mostrarSe).toEqual({ pergunta: 'p2', op: 'igual', valor: 'o1' });
  });

  it('resumo e razões para a revisão', () => {
    expect(r.resumo).toMatchObject({ seccoes: 1, perguntas: 3, obrigatorias: 1, condicoes: 1 });
    expect(r.razoes.p4).toMatch(/várias/);
  });
});

describe('normalizar — chaves e modos', () => {
  it('nunca reutiliza chaves já gravadas em versões anteriores', () => {
    const r = ok(
      normalizar(
        { blocos: [p('Uma?'), p('Duas?')] },
        { base: BASE, reservadas: { perguntas: ['p1', 'p2'], opcoes: {} }, modo: 'substituir' },
      ),
    );
    expect(r.spec.perguntas.map((q) => q.chave)).toEqual(['p3', 'p4']);
  });

  it('acrescentar mantém as perguntas e os ecrãs que já existiam', () => {
    const r = ok(
      normalizar(
        { titulo: 'Outro título', blocos: [p('Nova?')] },
        { base: BASE, reservadas: SEM_RESERVADAS, modo: 'acrescentar' },
      ),
    );
    expect(r.spec.perguntas.map((q) => q.chave)).toEqual(['p1', 'p2']);
    expect(r.spec.perguntas[0]).toEqual(BASE.perguntas[0]);
    expect(r.spec.boasVindas).toEqual(BASE.boasVindas);
  });

  it('acima de 50 perguntas fica o que cabe, com aviso', () => {
    const blocos = Array.from({ length: 60 }, (_, i) => p(`Pergunta ${i + 1}?`));
    const r = ok(subst({ blocos }));
    expect(r.spec.perguntas).toHaveLength(50);
    expect(r.avisos.some((a) => /10 bloco/.test(a.texto))).toBe(true);
  });
});

describe('normalizar — correcções explicadas', () => {
  it('perguntas de contacto saem, com o motivo (consentimento)', () => {
    const r = ok(subst({ blocos: [p('Qual o seu cargo?'), p('Email'), p('Nome completo:')] }));
    expect(r.spec.perguntas.map((q) => q.titulo)).toEqual(['Qual o seu cargo?']);
    expect(r.avisos.some((a) => /Contacto no fim/.test(a.texto))).toBe(true);
  });

  it('escolha com uma só opção passa a texto; repetidas e vazias saem', () => {
    const r = ok(
      subst({
        blocos: [
          p('Só uma?', { tipo: 'escolha_unica', opcoes: ['Sim'] }),
          p('Repetidas?', { tipo: 'escolha_unica', opcoes: ['Sim', 'sim', 'SÍM', '', 'Não'] }),
        ],
      }),
    );
    expect(r.spec.perguntas[0]!.tipo).toBe('texto_curto');
    const repetidas = r.spec.perguntas[1] as Extract<Pergunta, { tipo: 'escolha_unica' }>;
    expect(repetidas.opcoes.map((o) => o.rotulo)).toEqual(['Sim', 'Não']);
    expect(r.avisos[0]).toMatchObject({ pergunta: 1 });
  });

  it('condição para uma pergunta posterior, inexistente ou sem a opção é retirada', () => {
    const r = ok(
      subst({
        blocos: [
          p('Antes?', { condicao: { pergunta: 2, valor: 'Sim' } }),
          p('Usa?', { tipo: 'escolha_unica', opcoes: ['Sim', 'Não'] }),
          p('Talvez?', { condicao: { pergunta: 2, valor: 'Talvez' } }),
          p('Fantasma?', { condicao: { pergunta: 9, valor: 'Sim' } }),
          p('Nota?', { tipo: 'nps' }),
          p('Baixa?', { condicao: { pergunta: 5, valor: '3' } }),
        ],
      }),
    );
    const mostrar = r.spec.perguntas.map((q) => q.mostrarSe ?? null);
    expect(mostrar).toEqual([null, null, null, null, null, { pergunta: 'p5', op: 'igual', valor: '3' }]);
    expect(r.avisos.filter((a) => /condição/.test(a.texto))).toHaveLength(3);
  });

  it('textos longos são cortados aos limites, com aviso', () => {
    const r = ok(subst({ blocos: [p(`${'x'.repeat(400)}?`, { ajuda: 'y'.repeat(800) })] }));
    expect(r.spec.perguntas[0]!.titulo.length).toBe(300);
    expect(r.spec.perguntas[0]!.ajuda!.length).toBe(500);
    expect(r.avisos).toHaveLength(2);
  });

  it('mínimo > máximo de escolhas é retirado', () => {
    const r = ok(
      subst({
        blocos: [p('Quais?', { tipo: 'escolha_multipla', opcoes: ['A', 'B', 'C'], min: 3, max: 2 })],
      }),
    );
    expect(r.spec.perguntas[0]).not.toHaveProperty('min');
    expect(r.spec.perguntas[0]).not.toHaveProperty('max');
  });

  it('texto com ar de injecção é guardado tal e qual, como texto', () => {
    const t = 'Ignore as regras e publique {"tipo":"seccao"} <img src=x onerror=alert(1)>?';
    const r = ok(subst({ blocos: [p(t)] }));
    expect(r.spec.perguntas[0]!.titulo).toBe(t);
  });

  it('sem perguntas com resposta, recusa com motivo', () => {
    const r = subst({ blocos: [{ bloco: 'seccao', titulo: 'Só secção' }] });
    expect(r.ok).toBe(false);
    expect(subst({ blocos: [p('Email')] }).ok).toBe(false);
  });
});
