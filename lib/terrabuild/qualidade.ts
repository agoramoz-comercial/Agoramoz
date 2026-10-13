/**
 * Níveis de qualidade da vista 3D: o critério «nenhuma máquina lenta».
 * Função pura (os sinais do navegador entram, o nível sai), para se testar sem
 * browser. A escolha manual da pessoa ganha sempre à automática.
 */

export const NIVEIS = ['leve', 'normal', 'alta'] as const;
export type Nivel = (typeof NIVEIS)[number];
export type EscolhaQualidade = 'auto' | Nivel;

export interface Orcamento {
  /** Descarrega os modelos e texturas do Blender (public/terrabuild). */
  readonly modelos: boolean;
  /** Lado do mapa de sombras; 0 = sem sombras. */
  readonly sombras: 0 | 1024 | 2048;
  readonly dpr: readonly [number, number];
  /** Céu usado como luz ambiente e reflexos (uma renderização, sem descarga). */
  readonly ambiente: boolean;
  /** Triângulos que as culturas instanciadas podem gastar, no máximo. */
  readonly triangulosCulturas: number;
  /** Tecto de triângulos da cena inteira, verificado pela QA. */
  readonly triangulos: number;
}

export const ORCAMENTO: Readonly<Record<Nivel, Orcamento>> = {
  leve: { modelos: false, sombras: 0, dpr: [1, 1], ambiente: false, triangulosCulturas: 0, triangulos: 40_000 },
  normal: { modelos: true, sombras: 1024, dpr: [1, 1.5], ambiente: true, triangulosCulturas: 60_000, triangulos: 150_000 },
  alta: { modelos: true, sombras: 2048, dpr: [1, 2], ambiente: true, triangulosCulturas: 150_000, triangulos: 300_000 },
};

export const NOME_NIVEL: Readonly<Record<EscolhaQualidade, string>> = {
  auto: 'Automática',
  leve: 'Leve',
  normal: 'Normal',
  alta: 'Alta',
};

export interface Sinais {
  /** `navigator.deviceMemory` (GB, arredondado; só nalguns navegadores). */
  readonly memoriaGB?: number;
  /** `navigator.hardwareConcurrency`. */
  readonly nucleos?: number;
  /** Ecrã táctil como ponteiro principal (telemóvel ou tablet). */
  readonly ponteiroGrosso: boolean;
  /** «Poupança de dados» ligada no navegador. */
  readonly poupancaDados: boolean;
}

/**
 * Leve: quem pediu para poupar dados, máquinas com 4 GB ou menos, e telemóveis
 * com 4 núcleos ou menos. Alta: 8 GB e 8 núcleos, com rato. O resto: Normal.
 * Sinais em falta (Safari e Firefox não dizem a memória) não sobem o nível.
 */
export function detectarNivel(s: Sinais): Nivel {
  if (s.poupancaDados) return 'leve';
  if (s.memoriaGB !== undefined && s.memoriaGB <= 4) return 'leve';
  if (s.ponteiroGrosso && (s.nucleos ?? 4) <= 4) return 'leve';
  if (!s.ponteiroGrosso && (s.memoriaGB ?? 0) >= 8 && (s.nucleos ?? 0) >= 8) return 'alta';
  return 'normal';
}

export function nivelEfectivo(escolha: EscolhaQualidade, s: Sinais): Nivel {
  return escolha === 'auto' ? detectarNivel(s) : escolha;
}

/** Um degrau abaixo, para quando a cena engasga. */
export function abaixo(n: Nivel): Nivel {
  return n === 'alta' ? 'normal' : 'leve';
}

/** O mais baixo de dois níveis. */
export function minimo(a: Nivel, b: Nivel): Nivel {
  return NIVEIS.indexOf(a) <= NIVEIS.indexOf(b) ? a : b;
}

/** Lê os sinais no navegador. Só chamar do lado do cliente. */
export function lerSinais(): Sinais {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return {
    memoriaGB: nav.deviceMemory,
    nucleos: nav.hardwareConcurrency || undefined,
    ponteiroGrosso: window.matchMedia('(pointer: coarse)').matches,
    poupancaDados: nav.connection?.saveData === true,
  };
}
