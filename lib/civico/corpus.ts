import familia from '@/content/civico/corpus/familia.json';
import sucessoes from '@/content/civico/corpus/sucessoes.json';
import trabalho from '@/content/civico/corpus/trabalho.json';
import type { ArtigoOficial } from './conferir';
import type { TemaId } from './tema';

/**
 * O corpus do Cívico: o texto oficial, artigo a artigo, e a procura nele.
 *
 * **Só no servidor.** São ~600 KB de texto de lei; nenhum componente de
 * cliente importa este ficheiro (um teste guarda isso).
 *
 * Porque existe: o motor escreve de memória. Medido a 2026-11-12, inventou um
 * «Artigo 13.º (Licença de paternidade)» com texto entre aspas — o artigo 13
 * da Lei do Trabalho é outro, e a licença por paternidade é o artigo 15. Com
 * o texto oficial do nosso lado, três coisas passam a ser verdade:
 *
 * 1. o texto de lei que a página mostra vem DAQUI, não do modelo;
 * 2. o motor recebe os artigos certos antes de responder, e é-lhe pedido que
 *    cite só esses;
 * 3. uma citação ou um número de artigo que não esteja aqui é retirado da
 *    resposta (`conferir.ts`).
 *
 * O corpus é construído por `.qa/civico-corpus.py` a partir dos PDF do
 * Boletim da República, com falha fechada: o artigo que não se leu bem não
 * entra, e por isso não pode ser citado.
 *
 * A procura é lexical (BM25), sem modelo e sem serviço externo: num corpus
 * de mil artigos com epígrafes, as palavras da pergunta chegam — desde que se
 * traduza a fala das pessoas («patrão», «despedido») para a fala da lei
 * («empregador», «despedimento»). É isso que `EXPANSOES` faz.
 */

interface ArtigoBruto {
  readonly n: number;
  readonly epigrafe: string;
  readonly paragrafos: readonly string[];
}

interface Diploma {
  readonly id: string;
  readonly nome: string;
  readonly titulo: string;
  readonly numero: string;
  readonly fonte: { readonly titulo: string; readonly href: string };
  readonly artigos: readonly ArtigoBruto[];
}

export const DIPLOMAS: readonly Diploma[] = [trabalho, sucessoes, familia];

/** Que diplomas se procuram para cada tema. Fora destes temas o corpus não tem texto: não se procura. */
const DIPLOMAS_DO_TEMA: Partial<Record<TemaId, readonly string[]>> = {
  trabalho: ['trabalho'],
  familia: ['sucessoes', 'familia'],
};

/* ------------------------------------------------------------------ texto */

/** Minúsculas, sem acentos, e tudo o que não é letra ou algarismo vira um espaço. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const VAZIAS = new Set(
  'que para com por uma uns umas dos das nos nas num numa pelo pela pelos pelas aos seu sua seus suas meu minha meus minhas este esta estes estas esse essa isso isto aquele aquela como quando onde quem qual quais mas mais menos muito pouco tem ter ser estar foi sao esta estao pode podem deve devem tenho temos tens ha sobre entre ate sem nao sim ja tambem cada outro outra outros outras todo toda todos todas caso lei artigo numero termos presente previsto prevista disposto anterior seguinte seguintes'.split(
    ' ',
  ),
);

/** O radical de uma palavra: os primeiros seis caracteres. Grosseiro, e chega: «despedimento», «despedido» e «despedir» encontram-se. */
function radicais(texto: string): string[] {
  return normalizar(texto)
    .split(' ')
    .filter((p) => p.length >= 3 && !VAZIAS.has(p) && !/^\d+$/.test(p))
    .map((p) => p.slice(0, 6));
}

/**
 * Da fala das pessoas para a fala da lei. Cada regra acrescenta palavras à
 * pergunta antes da procura; não tira nenhuma.
 */
