import type { Reservadas } from '../construtor';
import { FalhaImportadorIA, type ErroImportadorIA, type ImportadorIA } from '../ia';
import type { SpecInquerito } from '../spec';
import type { BlocoImportado, RascunhoImportado } from './esquema';
import { analisarEstruturado, type FormatoEstruturado } from './estruturado';
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
   * O texto declarava a estrutura (ficha com campos ou tabela): foi lida
   * directamente, sem IA — mesmo que se tenha pedido o Kimi.
   */
  readonly formato?: FormatoEstruturado;
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
/**
 * Contas Moonshot de nível baixo aceitam um pedido de cada vez e poucos por
 * minuto (Tier0: concorrência 1, 3 RPM — «Recharge and Rate Limiting»). As
 * partes recusadas com 429 tentam-se de novo uma a uma enquanto houver prazo;
 * depois de um segundo 429 espera-se pela janela do minuto.
 */
const ESPERA_APOS_429_MS = 20_000;

function dormir(ms: number, sinal: AbortSignal): Promise<void> {
  return new Promise((resolver) => {
    if (sinal.aborted) return resolver();
    const t = setTimeout(resolver, ms);
    sinal.addEventListener('abort', () => (clearTimeout(t), resolver()), { once: true });
  });
}

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
  return normalizar(analisarEstruturado(p.texto)?.rascunho ?? analisarTexto(p.texto), {
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
  deps: {
    readonly kimi: ImportadorIA | null;
    /** Injetável nos testes, para não esperar a sério. */
    readonly esperar?: (ms: number, sinal: AbortSignal) => Promise<void>;
  },
): Promise<RespostaImportacao> {
  // Estrutura declarada (Tipo:, Obrigatória:, Opções:… ou tabela): não há nada a
  // adivinhar — lê-se tal como está, instantâneo e exacto, sem gastar a conta Kimi.
  const estruturado = analisarEstruturado(p.texto);
  if (estruturado) {
    const r = normalizar(estruturado.rascunho, {
      base: p.base,
      reservadas: p.reservadas,
      modo: p.modo,
    });
    if (r.ok) return { ...r, motor: 'local', formato: estruturado.formato };
  }

  if (p.motor === 'local') return { ...local(p), motor: 'local' };
  if (!deps.kimi) return { ...local(p), motor: 'local', caiuParaLocal: 'indisponivel' };
  const kimi = deps.kimi;

  const textos = partirTexto(p.texto, { max: TAMANHO_PARTE });
  const total = textos.length;
  const prazo = AbortSignal.timeout(PRAZO_TOTAL_MS);

  const pedirParte = async (i: number): Promise<ResultadoParte> => {
    // O prazo do conjunto acabou antes de esta parte começar: nem se pede.
    if (prazo.aborted) return { ok: false, codigo: 'timeout' };
    try {
      const rascunho = await kimi.estruturar(
        textos[i]!,
        p.base.idioma,
        total > 1 ? { parte: i + 1, total, sinal: prazo } : undefined,
      );
      return { ok: true, rascunho };
    } catch (e) {
      if (!(e instanceof FalhaImportadorIA)) throw e;
      return { ok: false, codigo: e.codigo };
    }
  };

  const resultados = await emLotes<ResultadoParte>(
    textos.map((_, i) => () => pedirParte(i)),
    EM_PARALELO,
  );

  // Recusadas por limite da conta: uma a uma, enquanto houver prazo.
  const esperar = deps.esperar ?? dormir;
  let espera = 0;
  for (const [i, r] of resultados.entries()) {
    if (r.ok || r.codigo !== 'http_429') continue;
    if (espera > 0) await esperar(espera, prazo);
    if (prazo.aborted) break;
    const nova = await pedirParte(i);
    resultados[i] = nova;
    espera = !nova.ok && nova.codigo === 'http_429' ? ESPERA_APOS_429_MS : 0;
  }

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
