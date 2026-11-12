/**
 * Retira nomes de pessoas de uma pergunta antes de ela seguir para o motor.
 *
 * A guarda de `limites.ts` recusa contactos e números de documento, que têm
 * forma. Um nome não tem: «o meu patrão Carlos Macamo despediu-me» é uma
 * frase normal. Em vez de a recusar — a pessoa não fez nada de errado —
 * troca-se o nome por `[nome]` e a pergunta segue igual para efeitos de lei:
 * a resposta não depende de como o patrão se chama.
 *
 * É uma guarda de padrões, e por isso modesta por desenho: só mexe onde o
 * contexto diz que vem um nome de pessoa («chamo-me…», «o Sr.…», «o meu
 * irmão…»). Não tenta adivinhar nomes soltos — «Maputo», «Vodacom» e «INSS»
 * também começam por maiúscula, e são precisamente o que a resposta precisa
 * de saber. Nomes de empresas e de instituições ficam: não são dados pessoais.
 *
 * O que escapa a isto fica coberto por duas outras coisas: o aviso junto ao
 * campo, e o facto de a pergunta nunca ser a última mensagem enviada ao motor
 * (ver `motor.ts`), que é a que o portal regista na sua página pública.
 */

export const MARCA_NOME = '[nome]';

/** Uma palavra de nome: maiúscula inicial, com acentos, hífenes e apóstrofos. */
const PALAVRA = String.raw`\p{Lu}[\p{L}'’-]{1,30}`;
/** Um nome: uma a quatro palavras, com «de», «da», «dos», «e» pelo meio. */
const NOME = String.raw`${PALAVRA}(?:\s+(?:d[aeo]s?\s+|e\s+)?${PALAVRA}){0,3}`;

/**
 * O que vem ANTES de um nome. Escrito com as duas caixas à mão e sem a flag
 * `i`: com ela, `\p{Lu}` passava a aceitar minúsculas e «sou o dono» virava
 * «sou o [nome]».
 */
// O hífen fica como está: fora de uma classe não precisa de escape, e no modo `u` escapá-lo é erro.
const escapar = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ambas = (palavra: string) =>
  [...palavra]
    .map((c) => (c.toLowerCase() !== c.toUpperCase() ? `[${c.toLowerCase()}${c.toUpperCase()}]` : c === ' ' ? '\\s+' : escapar(c)))
    .join('');

// «Sou o…» fica de fora de propósito: «sou o Director da empresa» diz um cargo, e o cargo conta para a lei.
const APRESENTACOES = ['chamo-me', 'me chamo', 'o meu nome é', 'meu nome é'];
const TITULOS = ['Sr.', 'Sr', 'Sra.', 'Sra', 'Senhor', 'Senhora', 'Dona', 'Dr.', 'Dr', 'Dra.', 'Dra', 'Eng.', 'Eng', 'Prof.', 'Prof'];
const RELACOES = [
  'patrão', 'patroa', 'chefe', 'marido', 'esposa', 'esposo', 'mulher', 'namorado', 'namorada', 'companheiro', 'companheira',
  'irmão', 'irmã', 'pai', 'mãe', 'filho', 'filha', 'vizinho', 'vizinha', 'amigo', 'amiga', 'senhorio', 'senhoria',
  'sócio', 'sócia', 'colega', 'tio', 'tia', 'primo', 'prima', 'cunhado', 'cunhada', 'sogro', 'sogra', 'avô', 'avó',
  'padrasto', 'madrasta', 'enteado', 'enteada', 'sobrinho', 'sobrinha', 'inquilino', 'inquilina', 'empregado', 'empregada',
];

const alternativa = (lista: readonly string[]) =>
  [...lista]
    .sort((a, b) => b.length - a.length)
    .map(ambas)
    .join('|');

const REGRAS: readonly RegExp[] = [
  // «chamo-me Ana Machel», «o meu nome é João dos Santos»
  new RegExp(String.raw`(?<![\p{L}])(${alternativa(APRESENTACOES)})\s+${NOME}`, 'gu'),
  // «o Sr. Macamo», «a Dra. Luísa Cossa»
  new RegExp(String.raw`(?<![\p{L}])(${alternativa(TITULOS)})\s+${NOME}`, 'gu'),
  // «o meu patrão Carlos», «a minha vizinha, chamada Rosa Tembe»
  new RegExp(
    String.raw`(?<![\p{L}])(${alternativa(RELACOES)})(?:,)?\s+(?:[cC]hamad[oa]\s+|de nome\s+)?${NOME}`,
    'gu',
  ),
];

export interface Anonimizado {
  readonly texto: string;
  /** Quantos nomes saíram. Vai para o log como número — nunca os nomes. */
  readonly retirados: number;
}

export function anonimizar(texto: string): Anonimizado {
  let retirados = 0;
  let saida = texto;
  for (const regra of REGRAS) {
    saida = saida.replace(regra, (_tudo, antes: string) => {
      retirados += 1;
      return `${antes} ${MARCA_NOME}`;
    });
  }
  return { texto: saida, retirados };
}
