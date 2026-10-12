import { CANAL, FASE_OPORTUNIDADE, type FaseOportunidade } from '@/lib/admin/labels';
import type { Canal } from '@/lib/attribution/types';
import { BOM, linha } from '@/lib/inqueritos/csv';
import type { OportunidadePipeline } from './pipeline';

/**
 * As listas do CRM em CSV — puro, testado. Reutiliza a célula segura dos
 * inquéritos: separador `;` (Excel em português), BOM UTF-8 e protecção contra
 * fórmulas (`=`, `+`, `-`, `@` no início passam a texto).
 *
 * Datas em ISO 8601 no fuso de Maputo e valores com ponto decimal: o ficheiro
 * é para ser trabalhado numa folha de cálculo, não lido como relatório.
 */

const dataHora = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Africa/Maputo', hour12: false }).slice(0, 16)
    : '';

export function csvOportunidades(itens: readonly OportunidadePipeline[], nomes: ReadonlyMap<string, string>): string {
  const cab = linha([
    'Contacto',
    'Organização',
    'Fase',
    'Responsável',
    'Próxima acção',
    'Data da próxima acção',
    'Valor',
    'Moeda',
    'Classificação',
    'Pontuação',
    'Canal',
    'Campanha',
    'Última actividade',
    'Criada',
    'Id',
  ]);
  const corpo = itens
    .map((o) =>
      linha([
        o.contacto?.nome ?? '',
        o.organizacao?.nome ?? '',
        FASE_OPORTUNIDADE[o.stage as FaseOportunidade]?.texto ?? o.stage,
        o.owner_id ? (nomes.get(o.owner_id) ?? '(perfil removido)') : '',
        o.proxima_accao ?? '',
        dataHora(o.next_action_at),
        o.valor === null ? '' : o.valor.toFixed(2),
        o.moeda ?? '',
        o.tier ?? '',
        o.score === null ? '' : String(o.score),
        CANAL[o.canal as Canal]?.texto ?? o.canal,
        o.campanha ?? '',
        dataHora(o.ultima_actividade),
        dataHora(o.created_at),
        o.id,
      ]),
    )
    .join('');
  return BOM + cab + corpo;
}

export interface ContactoExportado {
  readonly id: string;
  readonly nome: string;
  readonly email: string | null;
  readonly telefone: string | null;
  readonly papel: string | null;
  readonly organizacao: string | null;
  readonly criado: string;
}

export function csvContactos(itens: readonly ContactoExportado[]): string {
  const cab = linha(['Nome', 'Email', 'Telefone', 'Papel declarado', 'Organização', 'Criado', 'Id']);
  const corpo = itens
    .map((c) => linha([c.nome, c.email ?? '', c.telefone ?? '', c.papel ?? '', c.organizacao ?? '', dataHora(c.criado), c.id]))
    .join('');
  return BOM + cab + corpo;
}

/** `oportunidades-2026-10-12.csv`, com o dia de Maputo. */
export function nomeFicheiro(lista: 'oportunidades' | 'contactos', agora: Date): string {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
  return `${lista}-${dia}.csv`;
}
