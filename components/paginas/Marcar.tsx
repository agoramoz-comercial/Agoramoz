import { Section } from '@/components/ui/Section';
import { CalendarioCal } from '@/components/v3/CalendarioCal';
import { LigacaoVidro } from '@/components/v3/LigacaoVidro';
import { MARCAR } from '@/content/i18n/marcar';
import type { Idioma } from '@/content/types';
import { serverEnv } from '@/lib/config/env';
import { t } from '@/lib/i18n/texto';

/** O Cal.com alojado serve o embed em app.cal.com; uma instalação própria, na sua origem. */
function origemDoEmbed(origem: string): string {
  return new URL(origem).host === 'cal.com' ? 'https://app.cal.com' : origem.replace(/\/$/, '');
}

function configuracao(): { calLink?: string; embedOrigin: string; direct: string } {
  try {
    const env = serverEnv();
    const origem = env.CAL_ORIGIN;
    return {
      calLink: env.CAL_LINK,
      embedOrigin: origemDoEmbed(origem),
      direct: env.CAL_LINK ? new URL(`/${env.CAL_LINK}`, origem).toString() : origem,
    };
  } catch {
    return { embedOrigin: 'https://app.cal.com', direct: 'https://cal.com' };
  }
}

/**
 * A página de marcação, nos dois idiomas: a conversa de 30 min no Cal.com,
 * dentro de um painel de vidro líquido, com o que esperar e as garantias ao
 * lado. Sem `CAL_LINK`, mostra a alternativa por e-mail.
 */
export function Marcar({ idioma, trilho }: { idioma: Idioma; trilho: React.ReactNode }) {
  const cfg = configuracao();
  const mailto = `mailto:comercial@agoramoz.com?subject=${encodeURIComponent(t(MARCAR.assunto, idioma))}`;

  return (
    <Section surface="deep" contour>
      {trilho}
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="v3-etiqueta flex items-center gap-3 text-[var(--v3-cinza)]">
            <span className="tabular-nums">(01)</span>
            <span>{t(MARCAR.etiqueta, idioma)}</span>
          </p>
          <h1 className="v3-titulo mt-8 max-w-[14ch]">{t(MARCAR.titulo, idioma)}</h1>
          <p className="mt-8 max-w-[44ch] text-lg leading-relaxed text-[var(--v3-cinza)]">{t(MARCAR.texto, idioma)}</p>

          <div className="v3-vidro mt-12 p-6">
            <h2 className="v3-etiqueta text-[var(--v3-cinza)]">{t(MARCAR.esperarTitulo, idioma)}</h2>
            <ol className="mt-4">
              {MARCAR.esperar.map((e, i) => (
                <li key={e.pt} className="flex items-baseline gap-5 border-t border-[var(--v3-linha)] py-3 first:border-t-0">
                  <span className="w-6 shrink-0 tabular-nums text-[var(--v3-ambar)]">{String(i + 1).padStart(2, '0')}</span>
                  <span>{t(e, idioma)}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="v3-vidro mt-4 p-6">
            <h2 className="v3-etiqueta text-[var(--v3-cinza)]">{t(MARCAR.garantiasTitulo, idioma)}</h2>
            <ul className="mt-4 grid gap-2.5">
              {MARCAR.garantias.map((g) => (
                <li key={g.pt} className="flex items-center gap-3 text-[0.95rem]">
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--v3-ambar)]" />
                  {t(g, idioma)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          {cfg.calLink ? (
            <>
              <CalendarioCal
                idioma={idioma}
                calLink={cfg.calLink}
                embedOrigin={cfg.embedOrigin}
                ligacaoDirecta={`mailto:comercial@agoramoz.com?subject=${encodeURIComponent(t(MARCAR.assunto, idioma))}`}
                textos={{
                  calendario: t(MARCAR.calendario, idioma),
                  carregando: t(MARCAR.carregando, idioma),
                  alternativa: t(MARCAR.alternativa, idioma),
                  abrirCal: t(MARCAR.escrever, idioma),
                }}
              />
              <noscript>
                <p className="mt-4 text-sm text-[var(--v3-cinza)]">
                  {t(MARCAR.semJs, idioma)}{' '}
                  <a
                    href={`mailto:comercial@agoramoz.com?subject=${encodeURIComponent(t(MARCAR.assunto, idioma))}`}
                    className="underline underline-offset-4"
                  >
                    {t(MARCAR.escrever, idioma)}
                  </a>
                </p>
              </noscript>
            </>
          ) : (
            <div className="v3-vidro p-8">
              <p className="text-lg text-[var(--v3-cinza)]">{t(MARCAR.semCal, idioma)}</p>
              <LigacaoVidro
                href={mailto}
                material="regular"
                appearance="dark"
                refraction={6}
                size="sm"
                className="mt-6 min-h-11 bg-[var(--v3-noite)]/60! px-5 text-[0.9rem] font-medium tracking-normal text-[var(--v3-papel)] ring-1 ring-[var(--v3-linha)]"
              >
                {t(MARCAR.escrever, idioma)}
              </LigacaoVidro>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
