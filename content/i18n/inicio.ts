import {
  FOUNDERS,
  HOME_FAQ,
  HOME_PROBLEMS,
  PROCESS,
  PROOF,
  PROOF_SECTION,
  RISK_REDUCTION,
  SITE,
  SYSTEM_FLOW,
} from '@/content/site';
import {
  FOUNDERS_EN,
  HOME_FAQ_EN,
  HOME_PROBLEMS_EN,
  PROCESS_EN,
  PROOF_EN,
  PROOF_SECTION_EN,
  RISK_REDUCTION_EN,
  SYSTEM_FLOW_EN,
} from '@/content/en/home';
import type { CountryCode, Idioma, ProofItem, Texto } from '@/content/types';

/**
 * Texto da página inicial e das secções que só ela usa, nos dois idiomas.
 *
 * O português é, palavra por palavra, o que estava embutido em
 * `app/(site)/page.tsx` e nos componentes de `components/home`. O conteúdo
 * longo (fluxo, processo, prova, FAQ) continua em `content/site.ts` e em
 * `content/en/home.ts`; `conteudoDoInicio` escolhe o conjunto do idioma.
 */
export const INICIO = {
  metaTitulo: { pt: `AGORAMOZ — ${SITE.tagline}`, en: 'AGORAMOZ — Digital infrastructure for growth and productivity' },
  metaDescricao: {
    pt: SITE.description,
    en: 'AGORAMOZ builds advanced websites, software, automations and AI agents fitted to your company’s processes — in Mozambique, Portugal and Brazil.',
  },

  /* Rótulos do índice lateral e nomes acessíveis das secções. */
  indice: {
    inicio: { pt: 'Início', en: 'Home' },
    problema: { pt: 'Problema', en: 'Problem' },
    sistema: { pt: 'Sistema', en: 'System' },
    solucoes: { pt: 'Soluções', en: 'Solutions' },
    mercados: { pt: 'Mercados', en: 'Markets' },
    setores: { pt: 'Setores', en: 'Sectors' },
    processo: { pt: 'Processo', en: 'Process' },
    diagnostico: { pt: 'Diagnóstico', en: 'Diagnostic' },
    prova: { pt: 'Prova', en: 'Proof' },
    risco: { pt: 'Risco', en: 'Risk' },
    equipa: { pt: 'Equipa', en: 'Team' },
    perguntas: { pt: 'Perguntas', en: 'Questions' },
    contacto: { pt: 'Contacto', en: 'Contact' },
  },
  aria: {
    apresentacao: { pt: 'Apresentação', en: 'Introduction' },
    caminho: { pt: 'Encontre o seu caminho', en: 'Find your way' },
    sistema: { pt: 'O sistema de crescimento e operação', en: 'The growth and operations system' },
    oferta: { pt: 'Oferta de diagnóstico', en: 'Diagnostic offer' },
    contacto: { pt: 'Solicitar diagnóstico', en: 'Request a diagnostic' },
  },

  problemas: {
    eyebrow: { pt: 'O problema', en: 'The problem' },
    titulo: {
      pt: 'O problema raramente é falta de ferramentas. É falta de ligação entre pessoas, processos e tecnologia.',
      en: 'The problem is rarely a lack of tools. It is a lack of connection between people, processes and technology.',
    },
  },
  solucoes: {
    eyebrow: { pt: 'Soluções', en: 'Solutions' },
    titulo: { pt: 'Cinco capacidades, um sistema.', en: 'Five capabilities, one system.' },
    lead: {
      pt: 'Cada uma resolve um bloqueio diferente. O diagnóstico determina por qual começar — nem todas são igualmente importantes para a sua empresa.',
      en: 'Each one removes a different blocker. The diagnostic decides where to start — they are not all equally important for your company.',
    },
  },
  mercados: {
    eyebrow: { pt: 'Mercados', en: 'Markets' },
    titulo: {
      pt: 'Estratégia global. Execução adaptada a cada mercado.',
      en: 'Global strategy. Execution adapted to each market.',
    },
    lead: {
      pt: 'O mesmo método, com linguagem, prioridades e requisitos legais próprios de cada país. Não traduzimos a mesma página três vezes.',
      en: 'The same method, with the language, priorities and legal requirements of each country. We do not translate the same page three times.',
    },
  },
  setores: {
    eyebrow: { pt: 'Setores', en: 'Sectors' },
    titulo: { pt: 'Comece pelo problema que reconhece.', en: 'Start with the problem you recognise.' },
    lead: {
      pt: 'Cada setor tem um custo de ineficiência diferente. Escolha o seu país e veja o que encontramos com mais frequência.',
      en: 'Each sector has a different cost of inefficiency. Choose your country and see what we find most often.',
    },
  },
  faq: {
    eyebrow: { pt: 'Perguntas frequentes', en: 'Frequently asked questions' },
    titulo: { pt: 'O que nos perguntam antes de avançar.', en: 'What people ask us before going ahead.' },
  },
} as const;

