import { NOME_CATEGORIA, orcamento, type CategoriaCusto, type Classe } from './custos';
import { mzn, num } from './formato';
import { ACABAMENTOS, type CasaConfig } from './quantidades';

/**
 * O que mudou entre duas versões da casa, e porquê o custo mexeu.
 *
 * A frase é montada a partir das categorias que mais variaram — os mesmos
 * números da tabela. Nada aqui é «explicado» por um modelo: é aritmética
 * dita em português, e por isso não pode alucinar.
 */

export interface Fator {
  readonly categoria: CategoriaCusto;
  readonly nome: string;
  readonly delta: number;
}

export interface Variacao {
  readonly antes: number;
  readonly depois: number;
  readonly delta: number;
  /** Em %, relativo a `antes`. */
  readonly percentagem: number;
  readonly fatores: readonly Fator[];
  readonly mudancas: readonly string[];
  readonly frase: string;
}

const NOMES_PAREDE = { 'bloco-15': 'blocos de cimento', 'tijolo-macico': 'tijolo maciço', 'bloco-solo-cimento': 'blocos de solo-cimento' } as const;
const NOMES_COBERTURA = { 'chapa-zinco': 'chapa de zinco', 'telha-ceramica': 'telha cerâmica', 'painel-sanduiche': 'painel sanduíche' } as const;
const NOMES_ACABAMENTO = { basico: 'básico', medio: 'médio', superior: 'superior' } as const;

export function mudancas(a: CasaConfig, b: CasaConfig): string[] {
  const out: string[] = [];
  const areaA = a.comprimento * a.largura;
  const areaB = b.comprimento * b.largura;
  if (Math.abs(areaA - areaB) >= 0.5) out.push(`${areaB > areaA ? 'aumentar' : 'reduzir'} a casa de ${num(areaA)} m² para ${num(areaB)} m²`);
  // A mesma área com outra forma muda o perímetro, logo as paredes e o custo.
  else if (a.comprimento !== b.comprimento || a.largura !== b.largura)
    out.push(`mudar as dimensões para ${num(b.comprimento, 1)} × ${num(b.largura, 1)} m (mesma área)`);
  if (a.peDireito !== b.peDireito) out.push(`mudar o pé-direito para ${num(b.peDireito, 1)} m`);
  if (a.divisoes !== b.divisoes) out.push(`passar a ${b.divisoes} divisões`);
  if (a.portas !== b.portas || a.janelas !== b.janelas) out.push(`passar a ${b.portas} portas e ${b.janelas} janelas`);
  if (a.parede !== b.parede) out.push(`trocar as paredes para ${NOMES_PAREDE[b.parede]}`);
  if (a.cobertura !== b.cobertura) out.push(`trocar a cobertura para ${NOMES_COBERTURA[b.cobertura]}`);
  if (a.pavimento !== b.pavimento) out.push(`trocar o pavimento para ${b.pavimento === 'mosaico' ? 'mosaico' : 'betonilha'}`);
  if (a.acabamento !== b.acabamento) {
    const sobe = ACABAMENTOS.indexOf(b.acabamento) > ACABAMENTOS.indexOf(a.acabamento);
    out.push(`${sobe ? 'subir' : 'baixar'} o acabamento para ${NOMES_ACABAMENTO[b.acabamento]}`);
  }
  return out;
}

function lista(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

export function compararVersoes(a: CasaConfig, b: CasaConfig, classe: Classe = 'conceptual'): Variacao {
  const oa = orcamento(a, classe);
  const ob = orcamento(b, classe);
  const delta = ob.total - oa.total;
  const percentagem = oa.total === 0 ? 0 : (delta / oa.total) * 100;
  const fatores = (Object.keys(ob.porCategoria) as CategoriaCusto[])
    .filter((k) => k !== 'contingencia' && k !== 'transporte')
    .map((k) => ({ categoria: k, nome: NOME_CATEGORIA[k], delta: ob.porCategoria[k] - oa.porCategoria[k] }))
    .filter((f) => f.delta !== 0)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
    .slice(0, 3);
  const m = mudancas(a, b);

  let frase: string;
  if (m.length === 0) {
    frase = 'A configuração é igual à de referência: o custo preliminar não mudou.';
  } else {
    const sentido = delta > 0 ? 'subiu' : delta < 0 ? 'desceu' : 'ficou igual';
    const pct = Math.abs(Math.round(percentagem));
    const quanto = delta === 0 ? '' : ` ${pct} % (${delta > 0 ? '+' : '−'}${mzn(Math.abs(delta))})`;
    const porque = fatores.length
      ? ` ${fatores.length === 1 ? 'O principal fator foi' : 'Os principais fatores foram'} ${lista(fatores.map((f) => f.nome.toLowerCase()))}.`
      : '';
    frase = `Ao ${lista(m)}, o custo preliminar ${sentido}${quanto}.${porque}`;
  }
  return { antes: oa.total, depois: ob.total, delta, percentagem, fatores, mudancas: m, frase };
}
