import type { Projeto } from '@/content/projetos/tipos';
import { altura, type Terreno } from '@/lib/terrabuild/terreno';

/**
 * Do terreno (metros, y a norte) para a cena 3D: x → X; y (norte) → −Z;
 * cota → Y, exagerada ×2 para o relevo de 15 m num terreno de 400 m se ler.
 * Partilhado pela cena procedimental e pela realista (modelos do Blender).
 */
export const EXAGERO = 2;

export function aMundo(p: Projeto, x: number, y: number): [number, number] {
  return [x - p.terreno.largura / 2, -(y - p.terreno.profundidade / 2)];
}

export function cota(t: Terreno, x: number, y: number): number {
  return altura(t, x, y) * EXAGERO;
}
