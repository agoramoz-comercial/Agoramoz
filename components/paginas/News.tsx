import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { Analisador } from '@/components/news/Analisador';
import { MARCA_NEWS, NEWS } from '@/content/i18n/news';
import type { Idioma } from '@/content/types';
import { t } from '@/lib/i18n/texto';

/**
 * AGORAMOZ Moz News, nos dois idiomas.
 *
 * A lógica é a da página `agoramoz.lovable.app/news` — uma notícia entra, uma
 * análise sai, com as pontuações do motor Lovable. O que muda é a organização:
 * o analisador vem logo a seguir ao título (no original estava atrás de um
 * botão que trocava a página inteira), e o relatório lê-se de cima para baixo
 * pela ordem da decisão em vez de cinco separadores.
 *
 * O trilho vem da rota, como nas outras páginas bilingues.
 */
export function News({ idioma, trilho }: { idioma: Idioma; trilho: React.ReactNode }) {
  return (
    <>
      <Section surface="deep" contour className="print:hidden">
        {trilho}
        <div className="rule flex flex-wrap items-baseline gap-4 pt-6">
          <span className="rule-label text-[color:var(--muted)]">{t(NEWS.eyebrow, idioma)}</span>
          <span className="rule-label text-[color:var(--accent)]">{MARCA_NEWS}</span>
        </div>
        <SplitHeading
          as="h1"
          className="mt-10 max-w-[16ch] text-[length:var(--text-h1)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]"
        >
          {t(NEWS.titulo, idioma)}
        </SplitHeading>
        <p className="mt-8 max-w-[56ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">
          {t(NEWS.promessa, idioma)}
        </p>
      </Section>

      <Section surface="light" aria-label={t(NEWS.formTitulo, idioma)}>
        <Analisador idioma={idioma} />
      </Section>

      <Section surface="tint" aria-labelledby="h-news-passos" className="print:hidden">
        <SectionHeading
          id="h-news-passos"
          eyebrow={t(NEWS.passosEyebrow, idioma)}
          title={t(NEWS.passosTitulo, idioma)}
          max="wide"
        />
        <ol className="mt-12 grid gap-px bg-[color:var(--border)] md:grid-cols-3">
          {NEWS.passos.map((p, i) => (
            <li key={p.titulo.pt} className="bg-[color:var(--surface)] p-6 sm:p-8">
              <span className="numeral chrome-text block text-[length:var(--text-numeral)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-6 text-lg font-bold">{t(p.titulo, idioma)}</h3>
              <p className="mt-3 text-sm text-[color:var(--muted)]">{t(p.corpo, idioma)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section surface="light" aria-labelledby="h-news-quem" className="print:hidden">
        <SectionHeading
          id="h-news-quem"
          eyebrow={t(NEWS.paraQuemEyebrow, idioma)}
          title={t(NEWS.paraQuemTitulo, idioma)}
          max="wide"
        />
        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4" role="list">
          {NEWS.paraQuem.map((p) => (
            <li key={p.papel.pt} className="border-t border-[color:var(--hairline)] pt-5">
              <p className="text-2xl font-bold tracking-[var(--tracking-heading)]">{t(p.papel, idioma)}</p>
              <p className="mt-3 text-sm text-[color:var(--muted)]">{t(p.corpo, idioma)}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section surface="tint" aria-labelledby="h-news-entrega" className="print:hidden">
        <SectionHeading
          id="h-news-entrega"
          eyebrow={t(NEWS.entregaEyebrow, idioma)}
          title={t(NEWS.entregaTitulo, idioma)}
          max="wide"
        />
        <ul className="mt-12 grid gap-px bg-[color:var(--border)] sm:grid-cols-2 lg:grid-cols-3" role="list">
          {NEWS.entrega.map((e) => (
            <li key={e.titulo.pt} className="bg-[color:var(--surface)] p-6">
              <h3 className="font-bold">{t(e.titulo, idioma)}</h3>
              <p className="mt-2 text-sm text-[color:var(--muted)]">{t(e.corpo, idioma)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 max-w-[60ch] text-sm text-[color:var(--muted)]">{t(NEWS.aviso, idioma)}</p>
      </Section>
    </>
  );
}
