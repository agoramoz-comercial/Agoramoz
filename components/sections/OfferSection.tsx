import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { MagneticButton } from '@/components/motion/MagneticButton';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { Reveal } from '@/components/motion/Reveal';
import { OFFER } from '@/content/site';
import { CHROME } from '@/content/i18n/chrome';
import { DIAGNOSTICO } from '@/content/i18n/diagnostico';
import { OFERTA } from '@/content/i18n/paginas';
import type { Idioma } from '@/content/types';
import { ligacao } from '@/lib/i18n/rotas';
import { t } from '@/lib/i18n/texto';

/**
 * A oferta de entrada. O texto é o da página de diagnóstico
 * (`content/i18n/diagnostico.ts`), cujo português é o de `OFFER` palavra por
 * palavra — uma só fonte para a mesma oferta nos dois sítios onde aparece.
 */
export function OfferSection({
  idioma = 'pt',
  href = ligacao('/diagnostico', idioma).href,
}: {
  idioma?: Idioma;
  href?: string;
}) {
  return (
    <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-6">
        <div className="flex items-baseline gap-4">
          <span className="rule-label text-[color:var(--muted)]">{t(DIAGNOSTICO.eyebrow, idioma)}</span>
          <span className="rule-label text-[color:var(--accent)]">{OFFER.name}</span>
        </div>

        <SplitHeading
          as="h2"
          className="mt-8 max-w-[15ch] text-[length:var(--text-h1)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]"
        >
          {t(DIAGNOSTICO.titulo, idioma)}
        </SplitHeading>

        <p className="mt-8 max-w-[44ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">
          {t(DIAGNOSTICO.promessa, idioma)}
        </p>

        <MagneticButton className="mt-10 inline-block">
          <Button asChild size="lg">
            <Link href={href}>
              {t(CHROME.ctaPrimario, idioma)}
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </Button>
        </MagneticButton>

        <p className="rule-label mt-5 text-[color:var(--muted)]">{t(OFERTA.nota, idioma)}</p>
      </div>

      <Reveal className="lg:col-span-6">
        <p className="rule-label text-[color:var(--muted)]">{t(OFERTA.recebe, idioma)}</p>
        <ol className="mt-8">
          {DIAGNOSTICO.entregas.map((entrega, i) => (
            <li
              key={entrega.pt}
              data-animate
              className="flex items-baseline gap-6 border-t border-dashed border-[color:var(--hairline)] py-4"
            >
              <span className="rule-label shrink-0 text-[color:var(--accent)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[color:var(--muted)]">{t(entrega, idioma)}</span>
            </li>
          ))}
        </ol>
      </Reveal>
    </div>
  );
}
