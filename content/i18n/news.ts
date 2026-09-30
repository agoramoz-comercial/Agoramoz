import type { Texto } from '@/content/types';
import type { IdiomaMotor } from '@/lib/news/limites';
import type { Prioridade, Seccao, Severidade, TipoCadeia } from '@/lib/news/esquema';

/**
 * AGORAMOZ Moz News, nos dois idiomas.
 *
 * A proposta e os blocos «como funciona / para quem / o que entrega» vêm da
 * página do Lovable (`agoramoz.lovable.app/news`), revistos: sai «Grátis. Sem
 * limites.» — há limite por origem, e dizer o contrário seria falso — e sai a
 * promessa de «estratégia»: o que sai é uma análise para decidir, e a decisão
 * continua a ser de quem lê.
 */

export const MARCA_NEWS = 'AGORAMOZ Moz News';

export const NEWS = {
  metaTitulo: {
    pt: 'Moz News: notícias transformadas em decisões para empresas',
    en: 'Moz News: turning news into business decisions',
  },
  metaDescricao: {
    pt: 'Cole o link ou o texto de uma notícia e receba uma análise executiva: impacto por dimensão, riscos, oportunidades e o que fazer — com foco em Moçambique.',
    en: 'Paste a news link or article text and get an executive analysis: impact by dimension, risks, opportunities and what to do — focused on Mozambique.',
  },
  inicio: { pt: 'Início', en: 'Home' },
  trilho: { pt: 'Moz News', en: 'Moz News' },

  eyebrow: { pt: 'Inteligência de decisão', en: 'Decision intelligence' },
  titulo: { pt: 'Uma notícia entra. Uma decisão sai.', en: 'A news story goes in. A decision comes out.' },
  promessa: {
    pt: 'Não é um leitor de notícias. É uma análise para quem decide em Moçambique e nos mercados lusófonos: o que está a acontecer, onde pesa, que riscos e oportunidades abre, e o que fazer a seguir.',
    en: 'Not a news reader. An analysis for people who make decisions in Mozambique and Portuguese-speaking markets: what is happening, where it weighs, which risks and opportunities it opens, and what to do next.',
  },

  // ── Formulário ─────────────────────────────────────────────────────────
  formTitulo: { pt: 'Analisar uma notícia', en: 'Analyse a news story' },
  modoUrl: { pt: 'Link', en: 'Link' },
  modoTexto: { pt: 'Texto', en: 'Text' },
  modoLegenda: { pt: 'Como quer enviar a notícia', en: 'How to send the story' },
  rotuloUrl: { pt: 'Link da notícia', en: 'News link' },
  dicaUrl: { pt: 'Um endereço https de um site de notícias.', en: 'An https address from a news site.' },
  rotuloTexto: { pt: 'Texto da notícia', en: 'Article text' },
  dicaTexto: {
    pt: 'Cole o artigo completo, entre 200 e 20 000 caracteres.',
    en: 'Paste the full article, between 200 and 20,000 characters.',
  },
  rotuloIdioma: { pt: 'Idioma do relatório', en: 'Report language' },
  analisar: { pt: 'Analisar', en: 'Analyse' },
  aAnalisar: { pt: 'A analisar…', en: 'Analysing…' },
  aAnalisarDetalhe: {
    pt: 'A ler o artigo e a medir o impacto por dimensão. Costuma levar entre 20 e 40 segundos.',
    en: 'Reading the article and scoring impact by dimension. It usually takes 20 to 40 seconds.',
  },
  pronto: { pt: 'Análise pronta.', en: 'Analysis ready.' },

  erroUrl: { pt: 'Indique um link https de um site público.', en: 'Enter an https link from a public site.' },
  erroTexto: {
    pt: 'O texto precisa de ter entre 200 e 20 000 caracteres.',
    en: 'The text must be between 200 and 20,000 characters.',
  },
  historicoFalhou: {
    pt: 'A análise está pronta, mas não foi possível guardá-la no histórico deste browser.',
    en: 'The analysis is ready, but it could not be saved to this browser’s history.',
  },
  erros: {
    413: {
      pt: 'O texto é demasiado longo. Cole só o artigo, até 20 000 caracteres.',
      en: 'The text is too long. Paste only the article, up to 20,000 characters.',
    },
    400: {
      pt: 'Este pedido não pôde ser lido. Confirme o link ou o texto.',
      en: 'This request could not be read. Check the link or the text.',
    },
    429: {
      pt: 'Atingiu o limite de análises por agora. Tente de novo dentro de alguns minutos.',
      en: 'You have reached the analysis limit for now. Try again in a few minutes.',
    },
    502: {
      pt: 'O motor não conseguiu analisar esta notícia. Se o site bloqueia leitura automática, cole o texto em vez do link.',
      en: 'The engine could not analyse this story. If the site blocks automated reading, paste the text instead of the link.',
    },
    503: {
      pt: 'A análise de notícias ainda não está activa neste site.',
      en: 'News analysis is not active on this site yet.',
    },
    504: {
      pt: 'A análise demorou demasiado. Tente de novo, ou cole o texto em vez do link.',
      en: 'The analysis took too long. Try again, or paste the text instead of the link.',
    },
    rede: {
      pt: 'Sem ligação. Verifique a rede e tente de novo.',
      en: 'No connection. Check your network and try again.',
    },
  },

  historico: { pt: 'Últimas análises neste dispositivo', en: 'Recent analyses on this device' },
  historicoNota: {
    pt: 'Ficam só neste browser. Não são enviadas nem guardadas por nós.',
    en: 'They stay in this browser only. We do not receive or store them.',
  },
  limparHistorico: { pt: 'Limpar', en: 'Clear' },

  // ── Como funciona / para quem / o que entrega ───────────────────────────
  passosEyebrow: { pt: 'Como funciona', en: 'How it works' },
  passosTitulo: { pt: 'De uma notícia a uma decisão, em três passos.', en: 'From a news story to a decision, in three steps.' },
  passos: [
    {
      titulo: { pt: 'Cole o link ou o texto', en: 'Paste the link or the text' },
      corpo: {
        pt: 'Um link de qualquer notícia, ou o texto do artigo quando o site não deixa ler automaticamente.',
        en: 'A link to any news story, or the article text when the site does not allow automated reading.',
      },
    },
    {
      titulo: { pt: 'O motor analisa', en: 'The engine analyses' },
      corpo: {
        pt: 'Impacto económico, financeiro, governamental, empresarial e social, pontuado de −100 a +100, com foco em Moçambique.',
        en: 'Economic, financial, governmental, business and social impact, scored from −100 to +100, focused on Mozambique.',
      },
    },
    {
      titulo: { pt: 'Decida com o relatório', en: 'Decide with the report' },
      corpo: {
        pt: 'Um relatório ordenado pela decisão: veredicto, impacto, riscos contra oportunidades e o que fazer já.',
        en: 'A report ordered by the decision: verdict, impact, risks against opportunities, and what to do now.',
      },
    },
  ],
  paraQuemEyebrow: { pt: 'Para quem', en: 'Who it is for' },
  paraQuemTitulo: { pt: 'Desenhado para quem toma decisões.', en: 'Built for the people who decide.' },
  paraQuem: [
    {
      papel: { pt: 'CEO', en: 'CEO' },
      corpo: {
        pt: 'A leitura estratégica e os sinais que ainda não estão nas manchetes.',
        en: 'The strategic reading, and the signals not yet in the headlines.',
      },
    },
    {
      papel: { pt: 'CFO', en: 'CFO' },
      corpo: {
        pt: 'Impacto financeiro, pressão de custos e sinais de investimento.',
        en: 'Financial impact, cost pressure and investment signals.',
      },
    },
    {
      papel: { pt: 'COO', en: 'COO' },
      corpo: {
        pt: 'Riscos operacionais, cadeia de abastecimento e logística.',
        en: 'Operational risk, supply chain and logistics.',
      },
    },
    {
      papel: { pt: 'Estratégia', en: 'Strategy' },
      corpo: {
        pt: 'Oceanos vermelho e azul, paralelos históricos e caminhos de crescimento.',
        en: 'Red and blue oceans, historical parallels and growth paths.',
      },
    },
  ],
  entregaEyebrow: { pt: 'O que entrega', en: 'What you get' },
  entregaTitulo: { pt: 'Um relatório que se lê pela ordem da decisão.', en: 'A report you read in the order you decide.' },
  entrega: [
    {
      titulo: { pt: 'Impacto por dimensão', en: 'Impact by dimension' },
      corpo: { pt: 'Cinco dimensões pontuadas de −100 a +100, com a explicação ao lado de cada número.', en: 'Five dimensions scored −100 to +100, with the explanation beside each number.' },
    },
    {
      titulo: { pt: 'Riscos contra oportunidades', en: 'Risks against opportunities' },
      corpo: { pt: 'Lado a lado, os riscos ordenados por severidade.', en: 'Side by side, risks ordered by severity.' },
    },
    {
      titulo: { pt: 'Macro, meso e micro', en: 'Macro, meso and micro' },
      corpo: { pt: 'Três camadas económicas, no contexto moçambicano.', en: 'Three economic layers, in the Mozambican context.' },
    },
    {
      titulo: { pt: 'Cadeias de sinal', en: 'Signal chains' },
      corpo: { pt: 'Causa e efeito em linha: política → custo ↑ → preço ↑ → procura ↓.', en: 'Cause and effect in one line: policy → cost ↑ → price ↑ → demand ↓.' },
    },
    {
      titulo: { pt: 'Perguntas por indústria', en: 'Questions by industry' },
      corpo: { pt: 'As perguntas que um crítico do sector faria, com a leitura estratégica.', en: 'The questions a sector critic would ask, with the strategic reading.' },
    },
    {
      titulo: { pt: 'Partilhar e imprimir', en: 'Share and print' },
      corpo: { pt: 'Resumo pronto a copiar para o LinkedIn, e versão para imprimir ou guardar em PDF.', en: 'A summary ready to copy to LinkedIn, and a version to print or save as PDF.' },
    },
  ],

  aviso: {
    pt: 'Análise gerada por IA a partir do artigo indicado. Não é aconselhamento financeiro nem jurídico: confirme os factos nas fontes antes de decidir.',
    en: 'AI-generated analysis of the article provided. It is not financial or legal advice: check the facts against the sources before deciding.',
  },
} as const;

