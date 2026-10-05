import type { Reservadas } from '../construtor';
import { FalhaImportadorIA, type ErroImportadorIA, type ImportadorIA } from '../ia';
import type { SpecInquerito } from '../spec';
import { criarImportadorKimi } from './kimi';
import { analisarTexto } from './local';
import { normalizar, type ModoImportacao, type ResultadoImportacao } from './normalizar';

/**
 * «Colar e transformar», do lado do servidor: escolhe o motor, cai para o
 * analisador local quando o Kimi falha, e devolve uma PROPOSTA. Nada aqui
 * grava — o admin revê e só o «Guardar» do construtor escreve na base.
 */

export type Motor = 'kimi' | 'local';

/** O máximo de texto colado: um inquérito de 50 perguntas cabe com folga. */
export const MAX_TEXTO = 20_000;

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
};

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
  });
}

function local(p: PedidoImportacao): ResultadoImportacao {
  return normalizar(analisarTexto(p.texto), {
    base: p.base,
    reservadas: p.reservadas,
    modo: p.modo,
  });
}

export async function importarTexto(
  p: PedidoImportacao,
  deps: { readonly kimi: ImportadorIA | null },
): Promise<RespostaImportacao> {
  if (p.motor === 'local') return { ...local(p), motor: 'local' };
  if (!deps.kimi) return { ...local(p), motor: 'local', caiuParaLocal: 'indisponivel' };

  try {
    const rascunho = await deps.kimi.estruturar(p.texto, p.base.idioma);
    const r = normalizar(rascunho, { base: p.base, reservadas: p.reservadas, modo: p.modo });
    if (r.ok) return { ...r, motor: 'kimi', modelo: deps.kimi.modelo };
    // O Kimi respondeu mas não deu perguntas aproveitáveis: o local tenta.
    return { ...local(p), motor: 'local', caiuParaLocal: 'sem_perguntas' };
  } catch (e) {
    if (!(e instanceof FalhaImportadorIA)) throw e;
    return { ...local(p), motor: 'local', caiuParaLocal: e.codigo };
  }
}
