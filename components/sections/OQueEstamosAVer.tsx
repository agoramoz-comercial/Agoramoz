import Link from 'next/link';
import { caminhoDoArtigo } from '@/components/news/jornal/ligacoes';
import { IDEIAS } from '@/content/i18n/inicio-2026';
import type { Idioma } from '@/content/types';
import { ligacao } from '@/lib/i18n/rotas';
import { t } from '@/lib/i18n/texto';
import { jornalLigado, listarPublicados } from '@/lib/news/jornal-servidor';

function dataCurta(iso: string, idioma: Idioma): string {
  return new Intl.DateTimeFormat(idioma === 'en' ? 'en-GB' : 'pt-PT', {
    timeZone: 'Africa/Maputo',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

/**
 * «O que estamos a ver»: os três artigos mais recentes do Moz News, como os
 * estudos próprios dos gigantes (benchmark 2026). Sem jornal ligado, ou se a
 * leitura falhar, mostra só a ligação — nunca uma lista inventada nem vazia a
 * fingir que não há artigos.
 */
export async function OQueEstamosAVer({ idioma = 'pt' }: { idioma?: Idioma }) {
  const artigos = jornalLigado() ? await listarPublicados(idioma, null, 3) : null;
  const lista = (artigos ?? []).slice(0, 3);
  const news = ligacao('/news', idioma).href;

  return (
    <div className="mt-16">
      {lista.length > 0 ? (
        <ul className="grid gap-px overflow-hidden rounded-md border border-[color:var(--hairline)] bg-[color:var(--hairline)] md:grid-cols-3">
          {lista.map((a) => (
            <li key={a.id} className="bg-[color:var(--surface)]">
              <Link
                href={caminhoDoArtigo(a.slug, idioma)}
                className="group flex h-full min-h-60 flex-col justify-between gap-8 p-6 transition-colors duration-500 hover:bg-[color:var(--surface-raised)]"
              >
                <span>
                  <span className="rule-label block text-[color:var(--muted)]">
                    <time dateTime={a.publicado_em}>{dataCurta(a.publicado_em, idioma)}</time>
                  </span>
                  <span className="mt-4 block font-display text-[length:var(--text-h3)] leading-[1.15] font-bold tracking-[var(--tracking-heading)]">
                    {a.titulo}
                  </span>
                  {a.entrada && (
                    <span className="mt-3 line-clamp-3 block text-sm text-[color:var(--muted)]">{a.entrada}</span>
                  )}
                </span>
                <span aria-hidden className="font-display text-xl text-[color:var(--muted)] transition-transform duration-300 group-hover:translate-x-1.5">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="max-w-[48ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">{t(IDEIAS.vazio, idioma)}</p>
      )}
      <Link
        href={news}
        className="rule-label mt-8 inline-flex items-center gap-2 text-[color:var(--on-surface)] underline decoration-[color:var(--hairline)] underline-offset-4 hover:decoration-[color:var(--accent)]"
      >
        {t(IDEIAS.verTodas, idioma)} <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
