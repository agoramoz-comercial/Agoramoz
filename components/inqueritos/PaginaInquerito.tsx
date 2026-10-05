import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { ContourField } from '@/components/ui/ContourField';
import { INQ } from '@/content/i18n/inquerito';
import { t } from '@/lib/i18n/texto';
import type { SpecInquerito } from '@/lib/inqueritos/spec';
import { SurveyRenderer } from './SurveyRenderer';

/**
 * Casca da página de quem responde a um inquérito: um palco de ecrã inteiro
 * na superfície mais funda da marca, com grão e uma malha de contorno ténue —
 * e mais nada. Sem cabeçalho de marketing, sem GSAP nem Lenis: quem chega por
 * um link partilhado vem responder, e cada ligação a mais é uma saída. O
 * logótipo não é ligação pelo mesmo motivo.
 *
 * A malha é marcação gerada no servidor (zero pedidos) e fica parada: uma
 * textura a mexer atrás de uma pergunta distrai de a ler.
 *
 * Usada pelo layout de `/i` e pela pré-visualização de QA, para o QA ver
 * exactamente o que vai para produção.
 */
export function CascaInquerito({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-surface="deep"
      className="grain relative isolate flex min-h-dvh flex-col overflow-x-clip bg-[color:var(--surface)] text-[color:var(--on-surface)]"
    >
      <ContourField rows={12} drift={false} className="opacity-50" />
      <header className="relative z-10 mx-auto flex w-full max-w-3xl items-center px-4 pt-5 sm:px-6 sm:pt-6">
        <Logo href={null} />
      </header>
      <main
        id="conteudo"
        className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-6 pb-6 sm:px-6 sm:pt-10 sm:pb-10"
      >
        {children}
      </main>
    </div>
  );
}

/**
 * O inquérito aberto: o renderer (que desenha o único h1 da página — grande
 * nas boas-vindas, discreto nas perguntas) e a política de privacidade.
 */
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
    <div lang={spec.idioma} className="flex flex-1 flex-col">
      <SurveyRenderer modo="publico" spec={spec} inqueritoId={inqueritoId} token={token} />
      <p className="mt-8 text-[length:var(--text-micro)] text-[color:var(--muted)]">
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
