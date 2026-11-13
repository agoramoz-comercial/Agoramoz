/**
 * Tráfego do website (D-47): as contas, em funções puras.
 *
 * Entra a lista de eventos (`page_view`, `page_engagement` e as conversões)
 * de um período; sai o que o painel mostra. Sem base, sem relógio implícito
 * (o «agora» é um argumento): testa-se em Node com eventos escritos à mão.
 *
 * Definições — escritas aqui porque cada painel de analytics as escolhe à sua
 * maneira e um número sem definição não serve para decidir:
 *
 * - **Vista**: uma `page_view`.
 * - **Visitante**: um resumo de visita distinto (`props.visita`). O resumo
 *   muda todos os dias, por isso num período de vários dias isto conta
 *   «visitantes-dia»: quem volta noutro dia conta outra vez.
 * - **Visita**: vistas seguidas do mesmo visitante, com menos de 30 minutos
 *   entre elas (a regra do Google Analytics).
 * - **Entrada / saída**: a primeira / a última página de uma visita. «Onde
 *   param» é a taxa de saída: saídas ÷ vistas da página.
 * - **Rejeição**: visita de uma só página com menos de 10 s de leitura.
 * - **Tempo de leitura**: tempo com a página VISÍVEL, por vista que o enviou.
 * - **Conversão**: um evento de conversão (diagnóstico, WhatsApp, reunião)
 *   da mesma visita — creditado à página de entrada e ao canal da visita.
 */

export interface LinhaEvento {
  readonly name: string;
  readonly occurred_at: string;
  readonly channel: string;
  readonly campaign: string | null;
  readonly path: string | null;
  readonly props: Readonly<Record<string, unknown>>;
}

export const CONVERSOES = ['diagnostic_started', 'diagnostic_submitted', 'whatsapp_clicked', 'meeting_requested'] as const;
export type Conversao = (typeof CONVERSOES)[number];

export const ROTULO_CONVERSAO: Readonly<Record<Conversao, string>> = {
  diagnostic_started: 'Diagnóstico iniciado',
  diagnostic_submitted: 'Diagnóstico submetido',
  whatsapp_clicked: 'Clique no WhatsApp',
  meeting_requested: 'Reunião pedida',
};

const PAUSA_VISITA_MS = 30 * 60 * 1000;
const REJEICAO_MS = 10_000;
const AGORA_MS = 5 * 60 * 1000;

export interface Pagina {
  readonly path: string;
  readonly vistas: number;
  readonly visitantes: number;
  readonly entradas: number;
  readonly saidas: number;
  /** Saídas ÷ vistas, 0–1. `null` sem vistas. */
  readonly taxaSaida: number | null;
  readonly tempoMedioMs: number | null;
  readonly scrollMedio: number | null;
  /** Conversões de visitas que ENTRARAM por esta página. */
  readonly conversoes: number;
}

export interface Contagem {
  readonly chave: string;
  readonly visitas: number;
  readonly conversoes: number;
}

export interface Resumo {
  readonly vistas: number;
  readonly visitantes: number;
  readonly visitas: number;
  readonly paginasPorVisita: number | null;
  readonly tempoMedioMs: number | null;
  readonly rejeicao: number | null;
  readonly conversoes: number;
  readonly serie: readonly { dia: string; vistas: number; visitantes: number }[];
  readonly paginas: readonly Pagina[];
  readonly canais: readonly Contagem[];
  readonly referencias: readonly Contagem[];
  readonly campanhas: readonly Contagem[];
  readonly paises: readonly Contagem[];
  readonly ecras: readonly Contagem[];
  readonly percursos: readonly { de: string; para: string; n: number }[];
  readonly porConversao: readonly { nome: Conversao; total: number; porEntrada: readonly { path: string; n: number }[] }[];
  readonly agora: { readonly visitas: number; readonly paginas: readonly { path: string; n: number }[] };
}

interface Vista {
  readonly t: number;
  readonly path: string;
  readonly visita: string;
  readonly canal: string;
  readonly campanha: string | null;
  readonly ref: string | null;
  readonly pais: string | null;
  readonly ecra: string | null;
}

interface Visita {
  readonly visitante: string;
  readonly vistas: Vista[];
  readonly inicio: number;
  fim: number;
  leituraMs: number;
  conversoes: number;
}

const texto = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function contar<T>(itens: readonly T[], chave: (x: T) => string | null, conv: (x: T) => number = () => 0, max = 20): Contagem[] {
  const m = new Map<string, { visitas: number; conversoes: number }>();
  for (const x of itens) {
    const k = chave(x);
    if (!k) continue;
    const c = m.get(k) ?? { visitas: 0, conversoes: 0 };
    c.visitas += 1;
    c.conversoes += conv(x);
    m.set(k, c);
  }
  return [...m.entries()]
    .map(([k, c]) => ({ chave: k, ...c }))
    .sort((a, b) => b.visitas - a.visitas || a.chave.localeCompare(b.chave))
    .slice(0, max);
}

