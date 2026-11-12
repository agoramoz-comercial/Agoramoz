import { describe, expect, it, vi } from 'vitest';
import { MAX_TEXTO, abrirConsulta, consultarLovable, contextoOficial, corpoDoPedido, lerConsulta } from './motor';
import { notaDeVigencia } from './vigencia';
import { pedidoSchema } from './pedido';

/**
 * O adaptador do motor cívico, com o motor simulado por `fetch`. Nenhum teste
 * fala com a rede: gastaria modelos de IA para provar o que um duplo prova.
 */

const URL_MOTOR = 'https://portal-exemplo.lovable.app/api/consulta';
const CFG = { url: URL_MOTOR, timeoutMs: 5_000 };
const PEDIDO = pedidoSchema.parse({ pergunta: 'Que aviso prévio tem de dar o empregador?' });

const fluxo = (texto: string) =>
  [
    { type: 'start' },
    { type: 'text-start', id: 't1' },
    ...(texto.match(/[\s\S]{1,25}/g) ?? []).map((delta) => ({ type: 'text-delta', id: 't1', delta })),
    { type: 'text-end', id: 't1' },
    { type: 'finish' },
  ]
    .map((e) => `data: ${JSON.stringify(e)}\n\n`)
    .join('') + 'data: [DONE]\n\n';

function motor(corpo: string, init: ResponseInit = {}) {
  return vi.fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>(
    async () => new Response(corpo, { status: 200, ...init }),
  );
}

/**
 * O fluxo tal como o motor real o devolveu a 2026-11-12 (primeira consulta
 * verdadeira, encurtada): `content-type: text/event-stream`, cabeçalho
 * `x-vercel-ai-ui-message-stream: v1`, pedaços cortados a meio de palavras e
 * de marcadores. A forma da resposta é a que o motor usa sempre — secções
 * numeradas, citação literal, «Fonte legal» com a lei pelo nome e, quando
 * muito, a raiz de um portal como ligação.
 */
const FLUXO_REAL = [
  { type: 'start' },
  { type: 'start-step' },
  { type: 'text-start', id: 'txt-0' },
  { type: 'text-delta', id: 'txt-0', delta: '### 1.' },
  { type: 'text-delta', id: 'txt-0', delta: ' Resposta directa\nA taxa normal do Imposto sobre o Valor Acrescentado (IVA) em' },
  { type: 'text-delta', id: 'txt-0', delta: ' Moçambique é de 16%.\n\n### 2. O que diz a lei (citação' },
  { type: 'text-delta', id: 'txt-0', delta: ' literal)\n> **Artigo 18.º (Taxas) — [Lei n.º 2' },
  { type: 'text-delta', id: 'txt-0', delta: '2/2022, de 22 de Dezembro]**\n> "1. A taxa do imposto é' },
  { type: 'text-delta', id: 'txt-0', delta: ' de 16%."\n\n### 5. Prazos, custos e contactos úteis\n- **Contacto institucional:** Linha' },
  { type: 'text-delta', id: 'txt-0', delta: ' de Apoio ao Contribuinte: 800 124 124.\n\n### 6. Fonte legal\n1. **Lei n.º 22/2022, de 22 de Dezembro** — Altera o CIVA. Órgão: Assembleia' },
  { type: 'text-delta', id: 'txt-0', delta: ' da República. https://www.at.gov.mz\n2. **' },
  { type: 'text-delta', id: 'txt-0', delta: 'Lei n.º 32/2007, de 31 de Dezembro** — Aprova o Código do IVA.\n\n### 7. Aviso\nInformação' },
  { type: 'text-delta', id: 'txt-0', delta: ' pública, não parecer jurídico.' },
  { type: 'text-end', id: 'txt-0' },
  { type: 'finish-step' },
  { type: 'finish', finishReason: 'stop' },
]
  .map((e) => `data: ${JSON.stringify(e)}\n\n`)
  .join('') + 'data: [DONE]\n\n';

describe('o formato real do motor', () => {
  it('lê-se inteiro: secções, citação com a lei pelo nome, e a única ligação como fonte', async () => {
    const f = motor(FLUXO_REAL, { headers: { 'content-type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' } });
    const r = await consultarLovable(PEDIDO, CFG, f as unknown as typeof fetch);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.resposta.blocos.map((b) => b.tipo)).toEqual([
      'titulo', 'paragrafo', 'titulo', 'citacao', 'titulo', 'lista', 'titulo', 'lista', 'titulo', 'paragrafo',
    ]);
    expect(r.resposta.blocos[0]).toEqual({ tipo: 'titulo', texto: '1. Resposta directa' });
    // A lei citada entre parênteses rectos, sem endereço, fica em texto — não é uma ligação partida.
    expect(r.resposta.blocos[3]).toEqual({
      tipo: 'citacao',
      trechos: [
        { t: 'forte', v: 'Artigo 18.º (Taxas) — [Lei n.º 22/2022, de 22 de Dezembro]' },
        { t: 'texto', v: ' "1. A taxa do imposto é de 16%."' },
      ],
    });
    expect(r.resposta.fontes).toEqual([
      { n: 1, titulo: 'at.gov.mz', href: 'https://www.at.gov.mz/', dominio: 'at.gov.mz', estado: true },
    ]);
    // O número de uma linha de atendimento na RESPOSTA não é dado pessoal de quem pergunta.
    expect(r.resposta.texto).toContain('800 124 124');
  });
});

