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
  readonly responder: string;
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
    responder: 'Pode responder diretamente a este e-mail para acrescentar ou corrigir alguma informação.',
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
    responder: 'You can reply directly to this email to add or correct any information.',
    rodape: 'AGORAMOZ · Operational digital infrastructure · agoramoz.com',
    anexo: 'Attached: the preliminary framing as a PDF.',
  },
};
