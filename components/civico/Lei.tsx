import type { ReactNode } from 'react';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { LEI } from '@/content/civico';
import { caminhoArtigo, caminhoDiploma, LEI_VERIFICADA_EM, relacionados, type ArtigoLei, type DiplomaLei } from '@/lib/civico/lei';
import { absolute } from '@/lib/seo/site';

/**
 * As páginas da lei (D-47). Componentes de servidor, gerados no build.
 * Sem serifa (é do jornal), cor só no CTA, superfícies pelos tokens.
 */

function Fonte({ d, comFalta = false }: { d: DiplomaLei; comFalta?: boolean }) {
  return (
    <aside aria-label={LEI.fonte} className="grid gap-2 border border-[color:var(--border)] p-5 text-sm">
      <p className="rule-label text-[color:var(--muted)]">{LEI.fonte}</p>
      <p>
        <a href={d.fonte.href} target="_blank" rel="noopener" className="underline underline-offset-4">
          {d.fonte.titulo}
        </a>
      </p>
      <p className="text-[color:var(--muted)]">{LEI.fonteNota(LEI_VERIFICADA_EM)}</p>
      {comFalta && d.emFalta.length > 0 && (
        <p className="text-[color:var(--muted)]">{LEI.emFalta(d.emFalta.length, d.emFalta.map((n) => `${n}.º`).join(', '))}</p>
      )}
      {d.revogou && (
        <p className="text-[color:var(--muted)]">
          {LEI.revogou}: {d.revogou}.
        </p>
      )}
    </aside>
  );
}

function Pergunta() {
  return (
    <aside aria-labelledby="lei-pergunta" className="grid gap-3 border border-[color:var(--border)] p-6">
      <h2 id="lei-pergunta" className="text-[length:var(--text-h3)] tracking-[-0.02em]">
        {LEI.perguntaTitulo}
      </h2>
      <p className="text-[color:var(--muted)]">{LEI.perguntaTexto}</p>
      <Link
        href="/civico"
        className="inline-flex min-h-11 items-center justify-self-start rounded-[--radius-xs] bg-[color:var(--color-signal-600)] px-5 text-sm font-medium text-white"
      >
        {LEI.perguntaCta}
      </Link>
      <p className="text-xs text-[color:var(--muted)]">{LEI.naoParecer}</p>
    </aside>
  );
}

export function IndiceLeis({ diplomas, trilho }: { diplomas: readonly DiplomaLei[]; trilho: ReactNode }) {
  return (
    <Section surface="light">
      {trilho}
      <SectionHeading as="h1" eyebrow={LEI.eyebrow} title={LEI.indiceTitulo} lead={LEI.indiceLead} />
      <ul role="list" className="mt-12 grid gap-4 md:grid-cols-3">
        {diplomas.map((d) => (
          <li key={d.slug} className="grid content-start gap-3 border border-[color:var(--border)] p-6">
            <h2 className="text-[length:var(--text-h3)] tracking-[-0.02em]">{d.titulo}</h2>
            <p className="text-sm text-[color:var(--muted)]">
              {d.nome} · {d.artigos.length} {LEI.artigos}
            </p>
            <Link href={caminhoDiploma(d.slug)} className="text-sm underline underline-offset-4">
              {LEI.verArtigos}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-12 max-w-[46rem]">
        <Pergunta />
      </div>
    </Section>
  );
}

export function IndiceDiploma({ d, trilho }: { d: DiplomaLei; trilho: ReactNode }) {
  return (
    <Section surface="light">
      {trilho}
      <SectionHeading as="h1" eyebrow={LEI.eyebrow} title={d.titulo} lead={`${d.nome} · ${d.artigos.length} ${LEI.artigos}`} />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <nav aria-label={`${LEI.todos}: ${d.titulo}`}>
          <ol role="list" className="grid gap-x-8 sm:grid-cols-2">
            {d.artigos.map((a) => (
              <li key={a.n} className="border-b border-[color:var(--border)]">
                <Link href={caminhoArtigo(d.slug, a.n)} className="flex min-h-11 items-baseline gap-3 py-2 hover:underline">
                  <span className="tabular-nums text-[color:var(--muted)]">{a.n}.º</span>
                  <span>{a.epigrafe}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <div className="grid content-start gap-6">
          <Fonte d={d} comFalta />
          <Pergunta />
        </div>
      </div>
    </Section>
  );
}

export function PaginaArtigo({
  d,
  a,
  anterior,
  seguinte,
  trilho,
}: {
  d: DiplomaLei;
  a: ArtigoLei;
  anterior: ArtigoLei | null;
  seguinte: ArtigoLei | null;
  trilho: ReactNode;
}) {
  const caminho = caminhoArtigo(d.slug, a.n);
  const rel = relacionados(d, a);
  const legislacao = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Legislation',
        '@id': `${absolute(caminho)}#artigo`,
        name: `Artigo ${a.n}.º — ${a.epigrafe}`,
        legislationIdentifier: `${d.nome}, artigo ${a.n}.º`,
        legislationJurisdiction: { '@type': 'Country', name: 'Moçambique' },
        inLanguage: 'pt-MZ',
        text: a.paragrafos.join('\n'),
        url: absolute(caminho),
        isPartOf: {
          '@type': 'Legislation',
          name: d.titulo,
          legislationIdentifier: d.nome,
          url: absolute(caminhoDiploma(d.slug)),
          sameAs: d.fonte.href,
        },
      },
    ],
  };

  return (
    <Section surface="light">
      <JsonLd graph={legislacao as never} />
      {trilho}
      <SectionHeading as="h1" eyebrow={`${d.titulo} · ${d.nome}`} title={`Artigo ${a.n}.º — ${a.epigrafe}`} />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <article
          aria-label={`Texto oficial do artigo ${a.n}.º`}
          className="grid max-w-[46rem] content-start gap-4 text-[1.0625rem] leading-relaxed"
        >
          {a.paragrafos.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <nav aria-label="Artigos vizinhos" className="mt-6 grid gap-3 border-t border-[color:var(--border)] pt-6 text-sm sm:grid-cols-2">
            {anterior ? (
              <Link href={caminhoArtigo(d.slug, anterior.n)} className="grid gap-1 hover:underline">
                <span className="text-[color:var(--muted)]">← {LEI.anterior}</span>
                <span>
                  {anterior.n}.º {anterior.epigrafe}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {seguinte && (
              <Link href={caminhoArtigo(d.slug, seguinte.n)} className="grid gap-1 text-right hover:underline sm:justify-items-end">
                <span className="text-[color:var(--muted)]">{LEI.seguinte} →</span>
                <span>
                  {seguinte.n}.º {seguinte.epigrafe}
                </span>
              </Link>
            )}
          </nav>
        </article>
        <div className="grid content-start gap-6">
          <Fonte d={d} />
          {rel.length > 0 && (
            <nav aria-labelledby="lei-relacionados" className="grid gap-2 text-sm">
              <h2 id="lei-relacionados" className="rule-label text-[color:var(--muted)]">
                {LEI.relacionados}
              </h2>
              <ul role="list" className="grid gap-1">
                {rel.map((r) => (
                  <li key={r.n}>
                    <Link href={caminhoArtigo(d.slug, r.n)} className="underline-offset-4 hover:underline">
                      {r.n}.º {r.epigrafe}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={caminhoDiploma(d.slug)} className="mt-2 underline underline-offset-4">
                {LEI.todos}
              </Link>
            </nav>
          )}
          <Pergunta />
        </div>
      </div>
    </Section>
  );
}
