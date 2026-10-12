'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Briefcase, CornerDownLeft, Keyboard, Search, User, X, Zap } from 'lucide-react';
import { emCampo, filtrarComandos, interpretar, ATALHOS, type Comando } from '@/lib/admin/comandos';
import { FASE_OPORTUNIDADE, type FaseOportunidade } from '@/lib/admin/labels';
import { limparTermo, totalDe, VAZIO, type ResultadoPesquisa } from '@/lib/crm/pesquisa-modelo';
import { cn } from '@/lib/utils/cn';

/**
 * A paleta do admin (⌘K / Ctrl+K, ou `/`): comandos de navegação e pesquisa
 * global numa só caixa, como numa consola. Também escuta os atalhos de uma
 * tecla (`g h`, `g p`, `j`/`k`, `?`), que nunca disparam dentro de campos.
 *
 * Padrão combobox (WAI-ARIA 1.2): o foco fica no campo; ↑/↓ mudam a opção
 * activa por `aria-activedescendant`; Enter abre. O `<dialog>` nativo dá o
 * fecho por Esc, o fundo inerte e a devolução do foco ao fechar.
 *
 * Os atalhos de uma tecla desligam-se na ajuda (WCAG 2.1.4): a escolha fica
 * neste browser. ⌘K/Ctrl+K usa modificador e fica sempre activo.
 */

type Pesquisa = (q: string) => Promise<{ resultado: ResultadoPesquisa; falhou: boolean }>;

interface Item {
  readonly id: string;
  readonly grupo: string;
  readonly texto: string;
  readonly detalhe?: string;
  readonly href: string;
  readonly Icone: typeof Search;
  readonly atalho?: string;
}

const ESPERA_MS = 200;
const ANUNCIO_MS = 500;
const CHAVE_ATALHOS = 'admin.atalhos';

function lerAtalhos(): boolean {
  try {
    return localStorage.getItem(CHAVE_ATALHOS) !== 'off';
  } catch {
    return true;
  }
}

/** A tecla da paleta como o sistema a escreve; no servidor, a do Mac. */
const naoMuda = () => () => {};
function teclaPaleta(): string {
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K';
}
const G_MS = 1500;
const ROTULO =
  'font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase';

function itensDe(comandos: readonly Comando[], q: string, r: ResultadoPesquisa): Item[] {
  const cs = filtrarComandos(comandos, q).slice(0, q.trim() ? 6 : 20);
  return [
    ...cs.map((c) => ({ id: c.id, grupo: c.grupo, texto: c.texto, href: c.href, Icone: Zap, atalho: c.atalho })),
    ...r.oportunidades.map((o) => ({
      id: `op:${o.id}`,
      grupo: 'Oportunidades',
      texto: o.contacto,
      detalhe: [o.organizacao, FASE_OPORTUNIDADE[o.fase as FaseOportunidade]?.texto].filter(Boolean).join(' · '),
      href: `/admin/oportunidades/${o.id}`,
      Icone: Briefcase,
    })),
    ...r.contactos.map((c) => ({
      id: `ct:${c.id}`,
      grupo: 'Contactos',
      texto: c.nome,
      detalhe: c.email ?? undefined,
      href: `/admin/contactos/${c.id}`,
      Icone: User,
    })),
    ...r.organizacoes.map((o) => ({
      id: `org:${o.id}`,
      grupo: 'Organizações',
      texto: o.nome,
      detalhe: o.dominio ?? undefined,
      href: `/admin/organizacoes/${o.id}`,
      Icone: Building2,
    })),
  ];
}

function grupos(itens: readonly Item[]): { nome: string; inicio: number; itens: Item[] }[] {
  const r: { nome: string; inicio: number; itens: Item[] }[] = [];
  itens.forEach((item, i) => {
    const ultimo = r[r.length - 1];
    if (ultimo && ultimo.nome === item.grupo) ultimo.itens.push(item);
    else r.push({ nome: item.grupo, inicio: i, itens: [item] });
  });
  return r;
}

