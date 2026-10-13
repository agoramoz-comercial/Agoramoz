import type { Cenario, Projeto } from '@/content/projetos/tipos';
import { balancoAgua, simularCultura } from './agro';
import { capitalTotal } from './obra';
import type { Classe } from './custos';
import type { CasaConfig } from './quantidades';

/**
 * Cenários A/B/C lado a lado. Os fatores de energia e de emissões são
 * FICTÍCIOS e ficam declarados aqui, à vista, em vez de escondidos num número
 * final: horas equivalentes de sol por ano e o gasóleo que a energia solar
 * substituiria.
 */

export const KWH_POR_KWP = 1_600;
export const KG_CO2_POR_KWH_GASOLEO = 0.7;

export interface ResultadoCenario {
  readonly id: Cenario['id'];
  readonly nome: string;
  readonly investimento: number;
  readonly custosAnuais: number;
  readonly producaoT: number;
  readonly receita: number;
  readonly margemAnual: number;
  /** Anos para recuperar o investimento sem desconto; `null` se a margem não é positiva. */
  readonly retornoAnos: number | null;
  readonly empregos: number;
  readonly aguaM3: number;
  /** Água do furo a dividir pela necessidade do cenário, em %. */
  readonly coberturaAgua: number;
  readonly energiaKwh: number;
  readonly emissoesEvitadasT: number;
  readonly risco: Cenario['risco'];
}

export function avaliarCenario(p: Projeto, cen: Cenario, casa: CasaConfig, classe: Classe = 'conceptual'): ResultadoCenario {
  const culturas = cen.culturas.map(({ cultura, hectares }) => {
    const c = p.culturas.find((x) => x.id === cultura);
    if (!c) throw new Error(`Cultura desconhecida no cenário ${cen.id}: ${cultura}`);
    return simularCultura(c, hectares, 'base', cen.fatorRendimento);
  });
  const instalacao = culturas.reduce((s, r) => s + r.instalacao, 0);
  const investimento = capitalTotal(p, casa, cen.elementos, classe) + cen.extras.reduce((s, x) => s + x.custo, 0) + instalacao;
  const receita = culturas.reduce((s, r) => s + r.receita, 0) + cen.receitaExtraAnual;
  const custosAnuais = culturas.reduce((s, r) => s + r.custoAnual, 0) + cen.opexAnual;
  const margemAnual = receita - custosAnuais;
  const energiaKwh = cen.solarKwp * KWH_POR_KWP;
  return {
    id: cen.id,
    nome: cen.nome,
    investimento,
    custosAnuais,
    producaoT: culturas.reduce((s, r) => s + r.producaoT, 0),
    receita,
    margemAnual,
    retornoAnos: margemAnual > 0 ? investimento / margemAnual : null,
    empregos: cen.empregos,
    aguaM3: culturas.reduce((s, r) => s + r.aguaM3, 0),
    coberturaAgua: balancoAgua(p, culturas.reduce((s, r) => s + r.aguaM3, 0)).cobertura,
    energiaKwh,
    emissoesEvitadasT: (energiaKwh * KG_CO2_POR_KWH_GASOLEO) / 1000,
    risco: cen.risco,
  };
}

export function avaliarCenarios(p: Projeto, casa: CasaConfig, classe: Classe = 'conceptual'): ResultadoCenario[] {
  return p.cenarios.map((c) => avaliarCenario(p, c, casa, classe));
}
