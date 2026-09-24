import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COUNTRIES } from '@/content/registry';
import type { IngestArgs, IngestResult } from '@/lib/db/client';

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

// ===========================================================================
// Persistência
// ===========================================================================
/**
 * A partir daqui o que está a ser testado não são as guardas: é a promessa de
 * que a rota NUNCA devolve sucesso sobre uma submissão que não ficou guardada.
 * Todas as outras garantias deste sistema — a fila, a idempotência, o registo
 * de consentimento — dependem de a rota não mentir neste ponto.
 *
 * A base de dados é substituída. Nada aqui toca em rede nem em Postgres: o que
 * se verifica é o que a rota manda para a função transacional e o que devolve
 * ao cliente.
 */

const ingest = vi.fn<(client: unknown, args: IngestArgs) => Promise<IngestResult>>();
const clienteDb = vi.fn<() => unknown>();

vi.mock('@/lib/db/client', () => ({
  dbAdmin: () => clienteDb(),
  ingestDiagnosticResponse: (c: unknown, args: IngestArgs) => ingest(c, args),
}));

function resultado(overrides: Partial<IngestResult> = {}): IngestResult {
  return {
    duplicate: false,
    response_id: '11111111-1111-4111-8111-111111111111',
    contact_id: '22222222-2222-4222-8222-222222222222',
    organisation_id: '33333333-3333-4333-8333-333333333333',
    diagnostic_id: '44444444-4444-4444-8444-444444444444',
    deal_id: '55555555-5555-4555-8555-555555555555',
    score: 70,
    tier: 'A',
    ...overrides,
  };
}

/** Carrega a rota com a persistência exigida e a base substituída. */
function comBase() {
  return carregarRota({
    DIAGNOSTIC_PERSISTENCE: 'required',
    SUPABASE_URL: 'https://projecto.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'chave-de-teste-suficientemente-longa',
  });
}

/** O primeiro (e único) conjunto de argumentos recebido pela função de ingestão. */
function argsDaIngestao(indice = 0): IngestArgs {
  const chamada = ingest.mock.calls[indice];
  expect(chamada).toBeDefined();
  return chamada![1];
}

/**
 * Captura as linhas de log em vez de as silenciar, para se poder afirmar sobre
 * elas. Substitui as implementações que o `beforeEach` global já instalou.
 */
function capturarLogs() {
  const linhas: Record<string, unknown>[] = [];
  const registar = (arg: unknown) => {
    try {
      linhas.push(JSON.parse(String(arg)));
    } catch {
      /* linha que não é nossa */
    }
  };
  vi.spyOn(console, 'log').mockImplementation(registar);
  vi.spyOn(console, 'warn').mockImplementation(registar);
  vi.spyOn(console, 'error').mockImplementation(registar);
  return linhas;
}

beforeEach(() => {
  ingest.mockReset();
  clienteDb.mockReset();
  clienteDb.mockReturnValue({ marca: 'cliente-falso' });
  ingest.mockResolvedValue(resultado());
});

