import { cn } from '@/lib/utils/cn';

/**
 * Arte de círculos sobrepostos nas cores do logótipo (D-51). Decorativa e
 * escondida dos leitores de ecrã. Substitui a fotografia onde a composição pede
 * imagem: a AGORAMOZ não usa fotografias de banco nem imagens de terceiros.
 *
 * Cada variante é um fundo em gradiente com três ou quatro discos em
 * `mix-blend-mode: multiply`, que se tingem onde se cruzam.
 */

type Disco = { x: string; y: string; d: string; cor: string };

const VARIANTES: Record<'sol' | 'campo' | 'noite' | 'mar', { fundo: string; discos: Disco[] }> = {
  sol: {
    fundo: 'linear-gradient(160deg, #ff3300 0%, #ff8a1f 55%, #ffd21f 100%)',
    discos: [
      { x: '8%', y: '-10%', d: '70%', cor: 'radial-gradient(circle at 35% 35%, #ffd21f, #ff3300 70%)' },
      { x: '45%', y: '20%', d: '75%', cor: 'radial-gradient(circle at 60% 30%, #00be64, #0a0a0b 85%)' },
      { x: '-15%', y: '45%', d: '80%', cor: 'radial-gradient(circle at 40% 40%, #ff3300, #ffd21f 80%)' },
    ],
  },
  campo: {
    fundo: 'linear-gradient(200deg, #00be64 0%, #7fd14a 45%, #ffd21f 100%)',
    discos: [
      { x: '30%', y: '-20%', d: '80%', cor: 'radial-gradient(circle at 50% 50%, #ffd21f, #ff3300 80%)' },
      { x: '-20%', y: '30%', d: '70%', cor: 'radial-gradient(circle at 40% 40%, #00be64, #0a0a0b 90%)' },
      { x: '50%', y: '50%', d: '65%', cor: 'radial-gradient(circle at 30% 30%, #ffd21f, #00be64 80%)' },
    ],
  },
  noite: {
    fundo: 'linear-gradient(180deg, #0a0a0b 0%, #1a1a1d 100%)',
    discos: [
      { x: '-10%', y: '10%', d: '70%', cor: 'radial-gradient(circle at 40% 40%, #ff3300, transparent 72%)' },
      { x: '35%', y: '-15%', d: '75%', cor: 'radial-gradient(circle at 50% 50%, #ffd21f, transparent 70%)' },
      { x: '40%', y: '45%', d: '70%', cor: 'radial-gradient(circle at 50% 50%, #00be64, transparent 70%)' },
    ],
  },
  mar: {
    fundo: 'linear-gradient(135deg, #ffd21f 0%, #00be64 100%)',
    discos: [
      { x: '-12%', y: '-12%', d: '62%', cor: 'radial-gradient(circle at 50% 50%, #ff3300, #ffd21f 85%)' },
      { x: '40%', y: '5%', d: '68%', cor: 'radial-gradient(circle at 40% 60%, #00be64, #0a0a0b 92%)' },
      { x: '15%', y: '50%', d: '72%', cor: 'radial-gradient(circle at 60% 40%, #ff3300, #ffd21f 80%)' },
      { x: '62%', y: '58%', d: '55%', cor: 'radial-gradient(circle at 50% 50%, #ffd21f, #00be64 85%)' },
    ],
  },
};

export function Circulos({
  variante = 'sol',
  className,
  pontos = false,
}: {
  variante?: keyof typeof VARIANTES;
  className?: string;
  /** Trama de pontos (meio-tom) por cima. */
  pontos?: boolean;
}) {
  const v = VARIANTES[variante];
  return (
    <div aria-hidden className={cn('relative isolate overflow-hidden', className)} style={{ backgroundImage: v.fundo }}>
      {v.discos.map((d, i) => (
        <span
          key={i}
          className="absolute aspect-square rounded-full mix-blend-multiply"
          style={{ left: d.x, top: d.y, width: d.d, backgroundImage: d.cor }}
        />
      ))}
      {pontos ? <span className="v2-pontos absolute inset-0 opacity-50" /> : null}
    </div>
  );
}
