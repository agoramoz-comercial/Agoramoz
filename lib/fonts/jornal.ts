import { Newsreader } from 'next/font/google';

/**
 * A serifa do AGORAMOZ News — só no jornal (títulos e corpo dos artigos).
 * Newsreader foi desenhada para leitura longa em ecrã, com corte óptico: os
 * títulos ganham contraste, o corpo fica aberto em tamanhos pequenos. Auto-
 * -alojada pelo `next/font`: nenhum pedido a terceiros, a CSP não muda.
 */
export const fonteJornal = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-jornal',
  display: 'swap',
});
