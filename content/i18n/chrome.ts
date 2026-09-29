import { CTA_PRIMARY, type CountryCode, type SolutionSlug, type Texto } from '@/content/types';

/**
 * O texto do chrome — topo, cabeçalho, rodapé, barra móvel, atalhos — nos dois
 * idiomas.
 *
 * Estava embutido em cada componente, em português. Tirá-lo daqui para um só
 * sítio tem um efeito que importa mais do que a arrumação: o guarda de `Texto`
 * (`lib/i18n/texto.test.ts`) passa a vê-lo, e recusa um lado vazio ou um
 * «inglês» que é o português copiado.
 *
 * O português é o que estava no ar, palavra por palavra. O lote C (reescrita
 * da copy) está retido; este lote não muda uma vírgula do que um leitor
 * português vê.
 */
export const CHROME = {
  saltar: {
    pt: 'Saltar para o conteúdo principal',
    en: 'Skip to main content',
  },
  logo: { pt: 'AGORAMOZ — página inicial', en: 'AGORAMOZ — home' },
  trilho: { pt: 'Trilho', en: 'Breadcrumb' },

  topo: {
    pt: 'Websites, software, automação e agentes de IA para empresas em Moçambique, Portugal e Brasil.',
    en: 'Websites, software, automation and AI agents for companies in Mozambique, Portugal, Brazil and ten global markets.',
  },
  mercadosAria: { pt: 'Selecionar mercado', en: 'Choose a market' },
  idiomaAria: { pt: 'Idioma', en: 'Language' },

  navPrincipal: { pt: 'Navegação principal', en: 'Main navigation' },
  solucoes: { pt: 'Soluções', en: 'Solutions' },
  // Em PT o menu mostra os três países com os seus setores; em EN, mercados —
  // os setores são páginas portuguesas.
  setores: { pt: 'Setores', en: 'Markets' },
  diagnosticoCurto: { pt: 'Diagnóstico', en: 'Diagnostic' },
  abrirMenu: { pt: 'Abrir menu', en: 'Open menu' },
  menuTitulo: { pt: 'Menu de navegação', en: 'Navigation menu' },
  fecharMenu: { pt: 'Fechar menu', en: 'Close menu' },
  navMovel: { pt: 'Navegação móvel', en: 'Mobile navigation' },
  canais: { pt: 'Canais diretos', en: 'Direct channels' },
  verTodas: { pt: 'Ver todas as soluções', en: 'See all solutions' },
  comoCombinam: {
    pt: 'Como se combinam num único sistema',
    en: 'How they combine into one system',
  },
  mercadosGlobais: { pt: 'Mercados globais', en: 'Global markets' },

  novoSeparador: { pt: '(abre noutro separador)', en: '(opens in a new tab)' },
  mercados: { pt: 'Mercados', en: 'Markets' },
  /** `{n}` é substituído pelo número de mercados. */
  globalN: { pt: 'Global · {n} mercados', en: 'Global · {n} markets' },
  empresa: { pt: 'Empresa', en: 'Company' },
  perfilResumo: { pt: 'Quem somos, em resumo', en: 'Who we are, in brief' },
  solicitarDiagnostico: {
    pt: 'Solicitar diagnóstico',
    en: 'Request a diagnostic',
  },
  privacidade: { pt: 'Privacidade', en: 'Privacy' },
  direitos: { pt: 'Todos os direitos reservados.', en: 'All rights reserved.' },
  reduzirMovimento: { pt: 'Reduzir movimento', en: 'Reduce motion' },

  /** Marca de uma ligação para uma página que só existe em português. */
  soPortuguesSr: { pt: 'em português', en: 'in Portuguese' },

  tagline: {
    pt: 'Infraestrutura digital para crescimento e produtividade',
    en: 'Digital infrastructure for growth and productivity',
  },
  ctaPrimario: { pt: CTA_PRIMARY, en: 'Request a Strategic Diagnostic' },
} as const satisfies Record<string, Texto>;

