'use client';

import { Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  primeiroDoLugar,
  rotacao,
  type AnuncioPublico,
  type PosicaoAnuncio,
  type TemaAnuncio,
} from '@/lib/news/anuncios';
import { tokenDoLeitor } from '@/lib/news/leitor';

/**
 * O «outdoor» do AGORAMOZ News — um painel de LED à maneira da Times Square e
 * da fachada da Nasdaq no dia de uma entrada em bolsa: título grande, faixa a
 * correr, criativos que se revezam.
 *
 * - Formato do banner do LinkedIn (4:1) no desktop, 3:1 no tablet, 2:1 no
 *   telemóvel para o texto continuar legível; o texto escala com o painel
 *   (unidades de contentor), nunca sai dele.
 * - Movimento com rédea (WCAG 2.2.2): botão Pausar/Retomar, pausa ao passar o
 *   rato ou com o foco dentro, e com «reduzir movimento» fica tudo parado.
 * - Clique: ligação real para `/api/news/anuncio/[id]`, que conta e manda
 *   para o destino guardado na base — funciona sem JavaScript.
 * - Impressão: ≥ 50 % visível durante ≥ 1 s, uma vez por anúncio e página,
 *   enviada em lote. Na pré-visualização do admin nada é medido.
 */

const TEMA: Record<TemaAnuncio, { fundo: string; texto: string; destaque: string; faixa: string }> = {
  tinta: {
    fundo: 'bg-[radial-gradient(120%_140%_at_85%_0%,#26262a_0%,#0a0a0b_55%)]',
    texto: 'text-[color:var(--color-chalk)]',
    destaque: 'bg-[color:var(--color-signal-600)] text-white',
    faixa: 'bg-black/70 text-[color:var(--color-energy-500)]',
  },
  sinal: {
    fundo: 'bg-[radial-gradient(120%_140%_at_85%_0%,#ff3b10_0%,#b82200_45%,#3a0b00_100%)]',
    texto: 'text-white',
    destaque: 'bg-white text-[color:var(--color-ink-950)]',
    faixa: 'bg-black/55 text-white',
  },
  crescimento: {
    fundo: 'bg-[radial-gradient(120%_140%_at_85%_0%,#00b060_0%,#006b3a_50%,#00170d_100%)]',
    texto: 'text-white',
    destaque: 'bg-[color:var(--color-energy-500)] text-[color:var(--color-ink-950)]',
    faixa: 'bg-black/55 text-[color:var(--color-energy-500)]',
  },
  energia: {
    fundo: 'bg-[radial-gradient(120%_140%_at_85%_0%,#ffe680_0%,#ffd62e_45%,#b38f00_100%)]',
    texto: 'text-[color:var(--color-ink-950)]',
    destaque: 'bg-[color:var(--color-ink-950)] text-[color:var(--color-energy-500)]',
    faixa: 'bg-[color:var(--color-ink-950)] text-[color:var(--color-energy-500)]',
  },
};

const INTERVALO_MS = 7_000;
const VISTO_MS = 1_000;

/** Fila de impressões partilhada pelos outdoors da página, enviada em lote. */
const fila: { id: string; posicao: PosicaoAnuncio }[] = [];
let temporizadorFila: ReturnType<typeof setTimeout> | null = null;
let ouveSaida = false;

