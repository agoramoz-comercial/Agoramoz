import { z } from 'zod';

/**
 * O pedido de análise que o browser envia à NOSSA rota.
 *
 * Não somos nós que vamos buscar o artigo — é o motor Lovable. Mesmo assim a
 * guarda de URL fica aqui: não mandamos o motor de ninguém bater em endereços
 * internos em nosso nome, e um URL que não é público não é notícia.
 */

/** Os idiomas que o motor aceita (lidos no bundle do Lovable). `xg` é Xichangana. */
export const IDIOMAS_MOTOR = ['pt', 'en', 'fr', 'de', 'xg'] as const;
export type IdiomaMotor = (typeof IDIOMAS_MOTOR)[number];

export const TEXTO_MIN = 200;
export const TEXTO_MAX = 20_000;

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** Endereço que não é da Internet pública: loopback, rede privada, link-local, nomes locais. */
export function hostPrivado(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!h) return true;
  if (h === 'localhost' || /\.(localhost|local|internal|lan|home|corp)$/.test(h)) return true;
  // Qualquer IPv6 literal fica de fora: uma notícia não se publica num IP.
  if (h.includes(':')) return true;

  const m = IPV4.exec(h);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
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

const idioma = z.enum(IDIOMAS_MOTOR);

export const pedidoSchema = z.discriminatedUnion('modo', [
  z.object({
    modo: z.literal('url'),
    url: z.string().trim().max(2048).refine(urlPublica),
    idioma,
  }),
  z.object({
    modo: z.literal('texto'),
    texto: z.string().trim().min(TEXTO_MIN).max(TEXTO_MAX),
    idioma,
  }),
]);

export type Pedido = z.infer<typeof pedidoSchema>;