const EXPANSOES: readonly [RegExp, string][] = [
  [/patr[aã]o|patroa|chefe|a empresa/i, 'empregador'],
  [/desped|mandou-me embora|mandaram-me embora|puseram-me na rua/i, 'despedimento rescisão cessação contrato justa causa'],
  [/demit|quero sair|sair do emprego/i, 'denúncia rescisão trabalhador'],
  [/aviso pr[eé]vio/i, 'aviso prévio rescisão denúncia'],
  [/f[eé]rias/i, 'férias direito duração'],
  [/sal[aá]rio|ordenado|vencimento|n[aã]o paga|atras/i, 'remuneração salário pagamento'],
  [/horas? extra/i, 'trabalho extraordinário'],
  [/gr[aá]vida|gravidez|maternidade|parto/i, 'maternidade licença trabalhadora'],
  [/paternidade|nasceu o meu filho/i, 'paternidade licença'],
  [/doen[cç]a|baixa m[eé]dica/i, 'doença faltas justificadas'],
  [/contrato a prazo|a prazo/i, 'contrato prazo certo incerto'],
  [/experi[eê]ncia|per[ií]odo experimental|probat/i, 'período probatório'],
  [/indemniza/i, 'indemnização'],
  [/heran|herd/i, 'sucessão herdeiros herança partilha'],
  [/sem (deixar )?testamento/i, 'sucessão legítima classes sucessíveis'],
  [/testamento/i, 'testamento sucessão testamentária'],
  [/vi[uú]v|falec|morre|morte/i, 'cônjuge sobrevivo abertura sucessão'],
  [/marido|esposa|mulher|esposo/i, 'cônjuge'],
  [/uni[aã]o de facto|vivemos juntos|vivo com|companheir/i, 'união facto companheiro'],
  [/casar|casamento|casad/i, 'casamento'],
  [/div[oó]rci|separa/i, 'divórcio separação'],
  [/pens[aã]o de alimentos|alimentos/i, 'alimentos obrigação'],
  [/filhos?\b/i, 'filhos descendentes'],
  [/guarda/i, 'poder parental guarda'],
  [/adop/i, 'adopção'],
  [/menor|crian[cç]a/i, 'menor'],
];

function expandir(pergunta: string): string {
  const extra = EXPANSOES.filter(([regra]) => regra.test(pergunta)).map(([, palavras]) => palavras);
  return [pergunta, ...extra].join(' ');
}

/* ------------------------------------------------------------------ índice */

interface Entrada {
  readonly diploma: Diploma;
  readonly artigo: ArtigoBruto;
  /** Frequência de cada radical; os da epígrafe contam a triplicar. */
  readonly tf: ReadonlyMap<string, number>;
  readonly radicaisDaEpigrafe: ReadonlySet<string>;
  readonly tamanho: number;
}

interface Indice {
  readonly entradas: readonly Entrada[];
  readonly df: ReadonlyMap<string, number>;
  readonly tamanhoMedio: number;
  /** O texto normalizado de cada diploma, corrido: é onde se procuram as citações. */
  readonly corrido: string;
}

let indice: Indice | null = null;

function construirIndice(): Indice {
  const entradas: Entrada[] = [];
  const df = new Map<string, number>();
  const corrido: string[] = [];

  for (const diploma of DIPLOMAS) {
    for (const artigo of diploma.artigos) {
      const daEpigrafe = radicais(artigo.epigrafe);
      const doTexto = radicais(artigo.paragrafos.join(' '));
      const tf = new Map<string, number>();
      for (const r of doTexto) tf.set(r, (tf.get(r) ?? 0) + 1);
      for (const r of daEpigrafe) tf.set(r, (tf.get(r) ?? 0) + 3);
      for (const r of tf.keys()) df.set(r, (df.get(r) ?? 0) + 1);
      entradas.push({
        diploma,
        artigo,
        tf,
        radicaisDaEpigrafe: new Set(daEpigrafe),
        tamanho: doTexto.length + daEpigrafe.length * 3,
      });
      corrido.push(normalizar(`${artigo.epigrafe} ${artigo.paragrafos.join(' ')}`));
    }
  }
  const tamanhoMedio = entradas.reduce((s, e) => s + e.tamanho, 0) / Math.max(1, entradas.length);
  // Dois espaços entre artigos: uma citação nunca «atravessa» de um artigo para o seguinte.
  return { entradas, df, tamanhoMedio, corrido: corrido.join('  ') };
}

const oIndice = () => (indice ??= construirIndice());

/* ------------------------------------------------------------------ procura */

/** Quantos artigos seguem para o motor e para o ecrã. Mais do que isto dilui a resposta. */
export const MAX_ARTIGOS = 4;
/** Cada artigo vai inteiro até este tamanho; o resto fica a uma ligação de distância. */
const MAX_TEXTO_ARTIGO = 2_200;
/** Abaixo disto, a semelhança é ruído: é melhor não mostrar texto de lei do que mostrar o errado. */
const PONTUACAO_MINIMA = 7;

const K1 = 1.4;
const B = 0.7;

/**
 * A pergunta é sobre a lei de outro país? O corpus é só de Moçambique.
 *
 * Medido a 2026-11-12: «Qual é o salário mínimo em Portugal em 2026?» trazia
 * quatro artigos da Lei do Trabalho moçambicana — texto oficial certo, para
 * a pergunta errada, que é a pior maneira de estar certo. Uma pergunta que
 * nomeia outro país não recebe texto de lei nenhum.
 */
