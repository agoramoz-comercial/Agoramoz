import type { BlocoImportado, RascunhoImportado, TipoImportavel } from './esquema';

/**
 * O analisador local: lê um inquérito escrito em texto (colado do Word, do
 * Google Docs ou escrito à mão) e devolve o rascunho estruturado — sem rede,
 * sem custo, sem o texto sair do servidor. É também o plano B do Kimi.
 *
 * É determinístico e explica-se: cada tipo deduzido leva a sua `razao`, que o
 * admin vê na revisão antes de aplicar. Reconhece:
 *
 * - secções: «Secção 2: …», «Parte B — …», `## …`, ou uma linha em MAIÚSCULAS;
 *   os parágrafos a seguir são o texto da secção;
 * - perguntas: «1.», «1)», «1.2», «P3», «Pergunta 4», ou uma linha que acaba
 *   em «?»; a linha seguinte entre parênteses, em itálico ou com «Nota:» é o
 *   subtítulo;
 * - opções: «a)», «A.», «-», «•», «[ ]», «( )», «☐»… ou na mesma linha
 *   («Sim / Não», «( ) Sim ( ) Não»);
 * - obrigatória: «*», «(obrigatória)»; opcional: «(opcional)»;
 * - condições: «Se sim, …», «(Se respondeu Não à pergunta 2) …».
 *
 * O texto é tratado SEMPRE como dado: nada aqui é executado nem interpretado
 * como instrução.
 */

/** Minúsculas e sem acentos — para comparar «Obrigatória» com «obrigatoria». */
export function simplificar(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * O que o Word e o Google Docs deixam no texto colado. As marcas de lista do
 * Word chegam como caracteres privados da fonte Symbol/Wingdings (U+F0B7, U+F0A7…) ou
 * como «o» seguido de tabulação: passam a «•». Com `tabs`, as tabulações
 * ficam (são as colunas de uma tabela colada).
 */
export function limparTexto(t: string, opcoes: { readonly tabs?: boolean } = {}): string {
  const semMarcas = t
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/^[ \t]*(?:[\uF000-\uF0FF§Ø]|o(?=\t))[ \t]*/gmu, '• ');
  if (opcoes.tabs)
    return semMarcas
      .replace(/[\u00A0\u2007\u202F]/g, ' ')
      .replace(/[\u200B-\u200D\u2060]/g, '')
      .replace(/[ ]{2,}/g, ' ');
  return semMarcas
    .replace(/[   ]/g, ' ')
    .replace(/[​-‍⁠]/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ');
}

const maiuscula = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

// ── Reconhecimento de linhas ────────────────────────────────────────────────

export const RE_MD = /^#{1,4}\s+(.+)$/;
/** «Secção 2: Dados», «Parte B — Operações», «Section 1». Exige número/letra ou separador. */
const RE_SECCAO =
  /^(?:sec[cç][aã]o|seccao|parte|bloco|m[oó]dulo|section|part)(?:\s+(\d{1,3}|[ivxlc]{1,6}|[a-z])(?![\p{L}]))?\s*([:.\-–—])?\s*(.*)$/iu;
const RE_P_PREFIXO = /^(?:p|q|pergunta|quest[aã]o|question)\s*(\d{1,3})\s*[.)\-–:]?\s*(.+)$/iu;
const RE_P_HIERARQUIA = /^(\d{1,3}(?:\.\d{1,3})+)\.?\s+(.+)$/;
const RE_P_SIMPLES = /^(\d{1,3})\s*[.)\-–:]\s+(.+)$/;
export const RE_OPCAO =
  /^(?:\(?[a-zA-Z]\)|[a-zA-Z][.)]|[-–•·▪◦●○◯☐☑□■➢➤✓]|\*(?=\s)|\[\s?[xX]?\s?\]|\(\s?\))\s*(.+)$/u;
const RE_NOTA =
  /^(?:nota|obs\.?|observa[cç][aã]o|ajuda|dica|instru[cç][aã]o|subt[ií]tulo|descri[cç][aã]o|note|hint|help)\s*:\s*(.+)$/iu;
