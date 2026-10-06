import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * As rotas públicas do jornal (0015) com a base simulada: gosto, partilha,
 * impressões e o clique no outdoor. Nenhum teste fala com o Supabase.
 */

const estado = { ligado: true };
const rpc = vi.fn();

vi.mock('next/server', async (original) => ({
  ...(await original<typeof import('next/server')>()),
  after: () => {},
}));
vi.mock('@/lib/db/client', () => ({ dbAdmin: () => ({ rpc }) }));
vi.mock('@/lib/news/jornal-servidor', () => ({ jornalLigado: () => estado.ligado }));

const TOKEN = 'a1'.repeat(16);
const ANUNCIO = '00000000-0000-4000-8000-0000000000a1';
let ip = 0;

function post(caminho: string, corpo: unknown, headers: Record<string, string> = {}) {
  ip += 1;
  return new Request(`https://agoramoz.com${caminho}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `203.0.113.${ip % 250}`, ...headers },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });
}

beforeEach(() => {
  estado.ligado = true;
  rpc.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('POST /api/news/gosto', async () => {
  const { POST } = await import('./gosto/route');

  it('com o jornal desligado: 404 e nada na base', async () => {
    estado.ligado = false;
    const r = await POST(post('/api/news/gosto', { slug: 'artigo-a1', token: TOKEN }));
    expect(r.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('a base recebe o hash do token com o artigo, nunca o token', async () => {
    rpc.mockResolvedValue({ data: { gostos: 4, novo: true }, error: null });
    const r = await POST(post('/api/news/gosto', { slug: 'artigo-a1', token: TOKEN }));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ gostos: 4 });
    const [nome, args] = rpc.mock.calls[0]!;
    expect(nome).toBe('gostar_artigo');
    expect(args.p_chave_hash).toBe(createHash('sha256').update(`${TOKEN}:artigo-a1`).digest('hex'));
    expect(JSON.stringify(args)).not.toContain(TOKEN);
  });

  it.each([
    [{ slug: 'artigo-a1', token: 'curto' }],
    [{ slug: 'Artigo A1', token: TOKEN }],
    [{ slug: 'artigo-a1', token: TOKEN, extra: 1 }],
  ])('envelope inválido %j: 400', async (corpo) => {
    const r = await POST(post('/api/news/gosto', corpo));
    expect(r.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('artigo que não está publicado: 404', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002' } });
    const r = await POST(post('/api/news/gosto', { slug: 'rascunho-x1', token: TOKEN }));
    expect(r.status).toBe(404);
  });

  it('sem JSON: 415', async () => {
    const r = await POST(post('/api/news/gosto', 'x', { 'content-type': 'text/plain' }));
    expect(r.status).toBe(415);
  });
});

describe('POST /api/news/partilha', async () => {
  const { POST } = await import('./partilha/route');

  it('conta por canal', async () => {
    rpc.mockResolvedValue({ data: 3, error: null });
    const r = await POST(post('/api/news/partilha', { slug: 'artigo-a1', canal: 'linkedin' }));
    expect(r.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('partilhar_artigo', { p_slug: 'artigo-a1', p_canal: 'linkedin' });
  });

  it('canal desconhecido: 400', async () => {
    const r = await POST(post('/api/news/partilha', { slug: 'artigo-a1', canal: 'telegrama' }));
    expect(r.status).toBe(400);
  });
});

describe('POST /api/news/anuncio/impressoes', async () => {
  const { POST } = await import('./anuncio/impressoes/route');

  it('responde 204 e regista cada anúncio com a sua chave de leitor', async () => {
    rpc.mockResolvedValue({ data: 1, error: null });
    const outro = '00000000-0000-4000-8000-0000000000a2';
    const r = await POST(
      post('/api/news/anuncio/impressoes', {
        itens: [
          { id: ANUNCIO, posicao: 'topo' },
          { id: outro, posicao: 'feed' },
        ],
        token: TOKEN,
      }),
    );
    expect(r.status).toBe(204);
    expect(rpc).toHaveBeenCalledTimes(2);
    const chaves = rpc.mock.calls.map(([, a]) => a.p_chave_hash);
    expect(chaves[0]).not.toBe(chaves[1]);
  });

  it('lote grande ou posição inventada: 400', async () => {
    const nove = Array.from({ length: 9 }, () => ({ id: ANUNCIO, posicao: 'topo' }));
    expect((await POST(post('/api/news/anuncio/impressoes', { itens: nove }))).status).toBe(400);
    expect(
      (await POST(post('/api/news/anuncio/impressoes', { itens: [{ id: ANUNCIO, posicao: 'lateral' }] }))).status,
    ).toBe(400);
  });
});

describe('GET /api/news/anuncio/[id] — o clique', async () => {
  const { GET } = await import('./anuncio/[id]/route');
  const pedido = (id: string, q = '') =>
    GET(new Request(`https://agoramoz.com/api/news/anuncio/${id}${q}`, { headers: { 'x-forwarded-for': `198.51.100.${++ip % 250}` } }), {
      params: Promise.resolve({ id }),
    });

  it('303 para o destino GUARDADO, com a campanha e o lugar', async () => {
    rpc.mockResolvedValue({ data: { destino: '/solucoes/agentes-ia', slug: 'agentes-ia' }, error: null });
    const r = await pedido(ANUNCIO, `?p=topo&k=${'c'.repeat(64)}`);
    expect(r.status).toBe(303);
    const destino = new URL(r.headers.get('location')!);
    expect(destino.origin).toBe('https://agoramoz.com');
    expect(destino.pathname).toBe('/solucoes/agentes-ia');
    expect(Object.fromEntries(destino.searchParams)).toEqual({
      utm_source: 'agoramoz_news',
      utm_medium: 'outdoor',
      utm_campaign: 'agentes-ia',
      utm_content: 'topo',
    });
    expect(rpc.mock.calls[0]![1].p_chave_hash).toBe('c'.repeat(64));
  });

  it('o token em claro no URL é ignorado; uma chave com forma errada não conta como única', async () => {
    rpc.mockResolvedValue({ data: { destino: '/diagnostico', slug: 'diag' }, error: null });
    await pedido(ANUNCIO, `?p=topo&t=${TOKEN}`);
    expect(rpc.mock.calls.at(-1)![1].p_chave_hash).toBeNull();
    await pedido(ANUNCIO, '?p=topo&k=XYZ');
    expect(rpc.mock.calls.at(-1)![1].p_chave_hash).toBeNull();
  });

  it('o URL do pedido nunca escolhe o destino', async () => {
    rpc.mockResolvedValue({ data: { destino: '/diagnostico', slug: 'diag' }, error: null });
    const r = await pedido(ANUNCIO, '?p=topo&destino=https://evil.test&next=//evil.test');
    expect(new URL(r.headers.get('location')!).host).toBe('agoramoz.com');
  });

  it('um destino guardado que não passa a regra leva ao jornal', async () => {
    rpc.mockResolvedValue({ data: { destino: 'javascript:alert(1)', slug: 'x' }, error: null });
    const r = await pedido(ANUNCIO);
    expect(new URL(r.headers.get('location')!).pathname).toBe('/news');
  });

  it('anúncio fora do ar, id inválido, jornal desligado ou base em baixo: leva ao jornal', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(new URL((await pedido(ANUNCIO)).headers.get('location')!).pathname).toBe('/news');
    expect(new URL((await pedido('nao-e-uuid')).headers.get('location')!).pathname).toBe('/news');
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000' } });
    expect(new URL((await pedido(ANUNCIO)).headers.get('location')!).pathname).toBe('/news');
    estado.ligado = false;
    expect(new URL((await pedido(ANUNCIO)).headers.get('location')!).pathname).toBe('/news');
  });
});

