import { NextResponse, after } from 'next/server';
import { registarEventoServidor, type PropsEscalares } from '@/lib/analytics/servidor';
import { consultarLovable, type FalhaMotor } from '@/lib/civico/motor';
import { dadoPessoalNoPedido, pedidoSchema } from '@/lib/civico/pedido';
import { serverEnv } from '@/lib/config/env';
import { lerCorpoLimitado } from '@/lib/http/corpo';
import { clientKey, createMemoryRateLimiter, type RateLimiter } from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';

/**
 * AGORAMOZ Cívico — uma pergunta sobre a lei, uma resposta com as fontes.
 *
 * O browser nunca fala com o motor. Esta rota é o único caminho: valida o
 * pedido, recusa contactos e números de documento, limita a taxa (cada
 * consulta gasta modelos de IA na conta do portal), chama o motor do lado do
 * servidor e devolve a resposta já normalizada — o que sai daqui é o nosso
 * modelo, não o Markdown do motor.
 *
 * **Nada é guardado aqui, e a pergunta nunca vai para o log.** O que alguém
 * pergunta sobre um despedimento ou uma herança não é nosso para arquivar. O
 * motor, do lado dele, fica com o texto da pergunta (ver `docs/CIVICO.md`) —
 * é por isso que a guarda de dados pessoais existe e que o aviso está junto
 * ao campo.
 *
 * Limite conhecido: o limitador é em memória, por instância. Trava repetição
 * e abuso ingénuo; não é um tecto global de custo.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A pergunta e três trocas resumidas cabem em menos de 10 KB. */
const MAX_CORPO = 16 * 1024;
/** O motor responde em segundos; o tecto cobre uma resposta longa num dia lento. */
const TIMEOUT_MOTOR_MS = 45_000;
export const maxDuration = 60;

let limiter: RateLimiter | null = null;
function getLimiter(max: number, windowMs: number): RateLimiter {
  limiter ??= createMemoryRateLimiter({ max, windowMs });
  return limiter;
}

const SEM_CACHE = { 'Cache-Control': 'no-store' };

/** A mesma mensagem vaga para tudo — o cliente escolhe o texto pelo código. */
function fail(status: number, correlationId: string, headers?: Record<string, string>) {
  return NextResponse.json(
    { error: 'Não foi possível responder a esta pergunta.', correlationId },
    { status, headers: { ...SEM_CACHE, ...headers } },
  );
}

/**
 * O evento para o painel, depois de a resposta sair. Fora de um pedido (testes
 * unitários) o `after` lança, e aí corre-se já — com a persistência desligada,
 * não faz nada.
 */
function medir(nome: 'civico_consulta' | 'civico_falhou', props: PropsEscalares) {
  const tarefa = () => registarEventoServidor(nome, props, { path: '/civico' });
  try {
    after(tarefa);
  } catch {
    void tarefa();
  }
}

/** Timeout é 504; credenciais, quota ou bloqueio do motor são nossos, 503; o resto, 502. */
const STATUS_DA_FALHA: Partial<Record<FalhaMotor, number>> = { timeout: 504, indisponivel: 503 };

