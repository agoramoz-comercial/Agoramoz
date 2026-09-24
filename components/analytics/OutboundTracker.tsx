'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { track } from '@/lib/analytics/track';
import { COUNTRY_CODES } from '@/content/registry';
import type { CountryCode } from '@/content/types';

/**
 * Regista cliques em WhatsApp, por delegação.
 *
 * Porquê delegação e não um componente em cada âncora: os links de WhatsApp
 * estão em seis ficheiros — rodapé, cabeçalho, barra móvel, formulário, página
 * de erro, contactos — e vários deles são componentes de servidor, onde não se
 * pode chamar `track()`. Envolver cada um obrigaria a converter ficheiros em
 * cliente só para medir.
 *
 * E há a razão melhor: `whatsapp_clicked` existe no vocabulário desde o início
 * e **nunca foi disparado uma única vez**, porque ninguém se lembrou de o
 * ligar em cada sítio novo. A delegação apanha o sétimo link no dia em que ele
 * aparecer, sem ninguém se lembrar de nada.
 *
 * O WhatsApp é o canal que o mercado moçambicano de facto usa — está escrito
 * em `content/countries/mz.ts`, em `voice.emphasis`. Não medir estes cliques é
 * não medir o canal principal.
 */
export function OutboundTracker() {
  const caminho = usePathname();

  useEffect(() => {
    function aoClicar(evento: MouseEvent) {
      const alvo = (evento.target as Element | null)?.closest?.('a[href*="wa.me/"]');
      if (!alvo) return;

      /**
       * O país só é afirmado quando a rota o diz. Numa página que não é de
       * país, `null` é a verdade — inventar `mz` por ser o mercado principal
       * poria dados falsos num relatório de canal.
       */
      const primeiro = caminho.split('/')[1] ?? '';
      const pais = (COUNTRY_CODES as readonly string[]).includes(primeiro)
        ? (primeiro as CountryCode)
        : null;

      track({ name: 'whatsapp_clicked', country: pais, surface: caminho.slice(0, 40) || '/' });
    }

    document.addEventListener('click', aoClicar, { capture: true });
    return () => document.removeEventListener('click', aoClicar, { capture: true });
  }, [caminho]);

  return null;
}
