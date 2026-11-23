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
 * O «outdoor» do AGORAMOZ News — em vidro (glassmorphism, o sistema v3): uma
 * cena de cor, o criativo num painel de vidro fosco com chamada em pílula, a
 * faixa a correr numa cápsula de vidro e criativos que se revezam.
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

/**
 * Glassmorphism (o sistema de vidro v3): cada tema é uma «cena» de cor com
 * luzes suaves, e o criativo vive num painel de vidro fosco por cima — 24 px
 * de raio, borda clara, chamada em pílula. O véu do vidro é escuro (texto
 * papel) ou claro (texto tinta) conforme a cena, para o contraste passar AA.
 */
const TEMA: Record<TemaAnuncio, { cena: string; vidro: string; texto: string; cta: string; faixa: string }> = {
  tinta: {
    cena: 'bg-[radial-gradient(60%_90%_at_18%_20%,#e9a35c_0%,transparent_60%),radial-gradient(50%_80%_at_85%_80%,#5b4bd1_0%,transparent_62%),linear-gradient(135deg,#1d1915,#0b0a09)]',
    vidro: 'outdoor-vidro-escuro',
    texto: 'text-[#f6f1e7]',
    cta: 'bg-[#f6f1e7] text-[#0b0a09] hover:bg-white',
    faixa: 'outdoor-vidro-escuro text-[#f6f1e7]',
  },
  sinal: {
    cena: 'bg-[radial-gradient(60%_90%_at_20%_15%,#ff8a4c_0%,transparent_60%),radial-gradient(55%_85%_at_88%_85%,#b0124a_0%,transparent_62%),linear-gradient(135deg,#c2410c,#3a0b00)]',
    vidro: 'outdoor-vidro-escuro',
    texto: 'text-white',
    cta: 'bg-white text-[#3a0b00] hover:bg-[#fff4ec]',
    faixa: 'outdoor-vidro-escuro text-white',
  },
  crescimento: {
    cena: 'bg-[radial-gradient(60%_90%_at_15%_20%,#5eead4_0%,transparent_60%),radial-gradient(55%_85%_at_85%_80%,#0f766e_0%,transparent_62%),linear-gradient(135deg,#047857,#022c22)]',
    vidro: 'outdoor-vidro-escuro',
    texto: 'text-white',
    cta: 'bg-white text-[#022c22] hover:bg-[#ecfdf5]',
    faixa: 'outdoor-vidro-escuro text-white',
  },
  energia: {
    cena: 'bg-[radial-gradient(60%_90%_at_18%_18%,#fff3b0_0%,transparent_60%),radial-gradient(55%_85%_at_86%_84%,#f59e0b_0%,transparent_62%),linear-gradient(135deg,#fcd34d,#b45309)]',
    vidro: 'outdoor-vidro-claro',
    texto: 'text-[#1a1408]',
    cta: 'bg-[#1a1408] text-[#fff7d6] hover:bg-black',
    faixa: 'outdoor-vidro-claro text-[#1a1408]',
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
        className={`relative flex h-full flex-col gap-[1.6cqi] p-[2.4cqi] [grid-area:1/1] ${activo ? 'outdoor-criativo' : 'invisible'}`}
        lang={idioma === 'en' ? 'pt' : undefined}
      >
        <div className="flex min-h-0 flex-1 items-end sm:items-center">
          <div className={`outdoor-vidro ${temaAd.vidro} w-full max-w-[52rem] rounded-[24px] p-[max(1rem,2.6cqi)]`}>
            <p
              id={id('rotulo')}
              lang={idioma}
              className="inline-flex rounded-full border border-current/25 px-3 py-1 text-[clamp(0.625rem,1.2cqi,0.8125rem)] font-medium tracking-[0.18em] uppercase"
            >
              {t.publicidade} · AGORAMOZ
            </p>
            <p
              id={id('titulo')}
              className="mt-[1cqi] text-[clamp(1.25rem,4.2cqi,3rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance sm:line-clamp-2"
            >
              {ad.titulo}
            </p>
            {ad.mensagem && (
              <p className="mt-[0.8cqi] max-w-[60ch] text-[clamp(0.8125rem,1.6cqi,1.0625rem)] leading-snug opacity-90 sm:line-clamp-2">
                {ad.mensagem}
              </p>
            )}
            <span
              id={id('cta')}
              className={`mt-[1.6cqi] inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[clamp(0.8125rem,1.5cqi,1rem)] font-semibold whitespace-nowrap transition-colors ${temaAd.cta}`}
            >
              {ad.cta}
              <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
        <div className={`outdoor-vidro relative overflow-hidden rounded-full py-[0.6cqi] ${temaAd.faixa}`} aria-hidden="true">
          <div className="outdoor-faixa flex w-max text-[clamp(0.625rem,1.25cqi,0.875rem)] font-medium tracking-[0.12em] whitespace-nowrap uppercase">
            {Array.from({ length: activo ? 8 : 1 }, (_, i) => (
              <span key={i} className="px-[2cqi]">
                {faixaAd} <span className="opacity-60">·</span>
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
        className={`outdoor-cena relative min-h-[64cqi] w-full overflow-hidden rounded-[24px] sm:min-h-[16rem] ${tema.cena} ${tema.texto}`}
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
            className="block h-full rounded-[24px] focus-visible:shadow-[inset_0_0_0_3px_#0a0a0b] focus-visible:outline-3 focus-visible:-outline-offset-6 focus-visible:outline-white"
          >
            {conteudo}
          </a>
        )}

        <div className="absolute top-[1.6cqi] right-[1.6cqi] z-10 flex items-center gap-2">
          {ordem.length > 1 && (
            <span
              className="rounded-full bg-black/55 px-2.5 py-1 text-[0.6875rem] text-white tabular-nums backdrop-blur-md"
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
              className="grid size-11 place-items-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md hover:bg-black/65 focus-visible:shadow-[0_0_0_2px_#0a0a0b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
