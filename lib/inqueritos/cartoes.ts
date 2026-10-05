import { percursoDeVisibilidade, visiveis, type ValorResposta } from './logica';
import { validarValor } from './respostas';
import type { CampoContacto, Pergunta, SpecInquerito } from './spec';

/**
 * A lógica dos cartões de quem responde — pura, para o browser e para os
 * testes. A visibilidade é calculada sobre os valores JÁ VALIDADOS, na mesma
 * passagem que `validarResposta` faz no servidor: o que o browser mostra é o
 * que o servidor aceita, sem duas regras a divergir.
 */

/** O que o formulário guarda enquanto se responde: texto cru, listas, números da escala. */
export type ValorRascunho = string | number | readonly string[];
export type Rascunho = Readonly<Record<string, ValorRascunho | undefined>>;

export type Cartao =
  | { readonly tipo: 'pergunta'; readonly pergunta: Pergunta }
  | { readonly tipo: 'contacto' };

export type ErroCartao = 'obrigatoria' | 'invalida';

function vazio(v: unknown): boolean {
  return (
    v === undefined ||
    (typeof v === 'string' && v.trim() === '') ||
    (Array.isArray(v) && v.length === 0)
  );
}

/** O número escreve-se como texto (aceita vírgula); o resto vai como está. */
export function normalizar(p: Pergunta, bruto: ValorRascunho | undefined): unknown {
  if (p.tipo === 'numero' && typeof bruto === 'string') {
    const t = bruto.trim().replace(',', '.');
    return t === '' ? undefined : Number(t);
  }
  return bruto;
}

export function respostasValidas(
  spec: Pick<SpecInquerito, 'perguntas'>,
  rascunho: Rascunho,
): Record<string, ValorResposta> {
  const validas: Record<string, ValorResposta> = {};
  const visivel = percursoDeVisibilidade();
  for (const p of spec.perguntas) {
    if (!visivel(p, validas)) continue;
    if (p.tipo === 'seccao') continue;
    const v = normalizar(p, rascunho[p.chave]);
    if (vazio(v)) continue;
    const ok = validarValor(p, v);
    if (ok !== undefined) validas[p.chave] = ok;
  }
  return validas;
}

export function cartoesDe(spec: SpecInquerito, rascunho: Rascunho): Cartao[] {
  const perguntas = visiveis(spec, respostasValidas(spec, rascunho)).map(
    (pergunta): Cartao => ({ tipo: 'pergunta', pergunta }),
  );
  return spec.contacto ? [...perguntas, { tipo: 'contacto' }] : perguntas;
}

export function erroDoCartao(p: Pergunta, bruto: ValorRascunho | undefined): ErroCartao | null {
  if (p.tipo === 'seccao') return null;
  const v = normalizar(p, bruto);
  if (vazio(v)) return p.obrigatoria ? 'obrigatoria' : null;
  return validarValor(p, v) === undefined ? 'invalida' : null;
}

/** O primeiro cartão de pergunta que não deixa enviar, ou -1. */
export function primeiroComErro(cartoes: readonly Cartao[], rascunho: Rascunho): number {
  return cartoes.findIndex(
    (c) => c.tipo === 'pergunta' && erroDoCartao(c.pergunta, rascunho[c.pergunta.chave]) !== null,
  );
}

export type DadosContacto = Partial<Record<CampoContacto, string>>;

/**
 * O corpo do envio, sem o token nem o id da submissão. O contacto só segue
 * quando há algum campo preenchido — um bloco vazio é uma resposta anónima,
 * e não leva sequer o consentimento.
 */
export function montarEnvio(
  spec: SpecInquerito,
  rascunho: Rascunho,
  contacto: DadosContacto,
  consentimento: boolean,
): {
  respostas: Record<string, ValorResposta>;
  contacto?: DadosContacto & { consentimento: boolean };
} {
  const respostas = respostasValidas(spec, rascunho);
  if (!spec.contacto) return { respostas };
  const preenchidos = Object.fromEntries(
    spec.contacto.campos
      .map((c) => [c, contacto[c]?.trim() ?? ''] as const)
      .filter(([, v]) => v !== ''),
  ) as DadosContacto;
  if (Object.keys(preenchidos).length === 0) return { respostas };
  return { respostas, contacto: { ...preenchidos, consentimento } };
}
