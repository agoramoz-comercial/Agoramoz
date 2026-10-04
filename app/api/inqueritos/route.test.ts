import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { specInicial, specInquerito, type SpecInquerito } from '@/lib/inqueritos/spec';
import { chaveDeIdempotencia, hashToken } from '@/lib/inqueritos/token';

/**
 * Testes das guardas da rota pública de inquéritos. A base é simulada: o que
 * se prova aqui é a ordem das guardas, o que chega à RPC e o que NUNCA chega
 * aos logs. O comportamento das funções SQL está em
 * `.qa/inqueritos-comportamento.sql`, contra um Postgres real.
 */

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde';
const SUBMISSAO = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';
const INQUERITO = '0b5d7a3e-1f2c-4d6e-9a8b-7c6d5e4f3a2b';
const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres-xx';

const SPEC_CONTACTO: SpecInquerito = specInquerito.parse({
  ...specInicial('pt'),
  contacto: { campos: ['email'], textoConsentimento: 'Aceito ser contactado pela AGORAMOZ.' },
});

type Rpc = (
  nome: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: unknown }>;
let rpc: ReturnType<typeof vi.fn<Rpc>>;
let semCliente = false;

vi.mock('@/lib/db/client', () => ({
  dbAdmin: () =>
    semCliente ? null : { rpc: (n: string, a: Record<string, unknown>) => rpc(n, a) },
}));

function aberto(spec: SpecInquerito = specInicial('pt')) {
  return { estado: 'aberto', inquerito: INQUERITO, versao: 1, spec };
}

/** A base responde ao obter com `obter` e ao gravar com `gravar`. */
function base(obter: unknown, gravar: unknown = { ok: true, duplicado: false }) {
  rpc = vi.fn<Rpc>(async (nome) =>
    nome === 'obter_inquerito_publico'
      ? { data: obter, error: null }
      : { data: gravar, error: null },
  );
}

