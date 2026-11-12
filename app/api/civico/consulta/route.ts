import { NextResponse, after } from 'next/server';
import { registarEventoServidor, type PropsEscalares } from '@/lib/analytics/servidor';
import { abrirConsulta, lerConsulta, type FalhaMotor } from '@/lib/civico/motor';
import { anonimizarPedido, dadoPessoalNoPedido, pedidoSchema } from '@/lib/civico/pedido';
import { temaDaPergunta } from '@/lib/civico/tema';
import { verificarVigencia } from '@/lib/civico/vigencia';
import { serverEnv } from '@/lib/config/env';
import { lerCorpoLimitado } from '@/lib/http/corpo';
import { clientKey, createMemoryRateLimiter, type RateLimiter } from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';

/**
 * AGORAMOZ Cívico — uma pergunta sobre a lei, uma resposta com as fontes.
 *
 * O browser nunca fala com o motor. Esta rota é o único caminho: valida o
 * pedido, recusa contactos e números de documento, tira os nomes, limita a
 * taxa (cada consulta gasta modelos de IA na conta do portal) e chama o motor
 * do lado do servidor.
 *
 * ## A resposta é um fluxo
 *
 * Tudo o que se sabe ANTES de o motor começar a escrever responde em JSON,
 * com o status certo (400, 413, 422, 429, 503…). Depois disso a resposta é
 * `text/event-stream`, um JSON por linha `data:`:
 *
 *   {"t":"d","v":"…"}                       um pedaço do texto, em Markdown
 *   {"t":"fim","resposta":{…},"vigencia":{…}}  a resposta inteira, no NOSSO modelo
 *   {"t":"erro","status":502}                 o motor falhou a meio
 *
 * Os pedaços servem para a página escrever enquanto o motor escreve. O que
 * fica é o `fim`: a resposta normalizada no servidor, com as fontes e com a
 * verificação de vigência — os pedaços são descartados quando ele chega.
 *
 * **Nada é guardado aqui, e a pergunta nunca vai para o log.** O que alguém
 * pergunta sobre um despedimento ou uma herança não é nosso para arquivar.
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
 * unitários, ou já dentro do fluxo) o `after` lança, e aí corre-se já — com a
 * persistência desligada, não faz nada.
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

  // Um contacto ou um número de documento não segue para o motor. O log leva
  // só o padrão recusado (`email`/`numero`), nunca o texto.
  const dado = dadoPessoalNoPedido(parsed.data);
  if (dado) {
    log.warn('civico.falhou', { correlationId, reason: 'dado-pessoal', dado, outcome: 'rejected' });
    return NextResponse.json(
      { error: 'A pergunta parece conter dados pessoais.', dado, correlationId },
      { status: 422, headers: SEM_CACHE },
    );
  }

  // Os nomes de pessoas saem aqui: o motor recebe «o meu patrão [nome]».
  const { pedido, nomes } = anonimizarPedido(parsed.data);
  const tema = temaDaPergunta(pedido.pergunta);

  // A pergunta NUNCA vai para o log: diz o que alguém está a viver.
  const baseLog = { correlationId, tema, trocas: pedido.historico.length, caracteres: pedido.pergunta.length, nomes };

  const falhou = (motivo: FalhaMotor, status?: number, codigo?: string) => {
    log.error('civico.falhou', {
      ...baseLog,
      reason: motivo,
      status,
      errorCode: codigo,
      durationMs: Date.now() - started,
      outcome: 'failed',
    });
    // Só as falhas do motor: um pedido inválido não é uma consulta tentada.
    medir('civico_falhou', { tema, motivo, status: status ?? null, durationMs: Date.now() - started });
    return STATUS_DA_FALHA[motivo] ?? 502;
  };

  // Quem perguntou foi-se embora: o pedido ao motor é cancelado, não fica a gastar.
  const desistir = new AbortController();
  request.signal?.addEventListener('abort', () => desistir.abort(), { once: true });

  const abertura = await abrirConsulta(
    pedido,
    { url: env.LOVABLE_CIVICO_URL, timeoutMs: TIMEOUT_MOTOR_MS, perguntaNoFim: env.CIVICO_PERGUNTA_NO_FIM === 'on' },
    fetch,
    desistir.signal,
  );
  if (!abertura.ok) return fail(falhou(abertura.motivo, abertura.status, abertura.codigo), correlationId);

  const codificar = new TextEncoder();
  const fluxo = new ReadableStream<Uint8Array>({
    async start(controlador) {
      let aberto = true;
      const enviar = (evento: unknown) => {
        if (!aberto) return;
        try {
          controlador.enqueue(codificar.encode(`data: ${JSON.stringify(evento)}\n\n`));
        } catch {
          // O browser fechou a ligação: não há a quem enviar.
          aberto = false;
        }
      };

      const resultado = await lerConsulta(abertura.res, (v) => enviar({ t: 'd', v }));

      if (!resultado.ok) {
        enviar({ t: 'erro', status: falhou(resultado.motivo, resultado.status, resultado.codigo) });
      } else {
        const { resposta } = resultado;
        const vigencia = verificarVigencia(resposta);
        const revogados = vigencia.alertas.filter((a) => a.tipo === 'revogado').length;
        /**
         * Uma resposta que cita lei revogada, ou sem nenhuma ligação, é
         * entregue (o ecrã avisa), mas fica no log como aviso: se o motor
         * piorar, é aqui que se vê primeiro.
         */
        const semFonte = resposta.fontes.length === 0;
        (revogados > 0 || semFonte ? log.warn : log.info)('civico.respondida', {
          ...baseLog,
          fontes: resposta.fontes.length,
          revogados,
          durationMs: Date.now() - started,
          outcome: revogados > 0 ? 'lei-revogada' : semFonte ? 'sem-fonte' : 'ok',
        });
        medir('civico_consulta', {
          tema,
          trocas: pedido.historico.length,
          fontes: resposta.fontes.length,
          fontesEstado: resposta.fontes.filter((f) => f.estado).length,
          revogados,
          durationMs: Date.now() - started,
        });
        enviar({ t: 'fim', correlationId, resposta, vigencia });
      }

      if (aberto) controlador.close();
    },
    cancel() {
      desistir.abort();
    },
  });

  return new Response(fluxo, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      // `no-transform` e `X-Accel-Buffering`: um proxy que junte ou comprima o fluxo entrega-o todo no fim.
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
