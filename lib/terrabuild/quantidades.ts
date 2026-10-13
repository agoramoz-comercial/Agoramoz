/**
 * Mapa preliminar de quantidades da casa principal — o «AI Quantity Surveyor»
 * da demo, sem IA nenhuma: regras construtivas simples e à vista, para que
 * cada número se possa explicar. São REGRAS DEMONSTRATIVAS, não normativas;
 * numa versão real vêm de um medidor-orçamentista e de um modelo BIM.
 *
 * Cada linha diz a fórmula que a produziu. É isso que permite ao assistente
 * explicar uma variação sem inventar: a explicação sai das mesmas linhas.
 */

export const PAREDES = ['bloco-15', 'tijolo-macico', 'bloco-solo-cimento'] as const;
export const COBERTURAS = ['chapa-zinco', 'telha-ceramica', 'painel-sanduiche'] as const;
export const PAVIMENTOS = ['betonilha', 'mosaico'] as const;
export const ACABAMENTOS = ['basico', 'medio', 'superior'] as const;

export type Parede = (typeof PAREDES)[number];
export type Cobertura = (typeof COBERTURAS)[number];
export type Pavimento = (typeof PAVIMENTOS)[number];
export type Acabamento = (typeof ACABAMENTOS)[number];

export interface CasaConfig {
  /** Este-oeste, em metros. */
  readonly comprimento: number;
  /** Norte-sul, em metros. */
  readonly largura: number;
  readonly peDireito: number;
  readonly divisoes: number;
  readonly portas: number;
  readonly janelas: number;
  readonly parede: Parede;
  readonly cobertura: Cobertura;
  readonly pavimento: Pavimento;
  readonly acabamento: Acabamento;
  /** Implantação na grelha local (centro) e rotação em graus. */
  readonly x: number;
  readonly y: number;
  readonly rotacao: number;
}

export const LIMITES_CASA = {
  comprimento: [6, 20],
  largura: [5, 14],
  peDireito: [2.6, 3.6],
  divisoes: [2, 9],
  portas: [1, 10],
  janelas: [2, 16],
  rotacao: [-45, 45],
} as const;

export type Unidade = 'm²' | 'm³' | 'm' | 'kg' | 'sacos' | 'un' | 'L' | 'homem-dia';

export type Categoria =
  | 'fundacoes'
  | 'estrutura'
  | 'cobertura'
  | 'pavimento'
  | 'acabamentos'
  | 'caixilharia'
  | 'instalacoes'
  | 'mao-de-obra';

export interface LinhaQuantidade {
  readonly id: string;
  readonly material: string;
  readonly categoria: Categoria;
  readonly quantidade: number;
  readonly unidade: Unidade;
  readonly formula: string;
}

/** Medidas derivadas — também mostradas, porque são a base de tudo. */
export interface Medidas {
  readonly area: number;
  readonly perimetro: number;
  readonly paredesInternas: number;
  readonly areaVaos: number;
  readonly areaParedes: number;
  readonly betaoFundacao: number;
  readonly betaoLaje: number;
  readonly betaoLintel: number;
  readonly argamassa: number;
  readonly areaCobertura: number;
  readonly inclinacao: number;
}

const DESPERDICIO = 1.05;
const PORTA_M2 = 0.9 * 2.1;
const JANELA_M2 = 1.2 * 1.2;
const BEIRAL = 0.6;

export const INCLINACAO: Readonly<Record<Cobertura, number>> = {
  'chapa-zinco': 10,
  'telha-ceramica': 30,
  'painel-sanduiche': 8,
};

const POR_M2_PAREDE: Readonly<Record<Parede, number>> = {
  'bloco-15': 12.5,
  'tijolo-macico': 50,
  'bloco-solo-cimento': 16,
};

export const FATOR_ACABAMENTO: Readonly<Record<Acabamento, number>> = {
  basico: 1,
  medio: 1.3,
  superior: 1.75,
};

const arred = (n: number, casas = 1) => {
  const f = 10 ** casas;
  return Math.round(n * f) / f;
};

export function medidas(c: CasaConfig): Medidas {
  const area = c.comprimento * c.largura;
  const perimetro = 2 * (c.comprimento + c.largura);
  const paredesInternas = Math.max(0, c.divisoes - 1) * Math.min(c.comprimento, c.largura) * 0.7;
  const areaVaos = c.portas * PORTA_M2 + c.janelas * JANELA_M2;
  const areaParedes = Math.max(0, (perimetro + paredesInternas) * c.peDireito - areaVaos);
  const betaoFundacao = (perimetro + paredesInternas) * 0.45 * 0.5;
  const betaoLaje = area * 0.1;
  const betaoLintel = perimetro * 0.2 * 0.3;
  // Assentamento (2 cm por m² de parede) + reboco nas duas faces (1,5 cm).
  const argamassa = areaParedes * 0.02 + areaParedes * 2 * 0.015;
  const inclinacao = INCLINACAO[c.cobertura];
  const areaCobertura =
    ((c.comprimento + 2 * BEIRAL) * (c.largura + 2 * BEIRAL)) / Math.cos((inclinacao * Math.PI) / 180);
  return { area, perimetro, paredesInternas, areaVaos, areaParedes, betaoFundacao, betaoLaje, betaoLintel, argamassa, areaCobertura, inclinacao };
}