const OUTRO_PAIS =
  /(?<!\p{L})(portugal|brasil|angola|[aá]frica do sul|zimbabu?e|mal[aá]wi|tanz[aâ]nia|z[aâ]mbia|essuat[ií]ni|suazil[aâ]ndia|eswatini|cabo verde|guin[eé]|s[aã]o tom[eé]|timor|estados unidos|eua|reino unido|inglaterra|fran[cç]a|espanha|china|[ií]ndia|qu[eé]nia|madag[aá]scar|nam[ií]bia|botsuana|botswana)(?!\p{L})/iu;

export function perguntaDeOutroPais(pergunta: string): boolean {
  return OUTRO_PAIS.test(pergunta);
}

export function procurarArtigos(pergunta: string, tema: TemaId): ArtigoOficial[] {
  const diplomas = DIPLOMAS_DO_TEMA[tema];
  if (!diplomas || perguntaDeOutroPais(pergunta)) return [];

  const { entradas, df, tamanhoMedio } = oIndice();
  const consulta = [...new Set(radicais(expandir(pergunta)))];
  if (consulta.length === 0) return [];
  const daPergunta = new Set(radicais(pergunta));

  const pontuados: { entrada: Entrada; pontos: number }[] = [];
  for (const entrada of entradas) {
    if (!diplomas.includes(entrada.diploma.id)) continue;
    let pontos = 0;
    let acertos = 0;
    let naEpigrafe = false;
    for (const r of consulta) {
      const tf = entrada.tf.get(r);
      if (!tf) continue;
      acertos += 1;
      if (entrada.radicaisDaEpigrafe.has(r)) naEpigrafe = true;
      const idf = Math.log(1 + (entradas.length - (df.get(r) ?? 0) + 0.5) / ((df.get(r) ?? 0) + 0.5));
      // As palavras que a pessoa escreveu pesam mais do que as que nós acrescentámos.
      const peso = daPergunta.has(r) ? 1.5 : 1;
      pontos += peso * idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * entrada.tamanho) / tamanhoMedio)));
    }
    // Um só acerto fora da epígrafe é coincidência de vocabulário.
    if (acertos >= 2 || (acertos === 1 && naEpigrafe)) pontuados.push({ entrada, pontos });
  }

  return pontuados
    .filter((p) => p.pontos >= PONTUACAO_MINIMA)
    .sort((a, b) => b.pontos - a.pontos || a.entrada.artigo.n - b.entrada.artigo.n)
    .slice(0, MAX_ARTIGOS)
    .map(({ entrada }) => paraOficial(entrada));
}

function paraOficial({ diploma, artigo }: Entrada): ArtigoOficial {
  // Um artigo muito longo vai até ao limite, por parágrafos inteiros.
  const paragrafos: string[] = [];
  let total = 0;
  let cortado = false;
  for (const p of artigo.paragrafos) {
    if (total + p.length > MAX_TEXTO_ARTIGO && paragrafos.length > 0) {
      cortado = true;
      break;
    }
    paragrafos.push(p);
    total += p.length;
  }
  return {
    diploma: diploma.nome,
    titulo: diploma.titulo,
    numero: diploma.numero,
    n: artigo.n,
    epigrafe: artigo.epigrafe,
    paragrafos,
    cortado,
    fonte: diploma.fonte,
  };
}

/* --------------------------------------------------------------- citações */

/** O mínimo para se poder dizer que uma frase «está na lei»: abaixo disto, qualquer frase curta acerta. */
const MIN_CITACAO = 20;

/**
 * Esta frase está, palavra por palavra, no texto oficial?
 *
 * Compara sem acentos, sem pontuação e sem maiúsculas. Uma citação com
 * reticências («…») confere se cada pedaço estiver no texto. Uma frase curta
 * demais nunca confere: não prova nada.
 */
export function citacaoNoCorpus(citacao: string): boolean {
  const pedacos = citacao
    .split(/\.{3,}|…|\(\.\.\.\)|\[\.\.\.\]/)
    .map(normalizar)
    .filter((p) => p.length > 0);
  if (pedacos.length === 0 || pedacos.some((p) => p.length < MIN_CITACAO)) return false;
  const { corrido } = oIndice();
  return pedacos.every((p) => corrido.includes(p));
}

/** Para os testes e para a documentação: quantos artigos há, por diploma. */
export function tamanhoDoCorpus(): Record<string, number> {
  return Object.fromEntries(DIPLOMAS.map((d) => [d.id, d.artigos.length]));
}
