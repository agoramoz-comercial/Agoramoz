import {
  LIMITES,
  propostaVazia,
  totais,
  valor as formatarValor,
  type Fase,
  type Linha,
  type Moeda,
  type Opcao,
  type Proposta,
  type Risco,
} from './modelo';

/**
 * Do texto colado à proposta: o leitor que alimenta o desenho editorial.
 *
 * **Sem IA, de propósito.** Um modelo que «arruma» uma proposta também a
 * reescreve — e a regra do estilo editorial é preservar o conteúdo factual
 * sem inventar nada. Aqui cada palavra que chega às folhas veio do texto
 * colado: o leitor só decide EM QUE SECÇÃO ela fica.
 *
 * O que reconhece:
 * - **títulos de secção** pelo nome («Contexto», «Objectivos», «Solução»,
 *   «Cronograma», «Investimento», «Opções», «Condições comerciais», «Riscos»,
 *   «Próximos passos»… e as variantes de `SECCOES`), com ou sem numeração,
 *   `#` de Markdown ou negrito;
 * - **dados da capa** em linhas `Campo: valor` antes da primeira secção
 *   («Cliente:», «Projecto:», «Data:», «Validade:»…);
 * - **listas** (`-`, `•`, `1.`, `a)`) e **tabelas** (Markdown com `|`, ou
 *   colunas separadas por tabulação, como vêm do Word e do Excel);
 * - **semanas e valores** nas linhas das fases e das opções («2–3 semanas»,
 *   «285 000 MZN», «1,2 milhões de meticais»).
 *
 * O que nunca faz em silêncio: tudo o que fica de fora, é cortado ou é
 * convertido vai para o relatório. E se o texto escrever um total que não
 * bate com a soma das fases, diz — a proposta usa sempre a soma.
 */

export interface Relatorio {
  /** O que foi reconhecido, por secção («Fases: 3»). */
  readonly reconhecidas: readonly string[];
  /** Cortes, conversões e contas que não batem. */
  readonly avisos: readonly string[];
  /** Texto que não tem lugar no modelo: fica listado para a pessoa decidir. */
  readonly naoReconhecido: readonly { readonly titulo: string; readonly texto: string }[];
}

export interface Leitura {
  readonly proposta: Proposta;
  readonly relatorio: Relatorio;
}

/** Um documento colado maior do que isto não é uma proposta: é um anexo. */
export const MAX_TEXTO_COLADO = 60_000;

/* ------------------------------------------------------------------ texto */

/** Minúsculas, sem acentos, sem pontuação nas pontas: para comparar títulos. */
export function chave(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Tira a numeração e as marcas de um título: «## 3. Contexto:» → «Contexto». */
function limparTitulo(linha: string): string {
  return linha
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*\*\*(.+)\*\*\s*$/, '$1')
    .replace(/^\s*(?:\[\d{1,2}\]|\d{1,2}(?:\.\d{1,2})*[.)]?|[IVX]{1,4}[.)])\s*[—–-]?\s*/, '')
    .replace(/[:.]\s*$/, '')
    .trim();
}

/** Corta no limite, numa fronteira de palavra, e devolve o que ficou de fora. */
function cortar(t: string, max: number): { texto: string; aMais: number } {
  const limpo = t.replace(/\s+/g, ' ').trim();
  if (limpo.length <= max) return { texto: limpo, aMais: 0 };
  const corte = limpo.slice(0, max - 1);
  const espaco = corte.lastIndexOf(' ');
  const texto = `${(espaco > max * 0.6 ? corte.slice(0, espaco) : corte).replace(/[\s,;:.—–-]+$/, '')}…`;
  return { texto, aMais: limpo.length - texto.length + 1 };
}

/* ----------------------------------------------------------------- secções */

type Tipo =
  | 'capa'
  | 'carta'
  | 'decisao'
  | 'contexto'
  | 'objectivos'
  | 'solucao'
  | 'fases'
  | 'opcoes'
  | 'condicoes'
  | 'riscos'
  | 'passos'
  | 'contactos';