/** «* Indica uma pergunta obrigatória» — a legenda do Google Forms. */
const RE_LEGENDA = /^\*\s*(?:indica|obrigat|required|indicates)/iu;
const RE_IMPERATIVO =
  /^(?:indique|escolha|selecione|seleccione|marque|descreva|diga|refira|enumere|classifique|avalie|please|select|choose|describe|list|rate)\b/iu;
const RE_AGRADECIMENTO = /^(?:agradecimento|obrigad[oa]|mensagem final|fim\b|encerramento|thank|closing)/iu;

/** Instruções de resposta que pertencem à pergunta anterior, não são perguntas. */
const RE_COMO_RESPONDER =
  /^(?:escolha|selecione|seleccione|marque|assinale|select|choose|check|tick)\s+(?:uma|um|todas|todos|as que|os que|at[eé]|no m[aá]ximo|apenas|s[oó]|one|all|up to|only)\b/iu;

/** Uma linha que é pergunta sem número: acaba em «?», ou tem «?» seguido de opções. */
export function ehPergunta(l: string): boolean {
  if (l.endsWith('?')) return true;
  const q = l.lastIndexOf('?');
  return q > 0 && opcoesEmLinha(l.slice(q + 1).trim()) !== null;
}

export function ehMaiusculas(l: string): boolean {
  const letras = l.match(/\p{L}/gu);
  return (
    !!letras &&
    letras.length >= 3 &&
    l.length <= 90 &&
    !l.endsWith('?') &&
    l === l.toUpperCase() &&
    l !== l.toLowerCase()
  );
}

export function nota(l: string): string | null {
  const m = RE_NOTA.exec(l);
  if (m) return m[1]!.trim();
  if (/^\(.+\)$/.test(l)) return l.slice(1, -1).trim();
  if (/^_[^_].*_$/.test(l)) return l.slice(1, -1).trim();
  if (/^\*(?!\s)[^*].*\*$/.test(l)) return l.slice(1, -1).trim();
  return null;
}

export function numerada(l: string): { numero: string; resto: string } | null {
  const m = RE_P_PREFIXO.exec(l) ?? RE_P_HIERARQUIA.exec(l) ?? RE_P_SIMPLES.exec(l);
  return m ? { numero: m[1]!, resto: m[2]!.trim() } : null;
}

export function seccaoPorPalavra(l: string): string | null {
  if (l.endsWith('?')) return null;
  const m = RE_SECCAO.exec(l);
  if (!m) return null;
  const [, numero, separador, resto] = m;
  // «Parte da equipa usa…» não é secção: sem número nem separador, só a palavra sozinha.
  if (!numero && !separador && resto) return null;
  return (resto ?? '').trim() || l.trim();
}

/** Opções na mesma linha: «Sim / Não», «( ) Sim ( ) Não», «Sim | Não | Talvez». */
export function opcoesEmLinha(l: string): string[] | null {
  if (/[?.!]$/.test(l) || !/[/|;☐○]|\(\s?\)/.test(l)) return null;
  const partes = l
    .split(/\s*(?:\/|\||;|\(\s?\)|☐|○)\s*/u)
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length < 2 || partes.length > 12) return null;
  return partes.every((p) => p.length <= 60 && p.split(/\s+/).length <= 6) ? partes : null;
}

// ── Marcas dentro do título de uma pergunta ─────────────────────────────────

const RE_OBRIGATORIA = /[([]\s*(?:obrigat[oó]ri[ao]|required|mandatory)\s*[)\]]|[\s\-–—]+obrigat[oó]ri[ao]\s*$/iu;
const RE_OPCIONAL = /[([]\s*(?:opcional|optional|facultativ[ao])\s*[)\]]|[\s\-–—]+(?:opcional|optional)\s*$/iu;
const RE_CONDICAO =
  /^\(?\s*(?:s[oó]\s+)?(?:se|if)\s+(?:respondeu|responder|answered|selected)?\s*["«“']?([^"»”'),:;]{1,40}?)["»”']?\s*(?:(?:na|à|a|to|in)\s+(?:pergunta|question|p|q)\s*(\d{1,3}(?:\.\d{1,3})*))?\s*[),:;—–-]\s*(.+)$/iu;

