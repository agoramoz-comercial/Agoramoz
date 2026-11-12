'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Download, Plus, Printer, Trash2, Upload } from 'lucide-react';
import { inputClass } from '@/components/form/Field';
import { cn } from '@/lib/utils/cn';
import {
  LIMITES,
  MOEDAS,
  agrupar,
  lerProposta,
  podeSair,
  propostaVazia,
  totais,
  valor,
  verificar,
  type Moeda,
  type Proposta,
} from '@/lib/propostas/modelo';
import { PropostaA4 } from './PropostaA4';

/**
 * O criador de propostas: o formulário à esquerda, as folhas A4 à direita,
 * actualizadas enquanto se escreve, e «Imprimir / guardar PDF» pelo browser.
 *
 * **Nada vai para o servidor.** A proposta vive neste separador: um
 * rascunho no `sessionStorage` (apagado ao fechar o separador e ao terminar
 * a sessão, como os dos espaços privados) e, para a guardar de vez, um
 * ficheiro `.json` que se exporta e volta a importar. Guardar propostas na
 * base pediria uma migração que o fundador aplica à mão — fica como passo
 * seguinte, não como promessa.
 *
 * O que o papel não pode levar fica fora dele: o custo e a margem de cada
 * fase (AEOS: «nenhuma proposta sem margem projetada») aparecem só nas
 * verificações deste ecrã.
 */

export const CHAVE_RASCUNHO = 'proposta:rascunho';

const ROTULO = 'text-sm font-medium';
const AJUDA = 'text-xs text-[color:var(--muted)]';
const CAIXA = 'grid gap-4 border border-[color:var(--border)] bg-[color:var(--surface)] p-4';
const BOTAO =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[--radius-xs] border border-[color:var(--border)] px-3 text-sm hover:bg-[color:var(--surface-raised)] disabled:opacity-50';
const BOTAO_PRIMARIO =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[--radius-xs] bg-[color:var(--color-signal-600)] px-4 text-sm font-medium text-white disabled:opacity-50';

/* ------------------------------------------------------------- campos */

function Campo({
  rotulo,
  valor: v,
  mudar,
  ajuda,
  max = LIMITES.textoCurto,
  area = false,
  linhas = 3,
  placeholder,
}: {
  rotulo: string;
  valor: string;
  mudar: (v: string) => void;
  ajuda?: string;
  max?: number;
  area?: boolean;
  linhas?: number;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className={ROTULO}>
        {rotulo}
      </label>
      {area ? (
        <textarea
          id={id}
          value={v}
          maxLength={max}
          rows={linhas}
          placeholder={placeholder}
          onChange={(e) => mudar(e.target.value)}
          className={cn(inputClass, 'min-h-0')}
        />
      ) : (
        <input id={id} value={v} maxLength={max} placeholder={placeholder} onChange={(e) => mudar(e.target.value)} className={inputClass} />
      )}
      {ajuda && <p className={AJUDA}>{ajuda}</p>}
    </div>
  );
}

function Numero({
  rotulo,
  valor: v,
  mudar,
  min = 0,
  max,
  vazio = false,
}: {
  rotulo: string;
  valor: number | null;
  mudar: (v: number | null) => void;
  min?: number;
  max?: number;
  /** Pode ficar em branco (o custo por indicar). */
  vazio?: boolean;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className={ROTULO}>
        {rotulo}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        value={v ?? ''}
        onChange={(e) => {
          if (e.target.value === '') return mudar(vazio ? null : 0);
          const n = Number(e.target.value);
          if (Number.isFinite(n)) mudar(Math.max(min, max === undefined ? n : Math.min(max, n)));
        }}
        className={cn(inputClass, 'tabular-nums')}
      />
    </div>
  );
}

