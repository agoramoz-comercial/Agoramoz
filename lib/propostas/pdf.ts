import { ErroFicheiro, linhasDoPdf, type Conversao, type PedacoPdf } from './ficheiro';

/**
 * PDF → texto, com o pdf.js. Este módulo só é importado (dinamicamente)
 * quando alguém envia um PDF: o pdf.js não pesa no resto do admin.
 *
 * Sem carregar tipos de letra (`disableFontFace`): só se quer
 * o texto. O trabalho pesado corre num worker servido pelo próprio site.
 */

const MAX_PAGINAS = 60;

export async function pdfParaTexto(buf: ArrayBuffer): Promise<Conversao> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

  let doc: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableFontFace: true, useSystemFonts: false }).promise;
  } catch (e) {
    const nome = (e as { name?: string }).name;
    if (nome === 'PasswordException') throw new ErroFicheiro('O PDF está protegido por palavra-passe.');
    throw new ErroFicheiro('Não foi possível ler este PDF.');
  }

  const avisos: string[] = [];
  const total = doc.numPages;
  if (total > MAX_PAGINAS) avisos.push(`O PDF tem ${total} páginas; só as primeiras ${MAX_PAGINAS} foram lidas.`);
  const paginas: string[] = [];
  let semTexto = 0;
  for (let n = 1; n <= Math.min(total, MAX_PAGINAS); n += 1) {
    const pagina = await doc.getPage(n);
    const conteudo = await pagina.getTextContent();
    const pedacos: PedacoPdf[] = [];
    for (const item of conteudo.items) {
      if (!('str' in item)) continue;
      const [, , , d, e, f] = item.transform as number[];
      pedacos.push({ str: item.str, x: e!, y: f!, largura: item.width, altura: Math.abs(item.height || d!) });
    }
    const linhas = linhasDoPdf(pedacos);
    if (!linhas.length) semTexto += 1;
    // Número de página sozinho numa linha («3», «Página 3 de 12») não é conteúdo.
    paginas.push(linhas.filter((l) => !/^(?:p[aá]g(?:ina)?\.?\s*)?\d{1,3}(?:\s*(?:de|\/)\s*\d{1,3})?$/i.test(l.trim())).join('\n'));
    pagina.cleanup();
  }
  await doc.destroy();

  if (semTexto === Math.min(total, MAX_PAGINAS))
    throw new ErroFicheiro('Este PDF não tem texto (é uma imagem digitalizada). Envie o .docx original ou cole o texto.');
  if (semTexto) avisos.push(`${semTexto} página(s) sem texto (imagens digitalizadas) foram ignoradas.`);
  avisos.push('PDF: os títulos e as colunas foram deduzidos pela posição e pelo tamanho da letra. Confirme as secções no relatório.');
  return { texto: paginas.join('\n\n'), avisos };
}
