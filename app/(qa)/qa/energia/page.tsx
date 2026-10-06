import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CascaAdmin } from '@/components/admin/CascaAdmin';
import { FichaOportunidade } from '@/components/admin/energia/Ficha';
import { ManualEnergia } from '@/components/admin/energia/Manual';
import { PainelEnergia } from '@/components/admin/energia/Painel';
import type { Documento, Oportunidade, Registo, Stakeholder } from '@/lib/energia/leitura';
import { PASTAS } from '@/lib/energia/modelo';

/**
 * Pré-visualização do Espaço CEnO para o QA visual (Playwright + axe), sem
 * sessão nem base. Só existe com `ADMIN_PREVIEW=on` e fora da produção da
 * Vercel: em produção é 404.
 *
 * TUDO AQUI É DE EXEMPLO — organizações, valores e pessoas inventados para a
 * captura, e a página di-lo no topo. `?vista=painel|ficha|qualificada|vazio|manual`.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pré-visualização do Espaço CEnO',
  robots: { index: false, follow: false, nocache: true },
};

/** Instante fixo: as capturas e os alertas são sempre os mesmos. */
const AGORA = '2026-10-06T10:00:00.000Z';

const BASE: Oportunidade = {
  id: '00000000-0000-4000-8000-000000000001',
  titulo: 'Exemplo — mini-rede solar para um complexo agro-industrial',
  organizacao: 'Organização de exemplo A',
  sector: 'solar',
  problema: 'Exemplo: dependência de geradores a diesel, com custo e paragens não planeadas.',
  fonte: 'evento',
  urgencia: 'alta',
  valor_min: 250000,
  valor_max: 400000,
  moeda: 'USD',
  valor_evidencia: 'Exemplo: pedido de orçamento recebido por escrito.',
  fase: 'problema_validado',
  fase_desde: '2026-09-28T09:00:00.000Z',
  c_dor: 4,
  c_urgencia: 4,
  c_decisor: 3,
  c_capacidade: 3,
  c_adequacao: 5,
  c_controlo: 3,
  c_informacao: 3,
  c_valor: 4,
  score_total: 29,
  prioridade: 'B',
  proxima_accao: 'Exemplo: reunião com o director financeiro para validar o caso',
  proxima_data: '2026-10-09',
  responsavel: 'Responsável de exemplo',
  memo: { oportunidade: 'Exemplo de texto do memo.', problema: 'Exemplo.', receita: 'Exemplo: fee de estruturação.' },
  motivo_perda: null,
  ultima_actividade: '2026-10-03T15:00:00.000Z',
  revisao: 3,
  created_at: '2026-09-10T08:00:00.000Z',
  updated_at: '2026-10-03T15:00:00.000Z',
};

const SEM_SCORE = {
  c_dor: null,
  c_urgencia: null,
  c_decisor: null,
  c_capacidade: null,
  c_adequacao: null,
  c_controlo: null,
  c_informacao: null,
  c_valor: null,
  score_total: null,
  prioridade: null,
} as const;

const OPS: Oportunidade[] = [
  BASE,
  {
    ...BASE,
    id: '00000000-0000-4000-8000-000000000002',
    titulo: 'Exemplo — digitalização da manutenção de uma central',
    organizacao: 'Organização de exemplo B',
    sector: 'hidrica',
    fase: 'proposta',
    c_dor: 5,
    c_urgencia: 4,
    c_decisor: 4,
    c_capacidade: 4,
    c_adequacao: 5,
    c_controlo: 4,
    c_informacao: 4,
    c_valor: 4,
    score_total: 34,
    prioridade: 'A',
    memo: {},
    proxima_data: '2026-10-01',
    ultima_actividade: '2026-09-20T10:00:00.000Z',
    fase_desde: '2026-09-15T10:00:00.000Z',
  },
  {
    ...BASE,
    ...SEM_SCORE,
    id: '00000000-0000-4000-8000-000000000003',
    titulo: 'Exemplo — sinal: concurso de eficiência energética',
    organizacao: null,
    sector: 'eficiencia',
    fase: 'sinal',
    valor_min: null,
    valor_max: null,
    valor_evidencia: null,
    memo: {},
    proxima_data: '2026-10-12',
  },
  {
    ...BASE,
    id: '00000000-0000-4000-8000-000000000004',
    titulo: 'Exemplo — parceria de armazenamento (perdida)',
    fase: 'perdida',
    motivo_perda: 'Exemplo: sem decisor acessível.',
  },
];

