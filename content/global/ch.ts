import type { GlobalMarket } from '../types';

/**
 * Suíça — 1.º no scorecard de 27 países (7,31), e o mais alto em poder de
 * compra de serviços de IA. O ângulo é confidencialidade: é o mercado onde a
 * pergunta «onde ficam os dados e quem os vê» vem antes do preço.
 */
export const ch: GlobalMarket = {
  code: 'ch',
  name: { pt: 'Suíça', en: 'Switzerland' },
  currency: 'CHF',
  dialCode: '+41',
  why: {
    pt: 'Primeiro lugar no nosso scorecard de 27 países. O trabalho documental é caro porque as horas qualificadas são caras — e é exactamente isso que torna a automação rentável no primeiro ano, não no terceiro.',
    en: 'First place in our 27-country scorecard. Document work is expensive here because qualified hours are expensive — which is precisely what makes automation pay back in year one rather than year three.',
  },
  dataRegime: 'nLPD / revDSG',
  investmentBands: [
    { id: 'ch-1', label: 'Até 5 000 CHF', scoreWeight: 6 },
    { id: 'ch-2', label: '5 000 – 15 000 CHF', scoreWeight: 14 },
    { id: 'ch-3', label: '15 000 – 50 000 CHF', scoreWeight: 20 },
    { id: 'ch-4', label: 'Acima de 50 000 CHF', scoreWeight: 25 },
    { id: 'ch-0', label: 'Ainda a definir', scoreWeight: 4 },
  ],
  consent: {
    text: {
      pt: 'Autorizo a AGORAMOZ a tratar os dados deste formulário para responder ao meu pedido e preparar o diagnóstico, nos termos do regime de proteção de dados aplicável (nLPD / revDSG). Posso pedir o acesso, a retificação, a oposição ou a eliminação dos meus dados a qualquer momento.',
      en: 'I authorise AGORAMOZ to process the data in this form to answer my request and prepare the diagnostic, under the applicable data-protection regime (nLPD / revDSG). I may request access to, correction of, objection to or erasure of my data at any time.',
    },
    policyHref: '/privacidade',
  },
  seo: {
    title: {
      pt: 'Automação documental e agentes de IA para empresas na Suíça',
      en: 'Document automation and AI agents for companies in Switzerland',
    },
    description: {
      pt: 'Devolvemos horas qualificadas a empresas suíças que perdem tempo em trabalho documental. Preço fixo por fase, aprovação humana em cada decisão.',
      en: 'We give qualified hours back to Swiss companies losing time to document work. Fixed price per phase, human approval on every decision.',
    },
  },
  sectors: [
    {
      slug: 'gestao-patrimonio',
      name: { pt: 'Gestão de património e family offices', en: 'Wealth management and family offices' },
      pain: {
        pt: 'Consolidar posições de vários bancos e jurisdições num relatório mensal feito à mão em folha de cálculo.',
        en: 'Consolidating positions across several banks and jurisdictions into a monthly report assembled by hand in a spreadsheet.',
      },
      outcome: {
        pt: 'O relatório consolidado sai sozinho, com a origem de cada número rastreável.',
        en: 'The consolidated report builds itself, with every figure traceable to its source.',
      },
    },
    {
      slug: 'farmaceutica-ciencias-vida',
      name: { pt: 'Farmacêutica e ciências da vida', en: 'Pharmaceuticals and life sciences' },
      pain: {
        pt: 'Dossiês regulatórios montados a partir de dezenas de documentos com versões e validades diferentes.',
        en: 'Regulatory dossiers assembled from dozens of documents with different versions and expiry dates.',
      },
      outcome: {
        pt: 'Uma fonte por documento, versão corrente sempre identificada, prazos avisados antes de expirarem.',
        en: 'One source per document, the current version always identified, deadlines flagged before they expire.',
      },
    },
    {
      slug: 'maquinaria-precisao',
      name: { pt: 'Maquinaria de precisão e relojoaria', en: 'Precision machinery and watchmaking' },
      pain: {
        pt: 'Pedidos de cotação que chegam em PDF e demoram dias a responder porque alguém tem de os ler e transcrever.',
        en: 'Quote requests that arrive as PDFs and take days to answer because someone has to read and retype them.',
      },
      outcome: {
        pt: 'A cotação sai em horas, com os dados já extraídos e revistos por uma pessoa.',
        en: 'The quote goes out in hours, with the data already extracted and checked by a person.',
      },
    },
    {
      slug: 'seguros-resseguros',
      name: { pt: 'Seguros e resseguros', en: 'Insurance and reinsurance' },
      pain: {
        pt: 'Sinistros com anexos em formatos e línguas diferentes, triados manualmente antes de chegarem a quem decide.',
        en: 'Claims with attachments in different formats and languages, triaged by hand before reaching the decision-maker.',
      },
      outcome: {
        pt: 'A triagem é automática e o analista recebe o caso já resumido, com o original sempre à mão.',
        en: 'Triage is automatic and the analyst receives the case already summarised, with the original always one click away.',
      },
    },
    {
      slug: 'banca-privada',
      name: { pt: 'Banca privada e serviços fiduciários', en: 'Private banking and fiduciary services' },
      pain: {
        pt: 'Processos de conhecimento do cliente repetidos a cada revisão, com os mesmos documentos pedidos outra vez.',
        en: 'Know-your-client processes repeated at every review, asking for the same documents all over again.',
      },
      outcome: {
        pt: 'Um registo mestre por cliente que alimenta cada revisão, e só pede o que mudou.',
        en: 'One master record per client that feeds every review and asks only for what changed.',
      },
    },
    {
      slug: 'quimica-especialidades',
      name: { pt: 'Química de especialidades', en: 'Specialty chemicals' },
      pain: {
        pt: 'Fichas de segurança e declarações de conformidade mantidas por país, em pastas partilhadas.',
        en: 'Safety data sheets and declarations of conformity maintained per country in shared folders.',
      },
      outcome: {
        pt: 'Uma biblioteca única, versionada, que gera a ficha certa para o país certo.',
        en: 'A single versioned library that produces the right sheet for the right country.',
      },
    },
    {
      slug: 'dispositivos-medicos',
      name: { pt: 'Dispositivos médicos', en: 'Medical devices' },
      pain: {
        pt: 'Ficheiros técnicos que crescem a cada auditoria e cuja versão vigente ninguém consegue apontar sem perguntar.',
        en: 'Technical files that grow with every audit, where nobody can point to the current version without asking.',
      },
      outcome: {
        pt: 'Versão vigente evidente, histórico intacto, auditoria preparada em horas em vez de semanas.',
        en: 'The current version is obvious, history intact, audits prepared in hours instead of weeks.',
      },
    },
    {
      slug: 'logistica-transitarios',
      name: { pt: 'Logística e transitários', en: 'Logistics and freight forwarding' },
      pain: {
        pt: 'Documentos de transporte lidos à mão para preencher o sistema, um por um, com erros que só aparecem na fronteira.',
        en: 'Shipping documents read by hand to fill the system, one by one, with errors that only surface at the border.',
      },
      outcome: {
        pt: 'Os dados entram já extraídos e conferidos; o que é duvidoso vai a uma pessoa, não a adivinhar.',
        en: 'Data arrives already extracted and checked; anything doubtful goes to a person rather than to a guess.',
      },
    },
    {
      slug: 'consultoria-auditoria',
      name: { pt: 'Consultoria e auditoria', en: 'Consulting and audit' },
      pain: {
        pt: 'Horas faturáveis gastas a recolher e formatar documentos do cliente antes de começar o trabalho que se vende.',
        en: 'Billable hours spent gathering and formatting client documents before the work you actually sell begins.',
      },
      outcome: {
        pt: 'A recolha e a formatação deixam de consumir horas faturáveis.',
        en: 'Gathering and formatting stop consuming billable hours.',
      },
    },
    {
      slug: 'energia-infraestrutura',
      name: { pt: 'Energia e infraestrutura', en: 'Energy and infrastructure' },
      pain: {
        pt: 'Concursos com requisitos documentais extensos e prazos curtos, respondidos a partir de e-mail e pastas.',
        en: 'Tenders with long documentary requirements and short deadlines, answered out of email and folders.',
      },
      outcome: {
        pt: 'Cada requisito ligado ao documento que o satisfaz, e o que falta é visível antes do prazo.',
        en: 'Every requirement linked to the document that satisfies it, and what is missing is visible before the deadline.',
      },
    },
  ],
};
