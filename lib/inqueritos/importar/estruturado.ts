import type { BlocoImportado, PerguntaImportada, RascunhoImportado, TipoImportavel } from './esquema';
import {
  deduzir,
  ehMaiusculas,
  ehPergunta,
  limparTexto,
  numerada,
  RE_MD,
  RE_OPCAO,
  seccaoPorPalavra,
  simplificar,
} from './local';
import { lerSalto, resolverSalto, separarSaltoDeOpcao, type SaltoLido } from './saltos';

/**
 * O leitor ESTRUTURADO do «Colar e transformar».
 *
 * Quando quem escreve o inquérito declara a estrutura — numa ficha com campos
 * («Tipo: Escolha única», «Obrigatória: Sim», «Opções: …», «Subtítulo: …»,
 * «Texto da secção: …») ou numa tabela (colunas Pergunta | Tipo | Obrigatória
 * | Opções…) — não há nada a adivinhar: lê-se o que está declarado, sem IA,
 * instantâneo e exacto. Cada pergunta diz de onde veio o tipo («Tipo indicado
 * no texto: …»), para o admin ver onde foi buscada a informação.
 *
 * Devolve `null` quando o texto não tem estrutura declarada — aí o analisador
 * livre (`analisarTexto`) ou o Kimi tratam dele.
 */

export type FormatoEstruturado = 'ficha' | 'tabela';

export interface LeituraEstruturada {
  readonly formato: FormatoEstruturado;
  readonly rascunho: RascunhoImportado;
}

// ── Os campos ───────────────────────────────────────────────────────────────

type Campo =
  | 'textoSeccao'
  | 'seccao'
  | 'pergunta'
  | 'numero'
  | 'tipo'
  | 'obrigatoria'
  | 'opcoes'
  | 'afirmacoes'
  | 'ajuda'
  | 'escala'
  | 'min'
  | 'max'
  | 'condicao'
  | 'salto'
  | 'titulo'
  | 'introducao'
  | 'agradecimento';

/** O nome do campo (sem acentos, números nem pontuação) → o campo. A ordem conta. */
const ROTULOS: readonly (readonly [Campo, RegExp])[] = [
  [
    'textoSeccao',
    /^(?:texto|descricao|introducao|intro|subtitulo|enquadramento) d[ao]s? (?:seccao|secao|parte|bloco|modulo)$|^section (?:text|description|intro)$/,
  ],
  ['seccao', /^(?:seccao|secao|parte|bloco|modulo|tema|section|part)$/],
  ['pergunta', /^(?:pergunta|questao|question|p|q|item|enunciado|titulo da pergunta)$/],
  ['numero', /^(?:n|no|nr|num|numero|id|ordem)$/],
  [
    'tipo',
    /^(?:tipo|tipo de pergunta|tipo de resposta|tipo de campo|formato|formato da resposta|type|answer type|question type|field type)$/,
  ],
  ['obrigatoria', /^(?:obrigatori[ao]|resposta obrigatoria|required|mandatory|obrig)$/],
  [
    'opcoes',
    /^(?:opcoes|opcoes de resposta|alternativas|respostas possiveis|respostas|escolhas|colunas|escala de resposta|options|choices|answers|columns)$/,
  ],
  [
    'afirmacoes',
    /^(?:afirmacoes|afirmacao|linhas|itens|items|statements|rows|enunciados|subperguntas|aspectos)$/,
  ],
  [
    'ajuda',
    /^(?:subtitulo|ajuda|texto de ajuda|instrucao|instrucoes|descricao|nota|dica|observacao|helper text|help|hint|description|subtitle)$/,
  ],
  ['escala', /^(?:escala|intervalo|range|scale)$/],
  ['min', /^(?:min|minimo|minimum)$/],
  ['max', /^(?:max|maximo|maximum|limite)$/],
  [
    'condicao',
    /^(?:condicao|logica|mostrar se|so se|exibir se|mostrar apenas se|show if|condition|depende de)$/,
  ],
  [
    'salto',
    /^(?:salto|saltos|saltar|logica de salto|regra de salto|ramificacao|branching|ir para|navegacao|logic jump|jump)$/,
  ],
  [
    'titulo',
    /^(?:titulo|titulo do inquerito|titulo do questionario|titulo do survey|nome do inquerito|title)$/,
  ],
  [
    'introducao',
    /^(?:introducao|boas vindas|mensagem inicial|apresentacao|welcome|intro do inquerito)$/,
  ],
  [
    'agradecimento',
    /^(?:agradecimento|mensagem final|encerramento|thank you|mensagem de agradecimento)$/,
  ],
];

