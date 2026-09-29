import { SiteChrome } from '@/components/layout/SiteChrome';

/**
 * Layout das páginas em inglês. O grupo `(en)` não aparece no URL; o segmento
 * `en/` sim. Existe para o chrome saber o idioma sem o adivinhar a partir do
 * URL em cada componente — e para as páginas continuarem estáticas, porque
 * nada aqui lê cabeçalhos nem cookies.
 */
export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome idioma="en">{children}</SiteChrome>;
}
