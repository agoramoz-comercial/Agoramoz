import type { ReactNode } from 'react';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { aulasDoCurso, duracao, minutosDoCurso, ROTULO_NIVEL, type Curso } from '@/lib/cursos/modelo';
import { absolute } from '@/lib/seo/site';

/**
 * As páginas públicas dos cursos (D-49). Componentes de servidor; cor só
 * no CTA, superfícies pelos tokens. Mostram o curso verificado — o que vai
 * aprender, com as fontes de cada resultado, o programa, as fontes e como
 * foi verificado — e levam ao documento completo para descarregar.
 *
 * O texto das fontes nunca chega aqui: só o título e o tipo de cada uma.
 */

export const caminhoCurso = (slug: string) => `/cursos/${slug}`;
const n2 = (n: number) => String(n).padStart(2, '0');
const CTA =
  'inline-flex min-h-11 items-center justify-center rounded-[--radius-xs] bg-[color:var(--color-signal-600)] px-5 text-sm font-medium text-white';
const ROTULO = 'rule-label text-[color:var(--muted)]';

function Etiquetas({ ids, curso }: { ids: readonly string[]; curso: Curso }) {
  const titulo = (id: string) => curso.fontes.find((f) => f.id === id.split('.')[0])?.titulo ?? id;
  return (
    <span className="mt-2 flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <span
          key={id}
          title={`${titulo(id)}, passagem ${id.split('.')[1]}`}
          className="border border-[color:var(--border)] px-1.5 py-0.5 text-xs tabular-nums text-[color:var(--muted)]"
        >
          <span className="sr-only">Fonte </span>
          {id}
        </span>
      ))}
    </span>
  );
}

export function descricaoDoCurso(c: Curso): string {
  const base = `Curso AGORAMOZ (${ROTULO_NIVEL[c.nivel].toLowerCase()}, ${duracao(minutosDoCurso(c))}): ${c.resultados
    .slice(0, 2)
    .map((r) => r.texto.replace(/[.;]$/, ''))
    .join('; ')}.`;
  if (base.length <= 158) return base.length >= 120 ? base : `${base} Gerado das fontes, com cada afirmação verificada.`.slice(0, 160);
  return `${base.slice(0, 156).replace(/\s+\S*$/, '')}…`;
}

function jsonLd(c: Curso, slug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: c.titulo,
    description: descricaoDoCurso(c),
    url: absolute(caminhoCurso(slug)),
    inLanguage: 'pt',
    educationalLevel: ROTULO_NIVEL[c.nivel],
    timeRequired: `PT${minutosDoCurso(c)}M`,
    teaches: c.resultados.map((r) => r.texto),
    provider: { '@type': 'Organization', name: 'AGORAMOZ', sameAs: absolute('/') },
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: `PT${minutosDoCurso(c)}M` },
  };
}