/** Palavras que, entre parênteses ou parênteses rectos, são uma indicação de tipo. */
const RE_DICA_TIPO =
  /m[uú]ltipla|v[aá]rias|[uú]nica|escala|estrelas|nps|\b\d{1,2}\s*(?:a|-|–|at[eé]|to)\s*\d{1,2}\b|texto|par[aá]grafo|data|n[uú]mero|num[eé]rico|sim\s*\/\s*n[aã]o|multiple|single|rating|stars|scale|date|number|text|paragraph/iu;

interface Marcas {
  titulo: string;
  obrigatoria?: boolean;
  dicas: string[];
  opcoes?: string[];
  condicao?: { valor: string; numero?: string };
}

function extrairMarcas(bruto: string): Marcas {
  let titulo = bruto.trim();
  let obrigatoria: boolean | undefined;
  const dicas: string[] = [];
  let opcoes: string[] | undefined;
  let condicao: Marcas['condicao'];

  const cond = RE_CONDICAO.exec(titulo);
  if (cond && cond[3]!.trim().length >= 3) {
    condicao = { valor: cond[1]!.trim(), ...(cond[2] ? { numero: cond[2] } : {}) };
    titulo = maiuscula(cond[3]!.trim());
  }
  if (/\*+\s*$/.test(titulo)) {
    obrigatoria = true;
    titulo = titulo.replace(/\s*\*+\s*$/, '');
  }
  if (RE_OBRIGATORIA.test(titulo)) {
    obrigatoria = true;
    titulo = titulo.replace(RE_OBRIGATORIA, '');
  } else if (RE_OPCIONAL.test(titulo)) {
    obrigatoria = false;
    titulo = titulo.replace(RE_OPCIONAL, '');
  }
  // Segmentos entre parênteses: opções («(Sim/Não)») ou indicação de tipo («[escala 1-5]»).
  titulo = titulo.replace(/\s*[([]([^()[\]]{1,80})[)\]]/g, (inteiro, dentro: string) => {
    const lista = dentro.includes('/') ? opcoesEmLinha(dentro) : null;
    if (lista && !opcoes) {
      opcoes = lista;
      return '';
    }
    if (RE_DICA_TIPO.test(dentro)) {
      dicas.push(dentro);
      return '';
    }
    return inteiro;
  });
  // Opções depois do «?»: «Usa ERP? Sim / Não», «Usa ERP? ( ) Sim ( ) Não».
  const q = titulo.lastIndexOf('?');
  if (q > 0 && q < titulo.length - 1 && !opcoes) {
    const lista = opcoesEmLinha(titulo.slice(q + 1).trim());
    if (lista) {
      opcoes = lista;
      titulo = titulo.slice(0, q + 1);
    }
  }
  return { titulo: titulo.trim(), obrigatoria, dicas, opcoes, condicao };
}

// ── Dedução do tipo ─────────────────────────────────────────────────────────

interface Deducao {
  tipo: TipoImportavel;
  razao: string;
  min?: number;
  max?: number;
  inteiro?: boolean;
}

