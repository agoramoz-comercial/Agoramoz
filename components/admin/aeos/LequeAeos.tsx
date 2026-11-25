'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import type { CategoriaId, ItemMapa, MapaLeque } from '@/lib/admin/aeos-mapa';
import { AGENTES, AGENTES_CF, AGENTES_WX, ROTULO_ESTADO, ROTULO_TIPO, type AccaoAgente } from '@/lib/admin/agentes';

const GRUPOS_AGENTES = [
  { rotulo: 'ZABATAINA 3000', agentes: AGENTES },
  { rotulo: 'CODEFORGE 3000', agentes: AGENTES_CF },
  { rotulo: 'WIE-X v4.0', agentes: AGENTES_WX },
] as const;
import type { RespostaPergunta } from '@/lib/admin/agentes-actions';

/**
 * O Mapa AEOS em leque: AEOS → categorias → itens, e o painel do item à
 * direita com a pergunta aos agentes ZABATAINA. Tudo o que aparece é do
 * documento, dos contratos ou das acções registadas; sem dado, «—».
 * No telemóvel o leque dá lugar à lista (a mesma informação, sem SVG).
 */

type Perguntar = (e: unknown) => Promise<RespostaPergunta>;
type Decidir = (e: unknown) => Promise<{ ok: true } | { ok: false; erro: string }>;

const W = 1000;
const H = 700;
const CENTRO = { x: 95, y: 350 };
const CARTAO_X = 250;
const pc = (v: number, t: number) => `${(v / t) * 100}%`;
const TOM: Record<'ok' | 'aviso' | 'vazio', string> = {
  ok: 'border-emerald-400/40 text-emerald-300',
  aviso: 'border-[#e9a35c]/50 text-[#f0b97f]',
  vazio: 'border-[#a8a092]/40 text-[#a8a092]',
};
const VIDRO = 'border border-[rgb(239_232_218/0.12)] bg-[rgb(239_232_218/0.05)] [@media(pointer:fine)]:backdrop-blur-md';

type Ordem = 'documento' | 'az' | 'estado';
type Filtro = 'todos' | 'ok' | 'aviso' | 'vazio' | 'sem';

function Estado({ e }: { e: ItemMapa['estado'] }) {
  if (!e) return <span className="rounded-full border border-[#a8a092]/30 px-1.5 text-[10px] text-[#a8a092]">—</span>;
  return <span className={`rounded-full border px-1.5 text-[10px] whitespace-nowrap ${TOM[e.tom]}`}>{e.rotulo}</span>;
}

const valor = (v: number | null, sufixo = '') => (v === null ? '—' : `${v}${sufixo}`);