/**
 * @param linhas eventos do período, em qualquer ordem
 * @param paginasDoSite todas as páginas públicas (do sitemap): aparecem mesmo com zero vistas
 * @param agora o instante de referência para «agora»
 */
export function resumir(linhas: readonly LinhaEvento[], paginasDoSite: readonly string[], agora: Date): Resumo {
  // 1. Vistas, por visitante, em ordem.
  const vistas: Vista[] = [];
  let semVisita = 0;
  for (const l of linhas) {
    if (l.name !== 'page_view' || !l.path || l.path === '(privado)') continue;
    const t = Date.parse(l.occurred_at);
    if (Number.isNaN(t)) continue;
    // Sem resumo de visita (segredo em falta), cada vista é a sua própria visita.
    const visita = texto(l.props.visita) ?? `sem-${(semVisita += 1)}`;
    vistas.push({
      t,
      path: l.path,
      visita,
      canal: l.channel,
      campanha: l.campaign,
      ref: texto(l.props.ref),
      pais: texto(l.props.pais),
      ecra: texto(l.props.ecra),
    });
  }
  vistas.sort((a, b) => a.t - b.t);

  // 2. Visitas: vistas seguidas do mesmo visitante, com menos de 30 min entre elas.
  const visitas: Visita[] = [];
  const aberta = new Map<string, Visita>();
  for (const v of vistas) {
    const a = aberta.get(v.visita);
    if (a && v.t - a.fim <= PAUSA_VISITA_MS) {
      a.vistas.push(v);
      a.fim = v.t;
    } else {
      const nova: Visita = { visitante: v.visita, vistas: [v], inicio: v.t, fim: v.t, leituraMs: 0, conversoes: 0 };
      visitas.push(nova);
      aberta.set(v.visita, nova);
    }
  }
  const visitasDe = new Map<string, Visita[]>();
  for (const s of visitas) visitasDe.set(s.visitante, [...(visitasDe.get(s.visitante) ?? []), s]);
  /** A visita deste visitante que estava aberta no instante t. */
  const visitaEm = (visitante: string, t: number) =>
    (visitasDe.get(visitante) ?? []).find((s) => t >= s.inicio - 60_000 && t <= s.fim + PAUSA_VISITA_MS);

  // 3. Leitura (tempo e scroll), por visitante e página.
  const leitura = new Map<string, { ms: number; scroll: number }>();
  for (const l of linhas) {
    if (l.name !== 'page_engagement' || !l.path) continue;
    const visitante = texto(l.props.visita);
    const ms = numero(l.props.ms);
    const scroll = numero(l.props.scroll);
    if (!visitante || ms === null) continue;
    const k = `${visitante}|${l.path}`;
    const atual = leitura.get(k) ?? { ms: 0, scroll: 0 };
    leitura.set(k, { ms: atual.ms + ms, scroll: Math.max(atual.scroll, scroll ?? 0) });
    const s = visitaEm(visitante, Date.parse(l.occurred_at));
    if (s) s.leituraMs += ms;
  }

  // 4. Conversões, creditadas à visita (e à sua página de entrada e canal).
  const porConversao = new Map<Conversao, { total: number; entrada: Map<string, number> }>();
  let conversoes = 0;
  for (const l of linhas) {
    if (!(CONVERSOES as readonly string[]).includes(l.name)) continue;
    const nome = l.name as Conversao;
    const c = porConversao.get(nome) ?? { total: 0, entrada: new Map<string, number>() };
    c.total += 1;
    conversoes += 1;
    const visitante = texto(l.props.visita);
    const s = visitante ? visitaEm(visitante, Date.parse(l.occurred_at)) : undefined;
    if (s) {
      s.conversoes += 1;
      const entrada = s.vistas[0]!.path;
      c.entrada.set(entrada, (c.entrada.get(entrada) ?? 0) + 1);
    }
    porConversao.set(nome, c);
  }

  // 5. Por página.
  const porPagina = new Map<string, { vistas: number; visitantes: Set<string>; entradas: number; saidas: number; conversoes: number }>();
  const pagina = (p: string) => {
    let x = porPagina.get(p);
    if (!x) {
      x = { vistas: 0, visitantes: new Set(), entradas: 0, saidas: 0, conversoes: 0 };
      porPagina.set(p, x);
    }
    return x;
  };
  for (const p of paginasDoSite) pagina(p);
  for (const v of vistas) {
    const x = pagina(v.path);
    x.vistas += 1;
    x.visitantes.add(v.visita);
  }
  for (const s of visitas) {
    pagina(s.vistas[0]!.path).entradas += 1;
    pagina(s.vistas[s.vistas.length - 1]!.path).saidas += 1;
    pagina(s.vistas[0]!.path).conversoes += s.conversoes;
  }
  const leituraDaPagina = (p: string) => {
    const valores = [...leitura.entries()].filter(([k]) => k.endsWith(`|${p}`)).map(([, v]) => v);
    if (!valores.length) return { tempo: null, scroll: null };
    return {
      tempo: Math.round(valores.reduce((a, v) => a + v.ms, 0) / valores.length),
      scroll: Math.round(valores.reduce((a, v) => a + v.scroll, 0) / valores.length),
    };
  };
  const paginas: Pagina[] = [...porPagina.entries()]
    .map(([path, x]) => {
      const l = leituraDaPagina(path);
      return {
        path,
        vistas: x.vistas,
        visitantes: x.visitantes.size,
        entradas: x.entradas,
        saidas: x.saidas,
        taxaSaida: x.vistas ? x.saidas / x.vistas : null,
        tempoMedioMs: l.tempo,
        scrollMedio: l.scroll,
        conversoes: x.conversoes,
      };
    })
    .sort((a, b) => b.vistas - a.vistas || a.path.localeCompare(b.path));

  // 6. Percursos: de uma página para a seguinte, na mesma visita.
  const passos = new Map<string, number>();
  for (const s of visitas)
    for (let i = 1; i < s.vistas.length; i += 1) {
      const de = s.vistas[i - 1]!.path;
      const para = s.vistas[i]!.path;
      if (de !== para) passos.set(`${de}\u0000${para}`, (passos.get(`${de}\u0000${para}`) ?? 0) + 1);
    }
  const percursos = [...passos.entries()]
    .map(([k, n]) => {
      const [de, para] = k.split('\u0000') as [string, string];
      return { de, para, n };
    })
    .sort((a, b) => b.n - a.n)
    .slice(0, 15);

  // 7. Série diária.
  const dias = new Map<string, { vistas: number; visitantes: Set<string> }>();
  for (const v of vistas) {
    const d = new Date(v.t).toISOString().slice(0, 10);
    const x = dias.get(d) ?? { vistas: 0, visitantes: new Set<string>() };
    x.vistas += 1;
    x.visitantes.add(v.visita);
    dias.set(d, x);
  }

  // 8. Agora: quem viu uma página nos últimos 5 minutos, e qual é a última.
  const recentes = new Map<string, string>();
  for (const v of vistas) if (agora.getTime() - v.t <= AGORA_MS && v.t <= agora.getTime() + 60_000) recentes.set(v.visita, v.path);
  const agoraPaginas = new Map<string, number>();
  for (const p of recentes.values()) agoraPaginas.set(p, (agoraPaginas.get(p) ?? 0) + 1);

  const comLeitura = visitas.filter((s) => s.leituraMs > 0);
  const primeira = (s: Visita) => s.vistas[0]!;
  return {
    vistas: vistas.length,
    visitantes: new Set(vistas.map((v) => v.visita)).size,
    visitas: visitas.length,
    paginasPorVisita: visitas.length ? vistas.length / visitas.length : null,
    tempoMedioMs: comLeitura.length ? Math.round(comLeitura.reduce((a, s) => a + s.leituraMs, 0) / comLeitura.length) : null,
    rejeicao: visitas.length ? visitas.filter((s) => s.vistas.length === 1 && s.leituraMs < REJEICAO_MS).length / visitas.length : null,
    conversoes,
    serie: [...dias.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, x]) => ({ dia, vistas: x.vistas, visitantes: x.visitantes.size })),
    paginas,
    canais: contar(
      visitas,
      (s) => primeira(s).canal,
      (s) => s.conversoes,
    ),
    referencias: contar(
      visitas,
      (s) => primeira(s).ref,
      (s) => s.conversoes,
    ),
    campanhas: contar(
      visitas,
      (s) => primeira(s).campanha,
      (s) => s.conversoes,
    ),
    paises: contar(
      visitas,
      (s) => primeira(s).pais,
      (s) => s.conversoes,
    ),
    ecras: contar(
      visitas,
      (s) => primeira(s).ecra,
      (s) => s.conversoes,
    ),
    percursos,
    porConversao: CONVERSOES.filter((n) => porConversao.has(n)).map((nome) => {
      const c = porConversao.get(nome)!;
      return {
        nome,
        total: c.total,
        porEntrada: [...c.entrada.entries()]
          .map(([path, n]) => ({ path, n }))
          .sort((a, b) => b.n - a.n)
          .slice(0, 8),
      };
    }),
    agora: {
      visitas: recentes.size,
      paginas: [...agoraPaginas.entries()].map(([path, n]) => ({ path, n })).sort((a, b) => b.n - a.n),
    },
  };
}

/** `?periodo=` → dias. Um valor desconhecido é 7. */
export const PERIODOS = [1, 7, 30, 90] as const;
export type PeriodoTrafego = (typeof PERIODOS)[number];
export function lerPeriodoTrafego(v: string | undefined): PeriodoTrafego {
  const n = Number(v);
  return (PERIODOS as readonly number[]).includes(n) ? (n as PeriodoTrafego) : 7;
}

/** «1 min 05 s», «42 s». */
export function duracao(ms: number | null): string {
  if (ms === null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}
