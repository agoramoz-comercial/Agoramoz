/**
 * Do ficheiro ao texto: o que alimenta o leitor de propostas (`texto.ts`).
 *
 * Corre no browser: o documento do cliente não sai do computador de quem o
 * envia para ser convertido — só o resultado, se a proposta for guardada.
 *
 * - **.txt / .md**: o texto tal como está.
 * - **.docx**: o Word é um ZIP com `word/document.xml`. Lê-se aqui sem
 *   bibliotecas (o ZIP com `DecompressionStream`, o XML com expressões
 *   regulares sobre uma estrutura conhecida), e escreve-se o texto na forma
 *   que o leitor entende melhor: títulos do Word como `# Título`, listas
 *   como `- item`, tabelas com tabulações entre colunas.
 * - **.pdf**: pelo pdf.js (`pdf.ts`), carregado só quando chega um PDF.
 *   Um PDF não tem títulos nem tabelas, só texto posicionado: as linhas são
 *   refeitas pela posição, um texto maior faz de título, e uma distância
 *   grande entre palavras na mesma linha faz de coluna.
 *
 * O que se perde na conversão (imagens, cabeçalhos e rodapés do Word, texto
 * em caixas) é dito nos avisos.
 */

export const MAX_FICHEIRO = 10 * 1024 * 1024;
/** Tecto do que se descomprime de um .docx: um documento real anda pelos KB; isto trava um ZIP-bomba. */
const MAX_DESCOMPRIMIDO = 20 * 1024 * 1024;

export const ACEITES =
  '.docx,.pdf,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain,text/markdown';

export interface Conversao {
  readonly texto: string;
  readonly avisos: readonly string[];
}

export class ErroFicheiro extends Error {}

/* -------------------------------------------------------------------- ZIP */

const u16 = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8);
const u32 = (b: Uint8Array, i: number) => (b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16) | (b[i + 3]! << 24)) >>> 0;

async function inflar(dados: Uint8Array): Promise<Uint8Array> {
  const fluxo = new Blob([dados as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const leitor = fluxo.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_DESCOMPRIMIDO) {
      await leitor.cancel();
      throw new ErroFicheiro('O documento descomprimido é grande de mais.');
    }
    partes.push(value);
  }
  const saida = new Uint8Array(total);
  let o = 0;
  for (const p of partes) {
    saida.set(p, o);
    o += p.byteLength;
  }
  return saida;
}

/** As entradas pedidas de um ZIP, pelo directório central. Só «guardado» (0) e «deflate» (8). */
export async function lerZip(buf: ArrayBuffer, nomes: readonly string[]): Promise<Map<string, Uint8Array>> {
  const b = new Uint8Array(buf);
  let fim = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65_557); i -= 1) {
    if (u32(b, i) === 0x06054b50) {
      fim = i;
      break;
    }
  }
  if (fim < 0) throw new ErroFicheiro('Este ficheiro não é um .docx válido.');
  const entradas = u16(b, fim + 10);
  let p = u32(b, fim + 16);
  const saida = new Map<string, Uint8Array>();
  const descodificar = new TextDecoder();
  for (let n = 0; n < entradas && p + 46 <= b.length; n += 1) {
    if (u32(b, p) !== 0x02014b50) throw new ErroFicheiro('Este ficheiro não é um .docx válido.');
    const metodo = u16(b, p + 10);
    const comprimido = u32(b, p + 20);
    const lenNome = u16(b, p + 28);
    const lenExtra = u16(b, p + 30);
    const lenComentario = u16(b, p + 32);
    const local = u32(b, p + 42);
    const nome = descodificar.decode(b.subarray(p + 46, p + 46 + lenNome));
    p += 46 + lenNome + lenExtra + lenComentario;
    if (!nomes.includes(nome)) continue;
    if (u32(b, local) !== 0x04034b50) throw new ErroFicheiro('Este ficheiro não é um .docx válido.');
    const inicio = local + 30 + u16(b, local + 26) + u16(b, local + 28);
    const dados = b.subarray(inicio, inicio + comprimido);
    if (metodo === 0) saida.set(nome, dados);
    else if (metodo === 8) saida.set(nome, await inflar(dados));
    else throw new ErroFicheiro('Compressão do .docx não suportada.');
  }
  return saida;
}

/* ------------------------------------------------------------------- DOCX */

const ENTIDADES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const desescapar = (t: string) =>
  t.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
    e[0] === '#'
      ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
      : (ENTIDADES[e.toLowerCase()] ?? _),
  );

