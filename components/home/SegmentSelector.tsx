'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { gsap, useGSAP, Flip } from '@/lib/motion/register';
import { DUR, EASE } from '@/lib/motion/tokens';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { COUNTRIES, COUNTRY_CODES, GLOBAL_CODES, SECTOR_LABELS, getSectorsForCountry } from '@/content/registry';
import { IMPROVEMENT_GOALS } from '@/content/site';
import { CARTAO_GLOBAL } from '@/content/i18n/paginas';
import { NOME_PAIS, destinoDaEntrada } from '@/content/i18n/chrome';
import { OBJETIVOS, ROTULO_SETOR } from '@/content/i18n/formulario';
import { SELETOR } from '@/content/i18n/inicio';
import type { CountryCode, Idioma, SectorSlug } from '@/content/types';
import { track } from '@/lib/analytics/track';
import { ligacao } from '@/lib/i18n/rotas';
import { t } from '@/lib/i18n/texto';

/**
 * A quarta entrada — o nível global, em inglês — não tem setor nem objetivo:
 * leva directamente a `/en/global`, onde cada mercado tem a sua página.
 */
type Entrada = CountryCode | 'global';

export function SegmentSelector({ idioma = 'pt' }: { idioma?: Idioma }) {
  const STEPS = [
    { id: 'pais', question: t(SELETOR.pais, idioma) },
    { id: 'setor', question: t(SELETOR.setor, idioma) },
    { id: 'objetivo', question: t(SELETOR.objetivo, idioma) },
  ] as const;

  const router = useRouter();
  const scope = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLParagraphElement>(null);

  const [step, setStep] = useState(0);
  const [country, setCountry] = useState<Entrada | null>(null);
  const [sector, setSector] = useState<SectorSlug | null>(null);
  const [goal, setGoal] = useState<string | null>(null);

  /**
   * Flip mede o painel antes e depois da mudança de passo e anima a diferença
   * de altura. Sem isto, o cartão salta quando o número de opções muda.
   */
  const { contextSafe } = useGSAP({ scope });

  // Falso positivo do React Compiler. `contextSafe` é o padrão documentado do
  // @gsap/react: é chamado durante o render, mas o callback que devolve só
  // corre em resposta a um evento do utilizador — nunca durante o render. A
  // alternativa (guardar o handler num ref) capturaria estado obsoleto, o que
  // seria um bug a sério em troca de silenciar um aviso.
  // eslint-disable-next-line react-hooks/refs
  const go = contextSafe((next: number) => {
    const panel = panelRef.current;
    if (!panel) return setStep(next);

    const state = Flip.getState(panel);
    setStep(next);

    requestAnimationFrame(() => {
      Flip.from(state, { duration: DUR.sm, ease: EASE.inOut, absolute: false });
      gsap.fromTo(
        panel.querySelectorAll('[data-step-item]'),
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: DUR.sm, stagger: 0.03, ease: EASE.out },
      );
      // Foco na pergunta nova — anunciado, sem roubar o foco no carregamento.
      headingRef.current?.focus();
    });
  }) as (next: number) => void;

  function selectCountry(value: string) {
    const code = value as Entrada;
    setCountry(code);
    setSector(null);
    // «global» não é um país: o esquema de eventos recusa-o, e não se inventa um evento para ele.
    if (code !== 'global') track({ name: 'country_selected', country: code, surface: 'hero-selector' });
  }

  function selectSector(value: string) {
    const s = value as SectorSlug;
    setSector(s);
    if (country && country !== 'global') track({ name: 'sector_selected', country, sector: s, surface: 'hero-selector' });
  }

  function finish() {
    if (!country) return;
    if (country === 'global') return router.push(destinoDaEntrada('global'));
    const sectorEntry = sector ? getSectorsForCountry(country).find((s) => s.sector === sector) : null;
    if (sectorEntry?.published) return router.push(sectorEntry.href);

    const goalEntry = IMPROVEMENT_GOALS.find((g) => g.value === goal);
    if (goalEntry) return router.push(ligacao(`/solucoes/${goalEntry.solution}`, idioma).href);
    router.push(`/${country}`);
  }

  const global = country === 'global';
  const total = global ? 1 : STEPS.length;
  const canAdvance = step === 0 ? Boolean(country) : step === 1 ? Boolean(sector) : Boolean(goal);

  return (
    /* Sem data-animate: é um controlo interativo, tem de estar disponível
       desde o primeiro frame. O movimento nunca pode atrasar a interação. */
    <div ref={scope} className="w-full">
      <div
        ref={panelRef}
        className="border border-[color:var(--border)] p-7 md:p-10"
      >
        <div className="flex items-center justify-between gap-4">
          <Eyebrow>{t(SELETOR.eyebrow, idioma)}</Eyebrow>
          <p className="rule-label text-[color:var(--muted)]">
            {t(SELETOR.passo, idioma).replace('{n}', String(step + 1)).replace('{total}', String(total))}
          </p>
        </div>

        <p
          ref={headingRef}
          tabIndex={-1}
          aria-live="polite"
          className="mt-6 font-display text-[length:var(--text-h2)] leading-[1.05] font-bold tracking-[var(--tracking-heading)] outline-none"
        >
          {STEPS[step]!.question}
        </p>

        <div className="mt-8">
          {step === 0 && (
            <ChipGroup
              legend={t(SELETOR.pais, idioma)}
              columns={2}
              value={country}
              onChange={selectCountry}
              options={[
                ...COUNTRY_CODES.map((code) => ({
                  value: code,
                  label: idioma === 'pt' ? COUNTRIES[code].name : t(NOME_PAIS[code], idioma),
                  hint: t(SELETOR.dica[code], idioma),
                })),
                {
                  value: 'global',
                  label: t(CARTAO_GLOBAL.nome, idioma),
                  hint: t(SELETOR.dica.global, idioma).replace('{n}', String(GLOBAL_CODES.length)),
                },
              ]}
            />
          )}

          {step === 1 && country && !global && (
            <ChipGroup
              legend={t(SELETOR.setor, idioma)}
              columns={2}
              value={sector}
              onChange={selectSector}
              options={COUNTRIES[country].sectors.map((s) => ({
                value: s,
                label: idioma === 'pt' ? SECTOR_LABELS[s] : t(ROTULO_SETOR[s], idioma),
              }))}
            />
          )}

          {step === 2 && (
            <ChipGroup
              legend={t(SELETOR.objetivo, idioma)}
              columns={2}
              value={goal}
              onChange={setGoal}
              options={IMPROVEMENT_GOALS.map((g) => ({
                value: g.value,
                label: idioma === 'pt' ? g.label : t(OBJETIVOS[g.value], idioma),
              }))}
            />
          )}
        </div>

        <div className="rule mt-10 flex items-center justify-between gap-3 pt-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => go(step - 1)}
            disabled={step === 0}
            className="gap-1.5"
          >
            <ArrowLeft aria-hidden className="size-4" />
            {t(SELETOR.voltar, idioma)}
          </Button>

          {step < total - 1 ? (
            <Button type="button" onClick={() => go(step + 1)} disabled={!canAdvance} className="gap-1.5">
              {t(SELETOR.continuar, idioma)}
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          ) : (
            <Button type="button" onClick={finish} disabled={!canAdvance} className="gap-1.5">
              {t(global ? SELETOR.verGlobal : SELETOR.recomendamos, idioma)}
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="rule-label mt-4 text-center text-[color:var(--muted)]">
        {t(SELETOR.prefere, idioma)}{' '}
        <a href="#setores" className="inline-flex min-h-11 items-center underline underline-offset-4">
          {t(SELETOR.todos, idioma)}
        </a>
      </p>
    </div>
  );
}
