import type { CountryCode, Texto } from '@/content/types';

/**
 * Texto das secções partilhadas e das páginas de soluções, nos dois idiomas.
 *
 * O português é, palavra por palavra, o que estava embutido nos componentes e
 * nas páginas. O inglês é escrito para um decisor que não conhece a AGORAMOZ —
 * frases curtas, o resultado antes do método, e nenhuma promessa que o
 * português não faça.
 */

/** O posicionamento de cada mercado de operação. O português vive também em `COUNTRIES`. */
export const POSICIONAMENTO: Record<CountryCode, Texto> = {
  mz: {
    pt: 'Trabalhamos com empresas que já têm procura e precisam de estrutura: organizar pedidos, clientes, fornecedores e operações num único sistema, sem substituir tudo o que já funciona.',
    en: 'We work with companies that already have demand and need structure: bringing requests, customers, suppliers and operations into one system, without replacing everything that already works.',
  },
  pt: {
    pt: 'Não propomos substituir o que já funciona. Ligamos os sistemas existentes, automatizamos o trabalho entre eles e devolvemos horas de equipa qualificada a trabalho qualificado.',
    en: 'We do not propose replacing what already works. We connect your existing systems, automate the work between them and give qualified people their hours back for qualified work.',
  },
  br: {
    pt: 'Trabalhamos com operações de maior volume e times distribuídos, onde cada minuto de trabalho manual é multiplicado por milhares de transações por mês.',
    en: 'We work with higher-volume operations and distributed teams, where every minute of manual work is multiplied by thousands of transactions a month.',
  },
};

/** A quarta entrada de mercado: o nível global, em inglês. */
export const CARTAO_GLOBAL = {
  nome: { pt: 'Global', en: 'Global' },
  posicionamento: {
    pt: 'Dez mercados de expansão, da Suíça a Singapura, com a mesma disciplina: diagnóstico primeiro, preço fixo por fase e aprovação humana em cada decisão.',
    en: 'Ten expansion markets, from Switzerland to Singapore, with the same discipline: diagnostic first, a fixed price per phase and human approval at every decision.',
  },
} as const;

export const MERCADOS = {
  /** `{nome}` é substituído pelo nome do mercado. */
  explorar: { pt: 'Explorar {nome}', en: 'Explore {nome}' },
} as const;

export const OFERTA = {
  nota: {
    pt: 'Conversa objetiva. Problema definido. Próximos passos claros.',
    en: 'A focused conversation. A defined problem. Clear next steps.',
  },
  recebe: { pt: 'O que recebe', en: 'What you receive' },
} as const;

export const FINAL = {
  titulo: {
    pt: 'Antes de comprar mais tecnologia, descubra qual sistema produzirá maior impacto.',
    en: 'Before you buy more technology, find out which system will have the greatest impact.',
  },
  corpo: {
    pt: 'Partilhe o processo que pretende melhorar. A AGORAMOZ analisará o problema, a viabilidade e o próximo passo recomendado.',
    en: 'Share the process you want to improve. AGORAMOZ will analyse the problem, its feasibility and the recommended next step.',
  },
  micro: {
    pt: 'Sem pressão comercial · Sem soluções genéricas · Sem promessas impossíveis',
    en: 'No sales pressure · No generic solutions · No impossible promises',
  },
} as const;

export const INDICE_SOLUCOES = {
  // O que se pesquisa primeiro, a marca no fim (pelo template): 50–60 caracteres.
  metaTitulo: { pt: 'Websites, software, automação e agentes de IA', en: 'Websites, software, automation and AI agents' },
  metaDescricao: {
    pt: 'Websites avançados, software empresarial, automação de processos, agentes de IA e infraestrutura digital. Cinco capacidades, um sistema.',
    en: 'Advanced websites, business software, process automation, AI agents and digital infrastructure. Five capabilities, one system.',
  },
  inicio: { pt: 'Início', en: 'Home' },
  trilho: { pt: 'Soluções', en: 'Solutions' },
  eyebrow: { pt: 'Soluções', en: 'Solutions' },
  titulo: {
    pt: 'Cinco capacidades. Uma decide-se por diagnóstico, não por catálogo.',
    en: 'Five capabilities. You choose by diagnostic, not from a catalogue.',
  },
  lead: {
    pt: 'Cada capacidade resolve um bloqueio diferente. Apresentá-las como igualmente importantes seria inútil para si — o diagnóstico determina por qual começar.',
    en: 'Each capability removes a different bottleneck. Presenting them as equally important would be useless to you — the diagnostic decides where to start.',
  },
} as const;

export const PAGINA_SOLUCAO = {
  problemaEyebrow: { pt: 'O problema', en: 'The problem' },
  problemaTitulo: { pt: 'O que encontramos com mais frequência.', en: 'What we find most often.' },
  componentesEyebrow: { pt: 'Componentes', en: 'Components' },
  componentesTitulo: { pt: 'O que o sistema inclui.', en: 'What the system includes.' },
  usosEyebrow: { pt: 'Casos de utilização', en: 'Use cases' },
  usosTitulo: { pt: 'O que passa a acontecer sozinho.', en: 'What starts to happen on its own.' },
  integracoes: { pt: 'Integrações', en: 'Integrations' },
  seguranca: { pt: 'Segurança e controlo', en: 'Security and control' },
  processoEyebrow: { pt: 'Processo', en: 'Process' },
  processoTitulo: { pt: 'Como implementamos.', en: 'How we implement it.' },
  mercadosEyebrow: { pt: 'Mercados', en: 'Markets' },
  mercadosTitulo: { pt: 'Onde aplicamos esta solução.', en: 'Where we apply this solution.' },
  faqEyebrow: { pt: 'Perguntas frequentes', en: 'Frequently asked questions' },
  /** `{nome}` é substituído pelo nome da solução. */
  faqTitulo: { pt: 'Sobre {nome}.', en: 'About {nome}.' },
} as const;
