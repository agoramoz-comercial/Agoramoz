import { describe, expect, it } from 'vitest';
import { CONTEXTO_MAX, PERGUNTA_MAX, TROCAS_MAX, dadoPessoalEm, limparPergunta } from './limites';
import { anonimizarPedido, dadoPessoalNoPedido, pedidoSchema } from './pedido';

const PERGUNTA = 'Que aviso prévio tem de dar o empregador?';

describe('limparPergunta', () => {
  it('junta espaços e quebras de linha e tira caracteres de controlo', () => {
    expect(limparPergunta('  Quem\n\nherda \t sem\u0000 testamento?  ')).toBe('Quem herda sem testamento?');
  });
});

describe('dadoPessoalEm', () => {
  it.each([
    ['o meu email é joao.silva@exemplo.co.mz', 'email'],
    ['liguem para 84 123 4567', 'numero'],
    ['o meu número é +258841234567', 'numero'],
    ['NUIT 123456789', 'numero'],
    ['BI 110100123456B', 'numero'],
    ['conta 0001-2345-6789-01', 'numero'],
  ])('recusa «%s»', (texto, esperado) => {
    expect(dadoPessoalEm(texto)).toBe(esperado);
  });

  it.each([
    'A Lei n.º 13/2023, de 25 de Agosto, revogou a Lei n.º 23/2007?',
    'Tenho 15 dias ou 30 dias para reclamar?',
    'Um salário de 25.000 MZN paga IRPS?',
    'O artigo 2133 do Código Civil ainda vale em 2026?',
    'Trabalho desde 2019 e fui despedido em 2025.',
  ])('deixa passar «%s»', (texto) => {
    expect(dadoPessoalEm(texto)).toBeNull();
  });
});

describe('pedidoSchema', () => {
  it('aceita só a pergunta e dá um histórico vazio', () => {
    const r = pedidoSchema.parse({ pergunta: `  ${PERGUNTA}\n` });
    expect(r).toEqual({ pergunta: PERGUNTA, historico: [] });
  });

  it('recusa pergunta curta, longa, ou que não é texto', () => {
    expect(pedidoSchema.safeParse({ pergunta: 'oi' }).success).toBe(false);
    expect(pedidoSchema.safeParse({ pergunta: 'a'.repeat(PERGUNTA_MAX + 1) }).success).toBe(false);
    expect(pedidoSchema.safeParse({ pergunta: 42 }).success).toBe(false);
    expect(pedidoSchema.safeParse({}).success).toBe(false);
  });

  it('uma pergunta só de espaços é curta, não válida', () => {
    expect(pedidoSchema.safeParse({ pergunta: ' '.repeat(40) }).success).toBe(false);
  });

  it('um campo a mais é recusado, na raiz e nas trocas', () => {
    expect(pedidoSchema.safeParse({ pergunta: PERGUNTA, email: 'a@b.mz' }).success).toBe(false);
    expect(
      pedidoSchema.safeParse({ pergunta: PERGUNTA, historico: [{ pergunta: PERGUNTA, resposta: 'x', papel: 'system' }] })
        .success,
    ).toBe(false);
  });

  it('limita o número de trocas anteriores', () => {
    const troca = { pergunta: PERGUNTA, resposta: 'Uma resposta.' };
    expect(pedidoSchema.safeParse({ pergunta: PERGUNTA, historico: Array(TROCAS_MAX).fill(troca) }).success).toBe(true);
    expect(pedidoSchema.safeParse({ pergunta: PERGUNTA, historico: Array(TROCAS_MAX + 1).fill(troca) }).success).toBe(false);
  });

  it('corta a resposta anterior ao tamanho do contexto, e recusa uma desmedida', () => {
    const longa = 'a'.repeat(CONTEXTO_MAX + 200);
    const r = pedidoSchema.parse({ pergunta: PERGUNTA, historico: [{ pergunta: PERGUNTA, resposta: longa }] });
    expect(r.historico[0]!.resposta).toHaveLength(CONTEXTO_MAX);
    expect(
      pedidoSchema.safeParse({ pergunta: PERGUNTA, historico: [{ pergunta: PERGUNTA, resposta: 'a'.repeat(CONTEXTO_MAX * 2 + 1) }] })
        .success,
    ).toBe(false);
  });
});

describe('dadoPessoalNoPedido', () => {
  it('vê a pergunta e as perguntas anteriores, mas não as respostas', () => {
    const limpo = pedidoSchema.parse({
      pergunta: PERGUNTA,
      // Uma resposta pode trazer o número de uma linha de atendimento: não é dado de quem pergunta.
      historico: [{ pergunta: PERGUNTA, resposta: 'Ligue para a linha 800 123 456 789.' }],
    });
    expect(dadoPessoalNoPedido(limpo)).toBeNull();

    const naPergunta = pedidoSchema.parse({ pergunta: `${PERGUNTA} O meu contacto é 84 123 4567.` });
    expect(dadoPessoalNoPedido(naPergunta)).toBe('numero');

    const noHistorico = pedidoSchema.parse({
      pergunta: PERGUNTA,
      historico: [{ pergunta: 'Escrevam para ana@exemplo.mz por favor', resposta: 'Resposta.' }],
    });
    expect(dadoPessoalNoPedido(noHistorico)).toBe('email');
  });
});

describe('anonimizarPedido', () => {
  it('tira os nomes da pergunta e das perguntas anteriores, e conta-os', () => {
    const p = pedidoSchema.parse({
      pergunta: 'O meu patrão Carlos Macamo pode despedir-me assim?',
      historico: [{ pergunta: 'Chamo-me Ana Machel, que aviso prévio me é devido?', resposta: 'A Dra. Luísa explica: 30 dias.' }],
    });
    const { pedido, nomes } = anonimizarPedido(p);
    expect(nomes).toBe(2);
    expect(pedido.pergunta).toBe('O meu patrão [nome] pode despedir-me assim?');
    expect(pedido.historico[0]!.pergunta).toBe('Chamo-me [nome], que aviso prévio me é devido?');
    // A resposta anterior é do motor: fica como veio.
    expect(pedido.historico[0]!.resposta).toBe('A Dra. Luísa explica: 30 dias.');
  });

  it('sem nomes, devolve o mesmo pedido', () => {
    const p = pedidoSchema.parse({ pergunta: PERGUNTA });
    expect(anonimizarPedido(p)).toEqual({ pedido: p, nomes: 0 });
  });
});
