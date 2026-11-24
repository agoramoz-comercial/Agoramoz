"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ErroLocal } from "@/components/v3/ErroLocal";
import {
  WARP_CAROUSEL_CARDS,
  WarpCarousel,
  type WarpCard,
} from "@/components/ui/warp-carousel";
import type { V3 } from "@/content/v3/tipo";

/** O que cada cartão desenha por baixo do número (a geometria do componente). */
const DETALHE: WarpCard["detail"][] = ["wave", "ring", "none", "none"];

/**
 * «Produtos AGORAMOZ a funcionar» no WarpCarousel (anel 3D em WebGL, com
 * recurso a Canvas 2D). Os números são reais e já publicados: 2 edições do
 * Moz News, mais de 1 000 páginas de lei no Cívico, até 3 ciclos de
 * verificação nos Cursos (MAX_TENTATIVAS) e 3 camadas de dados no TerraBuild.
 *
 * - O tipo de letra do canvas é o do site: lê-se a família real do next/font
 *   (`--font-inter`, ou `--font-arabe` em árabe) depois de montar.
 * - O desenho fica sempre em `dir="ltr"`: o canvas alinha o texto pelo
 *   início, e em RTL os títulos sairiam do cartão. O árabe continua a ser
 *   moldado correctamente dentro de cada linha.
 * - As cores (malhas, números, brilho) são as do componente, pela ordem.
 * - O canvas não tem ligações: as quatro páginas continuam por baixo, em lista.
 * - Telemóveis: o WebGL só existe perto do ecrã (monta a ~1 ecrã de distância
 *   e desmonta a ~2,5 ecrãs, libertando a GPU). Com o vidro, o formulário e
 *   o anel todos vivos ao mesmo tempo, o Safari do iPhone esgotava a memória
 *   da GPU depois da secção (04) e fechava o separador.
 * - Se o WebGL/canvas falhar, ficam os quatro cartões estáticos, em vidro.
 */
export function ProvaCarrossel({
  prova,
  arabe,
}: {
  prova: V3["prova"];
  arabe: boolean;
}) {
  const [fonte, setFonte] = useState<string | undefined>(undefined);

  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const familia = css
      .getPropertyValue(arabe ? "--font-arabe" : "--font-inter")
      .trim();
    const fallback =
      'ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
    queueMicrotask(() => setFonte(familia ? `${familia}, ${fallback}` : undefined));
  }, [arabe]);

  const cartoes = useMemo<WarpCard[]>(
    () =>
      prova.cartoes.map((c, i) => ({
        ...WARP_CAROUSEL_CARDS[i % WARP_CAROUSEL_CARDS.length]!,
        title: c.titulo,
        value: c.valor,
        unit: c.unidade,
        footer: c.rodape,
        detail: DETALHE[i] ?? "none",
        labels: undefined,
      })),
    [prova.cartoes],
  );

  const palco = useRef<HTMLDivElement>(null);
  const [perto, setPerto] = useState(false);

  useEffect(() => {
    const el = palco.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setPerto(true));
      return;
    }
    const tactil = window.matchMedia("(pointer: coarse)").matches;
    const entrar = new IntersectionObserver(
      (e) => e.some((x) => x.isIntersecting) && setPerto(true),
      {
        rootMargin: "100% 0px",
      },
    );
    // Só nos ecrãs tácteis se desmonta: aí a memória da GPU é o limite.
    const sair = tactil
      ? new IntersectionObserver(
          (e) => e.every((x) => !x.isIntersecting) && setPerto(false),
          {
            rootMargin: "250% 0px",
          },
        )
      : null;
    entrar.observe(el);
    sair?.observe(el);
    return () => {
      entrar.disconnect();
      sair?.disconnect();
    };
  }, []);

  const estatico = (
    <ul dir="auto" className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
      {prova.cartoes.map((c) => (
        <li
          key={c.titulo}
          className="v3-vidro flex min-h-40 flex-col justify-between gap-4 p-5"
        >
          <p className="text-sm text-[var(--v3-cinza)]">{c.titulo}</p>
          <p className="text-4xl font-medium tracking-[-0.04em]">
            {c.valor}
            {c.unidade && (
              <span className="ms-1 text-lg text-[var(--v3-cinza)]">
                {c.unidade}
              </span>
            )}
          </p>
          <p className="text-xs text-[var(--v3-cinza)]">{c.rodape}</p>
        </li>
      ))}
    </ul>
  );

  return (
    // No telemóvel o palco tem 170 % da largura (os cartões laterais saem pelas
    // margens): o cartão da frente fica com ~240 px em vez de ~140 px.
    <ErroLocal alternativa={estatico}>
      <div
        dir="ltr"
        className="overflow-hidden rounded-[1.75rem] border border-[var(--v3-linha)] bg-[#0b0a09]"
      >
        <div
          ref={palco}
          className="-ms-[35%] h-[min(520px,128vw)] min-h-[420px] w-[170%] sm:ms-0 sm:aspect-[16/9] sm:h-auto sm:w-full"
        >
          {perto && (
            <WarpCarousel
              cards={cartoes}
              background="#0b0a09"
              font={fonte}
              ariaLabel={prova.carrossel}
              className="focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--v3-ambar)]"
              style={{
                outline: undefined,
                aspectRatio: "auto",
                height: "100%",
                minHeight: 420,
              }}
            />
          )}
        </div>
      </div>
    </ErroLocal>
  );
}
