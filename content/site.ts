import { COUNTRIES, COUNTRY_CODES } from './registry';
import {
  BRAND_NAME,
  CTA_PRIMARY,
  CTA_SECONDARY,
  DEMO_DISCLAIMER,
  type Certification,
  type FaqItem,
  type Identity,
  type Problem,
  type ProofItem,
  type SocialLink,
} from './types';

export const SITE = {
  name: 'AGORAMOZ',
  /**
   * O domínio canónico, e é o que está no ar.
   *
   * O comentário anterior dizia «a presença pública atual ainda é
   * agoramoz.online» — deixou de ser verdade e ninguém o atualizou. Medido a
   * 2026-09-24: `https://agoramoz.com/` responde 200, o canonical que serve
   * aponta para si próprio e o sitemap publica 16 URL em `agoramoz.com`.
   * Deixá-lo escrito importa porque é daqui que saem todos os canonical,
   * hreflang e `@id` — um comentário errado sobre o domínio é a coisa mais
   * fácil de alguém acreditar e a mais cara de desfazer depois de indexada.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://agoramoz.com',
  /** A tagline do documento mestre (§2). A categoria vai no eyebrow do hero. */
  tagline: 'Do processo fragmentado ao sistema que funciona',
  description:
    'A AGORAMOZ organiza os processos, dados e sistemas de empresas em crescimento: diagnóstico, software, automação, integrações e IA, por fases controladas.',
  email: 'comercial@agoramoz.com',
  /**
   * Um número para os três mercados. O WhatsApp é internacional e não custa
   * nada a quem liga de Portugal ou do Brasil — por isso o canal é da empresa,
   * não de um país. Uma linha local, se um dia existir, entra em
   * `Country.whatsapp` e ganha precedência sobre este.
   */
  whatsapp: { e164: '258824780097', display: '+258 82 478 0097' },
} as const;

/* ------------------------------------------------------------------- canais */

/**
 * Canais públicos da AGORAMOZ. Fonte única — o rodapé, a página de contactos,
 * o menu móvel e o JSON-LD leem todos daqui. Acrescentar uma rede é acrescentar
 * uma linha a este array; nenhum componente precisa de saber que ela existe.
 *
 * POR PREENCHER: Facebook, YouTube, X e TikTok, se existirem. O tipo já os
 * aceita — falta a URL de cada um.
 */
export const SOCIAL: readonly SocialLink[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    handle: 'AGORAMOZ',
    href: 'https://www.linkedin.com/company/agoramoz',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@agoramoz',
    href: 'https://www.instagram.com/agoramoz',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    handle: SITE.whatsapp.display,
    href: `https://wa.me/${SITE.whatsapp.e164}`,
  },
] as const;

/* ---------------------------------------------------------------- identidade */

/**
 * A identidade da empresa, numa fonte só.
 *
 * Não é um módulo novo de propósito. Este repositório já pagou por uma fonte
 * dupla de verdade — o comentário em `registry.ts` regista as quatro ligações
 * mortas que ela produziu — e uma segunda declaração do nome, do e-mail ou do
 * telefone divergiria da primeira ao fim de uma edição. Aqui, `IDENTITY`
 * **compõe** `SITE`, `SOCIAL` e o registry; não copia nada.
 *
 * Os três campos que a AGORAMOZ não tem — morada, coordenadas e horário —
 * ficam `'unknown'`, que é uma afirmação e não uma omissão: a empresa é de
 * área de serviço, sem morada pública, e foi isso que o fundador confirmou.
 * Enquanto assim for, o gerador de `LocalBusiness` é inalcançável pelo
 * compilador, não por um `if` que alguém possa apagar.
 */
