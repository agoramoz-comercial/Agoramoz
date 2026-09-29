import { CTA_PRIMARY, type Texto } from '@/content/types';

/**
 * A página de diagnóstico nos dois idiomas.
 *
 * O português é, palavra por palavra, o que estava no ar (`OFFER` e o texto
 * embutido na página). `OFFER` continua a existir: `/perfil` também o lê, e
 * `/perfil` fica só em português.
 *
 * O inglês fala a um decisor que não conhece a AGORAMOZ nem Moçambique: diz o
 * que recebe, o que custa saber e o que acontece se não houver adequação — as
 * três perguntas que travam um pedido B2B a uma empresa desconhecida.
 */
export const DIAGNOSTICO = {
  metaTitulo: { pt: CTA_PRIMARY, en: 'Request a Strategic Diagnostic' },
  metaDescricao: {
    pt: 'O AGORA Opportunity Diagnostic identifica onde a sua empresa perde oportunidades, tempo ou capacidade operacional e recomenda a arquitetura de maior impacto.',
    en: 'The AGORA Opportunity Diagnostic shows where your company loses opportunities, time or operational capacity, and recommends the architecture with the greatest impact.',
  },
  inicio: { pt: 'Início', en: 'Home' },
  trilho: { pt: 'Diagnóstico', en: 'Diagnostic' },

  eyebrow: { pt: 'Oferta de entrada', en: 'Where to start' },
  titulo: {
    pt: 'Comece pelo sistema que resolve o bloqueio mais importante.',
    en: 'Start with the system that removes your most important bottleneck.',
  },
  promessa: {
    pt: 'Um diagnóstico para identificar onde a sua empresa perde oportunidades, tempo ou capacidade operacional — e qual a arquitetura de maior impacto.',
    en: 'A diagnostic that shows where your company loses opportunities, time or operational capacity — and which architecture will have the greatest impact.',
  },
  entregas: [
    { pt: 'Entrevista com os responsáveis pelo processo', en: 'Interviews with the people who run the process' },
    { pt: 'Mapa do processo atual, ponta a ponta', en: 'An end-to-end map of the current process' },
    { pt: 'Identificação das fricções e dos pontos de perda', en: 'The friction points, and where value is lost' },
    { pt: 'Análise dos dados que já existem na empresa', en: 'Analysis of the data your company already has' },
    { pt: 'Prioridades ordenadas por impacto e esforço', en: 'Priorities ranked by impact and effort' },
    { pt: 'Arquitetura recomendada', en: 'Recommended architecture' },
    { pt: 'Plano de implementação', en: 'Implementation plan' },
    {
      pt: 'Proposta de execução apenas quando existir adequação',
      en: 'A delivery proposal only when there is a real fit',
    },
  ],
  garantia: {
    pt: 'Não garantimos resultados que dependem da procura, do preço ou da execução da sua equipa. Garantimos os compromissos técnicos e operacionais que forem definidos contratualmente.',
    en: 'We do not guarantee results that depend on demand, pricing or how your team executes. We guarantee the technical and operational commitments agreed in the contract.',
  },

  faqEyebrow: { pt: 'Perguntas frequentes', en: 'Frequently asked questions' },
  faqTitulo: { pt: 'Sobre o diagnóstico.', en: 'About the diagnostic.' },
  faq: [
    {
      q: { pt: 'O diagnóstico tem custo?', en: 'Is there a cost for the diagnostic?' },
      a: {
        pt: 'O âmbito e as condições do diagnóstico são acordados no primeiro contacto, em função da dimensão do processo a analisar. Dizemo-lo antes de começar, nunca depois.',
        en: 'The scope and terms of the diagnostic are agreed in the first conversation, based on the size of the process to analyse. We tell you before we start, never after.',
      },
    },
    {
      q: { pt: 'Quanto tempo demora?', en: 'How long does it take?' },
      a: {
        pt: 'Depende do número de pessoas a entrevistar e da complexidade do processo. A duração é estimada e comunicada depois desta primeira conversa, não antes de sabermos o que vamos analisar.',
        en: 'It depends on how many people we need to interview and how complex the process is. We estimate the duration and share it after this first conversation — not before we know what we are analysing.',
      },
    },
    {
      q: {
        pt: 'O que acontece se concluírem que não há adequação?',
        en: 'What happens if you conclude it is not a fit?',
      },
      a: {
        pt: 'Dizemos isso e não há proposta. Entregamos na mesma o que o diagnóstico apurou — o mapa do processo e as fricções identificadas são seus, independentemente de trabalharmos juntos.',
        en: 'We say so, and there is no proposal. You still receive what the diagnostic found — the process map and the friction points are yours, whether or not we work together.',
      },
    },
    {
      q: {
        pt: 'Preciso de ter tudo definido antes de submeter?',
        en: 'Do I need to have everything defined before I submit?',
      },
      a: {
        pt: 'Não. Basta conseguir descrever o processo que o incomoda e o efeito que isso tem. O resto é o que o diagnóstico existe para descobrir.',
        en: 'No. You only need to describe the process that is holding you back and what it costs you. The rest is what the diagnostic is for.',
      },
    },
  ],
} as const satisfies Record<string, Texto | readonly Texto[] | readonly { q: Texto; a: Texto }[]>;
