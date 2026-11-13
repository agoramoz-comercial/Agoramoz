import { avisarMotores } from '@/lib/admin/indexnow-actions';
import { cn } from '@/lib/utils/cn';

/**
 * O estado do SEO que se controla daqui (D-47): verificação nos motores e o
 * aviso IndexNow. Diz o que falta e de quem é o passo — nada aparece «ligado»
 * sem estar.
 */
const CAIXA = 'border border-[color:var(--border)] bg-[color:var(--surface)]';

function Estado({ ok, sim, nao }: { ok: boolean; sim: string; nao: string }) {
  return (
    <li className="flex gap-2">
      <span
        aria-hidden
        className={cn(
          'mt-1.5 size-2 shrink-0 rounded-full',
          ok ? 'bg-[color:var(--color-growth-500)]' : 'bg-[color:var(--color-signal-600)]',
        )}
      />
      <span>{ok ? sim : nao}</span>
    </li>
  );
}

export function PainelSeo({ google, bing, podeAvisar }: { google: boolean; bing: boolean; podeAvisar: boolean }) {
  return (
    <section aria-labelledby="trafego-seo" className={cn(CAIXA, 'grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center')}>
      <div className="grid gap-2">
        <h2 id="trafego-seo" className="text-base font-medium">
          Motores de pesquisa
        </h2>
        <ul role="list" className="grid gap-1 text-sm">
          <Estado
            ok={google}
            sim="Google Search Console: verificação publicada no site."
            nao="Google Search Console: por verificar. Passo seu: criar a propriedade agoramoz.com, copiar o código da meta-tag para GOOGLE_SITE_VERIFICATION na Vercel e submeter /sitemap.xml."
          />
          <Estado
            ok={bing}
            sim="Bing Webmaster Tools: verificação publicada no site."
            nao="Bing Webmaster Tools: por verificar (BING_SITE_VERIFICATION). O aviso IndexNow funciona na mesma."
          />
          <Estado ok sim="Sitemap com todas as páginas, incluindo os artigos da lei e do News: /sitemap.xml." nao="" />
        </ul>
      </div>
      {podeAvisar && (
        <form action={avisarMotores}>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-[--radius-xs] border border-[color:var(--border)] px-4 text-sm hover:bg-[color:var(--surface-raised)]"
          >
            Avisar os motores de páginas novas (IndexNow)
          </button>
        </form>
      )}
    </section>
  );
}
