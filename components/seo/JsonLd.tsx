import { siteGraph } from '@/lib/seo/schema/graph';
import { breadcrumbNode, faqNode, serviceNode } from '@/lib/seo/schema/nodes';
import type { SchemaGraph, SchemaNode } from '@/lib/seo/schema/types';

/**
 * O único renderizador de JSON-LD do repositório.
 *
 * Toda a construção dos nós vive em `lib/seo/schema/`, em funções puras que se
 * testam sem React. Aqui fica só a serialização — que é a parte com risco de
 * segurança, e por isso merece estar num sítio só.
 */
function Script({ data }: { data: object }) {
  /**
   * A única excepção à regra `react/no-danger` em todo o repositório, e é
   * inevitável: JSON-LD tem de ser texto dentro de `<script>`, e o React
   * escaparia as aspas, produzindo JSON inválido.
   *
   * O que a torna segura não é o comentário, é o escape abaixo. O dado é
   * conteúdo nosso, estático e conhecido em build — mas se algum dia alguém lhe
   * passar texto de um cliente, uma sequência `</script>` fechava a etiqueta e
   * o resto era executado. Escapar `<` como `<` mantém o JSON válido e
   * fecha essa porta antes de ela existir.
   *
   * `>` e `&` vão pelo mesmo caminho: sozinhos não fecham a etiqueta, mas
   * escapá-los custa nada e tira o `<` da posição de única defesa. Com a
   * atribuição a caminho, vai passar por aqui texto que veio de um URL.
   */
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return (
    // eslint-disable-next-line react/no-danger -- escapado acima; conteúdo próprio
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}

const grafo = (...nos: SchemaNode[]): SchemaGraph => ({
  '@context': 'https://schema.org',
  '@graph': nos,
});

export function JsonLd({ graph }: { graph: SchemaGraph }) {
  return <Script data={graph} />;
}

/** A entidade e o website. Sai do `SiteChrome`, igual em todas as páginas. */
export function SiteJsonLd() {
  return <Script data={siteGraph()} />;
}

/* -------------------------------------------------------------------------- */
/* Invólucros de compatibilidade                                               */
/* -------------------------------------------------------------------------- */

/**
 * As páginas continuam a chamar estes nomes. O que mudou por baixo: os nós
 * passam a estar ligados por `@id` em vez de serem declarações independentes.
 *
 * Porquê manter os nomes neste lote: migrar as dez páginas no mesmo passo em
 * que se muda a forma do JSON-LD misturaria duas alterações com modos de falha
 * diferentes. Este lote muda o que é emitido; o seguinte troca as chamadas,
 * com o formato já verificado.
 */

export function OrganizationJsonLd() {
  return <SiteJsonLd />;
}

/** Passou a fazer parte do grafo do site, emitido por `OrganizationJsonLd`. */
export function WebSiteJsonLd() {
  return null;
}

export function FaqJsonLd({ items, path = '/' }: { items: readonly { q: string; a: string }[]; path?: string }) {
  return <Script data={grafo(faqNode(path, items))} />;
}

export function ServiceJsonLd(input: {
  name: string;
  description: string;
  path: string;
  areaServed?: string;
}) {
  return <Script data={grafo(serviceNode(input))} />;
}

export function BreadcrumbJsonLd({ items }: { items: readonly { name: string; path: string }[] }) {
  return <Script data={grafo(breadcrumbNode(items.at(-1)?.path ?? '/', items))} />;
}
