import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CascaAdmin } from '@/components/admin/CascaAdmin';
import { MapaAeos } from '@/components/admin/aeos/MapaAeos';
import { LequeAeos } from '@/components/admin/aeos/LequeAeos';
import { mapaLeque } from '@/lib/admin/aeos-mapa';
import { perguntarQa, decidirQa } from './acoes';
import { ACCOES_QA } from '@/lib/admin/aeos-qa-dados';

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
        <LequeAeos
          mapa={mapaLeque({ inqueritos: true, news: true, energia: tudo, direcao: tudo, admin: tudo }, ACCOES_QA)}
          accoes={ACCOES_QA}
          podeDecidir={tudo}
          podePerguntar
          perguntar={perguntarQa}
          decidir={decidirQa}
        />
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
