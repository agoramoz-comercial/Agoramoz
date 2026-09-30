import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXEMPLO_LOVABLE } from '@/lib/news/exemplo';

/**
 * A rota de análise de notícias, com o motor Lovable simulado por `fetch`.
 * Nenhum teste aqui fala com a rede: isso seria gastar créditos de IA para
 * provar o que um duplo prova igual.
 */

const URL_MOTOR = 'https://motor-exemplo.supabase.co/functions/v1/analyze-news';
const CHAVE = 'chave-de-teste-com-mais-de-vinte-caracteres';

const LIGADO = {
  NEWS_ENGINE: 'lovable',
  LOVABLE_NEWS_FUNCTION_URL: URL_MOTOR,
  LOVABLE_NEWS_API_KEY: CHAVE,
  NEWS_RATE_LIMIT_MAX: '100',
};

async function carregarRota(env: Record<string, string> = LIGADO) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const mod = await import('./route');
  return mod.POST;
}

let origem = 0;
function pedido(body: unknown, headers: Record<string, string> = {}) {
  origem += 1;
  return new Request('https://agoramoz.com/api/news/analisar', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `198.51.100.${origem % 250}`,
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const POR_URL = { modo: 'url', url: 'https://www.exemplo.co.mz/noticia/1', idioma: 'pt' };

function motorResponde(corpo: unknown, status = 200) {
  const f = vi.fn(async () => new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), { status }));
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
});

describe('motor desligado', () => {
  it('NEWS_ENGINE=off responde 503 sem chamar o motor', async () => {
    const f = motorResponde(EXEMPLO_LOVABLE);
    const POST = await carregarRota({ NEWS_ENGINE: 'off' });
    const res = await POST(pedido(POR_URL));
    expect(res.status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });
});

describe('configuração inválida', () => {
  it('motor ligado sem as variáveis: 503 com correlationId e log próprio — não um 500 mudo', async () => {
    const f = motorResponde(EXEMPLO_LOVABLE);
    const POST = await carregarRota({ NEWS_ENGINE: 'lovable' });
    const res = await POST(pedido(POR_URL));
    expect(res.status).toBe(503);
    expect((await res.json()).correlationId).toBeTruthy();
    expect(f).not.toHaveBeenCalled();
    expect(linhas.join('\n')).toContain('config-invalida');
  });
});

describe('motor recusa por credenciais ou quota', () => {
  it.each([401, 402, 403, 429])('%i do motor → 503 (é nosso, não do artigo)', async (status) => {
    motorResponde({ error: 'x' }, status);
    const POST = await carregarRota();
    const res = await POST(pedido(POR_URL));
    expect(res.status).toBe(503);
    expect(linhas.join('\n')).toContain('indisponivel');
  });
});

describe('resposta parcial', () => {
  it('fica registada como aviso, com o número de secções em falta e de itens descartados', async () => {
    const parcial = structuredClone(EXEMPLO_LOVABLE) as unknown as { analysis: Record<string, unknown> };
    parcial.analysis.risks = [{ title: 'x', description: 'y', severity: 'low' }];
    delete parcial.analysis.macro_analysis;
    motorResponde(parcial);
    const POST = await carregarRota();
    const res = await POST(pedido(POR_URL));
    expect(res.status).toBe(200);
    const linha = JSON.parse(linhas.find((l) => l.includes('news.analisada'))!);
    expect(linha).toMatchObject({ level: 'warn', faltas: 2, descartados: 1, outcome: 'parcial' });
  });
});

describe('sucesso', () => {
  it('chama o motor com o contrato do Lovable e devolve a análise normalizada', async () => {
    const f = motorResponde(EXEMPLO_LOVABLE);
    const POST = await carregarRota();
    const res = await POST(pedido(POR_URL));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');

    const corpo = await res.json();
    expect(corpo.ok).toBe(true);
    expect(corpo.motor).toBe('lovable');
    expect(corpo.analise.prioridade).toBe('high');
    expect(corpo.analise.pontuacoes).toHaveLength(5);
    // O modelo é o nosso, não o JSON do motor.
    expect(corpo).not.toHaveProperty('analysis');

    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(URL_MOTOR);
    expect(JSON.parse(String(init.body))).toEqual({ lang: 'pt', url: POR_URL.url });
    const h = init.headers as Record<string, string>;
    expect(h.authorization).toBe(`Bearer ${CHAVE}`);
    expect(h.apikey).toBe(CHAVE);
    // Um redireccionamento levaria o cabeçalho `apikey` a outro domínio.
    expect(init.redirect).toBe('error');
  });

  it('modo texto envia `content`', async () => {
    const f = motorResponde(EXEMPLO_LOVABLE);
    const POST = await carregarRota();
    const texto = 'Artigo colado. '.repeat(20);
    await POST(pedido({ modo: 'texto', texto, idioma: 'en' }));
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ lang: 'en', content: texto.trim() });
  });
});

