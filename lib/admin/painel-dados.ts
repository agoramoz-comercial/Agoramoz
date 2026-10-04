import type { SupabaseClient } from '@supabase/supabase-js';
import { CANAIS, type Canal } from '@/lib/attribution/types';
import { FASES_OPORTUNIDADE, type FaseOportunidade } from '@/lib/admin/labels';
import { CARTOES, type CartaoId } from '@/lib/forms/lead-schema';
import { PRIORIDADES, type Prioridade } from '@/lib/news/esquema';
import type { EstadoErp } from '@/lib/erp/porta';
import { actualEAnterior, porDia, type Janela, type Periodo } from './painel';

/**
 * O que o painel de comando mostra, lido pela sessão de quem está autenticado
 * — sujeito à RLS, como o resto do admin. Nunca a chave de serviço.
 *
 * Cada bloco é uma `Fonte`: com dados, «por activar» (e o passo que falta), ou
 * «erro». Um bloco nunca mostra zero por não ter conseguido ler.
 */

export type Fonte<T> =
  | { readonly estado: 'ok'; readonly dados: T }
  | { readonly estado: 'por-activar'; readonly passo: string }
  | { readonly estado: 'erro' };

export interface Contagem<K extends string = string> {
  readonly chave: K;
  readonly valor: number;
}

export interface LinhaRecente {
  readonly id: string;
  readonly submitted_at: string;
  readonly contacts: { readonly name: string; readonly email: string } | null;
  readonly diagnostics:
    | readonly {
        readonly id: string;
        readonly state: string;
        readonly score: number;
        readonly tier: string;
      }[]
    | null;
}

export interface ProximaReuniao {
  readonly inicio: string;
  readonly tipo: string | null;
  readonly dealId: string | null;
}

export type EtapaFunil = 'iniciados' | 'submetidos' | 'oportunidades' | 'reunioes' | 'ganhos';

export interface DadosPainel {
  readonly periodo: Periodo;
  readonly inicio: string;
  readonly leads: Fonte<{
    actual: number;
    anterior: number;
    serie: number[];
    serieAnterior: number[];
  }>;
  readonly qualidade: Fonte<{
    ab: number;
    total: number;
    abAnterior: number;
    totalAnterior: number;
  }>;
  readonly crm: Fonte<{
    porFase: Contagem<FaseOportunidade>[];
    ganhos: number;
    ganhosAnterior: number;
  }>;
  readonly funil: Fonte<{ etapas: Contagem<EtapaFunil>[] }>;
  readonly cartoes: Fonte<{ vistos: Contagem<CartaoId>[]; concluidos: Contagem<CartaoId>[] }>;
  readonly canais: Fonte<Contagem<Canal>[]>;
  readonly reunioes: Fonte<{
    marcadas: number;
    marcadasAnterior: number;
    realizadas: number;
    proximas: ProximaReuniao[];
  }>;
  readonly news: Fonte<{
    analisadas: number;
    anterior: number;
    falhadas: number;
    porPrioridade: Contagem<Prioridade>[];
  }>;
  readonly operacao: Fonte<{ porRever: number; fila: number; semSaida: number }>;
  readonly recentes: Fonte<LinhaRecente[]>;
  /** Respostas a inquéritos (0013): à parte, nunca somadas aos leads. */
  readonly inqueritos: Fonte<{ respostas: number; anterior: number; comContacto: number }>;
  readonly erp: EstadoErp;
}

export interface Ligacoes {
  /** `ANALYTICS_PERSISTENCE === 'on'`. */
  readonly pixel: boolean;
  /** `SCHEDULING === 'cal'`. */
  readonly agendamento: boolean;
  /** `NEWS_ENGINE !== 'off'`. */
  readonly news: boolean;
  /**
   * `SURVEYS === 'on'`. Só com a 0013 aplicada existe `responses.survey_link_id`;
   * então os três sítios que contam submissões filtram-na, para uma resposta a
   * um inquérito nunca contar como lead. Desligado, as consultas ficam como
   * eram — a coluna pode ainda nem existir.
   */
  readonly inqueritos?: boolean;
  /**
   * Tirar as respostas de inquérito das contagens de leads. Por omissão segue
   * `inqueritos`; a página liga-o também quando há `SURVEY_LINK_SECRET` (só se
   * cria depois de aplicar a 0013), para que desligar `SURVEYS` mais tarde não
   * devolva as respostas já recolhidas às contagens de leads.
   */
  readonly filtrarInqueritos?: boolean;
  readonly erp: EstadoErp;
}

