import type { GlobalMarket } from '../types';

/**
 * Emirados — 6,37 no scorecard e centro de family offices no ICP-2. Fuso
 * próximo de Maputo e inglês de trabalho.
 */
export const ae: GlobalMarket = {
  code: 'ae',
  name: { pt: 'Emirados Árabes Unidos', en: 'United Arab Emirates' },
  currency: 'AED',
  dialCode: '+971',
  why: {
    pt: 'Centro onde grupos familiares e holdings concentram estruturas de várias jurisdições. Fuso horário próximo do nosso e inglês de trabalho — o que torna a colaboração diária possível, não teórica.',
    en: 'A hub where family groups and holdings concentrate structures from several jurisdictions. Close to our time zone and working in English — which makes daily collaboration practical, not theoretical.',
  },
  dataRegime: 'PDPL federal e regimes de zona franca (DIFC, ADGM)',
  investmentBands: [
    { id: 'ae-1', label: { pt: 'Até 20 000 AED', en: 'Up to AED 20,000' }, scoreWeight: 6 },
    { id: 'ae-2', label: { pt: '20 000 – 60 000 AED', en: 'AED 20,000 – 60,000' }, scoreWeight: 14 },
    { id: 'ae-3', label: { pt: '60 000 – 200 000 AED', en: 'AED 60,000 – 200,000' }, scoreWeight: 20 },
    { id: 'ae-4', label: { pt: 'Acima de 200 000 AED', en: 'Over AED 200,000' }, scoreWeight: 25 },
    { id: 'ae-0', label: { pt: 'Ainda a definir', en: 'Not yet defined' }, scoreWeight: 4 },
  ],
  consent: {
    text: {
      pt: 'Autorizo a AGORAMOZ a tratar os dados deste formulário para responder ao meu pedido e preparar o diagnóstico, nos termos do regime de proteção de dados aplicável (PDPL federal e regimes de zona franca (DIFC, ADGM)). Posso pedir o acesso, a retificação, a oposição ou a eliminação dos meus dados a qualquer momento.',
      en: 'I authorise AGORAMOZ to process the data in this form to answer my request and prepare the diagnostic, under the applicable data-protection regime (PDPL federal e regimes de zona franca (DIFC, ADGM)). I may request access to, correction of, objection to or erasure of my data at any time.',
    },
    policyHref: '/privacidade',
  },
  seo: {
    title: { pt: 'Automação documental e agentes de IA para empresas nos Emirados', en: 'Document automation and AI agents for companies in the UAE' },
    description: { pt: 'Devolvemos horas qualificadas a grupos e empresas nos Emirados que as perdem em trabalho documental. Preço fixo por fase, aprovação humana em cada decisão.', en: 'We give qualified hours back to UAE groups and companies losing them to document work. Fixed price per phase, human approval on every decision.' },
  },
  sectors: [
    {
      slug: 'family-offices',
      name: { pt: 'Family offices e holdings', en: 'Family offices and holdings' },
      pain: { pt: 'Consolidar participações de várias jurisdições num relatório feito à mão.', en: 'Consolidating holdings across jurisdictions into a report made by hand.' },
      outcome: { pt: 'O relatório sai sozinho, com cada número rastreável à origem.', en: 'The report builds itself, with every figure traceable to source.' },
    },
    {
      slug: 'imobiliario',
      name: { pt: 'Imobiliário e promoção', en: 'Real estate and development' },
      pain: { pt: 'Contratos e licenças geridos em pastas, com prazos que passam despercebidos.', en: 'Contracts and permits managed in folders, with deadlines that slip by.' },
      outcome: { pt: 'Prazos avisados antes de expirarem, num só lugar.', en: 'Deadlines flagged before they expire, in one place.' },
    },
    {
      slug: 'comercio-reexportacao',
      name: { pt: 'Comércio e reexportação', en: 'Trade and re-export' },
      pain: { pt: 'Documentação aduaneira preenchida a partir de PDF, em volume.', en: 'Customs paperwork filled in from PDFs, at volume.' },
      outcome: { pt: 'Os dados entram extraídos e conferidos.', en: 'Data arrives extracted and checked.' },
    },
    {
      slug: 'construcao',
      name: { pt: 'Construção e infraestrutura', en: 'Construction and infrastructure' },
      pain: { pt: 'Concursos com requisitos documentais extensos e prazos curtos.', en: 'Tenders with long documentary requirements and short deadlines.' },
      outcome: { pt: 'Cada requisito ligado ao documento que o satisfaz.', en: 'Every requirement linked to the document that satisfies it.' },
    },
    {
      slug: 'energia',
      name: { pt: 'Energia e petroquímica', en: 'Energy and petrochemicals' },
      pain: { pt: 'Qualificação de fornecedores mantida em vários portais, com os mesmos documentos.', en: 'Supplier qualification maintained across several portals, with the same documents.' },
      outcome: { pt: 'Um registo mestre que alimenta todos os portais.', en: 'One master record that feeds every portal.' },
    },
    {
      slug: 'hotelaria',
      name: { pt: 'Hotelaria e turismo', en: 'Hospitality and tourism' },
      pain: { pt: 'Contratos com operadores revistos um a um para extrair condições.', en: 'Operator contracts reviewed one by one to extract terms.' },
      outcome: { pt: 'As condições saem em tabela, ligadas ao parágrafo de origem.', en: 'Terms come out as a table, linked to their source paragraph.' },
    },
    {
      slug: 'logistica',
      name: { pt: 'Logística e aviação', en: 'Logistics and aviation' },
      pain: { pt: 'Documentos de carga transcritos manualmente entre sistemas.', en: 'Cargo documents retyped by hand between systems.' },
      outcome: { pt: 'A transcrição desaparece; a excepção é que chega a alguém.', en: 'Retyping disappears; only the exception reaches a person.' },
    },
    {
      slug: 'servicos-financeiros',
      name: { pt: 'Serviços financeiros', en: 'Financial services' },
      pain: { pt: 'Conhecimento do cliente repetido a cada revisão, com documentos já entregues.', en: 'Know-your-client repeated at every review, with documents already provided.' },
      outcome: { pt: 'Só se pede o que mudou.', en: 'Only what changed is requested.' },
    },
    {
      slug: 'saude',
      name: { pt: 'Saúde privada', en: 'Private healthcare' },
      pain: { pt: 'Autorizações e faturação tratadas à mão por pessoal clínico.', en: 'Authorisations and billing handled by hand by clinical staff.' },
      outcome: { pt: 'O administrativo sai do caminho de quem trata doentes.', en: 'Admin gets out of the way of the people treating patients.' },
    },
    {
      slug: 'servicos-profissionais',
      name: { pt: 'Serviços profissionais', en: 'Professional services' },
      pain: { pt: 'Horas faturáveis gastas a recolher documentos antes do trabalho que se vende.', en: 'Billable hours spent gathering documents before the work you sell.' },
      outcome: { pt: 'A recolha deixa de consumir horas faturáveis.', en: 'Gathering stops consuming billable hours.' },
    },
  ],
};
