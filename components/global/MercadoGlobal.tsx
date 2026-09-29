import Link from 'next/link';
import { ligacao } from '@/lib/i18n/rotas';
import { ArrowRight } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { DitherMark } from '@/components/ui/DitherMark';
import { t } from '@/lib/i18n/texto';
import type { GlobalMarket, Idioma } from '@/content/types';

/**
 * A página de um mercado de expansão, nos dois idiomas.
 *
 * Um componente e duas rotas finas, em vez de duas páginas paralelas: o texto
 * vive no conteúdo, a estrutura vive aqui, e a versão inglesa não pode
 * divergir da portuguesa por alguém ter editado só uma.
 *
 * O que esta página NÃO diz, e é deliberado: não afirma escritório, cliente,
 * caso nem operação neste país. Afirma mercado, competência e método — que é
 * tudo o que é verdade hoje, e `content/types.ts` impede o resto.
 */

const COPIA = {
  trilho: { pt: 'Mercados', en: 'Markets' },
  porque: { pt: 'Porquê este mercado', en: 'Why this market' },
  setores: { pt: 'Onde o problema aparece', en: 'Where the problem shows up' },
  setoresLead: {
    pt: 'Dez setores deste mercado, e o trabalho documental que cada um faz à mão.',
    en: 'Ten sectors in this market, and the document work each of them still does by hand.',
  },
  moeda: { pt: 'Moeda de referência', en: 'Reference currency' },
  dados: { pt: 'Regime de dados aplicável', en: 'Applicable data regime' },
  cta: { pt: 'Solicitar Diagnóstico Estratégico', en: 'Request a Strategic Diagnostic' },
  ctaLead: {
    pt: 'Uma conversa objetiva sobre onde a sua empresa perde horas qualificadas — e o que custa continuar assim.',
    en: 'A focused conversation about where your company loses qualified hours — and what it costs to carry on.',
  },
  resultado: { pt: 'Resultado', en: 'Outcome' },
} as const;

/**
 * O trilho entra de fora, e não é por gosto: `lib/seo/rotas.test.ts` exige que o
 * código-fonte de cada página declare `<Breadcrumbs` — o contrato é que a ROTA
 * afirma a sua posição no site. Passado como propriedade, fica declarado na
 * rota e renderizado no mesmo sítio da secção.
 */
export function MercadoGlobal({
  mercado,
  idioma,
  trilho,
}: {
  mercado: GlobalMarket;
  idioma: Idioma;
  trilho: React.ReactNode;
}) {
  const nome = t(mercado.name, idioma);
  const lang = (k: keyof typeof COPIA) => t(COPIA[k], idioma);

  return (
    <>
      <Section surface="deep" contour>
        {trilho}
        <SectionHeading
          as="h1"
          eyebrow={lang('trilho')}
          title={t(mercado.seo.title, idioma)}
          lead={t(mercado.why, idioma)}
          max="wide"
        />

        <dl className="rule mt-14 grid gap-8 pt-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [lang('moeda'), mercado.currency],
            [lang('dados'), mercado.dataRegime],
            [lang('porque'), nome],
          ].map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt className="rule-label text-[color:var(--muted)]">{rotulo}</dt>
              <dd className="numeral mt-2 text-[length:var(--text-h3)]">{valor}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section surface="light" aria-labelledby="h-setores">
        <SectionHeading
          id="h-setores"
          eyebrow={lang('setores')}
          title={lang('setoresLead')}
        />
        <Reveal className="mt-14">
          <ul className="grid gap-x-10 gap-y-12 md:grid-cols-2">
            {mercado.sectors.map((s, i) => (
              <li
                key={s.slug}
                data-animate
                className="border-t border-dashed border-[color:var(--hairline)] pt-6"
              >
                <div className="flex items-baseline gap-4">
                  <span className="numeral text-[length:var(--text-h3)] text-[color:var(--muted)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-display text-[length:var(--text-h3)] leading-[var(--leading-heading)] font-semibold tracking-[var(--tracking-heading)]">
                    {t(s.name, idioma)}
                  </h3>
                </div>
                <p className="mt-4 max-w-[46ch] text-[color:var(--muted)]">{t(s.pain, idioma)}</p>
                <p className="mt-4 flex items-start gap-2.5">
                  <DitherMark size="sm" />
                  <span className="max-w-[44ch] text-sm text-[color:var(--on-surface)]">
                    {t(s.outcome, idioma)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      <Section surface="deep" contour aria-labelledby="h-cta">
        <SectionHeading id="h-cta" title={lang('cta')} lead={lang('ctaLead')} />
        <div className="mt-10">
          <Button asChild>
            {/* O formulário no idioma da página, com o mercado pré-selecionado
                pelo `?pais=`. `ligacao` só leva a `/en/diagnostico` se a rota
                estiver na lista bilingue — nunca a um 404. */}
            <Link href={`${ligacao('/diagnostico', idioma).href}?pais=${mercado.code}`}>
              {lang('cta')}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
