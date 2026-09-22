import { Linkedin, Instagram, MessageCircle, Facebook, Youtube, type LucideIcon } from 'lucide-react';
import { SOCIAL } from '@/content/site';
import { cn } from '@/lib/utils/cn';
import type { SocialLink } from '@/content/types';

/**
 * Canais públicos, lidos de `SOCIAL`. Acrescentar uma rede é acrescentar uma
 * linha ao array — este componente não precisa de saber quais existem.
 *
 * Duas notas de acessibilidade, ambas vinculativas:
 *
 * 1. **O ícone nunca é o nome.** Um `<a>` com um SVG lá dentro e mais nada é
 *    anunciado como "link" e nada mais. Cada ligação carrega sempre o rótulo
 *    da rede em texto — visível na variante `list`, em `sr-only` na `row`.
 * 2. **Dizer que sai do site.** São ligações externas em janela nova; sem o
 *    aviso, quem usa leitor de ecrã perde o contexto ao mudar de separador.
 */

const ICONS: Record<SocialLink['id'], LucideIcon> = {
  linkedin: Linkedin,
  instagram: Instagram,
  whatsapp: MessageCircle,
  facebook: Facebook,
  youtube: Youtube,
  // Sem ícone dedicado na lucide: o balão serve de marcador neutro até haver um.
  x: MessageCircle,
  tiktok: MessageCircle,
};

export function SocialLinks({
  variant = 'row',
  className,
  items = SOCIAL,
}: {
  /** `row`: ícones lado a lado. `list`: uma linha por canal, com o handle. */
  variant?: 'row' | 'list';
  className?: string;
  items?: readonly SocialLink[];
}) {
  if (items.length === 0) return null;

  if (variant === 'list') {
    return (
      <ul className={cn('flex flex-col', className)}>
        {items.map((s) => {
          const Icon = ICONS[s.id];
          return (
            <li key={s.id}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-12 items-center gap-4 border-t border-dashed border-[color:var(--hairline)] py-3.5 transition-colors hover:border-[color:var(--accent)]"
              >
                <Icon aria-hidden className="size-4 shrink-0 text-[color:var(--muted)] transition-colors group-hover:text-[color:var(--on-surface)]" />
                <span className="rule-label text-[color:var(--muted)]">{s.label}</span>
                <span className="ml-auto text-sm text-[color:var(--on-surface)]">{s.handle}</span>
                <span aria-hidden className="text-[color:var(--muted)] transition-transform duration-300 group-hover:translate-x-0.5">
                  ↗
                </span>
                <span className="sr-only">(abre noutro separador)</span>
              </a>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className={cn('flex flex-wrap items-center gap-2', className)}>
      {items.map((s) => {
        const Icon = ICONS[s.id];
        return (
          <li key={s.id}>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              // 44px de alvo de toque: o mínimo para um dedo, não para um rato.
              className="inline-flex size-11 items-center justify-center border border-dashed border-[color:var(--hairline)] text-[color:var(--muted)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--on-surface)]"
            >
              <Icon aria-hidden className="size-[1.125rem]" />
              <span className="sr-only">{s.label} da AGORAMOZ (abre noutro separador)</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
