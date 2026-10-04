import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CascaAdmin } from '@/components/admin/CascaAdmin';
import { PainelComando } from '@/components/admin/painel/PainelComando';
import { FASES_OPORTUNIDADE } from '@/lib/admin/labels';
import { lerPeriodo, type Periodo } from '@/lib/admin/painel';
import type { DadosPainel } from '@/lib/admin/painel-dados';
import { CANAIS } from '@/lib/attribution/types';
import { CARTOES } from '@/lib/forms/lead-schema';
import { PRIORIDADES } from '@/lib/news/esquema';

/**
 * Pré-visualização do painel para o QA visual (Playwright + axe), sem sessão
 * nem base. Só existe com `ADMIN_PREVIEW=on`, que não está definido na Vercel:
 * em produção esta rota é 404.
 *
 * TODOS OS NÚMEROS AQUI SÃO DE EXEMPLO e a página di-lo no topo. `?variante=
 * por-activar` mostra os blocos sem fonte ligada; `?variante=erro`, a falhar.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pré-visualização do painel',
  robots: { index: false, follow: false, nocache: true },
};

const INICIO = '2026-09-01T00:00:00.000Z';

/** Série determinística: sem aleatoriedade, a captura é sempre a mesma. */
function serie(n: number, fase: number): number[] {
  return Array.from({ length: n }, (_, i) =>
    Math.max(0, Math.round(4 + 3 * Math.sin((i + fase) / 3) + (i % 7 === 2 ? 3 : 0))),
  );
}

function exemplo(periodo: Periodo): DadosPainel {
  const s = serie(periodo, 0);
  const a = serie(periodo, 4);
  const soma = (x: number[]) => x.reduce((p, q) => p + q, 0);
  const fases = [9, 6, 4, 3, 2, 5];
  return {
    periodo,
    inicio: INICIO,
    leads: {
      estado: 'ok',
      dados: { actual: soma(s), anterior: soma(a), serie: s, serieAnterior: a },
    },
    qualidade: { estado: 'ok', dados: { ab: 21, total: 58, abAnterior: 15, totalAnterior: 49 } },
    crm: {
      estado: 'ok',
      dados: {
        porFase: FASES_OPORTUNIDADE.map((chave, i) => ({ chave, valor: fases[i]! })),
        ganhos: 2,
        ganhosAnterior: 1,
      },
    },
    funil: {
      estado: 'ok',
      dados: {
        etapas: [
          { chave: 'iniciados', valor: 240 },
          { chave: 'submetidos', valor: 96 },
          { chave: 'oportunidades', valor: 31 },
          { chave: 'reunioes', valor: 12 },
          { chave: 'ganhos', valor: 2 },
        ],
      },
    },
    cartoes: {
      estado: 'ok',
      dados: {
        vistos: CARTOES.map((chave, i) => ({ chave, valor: 240 - i * 17 })),
        concluidos: CARTOES.map((chave, i) => ({
          chave,
          valor: 230 - i * 18 - (chave === 'faixa' ? 20 : 0),
        })),
      },
    },
    canais: {
      estado: 'ok',
      dados: CANAIS.map((chave, i) => ({ chave, valor: [22, 31, 9, 6, 4, 14, 10][i] ?? 0 })),
    },
    reunioes: {
      estado: 'ok',
      dados: {
        marcadas: 12,
        marcadasAnterior: 8,
        realizadas: 7,
        proximas: [
          { inicio: '2026-10-02T08:00:00.000Z', tipo: 'conversa-30', dealId: null },
          { inicio: '2026-10-03T13:30:00.000Z', tipo: 'conversa-30', dealId: null },
        ],
      },
    },
    news: {
      estado: 'ok',
      dados: {
        analisadas: 37,
        anterior: 41,
        falhadas: 1,
        porPrioridade: PRIORIDADES.map((chave, i) => ({ chave, valor: [3, 9, 17, 8][i] ?? 0 })),
      },
    },
    operacao: { estado: 'ok', dados: { porRever: 4, fila: 1, semSaida: 0 } },
    recentes: {
      estado: 'ok',
      dados: [
        {
          id: 'exemplo-1',
          submitted_at: '2026-09-29T10:12:00.000Z',
          contacts: { name: 'Exemplo A', email: 'exemplo-a@exemplo.test' },
          diagnostics: [{ id: 'exemplo-d1', state: 'pending_review', score: 78, tier: 'A' }],
        },
        {
          id: 'exemplo-2',
          submitted_at: '2026-09-28T16:40:00.000Z',
          contacts: { name: 'Exemplo B', email: 'exemplo-b@exemplo.test' },
          diagnostics: [{ id: 'exemplo-d2', state: 'approved', score: 55, tier: 'C' }],
        },
      ],
    },
    inqueritos: { estado: 'ok', dados: { respostas: 18, anterior: 11, comContacto: 5 } },
    erp: { estado: 'por-ligar' },
  };
}

function comVariante(d: DadosPainel, variante: string | undefined): DadosPainel {
  if (variante === 'por-activar') {
    const passo = 'Passo de activação (exemplo).';
    return {
      ...d,
      funil: { estado: 'por-activar', passo },
      cartoes: { estado: 'por-activar', passo },
      reunioes: { estado: 'por-activar', passo },
      news: { estado: 'por-activar', passo },
    };
  }
  if (variante === 'erro')
    return {
      ...d,
      leads: { estado: 'erro' },
      crm: { estado: 'erro' },
      recentes: { estado: 'erro' },
    };
  return d;
}

export default async function PreVisualizacaoPainel({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; variante?: string }>;
}) {
  // Duas chaves: a variável ligada E não estar em produção na Vercel. Pôr
  // ADMIN_PREVIEW=on lá por engano não abre a rota.
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV === 'production') notFound();
  const { periodo, variante } = await searchParams;
  return (
    <div
      data-surface="light"
      className="min-h-screen bg-[color:var(--surface)] text-[color:var(--on-surface)]"
    >
      <p
        role="note"
        className="bg-[color:var(--on-surface)] px-4 py-2 text-center text-xs text-[color:var(--surface)]"
      >
        Pré-visualização de QA — todos os números são de exemplo.
      </p>
      <CascaAdmin sessao={{ nome: 'Pré-visualização', email: 'qa@exemplo.test', papel: 'leitura' }}>
        <PainelComando dados={comVariante(exemplo(lerPeriodo(periodo)), variante)} />
      </CascaAdmin>
    </div>
  );
}
