'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Briefcase, CornerDownLeft, Search, User, X, Zap } from 'lucide-react';
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
  const [aProcurar, setAProcurar] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [activo, setActivo] = useState(0);

  const itens = itensDe(comandos, q, resultado);
  const termo = limparTermo(q);

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
    if (temporizador.current) clearTimeout(temporizador.current);
    const t = limparTermo(valor);
    const n = ++pedido.current;
    if (!t) {
      setResultado(VAZIO);
      setAProcurar(false);
      setFalhou(false);
      return;
    }
    setAProcurar(true);
    temporizador.current = setTimeout(() => {
      pesquisa(t)
        .then((r) => {
          if (n !== pedido.current) return; // chegou uma resposta mais antiga do que a última pergunta
          setResultado(r.resultado);
          setFalhou(r.falhou);
        })
        .catch(() => {
          if (n === pedido.current) {
            setResultado(VAZIO);
            setFalhou(true);
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

  const estado = aProcurar
    ? 'A procurar…'
    : falhou
      ? 'A pesquisa falhou. Tente de novo.'
      : termo
        ? totalDe(resultado) === 0
          ? `Sem resultados para «${termo}». ${itens.length} comandos.`
          : `${totalDe(resultado)} resultados, ${itens.length - totalDe(resultado)} comandos.`
        : `${itens.length} comandos. Escreva pelo menos 2 letras para pesquisar.`;

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-keyshortcuts="Control+K Meta+K"
        className="flex min-h-11 w-full items-center gap-2 rounded-[--radius-xs] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm text-[color:var(--muted)] hover:text-[color:var(--on-surface)]"
      >
        <Search aria-hidden className="size-4" />
        <span className="flex-1 text-left">Pesquisar</span>
        <kbd aria-hidden className="rounded-[--radius-xs] border border-[color:var(--border)] px-1.5 font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)]">
          ⌘K
        </kbd>
      </button>

      <dialog
        ref={paleta}
        aria-labelledby={idTitulo}
        className="mx-auto mt-[10vh] w-[min(40rem,calc(100vw-2rem))] border border-[color:var(--border)] bg-[color:var(--surface)] p-0 text-[color:var(--on-surface)] shadow-2xl backdrop:bg-black/50"
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
            aria-expanded="true"
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-activedescendant={itens[activo] ? `${idLista}-${activo}` : undefined}
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => mudar(e.target.value)}
            onKeyDown={noCampo}
            placeholder="Nome, email, empresa ou comando…"
            className="min-h-14 flex-1 bg-transparent text-base outline-none"
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
          {estado}
        </p>

        <ul id={idLista} role="listbox" aria-label="Resultados" className="max-h-[55vh] overflow-y-auto py-2">
          {itens.map((item, i) => {
            const cabecalho = i === 0 || itens[i - 1]!.grupo !== item.grupo ? item.grupo : null;
            const Icone = item.Icone;
            return (
              <li key={item.id} role="presentation">
                {cabecalho ? (
                  <p role="presentation" className={cn(ROTULO, 'px-4 pt-3 pb-1')}>
                    {cabecalho}
                  </p>
                ) : null}
                <div
                  id={`${idLista}-${i}`}
                  role="option"
                  aria-selected={i === activo}
                  onMouseMove={() => setActivo(i)}
                  onClick={() => ir(item.href)}
                  className={cn(
                    'mx-2 flex cursor-pointer items-center gap-3 rounded-[--radius-xs] px-3 py-2 text-sm',
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
              </li>
            );
          })}
        </ul>

        <div aria-hidden className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--muted)]">
          <span>{aProcurar ? 'A procurar…' : falhou ? 'A pesquisa falhou.' : termo && totalDe(resultado) === 0 ? `Sem resultados para «${termo}»` : '↑ ↓ escolher · Enter abrir · Esc fechar'}</span>
          <span>? atalhos</span>
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
        <p className="mt-4 text-xs text-[color:var(--muted)]">Os atalhos de uma tecla não funcionam dentro de campos de texto.</p>
      </dialog>
    </>
  );
}
