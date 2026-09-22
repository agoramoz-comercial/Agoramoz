'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { gsap, useGSAP, Flip } from '@/lib/motion/register';
import { DUR, EASE } from '@/lib/motion/tokens';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { COUNTRIES, COUNTRY_CODES, SECTOR_LABELS, getSectorsForCountry } from '@/content/registry';
import { IMPROVEMENT_GOALS } from '@/content/site';
import type { CountryCode, SectorSlug } from '@/content/types';
import { track } from '@/lib/analytics/track';

const STEPS = [
  { id: 'pais', question: 'Onde opera a sua empresa?' },
  { id: 'setor', question: 'Qual é o seu setor?' },
  { id: 'objetivo', question: 'O que pretende melhorar?' },
] as const;

export function SegmentSelector() {
  const router = useRouter();
  const scope = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLParagraphElement>(null);

  const [step, setStep] = useState(0);
  const [country, setCountry] = useState<CountryCode | null>(null);
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
    const code = value as CountryCode;
    setCountry(code);
    setSector(null);
    track({ name: 'country_selected', country: code, surface: 'hero-selector' });
  }

  function selectSector(value: string) {
    const s = value as SectorSlug;
    setSector(s);
    if (country) track({ name: 'sector_selected', country, sector: s, surface: 'hero-selector' });
  }

  function finish() {
    if (!country) return;
    const sectorEntry = sector ? getSectorsForCountry(country).find((s) => s.sector === sector) : null;
    if (sectorEntry?.published) return router.push(sectorEntry.href);

    const goalEntry = IMPROVEMENT_GOALS.find((g) => g.value === goal);
    if (goalEntry) return router.push(`/solucoes/${goalEntry.solution}`);
    router.push(`/${country}`);
  }

  const canAdvance = step === 0 ? Boolean(country) : step === 1 ? Boolean(sector) : Boolean(goal);

  return (
    /* Sem data-animate: é um controlo interativo, tem de estar disponível
       desde o primeiro frame. O movimento nunca pode atrasar a interação. */
    <div ref={scope} className="w-full">
      <div
        ref={panelRef}
        className="rounded-[--radius-xl] border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-6 md:p-8"
      >
        <div className="flex items-center justify-between gap-4">
          <Eyebrow>Encontre o seu caminho</Eyebrow>
          <p className="font-mono text-[length:var(--text-micro)] text-[color:var(--muted)]">
            Passo {step + 1} de {STEPS.length}
          </p>
        </div>

        <p
          ref={headingRef}
          tabIndex={-1}
          aria-live="polite"
          className="mt-4 font-display text-[length:var(--text-h3)] font-semibold outline-none"
        >
          {STEPS[step]!.question}
        </p>

        <div className="mt-6">
          {step === 0 && (
            <ChipGroup
              legend="Onde opera a sua empresa?"
              columns={3}
              value={country}
              onChange={selectCountry}
              options={COUNTRY_CODES.map((code) => ({
                value: code,
                label: COUNTRIES[code].name,
                hint: COUNTRIES[code].voice.emphasis[0],
              }))}
            />
          )}

          {step === 1 && country && (
            <ChipGroup
              legend="Qual é o seu setor?"
              columns={2}
              value={sector}
              onChange={selectSector}
              options={COUNTRIES[country].sectors.map((s) => ({ value: s, label: SECTOR_LABELS[s] }))}
            />
          )}

          {step === 2 && (
            <ChipGroup
              legend="O que pretende melhorar?"
              columns={2}
              value={goal}
              onChange={setGoal}
              options={IMPROVEMENT_GOALS.map((g) => ({ value: g.value, label: g.label }))}
            />
          )}
        </div>

        <div className="mt-7 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => go(step - 1)}
            disabled={step === 0}
            className="gap-1.5"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Voltar
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => go(step + 1)} disabled={!canAdvance} className="gap-1.5">
              Continuar
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          ) : (
            <Button type="button" onClick={finish} disabled={!canAdvance} className="gap-1.5">
              Ver o que recomendamos
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="mt-3 text-center font-mono text-[length:var(--text-micro)] text-[color:var(--muted)]">
        Prefere ver tudo? <a href="#setores" className="underline underline-offset-4">Todos os setores</a>
      </p>
    </div>
  );
}
