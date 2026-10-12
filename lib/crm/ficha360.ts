import { descrever, type ActividadeCrua } from './cronologia';

/**
 * As peças puras das fichas 360 (contacto e organização): o estado do
 * consentimento por finalidade e a linha temporal que junta, num só fio,
 * o que aconteceu em todas as oportunidades, respostas, consentimentos e
 * reuniões ligadas a uma pessoa ou empresa.
 */

export interface RegistoConsentimento {
  readonly id: string;
  readonly purpose: string;
  readonly granted: boolean;
  readonly consent_text: string;
  readonly consent_version: string;
  readonly captured_at: string;
  readonly withdrawn_at: string | null;
}

/** As finalidades que a base grava (0009 e 0013), ditas por extenso. */
export const FINALIDADE: Readonly<Record<string, string>> = {
  'diagnostico-comercial': 'Contacto comercial (diagnóstico)',
  inquerito: 'Inquérito',
};

export function rotuloFinalidade(f: string): string {
  return FINALIDADE[f] ?? f;
}

export type EstadoConsentimento = 'concedido' | 'retirado' | 'recusado';

export interface ConsentimentoActual {
  readonly finalidade: string;
  readonly estado: EstadoConsentimento;
  readonly desde: string;
  readonly versao: string;
  readonly registos: number;
}

/** Por finalidade, vale o registo mais recente; uma retirada conta a partir da data em que foi feita. */
export function estadoConsentimento(registos: readonly RegistoConsentimento[]): ConsentimentoActual[] {
  const porFinalidade = new Map<string, RegistoConsentimento[]>();
  for (const r of registos) porFinalidade.set(r.purpose, [...(porFinalidade.get(r.purpose) ?? []), r]);
  return [...porFinalidade.entries()]
    .map(([finalidade, rs]) => {
      const ultimo = [...rs].sort((a, b) => Date.parse(b.captured_at) - Date.parse(a.captured_at))[0]!;
      const estado: EstadoConsentimento = !ultimo.granted ? 'recusado' : ultimo.withdrawn_at ? 'retirado' : 'concedido';
      return {
        finalidade,
        estado,
        desde: estado === 'retirado' ? ultimo.withdrawn_at! : ultimo.captured_at,
        versao: ultimo.consent_version,
        registos: rs.length,
      };
    })
    .sort((a, b) => a.finalidade.localeCompare(b.finalidade));
}

export interface OportunidadeLigada {
  readonly id: string;
  readonly stage: string;
  readonly owner_id: string | null;
  readonly next_action_at: string | null;
  readonly proxima_accao: string | null;
  readonly valor: number | null;
  readonly moeda: string | null;
  readonly created_at: string;
  readonly contacto?: string;
}

/** As reuniões entram pelas actividades que o Cal regista (marcada, remarcada…), uma vez cada. */
export type TipoEvento = 'actividade' | 'resposta' | 'consentimento' | 'oportunidade';

export interface Evento {
  readonly id: string;
  readonly quando: string;
  readonly tipo: TipoEvento;
  readonly titulo: string;
  readonly detalhe?: string;
  readonly href?: string;
  /** A que oportunidade pertence, quando pertence (para dizer «em: Fulano»). */
  readonly contexto?: string;
}

export interface Fontes {
  readonly actividades: readonly (ActividadeCrua & { id: number; occurred_at: string; deal_id: string | null; contexto?: string })[];
  readonly respostas: readonly { id: string; submitted_at: string; diagnostico: { id: string; tier: string; score: number } | null; contexto?: string }[];
  readonly consentimentos: readonly RegistoConsentimento[];
  readonly oportunidades: readonly { id: string; created_at: string; contexto?: string }[];
}

const MAX = 200;

/** Tudo num só fio, do mais recente para o mais antigo; nunca mais de 200 entradas. */
export function linhaTemporal(f: Fontes, nomes: ReadonlyMap<string, string>): Evento[] {
  const eventos: Evento[] = [
    ...f.actividades.map((a) => {
      const { titulo, detalhe } = descrever(a, nomes);
      return {
        id: `act:${a.id}`,
        quando: a.occurred_at,
        tipo: 'actividade' as const,
        titulo,
        detalhe: [detalhe, a.body && a.activity_type !== 'proxima_accao' ? a.body : undefined].filter(Boolean).join(' — ') || undefined,
        href: a.deal_id ? `/admin/oportunidades/${a.deal_id}` : undefined,
        contexto: a.contexto,
      };
    }),
    ...f.respostas.map((r) => ({
      id: `resp:${r.id}`,
      quando: r.submitted_at,
      tipo: 'resposta' as const,
      titulo: 'Submeteu o diagnóstico',
      detalhe: r.diagnostico ? `${r.diagnostico.tier} · ${r.diagnostico.score} pontos` : undefined,
      href: r.diagnostico ? `/admin/diagnosticos/${r.diagnostico.id}` : undefined,
      contexto: r.contexto,
    })),
    ...f.consentimentos.flatMap((c) => {
      const dado: Evento = {
        id: `cons:${c.id}`,
        quando: c.captured_at,
        tipo: 'consentimento',
        titulo: c.granted ? `Consentimento dado: ${rotuloFinalidade(c.purpose)}` : `Consentimento recusado: ${rotuloFinalidade(c.purpose)}`,
        detalhe: `versão ${c.consent_version}`,
      };
      return c.withdrawn_at
        ? [dado, { id: `cons-r:${c.id}`, quando: c.withdrawn_at, tipo: 'consentimento' as const, titulo: `Consentimento retirado: ${rotuloFinalidade(c.purpose)}` }]
        : [dado];
    }),
    ...f.oportunidades.map((o) => ({
      id: `op:${o.id}`,
      quando: o.created_at,
      tipo: 'oportunidade' as const,
      titulo: 'Oportunidade criada',
      href: `/admin/oportunidades/${o.id}`,
      contexto: o.contexto,
    })),
  ];
  return eventos.sort((a, b) => Date.parse(b.quando) - Date.parse(a.quando)).slice(0, MAX);
}