describe('base pendurada (PGRST003 a 2026-10-06): as rotas respondem dentro do prazo', () => {

  it('o clique redirecciona para o jornal em vez de esperar pela base', async () => {
    // Relógio real: o prazo (3 s) só começa depois de passos assíncronos da rota.
    const { GET } = await import('./anuncio/[id]/route');
    rpc.mockReturnValue(new Promise(() => {}));
    const inicio = Date.now();
    const r = await GET(
      new Request(`https://agoramoz.com/api/news/anuncio/${ANUNCIO}?p=topo`, {
        headers: { 'x-forwarded-for': '198.51.100.201' },
      }),
      { params: Promise.resolve({ id: ANUNCIO }) },
    );
    expect(Date.now() - inicio).toBeLessThan(4500);
    expect(r.status).toBe(303);
    expect(new URL(r.headers.get('location')!).pathname).toBe('/news');
  }, 8000);

  it('o gosto devolve 503 em vez de pendurar o pedido', async () => {
    const { POST } = await import('./gosto/route');
    rpc.mockReturnValue(new Promise(() => {}));
    const inicio = Date.now();
    const r = await POST(post('/api/news/gosto', { slug: 'artigo-a1', token: TOKEN }));
    expect(Date.now() - inicio).toBeLessThan(4500);
    expect(r.status).toBe(503);
  }, 8000);
});
