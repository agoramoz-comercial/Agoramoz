import type { Idioma } from '@/content/types';

/**
 * O texto fixo do «Enquadramento preliminar» (PDF e e-mail), em PT e EN.
 * As línguas de leitura fr/es/de/ar submetem o formulário como `en`
 * (idiomaBase), por isso recebem o inglês.
 *
 * Só frases que o site já publica ou que descrevem o próprio documento.
 * Nenhuma promessa nova, nenhum prazo, nenhum preço.
 */
export interface TextosEnquadramento {
  readonly assunto: string;
  readonly ficheiro: string;
  readonly titulo: string;
  readonly subtitulo: string;
  readonly preparadoPara: string;
  readonly preliminar: string;
  readonly fase: string;
  readonly ola: string;
  readonly abertura: string;
  readonly seccoes: {
    readonly problema: string;
    readonly contexto: string;
    readonly sponsor: string;
    readonly elegibilidade: string;
    readonly decisao: string;
    readonly entregas: string;
    readonly garantias: string;
    readonly passos: string;
  };
  readonly campos: {
    readonly processos: string;
    readonly impacto: string;
    readonly consequencias: string;
    readonly sistemas: string;
    readonly decisaoDesejada: string;
    readonly mercado: string;
    readonly setor: string;
    readonly dimensao: string;
    readonly papel: string;
    readonly prazo: string;
    readonly faixa: string;
    readonly naoIndicado: string;
  };
  readonly criterios: { readonly problema: string; readonly sponsor: string; readonly prazo: string; readonly capacidade: string };
  readonly estados: { readonly indicado: string; readonly aConfirmar: string };
  readonly faltas: { readonly impacto: string; readonly sponsor: string; readonly prazo: string; readonly capacidade: string };
  readonly decisao: string;
  readonly decisaoOpcoes: readonly [string, string, string];
  readonly entregasNota: string;
  readonly garantias: readonly string[];
  readonly passos: readonly string[];
  readonly cta: string;
  /** Botão principal quando há CAL_LINK. */
  readonly ctaReuniao: string;
  /** Botão quando ainda não há CAL_LINK: escreve à equipa. */
  readonly ctaEscrever: string;
  readonly assuntoResposta: string;
  readonly responder: string;
  readonly resumo: string;
  readonly ano: string;
  readonly pagina: string;
  readonly perguntas: {
    readonly resumo: string;
    readonly problema: string;
    readonly elegibilidade: string;
    readonly garantias: string;
    readonly entregas: string;
  };
  /** Título-conclusão do resumo: `{n}` indicados de `{total}`. */
  readonly conclusao: string;
  readonly conclusaoTudo: string;
  readonly tituloProblema: string;
  readonly tituloElegibilidade: string;
  readonly tituloEntregas: string;
  readonly kpis: { readonly indicados: string; readonly aConfirmar: string; readonly entregas: string };
  readonly hero: string;
  readonly heroTexto: string;
  readonly fontes: string;
  readonly fontesTexto: string;
  readonly decisaoPedida: string;
  readonly rodape: string;
  readonly anexo: string;
}

