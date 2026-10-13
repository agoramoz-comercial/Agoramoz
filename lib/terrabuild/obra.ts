import type { Elemento, FaseId, Projeto } from '@/content/projetos/tipos';
import { orcamento, type Classe } from './custos';
import type { CasaConfig } from './quantidades';

/**
 * O estado da obra numa fase da linha temporal e as contas do capital.
 * Tudo derivado dos dados fictícios do projeto — o visualizador, a planta e o
 * assistente leem daqui para nunca contarem histórias diferentes.
 */

export type EstadoElemento = 'ausente' | 'em-obra' | 'concluido' | 'futuro';

export function estadoNaFase(e: Elemento, fase: FaseId): EstadoElemento {
  const [inicio, fim] = e.fases;
  if (fase < inicio) return 'ausente';
  if (e.futuro) return 'futuro';
  return fase >= fim ? 'concluido' : 'em-obra';
}

export interface ContagemFase {
  readonly ausentes: number;
  readonly emObra: number;
  readonly concluidos: number;
  readonly futuros: number;
}

export function contarNaFase(p: Projeto, fase: FaseId): ContagemFase {
  const c = { ausentes: 0, emObra: 0, concluidos: 0, futuros: 0 };
  for (const e of p.elementos) {
    const s = estadoNaFase(e, fase);
    if (s === 'ausente') c.ausentes++;
    else if (s === 'em-obra') c.emObra++;
    else if (s === 'concluido') c.concluidos++;
    else c.futuros++;
  }
  return c;
}

/** Custo de um elemento; a casa principal vem do orçamento do construtor. */
export function custoElemento(e: Elemento, casa: CasaConfig, classe: Classe = 'conceptual'): number {
  if (e.custo !== null) return e.custo;
  return orcamento(casa, classe).total;
}

export function capitalTotal(p: Projeto, casa: CasaConfig, ids?: readonly string[]): number {
  const conjunto = ids ? new Set(ids) : null;
  return p.elementos
    .filter((e) => !e.futuro && (!conjunto || conjunto.has(e.id)))
    .reduce((s, e) => s + custoElemento(e, casa), 0);
}

export interface ResumoCapital {
  readonly orcamento: number;
  readonly libertado: number;
  /** Progresso físico ponderado pelo orçamento de cada componente, em %. */
  readonly progresso: number;
  readonly concluidos: number;
  readonly emCurso: number;
  readonly porIniciar: number;
}

export function resumoCapital(p: Projeto): ResumoCapital {
  const orc = p.componentes.reduce((s, c) => s + c.orcamento, 0);
  const lib = p.componentes.reduce((s, c) => s + c.libertado, 0);
  const feito = p.componentes.reduce((s, c) => s + (c.orcamento * c.percentagem) / 100, 0);
  return {
    orcamento: orc,
    libertado: lib,
    progresso: orc === 0 ? 0 : (feito / orc) * 100,
    concluidos: p.componentes.filter((c) => c.estado === 'concluido').length,
    emCurso: p.componentes.filter((c) => c.estado === 'em-curso').length,
    porIniciar: p.componentes.filter((c) => c.estado === 'por-iniciar').length,
  };
}

/** Área de um elemento em m² (zero para linhas). */
export function areaElemento(e: Elemento): number {
  const f = e.forma;
  switch (f.tipo) {
    case 'caixa':
    case 'area':
    case 'painel':
      return f.r.w * f.r.d;
    case 'cilindro':
      return Math.PI * f.raio * f.raio;
    case 'linha':
      return 0;
  }
}

/** Hectares cultiváveis por talhão (os talhões ao ar livre e a estufa). */
export function hectaresPorTalhao(p: Projeto): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const e of p.elementos)
    if (e.camada === 'talhoes' && (/^t\d$/.test(e.id) || e.id === 'estufa')) out[e.id] = areaElemento(e) / 10_000;
  return out;
}