export function LequeAeos({
  mapa,
  accoes,
  podeDecidir,
  podePerguntar,
  perguntar,
  decidir,
}: {
  mapa: MapaLeque;
  accoes: readonly AccaoAgente[] | null;
  podeDecidir: boolean;
  podePerguntar: boolean;
  perguntar: Perguntar;
  decidir: Decidir;
}) {
  const [cat, setCat] = useState<CategoriaId>('blocos');
  const [sel, setSel] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [vista, setVista] = useState<'leque' | 'arvore'>('leque');
  const [ordem, setOrdem] = useState<Ordem>('documento');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const categoria = mapa.categorias.find((c) => c.id === cat)!;
  const itens = useMemo(() => {
    let l = categoria.itens.filter((i) =>
      filtro === 'todos' ? true : filtro === 'sem' ? i.estado === null : i.estado?.tom === filtro,
    );
    if (ordem === 'az') l = [...l].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt'));
    if (ordem === 'estado') {
      const peso = (i: ItemMapa) => (i.estado ? { aviso: 0, vazio: 1, ok: 2 }[i.estado.tom] : 3);
      l = [...l].sort((a, b) => peso(a) - peso(b));
    }
    return l;
  }, [categoria, filtro, ordem]);
  const item = categoria.itens.find((i) => i.id === sel) ?? itens[0] ?? null;

  const yCartao = (i: number) => 110 + i * ((H - 220) / Math.max(1, mapa.categorias.length - 1));
  const iCat = mapa.categorias.findIndex((c) => c.id === cat);
  const origem = { x: CARTAO_X + 150, y: yCartao(iCat) };
  const posItem = (i: number) => {
    const n = itens.length;
    if (vista === 'arvore') return { x: 640, y: 40 + (i + 0.5) * ((H - 80) / Math.max(1, n)) };
    const a = (-62 + (124 * (i + 0.5)) / Math.max(1, n)) * (Math.PI / 180);
    return { x: 150 + 520 * Math.cos(a), y: 350 + 330 * Math.sin(a) };
  };

  return (
    <section aria-label="Mapa AEOS em leque" className="mb-10 overflow-hidden rounded-[28px] bg-[#0b0a09] text-[#efe8da]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[rgb(239_232_218/0.1)] p-3">
        <div className="flex rounded-full bg-[#151311] p-1" role="group" aria-label="Vista">
          {(['leque', 'arvore'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={vista === v} onClick={() => setVista(v)}
              className={`min-h-9 rounded-full px-3 text-sm ${vista === v ? 'bg-[#e9a35c] text-[#0b0a09]' : 'text-[#a8a092] hover:text-[#efe8da]'}`}>
              {v === 'leque' ? 'Leque' : 'Árvore'}
            </button>
          ))}
        </div>
        <div className="hidden rounded-full bg-[#151311] p-1 lg:flex" role="group" aria-label="Zoom">
          <button type="button" aria-label="Aproximar" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.2).toFixed(1)))} className="min-h-9 min-w-9 rounded-full text-lg hover:bg-white/5">+</button>
          <span className="self-center px-1 text-xs text-[#a8a092]" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Afastar" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))} className="min-h-9 min-w-9 rounded-full text-lg hover:bg-white/5">−</button>
        </div>
        <label className="flex items-center gap-1 text-xs text-[#a8a092]">
          Filtro
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} className="min-h-9 rounded-full border border-white/10 bg-[#151311] px-2 text-sm text-[#efe8da]">
            <option value="todos">Todos</option>
            <option value="aviso">Parcial / por aprovar</option>
            <option value="vazio">Por construir</option>
            <option value="ok">Completo / sem pendentes</option>
            <option value="sem">Sem estado</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs text-[#a8a092]">
          Ordenar
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="min-h-9 rounded-full border border-white/10 bg-[#151311] px-2 text-sm text-[#efe8da]">
            <option value="documento">Ordem do documento</option>
            <option value="az">A–Z</option>
            <option value="estado">Por estado</option>
          </select>
        </label>
        <p className="ms-auto text-xs text-[#a8a092]">{mapa.centro.titulo} · {mapa.centro.subtitulo}</p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Categorias em lista no telemóvel */}
        <div className="flex gap-2 overflow-x-auto p-3 lg:hidden" role="group" aria-label="Categorias">
          {mapa.categorias.map((c) => (
            <button key={c.id} type="button" aria-pressed={c.id === cat} onClick={() => { setCat(c.id); setSel(null); }}
              className={`min-h-9 shrink-0 rounded-full border px-3 text-sm ${c.id === cat ? 'border-[#e9a35c] bg-[#e9a35c] text-[#0b0a09]' : 'border-white/15 text-[#efe8da]'}`}>
              {c.rotulo} <span className="opacity-70">{c.itens.length}</span>
            </button>
          ))}
        </div>

        <div className="relative hidden overflow-auto lg:block">
          <div className="relative origin-top-left transition-transform" style={{ transform: `scale(${zoom})`, width: '100%', aspectRatio: `${W}/${H}` }}>
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <radialGradient id="aeos-orbe" cx="50%" cy="45%" r="60%">
                  <stop offset="0%" stopColor="#f0b97f" />
                  <stop offset="100%" stopColor="#5f3a17" />
                </radialGradient>
              </defs>
              <circle cx={CENTRO.x} cy={CENTRO.y} r={150} fill="none" stroke="rgb(239 232 218 / 0.06)" />
              <circle cx={CENTRO.x} cy={CENTRO.y} r={34} fill="url(#aeos-orbe)" />
              {mapa.categorias.map((c, i) => (
                <path key={c.id} d={`M${CENTRO.x + 34},${CENTRO.y} C${CENTRO.x + 120},${CENTRO.y} ${CARTAO_X - 60},${yCartao(i)} ${CARTAO_X},${yCartao(i)}`}
                  fill="none" stroke={c.id === cat ? '#e9a35c' : 'rgb(239 232 218 / 0.18)'} strokeWidth={c.id === cat ? 1.6 : 1} />
              ))}
              {itens.map((it, i) => {
                const p = posItem(i);
                const d = vista === 'arvore'
                  ? `M${origem.x},${origem.y} H${(origem.x + p.x) / 2} V${p.y} H${p.x}`
                  : `M${origem.x},${origem.y} C${origem.x + 120},${origem.y} ${p.x - 120},${p.y} ${p.x},${p.y}`;
                return <path key={it.id} d={d} fill="none" stroke={item?.id === it.id ? '#e9a35c' : 'rgb(233 163 92 / 0.35)'} strokeWidth={item?.id === it.id ? 1.6 : 0.8} />;
              })}
            </svg>
            <p className="absolute -translate-x-1/2 text-center text-xs" style={{ left: pc(CENTRO.x, W), top: pc(CENTRO.y + 48, H) }}>
              <span className="block font-medium">{mapa.centro.titulo}</span>
              <span className="text-[#a8a092]">{mapa.centro.subtitulo}</span>
            </p>
            <ul role="list" aria-label="Categorias">
              {mapa.categorias.map((c, i) => (
                <li key={c.id} className="absolute -translate-y-1/2" style={{ left: pc(CARTAO_X, W), top: pc(yCartao(i), H), width: pc(150, W) }}>
                  <button type="button" aria-pressed={c.id === cat} onClick={() => { setCat(c.id); setSel(null); }}
                    className={`w-full rounded-xl px-3 py-2 text-start ${VIDRO} ${c.id === cat ? 'ring-1 ring-[#e9a35c]' : 'hover:bg-white/10'}`}>
                    <span className="block text-xl leading-none font-medium">{c.itens.length}</span>
                    <span className="text-[11px] text-[#a8a092]">{c.rotulo}</span>
                  </button>
                </li>
              ))}
            </ul>
            <ul role="list" aria-label={`Itens: ${categoria.rotulo}`}>
              {itens.map((it, i) => {
                const p = posItem(i);
                return (
                  <li key={it.id} className="absolute -translate-y-1/2" style={{ left: pc(p.x + 6, W), top: pc(p.y, H), maxWidth: pc(W - p.x - 12, W) }}>
                    <button type="button" aria-current={item?.id === it.id ? 'true' : undefined} onClick={() => setSel(it.id)}
                      className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-start text-[12px] leading-tight ${item?.id === it.id ? 'bg-[#e9a35c]/15 text-[#f0b97f]' : 'hover:bg-white/5'}`}>
                      <span className="truncate">{it.titulo}</span>
                      <Estado e={it.estado} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Lista no telemóvel */}
        <ul role="list" aria-label={`Itens: ${categoria.rotulo}`} className="grid gap-1 px-3 pb-3 lg:hidden">
          {itens.map((it) => (
            <li key={it.id}>
              <button type="button" aria-current={item?.id === it.id ? 'true' : undefined} onClick={() => setSel(it.id)}
                className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-start text-sm ${item?.id === it.id ? 'bg-[#e9a35c]/15' : 'bg-white/5'}`}>
                <span>{it.titulo}</span>
                <Estado e={it.estado} />
              </button>
            </li>
          ))}
        </ul>

        {item && (
          <Painel key={item.id} item={item} categoria={categoria.rotulo} catId={cat} accoes={accoes}
            podeDecidir={podeDecidir} podePerguntar={podePerguntar} perguntar={perguntar} decidir={decidir} />
        )}
      </div>
    </section>
  );
}

