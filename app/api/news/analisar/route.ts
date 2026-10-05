import { NextResponse, after } from 'next/server';
import { registarEventoServidor, type PropsEscalares } from '@/lib/analytics/servidor';
import { currentSession, podeEscrever } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import { clientKey, createMemoryRateLimiter, type RateLimiter } from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';
import { analisarComLovable, type FalhaMotor } from '@/lib/news/motor';
import { pedidoSchema } from '@/lib/news/pedido';

/**
 * AGORAMOZ Moz News — a análise de uma notícia.
 *
 * O browser nunca fala com o motor. Esta rota é o único caminho: valida o
 * pedido, limita a taxa (cada análise gasta créditos de IA na conta Lovable),
 * chama `analyze-news` com a chave do lado do servidor e devolve a análise já
 * normalizada — o que sai daqui é o nosso modelo, não o JSON do motor.
 *
 * Nada é guardado. Publicar uma análise é outra decisão, humana (fase 2).
 *
 * Limite conhecido: o limitador é em memória, por instância. Trava repetição e
 * abuso ingénuo; não é um tecto global de custo. O tecto real de gasto tem de
 * estar também do lado do Lovable (ver `docs/NEWS.md`).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CORPO = 64 * 1024;
/** O motor lê o artigo e gera o relatório; 20–40 s é normal. */
const TIMEOUT_MOTOR_MS = 60_000;
export const maxDuration = 70;

let limiter: RateLimiter | null = null;
function getLimiter(max: number, windowMs: number): RateLimiter {
  limiter ??= createMemoryRateLimiter({ max, windowMs });
  return limiter;
}

const SEM_CACHE = { 'Cache-Control': 'no-store' };

/** A mesma mensagem vaga para tudo — o cliente escolhe o texto pelo código. */
function fail(status: number, correlationId: string, headers?: Record<string, string>) {
  return NextResponse.json(
    { error: 'Não foi possível analisar esta notícia.', correlationId },
    { status, headers: { ...SEM_CACHE, ...headers } },
  );
}

/**
 * O evento para o painel, depois de a resposta sair: a análise não espera
 * pela escrita. Fora de um pedido (testes unitários) o `after` lança, e aí
 * corre-se já — com a persistência desligada, não faz nada.
 */
function medir(nome: 'news_analisada' | 'news_falhou', props: PropsEscalares) {
  const tarefa = () => registarEventoServidor(nome, props, { path: '/news' });
  try {
    after(tarefa);
  } catch {
    void tarefa();
  }
}

/** Timeout é 504; credenciais ou quota do motor são nossas, 503; o resto, 502. */
const STATUS_DA_FALHA: Partial<Record<FalhaMotor, number>> = { timeout: 504, indisponivel: 503 };

