import type { Country } from '../types';

/**
 * Brasil — o ângulo é escala e volume. Português brasileiro (você, gerenciar,
 * time), operações maiores, times distribuídos, mercado competitivo. LGPD.
 */
export const br: Country = {
  code: 'br',
  name: 'Brasil',
  demonym: 'brasileiras',
  locale: 'pt-BR',
  currency: 'BRL',
  dialCode: '+55',
  // Sem linha local. Não é ausência de WhatsApp: a UI cai para o número da
  // empresa em SITE.whatsapp. Este campo só se preenche quando existir mesmo
  // uma linha própria neste país.
  whatsapp: null,
  privacyRegime: 'LGPD',
  consent: {
    text: {
      pt: 'Autorizo o tratamento dos meus dados pela AGORAMOZ para responder a esta solicitação, nos termos da LGPD. Posso solicitar acesso, correção ou exclusão dos meus dados a qualquer momento.',
      en: 'I authorise AGORAMOZ to process my data to answer this request, under the LGPD. I may request access to, correction of or deletion of my data at any time.',
    },
    policyHref: '/privacidade',
  },
  investmentBands: [
    { id: 'br-1', label: { pt: 'Até R$ 30 mil', en: 'Up to R$30,000' }, scoreWeight: 6 },
    { id: 'br-2', label: { pt: 'R$ 30 mil – R$ 80 mil', en: 'R$30,000 – 80,000' }, scoreWeight: 14 },
    { id: 'br-3', label: { pt: 'R$ 80 mil – R$ 250 mil', en: 'R$80,000 – 250,000' }, scoreWeight: 20 },
    { id: 'br-4', label: { pt: 'Acima de R$ 250 mil', en: 'Over R$250,000' }, scoreWeight: 25 },
    { id: 'br-0', label: { pt: 'Ainda a definir', en: 'Not yet defined' }, scoreWeight: 4 },
  ],
  sectors: [
    'agronegocio',
    'financas-seguros',
    'tecnologia-saas',
    'logistica',
    'industria-energia-construcao',
  ],
  voice: {
    emphasis: ['escala', 'volume de operação', 'times distribuídos', 'eficiência por transação'],
    proofLanguage:
      'No Brasil a pergunta é se aguenta volume: quantas transações por dia, com qual latência e qual custo por operação.',
  },
  hero: {
    eyebrow: 'AGORAMOZ Brasil',
    headline: 'O processo que funciona com 50 pedidos por dia quebra com 500.',
    lead: 'Operações brasileiras crescem em volume antes de crescer em estrutura. O que era um ajuste manual vira gargalo diário, e o custo por transação sobe justamente quando a escala devia baixá-lo. Construímos infraestrutura que aguenta o volume.',
  },
  positioning:
    'Trabalhamos com operações de maior volume e times distribuídos, onde cada minuto de trabalho manual é multiplicado por milhares de transações por mês.',
  problems: [
    {
      title: 'O gargalo é manual',
      body: 'Um passo do processo depende de uma pessoa conferir e repassar. Esse passo define a capacidade máxima da operação inteira.',
    },
    {
      title: 'Time distribuído, informação centralizada em ninguém',
      body: 'Filiais, home office e parceiros trabalham com versões diferentes da mesma informação.',
    },
    {
      title: 'Custo por transação que não cai',
      body: 'O volume dobrou, o time dobrou. A escala não gerou ganho porque o processo não mudou.',
    },
    {
      title: 'Atendimento repetitivo',
      body: 'A maior parte das solicitações é a mesma pergunta em palavras diferentes — respondida manualmente, uma a uma.',
    },
  ],
  seo: {
    title: 'Automação, IA e software para operações de alto volume no Brasil',
    description:
      'A AGORAMOZ constrói infraestrutura digital para operações brasileiras que cresceram em volume: automação, integração e agentes de IA com supervisão humana.',
  },
  updatedAt: '2026-09-22',
};
