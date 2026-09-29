import type { GlobalMarket } from '../types';

/**
 * Canadá — no scorecard dos 27, e o lugar que Portugal deixou vago no nível
 * global: Portugal é mercado de operação, não de expansão. Escolhido por
 * constar da pesquisa, não por intuição.
 */
export const ca: GlobalMarket = {
  code: 'ca',
  name: { pt: 'Canadá', en: 'Canada' },
  currency: 'CAD',
  dialCode: '+1',
  why: {
    pt: 'Entra no nível global no lugar que Portugal deixou vago — Portugal é mercado de operação, não de expansão. Consta do scorecard dos 27 países, e é bilingue de raiz, o que torna a nossa camada PT/EN útil em vez de decorativa.',
    en: 'It takes the place Portugal left open at the global tier — Portugal is a market we operate in, not one we expand into. It is in the 27-country scorecard, and it is natively bilingual, which makes our PT/EN layer useful rather than decorative.',
  },
  dataRegime: 'PIPEDA e regimes provinciais (Lei 25, Quebec)',
  investmentBands: [
    { id: 'ca-1', label: { pt: 'Até 7 500 CAD', en: 'Up to CAD 7,500' }, scoreWeight: 6 },
    { id: 'ca-2', label: { pt: '7 500 – 22 000 CAD', en: 'CAD 7,500 – 22,000' }, scoreWeight: 14 },
    { id: 'ca-3', label: { pt: '22 000 – 75 000 CAD', en: 'CAD 22,000 – 75,000' }, scoreWeight: 20 },
    { id: 'ca-4', label: { pt: 'Acima de 75 000 CAD', en: 'Over CAD 75,000' }, scoreWeight: 25 },
    { id: 'ca-0', label: { pt: 'Ainda a definir', en: 'Not yet defined' }, scoreWeight: 4 },
  ],
  consent: {
    text: {
      pt: 'Autorizo a AGORAMOZ a tratar os dados deste formulário para responder ao meu pedido e preparar o diagnóstico, nos termos do regime de proteção de dados aplicável (PIPEDA e regimes provinciais (Lei 25, Quebec)). Posso pedir o acesso, a retificação, a oposição ou a eliminação dos meus dados a qualquer momento.',
      en: 'I authorise AGORAMOZ to process the data in this form to answer my request and prepare the diagnostic, under the applicable data-protection regime (PIPEDA e regimes provinciais (Lei 25, Quebec)). I may request access to, correction of, objection to or erasure of my data at any time.',
    },
    policyHref: '/privacidade',
  },
  seo: {
    title: { pt: 'Automação documental e agentes de IA para empresas no Canadá', en: 'Document automation and AI agents for companies in Canada' },
    description: { pt: 'Devolvemos horas qualificadas a empresas canadianas que as perdem em trabalho documental, em inglês e em francês. Preço fixo por fase, aprovação humana em cada decisão.', en: 'We give qualified hours back to Canadian companies losing them to document work, in English and in French. Fixed price per phase, human approval on every decision.' },
  },
  sectors: [
    {
      slug: 'recursos-naturais',
      name: { pt: 'Recursos naturais e mineração', en: 'Natural resources and mining' },
      pain: { pt: 'Licenças e relatórios ambientais com prazos dispersos por várias entidades.', en: 'Permits and environmental reports with deadlines spread across authorities.' },
      outcome: { pt: 'Prazos avisados antes de expirarem, num só lugar.', en: 'Deadlines flagged before they expire, in one place.' },
    },
    {
      slug: 'energia',
      name: { pt: 'Energia e pipelines', en: 'Energy and pipelines' },
      pain: { pt: 'Qualificação de fornecedores repetida em portais diferentes, com os mesmos documentos.', en: 'Supplier qualification repeated across different portals, with the same documents.' },
      outcome: { pt: 'Um registo mestre que alimenta todos os portais.', en: 'One master record that feeds every portal.' },
    },
    {
      slug: 'servicos-financeiros',
      name: { pt: 'Serviços financeiros', en: 'Financial services' },
      pain: { pt: 'Conhecimento do cliente repetido a cada revisão, em dois idiomas.', en: 'Know-your-client repeated at every review, in two languages.' },
      outcome: { pt: 'Só se pede o que mudou, na língua de quem responde.', en: 'Only what changed is requested, in the language of the person answering.' },
    },
    {
      slug: 'seguros',
      name: { pt: 'Seguros', en: 'Insurance' },
      pain: { pt: 'Sinistros com anexos em inglês e francês, triados à mão.', en: 'Claims with attachments in English and French, triaged by hand.' },
      outcome: { pt: 'A triagem é automática e lida com as duas línguas.', en: 'Triage is automatic and handles both languages.' },
    },
    {
      slug: 'saude',
      name: { pt: 'Saúde e ciências da vida', en: 'Healthcare and life sciences' },
      pain: { pt: 'Submissões regulatórias montadas a partir de documentos versionados à mão.', en: 'Regulatory submissions assembled from documents versioned by hand.' },
      outcome: { pt: 'Versão vigente evidente e histórico intacto.', en: 'The current version obvious and history intact.' },
    },
    {
      slug: 'logistica',
      name: { pt: 'Logística e transportes', en: 'Logistics and transport' },
      pain: { pt: 'Documentação transfronteiriça preenchida a partir de PDF.', en: 'Cross-border paperwork filled in from PDFs.' },
      outcome: { pt: 'Os dados entram extraídos e conferidos.', en: 'Data arrives extracted and checked.' },
    },
    {
      slug: 'construcao',
      name: { pt: 'Construção e infraestrutura', en: 'Construction and infrastructure' },
      pain: { pt: 'Concursos públicos com requisitos extensos e submissões bilingues.', en: 'Public tenders with long requirements and bilingual submissions.' },
      outcome: { pt: 'Cada requisito ligado ao documento que o satisfaz, nas duas línguas.', en: 'Every requirement linked to its document, in both languages.' },
    },
    {
      slug: 'agroalimentar',
      name: { pt: 'Agroalimentar', en: 'Agri-food' },
      pain: { pt: 'Rotulagem e conformidade refeitas por província e por língua.', en: 'Labelling and compliance redone per province and per language.' },
      outcome: { pt: 'A ficha certa gerada para a província certa, de uma fonte única.', en: 'The right sheet produced for the right province, from a single source.' },
    },
    {
      slug: 'tecnologia',
      name: { pt: 'Tecnologia e software', en: 'Technology and software' },
      pain: { pt: 'Questionários de segurança respondidos do zero, repetidamente.', en: 'Security questionnaires answered from scratch, repeatedly.' },
      outcome: { pt: 'Respostas pré-preenchidas de um repositório aprovado, com revisão humana.', en: 'Answers pre-filled from an approved repository, with human review.' },
    },
    {
      slug: 'servicos-profissionais',
      name: { pt: 'Serviços profissionais', en: 'Professional services' },
      pain: { pt: 'Horas faturáveis gastas a recolher e formatar documentos.', en: 'Billable hours spent gathering and formatting documents.' },
      outcome: { pt: 'A recolha deixa de consumir horas faturáveis.', en: 'Gathering stops consuming billable hours.' },
    },
  ],
};