export function quantidades(c: CasaConfig): LinhaQuantidade[] {
  const m = medidas(c);
  const betao = m.betaoFundacao + m.betaoLaje + m.betaoLintel;
  const linhas: LinhaQuantidade[] = [
    {
      id: 'cimento',
      material: 'Cimento (sacos de 50 kg)',
      categoria: 'fundacoes',
      quantidade: Math.ceil(betao * 7 + m.argamassa * 6),
      unidade: 'sacos',
      formula: `betão ${arred(betao)} m³ × 7 + argamassa ${arred(m.argamassa)} m³ × 6`,
    },
    {
      id: 'areia',
      material: 'Areia',
      categoria: 'fundacoes',
      quantidade: arred(betao * 0.5 + m.argamassa * 1.1),
      unidade: 'm³',
      formula: `betão × 0,5 + argamassa × 1,1`,
    },
    {
      id: 'brita',
      material: 'Brita',
      categoria: 'fundacoes',
      quantidade: arred(betao * 0.8),
      unidade: 'm³',
      formula: `betão ${arred(betao)} m³ × 0,8`,
    },
    {
      id: 'aco',
      material: 'Aço (varão)',
      categoria: 'estrutura',
      quantidade: Math.ceil((m.betaoFundacao + m.betaoLintel) * 90 + m.betaoLaje * 40),
      unidade: 'kg',
      formula: '(fundação + lintel) × 90 kg/m³ + laje × 40 kg/m³',
    },
    {
      id: 'alvenaria',
      material:
        c.parede === 'bloco-15'
          ? 'Blocos de cimento 15 cm'
          : c.parede === 'tijolo-macico'
            ? 'Tijolo maciço'
            : 'Blocos de solo-cimento',
      categoria: 'estrutura',
      quantidade: Math.ceil(m.areaParedes * POR_M2_PAREDE[c.parede] * DESPERDICIO),
      unidade: 'un',
      formula: `paredes ${arred(m.areaParedes)} m² × ${POR_M2_PAREDE[c.parede]}/m² × 1,05`,
    },
    ...cobertura(c, m),
    {
      id: 'pavimento',
      material: c.pavimento === 'mosaico' ? 'Mosaico cerâmico' : 'Betonilha afagada',
      categoria: 'pavimento',
      quantidade: arred(m.area * (c.pavimento === 'mosaico' ? 1.08 : 1)),
      unidade: 'm²',
      formula: c.pavimento === 'mosaico' ? `área ${arred(m.area)} m² × 1,08` : `área ${arred(m.area)} m²`,
    },
    {
      id: 'tinta',
      material: 'Tinta (2 demãos)',
      categoria: 'acabamentos',
      quantidade: Math.ceil(((m.areaParedes * 2 + m.area) * 2) / 10),
      unidade: 'L',
      formula: '(paredes × 2 faces + teto) × 2 demãos ÷ 10 m²/L',
    },
    { id: 'portas', material: 'Portas', categoria: 'caixilharia', quantidade: c.portas, unidade: 'un', formula: 'configuração' },
    { id: 'janelas', material: 'Janelas', categoria: 'caixilharia', quantidade: c.janelas, unidade: 'un', formula: 'configuração' },
    {
      id: 'cabos',
      material: 'Cabos elétricos',
      categoria: 'instalacoes',
      quantidade: Math.ceil(m.area * 4),
      unidade: 'm',
      formula: `área × 4 m/m²`,
    },
    {
      id: 'tubagem',
      material: 'Tubagem de água e esgoto',
      categoria: 'instalacoes',
      quantidade: Math.ceil(m.area * 1.2 + 15),
      unidade: 'm',
      formula: 'área × 1,2 + 15 m de ligação',
    },
    {
      id: 'mao-de-obra',
      material: 'Mão-de-obra',
      categoria: 'mao-de-obra',
      quantidade: Math.ceil(m.area * 2.4 * FATOR_ACABAMENTO[c.acabamento]),
      unidade: 'homem-dia',
      formula: `área × 2,4 × acabamento ${FATOR_ACABAMENTO[c.acabamento]}`,
    },
  ];
  return linhas;
}

function cobertura(c: CasaConfig, m: Medidas): LinhaQuantidade[] {
  const a = arred(m.areaCobertura);
  const madeira = (fator: number): LinhaQuantidade => ({
    id: 'madeira',
    material: 'Madeira de estrutura da cobertura',
    categoria: 'cobertura',
    quantidade: arred(m.areaCobertura * fator, 2),
    unidade: 'm³',
    formula: `cobertura ${a} m² × ${fator} m³/m²`,
  });
  switch (c.cobertura) {
    case 'chapa-zinco':
      return [
        { id: 'chapas', material: 'Chapas de zinco', categoria: 'cobertura', quantidade: Math.ceil((m.areaCobertura / 2) * 1.1), unidade: 'un', formula: `cobertura ${a} m² ÷ 2 m²/chapa × 1,1` },
        madeira(0.025),
      ];
    case 'telha-ceramica':
      return [
        { id: 'telhas', material: 'Telha cerâmica', categoria: 'cobertura', quantidade: Math.ceil(m.areaCobertura * 16), unidade: 'un', formula: `cobertura ${a} m² × 16/m²` },
        madeira(0.035),
      ];
    case 'painel-sanduiche':
      return [
        { id: 'painel', material: 'Painel sanduíche', categoria: 'cobertura', quantidade: arred(m.areaCobertura * 1.05), unidade: 'm²', formula: `cobertura ${a} m² × 1,05` },
        madeira(0.012),
      ];
  }
}