/** O texto de um parágrafo do Word: as corridas `w:t`, as tabulações e as quebras. */
function textoDoParagrafo(xml: string): string {
  let t = '';
  // Texto apagado com controlo de alterações (`w:del`) não conta.
  const semApagados = xml.replace(/<w:del\b[\s\S]*?<\/w:del>/g, '');
  for (const m of semApagados.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br(?:\s[^>]*)?\/>|<w:noBreakHyphen\/>/g)) {
    if (m[1] !== undefined) t += desescapar(m[1]);
    else if (m[0].startsWith('<w:tab')) t += '\t';
    else if (m[0].startsWith('<w:br')) t += '\n';
    else t += '-';
  }
  return t.replace(/[  ]+/g, ' ').trim();
}

interface Estilos {
  readonly titulos: ReadonlyMap<string, number>;
  readonly listas: ReadonlySet<string>;
}

/** Que estilos são títulos (e de que nível) e quais são listas, pelo nome interno (sempre em inglês). */
function lerEstilos(xml: string | undefined): Estilos {
  const titulos = new Map<string, number>();
  const listas = new Set<string>();
  for (const m of (xml ?? '').matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g)) {
    const id = m[1]!;
    const nome = (/<w:name w:val="([^"]+)"/.exec(m[2]!)?.[1] ?? '').toLowerCase();
    const nivel = /heading (\d)/.exec(nome)?.[1] ?? /<w:outlineLvl w:val="(\d)"/.exec(m[2]!)?.[1];
    if (nome === 'title') titulos.set(id, 0);
    else if (nivel !== undefined) titulos.set(id, Number(/heading/.test(nome) ? nivel : Number(nivel) + 1));
    if (/^list/.test(nome) || /<w:numPr>/.test(m[2]!)) listas.add(id);
  }
  return { titulos, listas };
}

function linhaDoParagrafo(xml: string, estilos: Estilos): string {
  const texto = textoDoParagrafo(xml);
  if (!texto) return '';
  const pPr = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(xml)?.[1] ?? '';
  const estilo = /<w:pStyle w:val="([^"]+)"/.exec(pPr)?.[1];
  const nivel = (estilo && estilos.titulos.get(estilo)) ?? (/<w:outlineLvl w:val="(\d)"/.exec(pPr) ? 1 : undefined);
  if (nivel !== undefined && texto.length <= 120)
    return `${'#'.repeat(Math.max(1, Math.min(6, nivel || 1)))} ${texto.replace(/\s+/g, ' ')}`;
  if (/<w:numPr>/.test(pPr) || (estilo && estilos.listas.has(estilo))) return `- ${texto.replace(/\n/g, ' ')}`;
  // Um parágrafo curto todo a negrito é, quase sempre, um título feito à mão.
  const corridas = [...xml.matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g)].filter((r) => /<w:t[\s>]/.test(r[1]!));
  const tudoNegrito = corridas.length > 0 && corridas.every((r) => /<w:b(?:\s+w:val="(?:1|true|on)")?\s*\/>/.test(r[1]!));
  if (tudoNegrito && texto.length <= 80 && !/[.:;]$/.test(texto)) return `**${texto}**`;
  return texto;
}