export const IDENTITY: Identity = {
  /** Por preencher: nome registado e NUIT. Ver B-11 em docs/GAPS.md. */
  legalName: null,
  tradingName: BRAND_NAME,
  url: SITE.url,
  /**
   * O logo oficial sobre preto, quadrado, 512×512 — gerado por
   * `.qa/icones.mjs` a partir de `logo-dark-bg.png`, com margem para o
   * recorte circular do Google. O teste confirma o ficheiro e as medidas.
   */
  logo: { url: `${SITE.url}/brand/logo-preto-512.png`, width: 512, height: 512 },
  /**
   * É a linha de WhatsApp, e é a única que existe. Não invento um fixo para
   * o `contactPoint` ficar mais completo.
   */
  telephone: SITE.whatsapp,
  email: SITE.email,
  address: { status: 'unknown' },
  geo: { status: 'unknown' },
  openingHours: { status: 'unknown' },
  /** Dos países publicados, não de uma lista à parte que envelheceria. */
  serviceAreas: COUNTRY_CODES.map((c) => ({
    code: c.toUpperCase() as 'MZ' | 'PT' | 'BR',
    name: COUNTRIES[c].name,
  })),
  socialProfiles: SOCIAL,
};

export const CTA = { primary: CTA_PRIMARY, secondary: CTA_SECONDARY } as const;

/* ---------------------------------------------------------------- navegação */

/**
 * As soluções NÃO vivem aqui. Duplicavam slug, label e short dos ficheiros de
 * conteúdo e já tinham divergido — foi essa duplicação que produziu quatro
 * ligações para páginas que não existiam. A navegação lê agora
 * `getSolutionSummaries()` do registry, pelo que só pode apontar para o que
 * está publicado.
 */
export const NAV = {
  primary: [
    { href: '/como-trabalhamos', label: 'Como trabalhamos' },
    { href: '/sobre', label: 'Sobre' },
    { href: '/contactos', label: 'Contactos' },
  ],
  /**
   * Só no rodapé: o cabeçalho já tem o mega-menu «Setores» (por país) e uma
   * entrada a mais mudava-lhe a forma — o design não muda.
   */
  secundaria: [
    { href: '/setores', label: 'Setores' },
    { href: '/seguranca-qualidade', label: 'Segurança e qualidade' },
    { href: '/faq', label: 'Perguntas frequentes' },
  ],
} as const;

/* ------------------------------------------------- oferta de entrada (§9/13) */

export const OFFER = {
  name: 'Diagnóstico Operacional Digital',
  eyebrow: 'Oferta de entrada',
  title: 'Saiba onde intervir antes de comprar tecnologia.',
  promise:
    'O diagnóstico transforma um problema pouco definido numa decisão executiva com processo, prioridades, riscos, opções e próximos passos claros.',
  deliverables: [
    'Definição do problema e mapa atual',
    'Inventário de sistemas e dados relevantes',
    'Baseline e matriz de bloqueios',
    'Riscos e dependências',
    'Desenho conceptual do processo futuro',
    'Opções e prioridades',
    'Arquitetura conceptual',
    'Estimativa paramétrica e premissas',
    'Roadmap e recomendação executiva',
    'Decisão sobre piloto ou implementação',
  ],
  note: 'O diagnóstico pode concluir que não deve investir. Essa recomendação também é um resultado.',
} as const;

/* ------------------------------------------------------- sistema e processo */

export const SYSTEM_FLOW = {
  eyebrow: 'O sistema',
  title: 'Construímos o sistema entre o problema e o resultado.',
  lead: 'Em vez de entregar ferramentas isoladas, desenhamos uma infraestrutura em que website, software, automação, dados e inteligência artificial funcionam como um único sistema.',
  steps: [
    { key: 'atrair', title: 'Atrair', body: 'Presença digital que chega à empresa certa, com a mensagem do problema que ela reconhece.' },
    { key: 'captar', title: 'Captar', body: 'Cada pedido entra por um caminho definido, com os dados necessários para ser tratado.' },
    { key: 'qualificar', title: 'Qualificar', body: 'O sistema separa o que é urgente, o que é adequado e o que deve esperar.' },
    { key: 'acompanhar', title: 'Acompanhar', body: 'Cada oportunidade fica registada com responsável e prazo, em vez de esperar que alguém se lembre dela.' },
    { key: 'entregar', title: 'Entregar', body: 'A operação recebe informação estruturada, não mensagens dispersas por vários canais.' },
    { key: 'medir', title: 'Medir', body: 'Vendas, operações e bloqueios ficam visíveis em dados simples e atualizados.' },
    { key: 'melhorar', title: 'Melhorar', body: 'A medição alimenta a prioridade seguinte. O sistema evolui com a utilização real.' },
  ],
} as const;

