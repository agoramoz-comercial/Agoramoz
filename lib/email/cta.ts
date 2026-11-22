import type { Idioma } from '@/content/types';
import type { TextosEnquadramento } from './textos';

export interface Reuniao {
  /** Para onde aponta o botão. */
  readonly url: string;
  readonly rotulo: string;
  /** true quando leva à página de marcação (Cal.com); false quando escreve à equipa. */
  readonly cal: boolean;
}

/**
 * O botão principal do e-mail e do PDF: «Marcar reunião com um especialista»
 * quando `CAL_LINK` existe — leva à página `/marcar` do site (o calendário do
 * Cal.com dentro do design AGORAMOZ), na língua do e-mail; sem ela, «Falar com
 * um especialista» por e-mail à equipa.
 *
 * O nome e o e-mail vão no FRAGMENTO (`#name=…&email=…`), nunca na query: o
 * fragmento não sai do browser, por isso não fica em registos de servidor, em
 * analytics nem em `Referer` — a mesma regra de `lib/agendamento/cal.ts`
 * («nada pessoal no URL» que chegue a um servidor). A página lê-o no cliente e
 * passa-o ao calendário para pré-preencher.
 */
export function reuniao(
  t: TextosEnquadramento,
  o: { site: string; idioma: Idioma; calLink?: string; nome: string; email: string; responderPara: string },
): Reuniao {
  if (o.calLink) {
    const url = new URL(o.idioma === 'en' ? '/en/marcar' : '/marcar', o.site);
    const dados = new URLSearchParams();
    if (o.nome) dados.set('name', o.nome.slice(0, 80));
    if (o.email) dados.set('email', o.email.slice(0, 254));
    const fragmento = dados.toString();
    return { url: fragmento ? `${url.toString()}#${fragmento}` : url.toString(), rotulo: t.ctaReuniao, cal: true };
  }
  const assunto = encodeURIComponent(t.assuntoResposta);
  return { url: `mailto:${o.responderPara}?subject=${assunto}`, rotulo: t.ctaEscrever, cal: false };
}
