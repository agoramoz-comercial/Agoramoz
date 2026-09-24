import Link from 'next/link';
import { breadcrumbNode } from '@/lib/seo/schema/nodes';
import { JsonLd } from '@/components/seo/JsonLd';

export interface Migalha {
  readonly name: string;
  readonly path: string;
}

/**
 * O trilho visível e o `BreadcrumbList` dos dados estruturados, do MESMO array.
 *
 * Porque isto existe: até agora o `BreadcrumbList` era emitido em oito páginas
 * e **não havia trilho visível em nenhuma**. São duas consequências distintas,
 * e ambas contam:
 *
 * 1. A regra da Google é que os dados estruturados descrevam conteúdo que a
 *    pessoa vê. Um `BreadcrumbList` sem trilho na página é, na melhor das
 *    hipóteses, ignorado; na pior, é tratado como marcação enganosa.
 *
 * 2. Quem chega a `/solucoes/agentes-ia` vindo da pesquisa não tem forma de
 *    subir um nível. Não é só SEO — é navegação que falta.
 *
 * Renderizar os dois a partir do mesmo array torna a divergência impossível
 * por construção, em vez de a deixar à responsabilidade de quem editar a
 * página a seguir. É o mesmo princípio que já governa `content/types.ts`: o
 * que é proibido deve ser irrepresentável.
 *
 * O último elemento não é ligação — é onde a pessoa está. `aria-current="page"`
 * di-lo a quem usa leitor de ecrã, e o `<nav>` tem nome próprio porque uma
 * página pode ter mais do que uma zona de navegação.
 */
export function Breadcrumbs({ items, className }: { items: readonly Migalha[]; className?: string }) {
  if (items.length < 2) return null;

  const ultimo = items.length - 1;

  return (
    <>
      <JsonLd graph={{ '@context': 'https://schema.org', '@graph': [breadcrumbNode(items[ultimo]!.path, items)] }} />

      <nav aria-label="Trilho" className={className}>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[length:var(--text-micro)] text-[color:var(--muted)]">
          {items.map((item, i) => (
            <li key={item.path} className="flex items-center gap-x-2">
              {i > 0 ? (
                <span aria-hidden className="text-[color:var(--hairline)]">
                  /
                </span>
              ) : null}
              {i === ultimo ? (
                <span aria-current="page" className="text-[color:var(--on-surface)]">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.path}
                  className="underline underline-offset-4 transition-colors hover:text-[color:var(--on-surface)]"
                >
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
