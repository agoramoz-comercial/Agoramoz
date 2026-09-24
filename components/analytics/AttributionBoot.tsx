'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { registarVisita } from '@/lib/attribution/storage';

/**
 * Regista a origem em cada página vista.
 *
 * Depende de `usePathname` e não de um efeito de montagem única porque o Next
 * faz navegação do lado do cliente: o componente não volta a montar quando se
 * muda de página, e sem isto o «último toque» ficaria congelado na primeira.
 *
 * Não renderiza nada e não bloqueia nada. Sem JavaScript não há atribuição, e
 * a origem fica «desconhecido» — que é verdade, e é melhor do que reconstruí-la
 * a partir do cabeçalho `Referer` do POST, que diria `/diagnostico` e seria uma
 * atribuição inventada.
 */
export function AttributionBoot() {
  const caminho = usePathname();

  useEffect(() => {
    registarVisita();
  }, [caminho]);

  return null;
}
