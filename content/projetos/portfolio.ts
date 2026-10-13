import { FAZENDA_001 } from './fazenda-inteligente-001';

/**
 * O portefólio do hub /projetos. TODOS os cartões são fictícios. Só a 001 tem
 * gémeo digital; os outros dois existem para o mapa e os filtros mostrarem a
 * ideia de uma carteira — e dizem-no no próprio cartão.
 *
 * O pino fica no centro da província (rótulo do mapa), nunca num ponto real:
 * localização aproximada é a regra da camada pública.
 */

export type EstadoProjeto = 'planeado' | 'em-execucao' | 'concluido';

export interface CartaoProjeto {
  readonly id: string;
  readonly slug: string | null;
  readonly nome: string;
  readonly provincia: string;
  readonly provinciaNome: string;
  readonly setor: string;
  readonly estado: EstadoProjeto;
  readonly capital: number;
  readonly progresso: number;
  readonly resumo: string;
}

const capital001 = FAZENDA_001.componentes.reduce((s, c) => s + c.orcamento, 0);
const feito001 = FAZENDA_001.componentes.reduce((s, c) => s + (c.orcamento * c.percentagem) / 100, 0);

export const PORTFOLIO: readonly CartaoProjeto[] = [
  {
    id: '001',
    slug: FAZENDA_001.slug,
    nome: FAZENDA_001.nome,
    provincia: 'manica',
    provinciaNome: 'Manica',
    setor: 'Agricultura',
    estado: 'em-execucao',
    capital: capital001,
    progresso: Math.round((feito001 / capital001) * 100),
    resumo: 'Fazenda de 12 ha com casa, armazém, rega, energia solar, processamento e construção acompanhada por marcos.',
  },
  {
    id: '002',
    slug: null,
    nome: 'Centro de processamento de caju',
    provincia: 'nampula',
    provinciaNome: 'Nampula',
    setor: 'Agroindústria',
    estado: 'planeado',
    capital: 64_000_000,
    progresso: 0,
    resumo: 'Descasque, secagem e embalagem para cooperativas da zona. Ainda sem gémeo digital nesta demonstração.',
  },
  {
    id: '003',
    slug: null,
    nome: 'Mini-rede solar e rega comunitária',
    provincia: 'gaza',
    provinciaNome: 'Gaza',
    setor: 'Energia e água',
    estado: 'concluido',
    capital: 21_500_000,
    progresso: 100,
    resumo: 'Energia para bombagem e rega partilhada por pequenos produtores. Ainda sem gémeo digital nesta demonstração.',
  },
];

export const NOME_ESTADO: Readonly<Record<EstadoProjeto, string>> = {
  planeado: 'Planeado',
  'em-execucao': 'Em execução',
  concluido: 'Concluído',
};

export const FAIXAS_CAPITAL = [
  { id: 'ate-25', nome: 'Até 25 M MZN', min: 0, max: 25_000_000 },
  { id: '25-50', nome: '25 a 50 M MZN', min: 25_000_000, max: 50_000_000 },
  { id: 'mais-50', nome: 'Mais de 50 M MZN', min: 50_000_000, max: Infinity },
] as const;
