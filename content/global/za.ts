import type { GlobalMarket } from '../types';

/**
 * África do Sul — «a âncora africana lógica» da pesquisa: vizinha, mesmo fuso,
 * inglês, e ligada à cadeia de energia de Moçambique. É o mercado deste nível
 * onde temos mais proximidade real.
 */
export const za: GlobalMarket = {
  code: 'za',
  name: { pt: 'África do Sul', en: 'South Africa' },
  currency: 'ZAR',
  dialCode: '+27',
  why: {
    pt: 'A âncora africana lógica: vizinha, mesmo fuso horário, inglês de trabalho, e ligada à mesma cadeia de energia que já servimos em Moçambique.',
    en: 'The logical African anchor: neighbouring, same time zone, working in English, and connected to the same energy chain we already serve in Mozambique.',
  },
  dataRegime: 'POPIA',
  investmentBands: [
    { id: 'za-1', label: 'Até 100 000 ZAR', scoreWeight: 6 },
    { id: 'za-2', label: '100 000 – 300 000 ZAR', scoreWeight: 14 },
    { id: 'za-3', label: '300 000 – 1 000 000 ZAR', scoreWeight: 20 },
    { id: 'za-4', label: 'Acima de 1 000 000 ZAR', scoreWeight: 25 },
    { id: 'za-0', label: 'Ainda a definir', scoreWeight: 4 },
  ],
  consent: {
    text: {
      pt: 'Autorizo a AGORAMOZ a tratar os dados deste formulário para responder ao meu pedido e preparar o diagnóstico, nos termos do regime de proteção de dados aplicável (POPIA). Posso pedir o acesso, a retificação, a oposição ou a eliminação dos meus dados a qualquer momento.',
      en: 'I authorise AGORAMOZ to process the data in this form to answer my request and prepare the diagnostic, under the applicable data-protection regime (POPIA). I may request access to, correction of, objection to or erasure of my data at any time.',
    },
    policyHref: '/privacidade',
  },
  seo: {
    title: { pt: 'Automação documental e agentes de IA para empresas na África do Sul', en: 'Document automation and AI agents for companies in South Africa' },
    description: { pt: 'Devolvemos horas qualificadas a empresas sul-africanas que as perdem em trabalho documental. Preço fixo por fase, aprovação humana em cada decisão.', en: 'We give qualified hours back to South African companies losing them to document work. Fixed price per phase, human approval on every decision.' },
  },
  sectors: [
    {
      slug: 'mineracao',
      name: { pt: 'Mineração e metais', en: 'Mining and metals' },
      pain: { pt: 'Licenças, certificados e relatórios ambientais com validades dispersas.', en: 'Licences, certificates and environmental reports with scattered expiry dates.' },
      outcome: { pt: 'Prazos avisados antes de expirarem, num só lugar.', en: 'Deadlines flagged before they expire, in one place.' },
    },
    {
      slug: 'energia',
      name: { pt: 'Energia e serviços industriais', en: 'Energy and industrial services' },
      pain: { pt: 'Qualificação de fornecedores repetida em vários portais de operadores.', en: 'Supplier qualification repeated across several operator portals.' },
      outcome: { pt: 'Um registo mestre que alimenta todos os portais.', en: 'One master record that feeds every portal.' },
    },
    {
      slug: 'logistica',
      name: { pt: 'Logística e transportes', en: 'Logistics and transport' },
      pain: { pt: 'Documentação de fronteira preenchida a partir de PDF, sob prazo.', en: 'Border paperwork filled in from PDFs, under deadline.' },
      outcome: { pt: 'Os dados entram extraídos e conferidos.', en: 'Data arrives extracted and checked.' },
    },
    {
      slug: 'agronegocio',
      name: { pt: 'Agronegócio e exportação', en: 'Agribusiness and export' },
      pain: { pt: 'Certificados fitossanitários e de origem geridos em folhas de cálculo.', en: 'Phytosanitary and origin certificates managed in spreadsheets.' },
      outcome: { pt: 'Um registo por remessa, rastreável, sem folha paralela.', en: 'One record per shipment, traceable, with no parallel spreadsheet.' },
    },
    {
      slug: 'servicos-financeiros',
      name: { pt: 'Serviços financeiros', en: 'Financial services' },
      pain: { pt: 'Conformidade documental repetida a cada revisão de cliente.', en: 'Documentary compliance repeated at every client review.' },
      outcome: { pt: 'Um registo mestre que só pede o que mudou.', en: 'One master record that asks only for what changed.' },
    },
    {
      slug: 'seguros',
      name: { pt: 'Seguros', en: 'Insurance' },
      pain: { pt: 'Sinistros triados à mão antes de chegarem ao analista.', en: 'Claims triaged by hand before reaching the analyst.' },
      outcome: { pt: 'O analista recebe o caso resumido, com o original à mão.', en: 'The analyst receives the case summarised, with the original at hand.' },
    },
    {
      slug: 'construcao',
      name: { pt: 'Construção e engenharia', en: 'Construction and engineering' },
      pain: { pt: 'Concursos com requisitos extensos respondidos a partir de pastas partilhadas.', en: 'Tenders with long requirements answered out of shared folders.' },
      outcome: { pt: 'Cada requisito ligado ao documento que o satisfaz.', en: 'Every requirement linked to the document that satisfies it.' },
    },
    {
      slug: 'industria',
      name: { pt: 'Indústria e fabricação', en: 'Manufacturing' },
      pain: { pt: 'Cotações que demoram dias porque alguém lê e transcreve.', en: 'Quotes that take days because someone reads and retypes.' },
      outcome: { pt: 'A cotação sai em horas.', en: 'The quote goes out in hours.' },
    },
    {
      slug: 'saude-privada',
      name: { pt: 'Saúde privada', en: 'Private healthcare' },
      pain: { pt: 'Autorizações e faturação tratadas à mão por pessoal clínico.', en: 'Authorisations and billing handled by hand by clinical staff.' },
      outcome: { pt: 'O administrativo sai do caminho de quem trata doentes.', en: 'Admin gets out of the way of the people treating patients.' },
    },
    {
      slug: 'servicos-profissionais',
      name: { pt: 'Serviços profissionais', en: 'Professional services' },
      pain: { pt: 'Horas faturáveis gastas a formatar documentos do cliente.', en: 'Billable hours spent formatting client documents.' },
      outcome: { pt: 'A formatação deixa de consumir horas faturáveis.', en: 'Formatting stops consuming billable hours.' },
    },
  ],
};
