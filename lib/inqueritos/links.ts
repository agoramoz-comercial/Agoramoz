/**
 * O estado de um link como a equipa o vê, e a data de expiração escolhida no
 * formulário. A base decide o que aceita (`estado_do_link`, 0013); isto só
 * descreve, com a mesma ordem de precedência.
 */

export type EstadoLink = 'activo' | 'revogado' | 'expirado' | 'esgotado';

export interface LinkVisto {
  readonly revokedAt: string | null;
  readonly expiresAt: string | null;
  readonly maxResponses: number | null;
  readonly respostas: number;
}

export function estadoDoLink(l: LinkVisto, agora: Date): EstadoLink {
  if (l.revokedAt) return 'revogado';
  if (l.expiresAt && new Date(l.expiresAt).getTime() <= agora.getTime()) return 'expirado';
  if (l.maxResponses !== null && l.respostas >= l.maxResponses) return 'esgotado';
  return 'activo';
}

const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * «Expira a 31/12» quer dizer «aceita respostas durante todo o dia 31», na
 * hora de Maputo (UTC+2, sem hora de verão). Devolve null para uma data que
 * não existe.
 */
export function fimDoDia(data: string): string | null {
  const m = DATA.exec(data);
  if (!m) return null;
  const [a, me, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(a, me - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== me - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return `${data}T23:59:59+02:00`;
}
