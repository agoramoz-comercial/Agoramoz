import { CHROME } from '@/content/i18n/chrome';
import type { Idioma } from '@/content/types';
import { t } from '@/lib/i18n/texto';

/**
 * Marca uma ligação, numa página inglesa, para uma página que só existe em
 * português. Quem clica sabe para onde vai; quem usa leitor de ecrã ouve-o por
 * extenso em vez de «P T». A ligação que a usa leva também `hrefLang="pt"`.
 */
/**
 * `herdar`: dentro de um botão, o marcador usa a cor do texto do botão. A cor
 * secundária da superfície não serve aí (sobre o azul do CTA falha o contraste).
 */
export function SoPortugues({ idioma, herdar = false }: { idioma: Idioma; herdar?: boolean }) {
  if (idioma === 'pt') return null;
  return (
    <>
      <span aria-hidden className={herdar ? 'ml-1.5 opacity-80' : 'ml-1.5 text-[color:var(--muted)]'}>
        (PT)
      </span>
      <span className="sr-only"> ({t(CHROME.soPortuguesSr, idioma)})</span>
    </>
  );
}
