import type { Metadata } from 'next';

/**
 * Casca mínima do `/admin`.
 *
 * Aqui não há nada do site público: nem GSAP, nem Lenis, nem cursor
 * personalizado, nem transição de página. Numa tabela de leads, scroll suave e
 * uma animação a cada clique são o contrário de uma ferramenta de trabalho.
 * Isto só é possível porque a casca de marketing passou para
 * `app/(site)/layout.tsx` — ver `components/layout/SiteChrome.tsx`.
 *
 * `force-dynamic` porque tudo aqui depende da sessão de quem pede. Pré-gerar
 * um ecrã administrativo seria servir a uma pessoa o que se calculou para
 * outra.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Administração', template: '%s · Administração' },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-surface="light"
      className="min-h-screen bg-[color:var(--surface)] text-[color:var(--on-surface)]"
    >
      {children}
    </div>
  );
}