/** Os nomes de secção que o leitor conhece. A comparação é sem acentos nem maiúsculas. */
export const SECCOES: Readonly<Record<Tipo, readonly string[]>> = {
  capa: ['capa', 'dados da proposta', 'identificacao', 'ficha da proposta'],
  carta: [
    'carta',
    'carta de apresentacao',
    'apresentacao',
    'introducao',
    'sumario executivo',
    'resumo executivo',
    'mensagem',
    'nota introdutoria',
  ],
  decisao: ['decisao recomendada', 'recomendacao', 'decisao', 'o que pedimos', 'decisao pedida'],
  contexto: [
    'contexto',
    'enquadramento',
    'situacao',
    'situacao actual',
    'situacao atual',
    'desafio',
    'desafios',
    'problema',
    'necessidade',
    'necessidades',
    'antecedentes',
    'diagnostico',
    'contexto e desafio',
    'ponto de partida',
  ],
  objectivos: ['objectivos', 'objetivos', 'objectivo', 'objetivo', 'metas', 'resultados esperados', 'beneficios', 'o que vamos alcancar'],
  solucao: [
    'solucao',
    'solucao proposta',
    'proposta de solucao',
    'abordagem',
    'metodologia',
    'ambito',
    'escopo',
    'servicos',
    'modulos',
    'o que propomos',
    'entregaveis',
    'componentes',
    'arquitectura',
    'arquitetura',
  ],
  fases: [
    'fases',
    'plano',
    'plano de trabalho',
    'plano de implementacao',
    'cronograma',
    'calendario',
    'etapas',
    'investimento',
    'orcamento',
    'precos',
    'preco',
    'proposta financeira',
    'proposta economica',
    'honorarios',
    'valores',
    'custos',
    'investimento e prazos',
    'prazos',
  ],
  opcoes: ['opcoes', 'alternativas', 'pacotes', 'planos', 'modalidades', 'cenarios', 'opcoes de investimento'],
  condicoes: [
    'condicoes comerciais',
    'condicoes',
    'termos',
    'termos e condicoes',
    'pagamento',
    'forma de pagamento',
    'condicoes de pagamento',
    'pressupostos',
    'exclusoes',
    'validade e condicoes',
  ],
  riscos: ['riscos', 'riscos e mitigacao', 'riscos e mitigacoes', 'mitigacao', 'gestao de riscos'],
  passos: ['proximos passos', 'passos seguintes', 'proximas etapas', 'como avancar', 'para avancar'],
  contactos: ['contactos', 'contatos', 'contacto', 'contato'],
};

const NOMES: Readonly<Record<Tipo, string>> = {
  capa: 'Capa',
  carta: 'Carta',
  decisao: 'Decisão recomendada',
  contexto: 'Contexto',
  objectivos: 'Objectivos',
  solucao: 'Solução',
  fases: 'Fases e investimento',
  opcoes: 'Opções',
  condicoes: 'Condições comerciais',
  riscos: 'Riscos',
  passos: 'Próximos passos',
  contactos: 'Contactos',
};

/** O tipo de secção de um título, ou `null` se não for conhecido. Igual primeiro; depois o começo mais longo. */
export function tipoDoTitulo(titulo: string): Tipo | null {
  const k = chave(limparTitulo(titulo));
  if (!k) return null;
  const entradas = Object.entries(SECCOES) as [Tipo, readonly string[]][];
  for (const [tipo, nomes] of entradas) if (nomes.includes(k)) return tipo;
  let melhor: { tipo: Tipo; n: number } | null = null;
  for (const [tipo, nomes] of entradas)
    for (const n of nomes) {
      // «Contexto e desafio do cliente» conta; «Diagnóstico — 2 a 3 semanas — 285 000 MZN» não (é uma linha de fase).
      const resto = k.slice(n.length).trim();
      if (k.startsWith(`${n} `) && !/\d/.test(resto) && resto.split(' ').length <= 4 && (!melhor || n.length > melhor.n))
        melhor = { tipo, n: n.length };
    }
  return melhor?.tipo ?? null;
}

/** Parece um título? Curto, sem ponto final, e marcado (#, negrito, maiúsculas) ou com nome conhecido. */
function eTitulo(linha: string): boolean {
  const t = linha.trim();
  if (!t || t.length > 80 || /^[-*•·]\s/.test(t) || t.includes('|') || t.includes('\t')) return false;
  if (/^#{1,6}\s+\S/.test(t)) return true;
  if (/^\*\*[^*]+\*\*:?$/.test(t)) return true;
  const limpo = limparTitulo(t);
  if (!limpo || (/[.!?]$/.test(t) && !/:$/.test(t))) return false;
  // Um número ou um separador com texto depois é conteúdo («Diagnóstico — 2 semanas»), não um título.
  if (/\d/.test(limpo) || /\s[—–-]\s+\S/.test(limpo)) return false;
  if (tipoDoTitulo(t)) return !/:\s*\S/.test(t); // «Pagamento: 50% na adjudicação» é conteúdo, não título
  return limpo.length >= 3 && limpo.length <= 60 && limpo === limpo.toUpperCase() && /[A-ZÀ-Ý]{3}/.test(limpo);
}

/**
 * Um título sem marcas, como chega do Word: linha curta, isolada por cima,
 * com texto por baixo, sem pontuação final nem números. Uma saudação
 * («Exmos. Senhores») não é título.
 */
function tituloSolto(linhas: readonly string[], i: number): boolean {
  const t = linhas[i]!.trim();
  const antes = i === 0 ? '' : linhas[i - 1]!.trim();
  const depois = linhas[i + 1]?.trim() ?? '';
  if (!t || antes || !depois) return false;
  if (t.length > 50 || t.split(/\s+/).length > 6 || /[\d.,;:!?|\t]/.test(t) || MARCA_LISTA.test(t)) return false;
  if (/^(exm[oa]s?|car[oa]s?|prezad|estimad|ilustr|ol[aá]|bom dia|boa tarde)/i.test(t)) return false;
  return /^[A-ZÀ-Ý]/.test(t);
}

/* ------------------------------------------------------------ blocos e itens */

interface Seccao {
  readonly titulo: string;
  readonly tipo: Tipo | null;
  readonly linhas: string[];
}

type Bloco = { readonly k: 'item'; readonly texto: string } | { readonly k: 'tabela'; readonly linhas: string[][] };

const MARCA_LISTA = /^\s*(?:[-*•·–—]|\d{1,2}[.)]|[a-z][.)]|\(\w\))\s+/i;