export const PROCESS = {
  eyebrow: 'Como trabalhamos',
  title: 'Reduzimos uma incerteza em cada fase.',
  lead: 'Não começamos por desenvolver. Começamos por compreender a decisão, o processo, os utilizadores e o resultado esperado. O cliente aprova cada fase antes de assumir o compromisso da seguinte.',
  steps: [
    {
      title: 'Enquadramento',
      body: 'Existe um problema suficientemente importante e adequado?',
      entrega: 'Problema preliminar, sponsor, processo e elegibilidade.',
      gate: 'Avançar, reenquadrar ou não prosseguir.',
    },
    {
      title: 'Diagnóstico',
      body: 'Onde está a causa e que intervenção é defensável?',
      entrega: 'Mapa atual, baseline, arquitetura conceptual, opções, business case e roadmap.',
      gate: 'Não fazer, corrigir, comprar, integrar, pilotar ou desenvolver.',
    },
    {
      title: 'Piloto',
      body: 'A solução funciona num contexto real e limitado?',
      entrega: 'Protótipo ou fluxo funcional, integração mínima, utilizadores e métricas.',
      gate: 'Escalar, rever ou cancelar.',
    },
    {
      title: 'Implementação',
      body: 'A solução cumpre requisitos e critérios de aceitação?',
      entrega: 'Configuração, desenvolvimento, integrações, segurança, testes, documentação e formação.',
      gate: 'Aceitar, corrigir ou adiar a entrada em produção.',
    },
    {
      title: 'Estabilização',
      body: 'A operação utiliza o sistema de forma consistente?',
      entrega: 'Suporte, correções, adoção e medição inicial.',
      gate: 'Entrar em evolução, prolongar a estabilização ou encerrar.',
    },
    {
      title: 'Evolução',
      body: 'Que melhoria cria maior valor agora?',
      entrega: 'Backlog priorizado, releases e medição.',
      gate: 'Executar, adiar ou abandonar cada item.',
    },
  ],
} as const;

/** O que o cliente assume para que as fases funcionem (Website Final 2026, §9). */
export const CLIENT_RESPONSIBILITIES = {
  eyebrow: 'Responsabilidades do cliente',
  title: 'Um sistema adoptado precisa de decisões dos dois lados.',
  points: [
    'Nomear sponsor e owner operacional.',
    'Disponibilizar utilizadores, dados e documentação autorizada.',
    'Tomar decisões nos gates.',
    'Validar requisitos, protótipos, testes e aceitação.',
    'Preparar comunicação, formação e adoção.',
  ],
} as const;

/* ------------------------------------------------------- problemas (home §3) */

export const HOME_PROBLEMS: Problem[] = [
  {
    title: 'Oportunidades perdidas',
    body: 'Pedidos chegam por vários canais, mas ninguém sabe exatamente quem deve responder ou acompanhar.',
  },
  {
    title: 'Operações manuais',
    body: 'A equipa copia dados, atualiza folhas, prepara documentos e responde repetidamente às mesmas questões.',
  },
  {
    title: 'Sistemas desconectados',
    body: 'Website, WhatsApp, email, CRM e ferramentas internas funcionam separadamente.',
  },
  {
    title: 'Decisões sem visibilidade',
    body: 'A gestão não possui dados simples e atualizados sobre vendas, operações, clientes e bloqueios.',
  },
];

/* ------------------------------------------------------------ redução de risco */

