'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Mark } from '@/components/brand/Mark';
import { LiquidGlass, LiquidGlassButton } from '@/components/ui/apple-tahoe-liquid-glass-button';
import type { Lingua } from '@/content/types';
import { LINGUAS } from '@/lib/i18n/texto';
import { INICIO_DA_LINGUA, NOME_DA_LINGUA } from '@/lib/i18n/v3';
import { cn } from '@/lib/utils/cn';

export type LigacaoNav = { rotulo: string; href: string; hrefLang?: string };

/**
 * Navegação da v3: a pílula escura pendurada no topo (como no Helious), com a
 * marca à esquerda e a língua + diagnóstico à direita. No telemóvel, um botão
 * abre o menu em ecrã inteiro. Ganha fundo quando a página rola.
 */
export function NavV3({
  lingua,
  ligacoes,
  diagnostico,
  rotulos,
}: {
  lingua: Lingua;
  ligacoes: LigacaoNav[];
  diagnostico: LigacaoNav;
  rotulos: { menu: string; fechar: string; lingua: string; inicio: string };
}) {
  const [aberto, setAberto] = useState(false);
  const [linguasAbertas, setLinguasAbertas] = useState(false);
  const [rolou, setRolou] = useState(false);
  const idMenu = useId();
  const idLinguas = useId();
  const caixaLinguas = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setRolou(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!aberto && !linguasAbertas) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAberto(false);
        setLinguasAbertas(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (linguasAbertas && caixaLinguas.current && !caixaLinguas.current.contains(e.target as Node)) {
        setLinguasAbertas(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    document.documentElement.style.overflow = aberto ? 'hidden' : '';
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
      document.documentElement.style.overflow = '';
    };
  }, [aberto, linguasAbertas]);

  const Linguas = ({ grande = false }: { grande?: boolean }) => (
    <ul className={cn(grande ? 'grid grid-cols-3 gap-2' : 'grid gap-0.5 p-1.5')}>
      {LINGUAS.map((l) => (
        <li key={l}>
          <Link
            href={INICIO_DA_LINGUA[l]}
            hrefLang={NOME_DA_LINGUA[l].hreflang}
            lang={NOME_DA_LINGUA[l].hreflang}
            aria-current={l === lingua ? 'true' : undefined}
            onClick={() => {
              setLinguasAbertas(false);
              setAberto(false);
            }}
            className={cn(
              'flex items-center justify-between gap-6 rounded-xl px-3 py-2 text-sm transition-colors',
              l === lingua ? 'bg-[var(--v3-papel)] text-[var(--v3-noite)]' : 'hover:bg-white/10',
              grande && 'justify-center border border-[var(--v3-linha)] py-3',
            )}
          >
            <span>{NOME_DA_LINGUA[l].nome}</span>
            {!grande && <span className="text-[0.7rem] opacity-60">{NOME_DA_LINGUA[l].curto}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[90]">
      <div className="mx-auto flex max-w-[110rem] items-start justify-between gap-4 px-4 sm:px-6">
        <Link
          href={INICIO_DA_LINGUA[lingua]}
          aria-label={rotulos.inicio}
          className={cn(
            'pointer-events-auto mt-3 inline-flex items-center gap-2.5 rounded-full px-3 py-2 transition-colors duration-500',
            rolou && 'bg-[var(--v3-noite)]/70 backdrop-blur-md',
          )}
        >
          <Mark className="h-5 w-auto" />
          <span className="text-[0.95rem] font-semibold tracking-[0.04em]">AGORAMOZ</span>
        </Link>

        {/* A pílula pendurada no topo (só a partir de 1024 px). */}
        <LiquidGlass
          asChild
          material="regular"
          appearance="dark"
          refraction={12}
          className="pointer-events-auto hidden rounded-t-none rounded-b-[1.25rem] bg-[var(--v3-noite)]/70 px-3 text-[var(--v3-papel)] lg:block"
        >
        <nav aria-label={rotulos.menu}>
          <ul className="flex items-center">
            {ligacoes.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  hrefLang={l.hrefLang}
                  className="group relative block px-5 py-3.5 text-[0.82rem] text-[var(--v3-papel)]/85 transition-colors hover:text-[var(--v3-papel)]"
                >
                  {l.rotulo}
                  <span
                    aria-hidden
                    className="absolute inset-x-5 bottom-2.5 h-px origin-left scale-x-0 bg-current transition-transform duration-500 group-hover:scale-x-100 rtl:origin-right"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        </LiquidGlass>

        <div className="pointer-events-auto mt-3 flex items-center gap-2">
          <div ref={caixaLinguas} className="relative">
            <LiquidGlassButton
              type="button"
              interactive
              material="regular"
              appearance="dark"
              refraction={6}
              size="sm"
              aria-expanded={linguasAbertas}
              aria-controls={idLinguas}
              aria-label={`${rotulos.lingua}: ${NOME_DA_LINGUA[lingua].nome}`}
              onClick={() => setLinguasAbertas((v) => !v)}
              className="h-10 gap-1.5 bg-[var(--v3-noite)]/60! px-3.5 text-xs text-[var(--v3-papel)]"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.3">
                <circle cx="8" cy="8" r="6.5" />
                <path d="M1.5 8h13M8 1.5c2 2 2.8 4.2 2.8 6.5S10 12.5 8 14.5M8 1.5C6 3.5 5.2 5.7 5.2 8S6 12.5 8 14.5" />
              </svg>
              {NOME_DA_LINGUA[lingua].curto}
            </LiquidGlassButton>
            <div
              id={idLinguas}
              hidden={!linguasAbertas}
              className="absolute end-0 top-12 w-52 rounded-2xl border border-[var(--v3-linha)] bg-[var(--v3-noite-2)] shadow-2xl"
            >
              <Linguas />
            </div>
          </div>

          <LiquidGlassButton
            asChild
            interactive
            material="regular"
            appearance="light"
            tint="#efe8da"
            refraction={6}
            size="sm"
            className="hidden h-10 bg-[var(--v3-papel)]/80! px-4 text-[0.82rem] font-medium tracking-normal text-[var(--v3-noite)] sm:inline-flex"
          >
            <Link href={diagnostico.href} hrefLang={diagnostico.hrefLang}>
              {diagnostico.rotulo}
            </Link>
          </LiquidGlassButton>

          <LiquidGlassButton
            type="button"
            interactive
            material="regular"
            appearance="dark"
            refraction={6}
            size="sm"
            aria-expanded={aberto}
            aria-controls={idMenu}
            onClick={() => setAberto((v) => !v)}
            className="h-10 bg-[var(--v3-noite)]/60! px-4 text-[0.82rem] font-medium tracking-normal text-[var(--v3-papel)] lg:hidden"
          >
            {aberto ? rotulos.fechar : rotulos.menu}
          </LiquidGlassButton>
        </div>
      </div>

      {/* Menu do telemóvel, em ecrã inteiro. */}
      <div
        id={idMenu}
        hidden={!aberto}
        className="pointer-events-auto fixed inset-0 top-0 -z-10 overflow-y-auto bg-[var(--v3-noite)] px-6 pt-24 pb-10 lg:hidden"
      >
        <nav aria-label={rotulos.menu}>
          <ul className="border-t border-[var(--v3-linha)]">
            {[...ligacoes, diagnostico].map((l) => (
              <li key={l.href} className="border-b border-[var(--v3-linha)]">
                <Link
                  href={l.href}
                  hrefLang={l.hrefLang}
                  onClick={() => setAberto(false)}
                  className="block py-4 text-3xl font-medium tracking-[-0.03em]"
                >
                  {l.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="v3-etiqueta mt-10 mb-3 text-[var(--v3-cinza)]">{rotulos.lingua}</p>
        <Linguas grande />
      </div>
    </header>
  );
}
