'use client';

import { INQ } from '@/content/i18n/inquerito';
import type { Idioma } from '@/content/types';
import { t } from '@/lib/i18n/texto';
import { cn } from '@/lib/utils/cn';

/**
 * Progresso do inquérito: «03 / 10 · ~2 min» e uma régua segmentada.
 *
 * Até 12 cartões, cada segmento é um botão: os já vistos levam de volta à
 * pergunta (quem os toca vê onde está); os da frente ficam fechados, para
 * nenhuma obrigatória ficar por ver. Acima de 12, a 390 px cada segmento
 * ficaria abaixo do alvo de toque de 24 px — passa a uma barra contínua só
 * visual. Para leitores de ecrã, o passo vai dentro do título do cartão, que é
 * o que recebe o foco.
 */

const MAX_CLICAVEIS = 12;

const dois = (n: number) => String(n).padStart(2, '0');

export function Progresso({
  total,
  indice,
  maisAvancado,
  titulos,
  minutos,
  idioma,
  onIr,
}: {
  total: number;
  indice: number;
  maisAvancado: number;
  titulos: readonly string[];
  minutos: number;
  idioma: Idioma;
  onIr: (i: number) => void;
}) {
  return (
    <div>
      <div aria-hidden className="flex items-baseline justify-between gap-4">
        <p className="font-techno text-[length:var(--text-micro)] font-medium tracking-[var(--tracking-techno)] text-[color:var(--muted)] tabular-nums">
          <span className="text-[color:var(--on-surface)]">{dois(indice + 1)}</span> / {dois(total)}
        </p>
        <p className="font-techno text-[length:var(--text-micro)] tracking-[var(--tracking-techno)] text-[color:var(--muted)] uppercase">
          {t(INQ.minutos, idioma).replace('{min}', String(minutos))}
        </p>
      </div>

      {total <= MAX_CLICAVEIS ? (
        <nav aria-label={t(INQ.progresso, idioma)} className="mt-2">
          <ol
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: total }, (_, i) => (
              <li key={i}>
                <button
                  type="button"
                  disabled={i === indice || i > maisAvancado}
                  aria-current={i === indice ? 'step' : undefined}
                  aria-label={t(INQ.irPara, idioma)
                    .replace('{n}', String(i + 1))
                    .replace('{titulo}', titulos[i] ?? '')}
                  onClick={() => onIr(i)}
                  className="flex h-6 w-full items-center disabled:cursor-default"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'h-1 w-full motion-safe:transition-colors motion-safe:duration-300',
                      i === indice
                        ? 'bg-[color:var(--color-signal-600)]'
                        : i < indice
                          ? 'bg-[color:var(--on-surface)]'
                          : i <= maisAvancado
                            ? 'bg-[color:var(--muted)]'
                            : 'bg-[color:var(--border)]',
                    )}
                  />
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : (
        <div aria-hidden className="mt-2 flex h-6 items-center">
          <div className="h-1 w-full bg-[color:var(--border)]">
            <div
              className="h-1 bg-[color:var(--color-signal-600)] motion-safe:transition-[width] motion-safe:duration-300"
              style={{ width: `${Math.round(((indice + 1) / total) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
