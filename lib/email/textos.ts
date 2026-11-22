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
    subtitulo: 'Problema preliminar, sponsor, processo e elegibilidade.',
    preparadoPara: 'Preparado para',
    preliminar:
      'Documento preliminar e automático, feito só com as suas respostas ao diagnóstico. A equipa AGORAMOZ revê-o e confirma consigo antes de qualquer decisão.',
    fase: 'Fase 01 · Enquadramento',
    ola: 'Olá {nome},',
    abertura:
      'Obrigado por partilhar o processo que pretende melhorar. Em anexo segue o enquadramento preliminar: o problema como o descreveu, o contexto, quem decide e os critérios de elegibilidade que já estão indicados ou que falta confirmar.',
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
    estados: { indicado: 'Indicado', aConfirmar: 'A confirmar' },
    faltas: {
      impacto: 'Falta descrever onde a operação está bloqueada.',
      sponsor: 'Falta confirmar quem decide.',
      prazo: 'Falta definir quando quer decidir.',
      capacidade: 'Falta definir o investimento em mente.',
    },
    decisao: 'No fim do enquadramento, a equipa decide consigo uma de três opções:',
    decisaoOpcoes: ['Avançar', 'Reenquadrar', 'Não prosseguir'],
    entregasNota: 'Se avançar, o diagnóstico transforma este enquadramento numa decisão executiva.',
    garantias: ['Diagnóstico antes de proposta', 'Se não houver adequação, dizemo-lo', 'Aprovação em cada fase'],
    passos: [
      'A equipa revê este enquadramento e as suas respostas.',
      'Marcamos consigo uma conversa objetiva para confirmar o que está «a confirmar».',
      'Decidimos em conjunto: avançar para o diagnóstico, reenquadrar ou não prosseguir.',
    ],
    cta: 'Responder a este e-mail',
    ctaReuniao: 'Marcar reunião com um especialista',
    ctaEscrever: 'Falar com um especialista',
    assuntoResposta: 'Enquadramento preliminar — marcar conversa',
    responder: 'Pode responder diretamente a este e-mail para acrescentar ou corrigir alguma informação.',
    resumo: 'Resumo executivo',
    ano: '2026',
    pagina: 'Página',
    perguntas: {
      resumo: 'Em que ponto está o enquadramento?',
      problema: 'Que problema descreveu, e em que contexto?',
      elegibilidade: 'O que já está indicado e o que falta confirmar?',
      garantias: 'O que garantimos antes de qualquer proposta?',
      entregas: 'Se avançar, o que recebe e o que acontece a seguir?',
    },
    conclusao: '{n} de {total} critérios já estão indicados; o resto confirma-se numa conversa',
    conclusaoTudo: 'Os {total} critérios de elegibilidade já estão indicados',
    tituloProblema: 'O problema, nas suas palavras',
    tituloElegibilidade: 'O que já está indicado e o que falta confirmar',
    tituloEntregas: 'Se avançar, o diagnóstico transforma isto numa decisão',
    kpis: { indicados: 'critérios indicados', aConfirmar: 'critérios a confirmar', entregas: 'entregáveis no diagnóstico' },
    hero: 'Diagnóstico antes de proposta.',
    heroTexto: 'Não apresentamos arquitetura sem ter mapeado o processo atual. Se o diagnóstico concluir que não há adequação, dizemo-lo — e não há proposta.',
    fontes: 'Fontes e método',
    fontesTexto:
      'Documento automático e preliminar, gerado no momento em que submeteu o diagnóstico. Usa apenas as suas respostas e o catálogo publicado da AGORAMOZ (fases, entregáveis e garantias). Não contém preços, prazos nem estimativas. A equipa AGORAMOZ revê-o e confirma consigo antes de qualquer decisão.',
    decisaoPedida: 'Decisão desta fase',
    rodape: 'AGORAMOZ · Infraestrutura operacional digital · agoramoz.com',
    anexo: 'Em anexo: o enquadramento preliminar em PDF.',
  },
  en: {
    assunto: 'Preliminary framing — {empresa} · AGORAMOZ',
    ficheiro: 'Framing-AGORAMOZ',
    titulo: 'Preliminary framing',
    subtitulo: 'Preliminary problem, sponsor, process and eligibility.',
    preparadoPara: 'Prepared for',
    preliminar:
      'Preliminary, automatic document, built only from your diagnostic answers. The AGORAMOZ team reviews it and confirms it with you before any decision.',
    fase: 'Stage 01 · Framing',
    ola: 'Hello {nome},',
    abertura:
      'Thank you for sharing the process you want to improve. Attached is the preliminary framing: the problem as you described it, the context, who decides, and the eligibility criteria that are already stated or still to be confirmed.',
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
    estados: { indicado: 'Stated', aConfirmar: 'To confirm' },
    faltas: {
      impacto: 'Still to describe where the operation is stuck.',
      sponsor: 'Still to confirm who decides.',
      prazo: 'Still to set when you want to decide.',
      capacidade: 'Still to set the investment in mind.',
    },
    decisao: 'At the end of framing, the team decides with you on one of three options:',
    decisaoOpcoes: ['Go ahead', 'Reframe', 'Do not proceed'],
    entregasNota: 'If you go ahead, the diagnostic turns this framing into an executive decision.',
    garantias: ['Diagnostic before proposal', 'If there is no fit, we say so', 'Approval at every stage'],
    passos: [
      'The team reviews this framing and your answers.',
      'We set up a focused conversation with you to confirm what is still «to confirm».',
      'We decide together: go ahead with the diagnostic, reframe, or not proceed.',
    ],
    cta: 'Reply to this email',
    ctaReuniao: 'Book a meeting with a specialist',
    ctaEscrever: 'Talk to a specialist',
    assuntoResposta: 'Preliminary framing — book a conversation',
    responder: 'You can reply directly to this email to add or correct any information.',
    resumo: 'Executive summary',
    ano: '2026',
    pagina: 'Page',
    perguntas: {
      resumo: 'Where does the framing stand?',
      problema: 'What problem did you describe, and in what context?',
      elegibilidade: 'What is already stated and what is still to confirm?',
      garantias: 'What do we guarantee before any proposal?',
      entregas: 'If you go ahead, what do you receive and what happens next?',
    },
    conclusao: '{n} of {total} criteria are already stated; the rest is confirmed in one conversation',
    conclusaoTudo: 'All {total} eligibility criteria are already stated',
    tituloProblema: 'The problem, in your own words',
    tituloElegibilidade: 'What is already stated and what is still to confirm',
    tituloEntregas: 'If you go ahead, the diagnostic turns this into a decision',
    kpis: { indicados: 'criteria stated', aConfirmar: 'criteria to confirm', entregas: 'diagnostic deliverables' },
    hero: 'Diagnostic before proposal.',
    heroTexto: 'We do not present an architecture without mapping the current process. If the diagnostic concludes there is no fit, we say so — and there is no proposal.',
    fontes: 'Sources and method',
    fontesTexto:
      'Automatic, preliminary document, generated when you submitted the diagnostic. It uses only your answers and the published AGORAMOZ catalogue (stages, deliverables and guarantees). It contains no prices, timelines or estimates. The AGORAMOZ team reviews it and confirms it with you before any decision.',
    decisaoPedida: 'Decision at this stage',
    rodape: 'AGORAMOZ · Operational digital infrastructure · agoramoz.com',
    anexo: 'Attached: the preliminary framing as a PDF.',
  },
};
