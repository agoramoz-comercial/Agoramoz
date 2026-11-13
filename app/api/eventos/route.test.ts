import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EVENTOS_DE_SERVIDOR } from '@/lib/analytics/events';

/**
 * A rota de eventos tem uma propriedade invulgar: **responde 204 a tudo depois
 * do parse**. Aceite, recusado pelo schema, persistência desligada, base em
 * baixo — a resposta é a mesma. Quem sonda não aprende o que passa, e a
 * interface do site nunca depende do resultado de uma medição.
 *
 * Isso torna os testes de aceitação inúteis do lado do HTTP: o que se verifica
 * é o que chega (ou não chega) à base.
 */

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
const clienteDb = vi.fn();

vi.mock('@/lib/db/client', () => ({
  dbAdmin: () => clienteDb(),
}));

async function carregarRota(env: Record<string, string> = {}) {
  vi.resetModules();
  // Medição ligada exige a base configurada (env.ts); o cliente é simulado.
  const base =
    env.ANALYTICS_PERSISTENCE === 'on'
      ? { SUPABASE_URL: 'https://projecto.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'chave-de-teste-suficientemente-longa' }
      : {};
  for (const [k, v] of Object.entries({ ...base, ...env })) vi.stubEnv(k, v);
  const mod = await import('./route');
  return mod.POST;
}

let origem = 0;
function pedido(body: unknown, init: { headers?: Record<string, string> } = {}) {
  origem += 1;
  return new Request('https://agoramoz.com/api/eventos', {
    method: 'POST',
    headers: new Headers({
      'content-type': 'application/json',
      'x-forwarded-for': `198.51.100.${origem % 250}`,
      ...init.headers,
    }),
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const VALIDO = {
  evento: { name: 'gbp_landing_view', landing: 'perfil' },
  channel: 'gbp',
  campaign: 'gbp',
  path: '/perfil',
};

beforeEach(() => {
  vi.stubEnv('ANALYTICS_RATE_LIMIT_MAX', '500');
  insert.mockReset().mockResolvedValue({ error: null });
  from.mockClear();
  clienteDb.mockReset().mockReturnValue({ from });
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('guardas', () => {
  it('recusa um tipo de conteúdo que não seja JSON', async () => {
    const POST = await carregarRota();
    const res = await POST(pedido(VALIDO, { headers: { 'content-type': 'text/plain' } }));
    expect(res.status).toBe(415);
  });

  it('recusa um corpo declarado grande demais', async () => {
    const POST = await carregarRota();
    const res = await POST(pedido(VALIDO, { headers: { 'content-length': '999999' } }));
    expect(res.status).toBe(413);
  });

  it('recusa JSON inválido', async () => {
    const POST = await carregarRota();
    expect((await POST(pedido('{ não é json'))).status).toBe(400);
  });

  it('trava quem envia demais', async () => {
    const POST = await carregarRota({ ANALYTICS_RATE_LIMIT_MAX: '2' });
    const mesmo = () =>
      new Request('https://agoramoz.com/api/eventos', {
        method: 'POST',
        headers: new Headers({ 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.251' }),
        body: JSON.stringify(VALIDO),
      });

    await POST(mesmo());
    await POST(mesmo());
    expect((await POST(mesmo())).status).toBe(429);
  });
});

describe('o que é gravado', () => {
  it('um evento válido chega à tabela', async () => {
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'on' });
    const res = await POST(pedido(VALIDO));

    expect(res.status).toBe(204);
    expect(from).toHaveBeenCalledWith('analytics_events');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'gbp_landing_view', channel: 'gbp', origin: 'browser' }),
    );
  });

  it('com a persistência desligada não toca na base', async () => {
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'off' });
    const res = await POST(pedido(VALIDO));

    expect(res.status).toBe(204);
    expect(clienteDb).not.toHaveBeenCalled();
  });

  it('a origem é sempre «browser», mesmo que o corpo diga outra coisa', async () => {
    // Não está no schema, portanto o corpo é recusado — mas se algum dia
    // estivesse, `origin` é do servidor e não do cliente.
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'on' });
    await POST(pedido({ ...VALIDO, origin: 'servidor' }));
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('o que NÃO é aceite', () => {
  it('responde 204 mesmo ao que recusa — não diz a quem sonda o que passou', async () => {
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'on' });
    const res = await POST(pedido({ evento: { name: 'nao_existe' }, channel: 'gbp', campaign: null, path: null }));

    expect(res.status).toBe(204);
    expect(insert).not.toHaveBeenCalled();
  });

  it.each(EVENTOS_DE_SERVIDOR)('recusa o evento de servidor %s', async (nome) => {
    /**
     * Um `deal_won` que qualquer browser pudesse enviar não serviria para
     * medir nada. Estes nascem em gatilhos da base.
     */
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'on' });
    await POST(
      pedido({ evento: { name: nome, dealId: 'x', channel: 'gbp' }, channel: 'gbp', campaign: null, path: null }),
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it('recusa campos a mais no evento', async () => {
    /**
     * A regressão concreta que isto impede: alguém anexa `tier` «só para o
     * analytics», e a classificação interna do lead passa a viajar no
     * browser. Já aconteceu uma vez — ver D-15.
     */
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'on' });
    await POST(
      pedido({
        evento: { name: 'diagnostic_submitted', tier: 'A', score: 90 },
        channel: 'gbp',
        campaign: null,
        path: null,
      }),
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it('nunca aceita identidade vinda do browser', async () => {
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'on' });
    for (const extra of [{ contact_id: 'x' }, { deal_id: 'x' }, { email: 'a@b.com' }, { visitor_id: 'x' }]) {
      await POST(pedido({ ...VALIDO, ...extra }));
    }
    expect(insert).not.toHaveBeenCalled();
  });

  it('um canal inventado é recusado', async () => {
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'on' });
    await POST(pedido({ ...VALIDO, channel: 'inventado' }));
    expect(insert).not.toHaveBeenCalled();
  });

  it('a campanha e o caminho são re-saneados no servidor', async () => {
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'on' });
    await POST(pedido({ ...VALIDO, campaign: 'CAMPANHA', path: '/perfil?email=a@b.com' }));

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ campaign: 'campanha', path: '/perfil' }),
    );
  });

  it('uma falha da base não faz falhar o pedido', async () => {
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'on' });
    insert.mockResolvedValue({ error: { code: '42501' } });

    expect((await POST(pedido(VALIDO))).status).toBe(204);
  });
});

