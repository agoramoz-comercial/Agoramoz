'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { FORM } from '@/content/i18n/formulario';
import type { Idioma } from '@/content/types';
import { t } from '@/lib/i18n/texto';

/**
 * O carrossel do diagnóstico dentro da secção da página inicial.
 *
 * Carregado só quando a secção se aproxima do ecrã: a página inicial é a
 * mais visitada e o formulário (react-hook-form, zod, o mercado de treze
 * países) não tem de pesar a quem nunca chega lá abaixo. Até lá, uma moldura
 * com a mesma altura mínima — nada salta quando ele aparece.
 */
const Formulario = dynamic(() => import('./DiagnosticForm').then((m) => m.DiagnosticForm), {
  ssr: false,
  loading: () => null,
});

export function DiagnosticoEmbutido({ idioma }: { idioma: Idioma }) {
  const [visivel, setVisivel] = useState(false);
  const moldura = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = moldura.current;
    if (!el) return;
    // IntersectionObserver é Baseline desde 2019 — todos os browsers que o
    // site suporta o têm, e a moldura continua visível enquanto espera.
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisivel(true);
          observador.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const espera = (
    <div className="grid min-h-[30rem] place-items-center border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-6">
      <p className="text-sm text-[color:var(--muted)]">{t(FORM.carregando, idioma)}</p>
    </div>
  );

  return (
    <div ref={moldura} className="min-h-[30rem]">
      {visivel ? (
        <Suspense fallback={espera}>
          <Formulario idioma={idioma} nivelTitulo="h3" />
        </Suspense>
      ) : (
        espera
      )}
    </div>
  );
}
