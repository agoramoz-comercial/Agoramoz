'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { gsap, useGSAP, Flip } from '@/lib/motion/register';
import { DUR, EASE } from '@/lib/motion/tokens';
import { SoPortugues } from '@/components/ui/SoPortugues';
import { COUNTRIES, COUNTRY_CODES, GLOBAL_CODES, GLOBAL_MARKETS, getSectorsForCountry } from '@/content/registry';
import { NOME_PAIS } from '@/content/i18n/chrome';
import { ROTULO_SETOR } from '@/content/i18n/formulario';
import { EXPLORADOR } from '@/content/i18n/inicio';
import { CARTAO_GLOBAL } from '@/content/i18n/paginas';
import type { CountryCode, Idioma } from '@/content/types';
import { track } from '@/lib/analytics/track';
import { ligacao } from '@/lib/i18n/rotas';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';
import { cn } from '@/lib/utils/cn';

/** Os três mercados de operação e, nas páginas iniciais, o nível global. */
type Filtro = CountryCode | 'global';

/**
 * Filtro por país em vez dos 15 setores em simultâneo (§7 do documento).
 *
 * `comGlobal` acrescenta o quarto filtro pedido para as páginas iniciais: os
 * dez mercados globais, cada um a ligar à sua página inglesa. Os setores dos
 * mercados de operação só têm página em português; em inglês a ligação é
 * marcada «(PT)», e o pedido de diagnóstico vai para o formulário inglês.
 */
export function SectorExplorer({
  initial = 'mz',
  idioma = 'pt',
  comGlobal = false,
}: {
  initial?: CountryCode;
  idioma?: Idioma;
  comGlobal?: boolean;
}) {
  const [active, setActive] = useState<Filtro>(initial);
  const grid = useRef<HTMLUListElement>(null);

  const { contextSafe } = useGSAP({ scope: grid });

  // Falso positivo do React Compiler. `contextSafe` é o padrão documentado do
  // @gsap/react: é chamado durante o render, mas o callback que devolve só
  // corre em resposta a um evento do utilizador — nunca durante o render. A
  // alternativa (guardar o handler num ref) capturaria estado obsoleto, o que
  // seria um bug a sério em troca de silenciar um aviso.
  // eslint-disable-next-line react-hooks/refs
  const select = contextSafe((code: Filtro) => {
    if (code === active) return;
    const cards = grid.current?.querySelectorAll('[data-sector-card]');
    const state = cards ? Flip.getState(cards) : null;
    setActive(code);
    // «global» não é um país: o esquema de eventos recusa-o, e não se inventa um evento para ele.
    if (code !== 'global') track({ name: 'country_selected', country: code, surface: 'sector-explorer' });

    requestAnimationFrame(() => {
      if (state) Flip.from(state, { duration: DUR.sm, ease: EASE.inOut, absolute: true, nested: true });
      gsap.fromTo(
        grid.current!.querySelectorAll('[data-sector-card]'),
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: DUR.sm, stagger: 0.04, ease: EASE.out },
      );
    });
  }) as (code: Filtro) => void;

  return (
    <div className="mt-14">
      {/*
        Isto NÃO é um tablist. Um `role="tab"` obriga a `aria-controls`, a um
        `tabpanel` associado e a navegação por setas — nada disso existia aqui,
        e o axe não o apanha porque cada papel é válido isoladamente. O que isto
        é mesmo: um grupo de botões de alternância. `aria-pressed` diz a verdade
        e funciona com o Tab, que é o que as pessoas usam.
      */}
      <div role="group" aria-label={t(EXPLORADOR.filtrar, idioma)} className="flex flex-wrap gap-2">
        {[...COUNTRY_CODES, ...(comGlobal ? (['global'] as const) : [])].map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={active === code}
            onClick={() => select(code)}
            className={cn(
              'min-h-11 rounded-full border px-5 text-[0.9375rem] transition-colors',
              active === code
                ? 'border-[color:var(--accent)] bg-[color:var(--color-signal-600)] text-white': 'border-[color:var(--border)] hover:border-[color:var(--accent)]',
            )}
          >
            {code === 'global'
              ? t(CARTAO_GLOBAL.nome, idioma)
              : idioma === 'pt'
                ? COUNTRIES[code].name
                : t(NOME_PAIS[code], idioma)}
          </button>
        ))}
      </div>

      <ul ref={grid} className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3">
        {active === 'global' &&
          GLOBAL_CODES.map((code) => (
            <li key={code} data-sector-card>
              <Link
                href={caminhoNoIdioma(`/global/${code}`, 'en')}
                hrefLang={idioma === 'en' ? undefined : 'en'}
                className="group flex h-full flex-col justify-between  border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-6 transition-colors hover:border-[color:var(--accent)]"
              >
                <h3 className="font-display text-[1.0625rem] font-semibold">{t(GLOBAL_MARKETS[code].name, idioma)}</h3>
                <span className="rule-label mt-8 inline-flex items-center gap-2 text-[color:var(--accent)]">
                  {t(EXPLORADOR.verMercado, idioma)}
                  <ArrowRight aria-hidden className="size-3.5 transition-transform duration-500 group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        {active !== 'global' && getSectorsForCountry(active).map((s) => {
          // O pedido de diagnóstico existe nos dois idiomas; a página de setor, só em português.
          const href = s.published ? s.href : ligacao('/diagnostico', idioma).href + s.href.slice('/diagnostico'.length);
          const soPortugues = idioma === 'en' && s.published;
          return (
          <li key={s.sector} data-sector-card>
            <Link
              href={href}
              hrefLang={soPortugues ? 'pt' : undefined}
              className="group flex h-full flex-col justify-between  border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-6 transition-colors hover:border-[color:var(--accent)]"
            >
              <div>
                <h3 className="font-display text-[1.0625rem] font-semibold">
                  {idioma === 'pt' ? s.label : t(ROTULO_SETOR[s.sector], idioma)}
                </h3>
                {!s.published && (
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    {t(EXPLORADOR.emPreparacao, idioma)}
                  </p>
                )}
              </div>
              <span className="rule-label mt-8 inline-flex items-center gap-2 text-[color:var(--accent)]">
                {t(s.published ? EXPLORADOR.verSolucao : EXPLORADOR.solicitar, idioma)}
                {soPortugues && <SoPortugues idioma={idioma} />}
                <ArrowRight aria-hidden className="size-3.5 transition-transform duration-500 group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
