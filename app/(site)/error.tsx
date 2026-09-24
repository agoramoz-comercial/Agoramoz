'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { SITE } from '@/content/site';

/**
 * Um erro de render mostrava a página por omissão do Next: sem estilo, em
 * inglês e fora da marca. Num site que vende engenharia, é o pior sítio
 * possível para se parecer amador.
 *
 * Dá sempre duas saídas — voltar e falar com alguém — porque `reset()` só
 * ajuda se a falha for transitória.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[render]', error);
  }, [error]);

  return (
    <Section surface="deep" contour>
      <div className="mx-auto max-w-[40rem] py-16 text-center">
        <Eyebrow>Erro inesperado</Eyebrow>
        <h1 className="mt-5 text-[length:var(--text-h1)]">Alguma coisa falhou deste lado.</h1>
        <p className="mt-5 text-[length:var(--text-lead)] text-[color:var(--muted)]">
          Não é culpa sua. Pode tentar de novo — se voltar a acontecer, escreva-nos e resolvemos
          pelo caminho mais curto.
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Button type="button" size="lg" onClick={reset}>
            Tentar de novo
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Voltar ao início</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={`https://wa.me/${SITE.whatsapp.e164}`} target="_blank" rel="noopener noreferrer">
              WhatsApp {SITE.whatsapp.display}
            </a>
          </Button>
        </div>

        {error.digest && (
          <p className="rule-label mt-8 text-[color:var(--muted)]">
            Referência do erro: {error.digest}
          </p>
        )}
      </div>
    </Section>
  );
}
