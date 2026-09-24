import { NotFoundContent } from '@/components/layout/NotFoundContent';
import { SiteChrome } from '@/components/layout/SiteChrome';

/**
 * 404 para URL que não correspondem a rota nenhuma.
 *
 * A casca vem explicitamente daqui, e não de um layout: o layout raiz deixou
 * de a ter para que `/admin` pudesse existir sem ela. Medido: `dynamicParams =
 * false` em `[pais]` e `[solucao]` faz com que um parâmetro desconhecido 404
 * na camada de encaminhamento, sem entrar no segmento — pelo que todos os 404
 * deste site passam por aqui, e um `not-found` dentro de `(site)` nunca
 * chegaria a correr.
 */
export default function NotFound() {
  return (
    <SiteChrome>
      <NotFoundContent />
    </SiteChrome>
  );
}
