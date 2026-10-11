import 'server-only';
import type { LinhaBarra } from '@/components/admin/painel/Blocos';
import { FASE_OPORTUNIDADE, FASES_OPORTUNIDADE } from '@/lib/admin/labels';
import { createSessionClient } from '@/lib/auth/client';
import {
  alocacaoDe,
  COLUNAS_ALOCACAO,
  COLUNAS_DECISAO,
  COLUNAS_MOVIMENTO,
  COLUNAS_PESSOA,
  COLUNAS_PRIORIDADE,
  COLUNAS_PROJETO,
  decisaoDe,
  movimentoDe,
  pessoaDe,
  prioridadeDe,
  projetoDe,
} from './leitura';
import type { Alocacao, Decisao, Movimento, Pessoa, Prioridade, Projeto } from './modelo';

/**
 * As leituras do Gabinete, pela sessão de quem pede: a RLS da 0018 só devolve
 * as linhas do dono, e só com o módulo `direcao`. Os volumes são de uma
 * pessoa (dezenas a centenas de linhas), por isso cada tabela vem inteira, com
 * um tecto, e os painéis calculam em memória (`modelo.ts`, testado).
 *
 * Qualquer falha devolve `null` — e a página di-lo —, nunca uma lista vazia
 * que pareça verdade.
 */

const TECTO = 2000;

type Linha = Record<string, unknown>;

export interface Gabinete {
  readonly decisoes: readonly Decisao[];
  readonly prioridades: readonly Prioridade[];
  readonly projetos: readonly Projeto[];
  readonly movimentos: readonly Movimento[];
  readonly pessoas: readonly Pessoa[];
  readonly alocacoes: readonly Alocacao[];
}

type Tabela = keyof Gabinete;

const CONSULTA = {
  decisoes: { tabela: 'gab_decisoes', colunas: COLUNAS_DECISAO, ordem: 'updated_at', de: decisaoDe },
  prioridades: { tabela: 'gab_prioridades', colunas: COLUNAS_PRIORIDADE, ordem: 'trimestre', de: prioridadeDe },
  projetos: { tabela: 'gab_projetos', colunas: COLUNAS_PROJETO, ordem: 'updated_at', de: projetoDe },
  movimentos: { tabela: 'gab_tesouraria', colunas: COLUNAS_MOVIMENTO, ordem: 'data_prevista', de: movimentoDe },
  pessoas: { tabela: 'gab_pessoas', colunas: COLUNAS_PESSOA, ordem: 'nome', de: pessoaDe },
  alocacoes: { tabela: 'gab_alocacoes', colunas: COLUNAS_ALOCACAO, ordem: 'horas_semana', de: alocacaoDe },
} as const;

/** Lê as tabelas pedidas; as não pedidas vêm vazias. `null` se alguma falhar. */
export async function lerGabinete(tabelas: readonly Tabela[]): Promise<Gabinete | null> {
  const supabase = await createSessionClient();
  const resultados = await Promise.all(
    tabelas.map(async (t) => {
      const c = CONSULTA[t];
      const { data, error, count } = await supabase
        .from(c.tabela)
        .select(c.colunas, { count: 'exact' })
        .order(c.ordem, { ascending: t === 'pessoas' })
        .limit(TECTO);
      if (error || !Array.isArray(data)) return null;
      // O PostgREST corta em `max_rows` (1000 por omissão) sem avisar: somar
      // só uma parte da tesouraria daria uma caixa falsa. Mais linhas do que
      // as lidas = falha honesta, não números errados.
      if (count !== null && count > data.length) return null;
      return [t, (data as unknown as Linha[]).map((r) => (c.de as (r: Linha) => unknown)(r))] as const;
    }),
  );
  if (resultados.some((r) => r === null)) return null;
  const vazio: Gabinete = { decisoes: [], prioridades: [], projetos: [], movimentos: [], pessoas: [], alocacoes: [] };
  return Object.assign({}, vazio, Object.fromEntries(resultados as (readonly [Tabela, unknown[]])[])) as Gabinete;
}

/** Uma linha pelo id (a RLS garante que é do dono). `undefined` = não existe; `null` = falha. */
export async function lerUma<T extends 'decisoes' | 'projetos'>(
  t: T,
  id: string,
): Promise<(T extends 'decisoes' ? Decisao : Projeto) | undefined | null> {
  const c = CONSULTA[t];
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from(c.tabela).select(c.colunas).eq('id', id).maybeSingle();
  if (error) return null;
  if (!data) return undefined;
  return (c.de as (r: Linha) => unknown)(data as unknown as Linha) as T extends 'decisoes' ? Decisao : Projeto;
}

/**
 * O pipeline do CRM por fase (contagem). O CRM é partilhado pelo staff e não
 * regista valor por oportunidade: o painel mostra contagens, não dinheiro.
 */
export async function lerPipeline(): Promise<LinhaBarra[] | null> {
  const supabase = await createSessionClient();
  const fases = FASES_OPORTUNIDADE.filter((f) => f !== 'perdido');
  const contagens = await Promise.all(
    fases.map(async (fase) => {
      const { count, error } = await supabase.from('deals').select('*', { count: 'exact', head: true }).eq('stage', fase);
      return error || count === null ? null : { chave: fase, rotulo: FASE_OPORTUNIDADE[fase].texto, valor: count };
    }),
  );
  return contagens.some((c) => c === null) ? null : (contagens as LinhaBarra[]);
}