/** Os itens de uma secção: cada elemento de lista, cada parágrafo, cada tabela. */
function blocos(linhas: readonly string[]): Bloco[] {
  const saida: Bloco[] = [];
  let paragrafo: string[] = [];
  let tabela: string[][] = [];
  const fecharParagrafo = () => {
    if (paragrafo.length) saida.push({ k: 'item', texto: paragrafo.join(' ') });
    paragrafo = [];
  };
  const fecharTabela = () => {
    if (tabela.length) saida.push({ k: 'tabela', linhas: tabela });
    tabela = [];
  };
  for (const bruta of linhas) {
    const l = bruta.replace(/\s+$/, '');
    const ehTabela = (l.includes('|') && l.split('|').length >= 3) || l.split('\t').filter((c) => c.trim()).length >= 2;
    if (ehTabela) {
      fecharParagrafo();
      const celulas = (
        l.includes('|')
          ? l
              .replace(/^\s*\|/, '')
              .replace(/\|\s*$/, '')
              .split('|')
          : l.split('\t')
      ).map((c) => c.trim());
      if (celulas.every((c) => /^:?-{2,}:?$/.test(c) || c === '')) continue; // separador de Markdown
      tabela.push(celulas);
      continue;
    }
    fecharTabela();
    if (!l.trim()) {
      fecharParagrafo();
      continue;
    }
    if (MARCA_LISTA.test(l)) {
      fecharParagrafo();
      paragrafo = [l.replace(MARCA_LISTA, '').trim()];
      continue;
    }
    // Do Word e do Google Docs, cada parágrafo chega numa linha. Só se junta à
    // anterior uma linha que continua a frase (a anterior não acabou e esta
    // começa em minúscula) — o texto partido a meio, como no Markdown.
    const anterior = paragrafo[paragrafo.length - 1];
    const continua = anterior !== undefined && !/[.!?:;]$/.test(anterior) && /^[a-zà-ý(]/.test(l.trim());
    if (!continua) fecharParagrafo();
    paragrafo.push(l.trim().replace(/^\*\*(.+?)\*\*/, '$1'));
  }
  fecharParagrafo();
  fecharTabela();
  const limparItem = (t: string) =>
    t
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  return saida
    .map((b): Bloco => (b.k === 'item' ? { k: 'item', texto: limparItem(b.texto) } : b))
    .filter((b) => b.k === 'tabela' || b.texto !== '');
}

/** «Título: texto», «Título — texto», ou só texto. */
function dividir(item: string): { titulo: string; texto: string } {
  const m = /^(.{2,80}?)\s*(?::|\s[—–]\s|\s-\s)\s*(.+)$/.exec(item);
  if (m && !/\d$/.test(m[1]!)) return { titulo: m[1]!.trim(), texto: m[2]!.trim() };
  // Sem separador: a primeira frase curta faz de título; nunca se inventa um.
  const frase = /^(.{3,110}?[.!?])\s+(.+)$/.exec(item);
  if (frase) return { titulo: frase[1]!.replace(/[.!?]$/, ''), texto: frase[2]! };
  return item.length <= LIMITES.textoCurto ? { titulo: item, texto: '' } : { titulo: '', texto: item };
}

/* ------------------------------------------------------- números e moedas */

const MOEDA = /(MZN|MTn|MT|Mt|meticais|metical|USD|US\$|d[oó]lares|EUR|€|euros?)/;
const VALOR = new RegExp(
  `(?:${MOEDA.source}\\s*)?((?:\\d{1,3}(?:[ .\\u00A0\\u202F]\\d{3})+|\\d+)(?:,\\d{1,2})?)\\s*(milh(?:[õo]es|[ãa]o)|mil)?\\s*(?:de\\s+)?${MOEDA.source}?`,
  'iu',
);

function moedaDe(t: string | undefined): Moeda | null {
  if (!t) return null;
  const k = t.toLowerCase();
  if (/^(mzn|mtn|mt|meticais|metical)$/.test(k)) return 'MZN';
  if (/^(usd|us\$|d[oó]lares)$/.test(k)) return 'USD';
  if (/^(eur|€|euros?)$/.test(k)) return 'EUR';
  return null;
}

interface Montante {
  readonly valor: number;
  readonly moeda: Moeda | null;
  readonly trecho: string;
}

/** O primeiro valor monetário de um texto: com moeda, ou com «mil/milhões». Um número solto não é dinheiro. */
export function montanteEm(t: string): Montante | null {
  const re = new RegExp(VALOR.source, 'giu');
  for (const m of t.matchAll(re)) {
    const moeda = moedaDe(m[1]) ?? moedaDe(m[4]);
    const escala = m[3] ? (/^mil$/i.test(m[3]) ? 1_000 : 1_000_000) : 1;
    if (!moeda && escala === 1) continue;
    const n = Number(m[2]!.replace(/[ .\u00A0\u202F]/g, '').replace(',', '.')) * escala;
    if (Number.isFinite(n)) return { valor: Math.round(n * 100) / 100, moeda, trecho: m[0] };
  }
  return null;
}

interface Duracao {
  readonly min: number;
  readonly max: number;
  readonly trecho: string;
  readonly convertida?: string;
}

/** «2–3 semanas», «2 a 3 semanas», «3 semanas», «1 mês» (4 semanas), «10 dias úteis» (2 semanas). */
export function duracaoEm(t: string): Duracao | null {
  const m = /(\d{1,3})(?:\s*(?:[–—-]|a|até)\s*(\d{1,3}))?\s*(semanas?|meses|m[eê]s|dias(?:\s+[uú]teis)?)\b/iu.exec(t);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  const unidade = m[3]!.toLowerCase();
  const intervalo = (x: number, y: number) => (x === y ? `${x}` : `${x}–${y}`);
  if (unidade.startsWith('seman')) return { min: Math.min(a, b), max: Math.max(a, b), trecho: m[0] };
  if (unidade.startsWith('m'))
    return {
      min: Math.min(a, b) * 4,
      max: Math.max(a, b) * 4,
      trecho: m[0],
      convertida: `${m[0]} → ${intervalo(Math.min(a, b) * 4, Math.max(a, b) * 4)} semanas (1 mês = 4 semanas)`,
    };
  const util = /[uú]teis/.test(unidade) ? 5 : 7;
  const sem = (d: number) => Math.max(1, Math.ceil(d / util));
  return {
    min: sem(Math.min(a, b)),
    max: sem(Math.max(a, b)),
    trecho: m[0],
    convertida: `${m[0]} → ${intervalo(sem(Math.min(a, b)), sem(Math.max(a, b)))} semanas (${util} dias = 1 semana)`,
  };
}

/** Tira de uma frase os trechos já lidos (duração, valor) e a pontuação que sobra. */
function semTrechos(t: string, ...trechos: (string | undefined)[]): string {
  let s = t;
  for (const x of trechos) if (x) s = s.replace(x, ' ');
  return s
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:—–-]+|[\s,;:—–-]+$/g, '')
    .trim();
}

