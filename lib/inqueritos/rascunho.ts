import type { Rascunho, ValorRascunho } from './cartoes';
import type { Pergunta, SpecInquerito } from './spec';

/**
 * Rascunho de quem responde, para sobreviver a um recarregar ou a um toque
 * acidental em «voltar» do browser. Vive em `sessionStorage` (morre com o
 * separador) e:
 *
 * - **nunca leva dados de contacto** nem o token do link — só as respostas,
 *   que são anónimas por omissão;
 * - é **dado não confiável** ao ler: cada valor é revalidado contra o spec
 *   ACTUAL (o inquérito pode ter sido republicado entretanto), e o que não
 *   servir é descartado em silêncio;
 * - a chave inclui uma assinatura das perguntas: mudar uma pergunta, um tipo
 *   ou as opções faz o rascunho antigo deixar de ser encontrado.
 */

const VERSAO = 1;
/** Muito acima de 50 perguntas × 4000 caracteres não é um rascunho nosso. */
const MAX_BYTES = 200_000;
/** Número e data guardam-se como o texto escrito (o número aceita vírgula). */
const MAX_TEXTO_CURTO = 40;

/** djb2 em 32 bits — identidade, não segurança. */
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function chaveDoRascunho(
  inqueritoId: string,
  spec: Pick<SpecInquerito, 'perguntas'>,
): string {
  const assinatura = spec.perguntas
    .map((p) =>
      'opcoes' in p ? `${p.chave}:${p.tipo}:${p.opcoes.map((o) => o.chave).join(',')}` : `${p.chave}:${p.tipo}`,
    )
    .join('|');
  return `agoraforms:${inqueritoId}:${djb2(assinatura)}`;
}

export function serializarRascunho(respostas: Rascunho, indice: number): string {
  const limpas: Record<string, ValorRascunho> = {};
  for (const [k, v] of Object.entries(respostas)) if (v !== undefined) limpas[k] = v;
  return JSON.stringify({ v: VERSAO, indice: Math.max(0, Math.trunc(indice)), respostas: limpas });
}

function valorAceite(p: Pergunta, v: unknown): ValorRascunho | undefined {
  switch (p.tipo) {
    case 'texto_curto':
    case 'texto_longo':
      return typeof v === 'string' && v.length <= p.max ? v : undefined;
    case 'numero':
    case 'data':
      return typeof v === 'string' && v.length <= MAX_TEXTO_CURTO ? v : undefined;
    case 'escolha_unica':
      return typeof v === 'string' && p.opcoes.some((o) => o.chave === v) ? v : undefined;
    case 'escolha_multipla': {
      if (!Array.isArray(v)) return undefined;
      const chaves = new Set(p.opcoes.map((o) => o.chave));
      const filtradas = [...new Set(v.filter((x): x is string => typeof x === 'string' && chaves.has(x)))];
      return filtradas.length > 0 ? filtradas : undefined;
    }
    case 'avaliacao':
      return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5 ? (v as number) : undefined;
    case 'nps':
      return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10 ? (v as number) : undefined;
    case 'seccao':
      return undefined;
  }
}

export type RascunhoLido = { readonly respostas: Rascunho; readonly indice: number };

export function lerRascunho(
  texto: string | null | undefined,
  spec: Pick<SpecInquerito, 'perguntas'>,
): RascunhoLido | null {
  if (!texto || texto.length > MAX_BYTES) return null;
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return null;
  }
  if (typeof bruto !== 'object' || bruto === null) return null;
  const { v, indice, respostas } = bruto as Record<string, unknown>;
  if (v !== VERSAO || typeof respostas !== 'object' || respostas === null || Array.isArray(respostas))
    return null;

  const aceites: Record<string, ValorRascunho> = {};
  const fonte = respostas as Record<string, unknown>;
  for (const p of spec.perguntas) {
    if (!Object.hasOwn(fonte, p.chave)) continue;
    const ok = valorAceite(p, fonte[p.chave]);
    if (ok !== undefined) aceites[p.chave] = ok;
  }
  if (Object.keys(aceites).length === 0) return null;
  const i = typeof indice === 'number' && Number.isInteger(indice) && indice >= 0 ? indice : 0;
  return { respostas: aceites, indice: i };
}