export const HERO = {
  eyebrow: { pt: SITE.tagline, en: 'Digital infrastructure for growth and productivity' },
  titulo: {
    pt: 'Transformamos processos lentos e oportunidades perdidas em sistemas digitais.',
    en: 'We turn slow processes and lost opportunities into digital systems.',
  },
  lead: {
    pt: 'A AGORAMOZ desenvolve websites avançados, software, automações e agentes de IA adaptados aos processos da sua empresa — desde o primeiro contacto comercial até à operação e à análise de resultados.',
    en: 'AGORAMOZ builds advanced websites, software, automations and AI agents fitted to your company’s processes — from the first sales contact to operations and the analysis of results.',
  },
  secundario: { pt: 'Explorar soluções por setor', en: 'Explore solutions by sector' },
  micro: {
    pt: 'Conversa objetiva · Problema definido · Próximos passos claros',
    en: 'A focused conversation · A defined problem · Clear next steps',
  },
} as const;

/** `{n}` e `{total}` são substituídos no componente. */
export const SELETOR = {
  eyebrow: { pt: 'Encontre o seu caminho', en: 'Find your way' },
  passo: { pt: 'Passo {n} de {total}', en: 'Step {n} of {total}' },
  pais: { pt: 'Onde opera a sua empresa?', en: 'Where does your company operate?' },
  setor: { pt: 'Qual é o seu setor?', en: 'What is your sector?' },
  objetivo: { pt: 'O que pretende melhorar?', en: 'What do you want to improve?' },
  voltar: { pt: 'Voltar', en: 'Back' },
  continuar: { pt: 'Continuar', en: 'Continue' },
  recomendamos: { pt: 'Ver o que recomendamos', en: 'See what we recommend' },
  verGlobal: { pt: 'Ver os mercados globais', en: 'See the global markets' },
  prefere: { pt: 'Prefere ver tudo?', en: 'Prefer to see everything?' },
  todos: { pt: 'Todos os setores', en: 'All sectors' },
  /** A dica de cada entrada: o primeiro traço da voz do país, e o idioma no global. */
  dica: {
    mz: { pt: 'proximidade', en: 'proximity' },
    pt: { pt: 'produtividade', en: 'productivity' },
    br: { pt: 'escala', en: 'scale' },
    global: { pt: 'em inglês · {n} mercados', en: 'in English · {n} markets' },
  } satisfies Record<CountryCode | 'global', Texto>,
} as const;

export const EXPLORADOR = {
  filtrar: { pt: 'Filtrar setores por país', en: 'Filter sectors by country' },
  emPreparacao: {
    pt: 'Página em preparação. O diagnóstico cobre este setor na mesma.',
    en: 'Page in preparation. The diagnostic still covers this sector.',
  },
  verSolucao: { pt: 'Ver solução', en: 'See solution' },
  solicitar: { pt: 'Solicitar diagnóstico', en: 'Request a diagnostic' },
  /** O cartão de cada mercado global: a página existe em inglês. */
  verMercado: { pt: 'Ver o mercado, em inglês', en: 'See the market' },
} as const;

export const PROVA = {
  tipo: {
    'conceptual-demo': { pt: 'Demonstração', en: 'Demonstration' },
    methodology: { pt: 'Método', en: 'Method' },
    capability: { pt: 'Capacidade', en: 'Capability' },
    'public-reference': { pt: 'Referência', en: 'Reference' },
  } satisfies Record<ProofItem['kind'], Texto>,
  fonte: { pt: 'Fonte →', en: 'Source →' },
} as const;

export const FUNDADORES = {
  /** `{nome}` é substituído pelo nome da pessoa. */
  linkedin: { pt: 'Perfil público de {nome} no LinkedIn', en: 'Public LinkedIn profile of {nome}' },
  certificacoes: { pt: 'Certificações', en: 'Certifications' },
} as const;

/** O conteúdo longo da página inicial no idioma pedido. */
export function conteudoDoInicio(idioma: Idioma) {
  if (idioma === 'en') {
    return {
      fluxo: SYSTEM_FLOW_EN,
      processo: PROCESS_EN,
      problemas: HOME_PROBLEMS_EN,
      risco: RISK_REDUCTION_EN,
      prova: PROOF_EN,
      provaSecao: PROOF_SECTION_EN,
      fundadores: {
        eyebrow: FOUNDERS_EN.eyebrow,
        title: FOUNDERS_EN.title,
        corpo: (foto: keyof typeof FOUNDERS_EN.body) => FOUNDERS_EN.body[foto] as string,
      },
      faq: HOME_FAQ_EN,
    };
  }
  return {
    fluxo: SYSTEM_FLOW,
    processo: PROCESS,
    problemas: HOME_PROBLEMS,
    risco: RISK_REDUCTION,
    prova: PROOF,
    provaSecao: PROOF_SECTION,
    fundadores: {
      eyebrow: FOUNDERS.eyebrow,
      title: FOUNDERS.title,
      corpo: (foto: keyof typeof FOUNDERS_EN.body) =>
        FOUNDERS.people.find((p) => p.photo === foto)!.body as string,
    },
    faq: HOME_FAQ,
  };
}
