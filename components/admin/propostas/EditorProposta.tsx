'use client';

import { useEffect, useId, useRef, useState, useTransition, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardPaste, Download, FileUp, Plus, Printer, Save, Trash2, Upload } from 'lucide-react';
import { guardarProposta } from '@/lib/admin/propostas-actions';
import { ACEITES, ErroFicheiro, textoDoFicheiro } from '@/lib/propostas/ficheiro';
import { lerTexto, MAX_TEXTO_COLADO, type Relatorio } from '@/lib/propostas/texto';
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
import type { OportunidadeOpcao } from '@/lib/propostas/leitura';
import { PropostaA4 } from './PropostaA4';

/**
 * O criador de propostas: o formulário à esquerda, as folhas A4 à direita,
 * actualizadas enquanto se escreve, e «Descarregar PDF» pelo browser. O
 * texto de uma proposta pode ser colado e lido para as folhas (`texto.ts`).
 *
 * **Onde fica.** Com a 0020 aplicada (`base`), «Guardar» grava uma versão
 * nova e imutável na base, ligada ou não a uma oportunidade do Pipeline. Sem
 * ela, a proposta vive só neste separador e guarda-se exportando um `.json`.
 * Em ambos os casos, o que se está a escrever fica num rascunho do
 * `sessionStorage` (apagado ao fechar o separador e ao terminar a sessão),
 * para um recarregar não deitar trabalho fora.
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

/* ------------------------------------------------------- colar e guardar */

