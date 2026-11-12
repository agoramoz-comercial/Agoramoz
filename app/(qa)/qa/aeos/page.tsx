import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CascaAdmin } from '@/components/admin/CascaAdmin';
import { MapaAeos } from '@/components/admin/aeos/MapaAeos';

/**
 * Pré-visualização do mapa AEOS para o QA visual (Playwright + axe), sem
 * sessão nem base. Só existe com `ADMIN_PREVIEW=on` e fora da Vercel.
 * `?papel=colaborador` mostra o mapa sem módulos nem papel de administrador.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pré-visualização do mapa AEOS',
  robots: { index: false, follow: false, nocache: true },
};

export default async function PreVisualizacaoAeos({ searchParams }: { searchParams: Promise<{ papel?: string }> }) {
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV === 'production') notFound();
  const { papel } = await searchParams;
  const tudo = papel !== 'colaborador';
  return (
    <div data-surface="light" className="min-h-screen bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <p role="note" className="bg-[color:var(--on-surface)] px-4 py-2 text-center text-xs text-[color:var(--surface)]">
        Pré-visualização de QA — sem sessão nem base.
      </p>
      <CascaAdmin
        sessao={{
          nome: 'Pré-visualização',
          email: 'qa@exemplo.test',
          papel: tudo ? 'admin' : 'comercial',
        }}
        inqueritos
        news
        energia={tudo}
        direcao={tudo}
      >
        <MapaAeos
          permite={{
            inqueritos: true,
            news: true,
            energia: tudo,
            direcao: tudo,
            admin: tudo,
          }}
        />
      </CascaAdmin>
    </div>
  );
}