const RE = {
  nps: /\bnps\b|\b0\s*(?:a|-|ate|to)\s*10\b|recomendaria|recomendar|\brecommend/,
  umADez: /\b1\s*(?:a|-|ate|to)\s*10\b/,
  avaliacao: /\b1\s*(?:a|-|ate|to)\s*5\b|estrelas|\bstars?\b|\bescala\b|\bavalie\b|\bclassifique\b|\brate\b|\brating\b|grau de satisfacao/,
  multipla:
    /multipla|varias|todas as que|todas que|selecione todas|marque todas|mais de uma|pode escolher mais|select all|all that apply|check all|multiple/,
  unica: /escolha unica|uma (?:so )?opcao|apenas uma|so uma|single choice|choose one|select one/,
  longo:
    /texto longo|paragrafo|descreva|explique|comente|detalhe|justifique|conte-nos|porque\b|por que|\bdescribe|\bexplain|tell us|\bcomments?\b|observacoes|sugest|outros comentarios/,
  data: /\bdata\b|em que data|\bdate\b|dd\/mm|quando (?:pretende|quer|comecou|foi|e que|deseja|preve)|when (?:do|did|will|would)/,
  numero:
    /quant[oa]s\b|numero de|\bn\.?\s?[ºo°] de|how many|how much|\bidade\b|\bage\b|percentagem|percentage|orcamento|budget|\bmzn\b|meticais|\bkwanza|\beur\b|\busd\b|em anos|em meses/,
  inteiro: /quant[oa]s\b|how many|\bidade\b|\bage\b|numero de|em anos|em meses/,
  maximo: /(?:ate|no maximo|maximo de|max\.?|up to|at most)\s*(\d{1,2})\b/,
};

export function deduzir(titulo: string, ajuda: string, dicas: string[], opcoes: string[]): Deducao {
  const dica = simplificar(dicas.join(' '));
  const tudo = simplificar([titulo, ajuda, ...dicas].join(' '));
  const maximo = RE.maximo.exec(tudo);

  if (opcoes.length >= 2) {
    const numeros = opcoes.map((o) => o.trim());
    if (numeros.join(',') === '1,2,3,4,5') return { tipo: 'avaliacao', razao: 'Opções de 1 a 5.' };
    if (numeros.join(',') === '0,1,2,3,4,5,6,7,8,9,10')
      return { tipo: 'nps', razao: 'Opções de 0 a 10.' };
    if (RE.multipla.test(tudo))
      return {
        tipo: 'escolha_multipla',
        razao: 'Lista de opções e «pode escolher várias».',
        ...(maximo ? { max: Number(maximo[1]) } : {}),
      };
    return { tipo: 'escolha_unica', razao: `Lista de ${opcoes.length} opções; escolhe-se uma.` };
  }

  // Sem opções: primeiro o que foi dito explicitamente entre parênteses.
  for (const [alvo, re] of [
    ['nps', RE.nps],
    ['avaliacao', RE.avaliacao],
    ['texto_longo', RE.longo],
    ['data', RE.data],
    ['numero', RE.numero],
  ] as const) {
    if (dica && re.test(dica)) {
      if (alvo === 'numero')
        return { tipo: 'numero', razao: 'Indicado como número.', inteiro: RE.inteiro.test(tudo) };
      return { tipo: alvo, razao: `Indicado no texto: «${dicas.join(', ')}».` };
    }
  }
  if (RE.nps.test(tudo)) return { tipo: 'nps', razao: 'Fala em recomendar ou numa escala de 0 a 10.' };
  if (RE.umADez.test(tudo))
    return { tipo: 'numero', razao: 'Escala de 1 a 10 (fica como número de 1 a 10).', min: 1, max: 10, inteiro: true };
  if (RE.avaliacao.test(tudo)) return { tipo: 'avaliacao', razao: 'Pede uma classificação de 1 a 5.' };
  if (RE.data.test(tudo)) return { tipo: 'data', razao: 'Pede uma data.' };
  if (RE.numero.test(tudo))
    return { tipo: 'numero', razao: 'Pede uma quantidade.', inteiro: RE.inteiro.test(tudo) };
  if (RE.longo.test(tudo)) return { tipo: 'texto_longo', razao: 'Pede uma resposta descritiva.' };
  return { tipo: 'texto_curto', razao: 'Resposta aberta curta (sem opções nem indicação de tipo).' };
}

// ── A máquina de estados ────────────────────────────────────────────────────

interface PerguntaEmCurso {
  k: 'p';
  marcas: Marcas;
  ajuda: string[];
  opcoes: string[];
}
interface SeccaoEmCurso {
  k: 's';
  titulo: string;
  texto: string[];
}

