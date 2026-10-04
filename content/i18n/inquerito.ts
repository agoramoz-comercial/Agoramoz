import type { Texto } from '@/content/types';

/**
 * Os textos da página de quem responde a um inquérito (`/i/<token>`). O
 * conteúdo do inquérito em si — títulos, perguntas, opções — vem do spec,
 * escrito pela equipa no idioma do inquérito; isto é só a moldura.
 *
 * Sobre privacidade, o texto diz o que é verdade e nada mais: não pedimos
 * nome nem contacto (a menos que o inquérito o ofereça, e então é opcional).
 * Não diz «anónimo» nem promete conformidade legal.
 */
export const INQ = {
  metaTitulo: { pt: 'Inquérito', en: 'Survey' },
  comecar: { pt: 'Começar', en: 'Start' },
  semDados: {
    pt: 'Não pedimos nome nem contacto.',
    en: 'We do not ask for your name or contact details.',
  },
  contactoOpcional: {
    pt: 'Nome e contacto são opcionais e só aparecem no fim.',
    en: 'Name and contact details are optional and only come at the end.',
  },
  passo: { pt: 'Passo {n} de {total}', en: 'Step {n} of {total}' },
  continuar: { pt: 'Continuar', en: 'Continue' },
  voltar: { pt: 'Voltar', en: 'Back' },
  enviar: { pt: 'Enviar respostas', en: 'Submit answers' },
  aEnviar: { pt: 'A enviar…', en: 'Sending…' },
  avancaSozinho: {
    pt: 'Escolher uma opção avança para o passo seguinte.',
    en: 'Choosing an option moves to the next step.',
  },
  obrigatoria: {
    pt: 'Responda a esta pergunta para continuar.',
    en: 'Answer this question to continue.',
  },
  invalida: { pt: 'Esta resposta não é válida.', en: 'This answer is not valid.' },
  textoLongo: {
    pt: 'Use no máximo {max} caracteres.',
    en: 'Use at most {max} characters.',
  },
  caracteres: { pt: '{n} de {max} caracteres', en: '{n} of {max} characters' },
  escolhaMin: { pt: 'Escolha pelo menos {min}.', en: 'Choose at least {min}.' },
  escolhaMax: { pt: 'Escolha no máximo {max}.', en: 'Choose at most {max}.' },
  escolhaEntre: { pt: 'Escolha entre {min} e {max}.', en: 'Choose between {min} and {max}.' },
  numeroEntre: { pt: 'Um número entre {min} e {max}.', en: 'A number between {min} and {max}.' },
  numeroMin: { pt: 'Um número a partir de {min}.', en: 'A number from {min}.' },
  numeroMax: { pt: 'Um número até {max}.', en: 'A number up to {max}.' },
  numeroInteiro: { pt: 'Sem casas decimais.', en: 'Whole numbers only.' },
  dataFormato: { pt: 'Uma data válida.', en: 'A valid date.' },
  npsMin: { pt: '0 — nada provável', en: '0 — not at all likely' },
  npsMax: { pt: '10 — muito provável', en: '10 — extremely likely' },
  avaliacaoMin: { pt: '1 — muito baixo', en: '1 — very low' },
  avaliacaoMax: { pt: '5 — muito alto', en: '5 — very high' },
  deEscala: { pt: '{n} de {max}', en: '{n} of {max}' },
  contactoTitulo: {
    pt: 'Quer deixar o seu contacto?',
    en: 'Would you like to leave your contact details?',
  },
  contactoCorpo: {
    pt: 'É opcional. Pode enviar as respostas sem preencher nada aqui.',
    en: 'This is optional. You can submit your answers without filling anything here.',
  },
  campoNome: { pt: 'Nome', en: 'Name' },
  campoEmail: { pt: 'Email', en: 'Email' },
  campoTelefone: { pt: 'Telefone', en: 'Phone' },
  campoOrganizacao: { pt: 'Organização', en: 'Organisation' },
  contactoInvalido: { pt: 'Verifique este campo.', en: 'Please check this field.' },
  consentimentoFalta: {
    pt: 'Para deixar o contacto, aceite o texto acima. Ou apague os campos para responder sem contacto.',
    en: 'To leave your contact details, accept the text above. Or clear the fields to answer without them.',
  },
  erroEnvio: {
    pt: 'Não foi possível enviar. As respostas continuam aqui — tente de novo.',
    en: 'We could not send your answers. They are still here — please try again.',
  },
  limite: {
    pt: 'Demasiados envios seguidos. Aguarde um momento e tente de novo.',
    en: 'Too many submissions in a row. Wait a moment and try again.',
  },
  fechadoTitulo: {
    pt: 'Este inquérito já não aceita respostas.',
    en: 'This survey is no longer accepting responses.',
  },
  expiradoTitulo: { pt: 'Este link expirou.', en: 'This link has expired.' },
  fechadoCorpo: {
    pt: 'Se recebeu o link de alguém da AGORAMOZ, peça-lhe um novo.',
    en: 'If someone at AGORAMOZ sent you this link, ask them for a new one.',
  },
  indisponivelTitulo: {
    pt: 'O inquérito está temporariamente indisponível.',
    en: 'The survey is temporarily unavailable.',
  },
  indisponivelCorpo: {
    pt: 'Tente de novo dentro de alguns minutos.',
    en: 'Please try again in a few minutes.',
  },
  previa: {
    pt: 'Pré-visualização — nada é enviado nem contado.',
    en: 'Preview — nothing is sent or counted.',
  },
  recomecar: { pt: 'Ver de novo', en: 'View again' },
  privacidade: { pt: 'Política de privacidade', en: 'Privacy policy (in Portuguese)' },
} as const satisfies Record<string, Texto>;
