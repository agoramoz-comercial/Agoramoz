import type { TextosEnquadramento } from './textos';

export interface Reuniao {
  /** Para onde aponta o botão. */
  readonly url: string;
  readonly rotulo: string;
  /** true quando leva ao Cal.com; false quando escreve à equipa. */
  readonly cal: boolean;
}

/**
 * O botão principal do e-mail e do PDF: «Marcar reunião com um especialista»
 * no Cal.com quando `CAL_LINK` existe (`utilizador/evento`, a mesma variável
 * da marcação no fim do diagnóstico), com o nome e o e-mail pré-preenchidos;
 * sem ela, «Falar com um especialista» por e-mail à equipa.
 */
export function reuniao(
  t: TextosEnquadramento,
  o: { calOrigem: string; calLink?: string; nome: string; email: string; responderPara: string },
): Reuniao {
  if (o.calLink) {
    const url = new URL(`/${o.calLink}`, o.calOrigem);
    if (o.nome) url.searchParams.set('name', o.nome);
    if (o.email) url.searchParams.set('email', o.email);
    return { url: url.toString(), rotulo: t.ctaReuniao, cal: true };
  }
  const assunto = encodeURIComponent(t.assuntoResposta);
  return { url: `mailto:${o.responderPara}?subject=${assunto}`, rotulo: t.ctaEscrever, cal: false };
}