function Painel({
  item,
  categoria,
  catId,
  accoes,
  podeDecidir,
  podePerguntar,
  perguntar,
  decidir,
}: {
  item: ItemMapa;
  categoria: string;
  catId: CategoriaId;
  accoes: readonly AccaoAgente[] | null;
  podeDecidir: boolean;
  podePerguntar: boolean;
  perguntar: Perguntar;
  decidir: Decidir;
}) {
  const agenteDoItem =
    catId === 'agentes' || catId === 'agentes-cf' || catId === 'agentes-wx'
      ? item.id.replace('agente-', '')
      : catId === 'blocos'
        ? (AGENTES.find((a) => a.blocos.includes(Number(item.id.replace('bloco-', ''))))?.id ?? 'AG-01')
        : 'AG-01';
  const [agente, setAgente] = useState(agenteDoItem);
  const [pergunta, setPergunta] = useState('');
  const [res, setRes] = useState<RespostaPergunta | null>(null);
  const [aEnviar, iniciar] = useTransition();
  const [decisao, setDecisao] = useState<string | null>(null);
  const max = item.metrica ? Math.max(1, ...item.metrica.barras) : 1;
  const doItem = accoes?.filter((a) => a.alvo === item.id) ?? [];
  const pendentes = accoes?.filter((a) => a.estado === 'precisa_aprovacao') ?? [];

  return (
    <aside aria-label={`Detalhe: ${item.titulo}`} className="grid min-w-0 content-start gap-3 border-t border-white/10 p-4 lg:border-t-0 lg:border-s">
      <div className={`rounded-2xl p-4 ${VIDRO}`}>
        <p className="text-xs text-[#e9a35c]">{categoria}</p>
        <h2 className="mt-1 text-xl font-medium tracking-[-0.02em]">{item.titulo}</h2>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Estado e={item.estado} />
          {item.href ? (
            <Link href={item.href} className="inline-flex min-h-9 items-center rounded-full bg-white/10 px-3 text-sm hover:bg-white/15">Explorar detalhes ›</Link>
          ) : (
            <span className="text-xs text-[#a8a092]">Sem ecrã no admin</span>
          )}
        </div>
        <p className="mt-3 text-sm text-[#cfc6b6]">{item.resumo}</p>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-[#3a2412] to-[#151311] p-4">
        <p className="text-sm">{item.metrica?.rotulo ?? 'Métrica'}</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-4xl font-medium">{valor(item.metrica?.valor ?? null, '%')}</p>
          {item.metrica && (
            <div className="flex h-10 items-end gap-1" aria-hidden>
              {item.metrica.barras.map((b, i) => (
                <span key={i} className={`w-3 rounded-sm ${i === 0 ? 'bg-[#e9a35c]' : 'bg-white/25'}`} style={{ height: `${Math.max(8, (b / max) * 100)}%` }} />
              ))}
            </div>
          )}
        </div>
        {item.metrica && <p className="mt-1 text-[11px] text-[#a8a092]">Ecrãs no admin · por construir</p>}
      </div>

      <dl className="grid grid-cols-2 gap-2">
        {item.kpis.map((k) => (
          <div key={k.rotulo} className={`rounded-2xl p-3 ${VIDRO}`}>
            <dd className="text-2xl font-medium">{valor(k.valor)}</dd>
            <dt className="text-xs text-[#a8a092]">{k.rotulo}</dt>
          </div>
        ))}
      </dl>

      <div className={`rounded-2xl p-4 ${VIDRO}`}>
        <h3 className="text-sm font-medium">✦ Análise IA</h3>
        {res?.ok ? (
          <div className="mt-2 grid gap-2 text-sm">
            <p className="whitespace-pre-line text-[#cfc6b6]">{res.resposta}</p>
            {res.propostas.map((p, i) => (
              <p key={i} className="rounded-xl bg-white/5 p-2 text-xs">
                <span className="text-[#e9a35c]">{ROTULO_TIPO[p.tipo]}</span> · {p.titulo} — <strong>{ROTULO_ESTADO[p.estado]}</strong>
                {!p.guardada && ' (não guardada)'}
              </p>
            ))}
            {res.retiradas > 0 && <p className="text-xs text-[#a8a092]">{res.retiradas} proposta(s) fora do formato foram retiradas.</p>}
            {res.aviso && <p role="status" className="text-xs text-[#f0b97f]">{res.aviso}</p>}
          </div>
        ) : res && !res.ok ? (
          <p role="alert" className="mt-2 text-sm text-[#f0b97f]">{res.erro}</p>
        ) : doItem.length > 0 ? (
          <ul role="list" className="mt-2 grid gap-1 text-xs">
            {doItem.slice(0, 4).map((a) => (
              <li key={a.id}>{a.agente} · {a.titulo} — {ROTULO_ESTADO[a.estado]}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[#a8a092]">Ainda sem análise. Pergunte a um agente.</p>
        )}
      </div>

      {podePerguntar && (
        <form
          className="rounded-[22px] border border-white/15 bg-[#151311] p-2"
          onSubmit={(e) => {
            e.preventDefault();
            iniciar(async () => setRes(await perguntar({ agente, item: item.id, pergunta })));
          }}
        >
          <label htmlFor={`pergunta-${item.id}`} className="sr-only">Faça uma pergunta</label>
          <div className="flex items-center gap-2">
            <input id={`pergunta-${item.id}`} value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Faça uma pergunta…" maxLength={1200}
              className="min-h-11 w-full rounded-full bg-[#efe8da] px-4 text-sm text-[#0b0a09] placeholder:text-[#5f584d]" />
            <button type="submit" disabled={aEnviar || pergunta.trim().length < 3} aria-label="Enviar pergunta"
              className="min-h-11 min-w-11 rounded-full bg-[#e9a35c] text-[#0b0a09] disabled:opacity-50">{aEnviar ? '…' : '➤'}</button>
          </div>
          <label className="mt-2 flex items-center gap-2 px-2 text-xs text-[#a8a092]">
            Agente
            <select value={agente} onChange={(e) => setAgente(e.target.value)} className="min-h-9 w-full min-w-0 flex-1 rounded-full border border-white/10 bg-[#0b0a09] px-2 text-[#efe8da]">
              {GRUPOS_AGENTES.map((g) => (
                <optgroup key={g.rotulo} label={g.rotulo}>
                  {g.agentes.map((a) => (
                    <option key={a.id} value={a.id}>{a.id} · {a.papel}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <p className="mt-1 px-2 text-[11px] text-[#a8a092]">Os agentes propõem. Externo, financeiro, publicação ou irreversível espera aprovação de um administrador.</p>
        </form>
      )}

      <div className={`rounded-2xl p-4 ${VIDRO}`}>
        <h3 className="text-sm font-medium">Por aprovar <span className="text-[#a8a092]">{accoes === null ? '—' : pendentes.length}</span></h3>
        {accoes === null ? (
          <p className="mt-2 text-xs text-[#a8a092]">Sem registo de acções (falta aplicar a migração 0024).</p>
        ) : pendentes.length === 0 ? (
          <p className="mt-2 text-xs text-[#a8a092]">Nada à espera de decisão.</p>
        ) : (
          <ul role="list" className="mt-2 grid gap-2">
            {pendentes.slice(0, 6).map((a) => (
              <li key={a.id} className="rounded-xl bg-white/5 p-2 text-xs">
                <p><span className="text-[#e9a35c]">{a.agente} · {ROTULO_TIPO[a.tipo]}</span> — {a.titulo}</p>
                {podeDecidir ? (
                  <div className="mt-1 flex gap-2">
                    {(['aprovada', 'recusada'] as const).map((d) => (
                      <button key={d} type="button" disabled={decisao === a.id}
                        onClick={() => { setDecisao(a.id); void decidir({ id: a.id, decisao: d }).finally(() => setDecisao(null)); }}
                        className={`min-h-9 rounded-full px-3 ${d === 'aprovada' ? 'bg-[#e9a35c] text-[#0b0a09]' : 'border border-white/20'}`}>
                        {d === 'aprovada' ? 'Aprovar' : 'Recusar'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[#a8a092]">Só um administrador pode decidir.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
