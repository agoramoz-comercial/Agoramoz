import type { GlobalMarket } from '../types';

/**
 * Reino Unido — 4.º no scorecard (7,10) e Tier A no ICP-4. Serviços
 * profissionais que vendem horas e perdem-nas em trabalho documental.
 */
export const uk: GlobalMarket = {
  code: 'uk',
  name: { pt: 'Reino Unido', en: 'United Kingdom' },
  currency: 'GBP',
  dialCode: '+44',
  why: {
    pt: 'Quarto lugar no nosso scorecard, e o mercado onde o ICP de serviços profissionais é mais denso. Quem vende horas é quem mais perde ao gastá-las a formatar documentos.',
    en: 'Fourth in our scorecard, and the market where the professional-services ICP is densest. Those who sell hours lose most by spending them formatting documents.',
  },
  dataRegime: 'UK GDPR / Data Protection Act',
  investmentBands: [
    { id: 'uk-1', label: { pt: 'Até 4 000 GBP', en: 'Up to GBP 4,000' }, scoreWeight: 6 },
    { id: 'uk-2', label: { pt: '4 000 – 13 000 GBP', en: 'GBP 4,000 – 13,000' }, scoreWeight: 14 },
    { id: 'uk-3', label: { pt: '13 000 – 45 000 GBP', en: 'GBP 13,000 – 45,000' }, scoreWeight: 20 },
    { id: 'uk-4', label: { pt: 'Acima de 45 000 GBP', en: 'Over GBP 45,000' }, scoreWeight: 25 },
    { id: 'uk-0', label: { pt: 'Ainda a definir', en: 'Not yet defined' }, scoreWeight: 4 },
  ],
  consent: {
    text: {
      pt: 'Autorizo a AGORAMOZ a tratar os dados deste formulário para responder ao meu pedido e preparar o diagnóstico, nos termos do regime de proteção de dados aplicável (UK GDPR / Data Protection Act). Posso pedir o acesso, a retificação, a oposição ou a eliminação dos meus dados a qualquer momento.',
      en: 'I authorise AGORAMOZ to process the data in this form to answer my request and prepare the diagnostic, under the applicable data-protection regime (UK GDPR / Data Protection Act). I may request access to, correction of, objection to or erasure of my data at any time.',
    },
    policyHref: '/privacidade',
  },
  seo: {
    title: { pt: 'Automação documental e agentes de IA para empresas no Reino Unido', en: 'Document automation and AI agents for companies in the United Kingdom' },
    description: { pt: 'Devolvemos horas faturáveis a empresas britânicas que as perdem em trabalho documental. Preço fixo por fase, aprovação humana em cada decisão.', en: 'We give billable hours back to UK companies losing them to document work. Fixed price per phase, human approval on every decision.' },
  },
  sectors: [
    {
      slug: 'contabilidade-auditoria',
      name: { pt: 'Contabilidade e auditoria', en: 'Accountancy and audit' },
      pain: { pt: 'Recolha de documentos do cliente feita por e-mail, perseguida à mão todos os anos.', en: 'Client document collection done by email, chased by hand every year.' },
      outcome: { pt: 'A recolha acontece sozinha e o que falta é visível a qualquer momento.', en: 'Collection happens on its own and what is missing is visible at any time.' },
    },
    {
      slug: 'juridico',
      name: { pt: 'Serviços jurídicos', en: 'Legal services' },
      pain: { pt: 'Revisão documental faturada à hora, feita linha a linha.', en: 'Document review billed hourly, done line by line.' },
      outcome: { pt: 'A primeira passagem é automática; a revisão é humana.', en: 'The first pass is automatic; the review is human.' },
    },
    {
      slug: 'servicos-financeiros',
      name: { pt: 'Serviços financeiros', en: 'Financial services' },
      pain: { pt: 'Processos de conformidade repetidos com os mesmos documentos.', en: 'Compliance processes repeated with the same documents.' },
      outcome: { pt: 'Um registo mestre que só pede o que mudou.', en: 'One master record that asks only for what changed.' },
    },
    {
      slug: 'seguros',
      name: { pt: 'Seguros e corretagem', en: 'Insurance and broking' },
      pain: { pt: 'Propostas e sinistros triados manualmente antes de chegarem a quem decide.', en: 'Submissions and claims triaged by hand before reaching the decision-maker.' },
      outcome: { pt: 'A triagem é automática e o caso chega resumido.', en: 'Triage is automatic and the case arrives summarised.' },
    },
    {
      slug: 'imobiliario',
      name: { pt: 'Imobiliário e gestão de activos', en: 'Real estate and asset management' },
      pain: { pt: 'Contratos de arrendamento lidos um a um para extrair prazos e rendas.', en: 'Leases read one by one to extract terms and rents.' },
      outcome: { pt: 'As cláusulas saem em tabela, ligadas ao parágrafo de origem.', en: 'Clauses come out as a table, linked to their source paragraph.' },
    },
    {
      slug: 'engenharia',
      name: { pt: 'Engenharia e consultoria técnica', en: 'Engineering and technical consultancy' },
      pain: { pt: 'Concursos públicos com requisitos extensos respondidos a partir de pastas.', en: 'Public tenders with long requirements answered out of folders.' },
      outcome: { pt: 'Cada requisito ligado ao documento que o satisfaz.', en: 'Every requirement linked to the document that satisfies it.' },
    },
    {
      slug: 'saude-privada',
      name: { pt: 'Saúde privada', en: 'Private healthcare' },
      pain: { pt: 'Autorizações e faturação tratadas à mão por pessoal clínico.', en: 'Authorisations and billing handled by hand by clinical staff.' },
      outcome: { pt: 'O administrativo sai do caminho de quem trata doentes.', en: 'Admin gets out of the way of the people treating patients.' },
    },
    {
      slug: 'logistica',
      name: { pt: 'Logística e transitários', en: 'Logistics and freight forwarding' },
      pain: { pt: 'Documentação aduaneira preenchida a partir de PDF, sob prazo.', en: 'Customs paperwork filled in from PDFs, under deadline.' },
      outcome: { pt: 'Os dados entram extraídos e conferidos.', en: 'Data arrives extracted and checked.' },
    },
    {
      slug: 'industria',
      name: { pt: 'Indústria e fabricação', en: 'Manufacturing' },
      pain: { pt: 'Cotações que demoram dias porque alguém lê e transcreve.', en: 'Quotes that take days because someone reads and retypes.' },
      outcome: { pt: 'A cotação sai em horas.', en: 'The quote goes out in hours.' },
    },
    {
      slug: 'educacao',
      name: { pt: 'Educação superior', en: 'Higher education' },
      pain: { pt: 'Candidaturas e relatórios de financiamento montados à mão, contra prazos rígidos.', en: 'Funding applications and reports assembled by hand, against hard deadlines.' },
      outcome: { pt: 'O relatório monta-se sozinho, com cada número rastreável.', en: 'The report assembles itself, with every figure traceable.' },
    },
  ],
};
