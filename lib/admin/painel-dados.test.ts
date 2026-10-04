import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { carregarPainel, type Ligacoes } from './painel-dados';
import { janela } from './painel';

/**
 * Um Supabase em memória: cada `from(tabela)` devolve uma cadeia que regista
 * os filtros e, quando esperada, aplica-os às linhas dessa tabela. Contagens
 * (`head: true`) e páginas (`range`) saem dos mesmos dados, e cada página
 * respeita o `max_rows` de 1000 do PostgREST — como o servidor verdadeiro.
 */
type Linha = Record<string, unknown>;
type Tabelas = Record<string, Linha[]>;
type Chamada = [string, ...unknown[]];

const MAX_ROWS = 1000;

function valor(l: Linha, coluna: string): unknown {
  const [col, chave] = coluna.split('->>');
  const v = l[col!];
  return chave ? (v as Record<string, unknown> | undefined)?.[chave] : v;
}

function aplicar(linhas: Linha[], chamadas: Chamada[]): Linha[] {
  return linhas.filter((l) =>
    chamadas.every(([m, col, arg]) => {
      if (typeof col !== 'string') return true;
      const v = valor(l, col);
      if (m === 'eq') return v === arg;
      if (m === 'in') return (arg as unknown[]).includes(v);
      if (m === 'gte') return String(v) >= String(arg);
      if (m === 'lt') return String(v) < String(arg);
      // Só as duas formas que o painel usa: `.is(col, null)` e `.not(col, 'is', null)`.
      if (m === 'is') return v === null || v === undefined;
      if (m === 'not') return v !== null && v !== undefined;
      return true;
    }),
  );
}

function clienteFalso(
  tabelas: Tabelas,
  opcoes: { falha?: Record<string, string>; consultadas?: Set<string>; pedidos?: Chamada[][] } = {},
): SupabaseClient {
  return {
    from(tabela: string) {
      opcoes.consultadas?.add(tabela);
      const chamadas: Chamada[] = [];
      const cadeia: Record<string, unknown> = new Proxy(
        {},
        {
          get(_alvo, prop: string) {
            if (prop === 'then') {
              opcoes.pedidos?.push(chamadas);
              const codigo = opcoes.falha?.[tabela];
              const resposta = (() => {
                if (codigo) return { data: null, count: null, error: { code: codigo } };
                const filtradas = aplicar(tabelas[tabela] ?? [], chamadas);
                const cabeca = chamadas.some(
                  ([m, , o]) => m === 'select' && (o as { head?: boolean } | undefined)?.head,
                );
                if (cabeca) return { data: null, count: filtradas.length, error: null };
                const range = chamadas.find(([m]) => m === 'range');
                const limite = chamadas.find(([m]) => m === 'limit');
                const de = range ? (range[1] as number) : 0;
                const ate = range
                  ? (range[2] as number) + 1
                  : ((limite?.[1] as number) ?? Infinity);
                return {
                  data: filtradas.slice(de, Math.min(ate, de + MAX_ROWS)),
                  count: null,
                  error: null,
                };
              })();
              return (ok: (v: unknown) => unknown) => Promise.resolve(resposta).then(ok);
            }
            return (...args: unknown[]) => {
              chamadas.push([prop, ...args]);
              return cadeia;
            };
          },
        },
      );
      return cadeia;
    },
  } as unknown as SupabaseClient;
}

const AGORA = new Date('2026-10-01T12:00:00Z');
const J = janela(7, AGORA);
const dia = (n: number) => new Date(AGORA.getTime() - n * 86_400_000).toISOString();
const TUDO_LIGADO: Ligacoes = {
  pixel: true,
  agendamento: true,
  news: true,
  erp: { estado: 'por-ligar' },
};

const ev = (name: string, n: number, props: Linha = {}) => ({
  name,
  occurred_at: dia(n),
  props,
});

