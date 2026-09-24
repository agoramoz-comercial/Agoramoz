import { IDENTITY } from '@/content/site';
import { elegibilidade, localBusinessNode } from './local-business';
import { breadcrumbNode, faqNode, logoNode, organizationNode, serviceNode, webPageNode, webSiteNode } from './nodes';
import type { SchemaGraph, SchemaNode } from './types';

/**
 * Dois grafos por página, e é deliberado.
 *
 * `siteGraph()` sai do `SiteChrome` e descreve a entidade e o website — é
 * igual em todas as páginas. `pageGraph()` sai da página e descreve o que
 * aquela página é. Podiam ser um só bloco, mas o layout teria de conhecer o
 * conteúdo da página, o que obrigaria a passar props por toda a árvore ou a
 * um contexto.
 *
 * Dividir não custa nada: os consumidores de JSON-LD fundem todos os blocos da
 * página antes de os interpretar, pelo que uma referência `@id` de um bloco
 * para o outro resolve na mesma. A fronteira layout/página fica intacta.
 */

export function siteGraph(): SchemaGraph {
  const nos: SchemaNode[] = [logoNode(), webSiteNode()];

  /**
   * A empresa é de área de serviço. `elegibilidade()` devolve `false` hoje, e
   * o ramo `true` é inalcançável enquanto morada, coordenadas e horário forem
   * `'unknown'` — o tipo de `localBusinessNode` não deixa construir o
   * argumento. Está aqui escrito para que, no dia em que os factos existirem,
   * o caminho já esteja ligado e verificado, em vez de alguém o improvisar.
   */
  const local = elegibilidade(IDENTITY);
  nos.push(local.elegivel ? localBusinessNode(IDENTITY, local.factos) : organizationNode());

  return { '@context': 'https://schema.org', '@graph': nos };
}

export function pageGraph(input: {
  path: string;
  name: string;
  description: string;
  breadcrumb?: readonly { name: string; path: string }[];
  faq?: readonly { q: string; a: string }[];
  service?: { name: string; description: string; areaServed?: string };
  extra?: readonly SchemaNode[];
}): SchemaGraph {
  const nos: SchemaNode[] = [
    webPageNode({
      path: input.path,
      name: input.name,
      description: input.description,
      temBreadcrumb: Boolean(input.breadcrumb?.length),
    }),
  ];

  if (input.breadcrumb?.length) nos.push(breadcrumbNode(input.path, input.breadcrumb));
  if (input.faq?.length) nos.push(faqNode(input.path, input.faq));
  if (input.service) nos.push(serviceNode({ path: input.path, ...input.service }));
  if (input.extra?.length) nos.push(...input.extra);

  return { '@context': 'https://schema.org', '@graph': nos };
}