/** Tabela ainda por criar: a 0012 por aplicar. PostgREST devolve PGRST205; o Postgres, 42P01. */
export function tabelaEmFalta(codigo: string | undefined): boolean {
  return codigo === 'PGRST205' || codigo === '42P01';
}

class ErroDeLeitura extends Error {
  constructor(readonly codigo: string | undefined) {
    super(`leitura falhou (${codigo ?? 'sem código'})`);
  }
}

type Resposta = { data: unknown; error: { code?: string } | null };
type RespostaContagem = { count: number | null; error: { code?: string } | null };

async function linhas<T>(consulta: PromiseLike<Resposta>): Promise<T[]> {
  const { data, error } = await consulta;
  if (error) throw new ErroDeLeitura(error.code);
  return (data ?? []) as T[];
}

async function contagem(consulta: PromiseLike<RespostaContagem>): Promise<number> {
  const { count, error } = await consulta;
  if (error) throw new ErroDeLeitura(error.code);
  return count ?? 0;
}

/** Corre um bloco; um erro de leitura vira `erro` (ou «por activar»), nunca um número. */
export async function bloco<T>(
  ler: () => Promise<T>,
  porActivarSe?: (codigo: string | undefined) => string | null,
): Promise<Fonte<T>> {
  try {
    return { estado: 'ok', dados: await ler() };
  } catch (e) {
    const codigo = e instanceof ErroDeLeitura ? e.codigo : undefined;
    const passo = porActivarSe?.(codigo);
    if (passo) return { estado: 'por-activar', passo };
    return { estado: 'erro' };
  }
}

/**
 * O PostgREST do Supabase corta qualquer leitura em `max_rows` (1000 por
 * omissão) SEM erro. Por isso cada número do painel é uma contagem exacta
 * (`count: 'exact', head: true`, que não traz linhas) e só a série diária de
 * leads lê linhas — paginadas, com tecto. Passar o tecto dá «erro», nunca um
 * número incompleto com cara de certo.
 */
const PAGINA = 1000;
const TECTO_DE_LINHAS = 20_000;
const SEM_PIXEL = 'Ligar ANALYTICS_PERSISTENCE=on na Vercel.';

function porActivar(passo: string): Promise<Fonte<never>> {
  return Promise.resolve({ estado: 'por-activar', passo });
}

