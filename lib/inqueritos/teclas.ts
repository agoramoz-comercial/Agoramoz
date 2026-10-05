import { LIMITES, type Pergunta } from './spec';

/**
 * Atalhos de teclado de quem responde — puro, para o renderer e os testes.
 *
 * Letras escolhem opções (A = primeira); dígitos escolhem na escala. Uma tecla
 * com Ctrl, Cmd ou Alt nunca é atalho (copiar, colar e os atalhos do browser
 * continuam a funcionar). Quem chama garante que o foco não está num campo de
 * texto: aí, «a» é uma letra e não uma escolha.
 */

/** Uma letra por opção possível (`LIMITES.opcoes` = 20). */
export const LETRAS = 'ABCDEFGHIJKLMNOPQRST';

export function letraDe(indice: number): string {
  return indice >= 0 && indice < LIMITES.opcoes ? (LETRAS[indice] ?? '') : '';
}

export type AcaoTecla =
  | { readonly tipo: 'opcao'; readonly indice: number }
  | { readonly tipo: 'valor'; readonly valor: number };

export type TeclaPremida = {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
};

export function acaoDaTecla(p: Pergunta, e: TeclaPremida): AcaoTecla | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return null;
  switch (p.tipo) {
    case 'escolha_unica':
    case 'escolha_multipla': {
      const indice = LETRAS.indexOf(e.key.toUpperCase());
      return indice >= 0 && indice < p.opcoes.length ? { tipo: 'opcao', indice } : null;
    }
    case 'avaliacao':
      return /^[1-5]$/.test(e.key) ? { tipo: 'valor', valor: Number(e.key) } : null;
    case 'nps':
      // 0–9 por tecla; o 10 escolhe-se com o rato, o toque ou as setas.
      return /^[0-9]$/.test(e.key) ? { tipo: 'valor', valor: Number(e.key) } : null;
    default:
      return null;
  }
}