async function carregarRota(env: Record<string, string> = {}) {
  vi.resetModules();
  vi.stubEnv('SURVEYS', 'on');
  vi.stubEnv('SURVEY_LINK_SECRET', SEGREDO);
  vi.stubEnv('SUPABASE_URL', 'https://exemplo.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'chave-de-servico-de-teste-xxxxxxxx');
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const mod = await import('./route');
  return mod.POST;
}

let origem = 0;
function pedido(body: unknown, headers: Record<string, string> = {}) {
  origem += 1;
  return new Request('https://agoramoz.com/api/inqueritos', {
    method: 'POST',
    headers: new Headers({
      'content-type': 'application/json',
      'x-forwarded-for': `198.51.100.${origem % 250}`,
      ...headers,
    }),
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const VALIDO = { token: TOKEN, submissionId: SUBMISSAO, respostas: { p1: 'a' } };

let saida: string[];
beforeEach(() => {
  semCliente = false;
  base(aberto());
  saida = [];
  const guardar = (...a: unknown[]) => void saida.push(a.map(String).join(' '));
  vi.spyOn(console, 'log').mockImplementation(guardar);
  vi.spyOn(console, 'warn').mockImplementation(guardar);
  vi.spyOn(console, 'error').mockImplementation(guardar);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('flag e guardas de entrada', () => {
  it('com SURVEYS=off responde 404 e não toca na base', async () => {
    const POST = await carregarRota({ SURVEYS: 'off' });
    const res = await POST(pedido(VALIDO));
    expect(res.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('SURVEYS=on sem SURVEY_LINK_SECRET é configuração inválida, não uma rota aberta', async () => {
    vi.resetModules();
    vi.stubEnv('SURVEYS', 'on');
    vi.stubEnv('SUPABASE_URL', 'https://exemplo.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'chave-de-servico-de-teste-xxxxxxxx');
    vi.stubEnv('SURVEY_LINK_SECRET', undefined);
    const { POST } = await import('./route');
    await expect(POST(pedido(VALIDO))).rejects.toThrow(/SURVEY_LINK_SECRET/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('recusa um tipo de conteúdo que não seja JSON', async () => {
    const POST = await carregarRota();
    expect((await POST(pedido(VALIDO, { 'content-type': 'text/plain' }))).status).toBe(415);
  });

  it('recusa um corpo grande pelo tamanho declarado e pelo real', async () => {
    const POST = await carregarRota();
    expect((await POST(pedido(VALIDO, { 'content-length': '999999' }))).status).toBe(413);
    const grande = { ...VALIDO, respostas: { p1: 'x'.repeat(70 * 1024) } };
    expect((await POST(pedido(grande))).status).toBe(413);
  });

  it('recusa JSON partido e envelopes fora da forma', async () => {
    const POST = await carregarRota();
    expect((await POST(pedido('{'))).status).toBe(400);
    for (const mau of [
      { ...VALIDO, token: 'curto' },
      { ...VALIDO, submissionId: 'nao-e-uuid' },
      { ...VALIDO, extra: 1 },
      { token: TOKEN, submissionId: SUBMISSAO },
    ]) {
      expect((await POST(pedido(mau))).status, JSON.stringify(mau)).toBe(400);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it('armadilha: 202 indistinguível, sem tocar na base', async () => {
    const POST = await carregarRota();
    const res = await POST(pedido({ ...VALIDO, fax: 'bot' }));
    expect(res.status).toBe(202);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('limita por origem com Retry-After', async () => {
    const POST = await carregarRota();
    const mesma = { 'x-forwarded-for': '192.0.2.77' };
    let ultimo: Response | null = null;
    for (let i = 0; i < 21; i += 1) ultimo = await POST(pedido(VALIDO, mesma));
    expect(ultimo!.status).toBe(429);
    expect(Number(ultimo!.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('sem cliente de base é 503, nunca 200', async () => {
    semCliente = true;
    const POST = await carregarRota();
    expect((await POST(pedido(VALIDO))).status).toBe(503);
  });
});

describe('estado do link', () => {
  it('link desconhecido é 404; fechado e expirado são 410 com o estado', async () => {
    const POST = await carregarRota();
    base({ estado: 'inexistente' });
    expect((await POST(pedido(VALIDO))).status).toBe(404);
    for (const estado of ['fechado', 'expirado'] as const) {
      base({ estado });
      const res = await POST(pedido(VALIDO));
      expect(res.status).toBe(410);
      expect(await res.json()).toMatchObject({ estado });
    }
  });

  it('fechado entre a leitura e a gravação também é 410', async () => {
    const POST = await carregarRota();
    base(aberto(), { ok: false, estado: 'fechado' });
    expect((await POST(pedido(VALIDO))).status).toBe(410);
  });

  it('um spec guardado que já não valida é avaria (503), não um formulário meio lido', async () => {
    const POST = await carregarRota();
    base({ estado: 'aberto', inquerito: INQUERITO, versao: 1, spec: { perguntas: [] } });
    expect((await POST(pedido(VALIDO))).status).toBe(503);
  });

  it('erro da base é 503', async () => {
    const POST = await carregarRota();
    rpc = vi.fn<Rpc>(async () => ({ data: null, error: { code: '57014' } }));
    expect((await POST(pedido(VALIDO))).status).toBe(503);
  });
});

describe('validação e gravação', () => {
  it('respostas inválidas para o spec guardado são 400 e não chegam à gravação', async () => {
    const POST = await carregarRota();
    for (const respostas of [{}, { p1: 'z' }, { p1: 'a', desconhecida: 'x' }]) {
      expect((await POST(pedido({ ...VALIDO, respostas }))).status).toBe(400);
    }
    expect(rpc.mock.calls.map(([n]) => n)).not.toContain('ingest_survey_response');
  });

  it('grava só o hash do token, com a chave de idempotência do link + submissão', async () => {
    const POST = await carregarRota();
    const res = await POST(pedido(VALIDO));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });

    const tokenHash = hashToken(TOKEN);
    expect(rpc).toHaveBeenCalledWith('obter_inquerito_publico', { p_token_hash: tokenHash });
    const [, args] = rpc.mock.calls.find(([n]) => n === 'ingest_survey_response')!;
    expect(args).toMatchObject({
      p_token_hash: tokenHash,
      p_respostas: { p1: 'a' },
      p_idempotency_key: chaveDeIdempotencia(tokenHash, SUBMISSAO),
      p_contacto: null,
      p_consentimento_versao: null,
    });
    expect(JSON.stringify(args)).not.toContain(TOKEN);
    expect(args.p_ip_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('nova e repetida devolvem exactamente a mesma forma', async () => {
    const POST = await carregarRota();
    const nova = await (await POST(pedido(VALIDO))).json();
    base(aberto(), { ok: true, duplicado: true });
    const repetida = await (await POST(pedido(VALIDO))).json();
    expect(Object.keys(repetida).sort()).toEqual(Object.keys(nova).sort());
  });

  it('contacto com consentimento segue com a versão do texto lido', async () => {
    const POST = await carregarRota();
    base(aberto(SPEC_CONTACTO));
    const res = await POST(
      pedido({ ...VALIDO, contacto: { email: 'ana@exemplo.test', consentimento: true } }),
    );
    expect(res.status).toBe(200);
    const [, args] = rpc.mock.calls.find(([n]) => n === 'ingest_survey_response')!;
    expect(args.p_contacto).toEqual({ email: 'ana@exemplo.test', consentimento: true });
    expect(args.p_consentimento_versao).toMatch(/^consent\.inquerito\.[0-9a-f]{12}$/);
  });

  it('contacto sem consentimento é recusado', async () => {
    const POST = await carregarRota();
    base(aberto(SPEC_CONTACTO));
    const res = await POST(pedido({ ...VALIDO, contacto: { email: 'ana@exemplo.test' } }));
    expect(res.status).toBe(400);
  });
});

describe('logs', () => {
  it('nunca levam o token, as respostas nem o contacto', async () => {
    const POST = await carregarRota();
    base(aberto(SPEC_CONTACTO));
    await POST(
      pedido({
        ...VALIDO,
        respostas: { p1: 'b' },
        contacto: { email: 'segredo@exemplo.test', consentimento: true },
      }),
    );
    await POST(pedido({ ...VALIDO, respostas: { p1: 'resposta-invalida-xyz' } }));
    const tudo = saida.join('\n');
    expect(tudo).toContain('inquerito.aceite');
    expect(tudo).not.toContain(TOKEN);
    expect(tudo).not.toContain(hashToken(TOKEN));
    expect(tudo).not.toContain('segredo@exemplo.test');
    expect(tudo).not.toContain('resposta-invalida-xyz');
  });
});
