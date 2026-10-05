'use client';

import { useId, useRef } from 'react';
import { Check } from 'lucide-react';
import { INQ } from '@/content/i18n/inquerito';
import type { Idioma } from '@/content/types';
import { t } from '@/lib/i18n/texto';
import { letraDe } from '@/lib/inqueritos/teclas';
import { cn } from '@/lib/utils/cn';

/**
 * As entradas de escolha do inquérito: opções com tecla (A, B, C…) e a escala
 * numérica (avaliação 1–5, NPS 0–10).
 *
 * A letra é só visual (`aria-hidden`): o nome acessível de cada opção é o
 * rótulo, tal e qual. Os atalhos de letra e dígito vivem no formulário
 * (`lib/inqueritos/teclas.ts`); aqui ficam as setas, como em qualquer
 * radiogroup. O estado escolhido usa o sinal — a única cor que a marca
 * reserva para o estado activo.
 */

type Opcao = { readonly chave: string; readonly rotulo: string };

const SETAS = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];

function destinoDaSeta(tecla: string, i: number, n: number, circular: boolean): number {
  if (tecla === 'Home') return 0;
  if (tecla === 'End') return n - 1;
  const passo = tecla === 'ArrowRight' || tecla === 'ArrowDown' ? 1 : -1;
  return circular ? (i + passo + n) % n : Math.min(n - 1, Math.max(0, i + passo));
}

const MARCADA =
  'border-[color:var(--color-signal-600)] bg-[color:var(--color-signal-600)] text-white';
const LIVRE =
  'border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--on-surface)]';

function Tecla({ letra, marcada }: { letra: string; marcada: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-7 shrink-0 place-items-center border font-techno text-xs font-semibold transition-colors duration-300',
        marcada
          ? 'border-white/70 text-white'
          : 'border-[color:var(--border)] text-[color:var(--accent)]',
      )}
    >
      {letra}
    </span>
  );
}

function colunas(n: number) {
  return n > 6 ? 'grid gap-2 sm:grid-cols-2' : 'grid max-w-xl gap-2';
}

export function EscolhaUnica({
  opcoes,
  valor,
  tituloId,
  descritores,
  obrigatoria,
  invalida,
  onMudar,
  onEscolher,
}: {
  opcoes: readonly Opcao[];
  valor: string | null;
  tituloId: string;
  descritores: string | undefined;
  obrigatoria: boolean;
  invalida: boolean;
  onMudar: (v: string) => void;
  onEscolher: (v: string) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const ativo = Math.max(0, opcoes.findIndex((o) => o.chave === valor));

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    if (!SETAS.includes(e.key)) return;
    e.preventDefault();
    const j = destinoDaSeta(e.key, i, opcoes.length, true);
    refs.current[j]?.focus();
    // As setas só percorrem: escolher é o clique, o Enter, o Espaço ou a letra.
    onMudar(opcoes[j]!.chave);
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={tituloId}
      aria-describedby={descritores}
      aria-required={obrigatoria || undefined}
      aria-invalid={invalida || undefined}
      className={colunas(opcoes.length)}
    >
      {opcoes.map((o, i) => {
        const marcada = o.chave === valor;
        return (
          <button
            key={o.chave}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={marcada}
            tabIndex={i === ativo ? 0 : -1}
            onClick={() => {
              onMudar(o.chave);
              onEscolher(o.chave);
            }}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'flex min-h-12 w-full items-center gap-3 border px-3 py-2.5 text-left text-[0.9375rem] transition-colors duration-300',
              marcada ? MARCADA : LIVRE,
            )}
          >
            <Tecla letra={letraDe(i)} marcada={marcada} />
            <span className="min-w-0 flex-1 font-medium">{o.rotulo}</span>
            <Check
              aria-hidden
              className={cn('size-4 shrink-0', marcada ? 'opacity-100' : 'opacity-0')}
            />
          </button>
        );
      })}
    </div>
  );
}

