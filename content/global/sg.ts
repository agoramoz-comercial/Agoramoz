import type { GlobalMarket } from '../types';

/**
 * Singapura — 2.º no scorecard (7,28). Centro onde famílias e grupos asiáticos
 * concentram estruturas, e onde o relatório consolidado é um produto em si.
 */
export const sg: GlobalMarket = {
  code: 'sg',
  name: { pt: 'Singapura', en: 'Singapore' },
  currency: 'SGD',
  dialCode: '+65',
  why: {
    pt: 'Segundo lugar no nosso scorecard. Concentra estruturas de várias jurisdições num só fuso horário — e é aí que a consolidação manual de dados se torna o custo invisível maior.',
    en: 'Second place in our scorecard. It concentrates structures from several jurisdictions in a single time zone — which is where manual data consolidation becomes the largest invisible cost.',
  },
  dataRegime: 'PDPA',
  investmentBands: [
    { id: 'sg-1', label: { pt: 'Até 7 500 SGD', en: 'Up to SGD 7,500' }, scoreWeight: 6 },
    { id: 'sg-2', label: { pt: '7 500 – 22 000 SGD', en: 'SGD 7,500 – 22,000' }, scoreWeight: 14 },
    { id: 'sg-3', label: { pt: '22 000 – 75 000 SGD', en: 'SGD 22,000 – 75,000' }, scoreWeight: 20 },
    { id: 'sg-4', label: { pt: 'Acima de 75 000 SGD', en: 'Over SGD 75,000' }, scoreWeight: 25 },
    { id: 'sg-0', label: { pt: 'Ainda a definir', en: 'Not yet defined' }, scoreWeight: 4 },
  ],
  consent: {
    text: {
      pt: 'Autorizo a AGORAMOZ a tratar os dados deste formulário para responder ao meu pedido e preparar o diagnóstico, nos termos do regime de proteção de dados aplicável (PDPA). Posso pedir o acesso, a retificação, a oposição ou a eliminação dos meus dados a qualquer momento.',
      en: 'I authorise AGORAMOZ to process the data in this form to answer my request and prepare the diagnostic, under the applicable data-protection regime (PDPA). I may request access to, correction of, objection to or erasure of my data at any time.',
    },
    policyHref: '/privacidade',
  },
  seo: {
    title: { pt: 'Automação documental e agentes de IA para empresas em Singapura', en: 'Document automation and AI agents for companies in Singapore' },
    description: { pt: 'Devolvemos horas qualificadas a empresas em Singapura que perdem tempo em trabalho documental. Preço fixo por fase, aprovação humana em cada decisão.', en: 'We give qualified hours back to Singapore companies losing time to document work. Fixed price per phase, human approval on every decision.' },
  },
  sectors: [
    {
      slug: 'family-offices',
      name: { pt: 'Family offices e holdings', en: 'Family offices and holdings' },
      pain: { pt: 'Consolidar posições de vários custodiantes e jurisdições num relatório que alguém monta à mão todos os meses.', en: 'Consolidating positions across custodians and jurisdictions into a report someone assembles by hand every month.' },
      outcome: { pt: 'O relatório sai sozinho, com a origem de cada número rastreável.', en: 'The report builds itself, with every figure traceable to its source.' },
    },
    {
      slug: 'comercio-maritimo',
      name: { pt: 'Comércio marítimo e afretamento', en: 'Maritime trade and chartering' },
      pain: { pt: 'Conhecimentos de embarque e cartas de crédito lidos e transcritos manualmente, com erros que só aparecem no porto.', en: 'Bills of lading and letters of credit read and retyped by hand, with errors that surface only at the port.' },
      outcome: { pt: 'Os dados entram extraídos e conferidos; o duvidoso vai a uma pessoa.', en: 'Data arrives extracted and checked; anything doubtful goes to a person.' },
    },
    {
      slug: 'servicos-financeiros',
      name: { pt: 'Serviços financeiros e fintech', en: 'Financial services and fintech' },
      pain: { pt: 'Processos de conhecimento do cliente repetidos a cada revisão, a pedir documentos que já existem.', en: 'Know-your-client processes repeated at each review, asking for documents that already exist.' },
      outcome: { pt: 'Um registo mestre por cliente que só pede o que mudou.', en: 'One master record per client that asks only for what changed.' },
    },
    {
      slug: 'logistica-cadeia',
      name: { pt: 'Logística e cadeia de abastecimento', en: 'Logistics and supply chain' },
      pain: { pt: 'Documentação aduaneira preenchida a partir de PDF, por pessoas, sob pressão de prazo.', en: 'Customs paperwork filled in from PDFs, by people, under deadline pressure.' },
      outcome: { pt: 'O preenchimento é automático e a excepção é que chega a alguém.', en: 'Filing is automatic and only the exception reaches a person.' },
    },
    {
      slug: 'biomedica',
      name: { pt: 'Biomédica e ciências da vida', en: 'Biomedical and life sciences' },
      pain: { pt: 'Submissões regulatórias montadas a partir de documentos com versões e validades distintas.', en: 'Regulatory submissions assembled from documents with different versions and expiry dates.' },
      outcome: { pt: 'Versão vigente evidente e prazos avisados antes de expirarem.', en: 'The current version is obvious and deadlines are flagged before they expire.' },
    },
    {
      slug: 'imobiliario-comercial',
      name: { pt: 'Imobiliário comercial', en: 'Commercial real estate' },
      pain: { pt: 'Contratos de arrendamento lidos um a um para extrair prazos, rendas e opções.', en: 'Lease contracts read one by one to extract terms, rents and options.' },
      outcome: { pt: 'As cláusulas que importam saem em tabela, com ligação ao parágrafo de origem.', en: 'The clauses that matter come out as a table, each linked to its source paragraph.' },
    },
    {
      slug: 'energia-commodities',
      name: { pt: 'Energia e negociação de commodities', en: 'Energy and commodity trading' },
      pain: { pt: 'Confirmações de negócio conciliadas à mão entre sistemas que não falam.', en: 'Trade confirmations reconciled by hand between systems that do not talk.' },
      outcome: { pt: 'A conciliação corre sozinha e só a diferença chega a alguém.', en: 'Reconciliation runs on its own and only the discrepancy reaches a person.' },
    },
    {
      slug: 'juridico',
      name: { pt: 'Serviços jurídicos', en: 'Legal services' },
      pain: { pt: 'Horas faturáveis gastas a recolher e formatar documentos antes de começar o trabalho que se vende.', en: 'Billable hours spent gathering and formatting documents before the work you actually sell begins.' },
      outcome: { pt: 'A recolha deixa de consumir horas faturáveis.', en: 'Gathering stops consuming billable hours.' },
    },
    {
      slug: 'engenharia-construcao',
      name: { pt: 'Engenharia e construção', en: 'Engineering and construction' },
      pain: { pt: 'Concursos com requisitos extensos respondidos a partir de e-mail e pastas partilhadas.', en: 'Tenders with long requirements answered out of email and shared folders.' },
      outcome: { pt: 'Cada requisito ligado ao documento que o satisfaz.', en: 'Every requirement linked to the document that satisfies it.' },
    },
    {
      slug: 'tecnologia-empresarial',
      name: { pt: 'Tecnologia empresarial', en: 'Enterprise technology' },
      pain: { pt: 'Questionários de segurança de clientes respondidos do zero, repetidamente, pelas mesmas pessoas.', en: 'Customer security questionnaires answered from scratch, repeatedly, by the same people.' },
      outcome: { pt: 'As respostas vêm pré-preenchidas de um repositório aprovado, com revisão humana.', en: 'Answers come pre-filled from an approved repository, with human review.' },
    },
  ],
};