export function Paleta({ comandos, pesquisa }: { comandos: readonly Comando[]; pesquisa: Pesquisa }) {
  const router = useRouter();
  const paleta = useRef<HTMLDialogElement>(null);
  const ajuda = useRef<HTMLDialogElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pedido = useRef(0);
  const gEm = useRef(0);
  const idLista = useId();
  const idTitulo = useId();

  const [q, setQ] = useState('');
  const [resultado, setResultado] = useState<ResultadoPesquisa>(VAZIO);
  const [termoResultado, setTermoResultado] = useState<string | null>(null);
  const [aProcurar, setAProcurar] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [activo, setActivo] = useState(0);
  const [anuncio, setAnuncio] = useState('');
  const [atalhos, setAtalhos] = useState(true);
  const atalhosActivos = useRef(true);
  const lista = useRef<HTMLDivElement>(null);
  const anuncioEm = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tecla = useSyncExternalStore(naoMuda, teclaPaleta, () => '⌘K');

  // A escolha guardada só se lê no browser, depois da hidratação.
  useEffect(() => {
    const v = lerAtalhos();
    atalhosActivos.current = v;
    if (!v) queueMicrotask(() => setAtalhos(false));
  }, []);

  function mudarAtalhos(v: boolean) {
    atalhosActivos.current = v;
    setAtalhos(v);
    try {
      localStorage.setItem(CHAVE_ATALHOS, v ? 'on' : 'off');
    } catch {
      // sem armazenamento (janela privada): vale até fechar a página
    }
  }

  /** Só o número final, meio segundo depois de parar de escrever — sem «a procurar» a cada tecla. */
  function anunciar(texto: string) {
    if (anuncioEm.current) clearTimeout(anuncioEm.current);
    anuncioEm.current = setTimeout(() => setAnuncio(texto), ANUNCIO_MS);
  }

  const termo = limparTermo(q);
  // Só se mostram resultados do termo que está escrito: durante a espera, Enter
  // nunca abre um registo da pesquisa anterior (num CRM, seria outra pessoa).
  const itens = itensDe(comandos, q, termoResultado === termo ? resultado : VAZIO);

  // Ao fechar a página, nada fica pendurado: nem a pesquisa à espera, nem o anúncio.
  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      if (anuncioEm.current) clearTimeout(anuncioEm.current);
    },
    [],
  );

  function abrir() {
    if (ajuda.current?.open) ajuda.current.close();
    if (paleta.current && !paleta.current.open) paleta.current.showModal();
    campo.current?.select();
  }

  function ir(href: string) {
    paleta.current?.close();
    router.push(href);
  }

  function mudar(valor: string) {
    setQ(valor);
    setActivo(0);
    if (lista.current) lista.current.scrollTop = 0;
    if (temporizador.current) clearTimeout(temporizador.current);
    // Um anúncio ainda por dizer refere-se ao termo anterior: cancela-se.
    if (anuncioEm.current) clearTimeout(anuncioEm.current);
    const t = limparTermo(valor);
    const n = ++pedido.current;
    if (!t) {
      setResultado(VAZIO);
      setAProcurar(false);
      setFalhou(false);
      anunciar(`${filtrarComandos(comandos, valor).length} comandos.`);
      return;
    }
    setAProcurar(true);
    temporizador.current = setTimeout(() => {
      pesquisa(t)
        .then((r) => {
          if (n !== pedido.current) return; // chegou uma resposta mais antiga do que a última pergunta
          setResultado(r.resultado);
          setTermoResultado(t);
          setFalhou(r.falhou);
          const total = totalDe(r.resultado);
          anunciar(r.falhou ? 'A pesquisa falhou. Tente de novo.' : total === 0 ? `Sem resultados para «${t}».` : `${total} ${total === 1 ? 'resultado' : 'resultados'}.`);
        })
        .catch(() => {
          if (n === pedido.current) {
            setResultado(VAZIO);
            setFalhou(true);
            anunciar('A pesquisa falhou. Tente de novo.');
          }
        })
        .finally(() => {
          if (n === pedido.current) setAProcurar(false);
        });
    }, ESPERA_MS);
  }

  function noCampo(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (itens.length === 0) return;
      const passo = e.key === 'ArrowDown' ? 1 : -1;
      setActivo((a) => (a + passo + itens.length) % itens.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = itens[activo];
      if (item) ir(item.href);
      else if (termo) ir(`/admin/pesquisa?q=${encodeURIComponent(termo)}`);
    }
  }

  // A opção activa fica sempre à vista quando se navega com as setas.
  useEffect(() => {
    document.getElementById(`${idLista}-${activo}`)?.scrollIntoView({ block: 'nearest' });
  }, [activo, idLista]);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        abrir();
        return;
      }
      if (paleta.current?.open || ajuda.current?.open) return;
      if (!atalhosActivos.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (emCampo(e.target as HTMLElement | null)) return;

      const gPendente = Date.now() - gEm.current < G_MS;
      gEm.current = 0;
      const accao = interpretar(e.key, gPendente);
      switch (accao.tipo) {
        case 'pendente':
          gEm.current = Date.now();
          return;
        case 'paleta':
          e.preventDefault();
          abrir();
          return;
        case 'ajuda':
          e.preventDefault();
          ajuda.current?.showModal();
          return;
        case 'ir':
          e.preventDefault();
          router.push(accao.href);
          return;
        case 'mover': {
          const linhas = [...document.querySelectorAll<HTMLElement>('[data-atalho-linha]')];
          if (linhas.length === 0) return;
          e.preventDefault();
          const agora = linhas.indexOf(document.activeElement as HTMLElement);
          const proxima = agora === -1 ? (accao.passo === 1 ? 0 : linhas.length - 1) : Math.min(linhas.length - 1, Math.max(0, agora + accao.passo));
          linhas[proxima]!.focus();
          linhas[proxima]!.scrollIntoView({ block: 'nearest' });
          return;
        }
        case 'nada':
          return;
      }
    }
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
    // `abrir` e `router` são estáveis para o efeito: só lêem refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={abrir}
          aria-keyshortcuts="Control+K Meta+K"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[--radius-xs] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm text-[color:var(--muted)] hover:text-[color:var(--on-surface)]"
        >
          <Search aria-hidden className="size-4" />
          <span className="flex-1 text-left">Pesquisar</span>
          <kbd aria-hidden className="hidden rounded-[--radius-xs] border border-[color:var(--border)] px-1.5 font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] whitespace-nowrap sm:inline">
            {tecla}
          </kbd>
        </button>
        <button
          type="button"
          onClick={() => ajuda.current?.showModal()}
          aria-label="Atalhos de teclado"
          title="Atalhos de teclado"
          className="flex size-11 shrink-0 items-center justify-center rounded-[--radius-xs] border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted)] hover:text-[color:var(--on-surface)]"
        >
          <Keyboard aria-hidden className="size-4" />
        </button>
      </div>

      <dialog
        ref={paleta}
        aria-labelledby={idTitulo}
        className="mx-auto mt-[4dvh] w-[min(40rem,calc(100vw-2rem))] sm:mt-[10vh] border border-[color:var(--border)] bg-[color:var(--surface)] p-0 text-[color:var(--on-surface)] shadow-2xl backdrop:bg-black/50"
      >
        <h2 id={idTitulo} className="sr-only">
          Pesquisa e comandos
        </h2>
        <div className="flex items-center gap-2 border-b border-[color:var(--border)] px-4">
          <Search aria-hidden className="size-4 shrink-0 text-[color:var(--muted)]" />
          <input
            ref={campo}
            type="text"
            role="combobox"
            aria-label="Pesquisar contactos, organizações, oportunidades ou comandos"
            aria-expanded={itens.length > 0}
            aria-controls={idLista}
            aria-describedby={`${idLista}-dica`}
            aria-autocomplete="list"
            aria-activedescendant={itens[activo] ? `${idLista}-${activo}` : undefined}
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => mudar(e.target.value)}
            onKeyDown={noCampo}
            placeholder="Nome, email, empresa ou comando…"
            className="min-h-14 flex-1 bg-transparent text-base outline-none placeholder:text-[color:var(--muted)]"
          />
          <button
            type="button"
            onClick={() => paleta.current?.close()}
            aria-label="Fechar"
            className="flex size-10 items-center justify-center text-[color:var(--muted)] hover:text-[color:var(--on-surface)]"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        <p role="status" className="sr-only">
          {anuncio}
        </p>

        <div
          ref={lista}
          id={idLista}
          role="listbox"
          aria-label="Resultados"
          // Tocar numa opção não tira o foco do campo: o teclado do telemóvel não fecha a meio do toque.
          onMouseDown={(e) => e.preventDefault()}
          className="max-h-[calc(100dvh-12rem)] overflow-y-auto py-2 sm:max-h-[55vh]"
        >
          {grupos(itens).map((g) => (
            <div key={g.nome} role="group" aria-labelledby={`${idLista}-g-${g.inicio}`}>
              <div id={`${idLista}-g-${g.inicio}`} role="presentation" className={cn(ROTULO, 'px-4 pt-3 pb-1')}>
                {g.nome}
              </div>
              {g.itens.map((item, j) => {
                const i = g.inicio + j;
                const Icone = item.Icone;
                return (
                  <div
                    key={item.id}
                    id={`${idLista}-${i}`}
                    role="option"
                    aria-selected={i === activo}
                    onMouseMove={() => setActivo(i)}
                    onClick={() => ir(item.href)}
                    className={cn(
                      'mx-2 flex cursor-pointer items-center gap-3 rounded-[--radius-xs] px-3 py-3 text-sm sm:py-2',
                      i === activo && 'bg-[color:var(--on-surface)] text-[color:var(--surface)]',
                    )}
                  >
                    <Icone aria-hidden className="size-4 shrink-0 opacity-70" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.texto}</span>
                      {item.detalhe ? <span className="block truncate text-xs opacity-70">{item.detalhe}</span> : null}
                    </span>
                    {item.atalho ? (
                      <kbd aria-hidden className="font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] opacity-70">
                        {item.atalho}
                      </kbd>
                    ) : null}
                    {i === activo ? <CornerDownLeft aria-hidden className="size-3.5 shrink-0" /> : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {itens.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[color:var(--muted)]">
            {aProcurar ? 'A procurar…' : falhou ? 'A pesquisa falhou. Tente de novo.' : `Sem resultados para «${termo ?? q}».`}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--muted)]">
          <span id={`${idLista}-dica`}>
            {aProcurar ? 'A procurar… ' : ''}Setas para escolher, Enter para abrir, Esc para fechar.
          </span>
          {termo ? (
            <button
              type="button"
              onClick={() => ir(`/admin/pesquisa?q=${encodeURIComponent(termo)}`)}
              className="underline"
            >
              Ver na página de pesquisa
            </button>
          ) : null}
        </div>
      </dialog>

      <dialog
        ref={ajuda}
        aria-labelledby={`${idTitulo}-ajuda`}
        className="mx-auto mt-[10vh] w-[min(32rem,calc(100vw-2rem))] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-[color:var(--on-surface)] shadow-2xl backdrop:bg-black/50"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={`${idTitulo}-ajuda`} className="text-lg font-medium">
            Atalhos de teclado
          </h2>
          <button type="button" onClick={() => ajuda.current?.close()} className="min-h-10 px-2 text-sm underline">
            Fechar
          </button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {ATALHOS.map((a) => (
            <div key={a.teclas} className="contents">
              <dt>
                <kbd className="font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)]">{a.teclas}</kbd>
              </dt>
              <dd>{a.faz}</dd>
            </div>
          ))}
        </dl>
        <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 border-t border-[color:var(--border)] pt-4 text-sm">
          <input type="checkbox" checked={atalhos} onChange={(e) => mudarAtalhos(e.target.checked)} className="size-5" />
          Atalhos de uma tecla (/, ?, g, j, k)
        </label>
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          Desligue se usar comandos de voz ou se as teclas dispararem sem querer. Nunca funcionam dentro de campos de texto; {tecla} funciona sempre.
        </p>
      </dialog>
    </>
  );
}
