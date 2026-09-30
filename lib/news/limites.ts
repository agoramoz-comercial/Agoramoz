/**
 * Limites e guarda de URL do pedido de análise, SEM zod.
 *
 * Separados de `pedido.ts` para o componente de cliente os poder usar sem
 * arrastar o zod para o bundle da página `/news`. O servidor valida com o
 * esquema de `pedido.ts`, que reexporta daqui — há uma só definição.
 */

/** Os idiomas que o motor aceita (lidos no bundle do Lovable). `xg` é Xichangana. */
export const IDIOMAS_MOTOR = ['pt', 'en', 'fr', 'de', 'xg'] as const;
export type IdiomaMotor = (typeof IDIOMAS_MOTOR)[number];

export const TEXTO_MIN = 200;
export const TEXTO_MAX = 20_000;

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * Endereço que não é da Internet pública: loopback, redes privadas,
 * link-local, CGNAT, blocos reservados e de documentação, nomes locais.
 *
 * É a melhor guarda possível sem resolver DNS — e resolver aqui não ajudaria:
 * quem vai buscar o artigo é o motor, noutra rede, e a resposta dele ao DNS
 * pode ser outra. Um nome público que aponte para um IP privado passa; o
 * impacto fica na rede do motor, não na nossa.
 */
export function hostPrivado(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!h) return true;
  if (h === 'localhost' || /\.(localhost|local|internal|lan|home|corp)$/.test(h)) return true;
  // Qualquer IPv6 literal fica de fora: uma notícia não se publica num IP.
  if (h.includes(':')) return true;

  const m = IPV4.exec(h);
  if (m) {
    const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  // Nome sem ponto (`intranet`) não é um domínio público.
  return !h.includes('.');
}

export function urlPublica(valor: string): boolean {
  let u: URL;
  try {
    u = new URL(valor);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  if (u.username || u.password) return false;
  if (u.port && u.port !== '443') return false;
  return !hostPrivado(u.hostname);
}