/** As páginas institucionais, que por agora só existem em português. */
export const NAV_TEXTO: Record<'/como-trabalhamos' | '/sobre' | '/contactos', Texto> = {
  '/como-trabalhamos': { pt: 'Como trabalhamos', en: 'How we work' },
  '/sobre': { pt: 'Sobre', en: 'About' },
  '/contactos': { pt: 'Contactos', en: 'Contact' },
};

/** Nome dos três mercados de operação. O português continua a viver em `COUNTRIES`. */
export const NOME_PAIS: Record<CountryCode, Texto> = {
  mz: { pt: 'Moçambique', en: 'Mozambique' },
  pt: { pt: 'Portugal', en: 'Portugal' },
  br: { pt: 'Brasil', en: 'Brazil' },
};

/** Rótulo e frase curta de cada solução, para menus e grelhas. */
export const RESUMO_SOLUCAO: Record<SolutionSlug, { label: Texto; short: Texto }> = {
  'agentes-ia': {
    label: { pt: 'Agentes de IA', en: 'AI agents' },
    short: {
      pt: 'Assistentes com objetivo, fontes, permissões e supervisão.',
      en: 'Assistants with a goal, sources, permissions and supervision.',
    },
  },
  'automacao-de-processos': {
    label: { pt: 'Automação de processos', en: 'Process automation' },
    short: {
      pt: 'Menos trabalho repetitivo, menos erros, menos atrasos.',
      en: 'Less repetitive work, fewer errors, fewer delays.',
    },
  },
  'infraestrutura-digital': {
    label: { pt: 'Infraestrutura digital', en: 'Digital infrastructure' },
    short: {
      pt: 'Integração, segurança, monitorização e continuidade.',
      en: 'Integration, security, monitoring and continuity.',
    },
  },
  'software-empresarial': {
    label: { pt: 'Software empresarial', en: 'Business software' },
    short: {
      pt: 'Sistemas construídos à volta do processo que o distingue.',
      en: 'Systems built around the process that sets you apart.',
    },
  },
  'websites-avancados': {
    label: { pt: 'Websites avançados', en: 'Advanced websites' },
    short: {
      pt: 'Captar, qualificar e encaminhar oportunidades.',
      en: 'Capture, qualify and route opportunities.',
    },
  },
};

/**
 * As quatro entradas de mercado: PT-PT, PT-MZ, PT-BR e EN num contexto global.
 *
 * Pedido explícito. As três primeiras são os mercados de operação, pelo seu
 * `locale` — as páginas `/pt`, `/mz` e `/br` já declaram `pt-PT`, `pt-MZ` e
 * `pt-BR`. A quarta é o inglês, e o inglês aqui é o nível global: quem lê em
 * inglês não está em nenhum dos três países.
 *
 * A ordem é a do pedido.
 */
export const ENTRADAS_DE_MERCADO = [
  { chave: 'pt', codigo: 'PT-PT', lang: 'pt-PT', nome: NOME_PAIS.pt },
  { chave: 'mz', codigo: 'PT-MZ', lang: 'pt-MZ', nome: NOME_PAIS.mz },
  { chave: 'br', codigo: 'PT-BR', lang: 'pt-BR', nome: NOME_PAIS.br },
  {
    chave: 'global',
    codigo: 'EN',
    lang: 'en',
    nome: { pt: 'Global, em inglês', en: 'Global, in English' },
  },
] as const satisfies readonly {
  chave: CountryCode | 'global';
  codigo: string;
  lang: string;
  nome: Texto;
}[];

/** O destino de cada entrada. O global inglês é sempre `/en/global`: é o que o `EN` promete. */
export function destinoDaEntrada(chave: CountryCode | 'global'): string {
  return chave === 'global' ? '/en/global' : `/${chave}`;
}