function dados(): Tabelas {
  return {
    responses: [{ submitted_at: dia(1) }, { submitted_at: dia(2) }, { submitted_at: dia(9) }],
    diagnostics: [
      { tier: 'A', created_at: dia(1), state: 'computed' },
      { tier: 'C', created_at: dia(2), state: 'approved' },
      { tier: 'B', created_at: dia(10), state: 'approved' },
    ],
    deals: [{ stage: 'novo' }, { stage: 'novo' }, { stage: 'ganho' }],
    response_attribution: [
      { channel: 'organico', created_at: dia(1) },
      { channel: 'organico', created_at: dia(2) },
      { channel: 'gbp', created_at: dia(3) },
      { channel: 'gbp', created_at: dia(12) },
    ],
    analytics_events: [
      ev('step_viewed', 1, { stepId: 'pais' }),
      ev('step_viewed', 2, { stepId: 'pais' }),
      ev('form_step_completed', 1, { stepId: 'pais' }),
      ev('news_analisada', 1, { prioridade: 'high' }),
      ev('news_analisada', 9, { prioridade: 'medium' }),
      ev('news_falhou', 1),
      ev('deal_won', 2),
      ev('deal_won', 8),
      ev('deal_won', 9),
    ],
    reunioes: [
      {
        estado: 'marcada',
        created_at: dia(1),
        inicio: dia(-2),
        tipo: 'conversa-30',
        deal_id: 'd1',
      },
      {
        estado: 'realizada',
        created_at: dia(3),
        inicio: dia(2),
        tipo: 'conversa-30',
        deal_id: 'd2',
      },
    ],
    outbox_events: [{ status: 'dead' }],
  };
}

describe('carregarPainel', () => {
  it('agrega cada bloco a partir das tabelas', async () => {
    const d = await carregarPainel(clienteFalso(dados()), J, TUDO_LIGADO);
    expect(d.leads).toMatchObject({ estado: 'ok', dados: { actual: 2, anterior: 1 } });
    expect(d.leads.estado === 'ok' && d.leads.dados.serie).toHaveLength(7);
    expect(d.qualidade).toEqual({
      estado: 'ok',
      dados: { ab: 1, total: 2, abAnterior: 1, totalAnterior: 1 },
    });
    expect(d.crm).toMatchObject({ estado: 'ok', dados: { ganhos: 1, ganhosAnterior: 2 } });
    const crm = d.crm.estado === 'ok' ? d.crm.dados : null;
    expect(crm?.porFase.find((f) => f.chave === 'novo')?.valor).toBe(2);
    const canais = d.canais.estado === 'ok' ? d.canais.dados : [];
    expect(canais.find((c) => c.chave === 'organico')?.valor).toBe(2);
    expect(canais.find((c) => c.chave === 'gbp')?.valor).toBe(1);
    const cartoes = d.cartoes.estado === 'ok' ? d.cartoes.dados : null;
    expect(cartoes?.vistos[0]).toEqual({ chave: 'pais', valor: 2 });
    expect(cartoes?.concluidos[0]).toEqual({ chave: 'pais', valor: 1 });
    expect(d.news).toMatchObject({
      estado: 'ok',
      dados: { analisadas: 1, anterior: 1, falhadas: 1 },
    });
    const news = d.news.estado === 'ok' ? d.news.dados : null;
    expect(news?.porPrioridade.find((p) => p.chave === 'high')?.valor).toBe(1);
    expect(d.reunioes).toMatchObject({
      estado: 'ok',
      dados: { marcadas: 2, marcadasAnterior: 0, realizadas: 1 },
    });
    expect(d.reunioes.estado === 'ok' && d.reunioes.dados.proximas[0]?.tipo).toBe('conversa-30');
    expect(d.operacao).toEqual({ estado: 'ok', dados: { porRever: 1, fila: 0, semSaida: 1 } });
  });

  it('conta além das 1000 linhas que o PostgREST devolve por pedido', async () => {
    const t = dados();
    t.responses = Array.from({ length: 2500 }, (_, i) => ({ submitted_at: dia(1 + (i % 3) / 10) }));
    t.response_attribution = Array.from({ length: 1800 }, () => ({
      channel: 'organico',
      created_at: dia(1),
    }));
    const d = await carregarPainel(clienteFalso(t), J, TUDO_LIGADO);
    expect(d.leads).toMatchObject({ estado: 'ok', dados: { actual: 2500 } });
    const canais = d.canais.estado === 'ok' ? d.canais.dados : [];
    expect(canais.find((c) => c.chave === 'organico')?.valor).toBe(1800);
  });

  it('acima do tecto de linhas, a série dá «erro» — não um número incompleto', async () => {
    const t = dados();
    t.responses = Array.from({ length: 20_500 }, () => ({ submitted_at: dia(1) }));
    const d = await carregarPainel(clienteFalso(t), J, TUDO_LIGADO);
    expect(d.leads).toEqual({ estado: 'erro' });
  });

  it('a série pagina com ordem estável (data e id)', async () => {
    const pedidos: Chamada[][] = [];
    const t = dados();
    t.responses = Array.from({ length: 1200 }, () => ({ submitted_at: dia(1) }));
    await carregarPainel(clienteFalso(t, { pedidos }), J, TUDO_LIGADO);
    const paginas = pedidos.filter((c) => c.some(([m]) => m === 'range'));
    expect(paginas).toHaveLength(2);
    for (const p of paginas) {
      expect(p.filter(([m]) => m === 'order').map(([, col]) => col)).toEqual([
        'submitted_at',
        'id',
      ]);
    }
  });

  it('um erro de leitura dá «erro» — nunca zeros', async () => {
    const d = await carregarPainel(
      clienteFalso(dados(), { falha: { responses: '57014' } }),
      J,
      TUDO_LIGADO,
    );
    expect(d.leads).toEqual({ estado: 'erro' });
    expect(d.qualidade.estado).toBe('ok');
  });

  it('a 0012 por aplicar põe as reuniões «por activar», com o passo', async () => {
    const d = await carregarPainel(
      clienteFalso(dados(), { falha: { reunioes: 'PGRST205' } }),
      J,
      TUDO_LIGADO,
    );
    expect(d.reunioes).toEqual({
      estado: 'por-activar',
      passo: expect.stringContaining('aplicar-0012.sql'),
    });
  });

  it('sem pixel, sem agendamento e sem News: blocos «por activar», sem consultar essas fontes', async () => {
    const consultadas = new Set<string>();
    const d = await carregarPainel(clienteFalso(dados(), { consultadas }), J, {
      pixel: false,
      agendamento: false,
      news: false,
      erp: { estado: 'por-ligar' },
    });
    expect(d.funil.estado).toBe('por-activar');
    expect(d.cartoes.estado).toBe('por-activar');
    expect(d.reunioes.estado).toBe('por-activar');
    expect(d.news.estado).toBe('por-activar');
    expect(consultadas.has('reunioes')).toBe(false);
  });
});