/* ------------------------------------------------------------------ leitor */

const META: readonly [RegExp, keyof Proposta | 'validade' | 'moeda'][] = [
  [/^(?:cliente|preparada para|preparado para|entidade|empresa)$/, 'cliente'],
  [/^(?:projecto|projeto|nome do projecto|nome do projeto)$/, 'projeto'],
  [/^(?:titulo|título)$/, 'titulo'],
  [/^(?:para|destinatario|destinatária|a atencao de|a atenção de|att|ao cuidado de)$/, 'destinatario'],
  [/^(?:assunto|ref|referencia)$/, 'assunto'],
  [/^(?:preparada por|preparado por|de|autor|elaborada por)$/, 'preparadaPor'],
  [/^(?:data)$/, 'data'],
  [/^(?:validade|valida por|válida por|valida ate|válida até)$/, 'validade'],
  [/^(?:moeda)$/, 'moeda'],
];

const MESES: Readonly<Record<string, number>> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

/** «12/11/2026», «2026-11-12», «12 de Novembro de 2026» → AAAA-MM-DD. */
export function dataEm(t: string): string | null {
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(t);
  const dmy = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(t);
  const ext = /(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/.exec(
    t
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase(),
  );
  let y: number, m: number, d: number;
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (dmy) [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  else if (ext && MESES[ext[2]!]) [d, m, y] = [Number(ext[1]), MESES[ext[2]!]!, Number(ext[3])];
  else return null;
  const data = new Date(Date.UTC(y, m - 1, d));
  if (data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) return null;
  return data.toISOString().slice(0, 10);
}

/** «Opção A —», «Pacote 2:», «Alternativa B.», «A)». */
const PREFIXO_OPCAO = /^(?:(?:op[cç][aã]o|alternativa|pacote|plano|cen[aá]rio|modalidade)\s*[A-Z0-9]?\s*[:—–.)-]?\s*|[A-C]\)\s*)/i;

const FECHO_CARTA = /^(com os (melhores )?cumprimentos|melhores cumprimentos|atenciosamente|cordialmente|com estima|subscrevemo-nos)/i;

