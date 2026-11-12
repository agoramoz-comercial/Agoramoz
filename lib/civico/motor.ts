import { criarLeitorDeFluxo } from './fluxo';
import type { Pedido } from './pedido';
import { normalizar, type Resposta } from './resposta';
import { mensagemDeTema, temaDaPergunta } from './tema';
import type { ArtigoOficial } from './conferir';
import { notaDeVigencia } from './vigencia';

/**
 * Adaptador do motor cívico (o portal Lovable `fonte-clara-source-guide`).
 *
 * O contrato foi lido no bundle público do portal e confirmado com consultas
 * reais: o browser deles faz `POST /api/consulta` com as mensagens no formato
 * do AI SDK —
 *
 *   { id, trigger: 'submit-message',
 *     messages: [{ id, role: 'user' | 'assistant', parts: [{ type: 'text', text }] }] }
 *
 * — e o cabeçalho `x-idioma`, e recebe um fluxo de eventos com o texto da
 * resposta em Markdown (ver `fluxo.ts`). Aqui fazemos a mesma chamada, mas do
 * servidor, com tempo máximo e tecto de tamanho. O browser de quem pergunta
 * nunca vê o motor.
 *
 * ## O que segue, e por que ordem
 *
 * 1. **A nota de vigência** (`vigencia.ts`): que diplomas foram substituídos,
 *    e o pedido de não inventar citações literais.
 * 2. **O texto oficial** (`corpus.ts`): os artigos que a procura encontrou para
 *    esta pergunta, com a ordem de citar só esses — ou, se não houver nenhum,
 *    a ordem de não escrever citações nem números de artigo.
 * 3. As trocas anteriores da conversa, se as houver.
 * 4. **A pergunta**, já sem nomes (`anonimo.ts`).
 * 5. **O tema**, como última mensagem (`tema.ts`).
 *
 * A ordem não é estética. Medido com o motor real a 2026-11-12: o portal
 * regista a ÚLTIMA mensagem de cada consulta e mostra-a, palavra por palavra,
 * na sua página pública de estado. Com o tema em último, o que lá aparece é
 * «Tema: Trabalho.» — e o motor responde à pergunta na mesma, porque lê a
 * conversa inteira. `perguntaNoFim` repõe a ordem simples, para o dia em que
 * o portal deixar de publicar as perguntas e quiser procurar no corpus pela
 * pergunta exacta.
 *
 * Trocar de motor é escrever outras funções com estas assinaturas.
 */

export interface ConfigMotor {
  readonly url: string;
  readonly timeoutMs: number;
  /** A pergunta como última mensagem (sem a linha de tema). Por omissão, não. */
  readonly perguntaNoFim?: boolean;
  /** Os artigos do texto oficial encontrados para esta pergunta. */
  readonly oficial?: readonly ArtigoOficial[];
}

/**
 * - `indisponivel`: o motor recusou por credenciais, quota ou protecção contra
 *   bots (401/402/403/429). É problema nosso, não da pergunta — a rota responde 503.
 * - `grande`: resposta acima do tecto.
 * - `vazio`: o fluxo chegou ao fim sem texto, ou o texto não tinha conteúdo.
 */
export type FalhaMotor = 'timeout' | 'rede' | 'http' | 'indisponivel' | 'grande' | 'motor' | 'vazio';

export type Falha = { readonly ok: false; readonly motivo: FalhaMotor; readonly status?: number; readonly codigo?: string };
export type ResultadoMotor = { readonly ok: true; readonly resposta: Resposta } | Falha;
export type Abertura = { readonly ok: true; readonly res: Response } | Falha;

/** O texto de uma resposta longa anda pelos 6–8 KB. Isto é folga, não alvo. */
export const MAX_TEXTO = 24_000;
/** O fluxo embrulha cada pedaço em JSON: o corpo bruto é várias vezes o texto. */
const MAX_CORPO = 600_000;

const eTimeout = (e: unknown) => {
  const nome = (e as { name?: string }).name;
  return nome === 'TimeoutError' || nome === 'AbortError';
};

/** Só o código da causa (`ECONNREFUSED`, `ENOTFOUND`…) — nunca a mensagem, que pode trazer o URL. */
function codigoDe(e: unknown): string {
  const causa = (e as { cause?: { code?: unknown } }).cause;
  const codigo = typeof causa?.code === 'string' ? causa.code : (e as { name?: string }).name;
  return /^[A-Za-z_]{1,40}$/.test(codigo ?? '') ? codigo! : 'desconhecido';
}

const falhaDe = (erro: unknown): Falha =>
  eTimeout(erro) ? { ok: false, motivo: 'timeout' } : { ok: false, motivo: 'rede', codigo: codigoDe(erro) };

const mensagem = (role: 'user' | 'assistant', text: string) => ({
  id: crypto.randomUUID(),
  role,
  parts: [{ type: 'text', text }],
});

/**
 * O texto oficial que segue para o motor. O que o motor escrever para além
 * disto é conferido à saída (`conferir.ts`) — a ordem aqui reduz o que há a
 * retirar, não é o que garante o resultado.
 */