describe('inquéritos no painel', () => {
  const COM_INQUERITOS: Ligacoes = { ...TUDO_LIGADO, inqueritos: true };
  function comRespostasDeInquerito(): Tabelas {
    const t = dados();
    t.responses = [
      { id: 'l1', submitted_at: dia(1), survey_link_id: null, contact_id: 'c1' },
      { id: 'i1', submitted_at: dia(1), survey_link_id: 'k1', contact_id: null },
      { id: 'i2', submitted_at: dia(2), survey_link_id: 'k1', contact_id: 'c2' },
      { id: 'i3', submitted_at: dia(9), survey_link_id: 'k1', contact_id: null },
    ];
    return t;
  }

  it('com SURVEYS ligado, as respostas de inquérito ficam fora dos leads, do funil e das recentes', async () => {
    const d = await carregarPainel(clienteFalso(comRespostasDeInquerito()), J, COM_INQUERITOS);
    expect(d.leads).toMatchObject({ estado: 'ok', dados: { actual: 1, anterior: 0 } });
    const funil = d.funil.estado === 'ok' ? d.funil.dados.etapas : [];
    expect(funil.find((e) => e.chave === 'submetidos')?.valor).toBe(1);
    const recentes = d.recentes.estado === 'ok' ? d.recentes.dados : [];
    expect(recentes.map((r) => r.id)).toEqual(['l1']);
    expect(d.inqueritos).toEqual({
      estado: 'ok',
      dados: { respostas: 2, anterior: 1, comContacto: 1 },
    });
  });

  it('desligado: inquéritos «por activar» e nenhuma consulta filtra survey_link_id', async () => {
    const pedidos: Chamada[][] = [];
    const d = await carregarPainel(clienteFalso(dados(), { pedidos }), J, TUDO_LIGADO);
    expect(d.inqueritos).toEqual({
      estado: 'por-activar',
      passo: expect.stringContaining('INQUERITOS.md'),
    });
    expect(pedidos.flat().some(([, col]) => col === 'survey_link_id')).toBe(false);
  });
});
