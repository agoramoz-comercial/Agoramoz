import type { SectorSlug, Texto } from '@/content/types';

/**
 * O formulário de diagnóstico nos dois idiomas: a interface, as mensagens de
 * validação e os rótulos dos setores dos mercados de operação.
 *
 * O português é, palavra por palavra, o que estava embutido no formulário e no
 * schema. Nenhum leitor português vê uma vírgula diferente.
 *
 * O inglês não é tradução literal. «Decido», «Decido em conjunto» são respostas
 * na primeira pessoa porque é assim que se responde a «qual o seu papel?» — em
 * inglês ficam na primeira pessoa também, e com a forma que um decisor
 * britânico ou americano usaria.
 */

export const PASSOS = [
  { pt: 'Onde opera a sua empresa', en: 'Where your company operates' },
  { pt: 'A sua empresa', en: 'Your company' },
  { pt: 'O processo a melhorar', en: 'The process to improve' },
  { pt: 'A decisão', en: 'The decision' },
  { pt: 'Como o contactamos', en: 'How we reach you' },
] as const satisfies readonly Texto[];

export const TAMANHOS = {
  '1-9': { pt: '1 a 9 colaboradores', en: '1 to 9 employees' },
  '10-49': { pt: '10 a 49', en: '10 to 49' },
  '50-249': { pt: '50 a 249', en: '50 to 249' },
  '250+': { pt: '250 ou mais', en: '250 or more' },
} as const satisfies Record<string, Texto>;

export const PRAZOS = {
  imediato: { pt: 'Imediato', en: 'Immediately' },
  '1-3-meses': { pt: 'Nos próximos 1 a 3 meses', en: 'Within the next 1 to 3 months' },
  '3-6-meses': { pt: 'Em 3 a 6 meses', en: 'In 3 to 6 months' },
  'sem-data': { pt: 'Ainda sem data', en: 'No date yet' },
} as const satisfies Record<string, Texto>;

export const PAPEIS = {
  decisor: { pt: 'Decido', en: 'I make the decision' },
  'co-decisor': { pt: 'Decido em conjunto', en: 'I decide jointly with others' },
  influenciador: { pt: 'Influencio a decisão', en: 'I influence the decision' },
  pesquisa: { pt: 'Estou a recolher informação', en: 'I am gathering information' },
} as const satisfies Record<string, Texto>;

/** Pelo `value` de `IMPROVEMENT_GOALS`: o valor guardado é o mesmo nos dois idiomas. */
export const OBJETIVOS = {
  aquisicao: { pt: 'Geração e conversão de oportunidades', en: 'Generating and converting opportunities' },
  atendimento: { pt: 'Atendimento', en: 'Customer service' },
  operacoes: { pt: 'Operações', en: 'Operations' },
  administrativo: { pt: 'Trabalho administrativo', en: 'Administrative work' },
  integracao: { pt: 'Integração de sistemas', en: 'Systems integration' },
  informacao: { pt: 'Acesso à informação', en: 'Access to information' },
  experiencia: { pt: 'Experiência digital', en: 'Digital experience' },
  reporting: { pt: 'Reporting e decisão', en: 'Reporting and decision-making' },
} as const satisfies Record<string, Texto>;

/** Setores dos três mercados de operação. O português continua a viver em `SECTOR_LABELS`. */
export const ROTULO_SETOR: Record<SectorSlug, Texto> = {
  agronegocio: { pt: 'Agricultura e agronegócio', en: 'Agriculture and agribusiness' },
  'energia-mineracao': { pt: 'Energia, mineração e serviços industriais', en: 'Energy, mining and industrial services' },
  logistica: { pt: 'Logística e transportes', en: 'Logistics and transport' },
  'construcao-imobiliario': { pt: 'Construção e imobiliário', en: 'Construction and real estate' },
  'comercio-servicos': { pt: 'Comércio e serviços B2B', en: 'B2B trade and services' },
  'turismo-hotelaria': { pt: 'Turismo, hotelaria e alojamento', en: 'Tourism, hospitality and accommodation' },
  industria: { pt: 'Indústria e fabricação', en: 'Industry and manufacturing' },
  'servicos-profissionais': { pt: 'Serviços profissionais B2B', en: 'B2B professional services' },
  'logistica-comercio': { pt: 'Logística, transportes e comércio', en: 'Logistics, transport and trade' },
  'financas-seguros': { pt: 'Serviços financeiros, seguros e fintech', en: 'Financial services, insurance and fintech' },
  'tecnologia-saas': { pt: 'Tecnologia e SaaS', en: 'Technology and SaaS' },
  'industria-energia-construcao': { pt: 'Indústria, energia e construção', en: 'Industry, energy and construction' },
};

