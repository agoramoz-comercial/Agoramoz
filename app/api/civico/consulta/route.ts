import { NextResponse, after } from 'next/server';
import { registarEventoServidor, type PropsEscalares } from '@/lib/analytics/servidor';
import { conferir } from '@/lib/civico/conferir';
import { citacaoNoCorpus, procurarArtigos } from '@/lib/civico/corpus';
import { ordemAoAssistente } from '@/lib/civico/limites';
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
 * Um pedido que não chega a ser uma consulta responde em JSON, com o status
 * certo (400, 413, 422, 429, 503…). Uma consulta responde em
 * `text/event-stream`, um JSON por linha `data:`:
 *
 *   {"t":"inicio","oficial":[…]}            os artigos do texto oficial, do NOSSO corpus
 *   {"t":"d","v":"…"}                       um pedaço do texto do motor, em Markdown
 *   {"t":"fim","resposta":{…},"vigencia":{…},"conferencia":{…},"oficial":[…]}
 *   {"t":"erro","status":502}                 o motor falhou
 *
 * O `inicio` sai logo, antes de o motor responder: quem pergunta lê o texto
 * da lei enquanto a explicação é escrita. Os pedaços servem para escrever
 * enquanto chega. O que fica é o `fim`: a resposta normalizada no servidor,
 * CONFERIDA (`conferir.ts` — citações, números de artigo e contactos que não
 * constam do texto oficial saem) e com a verificação de vigência.
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

  // Uma ordem ao assistente («ignora as instruções…») não é uma pergunta: não segue.
  if (ordemAoAssistente(parsed.data.pergunta)) {
    log.warn('civico.falhou', { correlationId, reason: 'ordem-ao-assistente', outcome: 'rejected' });
    return NextResponse.json(
      { error: 'Isto não é uma pergunta sobre a lei.', motivo: 'ambito', correlationId },
      { status: 422, headers: SEM_CACHE },
    );
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

  // O texto oficial para esta pergunta, do nosso corpus. Sem artigos, o motor
  // é avisado de que não pode citar — e o conferidor retira o que citar.
  const oficial = procurarArtigos(pedido.pergunta, tema);
  const artigos = new Set(oficial.map((a) => a.n));

  // Quem perguntou foi-se embora: o pedido ao motor é cancelado, não fica a gastar.
  const desistir = new AbortController();
  request.signal?.addEventListener('abort', () => desistir.abort(), { once: true });

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

      // Primeiro o que é nosso e é certo: o texto da lei.
      enviar({ t: 'inicio', correlationId, oficial });

      const abertura = await abrirConsulta(
        pedido,
        {
          url: env.LOVABLE_CIVICO_URL!,
          timeoutMs: TIMEOUT_MOTOR_MS,
          perguntaNoFim: env.CIVICO_PERGUNTA_NO_FIM === 'on',
          oficial,
        },
        fetch,
        desistir.signal,
      );
      const resultado = abertura.ok ? await lerConsulta(abertura.res, (v) => enviar({ t: 'd', v })) : abertura;

      if (!resultado.ok) {
        enviar({ t: 'erro', status: falhou(resultado.motivo, resultado.status, resultado.codigo) });
      } else {
        // O conferidor: o que não consta do texto oficial sai antes de sair daqui.
        const { resposta, conferencia } = conferir(resultado.resposta, {
          artigos,
          citacaoConferida: citacaoNoCorpus,
          pergunta: pedido.pergunta,
        });
        const vigencia = verificarVigencia(resposta);
        const revogados = vigencia.alertas.filter((a) => a.tipo === 'revogado').length;
        const retirados = conferencia.citacoes + conferencia.artigos + conferencia.contactos;
        /**
         * Uma resposta que cita lei revogada, a que foi preciso retirar
         * alguma coisa, ou sem nenhum apoio (nem artigos nossos, nem ligação)
         * é entregue — o ecrã diz o que aconteceu —, mas fica no log como
         * aviso: se o motor piorar, é aqui que se vê primeiro.
         */
        const semApoio = resposta.fontes.length === 0 && oficial.length === 0;
        (revogados > 0 || retirados > 0 || semApoio ? log.warn : log.info)('civico.respondida', {
          ...baseLog,
          fontes: resposta.fontes.length,
          oficiais: oficial.length,
          revogados,
          retirados,
          durationMs: Date.now() - started,
          outcome: revogados > 0 ? 'lei-revogada' : retirados > 0 ? 'conferida-com-cortes' : semApoio ? 'sem-fonte' : 'ok',
        });
        medir('civico_consulta', {
          tema,
          trocas: pedido.historico.length,
          fontes: resposta.fontes.length,
          fontesEstado: resposta.fontes.filter((f) => f.estado).length,
          oficiais: oficial.length,
          revogados,
          retirados,
          durationMs: Date.now() - started,
        });
        enviar({ t: 'fim', correlationId, resposta, vigencia, conferencia, oficial });
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
