import { describe, expect, it } from 'vitest';
import {
  TIPOS,
  acrescentar,
  apagar,
  duplicar,
  errosLegiveis,
  mover,
  mudarTipo,
  novaChave,
  novaOpcao,
  novaPergunta,
  slugDe,
} from './construtor';
import { specInicial, specInquerito, type Pergunta, type SpecInquerito } from './spec';

const valido = (spec: SpecInquerito) => specInquerito.safeParse(spec).success;
const comPerguntas = (perguntas: Pergunta[]): SpecInquerito => ({
  ...specInicial('pt'),
  perguntas,
});

describe('perguntas novas', () => {
  it('cada tipo nasce válido', () => {
    for (const tipo of TIPOS) {
      const spec = comPerguntas([
        novaPergunta('escolha_unica', 'p1', 'pt'),
        novaPergunta(tipo, 'p2', 'pt'),
      ]);
      expect(valido(spec), tipo).toBe(true);
    }
  });

  it('chaves novas nunca repetem, mesmo com buracos', () => {
    expect(novaChave(['p1', 'p3'], 'p')).toBe('p2');
    expect(novaChave(['p1', 'p2'], 'p')).toBe('p3');
    const lista = acrescentar(acrescentar(specInicial('pt').perguntas, 'nps', 'pt'), 'data', 'pt');
    expect(lista.map((p) => p.chave)).toEqual(['p1', 'p2', 'p3']);
  });

  it('opção nova leva chave livre', () => {
    const opcoes = novaOpcao(
      [
        { chave: 'o1', rotulo: 'A' },
        { chave: 'o3', rotulo: 'C' },
      ],
      'pt',
    );
    expect(opcoes.at(-1)).toEqual({ chave: 'o2', rotulo: 'Opção 3' });
  });
});

describe('mudar de tipo', () => {
  it('mantém chave, texto, condição e obrigatoriedade; entre escolhas mantém as opções', () => {
    const p: Pergunta = {
      tipo: 'escolha_unica',
      chave: 'p2',
      titulo: 'Áreas?',
      ajuda: 'Uma ajuda',
      obrigatoria: true,
      mostrarSe: { pergunta: 'p1', op: 'igual', valor: 'o1' },
      opcoes: [
        { chave: 'o1', rotulo: 'RH' },
        { chave: 'o2', rotulo: 'Vendas' },
      ],
    };
    const m = mudarTipo(p, 'escolha_multipla', 'pt');
    expect(m).toMatchObject({
      tipo: 'escolha_multipla',
      chave: 'p2',
      titulo: 'Áreas?',
      ajuda: 'Uma ajuda',
      obrigatoria: true,
      mostrarSe: p.mostrarSe,
      opcoes: p.opcoes,
    });
    const s = mudarTipo(p, 'seccao', 'pt');
    expect(s).not.toHaveProperty('obrigatoria');
    expect(s).not.toHaveProperty('opcoes');
  });
});

describe('duplicar, apagar, mover', () => {
  const base: Pergunta[] = [
    novaPergunta('escolha_unica', 'p1', 'pt'),
    {
      ...novaPergunta('texto_curto', 'p2', 'pt'),
      mostrarSe: { pergunta: 'p1', op: 'igual', valor: 'o1' },
    } as Pergunta,
  ];

  it('duplicar insere a seguir com chave nova e não partilha objectos', () => {
    const d = duplicar(base, 0);
    expect(d.map((p) => p.chave)).toEqual(['p1', 'p3', 'p2']);
    (d[1] as Extract<Pergunta, { tipo: 'escolha_unica' }>).opcoes[0]!.rotulo = 'mudado';
    expect((base[0] as Extract<Pergunta, { tipo: 'escolha_unica' }>).opcoes[0]!.rotulo).not.toBe(
      'mudado',
    );
  });

  it('apagar retira as condições que ficariam órfãs e diz quantas', () => {
    const r = apagar(base, 0);
    expect(r.condicoesRetiradas).toBe(1);
    expect(r.perguntas[0]).not.toHaveProperty('mostrarSe');
    expect(valido(comPerguntas(r.perguntas))).toBe(true);
  });

  it('mover troca vizinhos e não sai dos limites; a condição invertida é apanhada pelo esquema', () => {
    expect(mover(base, 0, -1).map((p) => p.chave)).toEqual(['p1', 'p2']);
    const invertida = mover(base, 0, 1);
    expect(invertida.map((p) => p.chave)).toEqual(['p2', 'p1']);
    const r = specInquerito.safeParse(comPerguntas(invertida));
    expect(r.success).toBe(false);
    const erros = errosLegiveis(comPerguntas(invertida), r.success ? [] : r.error.issues);
    expect(erros[0]).toEqual({
      pergunta: 0,
      texto: 'Pergunta 1 «Nova pergunta»: a condição tem de apontar para uma pergunta anterior.',
    });
  });
});

describe('erros legíveis', () => {
  it('título vazio, opção vazia e poucas opções em português', () => {
    const spec = comPerguntas([
      {
        tipo: 'escolha_unica',
        chave: 'p1',
        titulo: '',
        obrigatoria: false,
        opcoes: [{ chave: 'o1', rotulo: '' }],
      },
    ]);
    const r = specInquerito.safeParse(spec);
    const textos = errosLegiveis(spec, r.success ? [] : r.error.issues).map((e) => e.texto);
    expect(textos).toContain('Pergunta 1: título vazio.');
    expect(textos).toContain('Pergunta 1 (opção 1): texto da opção vazio.');
    expect(textos).toContain('Pergunta 1: precisa de pelo menos 2 opções.');
  });
});

describe('slug', () => {
  it('sem acentos, só [a-z0-9-], com sufixo; aceite pelo CHECK da tabela', () => {
    const s = slugDe('  Satisfação dos Clientes — 2026! ', 'a1b2c3');
    expect(s).toBe('satisfacao-dos-clientes-2026-a1b2c3');
    expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(slugDe('***', 'ff00aa')).toBe('inquerito-ff00aa');
    expect(slugDe('x'.repeat(80), 'ab12cd').length).toBeLessThanOrEqual(57);
  });
});
