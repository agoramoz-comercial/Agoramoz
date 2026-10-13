/**
 * Posição aproximada do sol, para as sombras do visualizador. Fórmula de
 * Cooper para a declinação e ângulo horário em tempo solar: erro de um a dois
 * graus, mais do que suficiente para ver de que lado cai a sombra da casa.
 *
 * Hemisfério sul: ao meio-dia o sol está a NORTE. Azimute em graus a partir
 * do norte, no sentido dos ponteiros do relógio.
 */

export const LATITUDE_DEMO = -19;

const RAD = Math.PI / 180;

export interface PosicaoSol {
  readonly elevacao: number;
  readonly azimute: number;
}

export function declinacao(diaDoAno: number): number {
  return 23.44 * Math.sin(((360 / 365) * (284 + diaDoAno)) * RAD);
}

export function posicaoSol(hora: number, diaDoAno: number, latitude = LATITUDE_DEMO): PosicaoSol {
  const phi = latitude * RAD;
  const delta = declinacao(diaDoAno) * RAD;
  const h = 15 * (hora - 12) * RAD;
  const sinEl = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(h);
  const elevacao = Math.asin(Math.max(-1, Math.min(1, sinEl)));
  const az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(phi) - Math.tan(delta) * Math.cos(phi));
  return { elevacao: elevacao / RAD, azimute: (((az / RAD + 180) % 360) + 360) % 360 };
}

/**
 * Direção (unitária) de onde vem a luz, na grelha local: x para este, y para
 * norte, z para cima.
 */
export function direcaoSol(p: PosicaoSol): readonly [number, number, number] {
  const el = p.elevacao * RAD;
  const az = p.azimute * RAD;
  return [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)];
}