describe('corpoDoPedido', () => {
  const pedido = pedidoSchema.parse({
    pergunta: 'E se o contrato de trabalho for a prazo?',
    historico: [{ pergunta: 'Que aviso prévio tem de dar o empregador?', resposta: 'Depende da antiguidade.' }],
  });
  const textos = (corpo: ReturnType<typeof corpoDoPedido>) => corpo.messages.map((m) => [m.role, m.parts[0]!.text]);

  it('a nota de vigência à frente, as trocas, a pergunta, e o TEMA em último', () => {
    const corpo = corpoDoPedido(pedido);
    expect(corpo.trigger).toBe('submit-message');
    expect(corpo.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(textos(corpo)).toEqual([
      ['user', notaDeVigencia()],
      ['user', contextoOficial([])],
      ['user', 'Que aviso prévio tem de dar o empregador?'],
      ['assistant', 'Depende da antiguidade.'],
      ['user', 'E se o contrato de trabalho for a prazo?'],
      ['user', 'Tema: Trabalho. A pergunta está na mensagem anterior.'],
    ]);
    expect(new Set(corpo.messages.map((m) => m.id)).size).toBe(6);
  });

  /**
   * O portal publica a ÚLTIMA mensagem de cada consulta na sua página de
   * estado (medido a 2026-11-12). Este teste é o que impede a pergunta de
   * alguém de voltar a ir parar lá por uma arrumação distraída das mensagens.
   */
  it('a última mensagem nunca leva uma palavra da pergunta', () => {
    const ultima = corpoDoPedido(pedido).messages.at(-1)!.parts[0]!.text;
    expect(ultima.startsWith('Tema: ')).toBe(true);
    for (const palavra of ['contrato', 'prazo', 'aviso', 'empregador']) expect(ultima).not.toContain(palavra);
  });

  it('com perguntaNoFim, a pergunta volta a ser a última (para quando o portal deixar de a publicar)', () => {
    const corpo = corpoDoPedido(pedido, true);
    expect(textos(corpo).at(-1)).toEqual(['user', 'E se o contrato de trabalho for a prazo?']);
    expect(textos(corpo)[0]).toEqual(['user', notaDeVigencia()]);
  });
});

describe('consultarLovable', () => {
  it('chama o motor por POST, em português, sem credenciais e sem seguir redireccionamentos', async () => {
    const f = motor(fluxo('Resposta.'));
    await consultarLovable(PEDIDO, CFG, f as unknown as typeof fetch);

    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe(URL_MOTOR);
    expect(init!.method).toBe('POST');
    expect(init!.redirect).toBe('error');
    expect(init!.cache).toBe('no-store');
    const headers = init!.headers as Record<string, string>;
    expect(headers['x-idioma']).toBe('pt');
    expect(headers['content-type']).toBe('application/json');
    // O motor é público: nada de `authorization`, `cookie` ou IP de quem pergunta.
    expect(Object.keys(headers).map((h) => h.toLowerCase()).sort()).toEqual(['accept', 'content-type', 'x-idioma']);
    expect(JSON.parse(init!.body as string).messages.at(-2).parts[0].text).toBe(PEDIDO.pergunta);
  });

  it('devolve a resposta normalizada, com as fontes', async () => {
    const md = '## Aviso prévio\n\nVeja a [Lei do Trabalho](https://www.mitess.gov.mz/lei-13-2023).';
    const r = await consultarLovable(PEDIDO, CFG, motor(fluxo(md)) as unknown as typeof fetch);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resposta.blocos.map((b) => b.tipo)).toEqual(['titulo', 'paragrafo']);
    expect(r.resposta.fontes).toEqual([
      { n: 1, titulo: 'Lei do Trabalho', href: 'https://www.mitess.gov.mz/lei-13-2023', dominio: 'mitess.gov.mz', estado: true },
    ]);
  });

  it.each([
    [401, 'indisponivel'],
    [402, 'indisponivel'],
    [403, 'indisponivel'],
    [429, 'indisponivel'],
    [404, 'http'],
    [500, 'http'],
  ])('HTTP %i do motor é %s', async (status, motivo) => {
    const r = await consultarLovable(PEDIDO, CFG, motor('x', { status }) as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, motivo, status });
  });

  it('timeout e falha de rede não lançam; a rede leva só o código da causa', async () => {
    const lento = vi.fn(async () => {
      throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
    });
    expect(await consultarLovable(PEDIDO, CFG, lento as unknown as typeof fetch)).toEqual({ ok: false, motivo: 'timeout' });

    const semRede = vi.fn(async () => {
      throw Object.assign(new TypeError(`fetch failed: ${URL_MOTOR}`), { cause: { code: 'ECONNREFUSED' } });
    });
    const r = await consultarLovable(PEDIDO, CFG, semRede as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, motivo: 'rede', codigo: 'ECONNREFUSED' });
    expect(JSON.stringify(r)).not.toContain('lovable.app');
  });

  it('a leitura do fluxo interrompida a meio é timeout, não um erro por tratar', async () => {
    const f = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => {
        throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      },
    }));
    expect(await consultarLovable(PEDIDO, CFG, f as unknown as typeof fetch)).toEqual({ ok: false, motivo: 'timeout' });
  });

  it('um evento de erro no fluxo é falha do motor', async () => {
    const corpo = `data: ${JSON.stringify({ type: 'error', errorText: 'interno' })}\n\n`;
    expect(await consultarLovable(PEDIDO, CFG, motor(corpo) as unknown as typeof fetch)).toEqual({ ok: false, motivo: 'motor' });
  });

  it('uma página que não é um fluxo (bloqueio, manutenção) é vazio', async () => {
    const r = await consultarLovable(PEDIDO, CFG, motor('<html>Just a moment…</html>') as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, motivo: 'vazio' });
  });

  it('resposta acima do tecto é recusada, declarada ou não', async () => {
    const declarada = motor('x', { headers: { 'content-length': '9000000' } });
    expect(await consultarLovable(PEDIDO, CFG, declarada as unknown as typeof fetch)).toEqual({ ok: false, motivo: 'grande' });

    const longa = motor(fluxo('palavra '.repeat(MAX_TEXTO / 8 + 100)));
    expect(await consultarLovable(PEDIDO, CFG, longa as unknown as typeof fetch)).toEqual({ ok: false, motivo: 'grande' });
  });
});

