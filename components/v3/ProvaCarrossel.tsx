'use client';

import { useEffect, useMemo, useState } from 'react';
import { WARP_CAROUSEL_CARDS, WarpCarousel, type WarpCard } from '@/components/ui/warp-carousel';
import type { V3 } from '@/content/v3/tipo';

/** O que cada cartão desenha por baixo do número (a geometria do componente). */
const DETALHE: WarpCard['detail'][] = ['wave', 'ring', 'none', 'none'];

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
 */
export function ProvaCarrossel({ prova, arabe }: { prova: V3['prova']; arabe: boolean }) {
  const [fonte, setFonte] = useState<string | undefined>(undefined);

  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const familia = css.getPropertyValue(arabe ? '--font-arabe' : '--font-inter').trim();
    const fallback = 'ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
    setFonte(familia ? `${familia}, ${fallback}` : undefined);
  }, [arabe]);

  const cartoes = useMemo<WarpCard[]>(
    () =>
      prova.cartoes.map((c, i) => ({
        ...WARP_CAROUSEL_CARDS[i % WARP_CAROUSEL_CARDS.length]!,
        title: c.titulo,
        value: c.valor,
        unit: c.unidade,
        footer: c.rodape,
        detail: DETALHE[i] ?? 'none',
        labels: undefined,
      })),
    [prova.cartoes],
  );

  return (
    // No telemóvel o palco tem 170 % da largura (os cartões laterais saem pelas
    // margens): o cartão da frente fica com ~240 px em vez de ~140 px.
    <div dir="ltr" className="overflow-hidden rounded-[1.75rem] border border-[var(--v3-linha)]">
      <div className="-ms-[35%] h-[min(520px,128vw)] w-[170%] sm:ms-0 sm:aspect-[16/9] sm:h-auto sm:w-full">
      <WarpCarousel
        cards={cartoes}
        background="#0b0a09"
        font={fonte}
        ariaLabel={prova.carrossel}
        className="focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--v3-ambar)]"
        style={{ outline: undefined, aspectRatio: 'auto', height: '100%', minHeight: 420 }}
      />
      </div>
    </div>
  );
}
