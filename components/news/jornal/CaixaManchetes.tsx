'use client';

import { Pause, Play } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Container } from '@/components/ui/Container';

/**
 * A faixa «Últimas» a correr, com um botão de pausa que fica (WCAG 2.2.2):
 * parar ao passar o rato não chega a quem usa toque, teclado de varrimento
 * ou ampliação. Com «reduzir movimento» a faixa já está parada (CSS) e o
 * botão não é preciso.
 */
export function CaixaManchetes({ idioma, children }: { idioma: 'pt' | 'en'; children: ReactNode }) {
  const [pausada, setPausada] = useState(false);
  return (
    <div
      className="jornal-manchetes-caixa bg-[color:var(--color-ink-950)] text-[color:var(--color-chalk)]"
      data-pausa={pausada ? 'sim' : 'nao'}
    >
      <Container className="flex items-stretch">
        {children}
        <button
          type="button"
          onClick={() => setPausada((p) => !p)}
          aria-pressed={pausada}
          aria-label={idioma === 'en' ? 'Pause the headlines' : 'Pausar as manchetes'}
          className="jornal-manchetes-pausa grid w-11 shrink-0 place-items-center border-l border-[color:var(--color-steel-700)] text-[color:var(--color-chalk)] hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
        >
          {pausada ? (
            <Play className="size-4" aria-hidden="true" />
          ) : (
            <Pause className="size-4" aria-hidden="true" />
          )}
        </button>
      </Container>
    </div>
  );
}
