import { FASE_OPORTUNIDADE } from '@/lib/admin/labels';
import { formatarValor, MOTIVO_PERDA, TIPO_ACTIVIDADE } from './modelo';

/**
 * A cronologia de uma oportunidade em frases que uma pessoa lê, em vez de
 * `activity_type` e `metadata` em bruto. Os ids viram nomes da equipa; um
 * perfil que já não existe aparece como tal, nunca como UUID.
 */

export interface ActividadeCrua {
  readonly activity_type: string;
  readonly metadata: Record<string, unknown> | null;
  readonly body: string | null;
}

export function formatarQuando(iso: string): string {
  const d = new Date(iso);
  const dia = d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Africa/Maputo' });
  const hora = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Maputo' });
  return `${dia} · ${hora}`;
}

const fase = (f: unknown) => (typeof f === 'string' && f in FASE_OPORTUNIDADE ? FASE_OPORTUNIDADE[f as keyof typeof FASE_OPORTUNIDADE].texto : String(f ?? '—'));

const ORIGEM: Readonly<Record<string, string>> = {
  diagnostico_aprovado: 'Pelo diagnóstico aprovado',
  diagnostico_rejeitado: 'Pelo diagnóstico rejeitado',
};

export function descrever(a: ActividadeCrua, nomes: ReadonlyMap<string, string>): { titulo: string; detalhe?: string } {
  const m = a.metadata ?? {};
  const pessoa = (id: unknown) => (id ? (nomes.get(String(id)) ?? '(perfil removido)') : 'ninguém');
  switch (a.activity_type) {
    case 'fase': {
      const motivo = typeof m.motivo === 'string' && m.motivo in MOTIVO_PERDA ? MOTIVO_PERDA[m.motivo as keyof typeof MOTIVO_PERDA] : null;
      const origem = typeof m.origem === 'string' ? ORIGEM[m.origem] : undefined;
      return {
        titulo: `Fase: ${fase(m.de)} → ${fase(m.para)}`,
        detalhe: [motivo ? `Motivo: ${motivo}` : null, origem].filter(Boolean).join(' · ') || undefined,
      };
    }
    case 'atribuicao':
      return { titulo: `Responsável: ${pessoa(m.de)} → ${pessoa(m.para)}` };
    case 'proxima_accao':
      return m.quando
        ? { titulo: `Próxima acção: ${a.body ?? '—'}`, detalhe: `Para ${formatarQuando(String(m.quando))}` }
        : { titulo: 'Próxima acção retirada' };
    case 'dados': {
      const valor = m.valor === null || m.valor === undefined ? 'sem valor' : formatarValor(Number(m.valor), String(m.moeda ?? ''));
      const fecho = m.data_prevista_fecho
        ? ` · fecho previsto ${new Date(`${String(m.data_prevista_fecho)}T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'Africa/Maputo' })}`
        : '';
      return { titulo: 'Valor e fecho actualizados', detalhe: `${valor}${fecho}` };
    }
    default: {
      const titulo = TIPO_ACTIVIDADE[a.activity_type] ?? a.activity_type;
      if (a.activity_type.startsWith('reuniao_') && m.inicio) return { titulo, detalhe: formatarQuando(String(m.inicio)) };
      return { titulo };
    }
  }
}