export function contextoOficial(oficial: readonly ArtigoOficial[]): string {
  if (oficial.length === 0) {
    return [
      'Texto oficial conferido pela AGORAMOZ: não temos artigos conferidos para esta pergunta.',
      'Por isso, nesta resposta não escrevas citações entre aspas nem números de artigo. Explica a regra por palavras tuas, diz qual é o diploma e manda confirmar no Boletim da República.',
    ].join('\n');
  }
  const artigos = oficial.map(
    (a) => `[${a.diploma} (${a.titulo}), artigo ${a.n} — ${a.epigrafe}]\n${a.paragrafos.join('\n')}${a.cortado ? '\n(…o artigo continua.)' : ''}`,
  );
  return [
    'Texto oficial conferido pela AGORAMOZ, extraído do Boletim da República. A selecção é automática e pode não incluir tudo o que se aplica.',
    'Regras para esta resposta: cita entre aspas APENAS frases destes artigos, copiadas sem alterar. Indica APENAS os números destes artigos. Se a resposta não estiver nestes artigos, diz que o texto conferido não cobre esse ponto — não vás buscar outros artigos à memória.',
    '',
    ...artigos,
  ].join('\n\n');
}

export interface OpcoesDoPedido {
  /** A pergunta como última mensagem (sem a linha de tema). Por omissão, não. */
  readonly perguntaNoFim?: boolean;
  /** Os artigos do texto oficial encontrados para esta pergunta. */
  readonly oficial?: readonly ArtigoOficial[];
}

/** O corpo que o transporte de chat do portal envia, pela ordem descrita no topo. */
export function corpoDoPedido(pedido: Pedido, opcoes: OpcoesDoPedido | boolean = {}) {
  const { perguntaNoFim = false, oficial = [] } = typeof opcoes === 'boolean' ? { perguntaNoFim: opcoes } : opcoes;
  return {
    id: crypto.randomUUID(),
    trigger: 'submit-message',
    messages: [
      mensagem('user', notaDeVigencia()),
      mensagem('user', contextoOficial(oficial)),
      ...pedido.historico.flatMap((t) => [mensagem('user', t.pergunta), mensagem('assistant', t.resposta)]),
      mensagem('user', pedido.pergunta),
      ...(perguntaNoFim ? [] : [mensagem('user', mensagemDeTema(temaDaPergunta(pedido.pergunta)))]),
    ],
  };
}

/**
 * Faz o pedido e espera pelos cabeçalhos. Uma recusa do motor conhece-se
 * aqui, antes de haver uma palavra de resposta — é o que deixa a rota
 * responder com o status certo em vez de começar um fluxo para o cortar.
 *
 * `sinal` cancela o pedido quando quem perguntou se vai embora.
 */
export async function abrirConsulta(
  pedido: Pedido,
  cfg: ConfigMotor,
  fetchImpl: typeof fetch = fetch,
  sinal?: AbortSignal,
): Promise<Abertura> {
  const prazo = AbortSignal.timeout(cfg.timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(cfg.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
        // O idioma da resposta. A página é portuguesa; o motor aceita outros.
        'x-idioma': 'pt',
      },
      body: JSON.stringify(corpoDoPedido(pedido, { perguntaNoFim: cfg.perguntaNoFim, oficial: cfg.oficial })),
      // O prazo cobre também a leitura do fluxo até ao fim.
      signal: sinal ? AbortSignal.any([prazo, sinal]) : prazo,
      cache: 'no-store',
      // O motor não redirecciona; se o fizer, a pergunta não segue para outro sítio.
      redirect: 'error',
    });
  } catch (erro) {
    return falhaDe(erro);
  }

  if (!res.ok) {
    const indisponivel = [401, 402, 403, 429].includes(res.status);
    return { ok: false, motivo: indisponivel ? 'indisponivel' : 'http', status: res.status };
  }

  const declarado = Number(res.headers?.get('content-length') ?? '0');
  if (Number.isFinite(declarado) && declarado > MAX_CORPO) return { ok: false, motivo: 'grande' };
  return { ok: true, res };
}

/**
 * Lê o fluxo até ao fim. `aoReceber` é chamado com cada pedaço de texto, à
 * medida que chega — é o que deixa a página escrever a resposta enquanto o
 * motor a escreve. O resultado final é sempre a resposta INTEIRA normalizada:
 * é essa que fica, e é sobre essa que corre a verificação de vigência.
 */
export async function lerConsulta(res: Response, aoReceber?: (pedaco: string) => void): Promise<ResultadoMotor> {
  const leitor = criarLeitorDeFluxo(MAX_TEXTO);
  const entregar = (novos: readonly string[]) => {
    if (aoReceber) for (const n of novos) aoReceber(n);
  };

  try {
    if (res.body) {
      const corpo = res.body.getReader();
      const descodificar = new TextDecoder();
      let bytes = 0;
      for (;;) {
        const { done, value } = await corpo.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_CORPO) {
          await corpo.cancel().catch(() => {});
          return { ok: false, motivo: 'grande' };
        }
        // `stream: true`: um carácter acentuado partido entre dois pedaços não se estraga.
        entregar(leitor.receber(descodificar.decode(value, { stream: true })));
      }
      entregar(leitor.receber(descodificar.decode()));
    } else {
      const texto = await res.text();
      if (texto.length > MAX_CORPO) return { ok: false, motivo: 'grande' };
      entregar(leitor.receber(texto));
    }
  } catch (erro) {
    return falhaDe(erro);
  }

  const { resultado, novos } = leitor.fechar();
  entregar(novos);
  if (!resultado.ok) return { ok: false, motivo: resultado.motivo };

  const resposta = normalizar(resultado.texto);
  return resposta ? { ok: true, resposta } : { ok: false, motivo: 'vazio' };
}

/** As duas metades de seguida, para quem não precisa do fluxo. */
export async function consultarLovable(
  pedido: Pedido,
  cfg: ConfigMotor,
  fetchImpl: typeof fetch = fetch,
  aoReceber?: (pedaco: string) => void,
): Promise<ResultadoMotor> {
  const abertura = await abrirConsulta(pedido, cfg, fetchImpl);
  return abertura.ok ? lerConsulta(abertura.res, aoReceber) : abertura;
}