describe('em fluxo', () => {
  /** Um corpo que chega aos bocados, cortado em sítios arbitrários (incluindo a meio de um «ç»). */
  function aosBocados(corpo: string, tamanho: number): Response {
    const bytes = new TextEncoder().encode(corpo);
    let i = 0;
    return new Response(
      new ReadableStream<Uint8Array>({
        pull(c) {
          if (i >= bytes.length) return c.close();
          c.enqueue(bytes.slice(i, i + tamanho));
          i += tamanho;
        },
      }),
      { status: 200 },
    );
  }

  it('entrega os pedaços à medida que chegam e, no fim, a resposta inteira', async () => {
    const md = 'A **Lei n.º 13/2023** fixa a indemnização e as férias: ver [fonte](https://www.mitess.gov.mz/lei).';
    for (const tamanho of [1, 5, 17, 4096]) {
      const recebidos: string[] = [];
      const r = await lerConsulta(aosBocados(fluxo(md), tamanho), (p) => recebidos.push(p));
      expect(recebidos.join(''), `tamanho ${tamanho}`).toBe(md);
      expect(r.ok && r.resposta.texto, `tamanho ${tamanho}`).toBe('A Lei n.º 13/2023 fixa a indemnização e as férias: ver fonte.');
    }
  });

  it('abrirConsulta devolve a recusa do motor antes de haver fluxo', async () => {
    const r = await abrirConsulta(PEDIDO, CFG, motor('bloqueado', { status: 403 }) as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, motivo: 'indisponivel', status: 403 });
  });

  it('um sinal já cancelado não chega a incomodar o motor com sucesso', async () => {
    const desistir = new AbortController();
    desistir.abort();
    const f = vi.fn(async (_u: unknown, init?: RequestInit) => {
      if (init?.signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      return new Response('x');
    });
    const r = await abrirConsulta(PEDIDO, CFG, f as unknown as typeof fetch, desistir.signal);
    expect(r).toEqual({ ok: false, motivo: 'timeout' });
  });

  it('um erro a meio do fluxo não deixa passar o que veio antes como resposta', async () => {
    const corpo = fluxo('Começo de resposta').replace('data: [DONE]', `data: ${JSON.stringify({ type: 'error', errorText: 'x' })}`);
    expect(await lerConsulta(aosBocados(corpo, 9))).toEqual({ ok: false, motivo: 'motor' });
  });
});
