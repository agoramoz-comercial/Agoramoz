'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

/**
 * Uma falha num ecrã do painel fica DENTRO do painel (a casca e a navegação
 * continuam). Antes caía no ecrã global, que apaga tudo e não diz o que pode
 * ter ficado por gravar. A «Referência» é o digest que `instrumentation.ts`
 * escreve no log (`servidor.erro`), para se encontrar a causa.
 */
export default function ErroDoPainel({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section role="alert" className="max-w-[40rem] py-8">
      <h1 className="text-[length:var(--text-h3)] tracking-[-0.02em]">
        Não foi possível concluir a acção.
      </h1>
      <p className="mt-3 text-sm text-[color:var(--muted)]">
        A falha foi do nosso lado. Alterações que ainda não estavam guardadas podem não ter sido
        gravadas: volte ao ecrã anterior e confirme antes de repetir.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" size="sm" onClick={reset}>
          Tentar de novo
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/inqueritos">Ir para os inquéritos</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin">Ir para o painel</Link>
        </Button>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-[color:var(--muted)]">
          Referência: <span className="font-techno tabular-nums">{error.digest}</span>
        </p>
      )}
    </section>
  );
}