describe('o que é gravado', () => {
  it('uma submissão válida chega à função transacional', async () => {
    const POST = await comBase();
    const res = await POST(pedido(VALIDO));

    expect(res.status).toBe(200);
    expect(ingest).toHaveBeenCalledTimes(1);
    expect(argsDaIngestao().questionnaireSlug).toBe('diagnostico-estrategico');
  });

  it('a chave de idempotência é derivada no servidor e é estável', async () => {
    const POST = await comBase();
    await POST(pedido(VALIDO));
    await POST(pedido(VALIDO));

    const [a, b] = ingest.mock.calls.map(([, args]) => args.idempotencyKey);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
  });

  it('ignora uma chave de idempotência enviada pelo cliente', async () => {
    const POST = await comBase();
    await POST(pedido(VALIDO));
    const legitima = argsDaIngestao().idempotencyKey;

    ingest.mockClear();
    await POST(pedido({ ...VALIDO, idempotencyKey: 'f'.repeat(64) }));

    expect(argsDaIngestao().idempotencyKey).toBe(legitima);
  });

  it('respostas diferentes produzem chaves diferentes', async () => {
    const POST = await comBase();
    await POST(pedido(VALIDO));
    await POST(pedido({ ...VALIDO, problemImpact: 'y'.repeat(40) }));

    const [a, b] = ingest.mock.calls.map(([, args]) => args.idempotencyKey);
    expect(a).not.toBe(b);
  });

  it('não guarda a armadilha nem repete o e-mail nas respostas normalizadas', async () => {
    const POST = await comBase();
    await POST(pedido({ ...VALIDO, fax: '' }));

    const args = argsDaIngestao();
    expect(args.payload).not.toHaveProperty('fax');
    /**
     * O e-mail está no bruto, porque é o que a pessoa submeteu e é dele que
     * sai o contacto. Não está nas respostas normalizadas, que servem para
     * agregar e não precisam de identificar ninguém. Ver D-20.
     */
    expect(args.payload).toHaveProperty('workEmail');
    expect(args.normalized).not.toHaveProperty('workEmail');
    expect(args.normalized).toHaveProperty('sector');
  });

  it('guarda o texto de consentimento exacto do país submetido', async () => {
    const POST = await comBase();
    await POST(pedido({ ...VALIDO, country: 'pt', investmentBand: 'pt-2' }));

    const args = argsDaIngestao();
    expect(args.consentText).toBe(COUNTRIES.pt.consent.text);
    expect(args.consentVersion).toMatch(/^consent\.pt\.[0-9a-f]{12}$/);
  });

  it('países diferentes não partilham texto nem versão de consentimento', async () => {
    const POST = await comBase();
    await POST(pedido({ ...VALIDO, country: 'mz' }));
    await POST(pedido({ ...VALIDO, country: 'br', investmentBand: 'br-2' }));

    const [mz, br] = ingest.mock.calls.map(([, args]) => args);
    expect(mz!.consentText).not.toBe(br!.consentText);
    expect(mz!.consentVersion).not.toBe(br!.consentVersion);
  });

  it('envia o pacote de evidência sem duplicar os achados', async () => {
    const POST = await comBase();
    await POST(pedido(VALIDO));

    const args = argsDaIngestao();
    expect(Array.isArray(args.findings)).toBe(true);
    // D-21: `findings` tem coluna própria. Duas cópias discordam um dia.
    expect(args.evidenceBundle).not.toHaveProperty('findings');
    expect(args.evidenceBundle).toHaveProperty('allowedNumbers');
    expect(args.rulesetVersion).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    expect(args.scoringVersion).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });

  it('guarda hashes de IP e user-agent, nunca os valores', async () => {
    const POST = await comBase();
    await POST(pedido(VALIDO, { headers: { 'user-agent': 'Mozilla/5.0 (teste)' } }));

    const args = argsDaIngestao();
    /**
     * 64 e não 32. As colunas `ip_hash` e `user_agent_hash` têm
     * `check (~ '^[0-9a-f]{64}$')` em 0002 e 0003; a primeira versão desta
     * rota enviava a chave do limitador de taxa, truncada a 32, e TODA a
     * submissão real teria falhado o CHECK e devolvido 503. O padrão é lido
     * da própria migração no teste abaixo, para não voltar a divergir.
     */
    expect(args.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(args.userAgentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(args)).not.toContain('203.0.113');
    expect(JSON.stringify(args)).not.toContain('Mozilla');
  });

  it('os hashes cumprem o CHECK declarado na migração', async () => {
    // Lê o padrão do SQL em vez de o repetir: se a coluna mudar de exigência,
    // este teste muda de expectativa sozinho e apanha a divergência.
    const sql = readFileSync('supabase/migrations/0003_questionnaires_diagnostics.sql', 'utf-8');
    const padrao = /ip_hash text check \(ip_hash is null or ip_hash ~ '(\^\[0-9a-f\]\{\d+\}\$)'\)/
      .exec(sql)?.[1];
    expect(padrao).toBeDefined();

    const POST = await comBase();
    await POST(pedido(VALIDO, { headers: { 'user-agent': 'Mozilla/5.0 (teste)' } }));

    const args = argsDaIngestao();
    const re = new RegExp(padrao!);
    expect(args.ipHash).toMatch(re);
    expect(args.userAgentHash).toMatch(re);
  });

  it('nunca escreve nome, e-mail, telefone ou empresa nos logs', async () => {
    const linhas = capturarLogs();
    const POST = await comBase();
    await POST(pedido(VALIDO));

    const texto = JSON.stringify(linhas);
    expect(linhas.some((l) => l.event === 'diagnostic.accepted')).toBe(true);
    for (const proibido of [
      'Nome Exemplo',
      'nome@exemplo.co.mz',
      '+258840000000',
      'Empresa Exemplo',
    ]) {
      expect(texto).not.toContain(proibido);
    }
  });
});

describe('repetição', () => {
  it('é indistinguível de uma submissão nova para quem está do outro lado', async () => {
    const POST = await comBase();

    ingest.mockResolvedValueOnce(resultado({ duplicate: false }));
    const primeira = await POST(pedido(VALIDO));
    ingest.mockResolvedValueOnce(resultado({ duplicate: true }));
    const segunda = await POST(pedido(VALIDO));

    expect(segunda.status).toBe(primeira.status);
    const [a, b] = await Promise.all([primeira.json(), segunda.json()]);
    /**
     * D-19. A base distingue, o log distingue, a resposta HTTP não: dizer «já
     * tínhamos isto» permitiria descobrir, e-mail a e-mail, quem já pediu um
     * diagnóstico.
     */
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
    expect(b).not.toHaveProperty('duplicate');
  });
});

describe('falha de gravação', () => {
  it('devolve 503, e nunca 200, quando a gravação falha', async () => {
    ingest.mockRejectedValue(Object.assign(new Error('Ingestão falhou (23503)'), { code: '23503' }));

    const POST = await comBase();
    const res = await POST(pedido(VALIDO));

    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBe('30');
  });

  it('a resposta de falha não revela a causa', async () => {
    ingest.mockRejectedValue(
      Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' }),
    );

    const POST = await comBase();
    const corpo = await (await POST(pedido(VALIDO))).json();

    expect(corpo.error).toBe('Não foi possível processar o pedido.');
    expect(JSON.stringify(corpo)).not.toMatch(/constraint|23505|unique/i);
  });

  it('regista a falha com o código, para se poder diagnosticar', async () => {
    const linhas = capturarLogs();
    ingest.mockRejectedValue(Object.assign(new Error('x'), { code: '40001' }));

    const POST = await comBase();
    await POST(pedido(VALIDO));

    const falha = linhas.find((l) => l.event === 'diagnostic.persist_failed');
    expect(falha).toBeDefined();
    expect(falha!.errorCode).toBe('40001');
    expect(falha!.level).toBe('error');
  });

  it('sem cliente de base de dados devolve 503 e não sucesso', async () => {
    clienteDb.mockReturnValue(null);

    const POST = await comBase();
    const res = await POST(pedido(VALIDO));

    expect(res.status).toBe(503);
    expect(ingest).not.toHaveBeenCalled();
  });
});

describe('persistência desligada', () => {
  /**
   * `off` é o valor por omissão para que um deploy sem chaves não parta o
   * formulário. É também o modo em que uma submissão é aceite e não guardada,
   * por isso grita em cada pedido: a única coisa pior do que isso acontecer é
   * acontecer em silêncio. Ver D-17.
   */
  it('aceita sem gravar, e diz alto que não gravou', async () => {
    const linhas = capturarLogs();

    const POST = await carregarRota({ DIAGNOSTIC_PERSISTENCE: 'off' });
    const res = await POST(pedido(VALIDO));

    expect(res.status).toBe(200);
    expect(ingest).not.toHaveBeenCalled();

    const aviso = linhas.find((l) => l.event === 'diagnostic.not_persisted');
    expect(aviso).toBeDefined();
    expect(aviso!.level).toBe('warn');
    expect(aviso!.outcome).toBe('accepted_not_persisted');
  });

  it('não regista aceitação normal quando não persistiu', async () => {
    const linhas = capturarLogs();

    const POST = await carregarRota({ DIAGNOSTIC_PERSISTENCE: 'off' });
    await POST(pedido(VALIDO));

    expect(linhas.find((l) => l.event === 'diagnostic.accepted')).toBeUndefined();
  });
});

describe('o que nunca chega à base', () => {
  it('a armadilha preenchida não grava nada', async () => {
    const POST = await comBase();
    const res = await POST(pedido({ ...VALIDO, fax: 'sou um robot' }));

    expect(res.status).toBe(202);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('uma submissão inválida não grava nada', async () => {
    const POST = await comBase();
    expect((await POST(pedido({ ...VALIDO, workEmail: 'sem-arroba' }))).status).toBe(400);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('sem consentimento não grava nada', async () => {
    const POST = await comBase();
    expect((await POST(pedido({ ...VALIDO, consent: false }))).status).toBe(400);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('corpo que não é JSON não grava nada', async () => {
    const POST = await comBase();
    expect((await POST(pedido('{ isto não é json'))).status).toBe(400);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('tipo de conteúdo errado não grava nada', async () => {
    const POST = await comBase();
    expect((await POST(pedido(VALIDO, { headers: { 'content-type': 'text/plain' } }))).status).toBe(
      415,
    );
    expect(ingest).not.toHaveBeenCalled();
  });
});

describe('atribuição', () => {
  const ORIGEM = {
    utm_source: 'google',
    utm_medium: 'organic',
    utm_campaign: 'gbp',
    utm_content: null,
    landing_page: '/perfil',
    referrer: 'www.google.com',
    first_touch_at: '2026-09-24T10:00:00.000Z',
    last_touch_at: '2026-09-24T10:05:00.000Z',
  };

  it('a origem chega à ingestão, com o canal derivado', async () => {
    const POST = await comBase();
    await POST(pedido({ ...VALIDO, atribuicao: ORIGEM }));

    const a = argsDaIngestao().attribution;
    expect(a?.utm_campaign).toBe('gbp');
    expect(a?.channel).toBe('gbp');
    expect(a?.landing_page).toBe('/perfil');
  });

  it('NUNCA entra no que é gravado como resposta', async () => {
    /**
     * `responses.raw` é imutável depois de inserida. Se a origem entrasse ali
     * por causa do spread de `rawForStorage`, uma atribuição errada ficava
     * para sempre — e `response_answers` ganhava uma linha por cada UTM.
     */
    const POST = await comBase();
    await POST(pedido({ ...VALIDO, atribuicao: ORIGEM }));

    const args = argsDaIngestao();
    expect(args.payload).not.toHaveProperty('atribuicao');
    expect(args.normalized).not.toHaveProperty('atribuicao');
    expect(JSON.stringify(args.payload)).not.toContain('utm_');
    expect(JSON.stringify(args.normalized)).not.toContain('utm_');
  });

  it('não altera a chave de idempotência', async () => {
    /**
     * A asserção comercial deste ficheiro: a MESMA pessoa a submeter o mesmo
     * formulário vinda de duas campanhas diferentes continua a ser UM lead.
     * Se a origem entrasse na impressão digital, seriam dois — e o comercial
     * ligava duas vezes à mesma pessoa.
     */
    const POST = await comBase();
    await POST(pedido({ ...VALIDO, atribuicao: ORIGEM }));
    await POST(pedido({ ...VALIDO, atribuicao: { ...ORIGEM, utm_campaign: 'linkedin-q4' } }));
    await POST(pedido(VALIDO));

    const chaves = ingest.mock.calls.map(([, args]) => args.idempotencyKey);
    expect(new Set(chaves).size).toBe(1);
  });

  it('um UTM forjado fica nulo e o lead entra na mesma', async () => {
    const POST = await comBase();
    const res = await POST(
      pedido({
        ...VALIDO,
        atribuicao: { ...ORIGEM, utm_source: '</script><script>alert(1)</script>' },
      }),
    );

    expect(res.status).toBe(200);
    const a = argsDaIngestao().attribution;
    expect(a?.utm_source).toBeNull();
    expect(a?.utm_campaign).toBe('gbp');
    expect(JSON.stringify(a)).not.toContain('script');
  });

  it('a hora do último toque é a do servidor, não a do browser', async () => {
    // O relógio do browser pode estar errado por meses, e este valor ordena
    // eventos comerciais.
    const POST = await comBase();
    const antes = Date.now();
    await POST(pedido({ ...VALIDO, atribuicao: { ...ORIGEM, last_touch_at: '2030-01-01T00:00:00.000Z' } }));

    const quando = Date.parse(argsDaIngestao().attribution!.last_touch_at);
    expect(quando).toBeGreaterThanOrEqual(antes - 1000);
    expect(quando).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('sem atribuição, a submissão passa e a origem fica nula', async () => {
    const POST = await comBase();
    const res = await POST(pedido(VALIDO));

    expect(res.status).toBe(200);
    expect(argsDaIngestao().attribution).toBeNull();
  });

  it('uma atribuição absurda não faz falhar a submissão', async () => {
    const POST = await comBase();
    for (const lixo of ['texto', 42, [], true]) {
      const res = await POST(pedido({ ...VALIDO, atribuicao: lixo }));
      expect(res.status).toBe(200);
    }
  });

  it('um caminho privado nunca chega à base', async () => {
    const POST = await comBase();
    await POST(
      pedido({
        ...VALIDO,
        atribuicao: { ...ORIGEM, landing_page: '/documento/8f14e45fceea167a5a36dedd4bea2543' },
      }),
    );

    const a = argsDaIngestao().attribution;
    expect(a?.landing_page).toBe('(privado)');
    expect(JSON.stringify(a)).not.toContain('8f14e45');
  });
});