export const RISK_REDUCTION = {
  eyebrow: 'Redução de risco',
  title: 'Escopo, responsabilidades e critérios claros antes de começar.',
  body: 'Cada projeto define entregáveis, dependências, acessos, critérios de aceitação, proteção de dados, suporte e exclusões. Não prometemos resultados comerciais fora do nosso controlo. Comprometemo-nos com a qualidade e o funcionamento dos componentes acordados.',
  points: [
    'Entregáveis e exclusões escritos antes do início',
    'Critérios de aceitação definidos com o cliente',
    'Dependências e acessos identificados à partida',
    'Proteção de dados e supervisão humana em decisões críticas',
  ],
} as const;

/* ------------------------------------------------------------------ prova (§10) */

export const PROOF: ProofItem[] = [
  {
    kind: 'methodology',
    title: 'O diagnóstico vem antes da proposta',
    body: 'Não apresentamos arquitetura sem ter mapeado o processo atual. Se o diagnóstico concluir que não há adequação, dizemo-lo — e não há proposta.',
  },
  {
    kind: 'capability',
    title: 'Integração com o que já existe',
    body: 'Trabalhamos sobre os sistemas que a empresa já usa, quando existem APIs, permissões e documentação. A viabilidade é validada antes da proposta final, não depois do contrato.',
    evidence: 'A validação de viabilidade é uma fase do diagnóstico, com resultado escrito.',
  },
  {
    kind: 'conceptual-demo',
    title: 'Portal de operações logísticas',
    body: 'Pedidos, estados, notificações ao cliente e painel operacional num único fluxo — desenhado para mostrar a lógica antes de a implementar.',
    disclaimer: DEMO_DISCLAIMER,
  },
  {
    kind: 'conceptual-demo',
    title: 'Qualificação comercial automatizada',
    body: 'Um pedido entra, é classificado por adequação e urgência, e é encaminhado com o contexto necessário para quem tem de responder.',
    disclaimer: DEMO_DISCLAIMER,
  },
];

export const PROOF_SECTION = {
  eyebrow: 'Prova',
  title: 'Veja como desenhamos soluções antes de as implementar.',
  lead: 'A AGORAMOZ é uma empresa recente. Em vez de apresentar resultados que ainda não temos, mostramos o raciocínio, o método e demonstrações identificadas como tal.',
} as const;

/* ---------------------------------------------------------------- fundadores */

/**
 * Quem lidera.
 *
 * `certifications` está vazio de propósito, não por esquecimento. As
 * credenciais de cada fundador vivem nos perfis do LinkedIn e não foram
 * transcritas para aqui — inventar uma certificação seria a mesma falha que
 * inventar um cliente, com o agravante de ser uma afirmação sobre uma pessoa
 * real. A secção de credenciais só aparece no site quando este array deixar de
 * estar vazio; enquanto estiver, o bloco não é renderizado de todo.
 *
 * Para preencher, uma entrada por credencial:
 *   { name: 'Nome da certificação', issuer: 'Entidade emissora', year: '2024' }
 * `issuer` é obrigatório — ver a nota em `content/types.ts`.
 *
 * `photo` é um IDENTIFICADOR, não um caminho. O ficheiro é importado em
 * `components/sections/Founders.tsx`, onde um `Record` sobre estes literais
 * obriga o compilador a ter uma entrada para cada pessoa: acrescentar um
 * fundador sem retrato deixa de compilar. Um caminho escrito aqui não daria
 * essa garantia — e este módulo é lido por testes que correm sem loader de
 * imagens, pelo que a importação não pode viver neste ficheiro.
 */
