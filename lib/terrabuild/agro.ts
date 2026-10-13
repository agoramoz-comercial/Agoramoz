import type { Cultura, Projeto } from '@/content/projetos/tipos';
import { cantos } from './geometria';
import { altura, COTA_CHEIA } from './terreno';

/**
 * Motor agrícola da demo. Os coeficientes por cultura (rendimento, preço,
 * água, custos) são FICTÍCIOS e servem para mostrar o encadeamento:
 * área → produção → receita → margem → equilíbrio, e água pedida contra água
 * disponível. Numa versão real vêm de análise de solo, histórico climático,
 * dados de mercado e do agrónomo — e o painel diz isso.
 */

export const CENARIOS_AGRO = ['pessimista', 'base', 'otimista'] as const;
export type CenarioAgro = (typeof CENARIOS_AGRO)[number];

export const FATORES_AGRO: Readonly<Record<CenarioAgro, { rendimento: number; preco: number; nome: string }>> = {
  pessimista: { rendimento: 0.7, preco: 0.85, nome: 'Pessimista' },
  base: { rendimento: 1, preco: 1, nome: 'Base' },
  otimista: { rendimento: 1.15, preco: 1.05, nome: 'Otimista' },
};

/** Dias por ano em que o furo bombeia (manutenção e paragens descontadas). */
export const DIAS_BOMBAGEM = 300;

export interface ResultadoCultura {
  readonly cultura: string;
  readonly nome: string;
  readonly hectares: number;
  readonly producaoT: number;
  readonly receita: number;
  readonly custoAnual: number;
  readonly instalacao: number;
  readonly margem: number;
  /** MZN/kg a partir do qual a cultura paga os seus custos anuais. */
  readonly precoEquilibrio: number | null;
  readonly aguaM3: number;
}

export function simularCultura(c: Cultura, hectares: number, cenario: CenarioAgro = 'base', fatorRendimento = 1): ResultadoCultura {
  const f = FATORES_AGRO[cenario];
  const producaoT = c.rendimento * hectares * c.ciclosAno * f.rendimento * fatorRendimento;
  const receita = producaoT * 1000 * c.preco * f.preco;
  const custoAnual = c.opex * hectares * c.ciclosAno;
  return {
    cultura: c.id,
    nome: c.nome,
    hectares,
    producaoT,
    receita,
    custoAnual,
    instalacao: c.instalacao * hectares,
    margem: receita - custoAnual,
    precoEquilibrio: producaoT > 0 ? custoAnual / (producaoT * 1000) : null,
    aguaM3: c.agua * hectares * c.ciclosAno,
  };
}

export interface BalancoAgua {
  readonly necessidade: number;
  readonly oferta: number;
  /** Oferta / necessidade, em %. Acima de 100 % sobra água. */
  readonly cobertura: number;
  /** Dias de rega que o reservatório cheio garante sem o furo. */
  readonly autonomiaDias: number;
}

export function balancoAgua(p: Projeto, necessidadeAnual: number): BalancoAgua {
  const oferta = p.agua.furoM3Dia * DIAS_BOMBAGEM;
  const diaria = necessidadeAnual / 365;
  return {
    necessidade: necessidadeAnual,
    oferta,
    cobertura: necessidadeAnual === 0 ? 100 : (oferta / necessidadeAnual) * 100,
    autonomiaDias: diaria === 0 ? Infinity : p.agua.reservatorioM3 / diaria,
  };
}

/** Fração de um talhão abaixo da cota de cheia, amostrada a cada 5 m. */
export function fracaoCheiaTalhao(p: Projeto, talhaoId: string): number {
  const e = p.elementos.find((x) => x.id === talhaoId);
  if (!e || (e.forma.tipo !== 'area' && e.forma.tipo !== 'caixa')) return 0;
  const [a, , c] = cantos(e.forma.r);
  const [x0, x1] = [Math.min(a![0], c![0]), Math.max(a![0], c![0])];
  const [y0, y1] = [Math.min(a![1], c![1]), Math.max(a![1], c![1])];
  let n = 0;
  let baixo = 0;
  for (let x = x0 + 2.5; x < x1; x += 5)
    for (let y = y0 + 2.5; y < y1; y += 5) {
      n++;
      if (altura(p.terreno, x, y) < COTA_CHEIA) baixo++;
    }
  return n === 0 ? 0 : baixo / n;
}

export type NivelRisco = 'baixo' | 'medio' | 'alto';

export interface RiscoClimatico {
  readonly seca: number;
  readonly cheia: number;
  readonly indice: number;
  readonly nivel: NivelRisco;
}

/**
 * Seca: sensibilidade da cultura × água em falta. Cheia: sensibilidade × parte
 * do talhão em cota baixa. O índice é a média; os limiares são da demo.
 */
export function riscoClimatico(c: Cultura, coberturaAgua: number, fracaoCheia: number): RiscoClimatico {
  const falta = Math.max(0, 1 - coberturaAgua / 100);
  const seca = c.sensibilidadeSeca * falta;
  const cheia = c.sensibilidadeCheia * fracaoCheia;
  const indice = (seca + cheia) / 2;
  return { seca, cheia, indice, nivel: indice < 0.15 ? 'baixo' : indice < 0.35 ? 'medio' : 'alto' };
}
