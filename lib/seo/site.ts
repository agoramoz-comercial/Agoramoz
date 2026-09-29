import type { Metadata } from 'next';
import { SITE } from '@/content/site';
import { caminhoBase, paresDeIdioma } from '@/lib/i18n/texto';

export const SITE_URL = SITE.url.replace(/\/$/, '');

export function absolute(path: string) {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface ImagemSocial {
  url: string;
  width: number;
  height: number;
  alt: string;
}

/**
 * A imagem de partilha, declarada em vez de herdada.
 *
 * Porque é explícita: em 2026-09-24 medi a produção e `app/opengraph-image.tsx`
 * existia, respondia `200 image/png` em `/opengraph-image` — e **nenhuma página
 * emitia `og:image`**. Zero etiquetas `og:image` e `twitter:image` em `/` e em
 * `/solucoes/agentes-ia`. A convenção de ficheiro do Next não sobreviveu ao
 * objecto `openGraph` explícito que esta função devolve, e o defeito era
 * invisível a partir do código: a imagem existia, funcionava, e ninguém lhe
 * apontava. O efeito era cada ligação partilhada no LinkedIn e no WhatsApp sair
 * sem imagem — os dois canais onde a AGORAMOZ é de facto partilhada.
 *
 * Declarar aqui torna o resultado independente da resolução de convenções do
 * Next, e abre a porta a uma imagem própria por página, que era impossível
 * enquanto a herança era implícita.
 */
export const OG_IMAGE_PADRAO: ImagemSocial = {
  url: absolute('/opengraph-image'),
  width: 1200,
  height: 630,
  alt: `AGORAMOZ — ${SITE.tagline}`,
};

/**
 * Alternativas de IDIOMA, que se somam às de MERCADO.
 *
 * `languages` já é usado para o hreflang por país — `pt-MZ`, `pt-PT`, `pt-BR`,
 * `x-default`. O inglês entra por cima disso, nunca em vez disso: substituir
 * apagaria em silêncio a correspondência entre os três mercados, que existe
 * desde a primeira versão do site.
 *
 * Funciona a partir de qualquer um dos lados — `caminhoBase` reduz `/en/perfil`
 * a `/perfil` antes de reconstruir o par, pelo que a página inglesa e a
 * portuguesa produzem o MESMO conjunto e a reciprocidade é automática em vez de
 * ser uma coisa que alguém tem de se lembrar de manter.
 */
export function alternativasDeIdioma(path: string): Record<string, string> {
  const par = paresDeIdioma(caminhoBase(path));
  // `x-default` aponta ao português. É o que o Google serve a quem não
  // corresponde a nenhum dos idiomas declarados, e omiti-lo deixa essa escolha
  // ao acaso. Nas rotas que já declaram alternates de mercado, o `x-default`
  // explícito dessas rotas ganha — a junção em `buildMetadata` põe o de
  // mercado por cima.
  return { pt: par.pt, en: par.en, 'x-default': par.pt };
}

/**
 * hreflang recíproco. Só emitimos alternates para páginas que existem de
 * facto — um hreflang para uma página inexistente é, na melhor das hipóteses,
 * ignorado pelos motores de busca.
 */
export function buildMetadata({
  title,
  description,
  path,
  languages,
  bilingue,
  noindex,
  image,
  imagemPropria,
  tituloAbsoluto,
}: {
  title: string;
  description: string;
  path: string;
  languages?: Record<string, string>;
  /** A rota existe nos dois idiomas. Acrescenta `pt`/`en` aos alternates. */
  bilingue?: boolean;
  noindex?: boolean;
  image?: ImagemSocial;
  /**
   * A rota tem `opengraph-image.tsx` no seu próprio segmento.
   *
   * Quando é verdade, esta função NÃO declara `images` — deixa o Next
   * preencher pela convenção de ficheiro. É obrigatório fazê-lo assim: o URL
   * que o Next serve leva um hash de conteúdo
   * (`/diagnostico/opengraph-image-1x7g51?67aff32f…`) que não é previsível
   * daqui. Construí-lo à mão dá 404 — medido, não suposto.
   */
  imagemPropria?: boolean;
  /**
   * Ignora o template `'%s | AGORAMOZ'` da raiz.
   *
   * Só a página inicial precisa disto: é a única cujo título deve começar pela
   * marca. Sem isto, o template acrescentava a marca a um título que já a
   * continha — que foi exactamente o defeito medido nas páginas de solução,
   * onde o `<title>` saía `'... | AGORAMOZ | AGORAMOZ'`.
   */
  tituloAbsoluto?: boolean;
}): Metadata {
  const imagem = image ?? OG_IMAGE_PADRAO;

  /**
   * A causa-raiz do defeito original, medida a 2026-09-24.
   *
   * `app/opengraph-image.tsx` existe na raiz e **não é herdado** pelas páginas
   * em `app/(site)/`: uma página sem ficheiro no próprio segmento não emitia
   * `og:image` nenhuma. Por isso a omissão por defeito é declarar a imagem da
   * raiz — que é o único URL sem hash, e funciona.
   *
   * O inverso também é verdade: declarar `images` suprime a convenção. Uma
   * rota com imagem própria tem de pedir para não ser declarada.
   */
  const partilha = imagemPropria
    ? {}
    : { images: [imagem] };

  return {
    title: tituloAbsoluto ? { absolute: title } : title,
    description,
    alternates: {
      canonical: absolute(path),
      ...(() => {
        const juntos = { ...(bilingue ? alternativasDeIdioma(path) : {}), ...(languages ?? {}) };
        return Object.keys(juntos).length > 0 ? { languages: juntos } : {};
      })(),
    },
    openGraph: {
      title,
      description,
      url: absolute(path),
      siteName: 'AGORAMOZ',
      // `/en/…` é inglês; o resto é português. `caminhoBase` é o mesmo teste
      // que decide o hreflang, pelo que os dois não divergem.
      locale: caminhoBase(path) !== path ? 'en_GB' : 'pt_PT',
      ...(bilingue ? { alternateLocale: caminhoBase(path) !== path ? 'pt_PT' : 'en_GB' } : {}),
      type: 'website',
      ...partilha,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(imagemPropria ? {} : { images: [imagem.url] }),
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