export const FOUNDERS = {
  eyebrow: 'Quem lidera',
  title: 'Estratégia, tecnologia e desenvolvimento de oportunidades.',
  people: [
    {
      name: 'Gerson Samussene',
      role: 'Founder & CEO',
      photo: 'gerson',
      body: 'Responsável por estratégia digital, sistemas de crescimento, automação e inteligência artificial.',
      linkedin: 'https://mz.linkedin.com/in/gerson-samussene-95b7a322b',
      certifications: [] as readonly Certification[],
    },
    {
      name: 'Sheinaz Amisse',
      role: 'Co-founder & Chief Energy Officer',
      photo: 'sheinaz',
      body: 'Responsável por parcerias estratégicas, oportunidades, investimento e desenvolvimento no setor energético.',
      linkedin: 'https://mz.linkedin.com/in/sheinaz-amisse',
      certifications: [] as readonly Certification[],
    },
  ],
} as const;

/* ----------------------------------------------------------------- FAQ global */

export const HOME_FAQ: FaqItem[] = [
  {
    q: 'A AGORAMOZ trabalha apenas com grandes empresas?',
    a: 'Não. Trabalhamos com empresas que possuem um problema economicamente relevante, um responsável interno e capacidade para implementar a solução.',
  },
  {
    q: 'Que tecnologias utilizam?',
    a: 'Selecionamos a arquitetura em função do problema, da segurança, da integração, da manutenção e do custo total. A ferramenta é uma decisão técnica, não o produto.',
  },
  {
    q: 'Conseguem integrar com os sistemas que já usamos?',
    a: 'Depende da existência de APIs, permissões, documentação e requisitos de segurança. A viabilidade é validada antes da proposta final.',
  },
  {
    q: 'A inteligência artificial substitui colaboradores?',
    a: 'O objetivo principal é apoiar pessoas, reduzir tarefas repetitivas e melhorar o acesso à informação. Decisões críticas devem manter controlo e supervisão humana.',
  },
  {
    q: 'Garantem aumento de vendas?',
    a: 'Não. Não garantimos resultados que dependem da procura, da oferta, do preço, da equipa comercial ou da execução do cliente. Comprometemo-nos, por contrato, com os entregáveis e os critérios de aceitação acordados.',
  },
  {
    q: 'Quanto custa?',
    a: 'O investimento depende do processo, das integrações, do risco e do escopo. O diagnóstico determina se é necessária uma solução simples, um sprint ou um sistema personalizado.',
  },
];

/* --------------------------------------------- o que o visitante quer melhorar */

export const IMPROVEMENT_GOALS = [
  { value: 'aquisicao', label: 'Geração e conversão de oportunidades', solution: 'websites-avancados' },
  { value: 'atendimento', label: 'Atendimento', solution: 'agentes-ia' },
  { value: 'operacoes', label: 'Operações', solution: 'software-empresarial' },
  { value: 'administrativo', label: 'Trabalho administrativo', solution: 'automacao-de-processos' },
  { value: 'integracao', label: 'Integração de sistemas', solution: 'integracao-de-sistemas' },
  { value: 'informacao', label: 'Acesso à informação', solution: 'agentes-ia' },
  { value: 'experiencia', label: 'Experiência digital', solution: 'websites-avancados' },
  { value: 'reporting', label: 'Reporting e decisão', solution: 'software-empresarial' },
] as const;

export type ImprovementGoal = (typeof IMPROVEMENT_GOALS)[number]['value'];

/* -------------------------------- Website Final 2026: confiança (§18–§22) */

