import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A rota da consulta cívica, com o motor simulado por `fetch`. Nenhum teste
 * aqui fala com a rede.
 */

const URL_MOTOR = 'https://portal-exemplo.lovable.app/api/consulta';
const LIGADO = { CIVICO_ENGINE: 'lovable', LOVABLE_CIVICO_URL: URL_MOTOR, CIVICO_RATE_LIMIT_MAX: '100' };
const PERGUNTA = 'Que aviso prévio tem de dar o empregador para rescindir o contrato?';
const MARKDOWN = '## Aviso prévio\n\nDepende da antiguidade. Veja a [Lei do Trabalho](https://www.mitess.gov.mz/lei-13-2023).';

async function carregarRota(env: Record<string, string> = LIGADO) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const mod = await import('./route');
  return mod.POST;
}

let origem = 0;
function pedido(body: unknown, headers: Record<string, string> = {}) {
  origem += 1;
  return new Request('https://agoramoz.com/api/civico/consulta', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${origem % 250}`, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const fluxo = (texto: string) =>
  [{ type: 'text-start', id: 't1' }, { type: 'text-delta', id: 't1', delta: texto }, { type: 'text-end', id: 't1' }]
    .map((e) => `data: ${JSON.stringify(e)}\n\n`)
    .join('') + 'data: [DONE]\n\n';

function motorResponde(corpo: string, status = 200) {
  const f = vi.fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>(
    async () => new Response(corpo, { status }),
  );
  vi.stubGlobal('fetch', f);
  return f;
}

let linhas: string[] = [];
beforeEach(() => {
  linhas = [];
  const registar = (l: unknown) => void linhas.push(String(l));
  vi.spyOn(console, 'log').mockImplementation(registar);
  vi.spyOn(console, 'warn').mockImplementation(registar);
  vi.spyOn(console, 'error').mockImplementation(registar);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.doUnmock('@/lib/analytics/servidor');
});

describe('POST /api/civico/consulta', () => {
  it('com o motor desligado responde 503 e não chama ninguém', async () => {
    const f = motorResponde(fluxo(MARKDOWN));
    const POST = await carregarRota({});
    const res = await POST(pedido({ pergunta: PERGUNTA }));
    expect(res.status).toBe(503);
    expect(f).not.toHaveBeenCalled();
    expect(linhas.join('\n')).toContain('motor-desligado');
  });

  it('ligado sem URL é configuração inválida: 503 com linha de log, nunca um 500 mudo', async () => {
    const POST = await carregarRota({ CIVICO_ENGINE: 'lovable' });
    const res = await POST(pedido({ pergunta: PERGUNTA }));
    expect(res.status).toBe(503);
    expect((await res.json()).correlationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(linhas.join('\n')).toContain('config-invalida');
  });

  it('uma pergunta válida devolve a resposta normalizada, sem cache', async () => {
    const f = motorResponde(fluxo(MARKDOWN));
    const POST = await carregarRota();
    const res = await POST(pedido({ pergunta: PERGUNTA }));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');

    const corpo = await res.json();
    expect(corpo.ok).toBe(true);
    expect(corpo.resposta.blocos.map((b: { tipo: string }) => b.tipo)).toEqual(['titulo', 'paragrafo']);
    expect(corpo.resposta.fontes).toHaveLength(1);
    expect(corpo.resposta.fontes[0]).toMatchObject({ n: 1, dominio: 'mitess.gov.mz', estado: true });
    // O Markdown do motor não sai: sai o nosso modelo.
    expect(JSON.stringify(corpo)).not.toContain('## Aviso');

    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0]![0]).toBe(URL_MOTOR);
  });

  it('o histórico segue para o motor como mensagens anteriores', async () => {
    const f = motorResponde(fluxo(MARKDOWN));
    const POST = await carregarRota();
    await POST(pedido({ pergunta: 'E se o contrato for a prazo?', historico: [{ pergunta: PERGUNTA, resposta: 'Depende.' }] }));
    const enviado = JSON.parse(f.mock.calls[0]![1]!.body as string);
    expect(enviado.messages.map((m: { role: string }) => m.role)).toEqual(['user', 'assistant', 'user']);
  });

  it('a pergunta e a resposta nunca vão para o log', async () => {
    motorResponde(fluxo(MARKDOWN));
    const POST = await carregarRota();
    await POST(pedido({ pergunta: PERGUNTA }));
    const log = linhas.join('\n');
    expect(log).toContain('civico.respondida');
    expect(log).not.toContain('aviso prévio');
    expect(log).not.toContain('empregador');
    expect(log).not.toContain('antiguidade');
    expect(log).not.toContain('droppedFields');
  });

  it.each([
    ['um e-mail', `${PERGUNTA} Respondam para ana.silva@exemplo.co.mz`, 'email'],
    ['um telefone', `${PERGUNTA} O meu número é 84 123 4567`, 'numero'],
  ])('uma pergunta com %s responde 422, diz o que tirar e não chega ao motor', async (_nome, pergunta, dado) => {
    const f = motorResponde(fluxo(MARKDOWN));
    const POST = await carregarRota();
    const res = await POST(pedido({ pergunta }));
    expect(res.status).toBe(422);
    expect((await res.json()).dado).toBe(dado);
    expect(f).not.toHaveBeenCalled();
    const log = linhas.join('\n');
    expect(log).toContain('dado-pessoal');
    expect(log).not.toContain('exemplo.co.mz');
    expect(log).not.toContain('4567');
  });

  it.each([
    ['content-type errado', () => pedido({ pergunta: PERGUNTA }, { 'content-type': 'text/plain' }), 415],
    ['JSON inválido', () => pedido('{não é json'), 400],
    ['pergunta curta', () => pedido({ pergunta: 'oi' }), 400],
    ['campo a mais', () => pedido({ pergunta: PERGUNTA, nome: 'Ana' }), 400],
    ['corpo declarado grande', () => pedido({ pergunta: PERGUNTA }, { 'content-length': '999999' }), 413],
    ['corpo grande', () => pedido({ pergunta: PERGUNTA, historico: 'x'.repeat(20_000) }), 413],
  ])('%s é recusado sem chamar o motor', async (_nome, fazer, status) => {
    const f = motorResponde(fluxo(MARKDOWN));
    const POST = await carregarRota();
    const res = await POST(fazer());
    expect(res.status).toBe(status);
    expect(f).not.toHaveBeenCalled();
  });

  it('limita a taxa por origem, com Retry-After', async () => {
    motorResponde(fluxo(MARKDOWN));
    const POST = await carregarRota({ ...LIGADO, CIVICO_RATE_LIMIT_MAX: '2' });
    const mesmo = { 'x-forwarded-for': '203.0.113.9' };
    expect((await POST(pedido({ pergunta: PERGUNTA }, mesmo))).status).toBe(200);
    expect((await POST(pedido({ pergunta: PERGUNTA }, mesmo))).status).toBe(200);
    const terceiro = await POST(pedido({ pergunta: PERGUNTA }, mesmo));
    expect(terceiro.status).toBe(429);
    expect(Number(terceiro.headers.get('retry-after'))).toBeGreaterThan(0);
    // Outra origem não é afectada.
    expect((await POST(pedido({ pergunta: PERGUNTA }, { 'x-forwarded-for': '203.0.113.10' }))).status).toBe(200);
  });

  it.each([
    ['o motor bloqueia (403)', 'x', 403, 503],
    ['o motor esgota a quota (429)', 'x', 429, 503],
    ['o motor falha (500)', 'x', 500, 502],
    ['o motor devolve uma página', '<html>manutenção</html>', 200, 502],
    ['o fluxo traz um erro', `data: ${JSON.stringify({ type: 'error', errorText: 'segredo interno' })}\n\n`, 200, 502],
  ])('quando %s, a rota responde com a mesma mensagem vaga', async (_nome, corpo, statusMotor, esperado) => {
    motorResponde(corpo, statusMotor);
    const POST = await carregarRota();
    const res = await POST(pedido({ pergunta: PERGUNTA }));
    expect(res.status).toBe(esperado);
    const json = await res.json();
    expect(json.error).toBe('Não foi possível responder a esta pergunta.');
    expect(JSON.stringify(json)).not.toContain('segredo');
    expect(linhas.join('\n')).not.toContain('segredo');
  });

  it('timeout do motor é 504', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw Object.assign(new Error('timeout'), { name: 'TimeoutError' });
      }),
    );
    const POST = await carregarRota();
    expect((await POST(pedido({ pergunta: PERGUNTA }))).status).toBe(504);
  });

  it('uma resposta sem fontes é entregue, e fica no log como aviso', async () => {
    motorResponde(fluxo('Não encontrei um texto oficial sobre isso.'));
    const POST = await carregarRota();
    const res = await POST(pedido({ pergunta: PERGUNTA }));
    expect(res.status).toBe(200);
    expect((await res.json()).resposta.fontes).toEqual([]);
    const linha = linhas.map((l) => JSON.parse(l)).find((l) => l.event === 'civico.respondida');
    expect(linha).toMatchObject({ level: 'warn', outcome: 'sem-fonte', fontes: 0 });
  });

  it('mede a consulta feita e a que falhou, só com contagens', async () => {
    const registar = vi.fn(async () => {});
    vi.doMock('@/lib/analytics/servidor', () => ({ registarEventoServidor: registar }));

    motorResponde(fluxo(MARKDOWN));
    let POST = await carregarRota();
    await POST(pedido({ pergunta: PERGUNTA }));
    expect(registar).toHaveBeenCalledTimes(1);
    const [nome, props, opcoes] = registar.mock.calls[0] as unknown as [string, Record<string, unknown>, { path: string }];
    expect(nome).toBe('civico_consulta');
    expect(props).toMatchObject({ trocas: 0, fontes: 1, fontesEstado: 1 });
    expect(opcoes).toEqual({ path: '/civico' });
    expect(JSON.stringify(props)).not.toContain('empregador');

    registar.mockClear();
    motorResponde('x', 500);
    POST = await carregarRota();
    await POST(pedido({ pergunta: PERGUNTA }));
    expect((registar.mock.calls[0] as unknown as [string, Record<string, unknown>])[0]).toBe('civico_falhou');
    expect((registar.mock.calls[0] as unknown as [string, Record<string, unknown>])[1]).toMatchObject({ motivo: 'http', status: 500 });

    // Um pedido inválido não é uma consulta tentada.
    registar.mockClear();
    await POST(pedido({ pergunta: 'oi' }));
    expect(registar).not.toHaveBeenCalled();
  });
});
