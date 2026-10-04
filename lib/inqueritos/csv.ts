import { temResposta, type Pergunta, type SpecInquerito } from './spec';

/**
 * A exportação das respostas em CSV — puro, testado.
 *
 * Separador `;`: o Excel em português (PT e MZ) usa a vírgula como separador
 * decimal e espera `;` entre colunas; com `,` abria tudo numa coluna. Com BOM
 * UTF-8, para os acentos sobreviverem ao Excel.
 *
 * Injecção de fórmulas: uma resposta é texto escrito por quem quer que tenha
 * o link. Uma célula que comece por `=`, `+`, `-`, `@`, tabulação ou retorno
 * é prefixada com `'`, para a folha de cálculo a mostrar como texto em vez de
 * a executar.
 */

export const SEPARADOR = ';';
export const BOM = '﻿';
const PERIGOSOS = /^[=+\-@\t\r]/;

export function celula(valor: string): string {
  const seguro = PERIGOSOS.test(valor) ? `'${valor}` : valor;
  return /[";\r\n,]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

export function linha(campos: readonly string[]): string {
  return `${campos.map(celula).join(SEPARADOR)}\r\n`;
}

/** O valor como uma pessoa o lê: rótulos das opções, listas com « | ». */
export function legivel(p: Pergunta | undefined, valor: unknown): string {
  if (valor === undefined || valor === null) return '';
  if (p && 'opcoes' in p) {
    const rotulo = (k: unknown) =>
      p.opcoes.find((o) => o.chave === k)?.rotulo ??
      (typeof k === 'string' ? k : JSON.stringify(k));
    return Array.isArray(valor) ? valor.map(rotulo).join(' | ') : rotulo(valor);
  }
  if (Array.isArray(valor)) return valor.map(String).join(' | ');
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

export const CAMPOS_DE_CONTACTO = ['nome', 'email', 'telefone'] as const;

export interface RespostaExportada {
  readonly submetidaEm: string;
  readonly link: string | null;
  readonly respostas: Readonly<Record<string, unknown>>;
  readonly contacto?: { nome: string | null; email: string | null; telefone: string | null } | null;
}

/**
 * As colunas: data, link, uma por pergunta do spec (pela ordem do
 * inquérito) e, no fim, as chaves que só existem em versões anteriores — uma
 * pergunta retirada não pode fazer desaparecer respostas que foram dadas.
 */
export function colunas(spec: SpecInquerito, chavesVistas: Iterable<string>) {
  const doSpec = spec.perguntas.filter(temResposta);
  const conhecidas = new Set(doSpec.map((p) => p.chave));
  const antigas = [...new Set(chavesVistas)].filter((k) => !conhecidas.has(k)).sort();
  return { doSpec, antigas };
}

export function cabecalho(
  spec: SpecInquerito,
  antigas: readonly string[],
  comContacto: boolean,
): string {
  return linha([
    'submetida_em',
    'link',
    ...spec.perguntas.filter(temResposta).map((p) => `${p.chave} — ${p.titulo}`),
    ...antigas.map((k) => `${k} (versão anterior)`),
    ...(comContacto ? CAMPOS_DE_CONTACTO.map((c) => `contacto_${c}`) : []),
  ]);
}

export function linhaDeResposta(
  spec: SpecInquerito,
  antigas: readonly string[],
  r: RespostaExportada,
  comContacto: boolean,
): string {
  const doSpec = spec.perguntas.filter(temResposta);
  return linha([
    r.submetidaEm,
    r.link ?? '',
    ...doSpec.map((p) => legivel(p, r.respostas[p.chave])),
    ...antigas.map((k) => legivel(undefined, r.respostas[k])),
    ...(comContacto
      ? [r.contacto?.nome ?? '', r.contacto?.email ?? '', r.contacto?.telefone ?? '']
      : []),
  ]);
}