/** Nomes dos idiomas na própria língua — é assim que se reconhecem numa lista. */
export const IDIOMAS_DO_MOTOR: Record<IdiomaMotor, string> = {
  pt: 'Português',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  xg: 'Xichangana',
};

// ── O relatório ───────────────────────────────────────────────────────────

export const RELATORIO = {
  indice: { pt: 'Nesta análise', en: 'In this analysis' },
  seccoes: {
    veredicto: { pt: 'Veredicto', en: 'Verdict' },
    resumo: { pt: 'Resumo executivo', en: 'Executive summary' },
    impacto: { pt: 'Impacto por dimensão', en: 'Impact by dimension' },
    riscos: { pt: 'Riscos e oportunidades', en: 'Risks and opportunities' },
    acao: { pt: 'O que fazer', en: 'What to do' },
    horizonte: { pt: 'Horizonte', en: 'Outlook' },
    cadeias: { pt: 'Cadeias de sinal', en: 'Signal chains' },
    economia: { pt: 'Leitura económica', en: 'Economic reading' },
    estrategias: { pt: 'Estratégias de crescimento', en: 'Growth strategies' },
    perguntas: { pt: 'Perguntas por indústria', en: 'Questions by industry' },
  },
  prioridade: { pt: 'Prioridade', en: 'Priority' },
  semTitulo: { pt: 'Análise sem título', en: 'Untitled analysis' },

  impactoLiquido: { pt: 'Impacto líquido', en: 'Net impact' },
  cargaRisco: { pt: 'Carga de risco', en: 'Risk load' },
  balanco: { pt: 'Balanço', en: 'Balance' },
  dimensaoCritica: { pt: 'Mais afectado', en: 'Most affected' },
  semDados: { pt: 'Sem dados', en: 'No data' },
  comoCalculamos: { pt: 'Como calculamos', en: 'How we calculate' },
  formulas: [
    {
      pt: 'Impacto líquido: a média das pontuações por dimensão que o motor deu (−100 a +100).',
      en: 'Net impact: the average of the per-dimension scores the engine gave (−100 to +100).',
    },
    {
      pt: 'Carga de risco: soma dos riscos pesados pela severidade — crítico 3, alto 2, médio 1.',
      en: 'Risk load: the sum of risks weighted by severity — critical 3, high 2, medium 1.',
    },
    {
      pt: 'Balanço: número de oportunidades menos número de riscos.',
      en: 'Balance: number of opportunities minus number of risks.',
    },
    {
      pt: 'Mais afectado: a dimensão com a pontuação mais afastada de zero.',
      en: 'Most affected: the dimension whose score is furthest from zero.',
    },
  ],
  notaFormulas: {
    pt: 'São contas sobre os números do motor, não medições novas.',
    en: 'These are arithmetic on the engine’s numbers, not new measurements.',
  },

  graficoTitulo: {
    pt: 'Pontuação de impacto por dimensão, de −100 (negativo) a +100 (positivo)',
    en: 'Impact score by dimension, from −100 (negative) to +100 (positive)',
  },
  graficoFonte: { pt: 'Fonte: motor de análise Moz News.', en: 'Source: Moz News analysis engine.' },
  matrizTitulo: { pt: 'O que está por trás de cada dimensão', en: 'What is behind each dimension' },
  direcao: {
    up: { pt: 'sobe', en: 'up' },
    down: { pt: 'desce', en: 'down' },
    neutral: { pt: 'estável', en: 'flat' },
  },

  oQue: { pt: 'O que está a acontecer', en: 'What is happening' },
  porque: { pt: 'Porque importa', en: 'Why it matters' },
  sinais: { pt: 'Sinais ocultos', en: 'Hidden signals' },

  riscosTitulo: { pt: 'Riscos', en: 'Risks' },
  oportunidadesTitulo: { pt: 'Oportunidades', en: 'Opportunities' },
  nenhum: { pt: 'Nenhum identificado.', en: 'None identified.' },

  agir: { pt: 'Agir já', en: 'Act now' },
  monitorizar: { pt: 'Monitorizar', en: 'Monitor' },
  ajustar: { pt: 'Ajustar a estratégia', en: 'Adjust strategy' },

  curto: { pt: 'Curto prazo · 0–3 meses', en: 'Short term · 0–3 months' },
  medio: { pt: 'Médio prazo · 3–12 meses', en: 'Mid term · 3–12 months' },
  provavel: { pt: 'Cenário mais provável', en: 'Most likely scenario' },

  macro: { pt: 'Macroeconómica', en: 'Macroeconomic' },
  meso: { pt: 'Mesoeconómica', en: 'Mesoeconomic' },
  micro: { pt: 'Microeconómica', en: 'Microeconomic' },

  red: { pt: 'Oceano vermelho', en: 'Red ocean' },
  blue: { pt: 'Oceano azul', en: 'Blue ocean' },
  paralelos: { pt: 'Paralelos históricos', en: 'Historical parallels' },

  copiar: { pt: 'Copiar resumo para o LinkedIn', en: 'Copy summary for LinkedIn' },
  copiado: { pt: 'Resumo copiado.', en: 'Summary copied.' },
  copiarFalhou: {
    pt: 'Não foi possível copiar: o browser não deu acesso à área de transferência.',
    en: 'Could not copy: the browser did not allow access to the clipboard.',
  },
  limparHistoricoAria: { pt: 'Limpar o histórico de análises', en: 'Clear analysis history' },
  imprimir: { pt: 'Imprimir ou guardar PDF', en: 'Print or save as PDF' },
  plano: { pt: 'Transformar num plano para a sua empresa', en: 'Turn this into a plan for your company' },
  planoNota: {
    pt: 'O diagnóstico AGORA cruza esta leitura com o seu processo real.',
    en: 'The AGORA diagnostic matches this reading against your actual process.',
  },

  incompleto: { pt: 'Análise incompleta', en: 'Incomplete analysis' },
  emFalta: {
    pt: 'O motor não devolveu, ou devolveu em formato inválido:',
    en: 'The engine did not return, or returned in an invalid format:',
  },
  descartados: {
    pt: '{n} item(ns) recusado(s) por formato inválido.',
    en: '{n} item(s) rejected for an invalid format.',
  },
  nomesSeccao: {
    titulo: { pt: 'título', en: 'title' },
    prioridade: { pt: 'prioridade', en: 'priority' },
    sectores: { pt: 'sectores', en: 'sectors' },
    resumo: { pt: 'resumo executivo', en: 'executive summary' },
    interpretacao: { pt: 'interpretação', en: 'interpretation' },
    matriz: { pt: 'matriz de impacto', en: 'impact matrix' },
    riscos: { pt: 'riscos', en: 'risks' },
    oportunidades: { pt: 'oportunidades', en: 'opportunities' },
    horizonte: { pt: 'horizonte', en: 'outlook' },
    recomendacoes: { pt: 'recomendações', en: 'recommendations' },
    cadeias: { pt: 'cadeias de sinal', en: 'signal chains' },
    economia: { pt: 'leitura económica', en: 'economic reading' },
    estrategias: { pt: 'estratégias', en: 'strategies' },
    perguntas: { pt: 'perguntas por indústria', en: 'industry questions' },
    pontuacoes: { pt: 'pontuações de impacto', en: 'impact scores' },
  } satisfies Record<Seccao, Texto>,
} as const;