describe('vistas de página (D-47)', () => {
  const NAVEGADOR = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
  const vista = (ref: string | null = 'www.google.com') => ({
    evento: { name: 'page_view', ref, ecra: 'telemovel' },
    channel: 'organico',
    campaign: null,
    path: '/civico',
  });
  const cabecalhos = (ip = '203.0.113.7', ua = NAVEGADOR) => ({ 'user-agent': ua, 'x-forwarded-for': ip, 'x-vercel-ip-country': 'MZ' });
  const gravado = () => insert.mock.calls.at(-1)?.[0] as { props: Record<string, unknown>; path: string };

  it('grava a vista com a visita (resumo de 16 hex), o país e só o host do referenciador', async () => {
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'on' });
    await POST(pedido(vista(), { headers: cabecalhos() }));
    const r = gravado();
    expect(r.path).toBe('/civico');
    expect(r.props.visita).toMatch(/^[0-9a-f]{16}$/);
    expect(r.props).toMatchObject({ ref: 'www.google.com', pais: 'MZ', ecra: 'telemovel' });
    // Nem o IP nem o navegador ficam guardados, em lado nenhum da linha.
    expect(JSON.stringify(insert.mock.calls.at(-1))).not.toMatch(/203\.0\.113\.7|Android/);
  });

  it('a mesma origem e o mesmo navegador dão a mesma visita; outro IP dá outra', async () => {
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'on' });
    await POST(pedido(vista(), { headers: cabecalhos() }));
    const a = gravado().props.visita;
    await POST(pedido(vista(null), { headers: cabecalhos() }));
    const b = gravado().props.visita;
    await POST(pedido(vista(null), { headers: cabecalhos('203.0.113.8') }));
    expect(b).toBe(a);
    expect(gravado().props.visita).not.toBe(a);
  });

  it('robôs e ferramentas não contam', async () => {
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'on' });
    for (const ua of ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'curl/8.4.0', 'Mozilla/5.0 Chrome-Lighthouse']) {
      await POST(pedido(vista(), { headers: cabecalhos('203.0.113.9', ua) }));
    }
    expect(insert).not.toHaveBeenCalled();
  });

  it('o referenciador do próprio site não é referência; um referenciador estranho é recusado', async () => {
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'on' });
    await POST(pedido(vista('agoramoz.com'), { headers: cabecalhos() }));
    expect(gravado().props.ref).toBeNull();
    await POST(pedido({ ...vista(), evento: { name: 'page_view', ref: 'https://x.com/?q=nome', ecra: 'telemovel' } }, { headers: cabecalhos() }));
    // Recusado pelo esquema (não é só um host): nada gravado de novo.
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('o tempo de leitura e o scroll têm limites', async () => {
    const POST = await carregarRota({ ANALYTICS_PERSISTENCE: 'on' });
    const leitura = (ms: number, scroll: number) => ({ evento: { name: 'page_engagement', ms, scroll }, channel: 'directo', campaign: null, path: '/' });
    await POST(pedido(leitura(42_000, 80), { headers: cabecalhos() }));
    expect(gravado().props).toMatchObject({ ms: 42_000, scroll: 80 });
    await POST(pedido(leitura(42_000, 101), { headers: cabecalhos() }));
    await POST(pedido(leitura(3_600_000, 50), { headers: cabecalhos() }));
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