function enviarFila(): void {
  if (temporizadorFila) clearTimeout(temporizadorFila);
  temporizadorFila = null;
  while (fila.length > 0) {
    const itens = fila.splice(0, 8);
    let token: string | null = null;
    try {
      token = tokenDoLeitor(window.localStorage);
    } catch {
      token = null;
    }
    const corpo = JSON.stringify({ itens, ...(token ? { token } : {}) });
    try {
      const blob = new Blob([corpo], { type: 'application/json' });
      if (!navigator.sendBeacon?.('/api/news/anuncio/impressoes', blob)) {
        void fetch('/api/news/anuncio/impressoes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: corpo,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Medição é acessória: falhar aqui nunca parte a página.
    }
  }
}

function agendarFila(): void {
  if (!ouveSaida) {
    ouveSaida = true;
    window.addEventListener('pagehide', enviarFila);
  }
  temporizadorFila ??= setTimeout(enviarFila, 2_000);
}

function usaMovimentoReduzido(): boolean {
  return (
    document.documentElement.dataset.motion === 'reduced' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function Outdoor({
  anuncios,
  posicao,
  previa = false,
  className = '',
}: {
  anuncios: readonly AnuncioPublico[];
  posicao: PosicaoAnuncio;
  /** No admin: mostra e roda, mas não mede nem leva a lado nenhum. */
  previa?: boolean;
  className?: string;
}) {
  const ordem = useMemo(() => rotacao(anuncios), [anuncios]);
  const [indice, setIndice] = useState(() => primeiroDoLugar(ordem, posicao));
  const [pausadoPelaPessoa, setPausadoPelaPessoa] = useState(false);
  const [emFoco, setEmFoco] = useState(false);
  const [reduzido, setReduzido] = useState(false);
  const raiz = useRef<HTMLElement>(null);
  const vistos = useRef(new Set<string>());

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const actualizar = () => setReduzido(usaMovimentoReduzido());
    actualizar();
    m.addEventListener('change', actualizar);
    return () => m.removeEventListener('change', actualizar);
  }, []);

  const parado = pausadoPelaPessoa || emFoco || reduzido || ordem.length < 2;
  useEffect(() => {
    if (parado) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % ordem.length), INTERVALO_MS);
    return () => clearInterval(t);
  }, [parado, ordem.length]);

  const actual = ordem.length > 0 ? ordem[indice % ordem.length]! : null;

  // Impressão: o criativo à vista, ≥ 50 % visível, durante ≥ 1 s.
  useEffect(() => {
    if (previa || !actual || !raiz.current || vistos.current.has(actual.id)) return;
    const el = raiz.current;
    let espera: ReturnType<typeof setTimeout> | null = null;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && e.intersectionRatio >= 0.5) {
          espera ??= setTimeout(() => {
            if (vistos.current.has(actual.id)) return;
            vistos.current.add(actual.id);
            fila.push({ id: actual.id, posicao });
            agendarFila();
          }, VISTO_MS);
        } else if (espera) {
          clearTimeout(espera);
          espera = null;
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (espera) clearTimeout(espera);
    };
  }, [actual, posicao, previa]);

  // O token só vai no clique (para contar pessoas únicas), nunca no HTML.
  const aoClicar = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    try {
      const token = tokenDoLeitor(window.localStorage);
      if (token) {
        const u = new URL(e.currentTarget.href);
        u.searchParams.set('t', token);
        e.currentTarget.href = u.toString();
      }
    } catch {
      // Sem armazenamento: o clique conta na mesma, sem a parte «única».
    }
  }, []);

  if (!actual) return null;
  const tema = TEMA[actual.tema];
  const faixa = actual.ticker ?? `${actual.titulo} — ${actual.cta}`;

  const conteudo = (
    <div key={actual.id} className="outdoor-criativo relative flex h-full flex-col">
      <div className="flex min-h-0 flex-1 items-center gap-[3cqi] px-[4cqi] pt-[2.4cqi] pb-[1.2cqi]">
        <div className="min-w-0 flex-1">
          <p className="font-techno text-[clamp(0.625rem,1.35cqi,0.875rem)] font-medium tracking-[0.22em] uppercase opacity-85">
            Publicidade · AGORAMOZ
          </p>
          <p className="outdoor-titulo mt-[0.8cqi] font-display text-[clamp(1.125rem,4.6cqi,3.25rem)] leading-[0.98] font-black tracking-[-0.02em] uppercase text-balance">
            {actual.titulo}
          </p>
          {actual.mensagem && (
            <p className="mt-[1cqi] line-clamp-2 max-w-[60ch] text-[clamp(0.75rem,1.7cqi,1.125rem)] leading-snug opacity-90">
              {actual.mensagem}
            </p>
          )}
        </div>
        <span
          className={`hidden shrink-0 items-center gap-2 px-[2.2cqi] py-[1.1cqi] font-display text-[clamp(0.75rem,1.6cqi,1.0625rem)] font-bold whitespace-nowrap sm:inline-flex ${tema.destaque}`}
        >
          {actual.cta}
          <span aria-hidden="true">→</span>
        </span>
      </div>
      <div className={`relative overflow-hidden py-[0.7cqi] ${tema.faixa}`} aria-hidden="true">
        <div className="outdoor-faixa flex w-max font-techno text-[clamp(0.625rem,1.35cqi,0.9375rem)] font-semibold tracking-[0.14em] whitespace-nowrap uppercase">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="px-[2cqi]">
              {faixa} <span className="opacity-60">◆</span>
            </span>
          ))}
        </div>
      </div>
      <span className="sr-only sm:hidden">{actual.cta}</span>
    </div>
  );

  return (
    <aside
      ref={raiz}
      aria-label="Publicidade"
      data-pausa={parado ? 'sim' : 'nao'}
      onMouseEnter={() => setEmFoco(true)}
      onMouseLeave={() => setEmFoco(false)}
      onFocus={() => setEmFoco(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEmFoco(false);
      }}
      className={`outdoor relative w-full max-w-full overflow-hidden ${className}`}
    >
      <div
        className={`outdoor-led relative aspect-[2/1] w-full overflow-hidden sm:aspect-[3/1] lg:aspect-[4/1] ${tema.fundo} ${tema.texto}`}
      >
        {previa ? (
          <div className="h-full">{conteudo}</div>
        ) : (
          <a
            href={`/api/news/anuncio/${actual.id}?p=${posicao}`}
            onClick={aoClicar}
            rel="sponsored"
            className="block h-full focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-white"
          >
            {conteudo}
          </a>
        )}

        <div className="absolute top-[1.6cqi] right-[1.6cqi] z-10 flex items-center gap-2">
          {ordem.length > 1 && (
            <span className="font-techno text-[0.6875rem] tabular-nums opacity-85" aria-hidden="true">
              {String((indice % ordem.length) + 1).padStart(2, '0')}/
              {String(ordem.length).padStart(2, '0')}
            </span>
          )}
          {ordem.length > 1 && !reduzido && (
            <button
              type="button"
              onClick={() => setPausadoPelaPessoa((p) => !p)}
              aria-pressed={pausadoPelaPessoa}
              aria-label={pausadoPelaPessoa ? 'Retomar os anúncios' : 'Pausar os anúncios'}
              className="grid size-11 place-items-center bg-black/45 text-white backdrop-blur-sm hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-white"
            >
              {pausadoPelaPessoa ? (
                <Play className="size-4" aria-hidden="true" />
              ) : (
                <Pause className="size-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