/** `{n}`, `{total}`, `{moeda}` e `{indicativo}` são substituídos no componente. */
export const FORM = {
  passo: { pt: 'Passo {n} de {total}', en: 'Step {n} of {total}' },
  corrija: { pt: 'Corrija os seguintes campos:', en: 'Please correct the following fields:' },
  paisOperacao: { pt: 'País de operação', en: 'Countries where we operate' },
  global: { pt: 'Global', en: 'Global' },
  setor: { pt: 'Setor', en: 'Sector' },
  nomeEmpresa: { pt: 'Nome da empresa', en: 'Company name' },
  colaboradores: { pt: 'Número de colaboradores', en: 'Number of employees' },
  website: { pt: 'Website atual', en: 'Current website' },
  websiteDica: { pt: 'Se ainda não tiver, deixe em branco.', en: 'If you do not have one yet, leave this blank.' },
  websiteExemplo: { pt: 'exemplo.com', en: 'example.com' },
  melhorar: { pt: 'O que pretende melhorar?', en: 'What do you want to improve?' },
  melhorarDica: { pt: 'Pode escolher mais do que um.', en: 'You can choose more than one.' },
  impacto: { pt: 'Qual é o impacto atual deste problema?', en: 'What is this problem costing you today?' },
  impactoDica: {
    pt: 'Tempo perdido, erros, atrasos, oportunidades que não foram acompanhadas.',
    en: 'Lost time, errors, delays, opportunities that were not followed up.',
  },
  prazo: { pt: 'Prazo da decisão', en: 'Decision timeframe' },
  faixa: { pt: 'Faixa de investimento ({moeda})', en: 'Investment range ({moeda})' },
  papel: { pt: 'O seu papel na decisão', en: 'Your role in the decision' },
  nome: { pt: 'Nome', en: 'Name' },
  email: { pt: 'Email profissional', en: 'Work email' },
  telefone: { pt: 'Telefone ou WhatsApp', en: 'Phone or WhatsApp' },
  indicativo: { pt: 'Indicativo {indicativo}', en: 'Country code {indicativo}' },
  politica: { pt: 'Política de privacidade', en: 'Privacy policy' },
  opcional: { pt: '(opcional)', en: '(optional)' },

  erroTitulo: { pt: 'Não foi possível enviar o pedido.', en: 'We could not send your request.' },
  erroCorpo: {
    pt: 'As suas respostas continuam aqui — carregue outra vez em enviar. Se voltar a falhar, fale connosco por',
    en: 'Your answers are still here — press send again. If it fails again, contact us on',
  },
  ou: { pt: 'ou', en: 'or' },

  voltar: { pt: 'Voltar', en: 'Back' },
  continuar: { pt: 'Continuar', en: 'Continue' },
  enviar: { pt: 'Enviar pedido', en: 'Send request' },

  recebido: { pt: 'Pedido recebido.', en: 'Request received.' },
  recebidoCorpo: {
    pt: 'Vamos analisar o que descreveu e responder com os próximos passos. Se concluirmos que não há adequação, dizemos isso — é mais útil para si do que uma proposta que não faz sentido.',
    en: 'We will review what you described and reply with the next steps. If we conclude it is not a fit, we will say so — that is more useful to you than a proposal that makes no sense.',
  },
  oQueRecebemos: { pt: 'O que recebemos', en: 'What we received' },
  mercado: { pt: 'Mercado', en: 'Market' },
  faixaIndicada: { pt: 'Faixa indicada', en: 'Range indicated' },
  prazoCurto: { pt: 'Prazo', en: 'Timeframe' },
  agora: { pt: 'O que acontece agora', en: 'What happens next' },
  agora1: {
    pt: 'Lemos o que descreveu e identificamos o bloqueio principal.',
    en: 'We read what you described and identify the main bottleneck.',
  },
  agora2: {
    pt: 'Respondemos por email com o problema, a viabilidade e o próximo passo.',
    en: 'We reply by email with the problem, its feasibility and the next step.',
  },
  agora3: {
    pt: 'Se fizer sentido avançar, marcamos uma conversa objetiva.',
    en: 'If it makes sense to go ahead, we schedule a focused conversation.',
  },
  whatsapp: { pt: 'Acrescentar algo por WhatsApp', en: 'Add something on WhatsApp' },
  verSolucoes: { pt: 'Ver as soluções entretanto', en: 'See the solutions in the meantime' },
} as const satisfies Record<string, Texto>;

/**
 * Mensagens de validação. Em português, as que estavam no schema. Em inglês,
 * escritas para não coincidirem com o texto por omissão do Zod («Invalid
 * input», «Required») — o teste de mensagens recusa-o nos dois idiomas.
 */
export const VALIDACAO = {
  pais: { pt: 'Selecione o país.', en: 'Choose the country.' },
  setor: { pt: 'Selecione o setor.', en: 'Choose the sector.' },
  empresa: { pt: 'Indique o nome da empresa.', en: 'Enter the company name.' },
  dimensao: { pt: 'Selecione a dimensão da equipa.', en: 'Choose the size of the team.' },
  websiteLongo: { pt: 'O endereço é demasiado longo.', en: 'That address is too long.' },
  processo: { pt: 'Selecione pelo menos um processo.', en: 'Choose at least one process.' },
  impactoCurto: {
    pt: 'Descreva o impacto em pelo menos 20 caracteres.',
    en: 'Describe the impact in at least 20 characters.',
  },
  impactoLongo: {
    pt: 'A descrição não pode passar de 1500 caracteres.',
    en: 'The description cannot be longer than 1500 characters.',
  },
  prazo: { pt: 'Selecione o prazo de decisão.', en: 'Choose the decision timeframe.' },
  faixa: { pt: 'Selecione uma faixa.', en: 'Choose a range.' },
  papel: { pt: 'Selecione o seu papel na decisão.', en: 'Choose your role in the decision.' },
  nome: { pt: 'Indique o seu nome.', en: 'Enter your name.' },
  email: { pt: 'Indique um email válido.', en: 'Enter a work email we can reply to.' },
  telefone: { pt: 'Indique um contacto telefónico.', en: 'Enter a phone number.' },
  consentimento: {
    pt: 'É necessário o seu consentimento para prosseguir.',
    en: 'We need your consent to continue.',
  },
} as const satisfies Record<string, Texto>;
