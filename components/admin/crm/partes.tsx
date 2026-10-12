import { AlertTriangle, CalendarClock, CalendarDays, CircleDashed, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { estadoProximaAccao, formatarValor, type EstadoAccao } from '@/lib/crm/modelo';
import { PASSO_0019 } from '@/lib/crm/activacao';

/**
 * Peças pequenas do CRM, partilhadas pela lista, pelo quadro, pela ficha e
 * pelo Hoje. Nenhuma depende só da cor: o estado da próxima acção é
 * sempre dito por extenso, com ícone, para leitores de ecrã e para quem não
 * distingue vermelho.
 */

export const ROTULO =
  'font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase';

export const CAMPO =
  'min-h-11 w-full rounded-[--radius-sm] border border-[color:var(--muted)] bg-[color:var(--surface)] px-3 text-sm';

const ESTADO: Readonly<Record<EstadoAccao, { texto: string; Icone: typeof Clock; classe: string }>> = {
  atrasada: {
    texto: 'Atrasada',
    Icone: AlertTriangle,
    classe: 'border-[color:var(--color-signal-700)] bg-[color:var(--color-signal-700)] text-[color:var(--color-chalk)]',
  },
  hoje: { texto: 'Hoje', Icone: Clock, classe: 'border-[color:var(--color-signal-700)] text-[color:var(--color-signal-700)]' },
  semana: { texto: 'Esta semana', Icone: CalendarClock, classe: 'border-[color:var(--border)] text-[color:var(--on-surface)]' },
  futura: { texto: 'Agendada', Icone: CalendarDays, classe: 'border-[color:var(--border)] text-[color:var(--muted)]' },
  sem: { texto: 'Sem próxima acção', Icone: CircleDashed, classe: 'border-dashed border-[color:var(--border)] text-[color:var(--muted)]' },
};

export function quandoCurto(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Maputo',
  });
}

/** O estado da próxima acção (atrasada, hoje, …), com a data e, se pedido, a descrição. */
export function ProximaAccao({
  quando,
  accao,
  agora,
  compacta = false,
}: {
  quando: string | null;
  accao: string | null;
  agora: Date;
  compacta?: boolean;
}) {
  const estado = estadoProximaAccao(quando, agora);
  const { texto, Icone, classe } = ESTADO[estado];
  return (
    <span className="flex flex-col items-start gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[--radius-xs] border px-2 py-0.5 font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] uppercase',
          classe,
        )}
      >
        <Icone aria-hidden className="size-3" />
        {texto}
        {quando ? (
          <time dateTime={new Date(quando).toISOString()} className="tabular-nums normal-case">
            · {quandoCurto(quando)}
          </time>
        ) : null}
      </span>
      {accao && !compacta ? <span className="text-sm">{accao}</span> : null}
    </span>
  );
}

export function Valor({ valor, moeda }: { valor: number | null; moeda: string | null }) {
  if (valor === null || !moeda) return <span className="text-[color:var(--muted)]">—</span>;
  return <span className="tabular-nums">{formatarValor(valor, moeda)}</span>;
}

export function Dias({ dias }: { dias: number | null }) {
  if (dias === null) return <span className="text-[color:var(--muted)]">—</span>;
  return <span className="tabular-nums">{dias === 1 ? '1 dia' : `${dias} dias`}</span>;
}

/** O aviso honesto de que a 0019 ainda não está na base: diz o que falta e quem o faz. */
export function PorActivar({ o }: { o: string }) {
  return (
    <div role="note" className="mb-6 border border-dashed border-[color:var(--border)] px-4 py-3 text-sm">
      <p className="font-medium">{o} — por activar.</p>
      <p className="mt-1 text-[color:var(--muted)]">{PASSO_0019}</p>
    </div>
  );
}

/** As confirmações das acções do CRM (`?ok=`), iguais na lista, no quadro, na ficha e no Hoje. */
export const TEXTOS_OK_CRM = {
  fase: 'Fase actualizada.',
  minha: 'A oportunidade é agora sua.',
  proxima: 'Próxima acção guardada.',
  'proxima-limpa': 'Próxima acção retirada.',
  dados: 'Valor e fecho guardados.',
  perdida: 'Oportunidade marcada como perdida.',
  actividade: 'Registado na cronologia.',
  atribuida: 'Responsável actualizado.',
} as const;