/** Setores e processos de entrada (§18). Uma lista de setores não é uma proposta de valor. */
export const SETORES_2026 = {
  eyebrow: 'Setores',
  title: 'Começamos por um processo, não por uma lista de setores.',
  lead: 'Cada setor tem um processo crítico, quem o compra e uma oferta de entrada. Só publicamos uma página setorial quando há linguagem, processo, prova e capacidade demonstráveis — por isso, hoje, a única completa é energia, mineração e serviços industriais.',
  itens: [
    {
      nome: 'Serviços B2B',
      processo: 'Pedido → proposta → entrega → faturação',
      compradores: 'Direção, Comercial, Operações',
      oferta: 'Diagnóstico do fluxo comercial-operacional',
      href: '/diagnostico?pais=mz&setor=comercio-servicos',
    },
    {
      nome: 'Logística e transportes',
      processo: 'Ordem → execução → ocorrência → prova → faturação',
      compradores: 'Operações, Financeiro, TI',
      oferta: 'Piloto de ordem e visibilidade',
      href: '/diagnostico?pais=mz&setor=logistica',
    },
    {
      nome: 'Energia, mineração e serviços industriais',
      processo: 'Ativo → inspeção → ação → evidência',
      compradores: 'Operações, HSE, TI, Procurement',
      oferta: 'Diagnóstico de processo crítico',
      href: '/mz/energia-mineracao',
    },
    {
      nome: 'Construção e imobiliário',
      processo: 'Orçamento → alteração → material → medição → cobrança',
      compradores: 'Direção de obra, Financeiro',
      oferta: 'Controlo de projeto e documentos',
      href: '/diagnostico?pais=mz&setor=construcao-imobiliario',
    },
    {
      nome: 'Agricultura e agronegócio',
      processo: 'Fornecedor → produção → recolha → qualidade → distribuição',
      compradores: 'Operações, Qualidade',
      oferta: 'Diagnóstico de rastreabilidade',
      href: '/diagnostico?pais=mz&setor=agronegocio',
    },
    {
      nome: 'Desenvolvimento internacional',
      processo: 'Campo → validação → consolidação → reporting',
      compradores: 'Programa, M&E, TI',
      oferta: 'Fluxo de dados e reporting',
      href: '/diagnostico',
    },
  ],
} as const;

/** Sobre (§19): princípios, como medimos e a regra de prova. */
export const SOBRE_2026 = {
  title: 'Tecnologia depois do problema. Responsabilidade depois da entrada em produção.',
  lead: 'A AGORAMOZ trabalha na ligação entre estratégia operacional e implementação tecnológica. Começa pela mudança empresarial necessária e determina a combinação adequada de processo, software, automação, integração, infraestrutura ou inteligência artificial.',
  principiosTitulo: 'Princípios',
  principios: [
    { title: 'A tecnologia não corrige um problema mal definido.', body: 'Por isso o diagnóstico vem antes da proposta.' },
    { title: 'Nem todo o processo deve ser automatizado.', body: 'Sem owner, com regras instáveis ou dados fracos, automatizar multiplica o problema.' },
    { title: 'Nem toda a empresa precisa de software próprio.', body: 'Configurar, integrar ou comprar pode ser a resposta certa.' },
    { title: 'Um protótipo pode evitar uma implementação errada.', body: 'Validamos a experiência num contexto real e limitado antes de construir.' },
    { title: 'A adoção faz parte do sistema.', body: 'Um sistema que a equipa não usa não resolveu nada.' },
    { title: 'Segurança e continuidade não se acrescentam no fim.', body: 'Acessos, dados, dependências e incidentes entram na arquitetura.' },
    { title: 'O cliente deve compreender e governar o que recebe.', body: 'Documentação, formação e responsabilidades definidas.' },
    { title: 'A entrada em produção é o início da utilização.', body: 'A estabilização e a evolução são contratadas com âmbito e níveis de serviço.' },
  ],
  comoMedimos:
    'Tempo, erros, capacidade, visibilidade, utilização, qualidade, receita, custo, risco, satisfação e continuidade — conforme o projeto e a baseline disponível.',
  prova:
    'Não publicamos resultados, clientes, certificações, anos de experiência, presença geográfica ou parcerias sem autorização e evidência verificável.',
} as const;

