import { SITE_URL, absolute } from '../site';

/**
 * Identificadores estáveis para os nós do grafo.
 *
 * Porque existem: até agora cada componente emitia um `<script>` isolado, e os
 * nós não se conheciam. O efeito concreto, numa página de solução, era a
 * página declarar **duas organizações** — a completa, vinda do `SiteChrome`,
 * e uma segunda, magra, que o `Service` inventava como `provider` com apenas
 * `name` e `url`. Um consumidor tinha de adivinhar que eram a mesma empresa.
 *
 * É a fonte dupla de verdade do repositório, expressa em JSON-LD. Com `@id`,
 * o `Service` passa a **referir** a organização em vez de a redeclarar, e
 * todas as páginas do site apontam à mesma entidade em vez de afirmarem uma
 * entidade nova cada uma. É isto que os motores de busca usam para resolver
 * «que empresa é esta» — e é a base da correspondência entre o perfil do
 * Google e o website.
 */
export const ORG_ID = `${SITE_URL}/#organization`;
export const SITE_ID = `${SITE_URL}/#website`;
export const LOGO_ID = `${SITE_URL}/#logo`;

export const webPageId = (path: string) => `${absolute(path)}#webpage`;
export const breadcrumbId = (path: string) => `${absolute(path)}#breadcrumb`;
export const serviceId = (path: string) => `${absolute(path)}#service`;
export const faqId = (path: string) => `${absolute(path)}#faq`;
export const articleId = (path: string) => `${absolute(path)}#article`;
