/**
 * Lógica pura dos efeitos do website v2 (D-50). Sem GSAP e sem DOM: o que aqui
 * vive testa-se em Node, e os componentes em `components/motion/` só ligam isto
 * ao ScrollTrigger.
 */

/**
 * Efeito 03 — fluxo desenhado com o scroll. Quantos passos estão acesos para um
 * progresso de 0 a 1. O primeiro acende logo que a linha começa a encher e o
 * último só quando chega ao fim, para o leitor ver o fluxo completar-se.
 */
export function passosAcesos(progresso: number, total: number): number {
  if (total <= 0) return 0;
  const p = Math.min(1, Math.max(0, Number.isFinite(progresso) ? progresso : 0));
  if (p <= 0) return 0;
  if (p >= 1) return total;
  return Math.min(total - 1, Math.floor(p * total) + 1);
}

/**
 * Efeito 02 — números que contam. O valor a mostrar a meio da contagem: inteiro,
 * nunca acima do alvo, e o alvo exacto no fim (o HTML servido já traz o alvo).
 */
export function valorNaContagem(progresso: number, alvo: number): number {
  const p = Math.min(1, Math.max(0, Number.isFinite(progresso) ? progresso : 0));
  if (p >= 1) return alvo;
  return Math.min(alvo, Math.floor(alvo * p));
}

/**
 * Efeito 05 — cartões empilhados. A escala de um cartão quando o seguinte o cobre:
 * os de baixo encolhem um pouco mais, para a pilha ler-se em profundidade. Nunca
 * abaixo de 0,86 (abaixo disso o texto deixa de se ler no telemóvel).
 */
export function escalaCoberta(indice: number, total: number): number {
  if (total <= 1 || indice >= total - 1) return 1;
  const camadas = total - 1 - indice;
  return Math.max(0.86, Number((1 - 0.035 * camadas).toFixed(3)));
}

/**
 * Efeito 06 — o arco da identidade que se abre. Os dois estados do `clip-path`:
 * fechado (arco ao centro) e aberto (secção inteira). Os mesmos componentes e
 * unidades nos dois, para o GSAP interpolar sem saltos. Fechado, o arco deixa
 * 64% da largura: o conteúdo da secção tem de caber aí (ver `ArchReveal`).
 */
export const ARCO = {
  fechado: 'inset(12% 18% 0% 18% round 999px 999px 0px 0px)',
  aberto: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)',
} as const;
