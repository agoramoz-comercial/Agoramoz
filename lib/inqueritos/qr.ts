import QRCode from 'qrcode';

/**
 * Códigos QR dos links de inquérito, gerados no servidor.
 *
 * Desenha-se o SVG a partir da matriz em vez de injectar o SVG que a
 * biblioteca devolve: nada de `dangerouslySetInnerHTML`, e o mesmo caminho
 * serve a pré-visualização na página e o ficheiro descarregado.
 *
 * Correcção de erros «M» (~15 %): resiste a um canto dobrado ou a uma
 * impressão fraca sem tornar o código denso demais para um telemóvel.
 */

/** A zona de silêncio que os leitores exigem: 4 módulos de cada lado. */
export const MARGEM = 4;

export interface QR {
  /** Lado, em módulos, já com a margem. */
  readonly lado: number;
  /** O caminho SVG dos módulos escuros. */
  readonly caminho: string;
}

export function qrDe(texto: string): QR {
  const { modules } = QRCode.create(texto, { errorCorrectionLevel: 'M' });
  const n = modules.size;
  const partes: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (modules.get(y, x)) partes.push(`M${x + MARGEM} ${y + MARGEM}h1v1h-1z`);
    }
  }
  return { lado: n + 2 * MARGEM, caminho: partes.join('') };
}

/** O ficheiro SVG para descarregar e imprimir: preto sobre branco, sempre. */
export function svgDe(qr: QR, pixeisPorModulo = 10): string {
  const px = qr.lado * pixeisPorModulo;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ` +
    `viewBox="0 0 ${qr.lado} ${qr.lado}" shape-rendering="crispEdges">` +
    `<rect width="${qr.lado}" height="${qr.lado}" fill="#ffffff"/>` +
    `<path d="${qr.caminho}" fill="#000000"/></svg>`
  );
}
