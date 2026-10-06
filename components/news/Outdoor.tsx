'use client';

import { Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  primeiroDoLugar,
  rotacao,
  type AnuncioPublico,
  type PosicaoAnuncio,
  type TemaAnuncio,
} from '@/lib/news/anuncios';
import { chaveNoBrowser, tokenDoLeitor } from '@/lib/news/leitor';

/**
 * O «outdoor» do AGORAMOZ News — um painel de LED à maneira da Times Square e
 * da fachada da Nasdaq no dia de uma entrada em bolsa: título grande, faixa a
 * correr, criativos que se revezam.
 *
 * - Formato do banner do LinkedIn (4:1) no desktop, 3:1 no tablet, 2:1 no
 *   telemóvel para o texto continuar legível; o texto escala com o painel
 *   (unidades de contentor), nunca sai dele.
 * - Movimento com rédea (WCAG 2.2.2): botão Pausar/Retomar, pausa ao passar o
 *   rato ou com o foco dentro, e com «reduzir movimento» (do sistema OU do
 *   interruptor do site) fica tudo parado.
 * - Clique: ligação real para `/api/news/anuncio/[id]`, que conta e manda
 *   para o destino guardado na base — funciona sem JavaScript.
 * - Impressão: ≥ 50 % visível durante ≥ 1 s, uma vez por anúncio e por lugar
 *   da página (o «que lugar converte» precisa de cada um), enviada em lote.
 *   Na pré-visualização do admin nada é medido.
 * - Os criativos são escritos em português; na edição inglesa ficam marcados
 *   com `lang="pt"` para o leitor de ecrã os ler com a voz certa.
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

const TEXTO = {
  pt: { publicidade: 'Publicidade', pausar: 'Pausar os anúncios', retomar: 'Retomar os anúncios' },
  en: { publicidade: 'Advertisement', pausar: 'Pause the ads', retomar: 'Resume the ads' },
} as const;

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
    // `pagehide` falha muitas vezes no telemóvel; a aba a ficar oculta não.
    window.addEventListener('pagehide', enviarFila);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') enviarFila();
    });
  }
  temporizadorFila ??= setTimeout(enviarFila, 2_000);
}

/** Movimento reduzido pelo sistema OU pelo interruptor do site (`MotionToggle`). */
function usaMovimentoReduzido(): boolean {
  return (
    document.documentElement.dataset.motion === 'reduced' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function subscreverMovimento(avisar: () => void): () => void {
  const m = window.matchMedia('(prefers-reduced-motion: reduce)');
  m.addEventListener('change', avisar);
  window.addEventListener('agoramoz:motion-change', avisar);
  return () => {
    m.removeEventListener('change', avisar);
    window.removeEventListener('agoramoz:motion-change', avisar);
  };
}

export function Outdoor({
  anuncios,
  posicao,
  idioma = 'pt',
  previa = false,
  className = '',
}: {
  anuncios: readonly AnuncioPublico[];
  posicao: PosicaoAnuncio;
  idioma?: 'pt' | 'en';
  /** No admin: mostra e roda, mas não mede nem leva a lado nenhum. */
  previa?: boolean;
  className?: string;
}) {
  const ordem = useMemo(() => rotacao(anuncios), [anuncios]);
  const [indice, setIndice] = useState(() => primeiroDoLugar(ordem, posicao));
  const [pausadoPelaPessoa, setPausadoPelaPessoa] = useState(false);
  const [emFoco, setEmFoco] = useState(false);
  const reduzido = useSyncExternalStore(subscreverMovimento, usaMovimentoReduzido, () => false);
  const raiz = useRef<HTMLElement>(null);
  const vistos = useRef(new Set<string>());
  const ids = useId();
  const t = TEXTO[idioma];

  // `parado` pára a faixa (CSS); a troca de criativos precisa ainda de ≥ 2.
  const parado = pausadoPelaPessoa || emFoco || reduzido;
  const roda = !parado && ordem.length >= 2;
  useEffect(() => {
    if (!roda) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % ordem.length), INTERVALO_MS);
    return () => clearInterval(t);
  }, [roda, ordem.length]);

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

  // Para contar pessoas únicas, o clique leva a chave JÁ derivada para este
  // anúncio (`sha256(token:id)`), calculada aqui quando o criativo aparece —
  // o token em si nunca vai num URL nem no HTML.
  const chaves = useRef(new Map<string, string>());
  useEffect(() => {
    if (previa || !actual || chaves.current.has(actual.id)) return;
    let token: string | null = null;
    try {
      token = tokenDoLeitor(window.localStorage);
    } catch {
      token = null;
    }
    if (!token) return;
    const id = actual.id;
    void chaveNoBrowser(token, id).then((k) => {
      if (k) chaves.current.set(id, k);
    });
  }, [actual, previa]);

  const aoClicar = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const k = actual ? chaves.current.get(actual.id) : undefined;
      if (!k) return; // Sem chave: o clique conta na mesma, sem a parte «única».
      const u = new URL(e.currentTarget.href);
      u.searchParams.set('k', k);
      e.currentTarget.href = u.toString();
    },
    [actual],
  );

  if (!actual) return null;
  const tema = TEMA[actual.tema];

  // Todos os criativos empilhados na MESMA célula da grelha: o painel fica com
  // a altura do maior (no telemóvel cresce com o texto, nunca o corta) e a
  // rotação não faz a página saltar. Só o activo se vê e se lê.
  const distintos = [...new Map(ordem.map((a) => [a.id, a])).values()];
  const criativo = (ad: AnuncioPublico, activo: boolean) => {
    const temaAd = TEMA[ad.tema];
    const faixaAd = ad.ticker ?? `${ad.titulo} — ${ad.cta}`;
    const id = (sufixo: string) => (activo ? `${ids}-${sufixo}` : undefined);
    return (
      <div
        key={activo ? ad.id : `medida-${ad.id}`}
        aria-hidden={activo ? undefined : true}
        className={`relative flex h-full flex-col [grid-area:1/1] ${activo ? 'outdoor-criativo' : 'invisible'}`}
        lang={idioma === 'en' ? 'pt' : undefined}
      >
        <div className="flex min-h-0 flex-1 items-center gap-[3cqi] px-[4cqi] pt-[2.4cqi] pb-[1.2cqi]">
          <div className="min-w-0 flex-1">
            <p
              id={id('rotulo')}
              lang={idioma}
              className="pr-24 font-techno text-[clamp(0.625rem,1.35cqi,0.875rem)] font-medium tracking-[0.22em] uppercase sm:pr-0"
            >
              {t.publicidade} · AGORAMOZ
            </p>
            <p
              id={id('titulo')}
              className="outdoor-titulo mt-[0.8cqi] font-display text-[clamp(1.125rem,4.6cqi,3.25rem)] leading-[0.98] font-black tracking-[-0.02em] text-balance uppercase sm:line-clamp-3"
            >
              {ad.titulo}
            </p>
            {ad.mensagem && (
              <p className="mt-[1cqi] max-w-[60ch] text-[clamp(0.75rem,1.7cqi,1.125rem)] leading-snug opacity-90 sm:line-clamp-2">
                {ad.mensagem}
              </p>
            )}
          </div>
          <span
            id={id('cta')}
            className={`hidden shrink-0 items-center gap-2 px-[2.2cqi] py-[1.1cqi] font-display text-[clamp(0.75rem,1.6cqi,1.0625rem)] font-bold whitespace-nowrap sm:inline-flex ${temaAd.destaque}`}
          >
            {ad.cta}
            <span aria-hidden="true">→</span>
          </span>
        </div>
        <div className={`relative overflow-hidden py-[0.7cqi] ${temaAd.faixa}`} aria-hidden="true">
          <div className="outdoor-faixa flex w-max font-techno text-[clamp(0.625rem,1.35cqi,0.9375rem)] font-semibold tracking-[0.14em] whitespace-nowrap uppercase">
            {Array.from({ length: activo ? 8 : 1 }, (_, i) => (
              <span key={i} className="px-[2cqi]">
                {faixaAd} <span className="opacity-60">◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };
  const conteudo = (
    <div className="grid h-full grid-cols-[minmax(0,1fr)]">
      {criativo(actual, true)}
      {distintos.filter((a) => a.id !== actual.id).map((a) => criativo(a, false))}
    </div>
  );

  return (
    <aside
      ref={raiz}
      aria-label={t.publicidade}
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
        className={`outdoor-led relative min-h-[50cqi] w-full overflow-hidden sm:aspect-[3/1] sm:min-h-0 lg:aspect-[4/1] ${tema.fundo} ${tema.texto}`}
      >
        {previa ? (
          <div className="h-full">{conteudo}</div>
        ) : (
          <a
            href={`/api/news/anuncio/${actual.id}?p=${posicao}`}
            onClick={aoClicar}
            onAuxClick={aoClicar}
            rel="sponsored"
            // O nome: «Publicidade · AGORAMOZ, <título>, <chamada>» (a chamada
            // escondida no telemóvel conta na mesma: aria-labelledby lê-a).
            aria-labelledby={`${ids}-rotulo ${ids}-titulo ${ids}-cta`}
            // Anel em dois tons (branco sobre tinta): visível em todos os temas,
            // incluindo o amarelo da energia e o verde do crescimento.
            className="block h-full focus-visible:shadow-[inset_0_0_0_3px_#0a0a0b] focus-visible:outline-3 focus-visible:-outline-offset-6 focus-visible:outline-white"
          >
            {conteudo}
          </a>
        )}

        <div className="absolute top-[1.6cqi] right-[1.6cqi] z-10 flex items-center gap-2">
          {ordem.length > 1 && (
            <span
              className="bg-black/55 px-1.5 py-0.5 font-techno text-[0.6875rem] text-white tabular-nums"
              aria-hidden="true"
            >
              {String((indice % ordem.length) + 1).padStart(2, '0')}/{String(ordem.length).padStart(2, '0')}
            </span>
          )}
          {!reduzido && (
            <button
              type="button"
              onClick={() => setPausadoPelaPessoa((p) => !p)}
              aria-pressed={pausadoPelaPessoa}
              // Nome fixo; o estado diz-se com aria-pressed (o ícone muda).
              aria-label={t.pausar}
              title={pausadoPelaPessoa ? t.retomar : t.pausar}
              className="grid size-11 place-items-center bg-black/55 text-white backdrop-blur-sm hover:bg-black/70 focus-visible:shadow-[0_0_0_2px_#0a0a0b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