export async function carregarPainel(
  sb: SupabaseClient,
  j: Janela,
  ligacoes: Ligacoes,
): Promise<DadosPainel> {
  const desde = j.inicioAnterior.toISOString();
  const inicio = j.inicio.toISOString();
  const agora = j.fim.toISOString();
  const cabeca = { count: 'exact' as const, head: true };

  /** Quantas linhas de `tabela` com `coluna` em [de, ate), mais filtros. */
  function conta(
    tabela: string,
    coluna: string,
    de: string,
    ate: string | null,
    filtros: readonly [coluna: string, valor: string | readonly string[] | null][] = [],
  ): Promise<number> {
    let q = sb.from(tabela).select('*', cabeca).gte(coluna, de);
    if (ate) q = q.lt(coluna, ate);
    for (const [c, v] of filtros) {
      q = v === null ? q.is(c, null) : typeof v === 'string' ? q.eq(c, v) : q.in(c, [...v]);
    }
    return contagem(q);
  }

  /** Com inquéritos ligados, as submissões que contam como leads são as sem link. */
  const filtrar = ligacoes.filtrarInqueritos ?? ligacoes.inqueritos ?? false;
  const soLeads: readonly [string, null][] = filtrar ? [['survey_link_id', null]] : [];

  /** Eventos do pixel com `nome` no período actual (ou em [de, ate)). */
  const evento = (
    nome: string,
    de = inicio,
    ate: string | null = null,
    filtros: readonly [string, string][] = [],
  ) => conta('analytics_events', 'occurred_at', de, ate, [['name', nome], ...filtros]);

  const actualEAnteriorDe = (fazer: (de: string, ate: string | null) => Promise<number>) =>
    Promise.all([fazer(inicio, null), fazer(desde, inicio)]);

  const [
    leads,
    qualidade,
    crm,
    funil,
    cartoes,
    canais,
    reunioes,
    news,
    operacao,
    recentes,
    inqueritos,
  ] = await Promise.all([
    bloco(async () => {
      const datas: string[] = [];
      for (let de = 0; ; de += PAGINA) {
        let consulta = sb.from('responses').select('submitted_at').gte('submitted_at', desde);
        if (filtrar) consulta = consulta.is('survey_link_id', null);
        const pagina = await linhas<{ submitted_at: string }>(
          consulta
            .order('submitted_at', { ascending: true })
            .order('id', { ascending: true })
            .range(de, de + PAGINA - 1),
        );
        datas.push(...pagina.map((x) => x.submitted_at));
        if (pagina.length < PAGINA) break;
        if (datas.length >= TECTO_DE_LINHAS) throw new ErroDeLeitura('tecto-do-painel');
      }
      return {
        ...actualEAnterior(datas, j),
        serie: porDia(datas, j.inicio, j.dias),
        serieAnterior: porDia(datas, j.inicioAnterior, j.dias),
      };
    }),

    bloco(async () => {
      const AB = ['A', 'B'] as const;
      const [[total, totalAnterior], [ab, abAnterior]] = await Promise.all([
        actualEAnteriorDe((de, ate) => conta('diagnostics', 'created_at', de, ate)),
        actualEAnteriorDe((de, ate) => conta('diagnostics', 'created_at', de, ate, [['tier', AB]])),
      ]);
      return { ab, total, abAnterior, totalAnterior };
    }),

    bloco(async () => {
      // O pipeline agora (todas as oportunidades) e os ganhos do período pelo
      // evento de servidor `deal_won` — `updated_at` muda com qualquer nota e
      // não diz quando se ganhou.
      const [porFase, [ganhos, ganhosAnterior]] = await Promise.all([
        Promise.all(
          FASES_OPORTUNIDADE.map(async (fase) => ({
            chave: fase,
            valor: await contagem(sb.from('deals').select('*', cabeca).eq('stage', fase)),
          })),
        ),
        actualEAnteriorDe((de, ate) => evento('deal_won', de, ate)),
      ]);
      return { porFase, ganhos, ganhosAnterior };
    }),

    ligacoes.pixel
      ? bloco(async () => {
          const [iniciados, submetidos, oportunidades, reunioesMarcadas, ganhos] =
            await Promise.all([
              evento('diagnostic_started'),
              // Submissões pela tabela, não pelo evento do browser: é o número exacto.
              conta('responses', 'submitted_at', inicio, null, soLeads),
              evento('deal_created'),
              evento('meeting_booked'),
              evento('deal_won'),
            ]);
          const etapas: Contagem<EtapaFunil>[] = [
            { chave: 'iniciados', valor: iniciados },
            { chave: 'submetidos', valor: submetidos },
            { chave: 'oportunidades', valor: oportunidades },
            { chave: 'reunioes', valor: reunioesMarcadas },
            { chave: 'ganhos', valor: ganhos },
          ];
          return { etapas };
        })
      : porActivar(SEM_PIXEL),

    ligacoes.pixel
      ? bloco(async () => {
          const porCartao = (nome: string) =>
            Promise.all(
              CARTOES.map(async (chave) => ({
                chave,
                valor: await evento(nome, inicio, null, [['props->>stepId', chave]]),
              })),
            );
          const [vistos, concluidos] = await Promise.all([
            porCartao('step_viewed'),
            porCartao('form_step_completed'),
          ]);
          return { vistos, concluidos };
        })
      : porActivar(SEM_PIXEL),

    bloco(() =>
      Promise.all(
        CANAIS.map(async (chave) => ({
          chave,
          valor: await conta('response_attribution', 'created_at', inicio, null, [
            ['channel', chave],
          ]),
        })),
      ),
    ),

    ligacoes.agendamento
      ? bloco(
          async () => {
            const [[marcadas, marcadasAnterior], realizadas, proximas] = await Promise.all([
              actualEAnteriorDe((de, ate) => conta('reunioes', 'created_at', de, ate)),
              conta('reunioes', 'created_at', inicio, null, [['estado', 'realizada']]),
              linhas<{ inicio: string; tipo: string | null; deal_id: string | null }>(
                sb
                  .from('reunioes')
                  .select('inicio, tipo, deal_id')
                  .eq('estado', 'marcada')
                  .gte('inicio', agora)
                  .order('inicio', { ascending: true })
                  .limit(6),
              ),
            ]);
            return {
              marcadas,
              marcadasAnterior,
              realizadas,
              proximas: proximas.map((x) => ({
                inicio: x.inicio,
                tipo: x.tipo,
                dealId: x.deal_id,
              })),
            };
          },
          (codigo) =>
            tabelaEmFalta(codigo) ? 'Aplicar supabase/aplicar-0012.sql no Supabase.' : null,
        )
      : porActivar('Ligar o Cal.com: docs/AGENDAMENTO.md (0012, webhook, SCHEDULING=cal).'),

    ligacoes.news && ligacoes.pixel
      ? bloco(async () => {
          const [[analisadas, anterior], falhadas, porPrioridade] = await Promise.all([
            actualEAnteriorDe((de, ate) => evento('news_analisada', de, ate)),
            evento('news_falhou'),
            Promise.all(
              PRIORIDADES.map(async (chave) => ({
                chave,
                valor: await evento('news_analisada', inicio, null, [
                  ['props->>prioridade', chave],
                ]),
              })),
            ),
          ]);
          return { analisadas, anterior, falhadas, porPrioridade };
        })
      : porActivar(ligacoes.news ? SEM_PIXEL : 'Ligar NEWS_ENGINE na Vercel (docs/NEWS.md).'),

    bloco(async () => {
      const [porRever, fila, semSaida] = await Promise.all([
        contagem(
          sb.from('diagnostics').select('*', cabeca).in('state', ['computed', 'pending_review']),
        ),
        contagem(sb.from('outbox_events').select('*', cabeca).in('status', ['pending', 'failed'])),
        contagem(sb.from('outbox_events').select('*', cabeca).eq('status', 'dead')),
      ]);
      return { porRever, fila, semSaida };
    }),

    bloco(() => {
      let consulta = sb
        .from('responses')
        .select('id, submitted_at, contacts(name, email), diagnostics(id, state, score, tier)');
      if (filtrar) consulta = consulta.is('survey_link_id', null);
      return linhas<LinhaRecente>(consulta.order('submitted_at', { ascending: false }).limit(8));
    }),

    ligacoes.inqueritos
      ? bloco(async () => {
          const comLink = () =>
            sb.from('responses').select('*', cabeca).not('survey_link_id', 'is', null);
          const [[respostas, anterior], comContacto] = await Promise.all([
            actualEAnteriorDe((de, ate) => {
              const q = comLink().gte('submitted_at', de);
              return contagem(ate ? q.lt('submitted_at', ate) : q);
            }),
            contagem(comLink().not('contact_id', 'is', null).gte('submitted_at', inicio)),
          ]);
          return { respostas, anterior, comContacto };
        })
      : porActivar(
          'Ligar os inquéritos: docs/INQUERITOS.md (0013, SURVEY_LINK_SECRET, SURVEYS=on).',
        ),
  ]);

  return {
    periodo: j.dias,
    inicio,
    leads,
    qualidade,
    crm,
    funil,
    cartoes,
    canais,
    reunioes,
    news,
    operacao,
    recentes,
    inqueritos,
    erp: ligacoes.erp,
  };
}
