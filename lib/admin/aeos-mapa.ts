import { CADENCIA, FASES, RED_TEAM, REGISTO, aeosVisivel, type Permissoes } from './aeos';
import { AGENTES, type AccaoAgente } from './agentes';

/**
 * O Mapa AEOS em leque: nó central → categorias (com contagens) → itens.
 * Todos os números são contagens do próprio documento AGZ-ORG-001, dos 24
 * contratos ZABATAINA e das acções registadas pelos agentes. Quando não há
 * dado, o valor é `null` e o ecrã mostra «—»: nunca um zero inventado.
 */

export type CategoriaId = 'blocos' | 'paineis' | 'agentes' | 'fases' | 'riscos' | 'cadencia';

export interface Kpi {
  readonly rotulo: string;
  readonly valor: number | null;
}

export interface ItemMapa {
  readonly id: string;
  readonly titulo: string;
  /** Pastilha de estado; `null` quando o documento não diz. */
  readonly estado: { readonly rotulo: string; readonly tom: 'ok' | 'aviso' | 'vazio' } | null;
  readonly resumo: string;
  readonly href: string | null;
  readonly kpis: readonly [Kpi, Kpi, Kpi, Kpi];
  /** Métrica com mini-barras; `null` se não houver nada para medir. */
  readonly metrica: { readonly rotulo: string; readonly valor: number | null; readonly barras: readonly number[] } | null;
  readonly notas: readonly string[];
}

export interface CategoriaMapa {
  readonly id: CategoriaId;
  readonly rotulo: string;
  readonly itens: readonly ItemMapa[];
}

export interface MapaLeque {
  readonly centro: { readonly titulo: string; readonly subtitulo: string };
  readonly categorias: readonly CategoriaMapa[];
}

const sem = (rotulo: string): Kpi => ({ rotulo, valor: null });
const k = (rotulo: string, valor: number): Kpi => ({ rotulo, valor });

export function mapaLeque(permite: Permissoes, accoes: readonly AccaoAgente[] | null): MapaLeque {
  const { blocos, paineis } = aeosVisivel(permite);
  const pendentes = (agente: string): number | null =>
    accoes ? accoes.filter((a) => a.agente === agente && a.estado === 'precisa_aprovacao').length : null;
  const doAgente = (agente: string): number | null => (accoes ? accoes.filter((a) => a.agente === agente).length : null);

  const itensBlocos: ItemMapa[] = blocos.map((b) => {
    const ecras = b.noAdmin.length;
    const falta = b.porConstruir.length;
    const agentes = AGENTES.filter((a) => a.blocos.includes(b.n)).length;
    const total = ecras + falta;
    return {
      id: `bloco-${b.n}`,
      titulo: b.nome,
      estado:
        ecras === 0
          ? { rotulo: 'Por construir', tom: 'vazio' }
          : falta === 0
            ? { rotulo: 'Com ecrã', tom: 'ok' }
            : { rotulo: 'Parcial', tom: 'aviso' },
      resumo: b.missao,
      href: b.noAdmin[0]?.href ?? null,
      kpis: [k('Áreas', b.areas.length), k('Ecrãs no admin', ecras), k('Por construir', falta), k('Agentes', agentes)],
      metrica: total > 0 ? { rotulo: 'Cobertura no admin', valor: Math.round((ecras / total) * 100), barras: [ecras, falta] } : null,
      notas: falta > 0 ? b.porConstruir.map((p) => `Por construir: ${p}`) : [],
    };
  });

  const itensPaineis: ItemMapa[] = paineis.map((p) => ({
    id: `painel-${p.n}`,
    titulo: p.nome,
    estado: p.estado === 'parcial' ? { rotulo: 'Parcial', tom: 'aviso' } : { rotulo: 'Por construir', tom: 'vazio' },
    resumo: `Indicadores: ${p.indicadores.join(', ')}.`,
    href: p.noAdmin[0]?.href ?? null,
    kpis: [k('Indicadores', p.indicadores.length), k('Ecrãs no admin', p.noAdmin.length), sem('Cobertos'), sem('Com meta')],
    metrica: null,
    notas: [],
  }));

  const itensAgentes: ItemMapa[] = AGENTES.map((a) => {
    const pend = pendentes(a.id);
    return {
      id: `agente-${a.id}`,
      titulo: `${a.id} · ${a.papel}`,
      estado:
        pend === null
          ? null
          : pend > 0
            ? { rotulo: `${pend} por aprovar`, tom: 'aviso' }
            : { rotulo: 'Sem pendentes', tom: 'ok' },
      resumo: a.objectivo,
      href: null,
      kpis: [k('Módulos', a.modulos.length), k('Entradas', a.entradas.length), k('Proibições', a.proibidas.length), { rotulo: 'Propostas', valor: doAgente(a.id) }],
      metrica: null,
      notas: [`Módulos: ${a.modulos.join(', ')}`, `Saída: ${a.saida}`, `Escala para: ${a.escalacao}`, ...a.proibidas.map((p) => `Proibido: ${p}`)],
    };
  });

  const itensFases: ItemMapa[] = FASES.map((f, i) => ({
    id: `fase-${i + 1}`,
    titulo: f.nome,
    estado: null,
    resumo: `${f.prazo}. Gate: ${f.gate}`,
    href: null,
    kpis: [sem('Tarefas'), sem('Verificadas'), sem('Bloqueadas'), sem('Dias')],
    metrica: null,
    notas: [],
  }));

  const itensRiscos: ItemMapa[] = RED_TEAM.map((r, i) => ({
    id: `risco-${i + 1}`,
    titulo: r.falha,
    estado: null,
    resumo: `Sinal: ${r.sinal}`,
    href: null,
    kpis: [sem('Ocorrências'), sem('Responsável'), sem('Mitigações'), sem('Revisões')],
    metrica: null,
    notas: [],
  }));

  const itensCadencia: ItemMapa[] = CADENCIA.map((c, i) => ({
    id: `cadencia-${i + 1}`,
    titulo: c.quando,
    estado: null,
    resumo: `${c.duracao}. ${c.foco}`,
    href: null,
    kpis: [sem('Sessões'), sem('Decisões'), sem('Bloqueios'), sem('Acções')],
    metrica: null,
    notas: [],
  }));

  return {
    centro: { titulo: 'AEOS', subtitulo: REGISTO.estado },
    categorias: [
      { id: 'blocos', rotulo: 'Blocos', itens: itensBlocos },
      { id: 'paineis', rotulo: 'Painéis', itens: itensPaineis },
      { id: 'agentes', rotulo: 'Agentes ZABATAINA', itens: itensAgentes },
      { id: 'fases', rotulo: 'Fases', itens: itensFases },
      { id: 'riscos', rotulo: 'Riscos (Red Team)', itens: itensRiscos },
      { id: 'cadencia', rotulo: 'Cadência', itens: itensCadencia },
    ],
  };
}

/** O contexto só de leitura que vai ao modelo: o item, sem nada da base além das contagens. */
export function contextoDoItem(mapa: MapaLeque, itemId: string): string | null {
  for (const c of mapa.categorias) {
    const it = c.itens.find((i) => i.id === itemId);
    if (it)
      return JSON.stringify({
        categoria: c.rotulo,
        item: it.titulo,
        estado: it.estado?.rotulo ?? null,
        resumo: it.resumo,
        indicadores: it.kpis.map((x) => ({ [x.rotulo]: x.valor })),
        notas: it.notas.slice(0, 12),
        documento: REGISTO,
      });
  }
  return null;
}
