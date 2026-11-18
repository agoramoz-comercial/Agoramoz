import { Inter_Tight } from 'next/font/google';

/**
 * A letra do website v2 (D-50), a mesma dos documentos A4 da AGORAMOZ.
 *
 * Declarada aqui e usada só pelos layouts `(site)` e `(en)`: o `next/font`
 * pré-carrega uma fonte nas rotas do ficheiro onde é usada, e um layout cobre as
 * rotas que envolve. Se viesse do layout raiz, a consola descarregava-a para
 * nada. Variável, sem lista de pesos; `latin` chega para o português.
 */
export const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});