export const TEXTOS: Record<Idioma, TextosEnquadramento> = {
  pt: {
    assunto: 'Enquadramento preliminar — {empresa} · AGORAMOZ',
    ficheiro: 'Enquadramento-AGORAMOZ',
    titulo: 'Enquadramento preliminar',
    subtitulo: 'O seu caso, em quatro pontos.',
    preparadoPara: 'Preparado para',
    preliminar:
      'Resumo das suas respostas ao diagnóstico. Revemos tudo consigo antes de qualquer decisão.',
    fase: 'Fase 01 · Enquadramento',
    ola: 'Olá {nome},',
    abertura:
      'Obrigado pelas respostas. Em anexo está o enquadramento do seu caso: o problema, o contexto, quem decide e o que ainda falta confirmar.',
    seccoes: {
      problema: 'Problema preliminar',
      contexto: 'Contexto',
      sponsor: 'Sponsor e decisão',
      elegibilidade: 'Elegibilidade preliminar',
      decisao: 'Decisão desta fase',
      entregas: 'O que recebe no Diagnóstico Operacional Digital',
      garantias: 'O que garantimos',
      passos: 'Próximos passos',
    },
    campos: {
      processos: 'O que pretende melhorar',
      impacto: 'Onde a operação está bloqueada',
      consequencias: 'Consequências',
      sistemas: 'Sistemas envolvidos',
      decisaoDesejada: 'Decisão que quer tomar',
      mercado: 'Mercado',
      setor: 'Setor',
      dimensao: 'Dimensão',
      papel: 'Papel na decisão',
      prazo: 'Quando quer decidir',
      faixa: 'Investimento em mente',
      naoIndicado: 'Não indicado',
    },
    criterios: {
      problema: 'Problema definido',
      sponsor: 'Responsável interno pela decisão',
      prazo: 'Momento da decisão',
      capacidade: 'Capacidade de investimento',
    },
    estados: { indicado: 'Definido', aConfirmar: 'Falta' },
    faltas: {
      impacto: 'Falta saber onde a operação para.',
      sponsor: 'Falta confirmar quem decide.',
      prazo: 'Falta definir quando quer decidir.',
      capacidade: 'Falta definir o orçamento.',
    },
    decisao: 'No fim desta fase, há três saídas possíveis:',
    decisaoOpcoes: ['Avançar', 'Reenquadrar', 'Não prosseguir'],
    entregasNota: 'Se avançar, o diagnóstico inclui:',
    garantias: ['Diagnóstico antes de proposta', 'Se não houver adequação, dizemo-lo', 'Aprovação em cada fase'],
    passos: [
      'Lemos as suas respostas.',
      'Numa conversa curta, confirmamos o que falta.',
      'Decidimos juntos: avançar, reenquadrar ou parar aqui.',
    ],
    cta: 'Responder a este e-mail',
    ctaReuniao: 'Marcar reunião com um especialista',
    ctaEscrever: 'Falar com um especialista',
    assuntoResposta: 'Enquadramento preliminar — marcar conversa',
    responder: 'Algo está errado ou incompleto? Responda a este e-mail.',
    resumo: 'Resumo executivo',
    ano: '2026',
    pagina: 'Página',
    perguntas: {
      resumo: 'Onde estamos?',
      problema: 'Qual é o problema?',
      elegibilidade: 'O que falta?',
      garantias: 'Como trabalhamos?',
      entregas: 'E agora?',
    },
    conclusao: '{n} de {total} critérios definidos',
    conclusaoTudo: 'Os {total} critérios estão definidos',
    tituloProblema: 'O problema',
    tituloElegibilidade: 'O que está definido e o que falta',
    tituloEntregas: 'Próximos passos',
    kpis: { indicados: 'critérios definidos', aConfirmar: 'por confirmar', entregas: 'entregáveis do diagnóstico' },
    hero: 'Diagnóstico antes de proposta.',
    heroTexto: 'Primeiro mapeamos o processo. Só depois propomos uma solução. Se não fizer sentido avançar, dizemos-lhe.',
    fontes: 'Fontes e método',
    fontesTexto:
      'Gerado a partir das suas respostas e das fases publicadas da AGORAMOZ. Não inclui preços nem prazos.',
    decisaoPedida: 'Decisão desta fase',
    rodape: 'AGORAMOZ · Infraestrutura operacional digital · agoramoz.com',
    anexo: 'Em anexo: o enquadramento preliminar em PDF.',
  },
  en: {
    assunto: 'Preliminary framing — {empresa} · AGORAMOZ',
    ficheiro: 'Framing-AGORAMOZ',
    titulo: 'Preliminary framing',
    subtitulo: 'Your case, in four points.',
    preparadoPara: 'Prepared for',
    preliminar:
      'A summary of your diagnostic answers. We review it with you before any decision.',
    fase: 'Stage 01 · Framing',
    ola: 'Hello {nome},',
    abertura:
      'Thanks for your answers. Attached is the framing of your case: the problem, the context, who decides and what is still open.',
    seccoes: {
      problema: 'Preliminary problem',
      contexto: 'Context',
      sponsor: 'Sponsor and decision',
      elegibilidade: 'Preliminary eligibility',
      decisao: 'Decision at this stage',
      entregas: 'What you receive in the Digital Operations Diagnostic',
      garantias: 'What we guarantee',
      passos: 'Next steps',
    },
    campos: {
      processos: 'What you want to improve',
      impacto: 'Where the operation is stuck',
      consequencias: 'Consequences',
      sistemas: 'Systems involved',
      decisaoDesejada: 'Decision you want to make',
      mercado: 'Market',
      setor: 'Sector',
      dimensao: 'Company size',
      papel: 'Role in the decision',
      prazo: 'When you want to decide',
      faixa: 'Investment in mind',
      naoIndicado: 'Not stated',
    },
    criterios: {
      problema: 'Defined problem',
      sponsor: 'Internal decision owner',
      prazo: 'Decision timing',
      capacidade: 'Investment capacity',
    },
    estados: { indicado: 'Defined', aConfirmar: 'Missing' },
    faltas: {
      impacto: 'We still need to know where the operation stalls.',
      sponsor: 'Still to confirm who decides.',
      prazo: 'Still to set when you want to decide.',
      capacidade: 'Budget not set yet.',
    },
    decisao: 'This stage ends in one of three ways:',
    decisaoOpcoes: ['Go ahead', 'Reframe', 'Do not proceed'],
    entregasNota: 'If you go ahead, the diagnostic includes:',
    garantias: ['Diagnostic before proposal', 'If there is no fit, we say so', 'Approval at every stage'],
    passos: [
      'We read your answers.',
      'In a short call, we confirm what is missing.',
      'We decide together: go ahead, reframe or stop here.',
    ],
    cta: 'Reply to this email',
    ctaReuniao: 'Book a meeting with a specialist',
    ctaEscrever: 'Talk to a specialist',
    assuntoResposta: 'Preliminary framing — book a conversation',
    responder: 'Something wrong or missing? Reply to this email.',
    resumo: 'Executive summary',
    ano: '2026',
    pagina: 'Page',
    perguntas: {
      resumo: 'Where are we?',
      problema: 'What is the problem?',
      elegibilidade: 'What is missing?',
      garantias: 'How do we work?',
      entregas: 'What now?',
    },
    conclusao: '{n} of {total} criteria defined',
    conclusaoTudo: 'All {total} criteria are defined',
    tituloProblema: 'The problem',
    tituloElegibilidade: 'What is defined and what is missing',
    tituloEntregas: 'Next steps',
    kpis: { indicados: 'criteria defined', aConfirmar: 'to confirm', entregas: 'diagnostic deliverables' },
    hero: 'Diagnostic before proposal.',
    heroTexto: 'First we map the process. Only then do we propose a solution. If it makes no sense to go ahead, we tell you.',
    fontes: 'Sources and method',
    fontesTexto:
      'Built from your answers and the published AGORAMOZ stages. No prices or timelines.',
    decisaoPedida: 'Decision at this stage',
    rodape: 'AGORAMOZ · Operational digital infrastructure · agoramoz.com',
    anexo: 'Attached: the preliminary framing as a PDF.',
  },
};
