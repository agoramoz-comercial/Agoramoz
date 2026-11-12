/**
 * O tema de uma pergunta, por palavras.
 *
 * Serve duas coisas, e nenhuma delas é a resposta:
 *
 * 1. É a ÚLTIMA mensagem que segue para o motor («Tema: Trabalho. A pergunta
 *    está na mensagem anterior.»). O portal regista e publica a última
 *    mensagem de cada consulta na sua página de estado; assim o que lá fica é
 *    o tema — um contador útil e sem nada de ninguém — e não a pergunta.
 * 2. Vai para o nosso evento `civico_consulta`: saber que temas se procuram,
 *    sem guardar o que se perguntou.
 *
 * A ordem das regras decide os empates: a primeira que acerta ganha.
 */

export const TEMAS = {
  trabalho: 'Trabalho',
  familia: 'Família e heranças',
  'seguranca-social': 'Segurança social',
  impostos: 'Impostos e negócios',
  documentos: 'Documentos',
  habitacao: 'Habitação e terra',
  crime: 'Crime e justiça',
  outro: 'Outro assunto',
} as const;

export type TemaId = keyof typeof TEMAS;

const REGRAS: readonly [TemaId, RegExp][] = [
  ['seguranca-social', /\binss\b|seguran[cç]a social|pens[aã]o de (velhice|invalidez|sobreviv)|reforma\b|aposenta|subs[ií]dio de (doen|matern|funeral)|contribui[cç][oõ]es/iu],
  ['trabalho', /trabalh|despedi|emprega|patr[aã]o|patroa|sal[aá]rio|f[eé]rias|aviso pr[eé]vio|rescis|indemniza|horas extra|justa causa|licen[cç]a de (matern|patern)|est[aá]gio|sindicat/iu],
  ['familia', /heran|herd|testament|sucess|partilha|faleci|falece|morre|morte|vi[uú]v|casament|casad|div[oó]rci|uni[aã]o de facto|c[oô]njuge|pens[aã]o de alimentos|alimentos|guarda d|poder parental|adop|paternidade|tutela|registar um nascimento|nascimento/iu],
  ['habitacao', /\bduat\b|terra\b|terreno|talh[aã]o|renda|arrenda|inquilin|senhorio|despej|casa\b|habita[cç]|constru[cç]|im[oó]vel|propriedade/iu],
  ['impostos', /\biva\b|\birps\b|\birpc\b|\bispc\b|imposto|tribut|\bnuit\b.*empresa|factura|alf[aâ]ndeg|registar uma empresa|empresa|sociedade|licen[cç]a comercial|alvar[aá]|neg[oó]cio/iu],
  ['documentos', /\bbi\b|bilhete de identidade|passaporte|\bnuit\b|certid[aã]o|registo civil|carta de condu[cç]|\bdire\b|visto|atestado|c[eé]dula|documento/iu],
  ['crime', /crime|pol[ií]cia|\bprm\b|detid|deten[cç]|pris[aã]o|preso|furto|roub|burla|agress|viol[eê]ncia|queixa|tribunal|culpad|multa/iu],
];

export function temaDaPergunta(pergunta: string): TemaId {
  for (const [tema, regra] of REGRAS) if (regra.test(pergunta)) return tema;
  return 'outro';
}

/** A última mensagem enviada ao motor — e, por isso, o que o portal mostra na sua página pública. Curta e sem nada de ninguém. */
export function mensagemDeTema(tema: TemaId): string {
  return `Tema: ${TEMAS[tema]}. A pergunta está na mensagem anterior.`;
}