/** O nome de um campo, normalizado: «Pergunta 3» → «pergunta», «Tipo de resposta». */
function chaveDoRotulo(r: string): string {
  return simplificar(r)
    .replace(/[\d.º°ª#()[\]*_]/g, ' ')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function campoDe(rotulo: string): Campo | null {
  const chave = chaveDoRotulo(rotulo);
  if (!chave && /#|n[ºo°]/i.test(rotulo)) return 'numero';
  for (const [campo, re] of ROTULOS) if (re.test(chave)) return campo;
  return null;
}

/** «Tipo: Escolha única» → { campo: 'tipo', valor, numero? }. Só com «:» ou «=». */
function linhaDeCampo(l: string): { campo: Campo; valor: string; numero?: string } | null {
  const m = /^[•*\-–]?\s*([\p{L}#][\p{L}\d\s.º°ª#()/-]{0,38}?)\s*[:=]\s*(.*)$/u.exec(l);
  if (!m) return null;
  const campo = campoDe(m[1]!);
  if (!campo) return null;
  const numero = /(\d{1,3}(?:\.\d{1,3})?)/.exec(m[1]!)?.[1];
  return { campo, valor: m[2]!.trim(), ...(numero ? { numero } : {}) };
}

// ── Os valores ──────────────────────────────────────────────────────────────

interface TipoLido {
  /** `grelha`: Likert/matriz do Microsoft Forms e do Google Forms — expande-se. */
  tipo: TipoImportavel | 'seccao' | 'grelha';
  /** Quando o tipo do Forms/Typeform não existe aqui: o que se fez, dito ao admin. */
  nota?: string;
  min?: number;
  max?: number;
  inteiro?: boolean;
  /** «Sim/Não» sem opções escritas: as opções são estas. */
  opcoes?: string[];
}

function intervalo(s: string): [number, number] | null {
  const m = /(-?\d{1,6})\s*(?:a|-|–|ate|to|\.\.)\s*(-?\d{1,6})/.exec(s);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

function porIntervalo(s: string): TipoLido | null {
  const r = intervalo(s);
  if (!r) return null;
  const [a, b] = r;
  if (a === 1 && b === 5) return { tipo: 'avaliacao' };
  if (a === 0 && b === 10) return { tipo: 'nps' };
  return { tipo: 'numero', min: a, max: b, inteiro: true };
}

/** «Escolha única», «Caixas de verificação», «Escala linear 1-5», «Parágrafo»… */
export function lerTipo(valor: string): TipoLido | null {
  const s = simplificar(valor).trim();
  if (!s) return null;
  if (/seccao|secao|so texto|texto informativo|cabecalho|declaracao|statement|\bsection\b/.test(s))
    return { tipo: 'seccao' };
  // Likert e grelhas (Microsoft Forms, Google Forms): uma pergunta por linha.
  if (/likert|grelha|grade|matriz|matrix|\bgrid\b/.test(s)) return { tipo: 'grelha' };
  // Tipos do Forms/Typeform que ainda não existem aqui: o equivalente mais próximo, dito.
  if (/ordenacao|ordenar|ranking|classificacao por ordem|prioriz/.test(s))
    return {
      tipo: 'escolha_multipla',
      nota: 'A ordenação ainda não existe: ficou escolha múltipla (as mais importantes).',
    };
  if (/upload|carregar|ficheiro|arquivo|anexo|\bfile\b/.test(s))
    return {
      tipo: 'texto_curto',
      nota: 'Carregar ficheiros ainda não existe: ficou texto curto (peça um link).',
    };
  if (/^hora$|\btime\b|horario/.test(s))
    return { tipo: 'texto_curto', nota: 'A hora fica como texto curto (ex.: 14:30).' };
  if (/\blegal\b|aceito|termos|consentimento/.test(s))
    return { tipo: 'escolha_unica', opcoes: ['Aceito', 'Não aceito'] };
  if (/website|\burl\b|link|endereco web/.test(s)) return { tipo: 'texto_curto' };
  if (/\bnps\b|net promoter|recomendacao/.test(s)) return { tipo: 'nps' };
  if (/escala|linear|scale/.test(s)) return porIntervalo(s) ?? { tipo: 'avaliacao' };
  if (/avaliacao|estrelas|rating|stars|classificacao|satisfacao/.test(s))
    return porIntervalo(s) ?? { tipo: 'avaliacao' };
  // No Google Forms em inglês, «Multiple choice» é a de uma só resposta.
  if (/^(?:multiple choice|escolha simples)$/.test(s)) return { tipo: 'escolha_unica' };
  if (
    /multipla|varias|caixas? de (?:verificacao|selecao)|checkbox|check box|\bmulti|mais de uma|selecione todas/.test(
      s,
    )
  )
    return { tipo: 'escolha_multipla' };
  if (/sim\s*(?:\/|ou|e)\s*nao|yes\s*\/\s*no|booleano|boolean/.test(s))
    return { tipo: 'escolha_unica', opcoes: ['Sim', 'Não'] };
  if (
    /unica|uma opcao|lista pendente|lista suspensa|dropdown|radio|single|escolha|selecao|seleccao|opcoes|\blista\b/.test(
      s,
    )
  )
    return { tipo: 'escolha_unica' };
  if (/\bdata\b|\bdate\b/.test(s)) return { tipo: 'data' };
  if (/numer|quantidade|inteiro|valor|montante|percent|number|integer|idade/.test(s)) {
    const r = intervalo(s);
    return {
      tipo: 'numero',
      ...(/inteiro|quantidade|integer|idade/.test(s) ? { inteiro: true } : {}),
      ...(r ? { min: r[0], max: r[1] } : {}),
    };
  }
  if (/longo|longa|paragrafo|comentario|descritiv|long|paragraph|textarea/.test(s))
    return { tipo: 'texto_longo' };
  if (/curto|curta|texto|aberta|short|text|resposta|email|telefone|nome/.test(s))
    return { tipo: 'texto_curto' };
  return null;
}

/** «Sim», «S», «X», «✓», «Obrigatória» → true; «Não», «Opcional», «-» → false. */
export function lerSimNao(valor: string): boolean | undefined {
  const s = simplificar(valor).trim();
  if (!s) return undefined;
  if (/^(?:sim|s|yes|y|true|verdadeiro|x|✓|✔|obrigatori[ao]|required|1)(?![\p{L}])/u.test(s))
    return true;
  if (/^(?:nao|n|no|false|falso|opcional|facultativ[ao]|optional|-|0)(?![\p{L}])/u.test(s))
    return false;
  return undefined;
}

function limparOpcao(p: string): string {
  const m = RE_OPCAO.exec(p.trim());
  return (m ? m[1]! : p).trim().replace(/[.;,]$/, '').trim();
}

/** «Sim; Não; Talvez», «A | B», «Sim / Não», «Energia, Banca, Outro». */
export function lerOpcoes(valor: string): string[] {
  const v = valor.trim();
  if (!v) return [];
  const porVirgula = !/[;|/]/.test(v);
  const sep = v.includes(';') ? /\s*;\s*/ : v.includes('|') ? /\s*\|\s*/ : v.includes('/') ? /\s*\/\s*/ : /\s*,\s*/;
  const partes = v
    .split(sep)
    .map((p) => limparOpcao(p))
    .filter(Boolean);
  // Vírgulas só separam opções curtas; uma frase com vírgulas é uma opção só.
  if (porVirgula && partes.some((p) => p.split(/\s+/).length > 6)) return [limparOpcao(v)];
  return partes;
}

/** «P3 = Sim», «Se a pergunta 3 for «Sim»», «Q2: Não». */
const RE_COND =
  /(?:p|q|pergunta|quest[aã]o|question)\s*(\d{1,3}(?:\.\d{1,3})?)\D*?(?:==|=|for|é|e|is|igual a|:|responder|respondeu)\s*["«“']?([^"»”']+?)["»”']?\s*\.?$/iu;

function lerCondicao(valor: string): { numero: string; valor: string } | undefined {
  const m = RE_COND.exec(valor);
  return m ? { numero: m[1]!, valor: m[2]!.trim() } : undefined;
}

// ── Blocos em construção ────────────────────────────────────────────────────

interface PerguntaLida {
  k: 'p';
  titulo: string;
  numero?: string;
  tipo?: TipoLido;
  tipoDito?: string;
  obrigatoria?: boolean;
  opcoes: string[];
  ajuda: string[];
  min?: number;
  max?: number;
  condicao?: { numero: string; valor: string };
  saltos: SaltoLido[];
  /** Linhas de uma grelha/Likert («Afirmações:»). */
  afirmacoes: string[];
}
interface SeccaoLida {
  k: 's';
  titulo: string;
  texto: string[];
  /** O número escrito («Secção 3»), para os saltos «ir para a Secção 3». */
  numero?: string;
  /** «Condição:» dentro de uma secção: esconde-a com as suas perguntas. */
  condicao?: { numero: string; valor: string };
}
type BlocoLidoBase = PerguntaLida | SeccaoLida;

/** As opções, com os saltos colados («Não → Secção 3») passados para a pergunta. */
function juntarOpcoes(p: PerguntaLida, lista: readonly string[]): void {
  for (const o of lista) {
    const { rotulo, salto } = separarSaltoDeOpcao(o);
    p.opcoes.push(rotulo);
    if (salto) p.saltos.push(salto);
  }
}
type BlocoLido = BlocoLidoBase;

/** Os campos que só aparecem quando alguém declara a estrutura de propósito. */
const CAMPOS_DE_ESTRUTURA: ReadonlySet<Campo> = new Set(['tipo', 'obrigatoria', 'opcoes', 'escala']);

// ── A ficha ─────────────────────────────────────────────────────────────────

function lerFicha(linhas: readonly string[]): RascunhoImportado | null {
  const declarados = linhas.filter((l) => {
    const c = linhaDeCampo(l);
    return c !== null && CAMPOS_DE_ESTRUTURA.has(c.campo);
  }).length;
  if (declarados < 2) return null;

  const blocos: BlocoLido[] = [];
  let titulo: string | undefined;
  const introducao: string[] = [];
  let agradecimento: string | undefined;
  let atual: BlocoLido | null = null;
  /** Depois de «Opções:» (ou «Afirmações:») sem nada à frente, as linhas seguintes são a lista. */
  let listaAberta = false;
  let listaPara: 'opcoes' | 'afirmacoes' = 'opcoes';
  /** O último campo de texto aberto, para continuar em várias linhas. */
  let continuar: 'ajuda' | 'textoSeccao' | 'introducao' | 'agradecimento' | null = null;

  const pergunta = (): PerguntaLida | null => (atual?.k === 'p' ? atual : null);
  const seccao = (): SeccaoLida | null => (atual?.k === 's' ? atual : null);
  const novaPergunta = (t: string, numero?: string) => {
    const p: PerguntaLida = {
      k: 'p',
      titulo: t,
      opcoes: [],
      ajuda: [],
      saltos: [],
      afirmacoes: [],
      ...(numero ? { numero } : {}),
    };
    if (/\*+\s*$/.test(p.titulo)) {
      p.obrigatoria = true;
      p.titulo = p.titulo.replace(/\s*\*+\s*$/, '');
    }
    blocos.push(p);
    atual = p;
    listaAberta = false;
    continuar = null;
  };
  const novaSeccao = (t: string, numero?: string): SeccaoLida => {
    const s: SeccaoLida = {
      k: 's',
      titulo: t.replace(/[:.]\s*$/, '').trim() || '—',
      texto: [],
      ...(numero ? { numero } : {}),
    };
    blocos.push(s);
    atual = s;
    listaAberta = false;
    continuar = null;
    return s;
  };

  for (const l of linhas) {
    const c = linhaDeCampo(l);
    if (c) {
      listaAberta = false;
      continuar = null;
      const p = pergunta();
      const s = seccao();
      switch (c.campo) {
        case 'titulo':
          if (!titulo && blocos.length === 0) titulo = c.valor;
          else if (p && c.valor) p.titulo = c.valor;
          break;
        case 'introducao':
          if (c.valor) introducao.push(c.valor);
          continuar = 'introducao';
          break;
        case 'agradecimento':
          if (c.valor) agradecimento = c.valor;
          continuar = 'agradecimento';
          break;
        case 'seccao':
          novaSeccao(c.valor, c.numero);
          break;
        case 'textoSeccao':
          if (s) {
            if (c.valor) s.texto.push(c.valor);
            continuar = 'textoSeccao';
          }
          break;
        case 'pergunta':
          novaPergunta(c.valor, c.numero);
          break;
        case 'numero':
          if (p) p.numero = c.valor.replace(/[^\d.]/g, '');
          break;
        case 'tipo': {
          const t = lerTipo(c.valor);
          if (t?.tipo === 'seccao' && p) {
            // «Tipo: Secção» faz da pergunta corrente uma secção.
            blocos.pop();
            novaSeccao(p.titulo).texto.push(...p.ajuda);
          } else if (p && t) {
            p.tipo = t;
            p.tipoDito = c.valor;
          }
          break;
        }
        case 'obrigatoria':
          if (p) p.obrigatoria = lerSimNao(c.valor) ?? p.obrigatoria;
          break;
        case 'opcoes':
          if (p) {
            const lista = lerOpcoes(c.valor);
            juntarOpcoes(p, lista);
            listaAberta = lista.length === 0;
            listaPara = 'opcoes';
          }
          break;
        case 'afirmacoes':
          if (p) {
            const lista = lerOpcoes(c.valor);
            p.afirmacoes.push(...lista);
            listaAberta = lista.length === 0;
            listaPara = 'afirmacoes';
          }
          break;
        case 'ajuda':
          if (s) {
            if (c.valor) s.texto.push(c.valor);
            continuar = 'textoSeccao';
          } else if (p) {
            if (c.valor) p.ajuda.push(c.valor);
            continuar = 'ajuda';
          } else if (c.valor) {
            introducao.push(c.valor);
            continuar = 'introducao';
          }
          break;
        case 'escala':
          // Numa grelha, «Escala: Discordo; …; Concordo» são as colunas.
          if (p && /[;|]/.test(c.valor)) {
            juntarOpcoes(p, lerOpcoes(c.valor));
            break;
          }
          if (p) {
            const t = porIntervalo(simplificar(c.valor));
            if (t && !p.tipo) {
              p.tipo = t;
              p.tipoDito = `escala ${c.valor}`;
            }
            const r = intervalo(simplificar(c.valor));
            if (r && p.tipo?.tipo === 'numero') [p.min, p.max] = r;
          }
          break;
        case 'min':
        case 'max':
          if (p) {
            const n = Number(/-?\d+/.exec(c.valor)?.[0]);
            if (Number.isFinite(n)) p[c.campo] = n;
          }
          break;
        case 'condicao':
        case 'salto': {
          // «Lógica: Se Não, ir para a Secção 3» é um salto; «Condição: P4 = Sim» é uma condição.
          const salto = lerSalto(c.valor) ?? separarSaltoDeOpcao(c.valor.replace(/^se\s+/i, '')).salto;
          if (salto && p) p.saltos.push(salto);
          else if (c.campo === 'condicao') {
            const cond = lerCondicao(c.valor);
            if (p && cond) p.condicao = cond;
            else if (s && cond) s.condicao = cond;
          }
          break;
        }
      }
      continue;
    }

    // Linhas sem campo.
    const p = pergunta();
    const opcao = RE_OPCAO.exec(l);
    const saltoSolto = lerSalto(l);
    if (saltoSolto && p) {
      p.saltos.push(saltoSolto);
      continue;
    }
    if (p && listaAberta && listaPara === 'afirmacoes') {
      p.afirmacoes.push(limparOpcao(l));
      continue;
    }
    if (p && (listaAberta || (opcao && (p.opcoes.length > 0 || continuar === null)))) {
      juntarOpcoes(p, [limparOpcao(l)]);
      listaAberta = true;
      listaPara = 'opcoes';
      continue;
    }
    const md = RE_MD.exec(l);
    const porPalavra = seccaoPorPalavra(l);
    if (md || porPalavra !== null) {
      novaSeccao(md ? md[1]! : porPalavra!, /(\d{1,3})/.exec(l)?.[1]);
      continue;
    }
    const num = numerada(l);
    if (num) {
      if (ehMaiusculas(num.resto)) novaSeccao(num.resto);
      else novaPergunta(num.resto, num.numero);
      continue;
    }
    if (ehPergunta(l)) {
      novaPergunta(l);
      continue;
    }
    const s = seccao();
    if (continuar === 'ajuda' && p) p.ajuda.push(l);
    else if (continuar === 'textoSeccao' && s) s.texto.push(l);
    else if (continuar === 'introducao') introducao.push(l);
    else if (continuar === 'agradecimento') agradecimento = [agradecimento, l].filter(Boolean).join('\n');
    else if (ehMaiusculas(l) && blocos.length > 0) novaSeccao(l);
    else if (!atual && !titulo) titulo = l;
    else if (!atual) introducao.push(l);
    else if (s) s.texto.push(l);
    else p?.ajuda.push(l);
  }

  return montar(blocos, titulo, introducao, agradecimento);
}

// ── A tabela ────────────────────────────────────────────────────────────────

function celulas(l: string): string[] | null {
  if (l.includes('\t')) return l.split('\t').map((c) => c.trim());
  if (/^\|.*\|$/.test(l))
    return l
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());
  return null;
}

function lerTabela(linhas: readonly string[]): RascunhoImportado | null {
  let colunas: (Campo | null)[] | null = null;
  let inicio = -1;
  for (const [i, l] of linhas.entries()) {
    const cs = celulas(l);
    if (!cs || cs.length < 2) continue;
    const campos = cs.map((c) => campoDe(c));
    if (campos.includes('pergunta') && campos.some((c) => c !== null && CAMPOS_DE_ESTRUTURA.has(c))) {
      colunas = campos;
      inicio = i;
      break;
    }
  }
  if (!colunas) return null;
  const cols = colunas;

  const blocos: BlocoLido[] = [];
  const antes = linhas.slice(0, inicio).filter((l) => !celulas(l));
  let agradecimento: string | undefined;
  let seccaoAtual: string | undefined;

  for (const l of linhas.slice(inicio + 1)) {
    const cs = celulas(l);
    if (!cs) {
      // Texto depois da tabela: a mensagem final.
      if (blocos.length > 0) agradecimento = [agradecimento, l].filter(Boolean).join('\n');
      continue;
    }
    if (cs.every((c) => /^:?-{2,}:?$/.test(c) || c === '')) continue;
    const valor = (campo: Campo) => {
      const i = cols.indexOf(campo);
      return i >= 0 ? (cs[i] ?? '').trim() : '';
    };
    const sec = valor('seccao');
    if (sec && sec !== seccaoAtual) {
      seccaoAtual = sec;
      const texto = valor('textoSeccao');
      blocos.push({ k: 's', titulo: sec, texto: texto ? [texto] : [] });
    }
    const tituloP = valor('pergunta');
    if (!tituloP) continue;
    const tipoDito = valor('tipo');
    const t = lerTipo(tipoDito);
    const ajuda = valor('ajuda');
    if (t?.tipo === 'seccao') {
      blocos.push({ k: 's', titulo: tituloP, texto: ajuda ? [ajuda] : [] });
      continue;
    }
    const numero = valor('numero').replace(/[^\d.]/g, '');
    const p: PerguntaLida = {
      k: 'p',
      titulo: tituloP.replace(/\s*\*+\s*$/, ''),
      opcoes: [],
      saltos: [],
      afirmacoes: lerOpcoes(valor('afirmacoes')),
      ajuda: ajuda ? [ajuda] : [],
      ...(numero ? { numero } : {}),
      ...(t ? { tipo: t, tipoDito } : {}),
    };
    const obrig = lerSimNao(valor('obrigatoria'));
    if (obrig !== undefined) p.obrigatoria = obrig;
    else if (/\*\s*$/.test(tituloP)) p.obrigatoria = true;
    const escala = valor('escala');
    if (escala && !p.tipo) {
      const e = porIntervalo(simplificar(escala));
      if (e) {
        p.tipo = e;
        p.tipoDito = `escala ${escala}`;
      }
    }
    juntarOpcoes(p, lerOpcoes(valor('opcoes')));
    for (const regra of [valor('condicao'), valor('salto')].filter(Boolean)) {
      const salto = lerSalto(regra) ?? separarSaltoDeOpcao(regra.replace(/^se\s+/i, '')).salto;
      if (salto) p.saltos.push(salto);
      else p.condicao = lerCondicao(regra) ?? p.condicao;
    }
    blocos.push(p);
  }
  return montar(blocos, antes[0], antes.slice(1), agradecimento);
}

// ── Montar o rascunho ───────────────────────────────────────────────────────

/** A escala Likert de 5 pontos, quando a grelha não diz as colunas. */
const LIKERT_PT = ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'];

/**
 * Likert e grelhas (Microsoft Forms, Google Forms): uma pergunta de escolha
 * única por afirmação, todas com a mesma escala. Feito ANTES de numerar, para
 * as condições e os saltos que apontam para perguntas seguintes continuarem
 * certos; o número escrito da grelha passa a ser o da primeira afirmação.
 */
function expandirGrelhas(blocos: readonly BlocoLido[]): BlocoLido[] {
  return blocos.flatMap((b): BlocoLido[] => {
    if (b.k !== 'p' || b.tipo?.tipo !== 'grelha') return [b];
    // «Escala Likert 1-5» sem afirmações é uma escala, não uma grelha.
    const dito = b.tipoDito ? simplificar(b.tipoDito) : '';
    const r = intervalo(dito);
    if (b.afirmacoes.length === 0 && b.opcoes.length < 2 && r) {
      const t = porIntervalo(dito)!;
      return [{ ...b, tipo: { ...t, nota: 'Likert sem afirmações: ficou uma escala.' } }];
    }
    // Sem colunas escritas: a escala numérica dita (até 11 pontos) ou a de concordância.
    const numeros =
      r && r[1] > r[0] && r[1] - r[0] <= 10
        ? Array.from({ length: r[1] - r[0] + 1 }, (_, i) => String(r[0] + i))
        : null;
    const colunas = b.opcoes.length >= 2 ? b.opcoes : (numeros ?? LIKERT_PT);
    const tipoUnica: TipoLido = {
      tipo: 'escolha_unica',
      nota:
        b.afirmacoes.length === 0
          ? 'Likert sem afirmações: ficou uma pergunta com a escala.'
          : 'Likert/grelha do Microsoft Forms: uma pergunta por afirmação, com a mesma escala.',
    };
    if (b.afirmacoes.length === 0)
      return [{ ...b, opcoes: [...colunas], tipo: tipoUnica }];
    const enunciado = [b.titulo, ...b.ajuda].filter(Boolean);
    return b.afirmacoes.map(
      (afirmacao, i): PerguntaLida => ({
        k: 'p',
        titulo: afirmacao,
        ajuda: enunciado,
        opcoes: [...colunas],
        afirmacoes: [],
        saltos: [],
        tipo: tipoUnica,
        tipoDito: b.tipoDito,
        ...(i === 0 && b.numero ? { numero: b.numero } : {}),
        ...(b.obrigatoria !== undefined ? { obrigatoria: b.obrigatoria } : {}),
        ...(b.condicao ? { condicao: b.condicao } : {}),
      }),
    );
  });
}

function montar(
  blocosLidos: readonly BlocoLido[],
  titulo: string | undefined,
  introducao: readonly string[],
  agradecimento: string | undefined,
): RascunhoImportado | null {
  const blocos = expandirGrelhas(blocosLidos);
  const numeroParaOrdem = new Map<string, number>();
  const seccaoParaOrdem = new Map<string, number>();
  let ordem = 0;
  let ordemSeccao = 0;
  for (const b of blocos) {
    if (b.k === 's') {
      ordemSeccao += 1;
      if (b.numero) seccaoParaOrdem.set(b.numero, ordemSeccao);
      continue;
    }
    ordem += 1;
    if (b.numero) numeroParaOrdem.set(b.numero, ordem);
  }
  if (ordem === 0) return null;

  const resolverCondicao = (
    c: { numero: string; valor: string } | undefined,
    antesDe: number,
  ): PerguntaImportada['condicao'] => {
    if (!c) return undefined;
    const alvo = numeroParaOrdem.get(c.numero) ?? (/^\d+$/.test(c.numero) ? Number(c.numero) : undefined);
    return alvo && alvo < antesDe ? { pergunta: alvo, valor: c.valor } : undefined;
  };

  ordem = 0;
  const saida = blocos.map((b): BlocoImportado => {
    if (b.k === 's') {
      const texto = b.texto.join('\n');
      // Uma secção vem depois das perguntas já contadas: a condição aponta para uma delas.
      const condicao = resolverCondicao(b.condicao, ordem + 1);
      return {
        bloco: 'seccao',
        titulo: b.titulo || '—',
        ...(texto ? { texto } : {}),
        ...(condicao ? { condicao } : {}),
      };
    }
    ordem += 1;
    const ajuda = b.ajuda.join('\n');
    const opcoes = b.opcoes.length > 0 ? b.opcoes : (b.tipo?.opcoes ?? []);
    let tipo: TipoImportavel;
    let razao: string;
    let min: number | undefined;
    let max: number | undefined;
    let inteiro: boolean | undefined;
    if (b.tipo && b.tipo.tipo !== 'seccao' && b.tipo.tipo !== 'grelha') {
      tipo = b.tipo.tipo;
      // De onde veio o tipo — e, se o Forms/Typeform tinha um que aqui não existe, o que se fez.
      razao = [`Tipo indicado no texto: «${b.tipoDito}».`, b.tipo.nota].filter(Boolean).join(' ');
      ({ min, max, inteiro } = b.tipo);
    } else {
      const d = deduzir(b.titulo, ajuda, [], opcoes);
      tipo = d.tipo;
      razao = d.razao;
      ({ min, max, inteiro } = d);
    }
    if (b.min !== undefined) min = b.min;
    if (b.max !== undefined) max = b.max;
    const condicao = resolverCondicao(b.condicao, ordem);
    const saltos = b.saltos.flatMap((sl) => {
      const r = resolverSalto(sl, { seccoes: seccaoParaOrdem, perguntas: numeroParaOrdem });
      return r ? [r] : [];
    });
    return {
      bloco: 'pergunta',
      titulo: b.titulo || '—',
      ...(ajuda ? { ajuda } : {}),
      tipo,
      ...(b.obrigatoria !== undefined ? { obrigatoria: b.obrigatoria } : {}),
      ...(opcoes.length > 0 ? { opcoes } : {}),
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      ...(inteiro !== undefined ? { inteiro } : {}),
      ...(condicao ? { condicao } : {}),
      ...(saltos.length > 0 ? { saltos } : {}),
      razao,
    };
  });

  const intro = introducao.join('\n');
  return {
    ...(titulo ? { titulo } : {}),
    ...(intro ? { introducao: intro } : {}),
    ...(agradecimento ? { agradecimento } : {}),
    blocos: saida,
  };
}

/**
 * Lê a estrutura declarada, se houver. Primeiro a tabela (colunas explícitas),
 * depois a ficha (campos «Tipo:», «Obrigatória:», «Opções:»…).
 */
export function analisarEstruturado(bruto: string): LeituraEstruturada | null {
  const comTabs = limparTexto(bruto, { tabs: true })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const tabela = lerTabela(comTabs);
  if (tabela) return { formato: 'tabela', rascunho: tabela };

  const linhas = limparTexto(bruto)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const ficha = lerFicha(linhas);
  return ficha ? { formato: 'ficha', rascunho: ficha } : null;
}
