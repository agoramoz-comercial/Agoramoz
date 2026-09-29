import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MercadoGlobal } from '@/components/global/MercadoGlobal';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { GLOBAL_CODES, getGlobalMarket } from '@/content/registry';
import { buildMetadata } from '@/lib/seo/site';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';

const IDIOMA = 'en' as const;
const INICIO = 'Home';
const LANG = 'en';

export const dynamicParams = false;

export function generateStaticParams() {
  return GLOBAL_CODES.map((pais) => ({ pais }));
}

type Props = { params: Promise<{ pais: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pais } = await params;
  const m = getGlobalMarket(pais);
  if (!m) return {};
  return buildMetadata({
    title: t(m.seo.title, IDIOMA),
    description: t(m.seo.description, IDIOMA),
    path: caminhoNoIdioma(`/global/${m.code}`, IDIOMA),
    bilingue: true,
  });
}

export default async function Page({ params }: Props) {
  const { pais } = await params;
  const m = getGlobalMarket(pais);
  if (!m) notFound();

  // `lang` no wrapper e não no <html>: só o layout raiz renderiza <html>, e um
  // leitor de ecrã precisa de saber que esta subárvore muda de língua.
  return (
    <div lang={LANG}>
      <MercadoGlobal
        mercado={m}
        idioma={IDIOMA}
        trilho={
          <Breadcrumbs
            className="mb-10"
            items={[
              // A home inglesa ainda não existe (lote E): `/en` dá 404, e o trilho — que
              // também sai em JSON-LD — mandaria o Google a uma URL morta. Até lá, o
              // início é a home em português.
              { name: INICIO, path: '/' },
              { name: 'Markets', path: caminhoNoIdioma('/global', IDIOMA) },
              { name: t(m.name, IDIOMA), path: caminhoNoIdioma(`/global/${m.code}`, IDIOMA) },
            ]}
          />
        }
      />
    </div>
  );
}