export const ROTULO_PRIORIDADE: Record<Prioridade, Texto> = {
  critical: { pt: 'Crítica', en: 'Critical' },
  high: { pt: 'Alta', en: 'High' },
  medium: { pt: 'Média', en: 'Medium' },
  monitor: { pt: 'Monitorizar', en: 'Monitor' },
};

export const ROTULO_SEVERIDADE: Record<Severidade, Texto> = {
  critical: { pt: 'Crítico', en: 'Critical' },
  high: { pt: 'Alto', en: 'High' },
  medium: { pt: 'Médio', en: 'Medium' },
};

export const ROTULO_CADEIA: Record<TipoCadeia, Texto> = {
  growth: { pt: 'crescimento', en: 'growth' },
  risk: { pt: 'risco', en: 'risk' },
  instability: { pt: 'instabilidade', en: 'instability' },
};

/**
 * As chaves da matriz de impacto vêm do motor em inglês (`economic`, …).
 * As conhecidas traduzem-se; uma chave nova aparece tal como veio, com
 * maiúscula — nunca desaparece por não estar aqui.
 */
const DIMENSOES: Record<string, Texto> = {
  economic: { pt: 'Económico', en: 'Economic' },
  financial: { pt: 'Financeiro', en: 'Financial' },
  governmental: { pt: 'Governamental', en: 'Governmental' },
  government: { pt: 'Governamental', en: 'Governmental' },
  business: { pt: 'Empresarial', en: 'Business' },
  social: { pt: 'Social', en: 'Social' },
};

export function nomeDaDimensao(chave: string, idioma: 'pt' | 'en'): string {
  const conhecida = DIMENSOES[chave.toLowerCase()];
  if (conhecida) return conhecida[idioma];
  return chave.charAt(0).toUpperCase() + chave.slice(1).replace(/_/g, ' ');
}
