import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { INQ } from '@/content/i18n/inquerito';
import { t } from '@/lib/i18n/texto';
import type { SpecInquerito } from '@/lib/inqueritos/spec';
import { SurveyRenderer } from './SurveyRenderer';

/**
 * Casca da página de quem responde a um inquérito: a marca e o formulário,
 * mais nada. Sem cabeçalho de marketing, sem GSAP nem Lenis — quem chega por
 * um link partilhado vem responder, e cada ligação a mais é uma saída. O
 * logótipo não é ligação pelo mesmo motivo.
 *
 * Usada pelo layout de `/i` e pela pré-visualização de QA, para o QA ver
 * exactamente o que vai para produção.
 */
export function CascaInquerito({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-surface="deep"
      className="min-h-dvh bg-[color:var(--surface)] text-[color:var(--on-surface)]"
    >
      <header className="mx-auto flex w-full max-w-2xl items-center px-4 pt-6 sm:px-6">
        <Logo href={null} />
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-2xl px-4 pt-10 pb-16 sm:px-6">
        {children}
      </main>
    </div>
  );
}

/** O inquérito aberto: título, formulário e a ligação à política de privacidade. */
export function PaginaInquerito({
  spec,
  inqueritoId,
  token,
}: {
  spec: SpecInquerito;
  inqueritoId: string;
  token: string;
}) {
  return (
    <div lang={spec.idioma}>
      <h1 className="mb-8 max-w-[24ch] text-[length:var(--text-h2)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)] text-balance">
        {spec.boasVindas.titulo}
      </h1>
      <SurveyRenderer modo="publico" spec={spec} inqueritoId={inqueritoId} token={token} />
      <p className="mt-10 text-[length:var(--text-micro)] text-[color:var(--muted)]">
        <Link
          href="/privacidade"
          hrefLang="pt"
          className="underline underline-offset-4 hover:text-[color:var(--on-surface)]"
        >
          {t(INQ.privacidade, spec.idioma)}
        </Link>
      </p>
    </div>
  );
}
