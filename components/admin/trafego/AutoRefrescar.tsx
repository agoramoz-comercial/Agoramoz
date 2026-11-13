'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Volta a ler o painel de tempos a tempos (o «agora» envelhece), só com o separador visível. */
export function AutoRefrescar({ segundos }: { segundos: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, segundos * 1000);
    return () => window.clearInterval(id);
  }, [router, segundos]);
  return null;
}
