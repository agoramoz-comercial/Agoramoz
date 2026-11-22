import type { SolutionSlug, Texto } from '@/content/types';

/**
 * Texto novo da página inicial (redesenho 2026), aprovado a partir do
 * benchmark «Como vendem os gigantes» (22/11/2026). Regra: só frases que o
 * site já publica, mais os nomes dos três caminhos e as etiquetas de ligação.
 * Nenhum número, cliente, prazo ou preço novo — esses dados ainda não foram
 * dados pela AGORAMOZ e não se inventam.
 */

/** As três garantias por baixo dos botões do hero: já estão escritas no site. */
export const GARANTIAS: readonly Texto[] = [
  { pt: 'Diagnóstico antes de proposta', en: 'Diagnostic before proposal' },
  { pt: 'Se não houver adequação, dizemo-lo', en: 'If there is no fit, we say so' },
  { pt: 'Aprovação em cada fase', en: 'Approval at every stage' },
];

export const HERO_2026 = {
  secundario: { pt: 'Fazer o diagnóstico (cerca de 2 min)', en: 'Take the diagnostic (about 2 min)' },
  garantiasAria: { pt: 'O que garantimos', en: 'What we guarantee' },
} as const;

export type Caminho = {
  numero: 1 | 2 | 3;
  nome: Texto;
  frase: Texto;
  capacidades: readonly SolutionSlug[];
};

/**
 * A oferta em três caminhos. Cada frase já está publicada (secção «O sistema»
 * e «Soluções»); as sete capacidades continuam todas, dentro do caminho.
 */
export const CAMINHOS: readonly Caminho[] = [
  {
    numero: 1,
    nome: { pt: 'Captar e qualificar oportunidades', en: 'Capture and qualify opportunities' },
    frase: {
      pt: 'Cada pedido entra por um caminho definido, com os dados necessários para ser tratado.',
      en: 'Every request comes in through a defined path, with the data needed to handle it.',
    },
    capacidades: ['websites-avancados', 'agentes-ia'],
  },
  {
    numero: 2,
    nome: { pt: 'Ligar e automatizar a operação', en: 'Connect and automate the operation' },
    frase: {
      pt: 'A informação avança entre aplicações sem ninguém a copiar.',
      en: 'Information moves between applications without anyone copying it.',
    },
    capacidades: ['integracao-de-sistemas', 'automacao-de-processos', 'software-empresarial'],
  },
  {
    numero: 3,
    nome: { pt: 'Medir, proteger e evoluir', en: 'Measure, protect and evolve' },
    frase: {
      pt: 'Vendas, operações e bloqueios ficam visíveis em dados simples e atualizados.',
      en: 'Sales, operations and blockers become visible in simple, up-to-date data.',
    },
    capacidades: ['infraestrutura-digital', 'estabilizacao-e-evolucao'],
  },
];

/** Os quatro problemas, pela ordem do site, e o caminho que resolve cada um. */
export const CAMINHO_DO_PROBLEMA: readonly (1 | 2 | 3)[] = [1, 2, 2, 3];

export const CAMINHOS_SECAO = {
  eyebrow: { pt: 'Soluções', en: 'Solutions' },
  titulo: { pt: 'Três caminhos, sete capacidades.', en: 'Three paths, seven capabilities.' },
  caminho: { pt: 'Caminho {n}', en: 'Path {n}' },
  resolve: { pt: 'Resolve', en: 'Solves' },
  verTodas: { pt: 'Ver as sete soluções', en: 'See all seven solutions' },
} as const;

export type Produto = { nome: string; prova: Texto; href: string; demo?: boolean };

/** Prova que qualquer visitante pode abrir hoje: páginas públicas que já existem. */
export const PRODUTOS: readonly Produto[] = [
  {
    nome: 'Moz News',
    prova: {
      pt: 'Análise de notícias com IA, publicada pela equipa.',
      en: 'AI news analysis, published by the team.',
    },
    href: '/news',
  },
  {
    nome: 'AGORAMOZ Cívico',
    prova: {
      pt: 'Consulta à lei artigo a artigo: mais de 1 000 páginas.',
      en: 'Statute lookup, article by article: more than 1,000 pages.',
    },
    href: '/civico',
  },
  {
    nome: 'Cursos AGORAMOZ',
    prova: {
      pt: 'Conteúdo gerado das fontes, com cada afirmação verificada.',
      en: 'Content generated from sources, with every claim checked.',
    },
    href: '/cursos',
  },
  {
    nome: 'TerraBuild',
    prova: {
      pt: 'Gémeo digital de uma fazenda, identificado como demonstração.',
      en: 'Digital twin of a farm, labelled as a demonstration.',
    },
    href: '/projetos',
    demo: true,
  },
];

export const PRODUTOS_SECAO = {
  titulo: { pt: 'Produtos AGORAMOZ a funcionar', en: 'AGORAMOZ products, running' },
  nota: {
    pt: 'Cada um abre uma página pública. Nenhum é apresentado como resultado de cliente.',
    en: 'Each one opens a public page. None is presented as a client result.',
  },
  abrir: { pt: 'Abrir', en: 'Open' },
  demo: { pt: 'Demonstração', en: 'Demonstration' },
} as const;

export const IDEIAS = {
  indice: { pt: 'Ideias', en: 'Ideas' },
  eyebrow: { pt: 'Moz News', en: 'Moz News' },
  titulo: { pt: 'O que estamos a ver.', en: 'What we are watching.' },
  verTodas: { pt: 'Ler o Moz News', en: 'Read Moz News' },
  vazio: {
    pt: 'As análises mais recentes estão no Moz News.',
    en: 'The latest analyses are on Moz News.',
  },
} as const;

export const ONDE = {
  indice: { pt: 'Onde', en: 'Where' },
} as const;