describe('o que sai do motor é dado não confiável', () => {
  it.each([
    ['500 do motor', () => motorResponde({ error: 'x' }, 500), 502],
    ['{ error } com 200', () => motorResponde({ error: 'Falha interna com detalhe' }), 502],
    ['JSON inválido', () => motorResponde('<html>não é json'), 502],
    ['resposta acima do tecto', () => motorResponde('x'.repeat(1_100_000)), 502],
    [
      'tempo esgotado a ler o corpo',
      () => {
        vi.stubGlobal(
          'fetch',
          vi.fn(async () => ({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: async () => {
              throw Object.assign(new Error('timeout'), { name: 'TimeoutError' });
            },
          })),
        );
      },
      504,
    ],
    ['análise vazia', () => motorResponde({ analysis: {} }), 502],
    [
      'rede em baixo',
      () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
      },
      502,
    ],
    [
      'tempo esgotado',
      () => {
        vi.stubGlobal(
          'fetch',
          vi.fn(async () => { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }); }),
        );
      },
      504,
    ],
  ])('%s → %i, com mensagem genérica', async (_, preparar, status) => {
    preparar();
    const POST = await carregarRota();
    const res = await POST(pedido(POR_URL));
    expect(res.status).toBe(status);
    const corpo = await res.json();
    expect(corpo.error).toBe('Não foi possível analisar esta notícia.');
    expect(JSON.stringify(corpo)).not.toContain('detalhe');
  });
});

describe('guardas de entrada', () => {
  it('URL privado é recusado antes de chegar ao motor', async () => {
    const f = motorResponde(EXEMPLO_LOVABLE);
    const POST = await carregarRota();
    const res = await POST(pedido({ ...POR_URL, url: 'https://169.254.169.254/latest/meta-data' }));
    expect(res.status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });

  it('tipo de conteúdo, tamanho e JSON', async () => {
    motorResponde(EXEMPLO_LOVABLE);
    const POST = await carregarRota();
    expect((await POST(pedido(POR_URL, { 'content-type': 'text/plain' }))).status).toBe(415);
    expect((await POST(pedido(POR_URL, { 'content-length': String(1024 * 1024) }))).status).toBe(413);
    expect((await POST(pedido({ modo: 'texto', texto: 'x'.repeat(70_000), idioma: 'pt' }))).status).toBe(413);
    expect((await POST(pedido('{não é json'))).status).toBe(400);
  });

  it('limite de taxa por origem, com Retry-After', async () => {
    const f = motorResponde(EXEMPLO_LOVABLE);
    const POST = await carregarRota({ ...LIGADO, NEWS_RATE_LIMIT_MAX: '2' });
    const mesmo = { 'x-forwarded-for': '192.0.2.77' };
    expect((await POST(pedido(POR_URL, mesmo))).status).toBe(200);
    expect((await POST(pedido(POR_URL, mesmo))).status).toBe(200);
    const res = await POST(pedido(POR_URL, mesmo));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe('logs', () => {
  it('nem o URL, nem o texto, nem a chave, nem o endereço do motor chegam aos logs', async () => {
    motorResponde(EXEMPLO_LOVABLE);
    const POST = await carregarRota();
    await POST(pedido(POR_URL));
    motorResponde({ error: 'x' }, 500);
    const texto = 'Segredo comercial no artigo. '.repeat(10);
    await POST(pedido({ modo: 'texto', texto, idioma: 'pt' }));

    const tudo = linhas.join('\n');
    expect(tudo).toContain('news.analisada');
    expect(tudo).toContain('news.falhou');
    for (const proibido of ['exemplo.co.mz', 'Segredo comercial', CHAVE, 'motor-exemplo']) {
      expect(tudo, proibido).not.toContain(proibido);
    }
    const ok = JSON.parse(linhas.find((l) => l.includes('news.analisada'))!);
    expect(ok).toMatchObject({ modo: 'url', idioma: 'pt', prioridade: 'high', outcome: 'ok' });
  });
});