/** Segurança, privacidade e qualidade (§21). Explica controlos; não promete conformidade automática. */
export const SEGURANCA_2026 = {
  eyebrow: 'Confiança',
  title: 'Controlo desde o desenho. Evidência antes do claim.',
  lead: 'Explicamos o modelo operacional e os controlos disponíveis — sem prometer conformidade automática, segurança absoluta ou certificações que não existem.',
  security: {
    title: 'Security pack mínimo',
    lead: 'O que cada projeto documenta sobre proteção e governo, antes da entrada em produção.',
    points: [
      'Responsabilidades e contactos.',
      'Gestão de acessos e credenciais.',
      'Ambientes e segregação.',
      'Backups e recuperação.',
      'Logs e monitorização.',
      'Gestão de vulnerabilidades.',
      'Incidentes e escalamento.',
      'Subcontratantes e dependências.',
      'Retenção e eliminação.',
      'Continuidade e saída do serviço.',
    ],
  },
  quality: {
    title: 'Quality pack mínimo',
    lead: 'O que torna uma entrega testável e aceitável — escrito, não implícito.',
    points: [
      'Definition of ready e definition of done.',
      'Critérios de aceitação.',
      'Estratégia de testes.',
      'Gestão de defeitos.',
      'Revisão de código e configuração.',
      'Gestão de alterações.',
      'Documentação.',
      'Entrada em produção e rollback.',
      'Estabilização.',
    ],
  },
  mercados: {
    title: 'O que dizemos em cada mercado',
    lead: 'A validação jurídica pertence às partes competentes. Esta é a linguagem que usamos — e a que não usamos.',
    itens: [
      { title: 'Moçambique', body: 'Aplicamos os controlos técnicos e operacionais acordados e validamos requisitos regulatórios específicos com as partes competentes.' },
      { title: 'Portugal', body: 'Implementamos medidas técnicas e organizativas no âmbito contratado; a base legal e a conformidade final requerem validação do cliente e aconselhamento competente.' },
      { title: 'Brasil', body: 'Apoiamos controles técnicos para tratamento de dados; não substituímos a função jurídica, de privacidade ou de encarregado.' },
      { title: 'Global', body: 'Não descrevemos um projeto como «globalmente conforme» sem revisão por jurisdição.' },
    ],
  },
} as const;

/** FAQ comercial (§22): objeções reais antes de avançar. */
export const FAQ_2026 = {
  eyebrow: 'Perguntas frequentes',
  title: 'O que nos perguntam antes de avançar.',
  lead: 'Respostas diretas às objeções mais comuns — incluindo as que dizem o que não fazemos.',
  items: [
    { q: 'A avaliação inicial é gratuita?', a: 'Pode existir uma avaliação limitada para determinar elegibilidade. Trabalho que envolva entrevistas, mapeamento, análise, arquitetura ou recomendação executiva deve ser contratado.' },
    { q: 'O diagnóstico obriga a contratar a implementação?', a: 'Não. O cliente pode não avançar, executar internamente ou contratar outro fornecedor, conforme os termos acordados.' },
    { q: 'Trabalham com sistemas existentes?', a: 'Sim, quando a integração é tecnicamente viável, segura e economicamente defensável.' },
    { q: 'Fazem apenas software à medida?', a: 'Não. A recomendação pode incluir configuração, integração, automação, produto existente, mudança de processo ou desenvolvimento próprio.' },
    { q: 'Conseguem apresentar preço fechado?', a: 'Quando o escopo e as dependências são suficientemente conhecidos. Caso contrário, recomendamos discovery, piloto ou preço por fase.' },
    { q: 'Quem é proprietário do código?', a: 'Propriedade, licenças, componentes preexistentes e direitos de utilização são definidos contratualmente.' },
    { q: 'Prestam suporte após o lançamento?', a: 'Pode ser contratada estabilização, suporte e evolução com âmbito e níveis de serviço definidos.' },
    { q: 'Conseguem garantir resultados?', a: 'Não garantimos resultados dependentes de adoção, procura, decisões do cliente ou fatores externos. Definimos métricas, responsabilidades e critérios.' },
    { q: 'Trabalham com dados pessoais?', a: 'Sim, mediante definição de papéis, requisitos e controlos. A validação jurídica continua a pertencer às partes competentes.' },
    { q: 'Fazem projetos internacionais?', a: 'Sim, sujeitos a avaliação de jurisdição, contratação, moeda, impostos, dados, suporte e capacidade.' },
  ],
} as const;
