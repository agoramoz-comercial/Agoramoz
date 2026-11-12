import { z } from 'zod';
import { CONTEXTO_MAX, PERGUNTA_MAX, PERGUNTA_MIN, TROCAS_MAX, dadoPessoalEm, limparPergunta } from './limites';

/**
 * O pedido de consulta que o browser envia à NOSSA rota.
 *
 * O histórico vem do cliente porque nós não guardamos nada: cada pedido traz
 * as trocas anteriores do próprio separador, resumidas, para que «e se for a
 * prazo?» faça sentido. É texto de um cliente — entra limitado em número e em
 * tamanho, e nunca é devolvido tal como veio.
 */
export { CONTEXTO_MAX, PERGUNTA_MAX, PERGUNTA_MIN, TROCAS_MAX } from './limites';

const pergunta = z
  .string()
  .max(PERGUNTA_MAX * 2)
  .transform(limparPergunta)
  .pipe(z.string().min(PERGUNTA_MIN).max(PERGUNTA_MAX));

const troca = z.strictObject({
  pergunta,
  resposta: z
    .string()
    .max(CONTEXTO_MAX * 2)
    .transform((v) => limparPergunta(v).slice(0, CONTEXTO_MAX))
    .pipe(z.string().min(1)),
});

export const pedidoSchema = z.strictObject({
  pergunta,
  historico: z.array(troca).max(TROCAS_MAX).default([]),
});

export type Pedido = z.infer<typeof pedidoSchema>;

/**
 * O contacto ou o número de documento, se algum texto do pedido o trouxer.
 * Fora do esquema de propósito: a rota responde-lhe com um código próprio
 * (422), para o cliente dizer exactamente o que tirar.
 */
export function dadoPessoalNoPedido(p: Pedido) {
  return dadoPessoalEm(p.pergunta) ?? p.historico.map((t) => dadoPessoalEm(t.pergunta)).find(Boolean) ?? null;
}