export async function POST(request: Request) {
  const started = Date.now();
  const correlationId = crypto.randomUUID();

  /**
   * Uma variável mal posta (motor ligado sem URL, valor com maiúscula) faz o
   * `serverEnv()` lançar. Sem isto o pedido morria num 500 mudo, sem
   * correlationId e sem linha de log — e o cliente culpava o artigo.
   */
  let env: ReturnType<typeof serverEnv>;
  try {
    env = serverEnv();
  } catch {
    log.error('news.falhou', { correlationId, reason: 'config-invalida', outcome: 'failed' });
    return fail(503, correlationId);
  }

  if (env.NEWS_ENGINE === 'off' || !env.LOVABLE_NEWS_FUNCTION_URL || !env.LOVABLE_NEWS_API_KEY) {
    log.warn('news.falhou', { correlationId, reason: 'motor-desligado', outcome: 'rejected' });
    return fail(503, correlationId);
  }

  // Com o jornal ligado, a análise é trabalho da redacção: só a equipa que
  // escreve (admin, comercial) gasta o motor. Para os outros, a rota não existe.
  if (env.NEWS_BLOG === 'on') {
    const sessao = await currentSession();
    if (!sessao || !podeEscrever(sessao.papel)) {
      log.warn('news.falhou', { correlationId, reason: 'sem-sessao', outcome: 'rejected' });
      return fail(404, correlationId);
    }
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    log.warn('news.falhou', { correlationId, reason: 'content-type', outcome: 'rejected' });
    return fail(415, correlationId);
  }

  const declarado = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declarado) && declarado > MAX_CORPO) {
    log.warn('news.falhou', { correlationId, reason: 'content-length', bytes: declarado, outcome: 'rejected' });
    return fail(413, correlationId);
  }

  const veredicto = getLimiter(env.NEWS_RATE_LIMIT_MAX, env.NEWS_RATE_LIMIT_WINDOW_MS).check(await clientKey(request));
  if (!veredicto.allowed) {
    const retryAfter = Math.max(1, Math.ceil((veredicto.resetAt - Date.now()) / 1000));
    log.warn('news.falhou', {
      correlationId,
      reason: 'rate-limit',
      limit: env.NEWS_RATE_LIMIT_MAX,
      windowMs: env.NEWS_RATE_LIMIT_WINDOW_MS,
      outcome: 'rejected',
    });
    return fail(429, correlationId, { 'Retry-After': String(retryAfter) });
  }

  let bruto: string;
  try {
    bruto = await request.text();
  } catch {
    log.warn('news.falhou', { correlationId, reason: 'body-read', outcome: 'rejected' });
    return fail(400, correlationId);
  }
  const bytes = new TextEncoder().encode(bruto).length;
  if (bytes > MAX_CORPO) {
    log.warn('news.falhou', { correlationId, reason: 'body-bytes', bytes, outcome: 'rejected' });
    return fail(413, correlationId);
  }

  let json: unknown;
  try {
    json = JSON.parse(bruto);
  } catch {
    log.warn('news.falhou', { correlationId, reason: 'json', outcome: 'rejected' });
    return fail(400, correlationId);
  }

  const parsed = pedidoSchema.safeParse(json);
  if (!parsed.success) {
    // Os NOMES dos campos que falharam (`url`, `texto`…), nunca os valores.
    const campos = [...new Set(parsed.error.issues.map((i) => i.path.join('.') || 'raiz'))].join(',');
    log.warn('news.falhou', { correlationId, reason: `schema:${campos}`.slice(0, 80), outcome: 'rejected' });
    return fail(400, correlationId);
  }
  const pedido = parsed.data;

  // O URL e o texto NUNCA vão para o log: dizem o que alguém anda a ler.
  const baseLog = { correlationId, idioma: pedido.idioma, modo: pedido.modo };

  const resultado = await analisarComLovable(pedido, {
    url: env.LOVABLE_NEWS_FUNCTION_URL,
    chave: env.LOVABLE_NEWS_API_KEY,
    timeoutMs: TIMEOUT_MOTOR_MS,
  });

  if (!resultado.ok) {
    log.error('news.falhou', {
      ...baseLog,
      reason: resultado.motivo,
      status: resultado.status,
      errorCode: resultado.codigo,
      durationMs: Date.now() - started,
      outcome: 'failed',
    });
    // Só as falhas do motor: um pedido inválido não é uma análise tentada.
    medir('news_falhou', {
      idioma: pedido.idioma,
      modo: pedido.modo,
      motivo: resultado.motivo,
      status: resultado.status ?? null,
      durationMs: Date.now() - started,
    });
    return fail(STATUS_DA_FALHA[resultado.motivo] ?? 502, correlationId);
  }

  /**
   * Uma análise parcial é entregue (o relatório marca o que falta), mas fica
   * no log como aviso: se o motor mudar de formato, é aqui que se vê primeiro.
   */
  const { seccoesEmFalta, descartados } = resultado.analise;
  const parcial = seccoesEmFalta.length > 0 || descartados > 0;
  (parcial ? log.warn : log.info)('news.analisada', {
    ...baseLog,
    prioridade: resultado.analise.prioridade ?? 'desconhecida',
    faltas: seccoesEmFalta.length,
    descartados,
    durationMs: Date.now() - started,
    outcome: parcial ? 'parcial' : 'ok',
  });
  medir('news_analisada', {
    idioma: pedido.idioma,
    modo: pedido.modo,
    prioridade: resultado.analise.prioridade ?? 'desconhecida',
    faltas: seccoesEmFalta.length,
    descartados,
    durationMs: Date.now() - started,
  });

  return NextResponse.json(
    { ok: true, correlationId, motor: 'lovable', analise: resultado.analise },
    { status: 200, headers: SEM_CACHE },
  );
}