export async function POST(request: Request) {
  const started = Date.now();
  const correlationId = crypto.randomUUID();

  // Uma variável mal posta faz o `serverEnv()` lançar: 503 com linha de log,
  // nunca um 500 mudo que faria o cliente culpar a pergunta.
  let env: ReturnType<typeof serverEnv>;
  try {
    env = serverEnv();
  } catch {
    log.error('civico.falhou', { correlationId, reason: 'config-invalida', outcome: 'failed' });
    return fail(503, correlationId);
  }

  if (env.CIVICO_ENGINE === 'off' || !env.LOVABLE_CIVICO_URL) {
    log.warn('civico.falhou', { correlationId, reason: 'motor-desligado', outcome: 'rejected' });
    return fail(503, correlationId);
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    log.warn('civico.falhou', { correlationId, reason: 'content-type', outcome: 'rejected' });
    return fail(415, correlationId);
  }

  const declarado = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declarado) && declarado > MAX_CORPO) {
    log.warn('civico.falhou', { correlationId, reason: 'content-length', bytes: declarado, outcome: 'rejected' });
    return fail(413, correlationId);
  }

  const veredicto = getLimiter(env.CIVICO_RATE_LIMIT_MAX, env.CIVICO_RATE_LIMIT_WINDOW_MS).check(
    await clientKey(request),
  );
  if (!veredicto.allowed) {
    const retryAfter = Math.max(1, Math.ceil((veredicto.resetAt - Date.now()) / 1000));
    log.warn('civico.falhou', {
      correlationId,
      reason: 'rate-limit',
      limit: env.CIVICO_RATE_LIMIT_MAX,
      windowMs: env.CIVICO_RATE_LIMIT_WINDOW_MS,
      outcome: 'rejected',
    });
    return fail(429, correlationId, { 'Retry-After': String(retryAfter) });
  }

  const corpo = await lerCorpoLimitado(request, MAX_CORPO);
  if (!corpo.ok) {
    log.warn('civico.falhou', { correlationId, reason: `corpo-${corpo.motivo}`, outcome: 'rejected' });
    return fail(corpo.motivo === 'grande' ? 413 : 400, correlationId);
  }

  let json: unknown;
  try {
    json = JSON.parse(corpo.texto);
  } catch {
    log.warn('civico.falhou', { correlationId, reason: 'json', outcome: 'rejected' });
    return fail(400, correlationId);
  }

  const parsed = pedidoSchema.safeParse(json);
  if (!parsed.success) {
    // Os NOMES dos campos que falharam, nunca os valores.
    const campos = [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? 'raiz')))].join(',');
    log.warn('civico.falhou', { correlationId, reason: `schema:${campos}`.slice(0, 80), outcome: 'rejected' });
    return fail(400, correlationId);
  }
  const pedido = parsed.data;

  // Um contacto ou um número de documento não segue para o motor. O log leva
  // só o padrão recusado (`email`/`numero`), nunca o texto.
  const dado = dadoPessoalNoPedido(pedido);
  if (dado) {
    log.warn('civico.falhou', { correlationId, reason: 'dado-pessoal', dado, outcome: 'rejected' });
    return NextResponse.json(
      { error: 'A pergunta parece conter dados pessoais.', dado, correlationId },
      { status: 422, headers: SEM_CACHE },
    );
  }

  // A pergunta NUNCA vai para o log: diz o que alguém está a viver.
  const baseLog = { correlationId, trocas: pedido.historico.length, caracteres: pedido.pergunta.length };

  const resultado = await consultarLovable(pedido, { url: env.LOVABLE_CIVICO_URL, timeoutMs: TIMEOUT_MOTOR_MS });

  if (!resultado.ok) {
    log.error('civico.falhou', {
      ...baseLog,
      reason: resultado.motivo,
      status: resultado.status,
      errorCode: resultado.codigo,
      durationMs: Date.now() - started,
      outcome: 'failed',
    });
    // Só as falhas do motor: um pedido inválido não é uma consulta tentada.
    medir('civico_falhou', {
      motivo: resultado.motivo,
      status: resultado.status ?? null,
      durationMs: Date.now() - started,
    });
    return fail(STATUS_DA_FALHA[resultado.motivo] ?? 502, correlationId);
  }

  const { resposta } = resultado;
  /**
   * Uma resposta sem nenhuma ligação é entregue (o ecrã avisa que não traz
   * fonte), mas fica no log como aviso: se o motor deixar de citar, é aqui
   * que se vê primeiro.
   */
  const semFonte = resposta.fontes.length === 0;
  (semFonte ? log.warn : log.info)('civico.respondida', {
    ...baseLog,
    fontes: resposta.fontes.length,
    durationMs: Date.now() - started,
    outcome: semFonte ? 'sem-fonte' : 'ok',
  });
  medir('civico_consulta', {
    trocas: pedido.historico.length,
    fontes: resposta.fontes.length,
    fontesEstado: resposta.fontes.filter((f) => f.estado).length,
    durationMs: Date.now() - started,
  });

  return NextResponse.json({ ok: true, correlationId, motor: 'lovable', resposta }, { status: 200, headers: SEM_CACHE });
}
