import { CHROME } from '@/content/i18n/chrome';
import type { Idioma } from '@/content/types';
import { t } from '@/lib/i18n/texto';

export function SkipLink({ idioma = 'pt' }: { idioma?: Idioma }) {
  return (
    <a
      href="#conteudo"
      className="sr-only rounded-sm bg-[color:var(--color-ink-950)] px-4 py-3 text-white focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-[100]"
    >
      {t(CHROME.saltar, idioma)}
    </a>
  );
}
