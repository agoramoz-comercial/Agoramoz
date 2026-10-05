import type { Reservadas } from '../construtor';
import { FalhaImportadorIA, type ErroImportadorIA, type ImportadorIA } from '../ia';
import type { SpecInquerito } from '../spec';
import type { BlocoImportado, RascunhoImportado } from './esquema';
import { criarImportadorKimi } from './kimi';
import { analisarTexto, partirTexto } from './local';
import { normalizar, type ModoImportacao, type ResultadoImportacao } from './normalizar';

/**
 * «Colar e transformar», do lado do servidor: escolhe o motor, cai para o
 * analisador local quando o Kimi falha, e devolve uma PROPOSTA. Nada aqui
 * grava — o admin revê e só o «Guardar» do construtor escreve na base.
 */

export type Motor = 'kimi' | 'local';

export { MAX_TEXTO } from './esquema';

export interface PedidoImportacao {
  readonly texto: string;
  readonly motor: Motor;
  readonly modo: ModoImportacao;
  readonly base: SpecInquerito;
  readonly reservadas: Reservadas;
}

export type RespostaImportacao = ResultadoImportacao & {
  /** O motor que produziu a proposta. */
  readonly motor: Motor;
  /** Pediu-se o Kimi e caiu-se para o local: porquê (código, sem detalhe). */
  readonly caiuParaLocal?: ErroImportadorIA | 'indisponivel' | 'sem_perguntas';
  readonly modelo?: string;
  /**
   * Inquérito longo pedido ao Kimi em partes: quantas houve, quantas o Kimi
   * estruturou e quantas caíram para o analisador local (e porquê, a primeira).
   */
  readonly partes?: {
    readonly total: number;
    readonly kimi: number;
    readonly local: number;
    readonly motivo?: ErroImportadorIA;
  };
};

/** Cada parte tem até isto: cabe em poucos segundos de geração. */
export const TAMANHO_PARTE = 3_000;
/** Pedidos ao Kimi em simultâneo. */
const EM_PARALELO = 4;
/** Prazo do conjunto: abaixo do `maxDuration` (120 s) da página do construtor. */
const PRAZO_TOTAL_MS = 100_000;

interface AmbienteIA {
  readonly SURVEY_AI: 'off' | 'kimi';
  readonly KIMI_API_KEY?: string;
  readonly KIMI_MODEL: string;
  readonly KIMI_BASE_URL: string;
}

export function iaDisponivel(env: AmbienteIA): boolean {
  return env.SURVEY_AI === 'kimi' && !!env.KIMI_API_KEY;
}

export function importadorKimiDoAmbiente(env: AmbienteIA): ImportadorIA | null {
  if (!iaDisponivel(env)) return null;
  return criarImportadorKimi({
    chave: env.KIMI_API_KEY!,
    modelo: env.KIMI_MODEL,
    baseUrl: env.KIMI_BASE_URL,
    timeoutMs: 50_000,
  });
}

function local(p: PedidoImportacao): ResultadoImportacao {
  return normalizar(analisarTexto(p.texto), {
    base: p.base,
    reservadas: p.reservadas,
    modo: p.modo,
  });
}

/** Corre `tarefas` com no máximo `n` em simultâneo, mantendo a ordem dos resultados. */
async function emLotes<T>(tarefas: readonly (() => Promise<T>)[], n: number): Promise<T[]> {
  const saida = new Array<T>(tarefas.length);
  let proxima = 0;
  const trabalhador = async () => {
    while (proxima < tarefas.length) {
      const i = proxima++;
      saida[i] = await tarefas[i]!();
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, tarefas.length) }, trabalhador));
  return saida;
}

type ResultadoParte =
  | { readonly ok: true; readonly rascunho: RascunhoImportado }
  | { readonly ok: false; readonly codigo: ErroImportadorIA };

/**
 * Junta as partes num só rascunho: blocos por ordem, título e introdução da
 * primeira, agradecimento da última que o tenha, e as condições — que cada
 * parte numera dentro de si — desviadas pelas perguntas das partes anteriores.
 */
export function juntarPartes(partes: readonly RascunhoImportado[]): RascunhoImportado {
  const blocos: BlocoImportado[] = [];
  let anteriores = 0;
  let agradecimento: string | undefined;
  for (const r of partes) {
    let nestaParte = 0;
    for (const b of r.blocos) {
      if (b.bloco === 'pergunta') {
        nestaParte += 1;
        // Só se desvia: `normalizar` continua a retirar (e a avisar) as que não servem.
        blocos.push(
          b.condicao
            ? { ...b, condicao: { ...b.condicao, pergunta: b.condicao.pergunta + anteriores } }
            : b,
        );
      } else {
        blocos.push(b);
      }
    }
    anteriores += nestaParte;
    if (r.agradecimento) agradecimento = r.agradecimento;
  }
  const [primeira] = partes;
  return {
    ...(primeira?.titulo ? { titulo: primeira.titulo } : {}),
    ...(primeira?.introducao ? { introducao: primeira.introducao } : {}),
    ...(agradecimento ? { agradecimento } : {}),
    blocos,
  };
}

export async function importarTexto(
  p: PedidoImportacao,
  deps: { readonly kimi: ImportadorIA | null },
): Promise<RespostaImportacao> {
  if (p.motor === 'local') return { ...local(p), motor: 'local' };
  if (!deps.kimi) return { ...local(p), motor: 'local', caiuParaLocal: 'indisponivel' };
  const kimi = deps.kimi;

  const textos = partirTexto(p.texto, { max: TAMANHO_PARTE });
  const total = textos.length;
  const prazo = AbortSignal.timeout(PRAZO_TOTAL_MS);

  const resultados = await emLotes<ResultadoParte>(
    textos.map((texto, i) => async () => {
      // O prazo do conjunto acabou antes de esta parte começar: nem se pede.
      if (prazo.aborted) return { ok: false, codigo: 'timeout' };
      try {
        const rascunho = await kimi.estruturar(
          texto,
          p.base.idioma,
          total > 1 ? { parte: i + 1, total, sinal: prazo } : undefined,
        );
        return { ok: true, rascunho };
      } catch (e) {
        if (!(e instanceof FalhaImportadorIA)) throw e;
        return { ok: false, codigo: e.codigo };
      }
    }),
    EM_PARALELO,
  );

  const falhas = resultados.filter((r): r is Extract<ResultadoParte, { ok: false }> => !r.ok);
  if (falhas.length === total) {
    return { ...local(p), motor: 'local', caiuParaLocal: falhas[0]!.codigo };
  }

  // Cada parte que falhou é lida pelo analisador local; as outras ficam do Kimi.
  const rascunho = juntarPartes(
    resultados.map((r, i) =>
      r.ok ? r.rascunho : analisarTexto(textos[i]!, { cabecalho: i === 0 }),
    ),
  );
  const r = normalizar(rascunho, { base: p.base, reservadas: p.reservadas, modo: p.modo });
  // O Kimi respondeu mas não deu perguntas aproveitáveis: o local tenta.
  if (!r.ok) return { ...local(p), motor: 'local', caiuParaLocal: 'sem_perguntas' };
  return {
    ...r,
    motor: 'kimi',
    modelo: kimi.modelo,
    ...(total > 1
      ? {
          partes: {
            total,
            kimi: total - falhas.length,
            local: falhas.length,
            ...(falhas[0] ? { motivo: falhas[0].codigo } : {}),
          },
        }
      : {}),
  };
}
