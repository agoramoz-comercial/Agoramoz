import type { GlobalMarket } from '../types';

/**
 * Alemanha — 6,53 no scorecard e o ICP-3 do nosso portefólio: indústria média
 * exportadora, com comercial interno a responder a cotações à mão.
 */
export const de: GlobalMarket = {
  code: 'de',
  name: { pt: 'Alemanha', en: 'Germany' },
  currency: 'EUR',
  dialCode: '+49',
  htmlLang: 'de-DE',
  why: {
    pt: 'A indústria média exportadora é o perfil onde o trabalho documental é mais denso e menos automatizado: quem responde a cotações e fichas técnicas é a mesma pessoa que conhece o produto.',
    en: 'Mid-sized export manufacturing is the profile where document work is densest and least automated: the person answering quotes and datasheets is the same person who knows the product.',
  },
  dataRegime: 'DSGVO / BDSG',
  investmentBands: [
    { id: 'de-1', label: 'Até 5 000 EUR', scoreWeight: 6 },
    { id: 'de-2', label: '5 000 – 15 000 EUR', scoreWeight: 14 },
    { id: 'de-3', label: '15 000 – 50 000 EUR', scoreWeight: 20 },
    { id: 'de-4', label: 'Acima de 50 000 EUR', scoreWeight: 25 },
    { id: 'de-0', label: 'Ainda a definir', scoreWeight: 4 },
  ],
  consent: {
    text: {
      pt: 'Autorizo a AGORAMOZ a tratar os dados deste formulário para responder ao meu pedido e preparar o diagnóstico, nos termos do regime de proteção de dados aplicável (DSGVO / BDSG). Posso pedir o acesso, a retificação, a oposição ou a eliminação dos meus dados a qualquer momento.',
      en: 'I authorise AGORAMOZ to process the data in this form to answer my request and prepare the diagnostic, under the applicable data-protection regime (DSGVO / BDSG). I may request access to, correction of, objection to or erasure of my data at any time.',
    },
    policyHref: '/privacidade',
  },
  seo: {
    title: { pt: 'Automação documental e agentes de IA para a indústria alemã', en: 'Document automation and AI agents for German industry' },
    description: { pt: 'Devolvemos horas qualificadas a empresas alemãs que as perdem em cotações, fichas e conformidade. Preço fixo por fase, aprovação humana em cada decisão.', en: 'We give qualified hours back to German companies losing them to quotes, datasheets and compliance. Fixed price per phase, human approval on every decision.' },
  },
  sectors: [
    {
      slug: 'maquinaria',
      name: { pt: 'Maquinaria e bens de equipamento', en: 'Machinery and capital goods' },
      pain: { pt: 'Pedidos de cotação em PDF que demoram dias porque alguém os lê e transcreve.', en: 'PDF quote requests that take days because someone reads and retypes them.' },
      outcome: { pt: 'A cotação sai em horas, com os dados extraídos e revistos por uma pessoa.', en: 'The quote goes out in hours, with data extracted and checked by a person.' },
    },
    {
      slug: 'automovel-fornecedores',
      name: { pt: 'Fornecedores automóveis', en: 'Automotive suppliers' },
      pain: { pt: 'Requisitos de qualidade e auditoria mantidos por cliente, em pastas paralelas.', en: 'Quality and audit requirements maintained per customer, in parallel folders.' },
      outcome: { pt: 'Uma biblioteca única que gera o dossiê certo para cada cliente.', en: 'One library that produces the right dossier for each customer.' },
    },
    {
      slug: 'quimica',
      name: { pt: 'Química e materiais', en: 'Chemicals and materials' },
      pain: { pt: 'Fichas de segurança mantidas por país e por versão, em ficheiros partilhados.', en: 'Safety data sheets maintained per country and version, in shared files.' },
      outcome: { pt: 'Versão vigente evidente e a ficha certa gerada para o país certo.', en: 'The current version is obvious and the right sheet is produced for the right country.' },
    },
    {
      slug: 'dispositivos-medicos',
      name: { pt: 'Dispositivos médicos', en: 'Medical devices' },
      pain: { pt: 'Ficheiros técnicos que crescem a cada auditoria, sem versão vigente apontável.', en: 'Technical files that grow with every audit, with no pointable current version.' },
      outcome: { pt: 'Auditoria preparada em horas em vez de semanas.', en: 'Audits prepared in hours instead of weeks.' },
    },
    {
      slug: 'electronica',
      name: { pt: 'Electrónica e automação', en: 'Electronics and automation' },
      pain: { pt: 'Declarações de conformidade refeitas por mercado, manualmente.', en: 'Declarations of conformity redone per market, by hand.' },
      outcome: { pt: 'A declaração monta-se a partir de uma fonte única e versionada.', en: 'The declaration assembles from a single versioned source.' },
    },
    {
      slug: 'logistica',
      name: { pt: 'Logística e expedição', en: 'Logistics and shipping' },
      pain: { pt: 'Documentação de transporte transcrita para o sistema, com erros tardios.', en: 'Shipping paperwork retyped into the system, with errors found late.' },
      outcome: { pt: 'Os dados entram extraídos e conferidos; o duvidoso vai a uma pessoa.', en: 'Data arrives extracted and checked; anything doubtful goes to a person.' },
    },
    {
      slug: 'construcao',
      name: { pt: 'Construção e engenharia civil', en: 'Construction and civil engineering' },
      pain: { pt: 'Concursos com requisitos extensos respondidos a partir de e-mail.', en: 'Tenders with long requirements answered out of email.' },
      outcome: { pt: 'Cada requisito ligado ao documento que o satisfaz.', en: 'Every requirement linked to the document that satisfies it.' },
    },
    {
      slug: 'energia-renovavel',
      name: { pt: 'Energia renovável', en: 'Renewable energy' },
      pain: { pt: 'Licenciamento com prazos e documentos dispersos por várias entidades.', en: 'Permitting with deadlines and documents spread across several authorities.' },
      outcome: { pt: 'Prazos avisados antes de expirarem, num só lugar.', en: 'Deadlines flagged before they expire, in one place.' },
    },
    {
      slug: 'seguros',
      name: { pt: 'Seguros industriais', en: 'Industrial insurance' },
      pain: { pt: 'Propostas técnicas triadas à mão antes de chegarem ao subscritor.', en: 'Technical submissions triaged by hand before reaching the underwriter.' },
      outcome: { pt: 'O subscritor recebe o caso resumido, com o original à mão.', en: 'The underwriter receives the case summarised, with the original at hand.' },
    },
    {
      slug: 'servicos-profissionais',
      name: { pt: 'Serviços profissionais', en: 'Professional services' },
      pain: { pt: 'Horas faturáveis gastas a formatar documentos do cliente.', en: 'Billable hours spent formatting client documents.' },
      outcome: { pt: 'A formatação deixa de consumir horas faturáveis.', en: 'Formatting stops consuming billable hours.' },
    },
  ],
};
