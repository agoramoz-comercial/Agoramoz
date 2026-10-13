import { FATOR_ACABAMENTO, quantidades, type Acabamento, type CasaConfig, type Categoria, type LinhaQuantidade } from './quantidades';

/**
 * Custo preliminar da casa a partir das quantidades.
 *
 * A base de preços é FICTÍCIA (MZN, sem IVA, «outubro de 2026» só como
 * etiqueta da versão). Serve para a demo mostrar o mecanismo — quantidades ×
 * preço unitário, mais transporte e contingência —, nunca para orçamentar.
 *
 * A classe de maturidade decide a faixa de incerteza que acompanha o total.
 * Uma estimativa conceptual que aparecesse como um número único seria
 * exatamente o erro que o documento do fundador manda evitar.
 */

export const BASE_PRECOS = {
  versao: 'demo-2026-10',
  nota: 'Preços fictícios em MZN, sem IVA. Não são cotações.',
  unitarios: {
    cimento: 650,
    areia: 1_800,
    brita: 2_600,
    aco: 110,
    'bloco-15': 38,
    'tijolo-macico': 9,
    'bloco-solo-cimento': 30,
    chapas: 950,
    telhas: 45,
    painel: 2_100,
    madeira: 28_000,
    mosaico: 950,
    betonilha: 0,
    tinta: 420,
    portas: 9_500,
    janelas: 7_800,
    cabos: 65,
    tubagem: 140,
    'mao-de-obra': 900,
  },
} as const;

type ChavePreco = keyof typeof BASE_PRECOS.unitarios;

/** Percentagem do custo de materiais gasta em transporte até à obra. */
export const TRANSPORTE = 0.06;

export const CLASSES = ['conceptual', 'preliminar', 'validacao', 'aprovado', 'contratual'] as const;
export type Classe = (typeof CLASSES)[number];

export const CLASSE: Readonly<Record<Classe, { nome: string; menos: number; mais: number; contingencia: number }>> = {
  conceptual: { nome: 'Conceptual', menos: 0.3, mais: 0.5, contingencia: 0.15 },
  preliminar: { nome: 'Preliminar', menos: 0.2, mais: 0.3, contingencia: 0.12 },
  validacao: { nome: 'Para validação técnica', menos: 0.15, mais: 0.2, contingencia: 0.1 },
  aprovado: { nome: 'Aprovado por medidor-orçamentista ou engenheiro (exemplo de faixa)', menos: 0.1, mais: 0.15, contingencia: 0.07 },
  contratual: { nome: 'Contratual (exemplo de faixa)', menos: 0.05, mais: 0.1, contingencia: 0.05 },
};

/** O acabamento encarece o que se vê: caixilharia, pavimento e pintura. */
const SENSIVEL_AO_ACABAMENTO = new Set(['portas', 'janelas', 'pavimento', 'tinta']);

export interface LinhaCusto extends LinhaQuantidade {
  readonly precoUnitario: number;
  readonly total: number;
}

export type CategoriaCusto = Categoria | 'transporte' | 'contingencia';

export interface Orcamento {
  readonly linhas: readonly LinhaCusto[];
  readonly porCategoria: Readonly<Record<CategoriaCusto, number>>;
  readonly materiais: number;
  readonly transporte: number;
  readonly contingencia: number;
  readonly total: number;
  readonly classe: Classe;
  readonly faixa: readonly [number, number];
}

export const NOME_CATEGORIA: Readonly<Record<CategoriaCusto, string>> = {
  fundacoes: 'Fundações',
  estrutura: 'Estrutura',
  cobertura: 'Cobertura',
  pavimento: 'Pavimento',
  acabamentos: 'Acabamentos',
  caixilharia: 'Caixilharia',
  instalacoes: 'Instalações',
  'mao-de-obra': 'Mão-de-obra',
  transporte: 'Transporte',
  contingencia: 'Reserva de contingência',
};

function chaveDe(l: LinhaQuantidade, c: CasaConfig): ChavePreco {
  if (l.id === 'alvenaria') return c.parede;
  if (l.id === 'pavimento') return c.pavimento;
  return l.id as ChavePreco;
}

function precoDe(l: LinhaQuantidade, c: CasaConfig, acabamento: Acabamento): number {
  const base = BASE_PRECOS.unitarios[chaveDe(l, c)];
  return SENSIVEL_AO_ACABAMENTO.has(l.id) ? base * FATOR_ACABAMENTO[acabamento] : base;
}

export function orcamento(c: CasaConfig, classe: Classe = 'conceptual'): Orcamento {
  const linhas: LinhaCusto[] = quantidades(c).map((l) => {
    const precoUnitario = Math.round(precoDe(l, c, c.acabamento));
    return { ...l, precoUnitario, total: Math.round(l.quantidade * precoUnitario) };
  });
  const porCategoria: Record<CategoriaCusto, number> = {
    fundacoes: 0,
    estrutura: 0,
    cobertura: 0,
    pavimento: 0,
    acabamentos: 0,
    caixilharia: 0,
    instalacoes: 0,
    'mao-de-obra': 0,
    transporte: 0,
    contingencia: 0,
  };
  for (const l of linhas) porCategoria[l.categoria] += l.total;
  const materiais = linhas.filter((l) => l.categoria !== 'mao-de-obra').reduce((s, l) => s + l.total, 0);
  const maoDeObra = porCategoria['mao-de-obra'];
  const transporte = Math.round(materiais * TRANSPORTE);
  const contingencia = Math.round((materiais + maoDeObra + transporte) * CLASSE[classe].contingencia);
  porCategoria.transporte = transporte;
  porCategoria.contingencia = contingencia;
  const total = materiais + maoDeObra + transporte + contingencia;
  const k = CLASSE[classe];
  return {
    linhas,
    porCategoria,
    materiais,
    transporte,
    contingencia,
    total,
    classe,
    faixa: [Math.round(total * (1 - k.menos)), Math.round(total * (1 + k.mais))],
  };
}
