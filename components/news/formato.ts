/** Número com sinal explícito e o sinal de menos tipográfico (−), não o hífen. */
export function assinado(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '0';
}