/** Uma lista de itens com «Acrescentar» e «Retirar», até ao limite que cabe na página. */
function Lista<T>({
  titulo,
  ajuda,
  itens,
  limite,
  novo,
  mudar,
  item,
  nomeItem,
}: {
  titulo: string;
  ajuda?: string;
  itens: readonly T[];
  limite: number;
  novo: () => T;
  mudar: (itens: T[]) => void;
  item: (x: T, mudarItem: (x: T) => void, i: number) => ReactNode;
  nomeItem: string;
}) {
  return (
    <fieldset className={CAIXA}>
      <legend className="px-1 text-sm font-medium">
        {titulo}{' '}
        <span className="text-[color:var(--muted)] tabular-nums">
          ({itens.length}/{limite})
        </span>
      </legend>
      {ajuda && <p className={AJUDA}>{ajuda}</p>}
      {itens.map((x, i) => (
        <div key={i} className="grid gap-3 border-t border-[color:var(--border)] pt-3 first-of-type:border-0 first-of-type:pt-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
              {nomeItem} {i + 1}
            </span>
            <button
              type="button"
              onClick={() => mudar(itens.filter((_, j) => j !== i))}
              className="inline-flex min-h-9 items-center gap-1.5 px-2 text-sm text-[color:var(--muted)] underline hover:text-[color:var(--on-surface)]"
            >
              <Trash2 aria-hidden className="size-3.5" />
              Retirar
              <span className="sr-only">
                {' '}
                {nomeItem} {i + 1}
              </span>
            </button>
          </div>
          {item(x, (novoX) => mudar(itens.map((y, j) => (j === i ? novoX : y))), i)}
        </div>
      ))}
      <button
        type="button"
        disabled={itens.length >= limite}
        onClick={() => mudar([...itens, novo()])}
        className={cn(BOTAO, 'justify-self-start')}
      >
        <Plus aria-hidden className="size-4" />
        Acrescentar {nomeItem.toLowerCase()}
      </button>
    </fieldset>
  );
}

/* ------------------------------------------------------------- editor */

/** As folhas cujo conteúdo passa da margem de baixo (acima do rodapé). */
function folhasQueTransbordam(raiz: HTMLElement): number[] {
  const res: number[] = [];
  for (const pagina of raiz.querySelectorAll<HTMLElement>('[data-pagina]')) {
    const caixa = pagina.getBoundingClientRect();
    // 17 mm do fundo da folha, à escala do ecrã.
    const limite = caixa.bottom - (17 / 297) * caixa.height;
    const conteudo = pagina.querySelector<HTMLElement>('[data-conteudo]');
    if (!conteudo) continue;
    let pior = 0;
    for (const el of conteudo.querySelectorAll<HTMLElement>('*')) {
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      const b = el.getBoundingClientRect();
      if (b.height > 0 && b.bottom > limite) pior = Math.max(pior, b.bottom - limite);
    }
    if (pior > 2) res.push(Number(pagina.dataset.pagina));
  }
  return res;
}

