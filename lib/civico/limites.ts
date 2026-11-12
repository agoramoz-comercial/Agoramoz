/**
 * Limites da consulta cívica e guarda de dados pessoais, SEM zod.
 *
 * Separados de `pedido.ts` pela mesma razão do News: o componente de cliente
 * usa-os sem arrastar o zod para o bundle de `/civico`. O servidor valida com
 * o esquema de `pedido.ts`, que reexporta daqui — há uma só definição.
 */

/** Uma dúvida a sério não cabe em menos; «oi» não é pergunta. */
export const PERGUNTA_MIN = 8;
/** Uma pergunta, não um processo. Texto longo traz quase sempre nomes e factos de terceiros. */
export const PERGUNTA_MAX = 600;

/** Quantas trocas anteriores seguem com a pergunta, para o seguimento fazer sentido. */
export const TROCAS_MAX = 3;
/** Cada resposta anterior vai resumida ao início: chega para dar contexto. */
export const CONTEXTO_MAX = 1_500;

/**
 * O que não deve ir numa pergunta: um contacto ou um número de documento.
 *
 * Porque existe: o motor fica com o texto da pergunta (é assim que mede o que
 * lhe falta cobrir) e processa-o com modelos de IA de terceiros. Um e-mail,
 * um telefone ou um número de BI/NUIT nunca é preciso para explicar a lei, e
 * é exactamente o que identifica alguém. Recusar aqui, com uma frase que diz
 * o que tirar, é melhor do que prometer que ninguém vai ler.
 *
 * É uma guarda de padrões, não de sentido: não reconhece nomes de pessoas.
 * O aviso junto ao campo cobre o que isto não apanha.
 */
export type DadoPessoal = 'email' | 'numero';

const EMAIL = /[^\s@<>()]{1,64}@[^\s@<>()]{1,255}\.[a-z]{2,}/i;
/**
 * Nove ou mais algarismos seguidos, com espaços, pontos ou hífenes pelo meio:
 * telemóvel (9), NUIT (9), BI (12 e uma letra), conta bancária. Um artigo de
 * lei, um ano, um valor em meticais ou «Lei n.º 13/2023» nunca chegam lá.
 */
const NUMERO_LONGO = /(?:\d[\s.\-]?){8,}\d/;

export function dadoPessoalEm(texto: string): DadoPessoal | null {
  if (EMAIL.test(texto)) return 'email';
  if (NUMERO_LONGO.test(texto)) return 'numero';
  return null;
}

/** A pergunta tal como segue para o motor: espaços normalizados, sem controlos. */
export function limparPergunta(texto: string): string {
  // `\p{Cc}` inclui as quebras de linha e os tabuladores: passam a espaço.
  return texto.replace(/\p{Cc}+/gu, ' ').replace(/\s+/g, ' ').trim();
}
