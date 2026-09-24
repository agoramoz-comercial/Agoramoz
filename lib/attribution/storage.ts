'use client';

import { construirAtribuicao } from './capture';
import type { Atribuicao } from './types';

/**
 * A origem da visita, guardada no dispositivo.
 *
 * `sessionStorage` e não `localStorage`, e a razão não é de gosto: a política
 * de privacidade publicada promete hoje, por escrito, que «a medição de
 * utilização é agregada e não identifica visitantes individualmente».
 * `localStorage` com um primeiro toque de noventa dias é um identificador
 * persistente por dispositivo — tensiona essa frase e obrigaria a reescrevê-la
 * antes de existir.
 *
 * É a mesma norma que `DiagnosticForm` já segue para o rascunho: o que fica no
 * dispositivo morre com o separador.
 *
 * O que se perde: o primeiro toque entre sessões. Quem chega pelo perfil do
 * Google hoje e volta por pesquisa daqui a duas semanas conta como duas
 * origens. O que se mantém — e é o que o percurso perfil → diagnóstico precisa
 * — é o primeiro e o último toque DENTRO da visita, que é onde está a decisão.
 * Estender a janela é uma decisão comercial com uma edição de `/privacidade`
 * agarrada; ficou registada como lacuna, não assumida em silêncio.
 */

const CHAVE = 'agoramoz:atribuicao';

export function lerAtribuicao(): Atribuicao | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Atribuicao) : null;
  } catch {
    // Janela privada, cookies bloqueados, armazenamento cheio. Sem atribuição,
    // o site funciona na mesma e a origem fica «desconhecido» — que é verdade.
    return null;
  }
}

/** Regista a chegada a esta página. Devolve o estado actualizado. */
export function registarVisita(): Atribuicao | null {
  if (typeof window === 'undefined') return null;

  try {
    const actualizada = construirAtribuicao({
      url: window.location.href,
      referrer: document.referrer,
      hostProprio: window.location.host,
      existente: lerAtribuicao(),
      agora: new Date(),
    });
    sessionStorage.setItem(CHAVE, JSON.stringify(actualizada));
    return actualizada;
  } catch {
    return null;
  }
}
