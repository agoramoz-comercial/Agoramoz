import {
  CTA_PRIMARY,
  CTA_SECONDARY,
  DEMO_DISCLAIMER,
  type Certification,
  type FaqItem,
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
  tagline: 'Infraestrutura digital para crescimento e produtividade',
  description:
    'A AGORAMOZ desenvolve websites avançados, software, automações e agentes de IA adaptados aos processos da sua empresa, em Moçambique, Portugal e Brasil.',
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
} as const;

/* ------------------------------------------------- oferta de entrada (§9/13) */

export const OFFER = {
  name: 'AGORA Opportunity Diagnostic',
  eyebrow: 'Oferta de entrada',
  title: 'Comece pelo sistema que resolve o bloqueio mais importante.',
  promise:
    'Um diagnóstico para identificar onde a sua empresa perde oportunidades, tempo ou capacidade operacional — e qual a arquitetura de maior impacto.',
  deliverables: [
    'Entrevista com os responsáveis pelo processo',
    'Mapa do processo atual, ponta a ponta',
    'Identificação das fricções e dos pontos de perda',
    'Análise dos dados que já existem na empresa',
    'Prioridades ordenadas por impacto e esforço',
    'Arquitetura recomendada',
    'Plano de implementação',
    'Proposta de execução apenas quando existir adequação',
  ],
  note: 'Conversa objetiva. Problema definido. Próximos passos claros.',
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
    { key: 'acompanhar', title: 'Acompanhar', body: 'Nenhuma oportunidade fica parada à espera de alguém se lembrar dela.' },
    { key: 'entregar', title: 'Entregar', body: 'A operação recebe informação estruturada, não mensagens dispersas por vários canais.' },
    { key: 'medir', title: 'Medir', body: 'Vendas, operações e bloqueios ficam visíveis em dados simples e atualizados.' },
    { key: 'melhorar', title: 'Melhorar', body: 'A medição alimenta a prioridade seguinte. O sistema evolui com a utilização real.' },
  ],
} as const;

export const PROCESS = {
  eyebrow: 'Como trabalhamos',
  title: 'Tecnologia depois do diagnóstico.',
  lead: 'A ferramenta é uma decisão técnica, não o produto. Primeiro percebemos o processo, o volume, o atraso e o custo provável da ineficiência.',
  steps: [
    { title: 'Diagnóstico', body: 'Mapeamos o processo, os volumes, os atrasos, os erros e o custo provável da ineficiência.' },
    { title: 'Arquitetura', body: 'Definimos o fluxo, os dados, as integrações, as responsabilidades e os critérios de aceitação.' },
    { title: 'Protótipo', body: 'Demonstramos a experiência e validamos a lógica antes da implementação completa.' },
    { title: 'Implementação', body: 'Desenvolvemos, integramos, testamos e documentamos.' },
    { title: 'Ativação', body: 'Formamos a equipa, acompanhamos a utilização e corrigimos bloqueios técnicos.' },
    { title: 'Evolução', body: 'Melhoramos o sistema com base em utilização, dados e prioridade económica.' },
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
    body: 'Pedidos, estados, notificações ao cliente e painel operacional num único fluxo — construído para mostrar a lógica antes de a implementar.',
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
 */
export const FOUNDERS = {
  eyebrow: 'Quem lidera',
  title: 'Estratégia, tecnologia e desenvolvimento de oportunidades.',
  people: [
    {
      name: 'Gerson Samussene',
      role: 'Founder & CEO',
      body: 'Responsável por estratégia digital, sistemas de crescimento, automação e inteligência artificial.',
      linkedin: 'https://mz.linkedin.com/in/gerson-samussene-95b7a322b',
      certifications: [] as readonly Certification[],
    },
    {
      name: 'Sheinaz de Sousa Amisse',
      role: 'Co-founder & Chief Energy Officer',
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
    a: 'Não. Não garantimos resultados que dependem da procura, da oferta, do preço, da equipa comercial ou da execução do cliente. Garantimos os compromissos técnicos e operacionais definidos contratualmente.',
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
  { value: 'integracao', label: 'Integração de sistemas', solution: 'infraestrutura-digital' },
  { value: 'informacao', label: 'Acesso à informação', solution: 'agentes-ia' },
  { value: 'experiencia', label: 'Experiência digital', solution: 'websites-avancados' },
  { value: 'reporting', label: 'Reporting e decisão', solution: 'software-empresarial' },
] as const;

export type ImprovementGoal = (typeof IMPROVEMENT_GOALS)[number]['value'];
