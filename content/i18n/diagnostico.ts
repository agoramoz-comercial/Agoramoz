import type { Texto } from '@/content/types';

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
  metaTitulo: { pt: 'Diagnóstico Operacional Digital', en: 'Digital Operational Diagnostic' },
  metaDescricao: {
    pt: 'Saiba onde intervir antes de comprar tecnologia: processo, baseline, riscos, opções, arquitetura e roadmap numa decisão executiva clara.',
    en: 'Know where to intervene before buying technology: process, baseline, risks, options, architecture and roadmap in one clear executive decision.',
  },
  inicio: { pt: 'Início', en: 'Home' },
  trilho: { pt: 'Diagnóstico', en: 'Diagnostic' },

  nome: { pt: 'Diagnóstico Operacional Digital', en: 'Digital Operational Diagnostic' },
  eyebrow: { pt: 'Oferta de entrada', en: 'Where to start' },
  titulo: {
    pt: 'Saiba onde intervir antes de comprar tecnologia.',
    en: 'Know where to intervene before you buy technology.',
  },
  promessa: {
    pt: 'O diagnóstico transforma um problema pouco definido numa decisão executiva com processo, prioridades, riscos, opções e próximos passos claros.',
    en: 'The diagnostic turns a loosely defined problem into an executive decision with the process, priorities, risks, options and clear next steps.',
  },
  entregas: [
    { pt: 'Definição do problema e mapa atual', en: 'Problem definition and current map' },
    { pt: 'Inventário de sistemas e dados relevantes', en: 'Inventory of relevant systems and data' },
    { pt: 'Baseline e matriz de bloqueios', en: 'Baseline and blocker matrix' },
    { pt: 'Riscos e dependências', en: 'Risks and dependencies' },
    { pt: 'Desenho conceptual do processo futuro', en: 'Conceptual design of the future process' },
    { pt: 'Opções e prioridades', en: 'Options and priorities' },
    { pt: 'Arquitetura conceptual', en: 'Conceptual architecture' },
    { pt: 'Estimativa paramétrica e premissas', en: 'Parametric estimate and assumptions' },
    { pt: 'Roadmap e recomendação executiva', en: 'Roadmap and executive recommendation' },
    { pt: 'Decisão sobre piloto ou implementação', en: 'Decision on a pilot or implementation' },
  ],
  garantia: {
    pt: 'Não inclui software em produção, integração completa, pentest ou certificação, garantia de poupança, opinião jurídica nem preço fechado para componentes ainda desconhecidos. A recomendação é independente: pode concluir não investir, corrigir o processo, configurar um sistema atual, adquirir um produto, integrar, pilotar, desenvolver ou recolher mais dados.',
    en: 'It does not include production software, full integration, a pentest or certification, guaranteed savings, legal advice, or a fixed price for components not yet known. The recommendation is independent: it may conclude not to invest, to fix the process, configure a current system, buy a product, integrate, pilot, build, or collect more data.',
  },

  faqEyebrow: { pt: 'Perguntas frequentes', en: 'Frequently asked questions' },
  faqTitulo: { pt: 'Sobre o diagnóstico.', en: 'About the diagnostic.' },
  faq: [
    {
      q: { pt: 'Para quem é?', en: 'Who is it for?' },
      a: {
        pt: 'Organizações com um processo lento, manual ou pouco visível; empresas com sistemas desconectados; equipas que consideram software, automação ou IA; direções que precisam de justificar investimento; e organizações com implementações anteriores de baixa adoção.',
        en: 'Organisations with a slow, manual or opaque process; companies with disconnected systems; teams considering software, automation or AI; leadership that needs to justify an investment; and organisations whose earlier implementations saw low adoption.',
      },
    },
    {
      q: { pt: 'O que investigamos?', en: 'What do we investigate?' },
      a: {
        pt: 'O trigger e o objetivo empresarial; utilizadores, processo, volumes, tempos e exceções; retrabalho, erros e dependências; dados, sistemas e integrações; segurança, privacidade e continuidade; capacidade de adoção e custo provável do estado atual.',
        en: 'The trigger and the business objective; users, process, volumes, times and exceptions; rework, errors and dependencies; data, systems and integrations; security, privacy and continuity; capacity to adopt and the likely cost of the current state.',
      },
    },
    {
      q: { pt: 'A avaliação inicial é gratuita?', en: 'Is the initial assessment free?' },
      a: {
        pt: 'Pode existir uma avaliação limitada para determinar elegibilidade — a Avaliação Inicial de Oportunidade, que termina numa nota de oportunidade e no próximo passo. Trabalho que envolva entrevistas, mapeamento, análise, arquitetura ou recomendação executiva é o Diagnóstico Executivo, e é contratado.',
        en: 'There may be a limited assessment to determine eligibility — the Initial Opportunity Assessment, which ends with an opportunity note and the next step. Work involving interviews, mapping, analysis, architecture or an executive recommendation is the Executive Diagnostic, and it is contracted.',
      },
    },
    {
      q: { pt: 'O diagnóstico obriga a contratar a implementação?', en: 'Does the diagnostic oblige us to contract the implementation?' },
      a: {
        pt: 'Não. O cliente pode não avançar, executar internamente ou contratar outro fornecedor, conforme os termos acordados.',
        en: 'No. The client may decide not to proceed, to execute internally or to hire another supplier, under the agreed terms.',
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
        pt: 'Preciso de ter tudo definido antes de submeter?',
        en: 'Do I need to have everything defined before I submit?',
      },
      a: {
        pt: 'Não. Não precisa de escolher uma tecnologia. Descreva o processo, a consequência e o que já tentou — o resto é o que o diagnóstico existe para descobrir.',
        en: 'No. You do not need to choose a technology. Describe the process, the consequence and what you have already tried — the rest is what the diagnostic is for.',
      },
    },
  ],
} as const satisfies Record<string, Texto | readonly Texto[] | readonly { q: Texto; a: Texto }[]>;
