import Image from 'next/image';
import aerea from '@/public/terrabuild/render-aerea.webp';
import patio from '@/public/terrabuild/render-patio.webp';
import { cn } from '@/lib/utils/cn';

/**
 * Renders do Blender Cycles (.qa/blender/render.py), feitos a partir dos
 * mesmos dados fictícios da demonstração. Vão sempre com a legenda: são
 * ilustrações, não fotografias nem um projeto aprovado.
 */

const RENDERS = {
  aerea: {
    src: aerea,
    alt: 'Vista aérea ilustrativa da Fazenda Inteligente 001, fictícia, na fase final: talhões com cultura, estradas de gravilha, armazém, unidade de processamento, estufa, viveiro, reservatório e painéis solares, rodeados de savana.',
  },
  patio: {
    src: patio,
    alt: 'Vista ilustrativa do pátio da fazenda fictícia: cruzamento das estradas, casa principal, armazém com dois portões, unidade de processamento, estufa e reservatório.',
  },
} as const;

export const LEGENDA_RENDER =
  'Render ilustrativo (Blender Cycles) feito a partir dos dados fictícios desta demonstração, na fase final. Não é fotografia nem projeto aprovado.';

const IMAGEM = 'h-auto w-full border border-[color:var(--hairline)]';

export function Render({
  qual,
  sizes,
  priority = false,
  legenda = 'longa',
  className,
}: {
  qual: keyof typeof RENDERS;
  sizes: string;
  priority?: boolean;
  legenda?: 'longa' | 'curta';
  className?: string;
}) {
  const r = RENDERS[qual];
  return (
    <figure className={className}>
      <Image src={r.src} alt={r.alt} sizes={sizes} priority={priority} placeholder="blur" className={IMAGEM} />
      <figcaption className="mt-2 text-xs text-[color:var(--muted)]">
        {legenda === 'longa' ? LEGENDA_RENDER : 'Render ilustrativo (Blender) · dados fictícios'}
      </figcaption>
    </figure>
  );
}

/** As duas vistas lado a lado, com uma só legenda. */
export function RendersDuplos({ className }: { className?: string }) {
  return (
    <figure className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', className)}>
      {(['aerea', 'patio'] as const).map((q) => (
        <Image key={q} src={RENDERS[q].src} alt={RENDERS[q].alt} sizes="(min-width: 768px) 50vw, 100vw" placeholder="blur" className={IMAGEM} />
      ))}
      <figcaption className="text-xs text-[color:var(--muted)] md:col-span-2">{LEGENDA_RENDER}</figcaption>
    </figure>
  );
}