const STAKEHOLDERS: Stakeholder[] = [
  {
    id: '00000000-0000-4000-8000-0000000000a1',
    organizacao: 'Organização de exemplo A',
    pessoa: 'Pessoa de exemplo',
    cargo: 'Director financeiro',
    pais: 'Moçambique',
    sector: 'Agro-indústria',
    tipo: 'decisor_cliente',
    interesse: null,
    poder_decisao: 5,
    relacao: 'em_construcao',
    ultima_interacao: '2026-10-03',
    proxima_accao: 'Exemplo: enviar resumo',
    proxima_data: '2026-10-08',
    origem_dados: 'Exemplo: apresentado num evento',
    consentimento: true,
    responsavel: 'Responsável de exemplo',
    activo: true,
    revisao: 1,
    updated_at: '2026-10-03T15:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-0000000000a2',
    organizacao: 'Investidor de exemplo',
    pessoa: null,
    cargo: null,
    pais: null,
    sector: null,
    tipo: 'investidor',
    interesse: null,
    poder_decisao: null,
    relacao: 'nova',
    ultima_interacao: null,
    proxima_accao: null,
    proxima_data: null,
    origem_dados: null,
    consentimento: false,
    responsavel: null,
    activo: true,
    revisao: 1,
    updated_at: '2026-10-01T15:00:00.000Z',
  },
];

const REGISTOS: Registo[] = [
  { id: 2, tipo: 'reuniao', decisao: null, corpo: 'Exemplo: reunião de descoberta realizada.', metadata: {}, ocorreu_em: '2026-10-03T15:00:00.000Z' },
  { id: 1, tipo: 'fase', decisao: null, corpo: null, metadata: { de: 'descoberta', para: 'problema_validado' }, ocorreu_em: '2026-09-28T09:00:00.000Z' },
];

const DOCUMENTOS: Documento[] = PASTAS.map((_, i) => ({
  pasta: i + 1,
  estado: i < 2 ? 'pronto' : i < 4 ? 'em_curso' : 'em_falta',
  ligacao: i === 0 ? 'https://exemplo.test/pasta-1' : null,
  nota: null,
}));

function Vista({ vista }: { vista: string | undefined }) {
  switch (vista) {
    case 'manual':
      return <ManualEnergia />;
    case 'vazio':
      return <PainelEnergia ops={[]} comDecisor={[]} mudancas={[]} agora={AGORA} />;
    case 'ficha':
      return (
        <FichaOportunidade
          op={BASE}
          ligados={[{ stakeholder: STAKEHOLDERS[0]!, papel: 'decisor' }]}
          stakeholders={STAKEHOLDERS}
          registos={REGISTOS}
          documentos={[]}
          agora={AGORA}
        />
      );
    case 'qualificada':
      return (
        <FichaOportunidade
          op={OPS[1]!}
          ligados={[]}
          stakeholders={STAKEHOLDERS}
          registos={[]}
          documentos={DOCUMENTOS}
          agora={AGORA}
        />
      );
    default:
      return (
        <PainelEnergia
          ops={OPS}
          comDecisor={[BASE.id]}
          mudancas={[
            { oportunidade_id: BASE.id, para: 'problema_validado' },
            { oportunidade_id: OPS[1]!.id, para: 'qualificada' },
            { oportunidade_id: OPS[1]!.id, para: 'proposta' },
          ]}
          agora={AGORA}
        />
      );
  }
}

export default async function PreVisualizacaoEnergia({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  // Duas chaves: a variável ligada E não estar em produção na Vercel.
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV === 'production') notFound();
  const { vista } = await searchParams;
  return (
    <div data-surface="light" className="min-h-screen bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <p role="note" className="bg-[color:var(--on-surface)] px-4 py-2 text-center text-xs text-[color:var(--surface)]">
        Pré-visualização de QA — todas as organizações, pessoas e valores são de exemplo.
      </p>
      <CascaAdmin sessao={{ nome: 'Pré-visualização', email: 'qa@exemplo.test', papel: 'comercial' }} energia>
        <Vista vista={vista} />
      </CascaAdmin>
    </div>
  );
}
