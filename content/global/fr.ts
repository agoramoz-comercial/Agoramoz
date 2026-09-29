import type { GlobalMarket } from '../types';

/**
 * França — no scorecard dos 27, e o mercado onde o AI Act europeu cria procura
 * por governação demonstrável, não só por automação.
 */
export const fr: GlobalMarket = {
  code: 'fr',
  name: { pt: 'França', en: 'France' },
  currency: 'EUR',
  dialCode: '+33',
  why: {
    pt: 'Mercado da UE onde a exigência de governação demonstrável é mais visível: automatizar sem poder explicar a decisão não serve. É exactamente o desenho que praticamos — aprovação humana em cada passo.',
    en: 'The EU market where demonstrable governance is most visible: automating without being able to explain the decision is not enough. That is exactly how we build — human approval at every step.',
  },
  dataRegime: 'RGPD / Loi Informatique et Libertés',
  investmentBands: [
    { id: 'fr-1', label: { pt: 'Até 5 000 EUR', en: 'Up to EUR 5,000' }, scoreWeight: 6 },
    { id: 'fr-2', label: { pt: '5 000 – 15 000 EUR', en: 'EUR 5,000 – 15,000' }, scoreWeight: 14 },
    { id: 'fr-3', label: { pt: '15 000 – 50 000 EUR', en: 'EUR 15,000 – 50,000' }, scoreWeight: 20 },
    { id: 'fr-4', label: { pt: 'Acima de 50 000 EUR', en: 'Over EUR 50,000' }, scoreWeight: 25 },
    { id: 'fr-0', label: { pt: 'Ainda a definir', en: 'Not yet defined' }, scoreWeight: 4 },
  ],
  consent: {
    text: {
      pt: 'Autorizo a AGORAMOZ a tratar os dados deste formulário para responder ao meu pedido e preparar o diagnóstico, nos termos do regime de proteção de dados aplicável (RGPD / Loi Informatique et Libertés). Posso pedir o acesso, a retificação, a oposição ou a eliminação dos meus dados a qualquer momento.',
      en: 'I authorise AGORAMOZ to process the data in this form to answer my request and prepare the diagnostic, under the applicable data-protection regime (RGPD / Loi Informatique et Libertés). I may request access to, correction of, objection to or erasure of my data at any time.',
    },
    policyHref: '/privacidade',
  },
  seo: {
    title: { pt: 'Automação documental e agentes de IA para empresas em França', en: 'Document automation and AI agents for companies in France' },
    description: { pt: 'Devolvemos horas qualificadas a empresas francesas, com decisões explicáveis e aprovação humana em cada passo. Preço fixo por fase.', en: 'We give qualified hours back to French companies, with explainable decisions and human approval at every step. Fixed price per phase.' },
  },
  sectors: [
    {
      slug: 'aeronautica',
      name: { pt: 'Aeronáutica e defesa', en: 'Aerospace and defence' },
      pain: { pt: 'Dossiês de conformidade montados a partir de documentos com validades distintas.', en: 'Compliance dossiers assembled from documents with different expiry dates.' },
      outcome: { pt: 'Prazos avisados antes de expirarem e versão vigente evidente.', en: 'Deadlines flagged before expiry and the current version obvious.' },
    },
    {
      slug: 'luxo-retalho',
      name: { pt: 'Luxo e retalho', en: 'Luxury and retail' },
      pain: { pt: 'Certificados de origem e autenticidade geridos em folhas de cálculo.', en: 'Certificates of origin and authenticity managed in spreadsheets.' },
      outcome: { pt: 'Um registo por peça, rastreável, sem folha paralela.', en: 'One record per item, traceable, with no parallel spreadsheet.' },
    },
    {
      slug: 'agroalimentar',
      name: { pt: 'Agroalimentar', en: 'Agri-food' },
      pain: { pt: 'Rotulagem e conformidade refeitas por mercado de destino.', en: 'Labelling and compliance redone per destination market.' },
      outcome: { pt: 'A ficha certa gerada para o mercado certo, de uma fonte única.', en: 'The right sheet produced for the right market, from a single source.' },
    },
    {
      slug: 'farmaceutica',
      name: { pt: 'Farmacêutica', en: 'Pharmaceuticals' },
      pain: { pt: 'Submissões regulatórias com dezenas de anexos versionados à mão.', en: 'Regulatory submissions with dozens of attachments versioned by hand.' },
      outcome: { pt: 'Versão vigente identificada e histórico intacto.', en: 'The current version identified and history intact.' },
    },
    {
      slug: 'energia-nuclear',
      name: { pt: 'Energia e nuclear', en: 'Energy and nuclear' },
      pain: { pt: 'Documentação de segurança dispersa entre sistemas que não se falam.', en: 'Safety documentation spread across systems that do not talk.' },
      outcome: { pt: 'Uma fonte por documento, com origem rastreável.', en: 'One source per document, with traceable provenance.' },
    },
    {
      slug: 'banca-seguros',
      name: { pt: 'Banca e seguros', en: 'Banking and insurance' },
      pain: { pt: 'Conformidade documental repetida a cada revisão de cliente.', en: 'Documentary compliance repeated at every client review.' },
      outcome: { pt: 'Um registo mestre que só pede o que mudou.', en: 'One master record that asks only for what changed.' },
    },
    {
      slug: 'construcao',
      name: { pt: 'Construção e obras públicas', en: 'Construction and public works' },
      pain: { pt: 'Concursos públicos com requisitos extensos e prazos curtos.', en: 'Public tenders with long requirements and short deadlines.' },
      outcome: { pt: 'Cada requisito ligado ao documento que o satisfaz.', en: 'Every requirement linked to the document that satisfies it.' },
    },
    {
      slug: 'transportes',
      name: { pt: 'Transportes e logística', en: 'Transport and logistics' },
      pain: { pt: 'Documentação aduaneira preenchida a partir de PDF, sob prazo.', en: 'Customs paperwork filled in from PDFs, under deadline.' },
      outcome: { pt: 'Preenchimento automático; só a excepção chega a alguém.', en: 'Automatic filing; only the exception reaches a person.' },
    },
    {
      slug: 'juridico',
      name: { pt: 'Serviços jurídicos', en: 'Legal services' },
      pain: { pt: 'Revisão documental faturada à hora, feita linha a linha.', en: 'Document review billed hourly, done line by line.' },
      outcome: { pt: 'A primeira passagem é automática; a revisão é humana.', en: 'The first pass is automatic; the review is human.' },
    },
    {
      slug: 'tecnologia',
      name: { pt: 'Tecnologia e software', en: 'Technology and software' },
      pain: { pt: 'Questionários de segurança respondidos do zero, repetidamente.', en: 'Security questionnaires answered from scratch, repeatedly.' },
      outcome: { pt: 'Respostas pré-preenchidas de um repositório aprovado, com revisão humana.', en: 'Answers pre-filled from an approved repository, with human review.' },
    },
  ],
};