export function EscolhaMultipla({
  titulo,
  opcoes,
  escolhidas,
  descritores,
  onMudar,
}: {
  titulo: string;
  opcoes: readonly Opcao[];
  escolhidas: readonly string[];
  descritores: string | undefined;
  onMudar: (v: string[]) => void;
}) {
  return (
    <fieldset className="min-w-0 border-0 p-0" aria-describedby={descritores}>
      <legend className="sr-only">{titulo}</legend>
      <div className={colunas(opcoes.length)}>
        {opcoes.map((o, i) => {
          const marcada = escolhidas.includes(o.chave);
          return (
            <label
              key={o.chave}
              className={cn(
                'flex min-h-12 cursor-pointer items-center gap-3 border px-3 py-2.5 text-[0.9375rem] transition-colors duration-300',
                marcada ? MARCADA : LIVRE,
              )}
            >
              <Tecla letra={letraDe(i)} marcada={marcada} />
              <span className="min-w-0 flex-1 font-medium">{o.rotulo}</span>
              <input
                type="checkbox"
                checked={marcada}
                onChange={(e) =>
                  onMudar(
                    e.target.checked
                      ? [...escolhidas, o.chave]
                      : escolhidas.filter((k) => k !== o.chave),
                  )
                }
                className="size-4 shrink-0 accent-[color:var(--color-ink-900)]"
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Escala numérica num radiogroup com roving tabindex. O NPS tem onze valores:
 * num telemóvel partem-se em 6 + 5 (células de 48 px, alvo de toque folgado);
 * a partir de `sm` ficam numa só linha, como se lê uma régua.
 */
export function Escala({
  obrigatoria,
  invalida,
  de,
  ate,
  valor,
  idioma,
  tituloId,
  descritores,
  extremos,
  onMudar,
  onEscolher,
}: {
  obrigatoria: boolean;
  invalida: boolean;
  de: number;
  ate: number;
  valor: number | null;
  idioma: Idioma;
  tituloId: string;
  descritores: string | undefined;
  extremos: readonly [string, string];
  onMudar: (v: number) => void;
  onEscolher: (v: number) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const valores = Array.from({ length: ate - de + 1 }, (_, i) => de + i);
  const ativo = Math.max(0, valor === null ? 0 : valores.indexOf(valor));
  const extremosId = useId();
  const nps = valores.length === 11;

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    if (!SETAS.includes(e.key)) return;
    e.preventDefault();
    const j = destinoDaSeta(e.key, i, valores.length, false);
    refs.current[j]?.focus();
    onMudar(valores[j]!);
  }

  return (
    <div className={nps ? undefined : 'max-w-md'}>
      <div
        role="radiogroup"
        aria-required={obrigatoria || undefined}
        aria-invalid={invalida || undefined}
        aria-labelledby={tituloId}
        aria-describedby={[extremosId, descritores].filter(Boolean).join(' ')}
        className={cn('grid gap-1.5', nps ? 'grid-cols-6 sm:grid-cols-11' : 'grid-cols-5')}
      >
        {valores.map((v, i) => {
          const marcado = v === valor;
          return (
            <button
              key={v}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={marcado}
              aria-label={t(INQ.deEscala, idioma)
                .replace('{n}', String(v))
                .replace('{max}', String(ate))}
              tabIndex={i === ativo ? 0 : -1}
              onClick={() => {
                onMudar(v);
                onEscolher(v);
              }}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'grid min-h-12 place-items-center border font-techno text-lg font-semibold tabular-nums transition-colors duration-300',
                marcado ? MARCADA : LIVRE,
              )}
            >
              {v}
            </button>
          );
        })}
      </div>
      <p
        id={extremosId}
        className="mt-3 flex justify-between gap-4 text-[length:var(--text-micro)] text-[color:var(--muted)]"
      >
        <span>{extremos[0]}</span>
        <span className="text-right">{extremos[1]}</span>
      </p>
    </div>
  );
}
