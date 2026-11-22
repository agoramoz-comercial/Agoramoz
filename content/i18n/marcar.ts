import type { Texto } from '@/content/types';

/**
 * Página `/marcar` (e `/en/marcar`): a conversa de 30 min no Cal.com, dentro
 * do design AGORAMOZ. Só frases que o site já publica (garantias, «conversa
 * objetiva», diagnóstico antes de proposta) e a duração do evento no Cal.com.
 * Nenhuma promessa nova.
 */
export const MARCAR = {
  metaTitulo: {
    pt: 'Marcar conversa com um especialista',
    en: 'Book a meeting with a specialist',
  },
  metaDescricao: {
    pt: 'Marque uma conversa objetiva de 30 minutos com a AGORAMOZ: problema definido, próximos passos claros, diagnóstico antes de proposta.',
    en: 'Book a focused 30-minute conversation with AGORAMOZ: a defined problem, clear next steps, diagnostic before proposal.',
  },
  inicio: { pt: 'Início', en: 'Home' },
  trilho: { pt: 'Marcar conversa', en: 'Book a meeting' },
  etiqueta: { pt: 'Conversa · 30 min', en: 'Conversation · 30 min' },
  titulo: {
    pt: 'Marque uma conversa com um especialista.',
    en: 'Book a meeting with a specialist.',
  },
  texto: {
    pt: 'Trinta minutos para compreender o processo que pretende melhorar e decidir o próximo passo. Não apresentamos proposta sem diagnóstico.',
    en: 'Thirty minutes to understand the process you want to improve and decide the next step. We do not present a proposal without a diagnostic.',
  },
  esperarTitulo: { pt: 'O que esperar', en: 'What to expect' },
  esperar: [
    { pt: 'Conversa objetiva', en: 'A focused conversation' },
    { pt: 'Problema definido', en: 'A defined problem' },
    { pt: 'Próximos passos claros', en: 'Clear next steps' },
  ] as readonly Texto[],
  garantiasTitulo: { pt: 'O que garantimos', en: 'What we guarantee' },
  garantias: [
    { pt: 'Diagnóstico antes de proposta', en: 'Diagnostic before proposal' },
    { pt: 'Se não houver adequação, dizemo-lo', en: 'If there is no fit, we say so' },
    { pt: 'Aprovação em cada fase', en: 'Approval at every stage' },
  ] as readonly Texto[],
  calendario: { pt: 'Calendário de marcação', en: 'Booking calendar' },
  carregando: { pt: 'A carregar o calendário…', en: 'Loading the calendar…' },
  alternativa: {
    pt: 'O calendário não abriu aqui?',
    en: 'Calendar not loading here?',
  },
  abrirCal: { pt: 'Abrir a marcação no Cal.com', en: 'Open booking on Cal.com' },
  semJs: {
    pt: 'O calendário precisa de JavaScript. Pode marcar diretamente no Cal.com:',
    en: 'The calendar needs JavaScript. You can book directly on Cal.com:',
  },
  semCal: {
    pt: 'A marcação online está a ser preparada. Escreva-nos e respondemos com horários:',
    en: 'Online booking is being set up. Write to us and we will reply with times:',
  },
  escrever: { pt: 'Escrever para comercial@agoramoz.com', en: 'Write to comercial@agoramoz.com' },
  assunto: { pt: 'Marcar conversa com um especialista', en: 'Book a meeting with a specialist' },
} as const;
