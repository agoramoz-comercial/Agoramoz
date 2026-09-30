import { z } from 'zod';
import { IDIOMAS_MOTOR, TEXTO_MAX, TEXTO_MIN, urlPublica } from './limites';

/**
 * O pedido de análise que o browser envia à NOSSA rota.
 *
 * Não somos nós que vamos buscar o artigo — é o motor Lovable. Mesmo assim a
 * guarda de URL fica aqui: não mandamos o motor de ninguém bater em endereços
 * internos em nosso nome, e um URL que não é público não é notícia.
 *
 * Os limites e a guarda vivem em `limites.ts`, sem zod, para o cliente os usar.
 */
export { IDIOMAS_MOTOR, TEXTO_MAX, TEXTO_MIN, hostPrivado, urlPublica, type IdiomaMotor } from './limites';

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
