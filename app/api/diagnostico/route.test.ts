import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Testes das guardas da rota de ingestão.
 *
 * O limitador de taxa é um singleton ao nível do módulo — de propósito, para
 * sobreviver entre pedidos na mesma instância. Isso obriga cada grupo de
 * testes a carregar a rota de fresco, senão um grupo esgota a janela e o
 * seguinte recebe 429 sem ter pedido nada. É o que `carregarRota` faz.
 *
 * Cada pedido leva um `x-forwarded-for` distinto pela mesma razão: sem ele
 * todos caem no mesmo balde e os testes interferem uns com os outros.
 */

const VALIDO = {
  country: 'mz',
  sector: 'energia-mineracao',
  company: 'Empresa Exemplo',
  companySize: '10-49',
  currentWebsite: '',
  processToImprove: ['comercial'],
  problemImpact: 'x'.repeat(40),
  decisionTimeframe: '1-3-meses',
  investmentBand: 'mz-2',
  decisionRole: 'decisor',
  name: 'Nome Exemplo',
  workEmail: 'nome@exemplo.co.mz',
  phone: '+258840000000',
  consent: true,
};

async function carregarRota(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const mod = await import('./route');
  return mod.POST;
}

/** Contador para dar a cada pedido uma origem própria. */
let origem = 0;
function pedido(body: unknown, init: { headers?: Record<string, string> } = {}) {
  origem += 1;
  const headers = new Headers({
    'content-type': 'application/json',
    'x-forwarded-for': `203.0.113.${origem % 250}`,
    ...init.headers,
  });
  return new Request('https://agoramoz.com/api/diagnostico', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv('DIAGNOSTIC_RATE_LIMIT_MAX', '100');
  // Silencia a saída estruturada; o conteúdo dos logs tem teste próprio.
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('guardas de entrada', () => {
  it('recusa um tipo de conteúdo que não seja JSON', async () => {
    const POST = await carregarRota();
    const res = await POST(pedido(VALIDO, { headers: { 'content-type': 'text/plain' } }));
    expect(res.status).toBe(415);
  });

  it('aceita application/json com parâmetros de charset', async () => {
    const POST = await carregarRota();
    const res = await POST(
      pedido(VALIDO, { headers: { 'content-type': 'application/json; charset=utf-8' } }),
    );
    expect(res.status).toBe(200);
  });

  it('recusa um corpo acima do tecto, pelo tamanho declarado', async () => {
    const POST = await carregarRota({ DIAGNOSTIC_MAX_BODY_BYTES: '100' });
    const res = await POST(pedido(VALIDO, { headers: { 'content-length': '999999' } }));
    expect(res.status).toBe(413);
  });

  it('recusa um corpo acima do tecto mesmo sem content-length honesto', async () => {
    const POST = await carregarRota({ DIAGNOSTIC_MAX_BODY_BYTES: '100' });
    const res = await POST(pedido({ ...VALIDO, problemImpact: 'x'.repeat(5_000) }));
    expect(res.status).toBe(413);
  });

  it('recusa JSON malformado', async () => {
    const POST = await carregarRota();
    const res = await POST(pedido('{ isto não é json'));
    expect(res.status).toBe(400);
  });

  it('recusa um corpo que não cumpre o schema', async () => {
    const POST = await carregarRota();
    const res = await POST(pedido({ ...VALIDO, workEmail: 'sem-arroba' }));
    expect(res.status).toBe(400);
  });
});

describe('não revela nada em erro', () => {
  /**
   * O que existia devolvia `fieldErrors` do Zod: nomes de campos, formatos
   * aceites, e — quando houver contactos em base — permitiria distinguir
   * «este e-mail já existe» de «não existe». A resposta passa a ser sempre a
   * mesma, com um identificador para o utilizador citar no suporte.
   */
  it('devolve a mesma mensagem, seja qual for a causa', async () => {
    const POST = await carregarRota();

    const corpos = await Promise.all(
      [
        pedido({ ...VALIDO, workEmail: 'mau' }),
        pedido({ ...VALIDO, consent: false }),
        pedido('{ partido'),
      ].map(async (p) => (await POST(p)).json()),
    );

    for (const corpo of corpos) {
      expect(corpo.error).toBe('Não foi possível processar o pedido.');
      expect(Object.keys(corpo).sort()).toEqual(['correlationId', 'error']);
      expect(corpo.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it('nunca inclui detalhes de validação por campo', async () => {
    const POST = await carregarRota();
    const corpo = await (await POST(pedido({ ...VALIDO, workEmail: 'mau' }))).json();
    expect(JSON.stringify(corpo)).not.toMatch(/workEmail|issues|fieldErrors/);
  });
});

describe('limite de taxa', () => {
  it('trava ao exceder o tecto e indica quando voltar', async () => {
    const POST = await carregarRota({
      DIAGNOSTIC_RATE_LIMIT_MAX: '2',
      DIAGNOSTIC_RATE_LIMIT_WINDOW_MS: '60000',
    });

    const mesmaOrigem = () =>
      new Request('https://agoramoz.com/api/diagnostico', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.7',
        },
        body: JSON.stringify(VALIDO),
      });

    expect((await POST(mesmaOrigem())).status).toBe(200);
    expect((await POST(mesmaOrigem())).status).toBe(200);

    const travado = await POST(mesmaOrigem());
    expect(travado.status).toBe(429);
    expect(Number(travado.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('conta por origem, não globalmente', async () => {
    const POST = await carregarRota({ DIAGNOSTIC_RATE_LIMIT_MAX: '1' });

    const de = (ip: string) =>
      new Request('https://agoramoz.com/api/diagnostico', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify(VALIDO),
      });

    expect((await POST(de('198.51.100.1'))).status).toBe(200);
    expect((await POST(de('198.51.100.2'))).status).toBe(200);
    expect((await POST(de('198.51.100.1'))).status).toBe(429);
  });
});

describe('armadilha anti-automação', () => {
  /**
   * 202 e não 400: um bot que receba erro aprende qual é o campo que o
   * denuncia e deixa de o preencher. A resposta tem de ser indistinguível de
   * sucesso.
   */
  it('descarta em silêncio e responde como se tivesse aceitado', async () => {
    const POST = await carregarRota();
    const res = await POST(pedido({ ...VALIDO, fax: 'sou um robot' }));

    expect(res.status).toBe(202);
    const corpo = await res.json();
    expect(corpo.ok).toBe(true);
  });
});

describe('resposta em caso de sucesso', () => {
  it('aceita uma submissão válida', async () => {
    const POST = await carregarRota();
    const res = await POST(pedido(VALIDO));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  /**
   * D-15. A classificação era devolvida ao browser e ia parar à dataLayer —
   * qualquer visitante via em devtools que tinha sido classificado. Se algum
   * dia alguém voltar a acrescentá-la «para o analytics», este teste falha.
   */
  it('NUNCA devolve a classificação nem a pontuação do lead', async () => {
    const POST = await carregarRota();
    const bruto = await (await POST(pedido(VALIDO))).text();

    expect(bruto).not.toMatch(/"tier"/);
    expect(bruto).not.toMatch(/"score"/);
    expect(bruto).not.toMatch(/"reasons"/);
    expect(JSON.parse(bruto)).toEqual({
      ok: true,
      correlationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
  });

  it('dá um identificador de correlação diferente a cada pedido', async () => {
    const POST = await carregarRota();
    const a = await (await POST(pedido(VALIDO))).json();
    const b = await (await POST(pedido(VALIDO))).json();
    expect(a.correlationId).not.toBe(b.correlationId);
  });
});