/** Uma tabela do Word: uma linha por linha, colunas com tabulação (o leitor reconhece). */
function linhasDaTabela(xml: string, estilos: Estilos): string[] {
  const linhas: string[] = [];
  for (const tr of xml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)) {
    const celulas = [...tr[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((tc) =>
      [...tc[0].matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)]
        .map((p) => linhaDoParagrafo(p[0], estilos).replace(/^(?:#+ |- |\*\*)|\*\*$/g, ''))
        .filter(Boolean)
        .join(' ')
        .replace(/\t/g, ' '),
    );
    if (celulas.some(Boolean)) linhas.push(celulas.join('\t'));
  }
  return linhas;
}

/** O corpo do Word em texto, parágrafo a parágrafo e tabela a tabela, pela ordem do documento. */
export function documentoParaTexto(documento: string, estilosXml?: string): string {
  const estilos = lerEstilos(estilosXml);
  const corpo = /<w:body>([\s\S]*)<\/w:body>/.exec(documento)?.[1] ?? documento;
  const saida: string[] = [];
  const re = /<w:tbl>|<w:tbl\s|<w:p\b/g;
  let i = 0;
  for (;;) {
    re.lastIndex = i;
    const m = re.exec(corpo);
    if (!m) break;
    if (m[0].startsWith('<w:tbl')) {
      // Tabelas dentro de tabelas: procurar o fecho que corresponde.
      let fundo = 0;
      const marcas = /<w:tbl[\s>]|<\/w:tbl>/g;
      marcas.lastIndex = m.index;
      let fim = corpo.length;
      for (let t = marcas.exec(corpo); t; t = marcas.exec(corpo)) {
        fundo += t[0].startsWith('</') ? -1 : 1;
        if (fundo === 0) {
          fim = t.index + t[0].length;
          break;
        }
      }
      saida.push('', ...linhasDaTabela(corpo.slice(m.index, fim), estilos), '');
      i = fim;
    } else {
      const autoFechado = /^<w:p\b[^>]*\/>/.exec(corpo.slice(m.index));
      if (autoFechado) {
        saida.push('');
        i = m.index + autoFechado[0].length;
        continue;
      }
      const fim = corpo.indexOf('</w:p>', m.index);
      if (fim < 0) break;
      const linha = linhaDoParagrafo(corpo.slice(m.index, fim + 6), estilos);
      // Antes de um título, uma linha em branco: é assim que o leitor separa secções.
      if (/^#|^\*\*/.test(linha)) saida.push('');
      saida.push(linha);
      i = fim + 6;
    }
  }
  return saida
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function docxParaTexto(buf: ArrayBuffer): Promise<Conversao> {
  const partes = await lerZip(buf, ['word/document.xml', 'word/styles.xml', 'word/header1.xml', 'word/footer1.xml']);
  const doc = partes.get('word/document.xml');
  if (!doc) throw new ErroFicheiro('Este ficheiro não é um .docx válido.');
  const ler = (x: Uint8Array | undefined) => (x ? new TextDecoder().decode(x) : undefined);
  const xml = ler(doc)!;
  const avisos: string[] = [];
  if (/<w:drawing\b|<w:pict\b/.test(xml))
    avisos.push('O documento tem imagens: não passam para as folhas (os visuais das folhas são os do desenho editorial).');
  if (/<w:txbxContent\b/.test(xml))
    avisos.push('O documento tem caixas de texto: o texto delas foi lido junto com o resto — confirme onde ficou.');
  if (partes.has('word/header1.xml') || partes.has('word/footer1.xml'))
    avisos.push('Cabeçalhos e rodapés do Word foram ignorados (as folhas têm os seus).');
  return { texto: documentoParaTexto(xml, ler(partes.get('word/styles.xml'))), avisos };
}

/* -------------------------------------------------------------------- PDF */

/** Um pedaço de texto de uma página de PDF, com a posição (origem em baixo à esquerda) e o tamanho. */
export interface PedacoPdf {
  readonly str: string;
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
}

/**
 * As linhas de uma página a partir dos pedaços posicionados. Mesma linha =
 * mesma altura (com tolerância); um intervalo grande entre pedaços vira
 * tabulação (coluna de tabela); uma célula partida em duas linhas volta a
 * uma; uma letra maior do que a do corpo vira título; um intervalo vertical
 * grande vira linha em branco.
 */
export function linhasDoPdf(pedacos: readonly PedacoPdf[], corpo?: number): string[] {
  const validos = pedacos.filter((p) => p.str !== '');
  if (!validos.some((p) => p.str.trim())) return [];
  const alturas = validos
    .filter((p) => p.str.trim())
    .map((p) => p.altura)
    .filter((h) => h > 0)
    .sort((a, b) => a - b);
  const mediana = corpo ?? alturas[Math.floor(alturas.length / 2)] ?? 10;

  // 1. Agrupar por linha (mesma altura na página, com tolerância).
  const linhas: { y: number; altura: number; itens: PedacoPdf[] }[] = [];
  for (const p of [...validos].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const l = linhas.find((x) => Math.abs(x.y - p.y) <= Math.max(2, mediana * 0.4));
    if (l) {
      l.itens.push(p);
      if (p.str.trim()) l.altura = Math.max(l.altura, p.altura);
    } else linhas.push({ y: p.y, altura: p.str.trim() ? p.altura : 0, itens: [p] });
  }
  linhas.sort((a, b) => b.y - a.y);

  // 2. Cada linha em células: um intervalo largo (ou um «espaço» largo, que é
  //    como o Word e o LibreOffice preenchem as colunas) separa células.
  type Celula = { x: number; texto: string };
  const celulasDe = (itens: PedacoPdf[]): Celula[] => {
    const cel: Celula[] = [];
    let fim: number | null = null;
    let quebra = false;
    for (const it of [...itens].sort((a, b) => a.x - b.x)) {
      if (!it.str.trim()) {
        if (it.largura > mediana * 1.5) quebra = true;
        else if (cel.length) cel[cel.length - 1]!.texto += ' ';
        fim = it.x + it.largura;
        continue;
      }
      const intervalo = fim === null ? 0 : it.x - fim;
      if (!cel.length || quebra || intervalo > mediana * 1.5) cel.push({ x: it.x, texto: it.str });
      else cel[cel.length - 1]!.texto += (intervalo > mediana * 0.15 && !/\s$/.test(cel[cel.length - 1]!.texto) ? ' ' : '') + it.str;
      quebra = false;
      fim = it.x + it.largura;
    }
    return cel.map((c) => ({ x: c.x, texto: c.texto.replace(/\s+/g, ' ').trim() })).filter((c) => c.texto);
  };

  const saida: string[] = [];
  type Feita = { y: number; altura: number; celulas: Celula[] };
  let anterior: Feita | null = null;
  for (const l of linhas) {
    let celulas = celulasDe(l.itens);
    if (!celulas.length) continue;
    // Marca de lista em símbolo («•», ou o glifo privado do Word) → «- ».
    const primeira = celulas[0]!;
    if (/^[•●▪◦·‣∙\uE000-\uF8FF]$/u.test(primeira.texto) && celulas.length > 1) {
      celulas = [{ x: primeira.x, texto: `- ${celulas[1]!.texto}` }, ...celulas.slice(2)];
    } else if (/^[•●▪◦·‣∙\uE000-\uF8FF]\s+/u.test(primeira.texto)) {
      celulas = [{ x: primeira.x, texto: primeira.texto.replace(/^[•●▪◦·‣∙\uE000-\uF8FF]\s+/u, '- ') }, ...celulas.slice(1)];
    }
    const perto = anterior !== null && anterior.y - l.y <= Math.max(anterior.altura, l.altura, mediana) * 1.6;

    // Célula partida em duas linhas: a continuação alinha com colunas da
    // linha de cima e não tem a primeira coluna — junta-se à célula certa.
    const a: Feita | null = anterior;
    if (a && perto && a.celulas.length >= 2) {
      const prev: Celula[] = a.celulas;
      const alturaAnterior: number = a.altura;
      const alinha = (c: Celula) => prev.findIndex((p) => Math.abs(p.x - c.x) <= 4);
      if (celulas.every((c) => alinha(c) > 0)) {
        for (const c of celulas) prev[alinha(c)]!.texto += ` ${c.texto}`;
        saida[saida.length - 1] = prev.map((c) => c.texto).join('\t');
        anterior = { y: l.y, altura: alturaAnterior, celulas: prev };
        continue;
      }
    }

    const texto = celulas.map((c) => c.texto).join('\t');
    // Entre linhas da mesma tabela não há linha em branco, mesmo com mais espaço vertical.
    const mesmaTabela =
      anterior !== null &&
      anterior.celulas.length >= 2 &&
      celulas.length >= 2 &&
      anterior.y - l.y <= Math.max(anterior.altura, mediana) * 3.5;
    if (anterior && !perto && !mesmaTabela) saida.push('');
    const titulo = l.altura >= mediana * 1.2 && texto.length <= 90 && celulas.length === 1 && !texto.startsWith('- ');
    if (titulo && saida.length && saida[saida.length - 1] !== '') saida.push('');
    saida.push(titulo ? `# ${texto}` : texto);
    anterior = { y: l.y, altura: l.altura, celulas };
  }
  return saida;
}

/* --------------------------------------------------------------- entrada */

function extensao(nome: string): string {
  return /\.([a-z0-9]+)$/i.exec(nome)?.[1]?.toLowerCase() ?? '';
}

/** O texto de um ficheiro enviado, ou um erro com uma mensagem para mostrar. */
export async function textoDoFicheiro(f: File): Promise<Conversao> {
  if (f.size > MAX_FICHEIRO)
    throw new ErroFicheiro('O ficheiro tem mais de 10 MB. Uma proposta em texto é muito mais pequena: retire as imagens ou cole o texto.');
  const ext = extensao(f.name);
  if (ext === 'doc') throw new ErroFicheiro('O formato .doc (Word antigo) não é lido. Abra-o no Word e guarde como .docx.');
  if (ext === 'txt' || ext === 'md' || f.type === 'text/plain' || f.type === 'text/markdown') return { texto: await f.text(), avisos: [] };
  if (ext === 'docx') return docxParaTexto(await f.arrayBuffer());
  if (ext === 'pdf' || f.type === 'application/pdf') {
    const { pdfParaTexto } = await import('./pdf');
    return pdfParaTexto(await f.arrayBuffer());
  }
  throw new ErroFicheiro('Formato não suportado. Envie .docx, .pdf, .txt ou .md.');
}