function PainelColar({
  colado,
  mudar,
  gerar,
  carregar,
  aLer,
  relatorio,
}: {
  colado: string;
  mudar: (v: string) => void;
  gerar: () => void;
  carregar: (f: File) => void;
  aLer: boolean;
  relatorio: Relatorio | null;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [porCima, setPorCima] = useState(false);
  return (
    <section
      aria-labelledby="proposta-colar"
      className={cn(CAIXA, porCima && 'outline-2 outline-offset-2 outline-[color:var(--color-signal-600)] outline-dashed')}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setPorCima(true);
      }}
      onDragLeave={() => setPorCima(false)}
      onDrop={(e) => {
        const f = e.dataTransfer.files[0];
        if (!f) return;
        e.preventDefault();
        setPorCima(false);
        carregar(f);
      }}
    >
      <div>
        <h2 id="proposta-colar" className="text-base font-medium">
          Carregar ou colar a proposta
        </h2>
        <p className={cn(AJUDA, 'mt-1')}>
          Envie o documento (.docx, .pdf, .txt ou .md — pode arrastá-lo para aqui) ou cole o texto. O documento é lido neste computador, não
          é enviado para lado nenhum. O leitor reconhece os títulos das secções — Contexto, Objectivos, Solução, Cronograma, Investimento,
          Opções, Condições, Riscos, Próximos passos — e os dados da capa em linhas «Cliente:», «Data:», «Validade:». Não reescreve nada: só
          arruma o texto nas folhas e diz o que não soube onde pôr.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => entrada.current?.click()} disabled={aLer} className={BOTAO}>
          <FileUp aria-hidden className="size-4" />
          {aLer ? 'A ler o ficheiro…' : 'Carregar ficheiro'}
        </button>
        <span className={AJUDA}>Word (.docx), PDF com texto, .txt ou .md · até 10 MB</span>
        <input
          ref={entrada}
          type="file"
          accept={ACEITES}
          className="sr-only"
          tabIndex={-1}
          aria-label="Carregar o documento da proposta"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) carregar(f);
            e.target.value = '';
          }}
        />
      </div>
      <label htmlFor="proposta-texto" className="sr-only">
        Texto da proposta
      </label>
      <textarea
        id="proposta-texto"
        value={colado}
        maxLength={MAX_TEXTO_COLADO}
        rows={8}
        onChange={(e) => mudar(e.target.value)}
        placeholder={
          'Proposta comercial — Nome do projecto\n\nCliente: …\nData: …\nValidade: 30 dias\n\nContexto\n- …\n\nInvestimento\nFase\tSemanas\tValor\n…'
        }
        className={cn(inputClass, 'min-h-0 font-mono text-sm')}
      />
      <button type="button" onClick={gerar} disabled={colado.trim().length < 20} className={cn(BOTAO, 'justify-self-start')}>
        <ClipboardPaste aria-hidden className="size-4" />
        Gerar o desenho editorial
      </button>
      {relatorio && (
        <div className="grid gap-3 border-t border-[color:var(--border)] pt-3 text-sm" aria-live="polite">
          <p>
            <span className="font-medium">Reconhecido: </span>
            {relatorio.reconhecidas.length ? relatorio.reconhecidas.join(' · ') : 'nenhuma secção.'}
          </p>
          {relatorio.avisos.length > 0 && (
            <ul role="list" className="grid gap-1">
              {relatorio.avisos.map((a) => (
                <li key={a} className="flex gap-2">
                  <span className="shrink-0 font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
                    Aviso
                  </span>
                  {a}
                </li>
              ))}
            </ul>
          )}
          {relatorio.naoReconhecido.length > 0 && (
            <div className="grid gap-2">
              <p className="font-medium">
                Sem lugar nas folhas ({relatorio.naoReconhecido.length}) — copie para o campo certo, se fizer falta:
              </p>
              {relatorio.naoReconhecido.map((x, i) => (
                <details key={i} className="border border-[color:var(--border)] px-3 py-2">
                  <summary className="cursor-pointer">{x.titulo || 'Sem título'}</summary>
                  <p className="mt-2 whitespace-pre-wrap text-[color:var(--muted)]">{x.texto}</p>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function PainelGuardar({
  base,
  p,
  textoColado,
  pode,
  limparRascunho,
}: {
  base: GuardarNaBase;
  p: Proposta;
  textoColado: string | null;
  pode: boolean;
  limparRascunho: () => void;
}) {
  const router = useRouter();
  const [dealId, setDealId] = useState(base.dealId ?? '');
  const [nota, setNota] = useState('');
  const [revisao, setRevisao] = useState(base.revisao);
  const [resultado, setResultado] = useState<string | null>(null);
  const [aGuardar, comecar] = useTransition();
  const idOportunidade = useId();
  const idNota = useId();

  function guardar() {
    comecar(async () => {
      let r: Awaited<ReturnType<typeof guardarProposta>>;
      try {
        r = await guardarProposta({
          id: base.id,
          revisao: base.id ? revisao : null,
          dealId: dealId || null,
          conteudo: p,
          textoColado: textoColado?.trim() ? textoColado : null,
          nota: nota.trim() || null,
        });
      } catch {
        setResultado('Não foi possível guardar agora. A proposta continua no editor: tente de novo ou exporte o rascunho.');
        return;
      }
      if (!r.ok) {
        setResultado(r.erro);
        return;
      }
      limparRascunho();
      setNota('');
      setRevisao(r.revisao);
      if (!base.id) {
        router.replace(`/admin/propostas/${r.id}`);
        return;
      }
      setResultado(r.nova ? `Versão ${r.versao} guardada.` : `Sem alterações desde a versão ${r.versao}.`);
      router.replace(`/admin/propostas/${r.id}`);
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="proposta-guardar" className={CAIXA}>
      <h2 id="proposta-guardar" className="text-base font-medium">
        {base.id ? `Guardar como versão ${(base.versao ?? 0) + 1}` : 'Guardar na base'}
      </h2>
      {base.fechada ? (
        <p className="text-sm">Esta proposta está fechada: pode lê-la e descarregá-la. Para a mudar, volte a pô-la em rascunho.</p>
      ) : (
        <>
          <div className="grid gap-1.5">
            <label htmlFor={idOportunidade} className={ROTULO}>
              Oportunidade no Pipeline
            </label>
            <select id={idOportunidade} value={dealId} onChange={(e) => setDealId(e.target.value)} className={inputClass}>
              <option value="">Sem oportunidade</option>
              {base.oportunidades.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.rotulo}
                </option>
              ))}
            </select>
            <p className={AJUDA}>Ligada, cada versão e cada mudança de estado aparecem na cronologia da oportunidade.</p>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor={idNota} className={ROTULO}>
              Nota desta versão (opcional)
            </label>
            <input
              id={idNota}
              value={nota}
              maxLength={300}
              onChange={(e) => setNota(e.target.value)}
              className={inputClass}
              placeholder="Ex.: preço revisto depois da reunião"
            />
          </div>
          <button type="button" onClick={guardar} disabled={!pode || aGuardar} className={cn(BOTAO, 'justify-self-start')}>
            <Save aria-hidden className="size-4" />
            {aGuardar ? 'A guardar…' : base.id ? 'Guardar nova versão' : 'Guardar proposta'}
          </button>
          {!pode && <p className={AJUDA}>Para guardar, resolva primeiro o que as verificações marcam como «Falta».</p>}
        </>
      )}
      <p role="status" className={cn('text-sm', !resultado && 'sr-only')}>
        {resultado ?? ''}
      </p>
    </section>
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

/** Guardar na base (0020). Sem isto, o editor trabalha só no separador. */
export interface GuardarNaBase {
  /** `null` numa proposta nova. */
  readonly id: string | null;
  readonly revisao: number | null;
  readonly versao: number | null;
  readonly dealId: string | null;
  readonly oportunidades: readonly OportunidadeOpcao[];
  readonly textoColado: string | null;
  /** Aceite, recusada ou arquivada: lê-se e descarrega-se, não se grava. */
  readonly fechada: boolean;
}

export function EditorProposta({ hoje, inicial, base }: { hoje: string; inicial?: Proposta; base?: GuardarNaBase }) {
  const chaveRascunho = `${CHAVE_RASCUNHO}:${base?.id ?? 'nova'}:${base?.versao ?? 0}`;
  const [p, setP] = useState<Proposta>(() => inicial ?? propostaVazia(hoje));
  // Uma proposta guardada abre como está na base; só a nova (ou uma versão
  // com alterações por guardar neste separador) lê o rascunho.
  const [carregado, setCarregado] = useState(false);
  const [escala, setEscala] = useState(0.62);
  const [transbordam, setTransbordam] = useState<number[]>([]);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [colado, setColado] = useState(base?.textoColado ?? '');
  const [usadoColado, setUsadoColado] = useState(Boolean(base?.textoColado));
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const folhas = useRef<HTMLDivElement>(null);
  const ficheiro = useRef<HTMLInputElement>(null);

  // Repor o rascunho deste separador, uma vez, depois de montar (o servidor não o vê).
  useEffect(() => {
    if (carregado) return;
    try {
      const guardado = sessionStorage.getItem(chaveRascunho);
      const lido = guardado ? lerProposta(JSON.parse(guardado)) : null;
      if (lido && JSON.stringify(lido) !== JSON.stringify(inicial ?? propostaVazia(hoje))) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de um armazenamento externo
        setP(lido);
        if (inicial) setMensagem('Recuperámos alterações por guardar deste separador.');
      }
    } catch {
      /* sem armazenamento ou rascunho estragado: começa como veio */
    }
    setCarregado(true);
  }, [carregado, chaveRascunho, inicial, hoje]);

  useEffect(() => {
    if (!carregado) return;
    try {
      sessionStorage.setItem(chaveRascunho, JSON.stringify(p));
    } catch {
      /* sem armazenamento: o rascunho fica só na memória */
    }
  }, [p, carregado, chaveRascunho]);

  /** Do texto (colado ou vindo de um ficheiro) às folhas. Os avisos do ficheiro vão à frente no relatório. */
  function gerar(texto: string = colado, avisosDoFicheiro: readonly string[] = [], origem?: string): void {
    const vazia = JSON.stringify(p) === JSON.stringify(propostaVazia(p.data));
    if (!vazia && !window.confirm(`Substituir a proposta que está no editor pelo ${origem ? `conteúdo de «${origem}»` : 'texto colado'}?`))
      return;
    const leitura = lerTexto(texto, hoje);
    setP(leitura.proposta);
    setRelatorio({ ...leitura.relatorio, avisos: [...avisosDoFicheiro, ...leitura.relatorio.avisos] });
    setUsadoColado(true);
    setMensagem(
      origem
        ? `Desenho gerado a partir de «${origem}». Reveja o relatório e as folhas.`
        : 'Desenho gerado a partir do texto colado. Reveja o relatório e as folhas.',
    );
  }

  const [aLer, setALer] = useState(false);
  async function carregar(f: File): Promise<void> {
    setALer(true);
    setMensagem(`A ler «${f.name}»…`);
    try {
      const { texto, avisos } = await textoDoFicheiro(f);
      if (texto.trim().length < 20) throw new ErroFicheiro('O ficheiro não tem texto suficiente para uma proposta.');
      const cortado = texto.slice(0, MAX_TEXTO_COLADO);
      setColado(cortado);
      gerar(
        cortado,
        texto.length > MAX_TEXTO_COLADO
          ? [`O documento tinha ${texto.length} caracteres; só os primeiros ${MAX_TEXTO_COLADO} foram lidos.`, ...avisos]
          : avisos,
        f.name,
      );
    } catch (e) {
      setMensagem(e instanceof ErroFicheiro ? e.message : 'Não foi possível ler este ficheiro. Abra-o e cole o texto.');
    } finally {
      setALer(false);
    }
  }

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
        <PainelColar colado={colado} mudar={setColado} gerar={() => gerar()} carregar={carregar} aLer={aLer} relatorio={relatorio} />

        {base && (
          <PainelGuardar
            base={base}
            p={p}
            textoColado={usadoColado ? colado : null}
            pode={pode}
            limparRascunho={() => {
              try {
                sessionStorage.removeItem(chaveRascunho);
              } catch {
                /* sem armazenamento */
              }
            }}
          />
        )}

        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={imprimir} disabled={!pode} className={BOTAO_PRIMARIO}>
              <Printer aria-hidden className="size-4" />
              Descarregar PDF
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
            {!base && (
              <button type="button" onClick={limpar} className={BOTAO}>
                Nova
              </button>
            )}
          </div>
          <p className={AJUDA}>
            «Descarregar PDF» abre o diálogo de impressão: em «Destino», escolha «Guardar como PDF». Fica em A4, uma folha por página.
          </p>
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
        <div
          ref={folhas}
          className="overflow-x-auto pb-4 print:overflow-visible print:pb-0"
          style={{ '--escala': escala } as CSSProperties}
        >
          <PropostaA4 p={p} transbordam={transbordam} />
        </div>
      </section>
    </div>
  );
}