/**
 * Uma linha «simples»: curta, sem número, sem «?», sem marcas de secção, nota
 * ou instrução. Quando o Word perde as marcas da lista ao colar, as opções
 * chegam assim — uma por linha, sem «a)» nem «•».
 */
function linhaSimples(l: string): boolean {
  return (
    l.length > 0 &&
    l.length <= 80 &&
    l.split(/\s+/).length <= 10 &&
    !/[?:]$/.test(l) &&
    !RE_LEGENDA.test(l) &&
    !RE_MD.test(l) &&
    seccaoPorPalavra(l) === null &&
    numerada(l) === null &&
    nota(l) === null &&
    !ehMaiusculas(l) &&
    !ehPergunta(l) &&
    !RE_IMPERATIVO.test(l) &&
    !RE_COMO_RESPONDER.test(l) &&
    !(RE_AGRADECIMENTO.test(simplificar(l)) && l.split(/\s+/).length <= 5)
  );
}

/** Quantas linhas simples seguidas começam em `i` (as linhas vazias entre elas não contam). */
function corridaSimples(linhas: readonly string[], i: number): { n: number; fim: number } {
  let n = 0;
  let fim = i;
  for (let j = i; j < linhas.length; j += 1) {
    const l = linhas[j]!;
    if (!l) continue;
    if (!linhaSimples(l)) break;
    n += 1;
    fim = j;
  }
  return { n, fim };
}