export function PaginaCurso({ curso: c, slug, trilho }: { curso: Curso; slug: string; trilho: ReactNode }) {
  const minutos = minutosDoCurso(c);
  const v = c.verificacao;
  const total = v.aceites + v.retirados;
  const pct = total ? Math.round((v.aceites / total) * 100) : 0;
  return (
    <>
      <JsonLd graph={jsonLd(c, slug) as never} />
      <Section surface="light">
        {trilho}
        <SectionHeading as="h1" eyebrow={`AGORAMOZ Academia · ${ROTULO_NIVEL[c.nivel]}`} title={c.titulo} lead={c.subtitulo || c.publico} />
        <dl className="mt-10 grid grid-cols-2 gap-px border border-[color:var(--border)] bg-[color:var(--border)] sm:grid-cols-4">
          {[
            ['Duração', duracao(minutos)],
            ['Módulos', n2(c.modulos.length)],
            ['Aulas', n2(aulasDoCurso(c))],
            ['Fontes', n2(c.fontes.length)],
          ].map(([k, x]) => (
            <div key={k} className="grid gap-1 bg-[color:var(--surface)] p-5">
              <dt className={ROTULO}>{k}</dt>
              <dd className="text-[length:var(--text-h3)] tabular-nums tracking-[-0.02em]">{x}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href={`${caminhoCurso(slug)}/documento`} className={CTA}>
            Descarregar o curso (PDF)
          </Link>
          <a href="#programa" className="text-sm underline underline-offset-4">
            Ver o programa
          </a>
        </div>
        <p className="mt-4 max-w-[46rem] text-sm text-[color:var(--muted)]">Para quem: {c.publico}</p>
      </Section>

      <Section surface="tint">
        <SectionHeading
          eyebrow="Resultados"
          title="O que vai aprender"
          lead="Cada resultado leva as passagens das fontes que o sustentam."
        />
        <ol role="list" className="mt-10 grid gap-px border border-[color:var(--border)] bg-[color:var(--border)] md:grid-cols-2">
          {c.resultados.map((r, i) => (
            <li key={i} className="grid grid-cols-[3rem_1fr] gap-3 bg-[color:var(--surface)] p-6">
              <span className="text-sm tabular-nums text-[color:var(--muted)]">{n2(i + 1)}</span>
              <span>
                <span className="text-[1.0625rem] leading-snug">{r.texto}</span>
                <Etiquetas ids={r.fontes} curso={c} />
              </span>
            </li>
          ))}
        </ol>
        {c.prerequisitos.length > 0 && (
          <p className="mt-6 text-sm text-[color:var(--muted)]">Antes de começar: {c.prerequisitos.join(' · ')}</p>
        )}
      </Section>

      <Section surface="light" id="programa">
        <SectionHeading
          eyebrow="Programa"
          title={`${c.modulos.length} módulos, ${aulasDoCurso(c)} aulas`}
          lead={`${duracao(minutos)} de estudo, com perguntas no fim de cada aula.`}
        />
        <ol role="list" className="mt-10 grid gap-6">
          {c.modulos.map((m, mi) => (
            <li key={mi} className="grid gap-4 border-t border-[color:var(--border)] pt-6 md:grid-cols-[10rem_1fr]">
              <p className="text-[length:var(--text-h2)] leading-none tabular-nums tracking-[-0.04em]">{n2(mi + 1)}</p>
              <div>
                <h3 className="text-[length:var(--text-h3)] tracking-[-0.02em]">{m.titulo}</h3>
                <p className="mt-2 max-w-[46rem] text-[color:var(--muted)]">{m.resumo}</p>
                <ol role="list" className="mt-4 grid gap-1">
                  {m.aulas.map((a, ai) => (
                    <li key={ai} className="flex items-baseline justify-between gap-4 border-b border-[color:var(--border)] py-2">
                      <span>
                        <span className="mr-3 text-sm tabular-nums text-[color:var(--muted)]">
                          {mi + 1}.{ai + 1}
                        </span>
                        {a.titulo}
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-[color:var(--muted)]">{a.minutos} min</span>
                    </li>
                  ))}
                </ol>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section surface="tint">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Fontes" title="De onde vem" as="h2" />
            <ul role="list" className="mt-8 grid gap-2">
              {c.fontes.map((f) => (
                <li key={f.id} className="flex gap-3 border-b border-[color:var(--border)] py-2">
                  <span className="tabular-nums text-[color:var(--muted)]">{f.id}</span>
                  <span>{f.titulo}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              As etiquetas como F1.3 apontam para a fonte 1, passagem 3, pela ordem do documento original.
            </p>
          </div>
          <div>
            <SectionHeading eyebrow="Verificação" title="Como foi verificado" as="h2" />
            <p className="mt-8 text-[length:var(--text-h2)] leading-none tabular-nums tracking-[-0.04em]">{pct}%</p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {v.aceites} afirmações aceites, {v.retirados} retiradas por não terem apoio nas fontes.
            </p>
            <ul role="list" className="mt-6 grid gap-2 text-sm">
              {[
                'As passagens citadas existem e foram dadas àquela aula.',
                'Uma citação aparece, palavra a palavra, na passagem.',
                'Cada número escrito está nas passagens citadas.',
                'As palavras-chave de cada afirmação estão nas passagens citadas.',
              ].map((t) => (
                <li key={t} className="border-b border-[color:var(--border)] pb-2">
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              A verificação prova que o curso vem das fontes; a exactidão das fontes é de quem as escolheu. Emitido em{' '}
              {v.emitidaEm.slice(0, 10).split('-').reverse().join('/')}.
            </p>
            <Link href={`${caminhoCurso(slug)}/documento`} className={`${CTA} mt-8`}>
              Descarregar o curso (PDF)
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}

export function IndiceCursos({ cursos, trilho }: { cursos: readonly { slug: string; curso: Curso }[]; trilho: ReactNode }) {
  return (
    <Section surface="light">
      {trilho}
      <SectionHeading
        as="h1"
        eyebrow="AGORAMOZ Academia"
        title="Cursos"
        lead="Cursos escritos a partir de fontes escolhidas pela AGORAMOZ, com cada afirmação verificada contra essas fontes. Para ler aqui e descarregar em PDF."
      />
      {cursos.length === 0 ? (
        <p className="mt-10 text-[color:var(--muted)]">Ainda não há cursos publicados.</p>
      ) : (
        <ul role="list" className="mt-12 grid gap-4 md:grid-cols-3">
          {cursos.map(({ slug, curso: c }) => (
            <li key={slug} className="grid content-start gap-3 border border-[color:var(--border)] p-6">
              <p className={ROTULO}>
                {ROTULO_NIVEL[c.nivel]} · {duracao(minutosDoCurso(c))}
              </p>
              <h2 className="text-[length:var(--text-h3)] tracking-[-0.02em]">{c.titulo}</h2>
              {c.subtitulo && <p className="text-sm text-[color:var(--muted)]">{c.subtitulo}</p>}
              <Link href={caminhoCurso(slug)} className="text-sm underline underline-offset-4">
                O que vai aprender
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