export function EditorProposta({ hoje, inicial }: { hoje: string; inicial?: Proposta }) {
  const [p, setP] = useState<Proposta>(() => inicial ?? propostaVazia(hoje));
  const [carregado, setCarregado] = useState(Boolean(inicial));
  const [escala, setEscala] = useState(0.62);
  const [transbordam, setTransbordam] = useState<number[]>([]);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const folhas = useRef<HTMLDivElement>(null);
  const ficheiro = useRef<HTMLInputElement>(null);

  // Repor o rascunho deste separador, uma vez, depois de montar (o servidor não o vê).
  useEffect(() => {
    if (carregado) return;
    try {
      const guardado = sessionStorage.getItem(CHAVE_RASCUNHO);
      const lido = guardado ? lerProposta(JSON.parse(guardado)) : null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de um armazenamento externo
      if (lido) setP(lido);
    } catch {
      /* sem armazenamento ou rascunho estragado: começa vazio */
    }
    setCarregado(true);
  }, [carregado]);

  useEffect(() => {
    if (!carregado) return;
    try {
      sessionStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(p));
    } catch {
      /* sem armazenamento: o rascunho fica só na memória */
    }
  }, [p, carregado]);

  // Medir depois de desenhar: uma folha que transborda fica marcada e listada.
  useEffect(() => {
    const raiz = folhas.current;
    if (!raiz) return;
    const id = requestAnimationFrame(() => {
      const novas = folhasQueTransbordam(raiz);
      setTransbordam((antes) => (antes.join() === novas.join() ? antes : novas));
    });
    return () => cancelAnimationFrame(id);
  }, [p, escala]);

  const mudar =
    <K extends keyof Proposta>(k: K) =>
    (v: Proposta[K]) =>
      setP((x) => ({ ...x, [k]: v }));
  const avisos = verificar(p);
  const pode = podeSair(avisos);
  const t = totais(p);

  function imprimir() {
    const antes = document.title;
    // O título vira o nome do ficheiro em «Guardar como PDF».
    document.title = `Proposta AGORAMOZ — ${p.projeto || 'sem nome'}${p.cliente ? ` — ${p.cliente}` : ''}`;
    window.addEventListener('afterprint', () => (document.title = antes), {
      once: true,
    });
    window.print();
  }

  function exportar() {
    const blob = new Blob([JSON.stringify(p, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposta-${(p.projeto || 'rascunho').toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMensagem('Rascunho exportado. Para continuar mais tarde, importe este ficheiro.');
  }

  async function importar(f: File | undefined) {
    if (!f) return;
    try {
      if (f.size > 200_000) throw new Error('grande');
      const lido = lerProposta(JSON.parse(await f.text()));
      if (!lido) throw new Error('invalido');
      setP(lido);
      setMensagem('Rascunho importado.');
    } catch {
      setMensagem('Este ficheiro não é um rascunho de proposta válido.');
    }
    if (ficheiro.current) ficheiro.current.value = '';
  }

  function limpar() {
    if (!window.confirm('Apagar a proposta deste separador? O que não foi exportado perde-se.')) return;
    setP(propostaVazia(hoje));
    setMensagem('Proposta apagada.');
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(22rem,30rem)_1fr]">
      <div className="grid content-start gap-5 print:hidden">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={imprimir} disabled={!pode} className={BOTAO_PRIMARIO}>
            <Printer aria-hidden className="size-4" />
            Imprimir / guardar PDF
          </button>
          <button type="button" onClick={exportar} className={BOTAO}>
            <Download aria-hidden className="size-4" />
            Exportar rascunho
          </button>
          <button type="button" onClick={() => ficheiro.current?.click()} className={BOTAO}>
            <Upload aria-hidden className="size-4" />
            Importar
          </button>
          <input
            ref={ficheiro}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-label="Importar rascunho"
            onChange={(e) => void importar(e.target.files?.[0])}
          />
          <button type="button" onClick={limpar} className={BOTAO}>
            Nova
          </button>
        </div>
        <p role="status" className={cn('text-sm', !mensagem && 'sr-only')}>
          {mensagem ?? ''}
        </p>

        <section aria-labelledby="proposta-verificacoes" className={CAIXA}>
          <h2 id="proposta-verificacoes" className="text-base font-medium">
            Verificações
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className={AJUDA}>Total</dt>
              <dd className="tabular-nums">{valor(t.total, p.moeda)}</dd>
            </div>
            <div>
              <dt className={AJUDA}>Prazo</dt>
              <dd className="tabular-nums">
                {t.semanasMin}–{t.semanasMax} semanas
              </dd>
            </div>
            <div>
              <dt className={AJUDA}>Custo estimado (não impresso)</dt>
              <dd className="tabular-nums">{t.custo === null ? 'por indicar' : valor(t.custo, p.moeda)}</dd>
            </div>
            <div>
              <dt className={AJUDA}>Margem projectada (não impressa)</dt>
              <dd className="tabular-nums">{t.margem === null ? 'por projectar' : `${agrupar(Math.round(t.margem * 1000) / 10)} %`}</dd>
            </div>
          </dl>
          {avisos.length + transbordam.length === 0 ? (
            <p className="text-sm">Tudo certo para sair.</p>
          ) : (
            <ul role="list" className="grid gap-1.5 text-sm">
              {avisos.map((a) => (
                <li key={a.texto} className="flex gap-2">
                  <span
                    className={cn(
                      'shrink-0 font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] uppercase',
                      a.nivel === 'bloqueia' ? 'text-[color:var(--color-signal-700)]' : 'text-[color:var(--muted)]',
                    )}
                  >
                    {a.nivel === 'bloqueia' ? 'Falta' : 'Aviso'}
                  </span>
                  {a.texto}
                </li>
              ))}
              {transbordam.map((n) => (
                <li key={`t${n}`} className="flex gap-2">
                  <span className="shrink-0 font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--color-signal-700)] uppercase">
                    Página
                  </span>
                  A página {n} transborda: encurte o texto dessa secção.
                </li>
              ))}
            </ul>
          )}
        </section>

        <fieldset className={CAIXA}>
          <legend className="px-1 text-sm font-medium">Capa</legend>
          <Campo rotulo="Projecto" valor={p.projeto} mudar={mudar('projeto')} ajuda="Aparece no rodapé de cada página." />
          <Campo
            rotulo="Título da capa"
            valor={p.titulo}
            mudar={mudar('titulo')}
            ajuda="Duas a quatro palavras. Em branco, usa o nome do projecto."
          />
          <Campo rotulo="Preparada para (cliente)" valor={p.cliente} mudar={mudar('cliente')} />
          <Campo rotulo="Preparada por" valor={p.preparadaPor} mudar={mudar('preparadaPor')} />
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="proposta-data" className={ROTULO}>
                Data
              </label>
              <input
                id="proposta-data"
                type="date"
                value={p.data}
                onChange={(e) => e.target.value && mudar('data')(e.target.value)}
                className={inputClass}
              />
            </div>
            <Numero rotulo="Validade (dias)" valor={p.validadeDias} min={1} max={365} mudar={(v) => mudar('validadeDias')(v ?? 30)} />
            <div className="grid gap-1.5">
              <label htmlFor="proposta-moeda" className={ROTULO}>
                Moeda
              </label>
              <select id="proposta-moeda" value={p.moeda} onChange={(e) => mudar('moeda')(e.target.value as Moeda)} className={inputClass}>
                {MOEDAS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className={CAIXA}>
          <legend className="px-1 text-sm font-medium">Carta</legend>
          <Campo rotulo="Destinatário" valor={p.destinatario} mudar={mudar('destinatario')} placeholder="Nome e função" />
          <Campo rotulo="Assunto" valor={p.assunto} mudar={mudar('assunto')} />
          <Campo
            rotulo="Carta"
            valor={p.carta}
            mudar={mudar('carta')}
            area
            linhas={7}
            max={LIMITES.carta}
            ajuda="Parágrafos separados por uma linha em branco."
          />
          <Campo
            rotulo="Decisão recomendada"
            valor={p.decisao}
            mudar={mudar('decisao')}
            area
            max={LIMITES.textoMedio}
            ajuda="Uma ou duas frases: o que pedimos ao cliente que decida."
          />
        </fieldset>

        <Lista
          titulo="Contexto"
          ajuda="A situação e o desafio do cliente, como os entendemos."
          itens={p.contexto}
          limite={LIMITES.contexto}
          novo={() => ({ titulo: '', texto: '' })}
          mudar={mudar('contexto')}
          nomeItem="Ponto"
          item={(x, m) => (
            <>
              <Campo rotulo="Título" valor={x.titulo} mudar={(v) => m({ ...x, titulo: v })} />
              <Campo rotulo="Texto" valor={x.texto} mudar={(v) => m({ ...x, texto: v })} area max={LIMITES.textoMedio} />
            </>
          )}
        />

        <Lista
          titulo="Objectivos"
          itens={p.objectivos}
          limite={LIMITES.objectivos}
          novo={() => ''}
          mudar={mudar('objectivos')}
          nomeItem="Objectivo"
          item={(x, m) => <Campo rotulo="Objectivo" valor={x} mudar={m} max={LIMITES.textoMedio} />}
        />

        <Lista
          titulo="Solução"
          ajuda="Os módulos ou componentes da solução."
          itens={p.solucao}
          limite={LIMITES.solucao}
          novo={() => ({ titulo: '', texto: '' })}
          mudar={mudar('solucao')}
          nomeItem="Módulo"
          item={(x, m) => (
            <>
              <Campo rotulo="Módulo" valor={x.titulo} mudar={(v) => m({ ...x, titulo: v })} />
              <Campo rotulo="Descrição" valor={x.texto} mudar={(v) => m({ ...x, texto: v })} area max={LIMITES.textoMedio} />
            </>
          )}
        />

        <Lista
          titulo="Fases e investimento"
          ajuda="O total e as semanas são calculados a partir das fases. O custo nunca é impresso: serve para a margem projectada."
          itens={p.fases}
          limite={LIMITES.fases}
          novo={() => ({
            nome: '',
            entregaveis: '',
            semanasMin: 2,
            semanasMax: 3,
            valor: 0,
            custo: null,
          })}
          mudar={mudar('fases')}
          nomeItem="Fase"
          item={(x, m) => (
            <>
              <Campo rotulo="Nome" valor={x.nome} mudar={(v) => m({ ...x, nome: v })} />
              <Campo
                rotulo="Entregáveis"
                valor={x.entregaveis}
                mudar={(v) => m({ ...x, entregaveis: v })}
                area
                linhas={2}
                max={LIMITES.textoMedio}
              />
              <div className="grid grid-cols-2 gap-3">
                <Numero rotulo="Semanas (mín.)" valor={x.semanasMin} max={104} mudar={(v) => m({ ...x, semanasMin: Math.round(v ?? 0) })} />
                <Numero rotulo="Semanas (máx.)" valor={x.semanasMax} max={104} mudar={(v) => m({ ...x, semanasMax: Math.round(v ?? 0) })} />
                <Numero rotulo={`Preço (${p.moeda})`} valor={x.valor} mudar={(v) => m({ ...x, valor: v ?? 0 })} />
                <Numero rotulo={`Custo (${p.moeda})`} valor={x.custo} vazio mudar={(v) => m({ ...x, custo: v })} />
              </div>
            </>
          )}
        />

        <Lista
          titulo="Opções"
          ajuda="Até três caminhos (A, B, C). Marque um só como recomendado."
          itens={p.opcoes}
          limite={LIMITES.opcoes}
          novo={() => ({
            nome: '',
            descricao: '',
            valor: 0,
            recomendada: false,
          })}
          mudar={mudar('opcoes')}
          nomeItem="Opção"
          item={(x, m, i) => (
            <>
              <Campo rotulo="Nome" valor={x.nome} mudar={(v) => m({ ...x, nome: v })} />
              <Campo
                rotulo="Descrição"
                valor={x.descricao}
                mudar={(v) => m({ ...x, descricao: v })}
                area
                linhas={2}
                max={LIMITES.textoMedio}
              />
              <Numero rotulo={`Investimento (${p.moeda})`} valor={x.valor} mudar={(v) => m({ ...x, valor: v ?? 0 })} />
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={x.recomendada}
                  onChange={(e) => m({ ...x, recomendada: e.target.checked })}
                  className="size-4"
                />
                Recomendada
                <span className="sr-only"> (opção {String.fromCharCode(65 + i)})</span>
              </label>
            </>
          )}
        />

        <Lista
          titulo="Condições comerciais"
          itens={p.condicoes}
          limite={LIMITES.condicoes}
          novo={() => ''}
          mudar={mudar('condicoes')}
          nomeItem="Condição"
          item={(x, m) => (
            <Campo rotulo="Condição" valor={x} mudar={m} max={LIMITES.textoMedio} placeholder="Ex.: pagamento por marco de aceitação" />
          )}
        />

        <Lista
          titulo="Riscos"
          itens={p.riscos}
          limite={LIMITES.riscos}
          novo={() => ({ risco: '', mitigacao: '' })}
          mudar={mudar('riscos')}
          nomeItem="Risco"
          item={(x, m) => (
            <>
              <Campo rotulo="Risco" valor={x.risco} mudar={(v) => m({ ...x, risco: v })} />
              <Campo
                rotulo="Mitigação"
                valor={x.mitigacao}
                mudar={(v) => m({ ...x, mitigacao: v })}
                area
                linhas={2}
                max={LIMITES.textoMedio}
              />
            </>
          )}
        />

        <Lista
          titulo="Próximos passos"
          itens={p.passos}
          limite={LIMITES.passos}
          novo={() => ''}
          mudar={mudar('passos')}
          nomeItem="Passo"
          item={(x, m) => <Campo rotulo="Passo" valor={x} mudar={m} max={LIMITES.textoMedio} />}
        />
      </div>

      <section aria-labelledby="proposta-folhas" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <h2 id="proposta-folhas" className="text-base font-medium">
            Pré-visualização A4
          </h2>
          <label className="flex items-center gap-2 text-sm">
            Escala
            <input
              type="range"
              min={0.35}
              max={1}
              step={0.05}
              value={escala}
              onChange={(e) => setEscala(Number(e.target.value))}
              className="w-32"
            />
            <span className="w-10 tabular-nums">{Math.round(escala * 100)}%</span>
          </label>
        </div>
        <div ref={folhas} className="overflow-x-auto pb-4 print:overflow-visible print:pb-0" style={{ '--escala': escala } as CSSProperties}>
          <PropostaA4 p={p} transbordam={transbordam} />
        </div>
      </section>
    </div>
  );
}