export function lerTexto(colado: string, hoje: string): Leitura {
  const p: Proposta = structuredClone(propostaVazia(hoje));
  const reconhecidas: string[] = [];
  const avisos: string[] = [];
  const naoReconhecido: { titulo: string; texto: string }[] = [];

  let texto = colado
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ');
  if (texto.length > MAX_TEXTO_COLADO) {
    avisos.push(`O texto tinha ${texto.length} caracteres; só os primeiros ${MAX_TEXTO_COLADO} foram lidos.`);
    texto = texto.slice(0, MAX_TEXTO_COLADO);
  }

  // 1. Partir em secções pelos títulos. O que vem antes do primeiro é o preâmbulo.
  const seccoes: Seccao[] = [{ titulo: '', tipo: null, linhas: [] }];
  const linhas = texto.split('\n');
  linhas.forEach((linha, i) => {
    const titulo = limparTitulo(linha);
    // «# Proposta: Dashboard» antes de qualquer secção é o título do documento, não uma secção.
    if (seccoes.length === 1 && /^proposta\b/i.test(titulo) && (eTitulo(linha) || tituloSolto(linhas, i))) {
      seccoes[0]!.linhas.push(titulo);
      return;
    }
    if (eTitulo(linha) || tituloSolto(linhas, i)) seccoes.push({ titulo, tipo: tipoDoTitulo(linha), linhas: [] });
    else seccoes[seccoes.length - 1]!.linhas.push(linha);
  });

  // 2. O preâmbulo: dados da capa em «Campo: valor», o título, e o resto (que vai para a carta se não houver carta).
  const preambulo = seccoes[0]!;
  const sobra: string[] = [];
  let validadeVista = false;
  const lerMeta = (linhas: readonly string[], resto: string[]) => {
    for (const l of linhas) {
      const m = /^\s*(?:\*\*)?([^:*]{2,40}?)(?:\*\*)?\s*:\s*(.+)$/.exec(l);
      const campo = m ? META.find(([re]) => re.test(chave(m[1]!)))?.[1] : undefined;
      if (!m || !campo) {
        resto.push(l);
        continue;
      }
      const v = m[2]!.replace(/\*\*/g, '').trim();
      if (campo === 'data') {
        const d = dataEm(v);
        if (d) p.data = d;
        else avisos.push(`Data não reconhecida («${v}»): ficou a de hoje.`);
      } else if (campo === 'validade') {
        const dias = /(\d{1,3})\s*dias/i.exec(v);
        if (dias) {
          p.validadeDias = Math.min(365, Math.max(1, Number(dias[1])));
          validadeVista = true;
        } else avisos.push(`Validade não reconhecida («${v}»): ficaram ${p.validadeDias} dias.`);
      } else if (campo === 'moeda') {
        const md = moedaDe(v.split(/\s/)[0]);
        if (md) p.moeda = md;
      } else {
        const c = cortar(v, LIMITES.textoCurto);
        if (c.aMais) avisos.push(`Capa, «${m[1]}»: cortado (${c.aMais} caracteres a mais).`);
        (p as Record<string, unknown>)[campo] = c.texto;
      }
    }
  };
  lerMeta(preambulo.linhas, sobra);

  // O título: a linha «Proposta…» do preâmbulo, ou a primeira linha curta. Um
  // cabeçalho de página vindo de um PDF («Confidencial», o nome da empresa)
  // fica antes dela — por isso procura-se primeiro a que diz «Proposta».
  const comProposta = sobra.findIndex((l) => /^proposta\b/i.test(limparTitulo(l.replace(/^\s*#{1,6}\s*/, ''))));
  const primeira = comProposta >= 0 ? comProposta : sobra.findIndex((l) => l.trim());
  if (primeira >= 0 && !p.titulo) {
    const l = limparTitulo(sobra[primeira]!.replace(/^\s*#{1,6}\s*/, ''));
    if (l.length <= 90 && !/[.!?]$/.test(l)) {
      const semRotulo = l
        .replace(/^proposta(?:\s+(?:comercial|t[eé]cnica|t[eé]cnico-comercial|de servi[cç]os))?\s*(?:[:—–-]|\bde\b|\bpara\b)?\s*/i, '')
        .trim();
      if (semRotulo) {
        p.titulo = cortar(semRotulo, LIMITES.textoCurto).texto;
        sobra.splice(primeira, 1);
      }
    }
  }
  if (!p.projeto && p.titulo) p.projeto = p.titulo;
  if (p.cliente || p.projeto || p.titulo) reconhecidas.push('Capa');

  // 3. As secções com nome.
  const contagem = new Map<Tipo, number>();
  const conta = (t: Tipo, n = 1) => contagem.set(t, (contagem.get(t) ?? 0) + n);
  let totalEscrito: Montante | null = null;
  const moedasVistas = new Set<Moeda>();

  const guardarLinha = (onde: 'contexto' | 'solucao', item: { titulo: string; texto: string }, rotulo: string) => {
    const lista = p[onde] as Linha[];
    if (lista.length >= LIMITES[onde]) {
      naoReconhecido.push({ titulo: `${rotulo} (acima de ${LIMITES[onde]})`, texto: [item.titulo, item.texto].filter(Boolean).join(': ') });
      return;
    }
    const t = cortar(item.titulo, LIMITES.textoCurto);
    const x = cortar(item.texto, LIMITES.textoMedio);
    if (t.aMais || x.aMais) avisos.push(`${rotulo}, ponto ${lista.length + 1}: texto cortado (${t.aMais + x.aMais} caracteres a mais).`);
    lista.push({ titulo: t.texto, texto: x.texto });
    conta(onde);
  };

  const guardarFrase = (onde: 'objectivos' | 'condicoes' | 'passos', frase: string, rotulo: string) => {
    const lista = p[onde] as string[];
    if (lista.length >= LIMITES[onde]) {
      naoReconhecido.push({ titulo: `${rotulo} (acima de ${LIMITES[onde]})`, texto: frase });
      return;
    }
    const c = cortar(frase, LIMITES.textoMedio);
    if (c.aMais) avisos.push(`${rotulo}, item ${lista.length + 1}: cortado (${c.aMais} caracteres a mais).`);
    lista.push(c.texto);
    conta(onde);
  };

  const guardarFase = (f: { nome: string; entregaveis: string; duracao: Duracao | null; montante: Montante | null }) => {
    if (f.montante?.moeda) moedasVistas.add(f.montante.moeda);
    if (f.duracao?.convertida) avisos.push(`Fase «${f.nome}»: ${f.duracao.convertida}.`);
    // A mesma fase pode vir no cronograma (semanas) e no investimento (valor): junta-se pelo nome.
    const existente = p.fases.find((x) => chave(x.nome) === chave(f.nome));
    if (existente) {
      if (f.duracao) Object.assign(existente, { semanasMin: f.duracao.min, semanasMax: f.duracao.max });
      if (f.montante) existente.valor = f.montante.valor;
      if (f.entregaveis && !existente.entregaveis) existente.entregaveis = cortar(f.entregaveis, LIMITES.textoMedio).texto;
      return;
    }
    if (p.fases.length >= LIMITES.fases) {
      naoReconhecido.push({ titulo: `Fase (acima de ${LIMITES.fases})`, texto: [f.nome, f.entregaveis].filter(Boolean).join(': ') });
      return;
    }
    const nome = cortar(f.nome, LIMITES.textoCurto);
    const ent = cortar(f.entregaveis, LIMITES.textoMedio);
    if (nome.aMais || ent.aMais) avisos.push(`Fase ${p.fases.length + 1}: texto cortado (${nome.aMais + ent.aMais} caracteres a mais).`);
    const fase: Fase = {
      nome: nome.texto,
      entregaveis: ent.texto,
      semanasMin: f.duracao?.min ?? 0,
      semanasMax: f.duracao?.max ?? 0,
      valor: f.montante?.valor ?? 0,
      custo: null,
    };
    p.fases.push(fase);
    conta('fases');
  };

  /** Uma linha de fase escrita em texto: «Fase 1 — Diagnóstico: levantamento (2–3 semanas) — 285 000 MZN». */
  const faseDeTexto = (item: string) => {
    if (/^total\b/i.test(chave(item))) {
      totalEscrito = montanteEm(item) ?? totalEscrito;
      return;
    }
    const duracao = duracaoEm(item);
    const montante = montanteEm(item);
    if (!duracao && !montante) {
      // Uma frase sem semanas nem valor, no meio do investimento, é uma condição («Valores sem IVA»).
      guardarFrase('condicoes', item, 'Condições comerciais');
      return;
    }
    const resto = semTrechos(item, duracao?.trecho, montante?.trecho).replace(/^(?:fase|etapa)\s*\d{1,2}\s*[:—–.-]?\s*/i, '');
    const { titulo, texto } = dividir(resto);
    guardarFase({ nome: titulo || texto, entregaveis: titulo ? texto : '', duracao, montante });
  };

  /**
   * A primeira linha é cabeçalho se tiver letras e nenhum valor nem duração;
   * senão a tabela não tem cabeçalho e todas as linhas são dados.
   */
  const partirTabela = (linhas: readonly string[][]): [readonly string[], readonly string[][]] => {
    const [primeira, ...resto] = linhas;
    const eCabecalho = !!primeira && primeira.some((c) => /[a-zà-ý]/i.test(c)) && !primeira.some((c) => montanteEm(c) || duracaoEm(c));
    return eCabecalho ? [primeira, resto] : [[], linhas];
  };

  /** Colunas de uma tabela pelo cabeçalho. */
  const colunas = (cabecalho: readonly string[], mapa: Record<string, RegExp>) => {
    const r: Record<string, number> = {};
    cabecalho.forEach((c, i) => {
      const k = chave(c);
      for (const [nome, re] of Object.entries(mapa)) if (r[nome] === undefined && re.test(k)) r[nome] = i;
    });
    return r;
  };

  for (const s of seccoes.slice(1)) {
    const bs = blocos(s.linhas);
    const rotulo = s.tipo ? NOMES[s.tipo] : s.titulo;
    if (!s.tipo) {
      const texto = bs.map((b) => (b.k === 'item' ? b.texto : b.linhas.map((l) => l.join(' · ')).join('\n'))).join('\n');
      if (texto.trim()) naoReconhecido.push({ titulo: s.titulo, texto });
      continue;
    }
    if (!reconhecidas.includes(NOMES[s.tipo])) reconhecidas.push(NOMES[s.tipo]);

    switch (s.tipo) {
      case 'capa': {
        const resto: string[] = [];
        lerMeta(s.linhas, resto);
        if (resto.some((l) => l.trim())) naoReconhecido.push({ titulo: s.titulo, texto: resto.join('\n').trim() });
        break;
      }
      case 'carta': {
        const paras: string[] = [];
        for (const b of bs) {
          if (b.k !== 'item') continue;
          if (FECHO_CARTA.test(b.texto)) {
            avisos.push(
              'Carta: o fecho e a assinatura do texto foram trocados pelos do modelo («Com os melhores cumprimentos» + «Preparada por»).',
            );
            break;
          }
          paras.push(b.texto);
        }
        const junto = [p.carta, ...paras].filter(Boolean).join('\n\n');
        const c = junto.length > LIMITES.carta ? cortar(junto, LIMITES.carta) : { texto: junto, aMais: 0 };
        if (c.aMais) avisos.push(`Carta: cortada (${c.aMais} caracteres a mais). Encurte-a ou passe parte para o contexto.`);
        p.carta = junto.length > LIMITES.carta ? c.texto : junto;
        break;
      }
      case 'decisao': {
        const t = bs
          .map((b) => (b.k === 'item' ? b.texto : ''))
          .join(' ')
          .trim();
        const c = cortar(t, LIMITES.textoMedio);
        if (c.aMais) avisos.push(`Decisão recomendada: cortada (${c.aMais} caracteres a mais).`);
        p.decisao = c.texto;
        break;
      }
      case 'contexto':
      case 'solucao': {
        for (const b of bs) {
          if (b.k === 'item') guardarLinha(s.tipo, dividir(b.texto), rotulo);
          else
            for (const l of partirTabela(b.linhas)[1]) guardarLinha(s.tipo, { titulo: l[0] ?? '', texto: l.slice(1).join(' — ') }, rotulo);
        }
        break;
      }
      case 'objectivos':
      case 'condicoes':
      case 'passos': {
        for (const b of bs) {
          if (b.k === 'item') guardarFrase(s.tipo, b.texto, rotulo);
          else for (const l of partirTabela(b.linhas)[1]) guardarFrase(s.tipo, l.filter(Boolean).join(' — '), rotulo);
        }
        break;
      }
      case 'fases': {
        for (const b of bs) {
          if (b.k === 'item') {
            faseDeTexto(b.texto);
            continue;
          }
          const [cab, linhas] = partirTabela(b.linhas);
          const c = colunas(cab, {
            nome: /^(fase|etapa|actividade|atividade|modulo|item|descricao do servico|servico)/,
            entregaveis: /(entregave|descricao|ambito|escopo|actividades|atividades)/,
            duracao: /(semana|duracao|prazo|tempo)/,
            valor: /(valor|preco|investimento|montante|custo|honorario|total)/,
          });
          for (const l of linhas) {
            const nome = l[c.nome ?? 0] ?? '';
            if (/^total$/i.test(chave(nome))) {
              totalEscrito =
                montanteEm(l.join(' ')) ?? (c.valor !== undefined ? montanteEm(`${l[c.valor]} ${p.moeda}`) : null) ?? totalEscrito;
              continue;
            }
            const celulaValor = c.valor !== undefined ? (l[c.valor] ?? '') : '';
            const montante =
              montanteEm(celulaValor) ?? (celulaValor.trim() ? montanteEm(`${celulaValor} ${p.moeda}`) : null) ?? montanteEm(l.join(' '));
            const duracao =
              c.duracao !== undefined
                ? duracaoEm(/\d\s*$/.test(l[c.duracao] ?? '') ? `${l[c.duracao]} semanas` : (l[c.duracao] ?? ''))
                : duracaoEm(l.join(' '));
            guardarFase({ nome, entregaveis: c.entregaveis !== undefined ? (l[c.entregaveis] ?? '') : '', duracao, montante });
          }
        }
        break;
      }
      case 'opcoes': {
        const opcao = (nomeBruto: string, descricao: string, montante: Montante | null, fonte: string) => {
          if (p.opcoes.length >= LIMITES.opcoes) {
            naoReconhecido.push({ titulo: `Opção (acima de ${LIMITES.opcoes})`, texto: fonte });
            return;
          }
          if (montante?.moeda) moedasVistas.add(montante.moeda);
          const recomendada = /recomendad|sugerid|preferencial/i.test(fonte);
          const nome = nomeBruto
            .replace(PREFIXO_OPCAO, '')
            .replace(/^[A-C]\)\s*/, '')
            .replace(/\(?\s*(?:recomendad[oa]|sugerid[oa]|preferencial)\s*\)?/i, '')
            .trim();
          const o: Opcao = {
            nome: cortar(nome, LIMITES.textoCurto).texto,
            descricao: cortar(
              descricao
                .replace(/\s*\(?\s*(?:recomendad[oa]|sugerid[oa])\s*\)?/i, '')
                .replace(/\s+([.,;])/g, '$1')
                .trim(),
              LIMITES.textoMedio,
            ).texto,
            valor: montante?.valor ?? 0,
            recomendada,
          };
          if (!montante) avisos.push(`Opção «${o.nome || p.opcoes.length + 1}»: sem valor no texto.`);
          p.opcoes.push(o);
          conta('opcoes');
        };
        for (const b of bs) {
          if (b.k === 'item') {
            const montante = montanteEm(b.texto);
            const semPrefixo = semTrechos(b.texto, montante?.trecho).replace(PREFIXO_OPCAO, '');
            const { titulo, texto } = dividir(semPrefixo);
            opcao(titulo || texto, titulo ? texto : '', montante, b.texto);
          } else {
            const [cab, linhas] = partirTabela(b.linhas);
            const c = colunas(cab, {
              nome: /^(opcao|alternativa|pacote|plano|nome)/,
              descricao: /(descricao|inclui|ambito)/,
              valor: /(valor|preco|investimento|montante|total)/,
            });
            for (const l of linhas) {
              const v = c.valor !== undefined ? (l[c.valor] ?? '') : l.join(' ');
              opcao(
                l[c.nome ?? 0] ?? '',
                c.descricao !== undefined ? (l[c.descricao] ?? '') : '',
                montanteEm(v) ?? (v.trim() ? montanteEm(`${v} ${p.moeda}`) : null),
                l.join(' '),
              );
            }
          }
        }
        break;
      }
      case 'riscos': {
        const risco = (r: string, m: string, fonte: string) => {
          if (p.riscos.length >= LIMITES.riscos) {
            naoReconhecido.push({ titulo: `Risco (acima de ${LIMITES.riscos})`, texto: fonte });
            return;
          }
          const x: Risco = { risco: cortar(r, LIMITES.textoCurto).texto, mitigacao: cortar(m, LIMITES.textoMedio).texto };
          if (!m) avisos.push(`Risco «${x.risco}»: sem mitigação no texto.`);
          p.riscos.push(x);
          conta('riscos');
        };
        for (const b of bs) {
          if (b.k === 'item') {
            const mit = /^(.+?)[.;]?\s*mitiga[çc](?:[aã]o|[õo]es)\s*:\s*(.+)$/i.exec(b.texto);
            if (mit) risco(mit[1]!.replace(/^risco\s*:\s*/i, ''), mit[2]!, b.texto);
            else {
              const { titulo, texto } = dividir(b.texto);
              risco(titulo || texto, titulo ? texto : '', b.texto);
            }
          } else {
            const [cab, linhas] = partirTabela(b.linhas);
            const c = colunas(cab, { risco: /^(risco|ameaca)/, mitigacao: /(mitiga|resposta|accao|acao|controlo)/ });
            for (const l of linhas)
              risco(l[c.risco ?? 0] ?? '', c.mitigacao !== undefined ? (l[c.mitigacao] ?? '') : l.slice(1).join(' — '), l.join(' '));
          }
        }
        break;
      }
      case 'contactos': {
        avisos.push('Contactos: as folhas usam sempre os contactos comerciais da AGORAMOZ (comercial@agoramoz.com, +258 82 478 0097).');
        // O que não é um contacto, debaixo deste título, não se deita fora sem dizer.
        const outros = bs.filter((b) => b.k === 'item' && !/@|\+?\d[\d\s]{6,}|www\.|https?:|maputo|mo[cç]ambique/i.test(b.texto));
        if (outros.length) naoReconhecido.push({ titulo: s.titulo, texto: outros.map((b) => (b.k === 'item' ? b.texto : '')).join('\n') });
        break;
      }
    }
  }

  // 4. O resto do preâmbulo: vira carta se não houve carta; senão fica listado.
  const restoPreambulo = blocos(sobra)
    .map((b) => (b.k === 'item' ? b.texto : b.linhas.map((l) => l.join(' · ')).join('\n')))
    .filter((t) => t.trim());
  if (restoPreambulo.length) {
    if (!p.carta) {
      const paras: string[] = [];
      for (const t of restoPreambulo) {
        if (FECHO_CARTA.test(t)) break;
        paras.push(t);
      }
      const junto = paras.join('\n\n');
      p.carta = junto.length > LIMITES.carta ? cortar(junto, LIMITES.carta).texto : junto;
      if (junto.length > LIMITES.carta) avisos.push('Carta (texto antes da primeira secção): cortada.');
      if (p.carta) reconhecidas.push('Carta (texto antes da primeira secção)');
    } else naoReconhecido.push({ titulo: 'Texto antes da primeira secção', texto: restoPreambulo.join('\n') });
  }

  // 5. Moeda e contas.
  if (moedasVistas.size === 1) p.moeda = [...moedasVistas][0]!;
  if (moedasVistas.size > 1)
    avisos.push(`O texto mistura moedas (${[...moedasVistas].join(', ')}): a proposta usa ${p.moeda}. Confirme os valores.`);
  const total = totais(p).total;
  const escrito = totalEscrito as Montante | null;
  if (escrito && Math.abs(escrito.valor - total) >= 0.5) {
    avisos.push(
      `O texto diz que o total é ${formatarValor(escrito.valor, p.moeda)}, mas a soma das fases dá ${formatarValor(total, p.moeda)}. As folhas usam a soma: confirme qual está certo.`,
    );
  }
  for (const f of p.fases) if (f.semanasMax === 0) avisos.push(`Fase «${f.nome}»: sem semanas no texto (o plano mostra-a sem barra).`);
  if (!validadeVista) avisos.push(`Validade não indicada no texto: ficaram ${p.validadeDias} dias.`);

  const resumo = reconhecidas.map((r) => {
    const tipo = (Object.keys(NOMES) as Tipo[]).find((t) => NOMES[t] === r);
    const n = tipo ? contagem.get(tipo) : undefined;
    return n ? `${r}: ${n}` : r;
  });

  return { proposta: p, relatorio: { reconhecidas: resumo, avisos, naoReconhecido } };
}
