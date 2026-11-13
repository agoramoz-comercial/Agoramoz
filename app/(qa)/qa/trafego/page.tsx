import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CascaAdmin } from '@/components/admin/CascaAdmin';
import { AdminHeading } from '@/components/admin/primitives';
import { PainelTrafego } from '@/components/admin/trafego/PainelTrafego';
import { resumir, type LinhaEvento } from '@/lib/admin/trafego';

/**
 * Pré-visualização do painel de tráfego para o QA visual, sem sessão nem
 * base. Só com `ADMIN_PREVIEW=on` e fora da Vercel. TODOS OS NÚMEROS SÃO DE
 * EXEMPLO, gerados de forma determinística, e a página di-lo no topo.
 */

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Pré-visualização do tráfego', robots: { index: false, follow: false, nocache: true } };

const AGORA = Date.parse('2026-11-13T12:00:00Z');
const PAGINAS = ['/', '/civico', '/diagnostico', '/solucoes', '/news', '/sobre', '/contactos', '/faq', '/mz', '/privacidade'];
const CANAIS = ['organico', 'directo', 'social', 'referencia', 'campanha', 'gbp'];
const REFS = ['www.google.com', 'www.facebook.com', 'www.linkedin.com', null, null];

function exemplo(): LinhaEvento[] {
  const linhas: LinhaEvento[] = [];
  for (let v = 0; v < 140; v += 1) {
    const visita = `exemplo${String(v).padStart(4, '0')}`;
    let t = AGORA - ((v * 7919) % (7 * 24 * 60)) * 60_000;
    const canal = CANAIS[v % CANAIS.length]!;
    const n = 1 + (v % 4);
    for (let i = 0; i < n; i += 1) {
      const path = PAGINAS[(v * 3 + i * 5) % 8]!;
      const props = {
        visita,
        ecra: v % 3 ? 'telemovel' : 'computador',
        pais: v % 5 ? 'MZ' : 'PT',
        ref: i === 0 ? REFS[v % REFS.length] : null,
      };
      linhas.push({
        name: 'page_view',
        occurred_at: new Date(t).toISOString(),
        channel: canal,
        campaign: canal === 'campanha' ? 'exemplo-lancamento' : null,
        path,
        props,
      });
      linhas.push({
        name: 'page_engagement',
        occurred_at: new Date(t + 30_000).toISOString(),
        channel: canal,
        campaign: null,
        path,
        props: { visita, ms: 4_000 + ((v * 911) % 90_000), scroll: (v * 37) % 101 },
      });
      t += 90_000;
    }
    if (v % 9 === 0)
      linhas.push({
        name: 'diagnostic_submitted',
        occurred_at: new Date(t).toISOString(),
        channel: canal,
        campaign: null,
        path: '/diagnostico',
        props: { visita },
      });
  }
  return linhas;
}

export default function PreVisualizacaoTrafego() {
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV === 'production') notFound();
  return (
    <div data-surface="light" className="min-h-screen bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <p role="note" className="bg-[color:var(--on-surface)] px-4 py-2 text-center text-xs text-[color:var(--surface)]">
        Pré-visualização de QA — todos os números são de exemplo.
      </p>
      <CascaAdmin sessao={{ nome: 'Pré-visualização', email: 'qa@exemplo.test', papel: 'admin' }} inqueritos news>
        <AdminHeading titulo="Tráfego" />
        <PainelTrafego resumo={resumir(exemplo(), [...PAGINAS, '/global'], new Date(AGORA))} periodo={7} truncado={false} />
      </CascaAdmin>
    </div>
  );
}
