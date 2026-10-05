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
  | 'ajuda'
  | 'escala'
  | 'min'
  | 'max'
  | 'condicao'
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
    /^(?:opcoes|opcoes de resposta|alternativas|respostas possiveis|respostas|escolhas|options|choices|answers)$/,
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
  tipo: TipoImportavel | 'seccao';
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
  if (/seccao|secao|so texto|texto informativo|cabecalho|\bsection\b/.test(s))
    return { tipo: 'seccao' };
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
}
interface SeccaoLida {
  k: 's';
  titulo: string;
  texto: string[];
}
type BlocoLido = PerguntaLida | SeccaoLida;

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
  /** Depois de «Opções:» sem nada à frente, as linhas seguintes são as opções. */
  let listaAberta = false;
  /** O último campo de texto aberto, para continuar em várias linhas. */
  let continuar: 'ajuda' | 'textoSeccao' | 'introducao' | 'agradecimento' | null = null;

  const pergunta = (): PerguntaLida | null => (atual?.k === 'p' ? atual : null);
  const seccao = (): SeccaoLida | null => (atual?.k === 's' ? atual : null);
  const novaPergunta = (t: string, numero?: string) => {
    const p: PerguntaLida = { k: 'p', titulo: t, opcoes: [], ajuda: [], ...(numero ? { numero } : {}) };
    if (/\*+\s*$/.test(p.titulo)) {
      p.obrigatoria = true;
      p.titulo = p.titulo.replace(/\s*\*+\s*$/, '');
    }
    blocos.push(p);
    atual = p;
    listaAberta = false;
    continuar = null;
  };
  const novaSeccao = (t: string): SeccaoLida => {
    const s: SeccaoLida = { k: 's', titulo: t.replace(/[:.]\s*$/, '').trim() || '—', texto: [] };
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
          novaSeccao(c.valor);
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
            p.opcoes.push(...lista);
            listaAberta = lista.length === 0;
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
          if (p) p.condicao = lerCondicao(c.valor) ?? p.condicao;
          break;
      }
      continue;
    }

    // Linhas sem campo.
    const p = pergunta();
    const opcao = RE_OPCAO.exec(l);
    if (p && (listaAberta || (opcao && (p.opcoes.length > 0 || continuar === null)))) {
      p.opcoes.push(limparOpcao(l));
      listaAberta = true;
      continue;
    }
    const md = RE_MD.exec(l);
    const porPalavra = seccaoPorPalavra(l);
    if (md || porPalavra !== null) {
      novaSeccao(md ? md[1]! : porPalavra!);
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
      opcoes: lerOpcoes(valor('opcoes')),
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
    const cond = lerCondicao(valor('condicao'));
    if (cond) p.condicao = cond;
    blocos.push(p);
  }
  return montar(blocos, antes[0], antes.slice(1), agradecimento);
}

// ── Montar o rascunho ───────────────────────────────────────────────────────

function montar(
  blocos: readonly BlocoLido[],
  titulo: string | undefined,
  introducao: readonly string[],
  agradecimento: string | undefined,
): RascunhoImportado | null {
  const numeroParaOrdem = new Map<string, number>();
  let ordem = 0;
  for (const b of blocos) {
    if (b.k !== 'p') continue;
    ordem += 1;
    if (b.numero) numeroParaOrdem.set(b.numero, ordem);
  }
  if (ordem === 0) return null;

  ordem = 0;
  const saida = blocos.map((b): BlocoImportado => {
    if (b.k === 's') {
      const texto = b.texto.join('\n');
      return { bloco: 'seccao', titulo: b.titulo || '—', ...(texto ? { texto } : {}) };
    }
    ordem += 1;
    const ajuda = b.ajuda.join('\n');
    const opcoes = b.opcoes.length > 0 ? b.opcoes : (b.tipo?.opcoes ?? []);
    let tipo: TipoImportavel;
    let razao: string;
    let min: number | undefined;
    let max: number | undefined;
    let inteiro: boolean | undefined;
    if (b.tipo && b.tipo.tipo !== 'seccao') {
      tipo = b.tipo.tipo;
      razao = `Tipo indicado no texto: «${b.tipoDito}».`;
      ({ min, max, inteiro } = b.tipo);
    } else {
      const d = deduzir(b.titulo, ajuda, [], opcoes);
      tipo = d.tipo;
      razao = d.razao;
      ({ min, max, inteiro } = d);
    }
    if (b.min !== undefined) min = b.min;
    if (b.max !== undefined) max = b.max;
    let condicao: PerguntaImportada['condicao'];
    if (b.condicao) {
      const alvo =
        numeroParaOrdem.get(b.condicao.numero) ??
        (/^\d+$/.test(b.condicao.numero) ? Number(b.condicao.numero) : undefined);
      if (alvo && alvo < ordem) condicao = { pergunta: alvo, valor: b.condicao.valor };
    }
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
