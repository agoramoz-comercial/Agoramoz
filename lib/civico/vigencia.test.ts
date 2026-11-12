import { describe, expect, it } from 'vitest';
import { urlPublica } from '@/lib/news/limites';
import { temaDaPergunta, mensagemDeTema, TEMAS } from './tema';
import {
  REVOGACOES,
  VERIFICADO_EM,
  citaLivroV,
  citacoesDe,
  notaDeVigencia,
  validarVigencia,
  verificarVigencia,
} from './vigencia';

const v = (texto: string) => verificarVigencia({ texto });

describe('o registo de revogações', () => {
  it('cada entrada tem a fonte onde a norma revogatória foi lida, em https', () => {
    expect(REVOGACOES.length).toBeGreaterThanOrEqual(4);
    for (const r of REVOGACOES) {
      expect(urlPublica(r.fonte.href), r.id).toBe(true);
      expect(r.fonte.titulo, r.id).toMatch(/Boletim da República/);
      expect(r.substituto, r.id).toContain(r.numeroSubstituto);
      for (const n of r.numerosRevogados) expect(r.revogado, r.id).toContain(n);
    }
    expect(new Set(REVOGACOES.map((r) => r.id)).size).toBe(REVOGACOES.length);
    expect(VERIFICADO_EM).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('nenhum diploma é ao mesmo tempo revogado e substituto', () => {
    const revogados = new Set(REVOGACOES.flatMap((r) => r.numerosRevogados));
    for (const r of REVOGACOES) expect(revogados.has(r.numeroSubstituto), r.id).toBe(false);
  });
});

describe('notaDeVigencia', () => {
  it('nomeia cada revogação e pede para não inventar citações', () => {
    const nota = notaDeVigencia();
    for (const r of REVOGACOES) {
      expect(nota).toContain(r.substituto);
      expect(nota).toContain(r.revogado);
    }
    expect(nota).toMatch(/não inventes citações literais/);
    expect(nota).toMatch(/Boletim da República/);
  });
});

describe('citacoesDe', () => {
  it('reconhece as formas em que o motor escreve um diploma', () => {
    const texto =
      'A Lei n.º 13/2023, a Lei nº 23/2007, a lei 4/2007, o Decreto-Lei n.º 47344/66, o Decreto n.o 51/2017 e o Diploma Ministerial n.º 12/2020.';
    expect(citacoesDe(texto).map((c) => `${c.tipo} ${c.numero}`)).toEqual([
      'Lei 13/2023',
      'Lei 23/2007',
      'Lei 4/2007',
      'Decreto-Lei 47344/66',
      'Decreto 51/2017',
      'Diploma Ministerial 12/2020',
    ]);
  });

  it('não repete, e não confunde datas, valores ou artigos com diplomas', () => {
    expect(citacoesDe('A Lei n.º 13/2023 e de novo a Lei 13/2023.')).toHaveLength(1);
    expect(citacoesDe('No dia 25/08/2023 pagou 16% e 1/3 do salário, artigo 130.')).toEqual([]);
  });
});

describe('citaLivroV', () => {
  it.each([
    'Artigo 2133.º (Classes de sucessíveis) — [Código Civil]',
    'nos termos do art. 2024 do Código Civil',
    'Código Civil (Livro V, Direito das Sucessões)',
    'os artigos 2133 e 2134 do código civil',
  ])('sim: «%s»', (texto) => expect(citaLivroV(texto)).toBe(true));

  it.each([
    'Artigo 405.º do Código Civil (liberdade contratual)',
    'O artigo 2133 da lei', // sem Código Civil
    'O Código Civil regula os contratos desde 1966.',
    'Em 2024 o Código Civil continuava em vigor nos contratos.', // um ano não é um artigo
  ])('não: «%s»', (texto) => expect(citaLivroV(texto)).toBe(false));
});

describe('verificarVigencia', () => {
  it('a resposta real de 2026-11-12 sobre heranças é apanhada', () => {
    // Encurtada da primeira consulta verdadeira ao motor.
    const r = v(
      [
        'Artigo 2133.º (Classes de sucessíveis) — [Código Civil] "1. A ordem por que são chamados os herdeiros…"',
        'Decreto-Lei nº 47344, de 25 de Novembro de 1966 — Código Civil (Livro V, Direito das Sucessões).',
        'Lei nº 10/2004, de 25 de Agosto — Lei da Família.',
      ].join('\n'),
    );
    expect(r.alertas.map((a) => [a.id, a.tipo])).toEqual([
      ['sucessoes', 'revogado'],
      ['familia', 'revogado'],
    ]);
    expect(r.alertas[0]!.substituto).toContain('23/2019');
    expect(r.diplomas).toContainEqual({ nome: 'Lei n.º 10/2004', estado: 'revogado' });
    expect(r.verificadoEm).toBe(VERIFICADO_EM);
  });

  it('citar o diploma em vigor não levanta alerta, e fica marcado como conferido', () => {
    const r = v('Segundo a Lei n.º 13/2023, de 25 de Agosto, e a Lei n.º 4/2007.');
    expect(r.alertas).toEqual([]);
    expect(r.diplomas).toEqual([
      { nome: 'Lei n.º 13/2023', estado: 'substituto' },
      { nome: 'Lei n.º 4/2007', estado: 'por-verificar' },
    ]);
  });

  it('citar o revogado é grave; citar os dois é só uma menção', () => {
    expect(v('A Lei n.º 23/2007, art. 130, exige 30 dias.').alertas).toMatchObject([{ id: 'trabalho', tipo: 'revogado' }]);
    expect(v('A Lei n.º 13/2023 revogou a Lei n.º 23/2007.').alertas).toMatchObject([{ id: 'trabalho', tipo: 'mencionado' }]);
  });

  it('os alertas graves vêm primeiro', () => {
    const r = v('A Lei n.º 13/2023 revogou a Lei n.º 23/2007. O Código Penal da Lei n.º 35/2014 pune o furto.');
    expect(r.alertas.map((a) => a.tipo)).toEqual(['revogado', 'mencionado']);
  });

  it('um diploma fora do registo nunca sai como em vigor', () => {
    const estados = v('Lei n.º 32/2007 e Lei n.º 22/2022.').diplomas.map((d) => d.estado);
    expect(estados).toEqual(['por-verificar', 'por-verificar']);
  });

  it('sem diplomas, nada', () => {
    expect(v('Não encontrei um texto oficial sobre isso.')).toEqual({ alertas: [], diplomas: [], verificadoEm: VERIFICADO_EM });
  });
});

describe('validarVigencia', () => {
  const boa = v('A Lei n.º 23/2007 e a Lei n.º 4/2007.');

  it('aceita o que o verificador produz, depois da viagem por JSON', () => {
    expect(validarVigencia(JSON.parse(JSON.stringify(boa)))).toBe(true);
  });

  it.each([
    ['nulo', null],
    ['alerta com ligação insegura', { ...boa, alertas: [{ ...boa.alertas[0], fonte: { titulo: 'x', href: 'javascript:alert(1)' } }] }],
    ['tipo de alerta desconhecido', { ...boa, alertas: [{ ...boa.alertas[0], tipo: 'ok' }] }],
    ['estado desconhecido', { ...boa, diplomas: [{ nome: 'Lei n.º 1/2000', estado: 'em-vigor' }] }],
  ])('recusa %s', (_n, valor) => expect(validarVigencia(valor)).toBe(false));
});

describe('temaDaPergunta', () => {
  it.each([
    ['Que aviso prévio tem de dar o empregador para rescindir o contrato de trabalho?', 'trabalho'],
    ['Quem herda quando alguém morre sem deixar testamento?', 'familia'],
    ['Quem tem direito à pensão de velhice do INSS?', 'seguranca-social'],
    ['Qual é a taxa do IVA em Moçambique?', 'impostos'],
    ['Como se pede o passaporte?', 'documentos'],
    ['O que é o DUAT e como se obtém?', 'habitacao'],
    ['Fui detido pela polícia sem motivo, o que posso fazer?', 'crime'],
    ['Qual é a capital da província?', 'outro'],
  ])('«%s» → %s', (pergunta, tema) => expect(temaDaPergunta(pergunta)).toBe(tema));

  it('a mensagem de tema começa pelo tema e não leva nada da pergunta', () => {
    const m = mensagemDeTema('trabalho');
    expect(m.startsWith(`Tema: ${TEMAS.trabalho}.`)).toBe(true);
    expect(m).toBe('Tema: Trabalho. A pergunta está na mensagem anterior.');
  });
});
