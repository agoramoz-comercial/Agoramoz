import Link from 'next/link';
import { caminhoDoArtigo } from '@/components/news/jornal/ligacoes';
import type { Lingua } from '@/content/types';
import { idiomaBase } from '@/lib/i18n/texto';
import { jornalLigado, listarPublicados } from '@/lib/news/jornal-servidor';

function data(iso: string, lingua: Lingua): string {
  const local = { pt: 'pt-PT', en: 'en-GB', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', ar: 'ar' }[lingua];
  return new Intl.DateTimeFormat(local, { timeZone: 'Africa/Maputo', day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );
}

/**
 * Os três artigos mais recentes do Moz News. O jornal publica em português e
 * inglês: fr/es/de/ar mostram a edição inglesa, marcada com `lang`. Sem jornal
 * ou com falha de leitura, só a frase — nunca uma lista inventada.
 */
export async function IdeiasV3({ lingua, vazio }: { lingua: Lingua; vazio: string }) {
  const edicao = idiomaBase(lingua);
  const artigos = jornalLigado() ? await listarPublicados(edicao, null, 3) : null;
  const lista = (artigos ?? []).slice(0, 3);
  if (lista.length === 0) return <p className="mt-16 text-lg text-[var(--v3-terra)]">{vazio}</p>;

  return (
    <ul className="mt-16 grid gap-4 md:grid-cols-3">
      {lista.map((a) => (
        <li key={a.id}>
          <Link
            href={caminhoDoArtigo(a.slug, edicao)}
            lang={edicao !== lingua ? edicao : undefined}
            className="group flex h-full min-h-72 flex-col justify-between rounded-[1.5rem] border border-[var(--v3-linha-escura)] p-7 transition-colors duration-500 hover:bg-[var(--v3-papel-2)]"
          >
            <div>
              <time dateTime={a.publicado_em} className="v3-etiqueta text-[var(--v3-terra)]">
                {data(a.publicado_em, lingua)}
              </time>
              <h3 className="mt-5 text-2xl leading-[1.12] font-medium tracking-[-0.03em]">{a.titulo}</h3>
              {a.entrada && <p className="mt-3 line-clamp-3 text-[var(--v3-terra)]">{a.entrada}</p>}
            </div>
            <span aria-hidden className="mt-8 text-xl transition-transform duration-300 group-hover:translate-x-1.5 rtl:-scale-x-100">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
