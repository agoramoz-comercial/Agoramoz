import { estadoProximaAccao, estaParada, FASES_FECHADAS } from './modelo';
import { totaisPorMoeda, type OportunidadePipeline } from './pipeline';

/**
 * O bloco «por responsável» do painel: a carga e o resultado de cada pessoa,
 * para o fundador ver de relance quem está sobrecarregado, quem tem acções
 * atrasadas e o que ficou sem dono. Cada número leva ao pipeline filtrado.
 *
 * Sem a 0019 (sem `fase_desde` nem última actividade), «ganhas no período» e
 * «paradas» ficam `null` — nunca um zero inventado.
 */

export interface LinhaResponsavel {
  /** UUID da pessoa, ou `sem` para as oportunidades sem dono. */
  readonly id: string;
  readonly nome: string;
  readonly activo: boolean;
  readonly abertas: number;
  readonly atrasadas: number;
  readonly paradas: number | null;
  readonly ganhas: number | null;
  readonly valor: readonly { moeda: string; total: number }[];
}

const aberta = (o: OportunidadePipeline) => !(FASES_FECHADAS as readonly string[]).includes(o.stage);

export function porResponsavel(
  itens: readonly OportunidadePipeline[],
  equipa: readonly { id: string; nome: string; activo: boolean }[],
  agora: Date,
  inicio: Date,
  crmActivo: boolean,
): LinhaResponsavel[] {
  const nomes = new Map(equipa.map((p) => [p.id, p]));
  // As activas sempre (mesmo a zero: «sem nada» também é informação); as
  // inactivas só se ainda tiverem oportunidades.
  const ids = new Set([...equipa.filter((p) => p.activo).map((p) => p.id), ...itens.flatMap((o) => (o.owner_id ? [o.owner_id] : []))]);

  const linha = (id: string, nome: string, activo: boolean, deles: readonly OportunidadePipeline[]): LinhaResponsavel => {
    const abertas = deles.filter(aberta);
    return {
      id,
      nome,
      activo,
      abertas: abertas.length,
      atrasadas: abertas.filter((o) => estadoProximaAccao(o.next_action_at, agora) === 'atrasada').length,
      paradas: crmActivo ? abertas.filter((o) => estaParada(o.ultima_actividade, agora)).length : null,
      ganhas: crmActivo
        ? deles.filter((o) => o.stage === 'ganho' && o.fase_desde !== null && Date.parse(o.fase_desde) >= inicio.getTime() && Date.parse(o.fase_desde) <= agora.getTime()).length
        : null,
      valor: totaisPorMoeda(abertas),
    };
  };

  const linhas = [...ids].map((id) => {
    const p = nomes.get(id);
    return linha(id, p?.nome ?? '(perfil removido)', p?.activo ?? false, itens.filter((o) => o.owner_id === id));
  });
  linhas.sort((a, b) => b.abertas - a.abertas || a.nome.localeCompare(b.nome, 'pt'));

  const semDono = itens.filter((o) => o.owner_id === null && aberta(o));
  return semDono.length > 0 ? [...linhas, linha('sem', 'Sem dono', true, semDono)] : linhas;
}