export function analisarTexto(
  bruto: string,
  opcoes: { readonly cabecalho?: boolean } = {},
): RascunhoImportado {
  /** Numa parte do meio (`partirTexto`), a primeira linha não é o título. */
  const comCabecalho = opcoes.cabecalho ?? true;
  const linhas = limparTexto(bruto)
    .split('\n')
    .map((l) => l.trim());
  const blocos: (PerguntaEmCurso | SeccaoEmCurso)[] = [];
  let titulo: string | undefined;
  const introducao: string[] = [];
  let atual: PerguntaEmCurso | SeccaoEmCurso | null = null;
  /** O número escrito no texto («3», «2.1») → a ordem da pergunta no rascunho. */
  const numeroParaOrdem = new Map<string, number>();
  const condicoesPorNumero = new Map<PerguntaEmCurso, string>();
  let perguntas = 0;

  const novaPergunta = (textoTitulo: string, numero?: string) => {
    const marcas = extrairMarcas(textoTitulo);
    const p: PerguntaEmCurso = { k: 'p', marcas, ajuda: [], opcoes: marcas.opcoes ?? [] };
    perguntas += 1;
    if (numero) numeroParaOrdem.set(numero, perguntas);
    if (marcas.condicao?.numero) condicoesPorNumero.set(p, marcas.condicao.numero);
    blocos.push(p);
    atual = p;
  };
  const novaSeccao = (t: string) => {
    const s: SeccaoEmCurso = { k: 's', titulo: t.replace(/[:.]\s*$/, '').trim(), texto: [] };
    blocos.push(s);
    atual = s;
  };
  const primeiraLinha = () =>
    comCabecalho && titulo === undefined && blocos.length === 0 && introducao.length === 0;

  for (let i = 0; i < linhas.length; i += 1) {
    const l = linhas[i]!;
    if (!l || RE_LEGENDA.test(l)) continue;

    const md = RE_MD.exec(l);
    if (md) {
      if (primeiraLinha()) titulo = md[1]!.trim();
      else novaSeccao(md[1]!.trim());
      continue;
    }
    const porPalavra = seccaoPorPalavra(l);
    if (porPalavra !== null) {
      novaSeccao(porPalavra);
      continue;
    }
    const num = numerada(l);
    if (num) {
      if (ehMaiusculas(num.resto)) novaSeccao(maiuscula(num.resto.toLowerCase()));
      else novaPergunta(num.resto, num.numero);
      continue;
    }
    const n = nota(l);
    const pAtual = atual as PerguntaEmCurso | SeccaoEmCurso | null;
    if (pAtual?.k === 'p') {
      // Escala do Google Forms colada: «1», «2»… numa linha cada, ou «1 2 3 4 5».
      if (/^\d{1,2}(?:\s+\d{1,2})*$/.test(l)) {
        pAtual.opcoes.push(...l.split(/\s+/));
        continue;
      }
      const opcao = RE_OPCAO.exec(l);
      if (opcao && !n) {
        pAtual.opcoes.push(opcao[1]!.trim());
        continue;
      }
    }
    if (n !== null) {
      if (pAtual?.k === 'p') pAtual.ajuda.push(n);
      else if (pAtual?.k === 's') pAtual.texto.push(n);
      else introducao.push(n);
      continue;
    }
    if (ehMaiusculas(l)) {
      if (primeiraLinha()) titulo = maiuscula(l.toLowerCase());
      else novaSeccao(maiuscula(l.toLowerCase()));
      continue;
    }
    if (ehPergunta(l)) {
      novaPergunta(l);
      continue;
    }
    if (primeiraLinha()) {
      titulo = l;
      continue;
    }
    // «Obrigado», «Agradecimento» sozinhos abrem o ecrã final.
    if (RE_AGRADECIMENTO.test(simplificar(l)) && l.split(/\s+/).length <= 5) {
      novaSeccao(l);
      continue;
    }
    if (pAtual?.k === 'p') {
      // Duas ou mais linhas simples seguidas depois da pergunta são as suas
      // opções (lista do Word sem as marcas). Uma só continua a ser subtítulo.
      if (pAtual.opcoes.length === 0) {
        const corrida = corridaSimples(linhas, i);
        if (corrida.n >= 2) {
          for (let j = i; j <= corrida.fim; j += 1) if (linhas[j]) pAtual.opcoes.push(linhas[j]!);
          i = corrida.fim;
          continue;
        }
      }
      const emLinha = pAtual.opcoes.length === 0 ? opcoesEmLinha(l) : null;
      const jaTemCorpo = pAtual.opcoes.length > 0 || pAtual.ajuda.length > 0;
      if (emLinha) {
        pAtual.opcoes.push(...emLinha);
      } else if (RE_COMO_RESPONDER.test(l) && !jaTemCorpo) {
        // «Escolha uma opção», «Selecione todas as que se aplicam»: instrução da pergunta.
        pAtual.ajuda.push(l);
      } else if (RE_IMPERATIVO.test(l)) {
        novaPergunta(l);
      } else if (jaTemCorpo && l.length <= 200 && (/[:.]$/.test(l) || l.split(/\s+/).length <= 8)) {
        // Depois do subtítulo ou das opções, uma linha curta («Email», «Cargo:») é a pergunta seguinte.
        novaPergunta(l.replace(/:\s*$/, ''));
      } else {
        pAtual.ajuda.push(l);
      }
      continue;
    }
    if (pAtual?.k === 's') {
      if (RE_IMPERATIVO.test(l)) novaPergunta(l);
      else pAtual.texto.push(l);
      continue;
    }
    introducao.push(l);
  }

  // Uma última secção «Obrigado…» sem perguntas depois é o ecrã de agradecimento.
  let agradecimento: string | undefined;
  const ultimo = blocos.at(-1);
  if (ultimo?.k === 's' && RE_AGRADECIMENTO.test(simplificar(ultimo.titulo))) {
    blocos.pop();
    agradecimento = ultimo.texto.join('\n') || ultimo.titulo;
  }

  let ordem = 0;
  let ultimaComOpcoes: number | undefined;
  const saida: BlocoImportado[] = blocos.map((b) => {
    if (b.k === 's') {
      const texto = b.texto.join('\n');
      return { bloco: 'seccao', titulo: b.titulo || '—', ...(texto ? { texto } : {}) };
    }
    ordem += 1;
    const ajuda = b.ajuda.join('\n');
    const d = deduzir(b.marcas.titulo, ajuda, b.marcas.dicas, b.opcoes);
    let condicao: { pergunta: number; valor: string } | undefined;
    if (b.marcas.condicao) {
      const porNumero = condicoesPorNumero.get(b);
      const alvo = porNumero ? numeroParaOrdem.get(porNumero) : ultimaComOpcoes;
      if (alvo && alvo < ordem) condicao = { pergunta: alvo, valor: b.marcas.condicao.valor };
    }
    if (b.opcoes.length >= 2 || d.tipo === 'avaliacao' || d.tipo === 'nps') ultimaComOpcoes = ordem;
    return {
      bloco: 'pergunta',
      titulo: b.marcas.titulo || '—',
      ...(ajuda ? { ajuda } : {}),
      tipo: d.tipo,
      ...(b.marcas.obrigatoria !== undefined ? { obrigatoria: b.marcas.obrigatoria } : {}),
      ...(b.opcoes.length > 0 ? { opcoes: b.opcoes } : {}),
      ...(d.min !== undefined ? { min: d.min } : {}),
      ...(d.max !== undefined ? { max: d.max } : {}),
      ...(d.inteiro !== undefined ? { inteiro: d.inteiro } : {}),
      ...(condicao ? { condicao } : {}),
      razao: d.razao,
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

// ── Partir um texto longo em partes ─────────────────────────────────────────

/** «Se sim, …», «(Só se respondeu…)»: fica na mesma parte da pergunta anterior. */
const RE_CONDICIONAL = /^\(?\s*(?:s[oó]\s+)?(?:se|caso|if)\b/iu;

type InicioDeBloco = 'seccao' | 'pergunta' | null;

function inicioDeBloco(l: string): InicioDeBloco {
  if (!l || RE_LEGENDA.test(l)) return null;
  if (RE_MD.test(l) || seccaoPorPalavra(l) !== null) return 'seccao';
  const num = numerada(l);
  if (num) return ehMaiusculas(num.resto) ? 'seccao' : 'pergunta';
  if (ehMaiusculas(l)) return 'seccao';
  if (RE_AGRADECIMENTO.test(simplificar(l)) && l.split(/\s+/).length <= 5) return 'seccao';
  if (ehPergunta(l)) return 'pergunta';
  return null;
}

/**
 * Parte um inquérito longo em pedaços de até `max` caracteres, para o Kimi os
 * estruturar em paralelo. Corta só no início de um bloco (secção ou pergunta),
 * por isso uma pergunta nunca fica separada das suas opções e notas; prefere
 * cortar numa secção; e uma pergunta condicional («Se sim, …») fica com a
 * anterior. O cabeçalho fica na primeira parte e o «Obrigado» na última.
 * Juntar as partes com «\n» devolve todas as linhas não vazias, pela ordem.
 */
export function partirTexto(bruto: string, opcoes: { readonly max?: number } = {}): string[] {
  const max = opcoes.max ?? 3_000;
  const linhas = limparTexto(bruto)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Unidades: do início de um bloco até ao seguinte (o cabeçalho cola-se à primeira).
  const unidades: { tipo: InicioDeBloco; linhas: string[]; tamanho: number }[] = [];
  for (const l of linhas) {
    const tipo = inicioDeBloco(l);
    const ultima = unidades.at(-1);
    if (tipo === null && ultima) {
      ultima.linhas.push(l);
      ultima.tamanho += l.length + 1;
    } else {
      unidades.push({ tipo, linhas: [l], tamanho: l.length + 1 });
    }
  }

  const partes: string[][] = [];
  let atual: string[] = [];
  let tamanho = 0;
  for (const u of unidades) {
    const condicional = u.tipo === 'pergunta' && RE_CONDICIONAL.test(u.linhas[0]!);
    const passa = tamanho + u.tamanho > max;
    const cortarNaSeccao = u.tipo === 'seccao' && tamanho >= max / 2;
    if (atual.length > 0 && u.tipo !== null && !condicional && (passa || cortarNaSeccao)) {
      partes.push(atual);
      atual = [];
      tamanho = 0;
    }
    atual.push(...u.linhas);
    tamanho += u.tamanho;
  }
  if (atual.length > 0) partes.push(atual);
  return partes.map((p) => p.join('\n'));
}
