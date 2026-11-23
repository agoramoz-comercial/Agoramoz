import Link from 'next/link';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import { AttributionBoot } from '@/components/analytics/AttributionBoot';
import { MedicaoPaginas } from '@/components/analytics/MedicaoPaginas';
import { OutboundTracker } from '@/components/analytics/OutboundTracker';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { SiteJsonLd } from '@/components/seo/JsonLd';
import { NavV3 } from '@/components/v3/NavV3';
import { PreCarregarCal } from '@/components/v3/PreCarregarCal';
import { serverEnv } from '@/lib/config/env';
import { TransicaoVista } from '@/components/v3/TransicaoVista';
import { CursorPonto, Intro, TransicaoPagina } from '@/components/v3/motion';
import type { Lingua } from '@/content/types';
import { LINGUAS, direcaoDe } from '@/lib/i18n/texto';
import { INICIO_DA_LINGUA, NOME_DA_LINGUA, paginaV3, textosV3 } from '@/lib/i18n/v3';

/** Só o árabe precisa de glifos que o Inter não tem. */
const arabe = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  variable: '--font-arabe',
  display: 'swap',
});

/**
 * A casca v3 de todo o site público (página inicial nas seis línguas e as
 * páginas interiores em pt/en, via SiteChrome): sem o cabeçalho, o rodapé
 * nem a barra do design anterior. Mantém o que não é design — medição, JSON-LD, scroll suave
 * (Lenis) — e marca a língua e o sentido de leitura do bloco inteiro.
 */
export function CascaV3({
  lingua,
  inicio = false,
  children,
}: {
  lingua: Lingua;
  /** Página inicial: o «Diagnóstico» do menu leva ao formulário na própria página. */
  inicio?: boolean;
  children: React.ReactNode;
}) {
  const x = textosV3(lingua);
  const p = (c: string) => paginaV3(c, lingua);
  const ligacoes = [
    { rotulo: x.nav.solucoes, ...p('/solucoes') },
    { rotulo: x.nav.como, ...p('/como-trabalhamos') },
    { rotulo: x.nav.projetos, ...p('/projetos') },
    { rotulo: x.nav.news, ...p('/news') },
    { rotulo: x.nav.contactos, ...p('/contactos') },
  ];
  const ano = new Date().getFullYear();
  const MARCAR: Record<Lingua, string> = {
    pt: 'Marcar conversa',
    en: 'Book a meeting',
    fr: 'Prendre rendez-vous',
    es: 'Reservar una reunión',
    de: 'Termin buchen',
    ar: 'حجز موعد',
  };
  const rodape = [...ligacoes, { rotulo: MARCAR[lingua], ...p('/marcar') }];
  /** O calendário a aquecer (ver PreCarregarCal); sem CAL_LINK, nada. */
  const cal = (() => {
    try {
      const env = serverEnv();
      if (!env.CAL_LINK) return null;
      const origem = env.CAL_ORIGIN;
      const embedOrigin = new URL(origem).host === 'cal.com' ? 'https://app.cal.com' : origem.replace(/\/$/, '');
      return { calLink: env.CAL_LINK, embedOrigin };
    } catch {
      return null;
    }
  })();

  return (
    <div
      lang={NOME_DA_LINGUA[lingua].hreflang}
      dir={direcaoDe(lingua)}
      className={`v3 ${arabe.variable} min-h-screen overflow-x-clip`}
    >
      <a
        href="#conteudo"
        className="fixed start-4 top-4 z-[300] -translate-y-24 rounded-full bg-[var(--v3-papel)] px-4 py-2 text-sm text-[var(--v3-noite)] focus:translate-y-0"
      >
        {x.nav.saltar}
      </a>
      <SiteJsonLd />
      <AttributionBoot />
      <MedicaoPaginas />
      <OutboundTracker />
      <MotionProvider>
        <Intro />
        <TransicaoPagina />
        <CursorPonto />
        {cal && <PreCarregarCal calLink={cal.calLink} embedOrigin={cal.embedOrigin} />}
        <NavV3
          lingua={lingua}
          ligacoes={ligacoes}
          diagnostico={{ rotulo: x.nav.diagnostico, ...(inicio ? { href: '#diagnostico' } : p('/diagnostico')) }}
          rotulos={{ menu: x.nav.menu, fechar: x.nav.fechar, lingua: x.nav.lingua, inicio: 'AGORAMOZ' }}
        />
        <main id="conteudo">
          <TransicaoVista>{children}</TransicaoVista>
        </main>

        <footer className="relative overflow-hidden border-t border-[var(--v3-linha)] px-4 pt-20 pb-8 sm:px-6">
          <div className="mx-auto max-w-[110rem]">
            <div className="grid gap-12 md:grid-cols-12">
              <nav aria-label={x.nav.menu} className="md:col-span-5">
                <ul className="grid gap-2 text-2xl font-medium tracking-[-0.03em]">
                  {rodape.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} hrefLang={l.hrefLang} className="hover:text-[var(--v3-cinza)]">
                        {l.rotulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="md:col-span-4">
                <p className="v3-etiqueta text-[var(--v3-cinza)]">{x.rodape.lingua}</p>
                <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {LINGUAS.map((l) => (
                    <li key={l}>
                      <Link
                        href={INICIO_DA_LINGUA[l]}
                        hrefLang={NOME_DA_LINGUA[l].hreflang}
                        lang={NOME_DA_LINGUA[l].hreflang}
                        aria-current={l === lingua ? 'true' : undefined}
                        className={l === lingua ? 'text-[var(--v3-papel)]' : 'text-[var(--v3-cinza)] hover:text-[var(--v3-papel)]'}
                      >
                        {NOME_DA_LINGUA[l].nome}
                      </Link>
                    </li>
                  ))}
                </ul>
                {lingua !== 'pt' && lingua !== 'en' && <p className="mt-4 text-xs text-[var(--v3-cinza)]">{x.rodape.nota}</p>}
              </div>
              <div className="flex flex-col gap-2 text-sm md:col-span-3 md:items-end">
                <Link {...p('/privacidade')} className="text-[var(--v3-cinza)] hover:text-[var(--v3-papel)]">
                  {x.rodape.privacidade}
                </Link>
                <Link {...p('/seguranca-qualidade')} className="text-[var(--v3-cinza)] hover:text-[var(--v3-papel)]">
                  {x.rodape.seguranca}
                </Link>
                <a href="#conteudo" className="text-[var(--v3-cinza)] hover:text-[var(--v3-papel)]">
                  {x.rodape.topo} ↑
                </a>
              </div>
            </div>

            <div aria-hidden className="v3-marca mt-20 select-none">
              <span className="v3-display text-[var(--v3-papel)]/90">AGORAMOZ</span>
            </div>
            <p className="mt-6 text-xs text-[var(--v3-cinza)]">
              © {ano} AGORAMOZ. {x.rodape.direitos}
            </p>
          </div>
        </footer>
      </MotionProvider>
    </div>
  );
}
