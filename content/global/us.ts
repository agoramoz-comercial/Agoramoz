import type { GlobalMarket } from '../types';

/**
 * Estados Unidos — 3.º no scorecard (7,11) e o mais alto em capital (10,0). O
 * ângulo é volume: o mesmo processo repetido milhares de vezes.
 */
export const us: GlobalMarket = {
  code: 'us',
  name: { pt: 'Estados Unidos', en: 'United States' },
  currency: 'USD',
  dialCode: '+1',
  why: {
    pt: 'O que torna este mercado interessante não é o tamanho — é a repetição: processos documentais idênticos corridos muitas vezes por mês.',
    en: 'What makes this market interesting is not size but repetition: identical document processes run many times a month.',
  },
  dataRegime: 'Regimes estaduais (CCPA/CPRA e equivalentes)',
  investmentBands: [
    { id: 'us-1', label: { pt: 'Até 5 500 USD', en: 'Up to USD 5,500' }, scoreWeight: 6 },
    { id: 'us-2', label: { pt: '5 500 – 16 000 USD', en: 'USD 5,500 – 16,000' }, scoreWeight: 14 },
    { id: 'us-3', label: { pt: '16 000 – 55 000 USD', en: 'USD 16,000 – 55,000' }, scoreWeight: 20 },
    { id: 'us-4', label: { pt: 'Acima de 55 000 USD', en: 'Over USD 55,000' }, scoreWeight: 25 },
    { id: 'us-0', label: { pt: 'Ainda a definir', en: 'Not yet defined' }, scoreWeight: 4 },
  ],
  consent: {
    text: {
      pt: 'Autorizo a AGORAMOZ a tratar os dados deste formulário para responder ao meu pedido e preparar o diagnóstico, nos termos do regime de proteção de dados aplicável (regimes estaduais, como a CCPA/CPRA). Posso pedir o acesso, a retificação, a oposição ou a eliminação dos meus dados a qualquer momento.',
      en: 'I authorise AGORAMOZ to process the data in this form to answer my request and prepare the diagnostic, under the applicable data-protection regime (US state privacy laws, such as CCPA/CPRA). I may request access to, correction of, objection to or erasure of my data at any time.',
    },
    policyHref: '/privacidade',
  },
  seo: {
    title: { pt: 'Automação documental e agentes de IA para empresas nos Estados Unidos', en: 'Document automation and AI agents for companies in the United States' },
    description: {
      pt: 'Automação documental para empresas norte-americanas: um processo crítico de cada vez, preço por fase e aprovação humana nas decisões críticas.',
      en: 'Document automation for US companies: one critical process at a time, priced per phase, with human approval on critical decisions.',
    },
  },
  sectors: [
    {
      slug: 'saude-faturacao',
      name: { pt: 'Saúde e faturação clínica', en: 'Healthcare and medical billing' },
      pain: { pt: 'Autorizações e recusas tratadas à mão, documento a documento, por pessoal clínico.', en: 'Authorisations and denials handled by hand, document by document, by clinical staff.' },
      outcome: { pt: 'A triagem é automática e o caso chega já resumido a quem decide.', en: 'Triage is automatic and the case reaches the decision-maker already summarised.' },
    },
    {
      slug: 'seguros',
      name: { pt: 'Seguros', en: 'Insurance' },
      pain: { pt: 'Sinistros com anexos em formatos diferentes, lidos antes de chegarem ao analista.', en: 'Claims with attachments in different formats, read before they reach the analyst.' },
      outcome: { pt: 'O analista recebe o caso resumido, com o original sempre à mão.', en: 'The analyst receives the case summarised, with the original always at hand.' },
    },
    {
      slug: 'servicos-juridicos',
      name: { pt: 'Serviços jurídicos', en: 'Legal services' },
      pain: { pt: 'Descoberta e revisão documental faturadas à hora, feitas por juniores.', en: 'Discovery and document review billed hourly, done by juniors.' },
      outcome: { pt: 'A primeira passagem é automática; o júnior revê em vez de ler tudo.', en: 'The first pass is automatic; the junior reviews instead of reading everything.' },
    },
    {
      slug: 'imobiliario',
      name: { pt: 'Imobiliário e hipotecário', en: 'Real estate and mortgage' },
      pain: { pt: 'Processos com dezenas de documentos verificados manualmente antes do fecho.', en: 'Files with dozens of documents verified by hand before closing.' },
      outcome: { pt: 'A verificação corre sozinha e a excepção é que sobe.', en: 'Verification runs on its own and only the exception escalates.' },
    },
    {
      slug: 'logistica-transportes',
      name: { pt: 'Logística e transportes', en: 'Logistics and transportation' },
      pain: { pt: 'Guias e faturas de transporte conciliadas contra contratos, à mão.', en: 'Freight bills reconciled against contracts by hand.' },
      outcome: { pt: 'A conciliação é automática e só a diferença chega a alguém.', en: 'Reconciliation is automatic and only the discrepancy reaches a person.' },
    },
    {
      slug: 'industria',
      name: { pt: 'Indústria e fabricação', en: 'Manufacturing' },
      pain: { pt: 'Pedidos de cotação em PDF que demoram dias porque alguém os transcreve.', en: 'PDF quote requests that take days because someone retypes them.' },
      outcome: { pt: 'A cotação parte de dados já extraídos e revistos.', en: 'The quote starts from data already extracted and reviewed.' },
    },
    {
      slug: 'servicos-financeiros',
      name: { pt: 'Serviços financeiros', en: 'Financial services' },
      pain: { pt: 'Conformidade documental repetida a cada revisão de cliente.', en: 'Documentary compliance repeated at every client review.' },
      outcome: { pt: 'Um registo mestre que alimenta cada revisão.', en: 'One master record feeding every review.' },
    },
    {
      slug: 'construcao',
      name: { pt: 'Construção', en: 'Construction' },
      pain: { pt: 'Submissões e ordens de alteração espalhadas por e-mail, sem estado partilhado.', en: 'Submittals and change orders scattered across email, with no shared state.' },
      outcome: { pt: 'Estado único e visível, com histórico intacto.', en: 'A single visible state, with history intact.' },
    },
    {
      slug: 'energia-utilities',
      name: { pt: 'Energia e utilities', en: 'Energy and utilities' },
      pain: { pt: 'Relatórios regulatórios montados a partir de sistemas que não se falam.', en: 'Regulatory reports assembled from systems that do not talk to each other.' },
      outcome: { pt: 'O relatório monta-se sozinho, com cada número rastreável.', en: 'The report assembles itself, with every figure traceable.' },
    },
    {
      slug: 'educacao',
      name: { pt: 'Educação e investigação', en: 'Education and research' },
      pain: { pt: 'Candidaturas a financiamento com requisitos documentais extensos e prazos rígidos.', en: 'Grant applications with long documentary requirements and hard deadlines.' },
      outcome: { pt: 'Cada requisito ligado ao documento que o satisfaz, e o que falta é visível.', en: 'Every requirement linked to its document, and what is missing is visible.' },
    },
  ],
};
