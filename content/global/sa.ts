import type { GlobalMarket } from '../types';

/**
 * Arábia Saudita — no scorecard dos 27. O ângulo é o mesmo de Moçambique:
 * grandes projectos de energia com exigência documental pesada sobre os
 * fornecedores. É onde a competência que já temos se transfere melhor.
 */
export const sa: GlobalMarket = {
  code: 'sa',
  name: { pt: 'Arábia Saudita', en: 'Saudi Arabia' },
  currency: 'SAR',
  dialCode: '+966',
  htmlLang: 'ar-SA',
  why: {
    pt: 'Grandes projectos de energia e infraestrutura com exigência documental pesada sobre fornecedores — o mesmo mecanismo que conhecemos em Moçambique, noutra escala. É a nossa competência actual, transferida.',
    en: 'Large energy and infrastructure projects with heavy documentary demands on suppliers — the same mechanism we know from Mozambique, at another scale. It is our current capability, transferred.',
  },
  dataRegime: 'PDPL',
  investmentBands: [
    { id: 'sa-1', label: 'Até 20 000 SAR', scoreWeight: 6 },
    { id: 'sa-2', label: '20 000 – 60 000 SAR', scoreWeight: 14 },
    { id: 'sa-3', label: '60 000 – 200 000 SAR', scoreWeight: 20 },
    { id: 'sa-4', label: 'Acima de 200 000 SAR', scoreWeight: 25 },
    { id: 'sa-0', label: 'Ainda a definir', scoreWeight: 4 },
  ],
  consent: {
    text: {
      pt: 'Autorizo a AGORAMOZ a tratar os dados deste formulário para responder ao meu pedido e preparar o diagnóstico, nos termos do regime de proteção de dados aplicável (PDPL). Posso pedir o acesso, a retificação, a oposição ou a eliminação dos meus dados a qualquer momento.',
      en: 'I authorise AGORAMOZ to process the data in this form to answer my request and prepare the diagnostic, under the applicable data-protection regime (PDPL). I may request access to, correction of, objection to or erasure of my data at any time.',
    },
    policyHref: '/privacidade',
  },
  seo: {
    title: { pt: 'Automação documental e agentes de IA para empresas na Arábia Saudita', en: 'Document automation and AI agents for companies in Saudi Arabia' },
    description: { pt: 'Devolvemos horas qualificadas a fornecedores e empresas sauditas que as perdem em qualificação e concursos. Preço fixo por fase, aprovação humana em cada decisão.', en: 'We give qualified hours back to Saudi suppliers and companies losing them to qualification and tenders. Fixed price per phase, human approval on every decision.' },
  },
  sectors: [
    {
      slug: 'energia-petroquimica',
      name: { pt: 'Energia e petroquímica', en: 'Energy and petrochemicals' },
      pain: { pt: 'Qualificação de fornecedores mantida em vários portais, com os mesmos documentos em formatos diferentes.', en: 'Supplier qualification maintained across several portals, the same documents in different formats.' },
      outcome: { pt: 'Um registo mestre que alimenta todos os portais.', en: 'One master record that feeds every portal.' },
    },
    {
      slug: 'construcao-megaprojectos',
      name: { pt: 'Construção e megaprojectos', en: 'Construction and megaprojects' },
      pain: { pt: 'Concursos com requisitos extensos e prazos curtos, respondidos a partir de e-mail.', en: 'Tenders with long requirements and short deadlines, answered out of email.' },
      outcome: { pt: 'Cada requisito ligado ao documento que o satisfaz, e o que falta é visível antes do prazo.', en: 'Every requirement linked to its document, and what is missing is visible before the deadline.' },
    },
    {
      slug: 'logistica',
      name: { pt: 'Logística e portos', en: 'Logistics and ports' },
      pain: { pt: 'Documentação de carga transcrita à mão entre sistemas.', en: 'Cargo documentation retyped by hand between systems.' },
      outcome: { pt: 'Os dados entram extraídos e conferidos.', en: 'Data arrives extracted and checked.' },
    },
    {
      slug: 'mineracao',
      name: { pt: 'Mineração e metais', en: 'Mining and metals' },
      pain: { pt: 'Licenças e certificados com validades dispersas por várias entidades.', en: 'Licences and certificates with expiry dates spread across authorities.' },
      outcome: { pt: 'Prazos avisados antes de expirarem, num só lugar.', en: 'Deadlines flagged before they expire, in one place.' },
    },
    {
      slug: 'industria',
      name: { pt: 'Indústria e fabricação', en: 'Manufacturing' },
      pain: { pt: 'Cotações que demoram dias porque alguém lê o PDF e transcreve.', en: 'Quotes that take days because someone reads the PDF and retypes it.' },
      outcome: { pt: 'A cotação sai em horas.', en: 'The quote goes out in hours.' },
    },
    {
      slug: 'saude',
      name: { pt: 'Saúde', en: 'Healthcare' },
      pain: { pt: 'Autorizações e faturação tratadas manualmente por pessoal clínico.', en: 'Authorisations and billing handled by hand by clinical staff.' },
      outcome: { pt: 'O administrativo sai do caminho de quem trata doentes.', en: 'Admin gets out of the way of the people treating patients.' },
    },
    {
      slug: 'servicos-financeiros',
      name: { pt: 'Serviços financeiros', en: 'Financial services' },
      pain: { pt: 'Conhecimento do cliente repetido a cada revisão.', en: 'Know-your-client repeated at every review.' },
      outcome: { pt: 'Só se pede o que mudou.', en: 'Only what changed is requested.' },
    },
    {
      slug: 'imobiliario',
      name: { pt: 'Imobiliário e promoção', en: 'Real estate and development' },
      pain: { pt: 'Contratos e licenças em pastas, com prazos que passam despercebidos.', en: 'Contracts and permits in folders, with deadlines that slip by.' },
      outcome: { pt: 'Prazos visíveis antes de expirarem.', en: 'Deadlines visible before they expire.' },
    },
    {
      slug: 'telecomunicacoes',
      name: { pt: 'Telecomunicações', en: 'Telecommunications' },
      pain: { pt: 'Contratos de fornecedores revistos um a um para extrair condições.', en: 'Supplier contracts reviewed one by one to extract terms.' },
      outcome: { pt: 'As condições saem em tabela, ligadas ao parágrafo de origem.', en: 'Terms come out as a table, linked to their source paragraph.' },
    },
    {
      slug: 'servicos-profissionais',
      name: { pt: 'Serviços profissionais', en: 'Professional services' },
      pain: { pt: 'Horas faturáveis gastas a recolher e formatar documentos.', en: 'Billable hours spent gathering and formatting documents.' },
      outcome: { pt: 'A recolha deixa de consumir horas faturáveis.', en: 'Gathering stops consuming billable hours.' },
    },
  ],
};
