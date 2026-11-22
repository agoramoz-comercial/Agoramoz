import {
  FOUNDERS_EN,
  HOME_FAQ_EN,
  HOME_PROBLEMS_EN,
  PROCESS_EN,
  PROOF_SECTION_EN,
  RISK_REDUCTION_EN,
  SYSTEM_FLOW_EN,
} from '@/content/en/home';
import { HERO, INICIO } from '@/content/i18n/inicio';
import { FINAL } from '@/content/i18n/paginas';
import type { V3 } from './tipo';

/** English: reuses the published English text, in the benchmark order. */
export const EN: V3 = {
  meta: { titulo: INICIO.metaTitulo.en, descricao: INICIO.metaDescricao.en },
  nav: {
    solucoes: 'Solutions',
    como: 'How we work',
    projetos: 'Projects',
    news: 'Moz News',
    contactos: 'Contact',
    diagnostico: 'Diagnostic',
    menu: 'Menu',
    fechar: 'Close',
    lingua: 'Language',
    saltar: 'Skip to content',
  },
  hero: {
    etiqueta: HERO.eyebrow.en,
    titulo: HERO.titulo.en,
    texto: HERO.lead.en,
    cta: 'Assess a critical process',
    secundario: 'Take the diagnostic (about 2 min)',
    garantias: ['Diagnostic before proposal', 'If there is no fit, we say so', 'Approval at every stage'],
    local: 'Maputo · Lisbon · São Paulo',
    rolar: 'Scroll',
  },
  problema: {
    etiqueta: INICIO.problemas.eyebrow.en,
    manifesto: INICIO.problemas.titulo.en,
    itens: HOME_PROBLEMS_EN.map((p) => ({ titulo: p.title, texto: p.body })),
    caminho: 'Path',
  },
  caminhos: {
    etiqueta: 'Solutions',
    titulo: 'Three paths, seven capabilities.',
    lead: INICIO.solucoes.lead.en,
    itens: [
      {
        nome: 'Capture and qualify opportunities',
        frase: 'Every request comes in through a defined path, with the data needed to handle it.',
        resolve: 'Lost opportunities',
      },
      {
        nome: 'Connect and automate the operation',
        frase: 'Information moves between applications without anyone copying it.',
        resolve: 'Manual operations · Disconnected systems',
      },
      {
        nome: 'Measure, protect and evolve',
        frase: 'Sales, operations and blockers become visible in simple, up-to-date data.',
        resolve: 'Decisions without visibility',
      },
    ],
    capacidades: {
      'websites-avancados': 'Advanced websites',
      'software-empresarial': 'Business software',
      'automacao-de-processos': 'Process automation',
      'agentes-ia': 'AI agents',
      'integracao-de-sistemas': 'Systems integration',
      'infraestrutura-digital': 'Digital infrastructure',
      'estabilizacao-e-evolucao': 'Stabilisation and evolution',
    },
    resolveRotulo: 'Solves',
    caminhoRotulo: 'Path',
  },
  sistema: {
    etiqueta: SYSTEM_FLOW_EN.eyebrow,
    titulo: SYSTEM_FLOW_EN.title,
    lead: SYSTEM_FLOW_EN.lead,
    passos: SYSTEM_FLOW_EN.steps.map((s) => ({ titulo: s.title, texto: s.body })),
  },
  oferta: {
    etiqueta: 'Entry offer',
    nome: 'Digital Operations Diagnostic',
    titulo: 'Know where to intervene before buying technology.',
    promessa:
      'The diagnostic turns a loosely defined problem into an executive decision with process, priorities, risks, options and clear next steps.',
    recebe: 'What you receive',
    escrito: 'What is written down before we start',
    pontos: [...RISK_REDUCTION_EN.points] as V3['oferta']['pontos'],
    honestidade: 'If the diagnostic concludes there is no fit, we say so — and there is no proposal.',
  },
  prova: {
    etiqueta: PROOF_SECTION_EN.eyebrow,
    titulo: 'AGORAMOZ products, running',
    lead: PROOF_SECTION_EN.lead,
    produtos: [
      { nome: 'Moz News', prova: 'AI news analysis, published by the team.' },
      { nome: 'AGORAMOZ Cívico', prova: 'Statute lookup, article by article: more than 1,000 pages.' },
      { nome: 'AGORAMOZ Courses', prova: 'Content generated from sources, with every claim checked.' },
      { nome: 'TerraBuild', prova: 'Digital twin of a farm, labelled as a demonstration.' },
    ],
    cartoes: [
      { titulo: 'Moz News\nnews analysis', valor: '2', rodape: 'Editions: Portuguese and English' },
      { titulo: 'AGORAMOZ Cívico\nlaw, article by article', valor: '1000', unidade: '+', rodape: 'Pages of law to look up' },
      { titulo: 'AGORAMOZ Courses\nverified', valor: '3', unidade: '×', rodape: 'Up to 3 verification cycles' },
      { titulo: 'TerraBuild\ndemonstration', valor: '3', rodape: 'Layers: water, power, plots' },
    ],
    carrossel: 'AGORAMOZ products in numbers',
    dica: 'Drag the cards or use the arrow keys.',
    demo: 'Demonstration',
    abrir: 'Open',
    nota: 'Each one opens a public page. None is presented as a client result.',
  },
  fases: {
    etiqueta: PROCESS_EN.eyebrow,
    titulo: PROCESS_EN.title,
    lead: PROCESS_EN.lead,
    entregavel: 'Deliverable',
    decisao: 'Decision',
    pode: 'You can stop here',
    itens: PROCESS_EN.steps.map((s) => ({ titulo: s.title, pergunta: s.body, entrega: s.entrega, decisao: s.gate })),
  },
  onde: {
    etiqueta: INICIO.mercados.eyebrow.en,
    titulo: INICIO.mercados.titulo.en,
    lead: INICIO.mercados.lead.en,
    mercados: [
      {
        nome: 'Mozambique',
        texto:
          'We work with companies that already have demand and need structure: organising requests, clients, suppliers and operations in a single system, without replacing everything that already works.',
      },
      {
        nome: 'Portugal',
        texto:
          'We do not propose replacing what already works. We connect existing systems, automate the work between them and help free qualified team hours for qualified work.',
      },
      {
        nome: 'Brazil',
        texto:
          'We design for higher-volume operations and distributed teams, where one minute of manual work is multiplied by every transaction.',
      },
      {
        nome: 'Global',
        texto:
          'Ten expansion markets, from Switzerland to Singapore, with the same discipline: diagnostic first, price per stage once the scope is known, and human approval on critical decisions.',
      },
    ],
    explorar: 'Explore',
  },
  equipa: {
    etiqueta: FOUNDERS_EN.eyebrow,
    titulo: FOUNDERS_EN.title,
    pessoas: [
      { papel: 'Founder & CEO', texto: FOUNDERS_EN.body.gerson },
      { papel: 'Co-founder & Chief Energy Officer', texto: FOUNDERS_EN.body.sheinaz },
    ],
    perfil: 'LinkedIn profile',
  },
  ideias: {
    etiqueta: 'Moz News',
    titulo: 'What we are watching.',
    ler: 'Read Moz News',
    vazio: 'The latest analyses are on Moz News.',
  },
  faq: {
    etiqueta: INICIO.faq.eyebrow.en,
    titulo: INICIO.faq.titulo.en,
    itens: HOME_FAQ_EN.map((f) => ({ q: f.q, a: f.a })),
  },
  final: {
    titulo: FINAL.titulo.en,
    texto: FINAL.corpo.en,
    cta: 'Assess a critical process',
    micro: FINAL.micro.en,
  },
  rodape: {
    direitos: 'All rights reserved.',
    privacidade: 'Privacy',
    seguranca: 'Security and quality',
    topo: 'Back to top',
    lingua: 'Language',
    nota: 'The other pages of the site are in Portuguese and English.',
  },
};
