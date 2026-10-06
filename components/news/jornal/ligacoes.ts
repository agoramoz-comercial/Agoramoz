import type { Idioma } from '@/content/types';
import type { SeccaoJornal } from '@/lib/news/artigo';

/** Onde vive um artigo no jornal de cada idioma. */
export function caminhoDoArtigo(slug: string, idioma: Idioma): string {
  return `${idioma === 'en' ? '/en' : ''}/news/${slug}`;
}

export function caminhoDoJornal(idioma: Idioma, seccao?: SeccaoJornal | null): string {
  const base = `${idioma === 'en' ? '/en' : ''}/news`;
  return seccao ? `${base}?seccao=${seccao}` : base;
}

/**
 * O passo seguinte de quem leu: a página de solução que a secção pede, com a
 * campanha do artigo — é assim que um artigo prova que gera diagnósticos.
 * `utm_campaign` vai cortado a 64 (o limite da atribuição, 0009).
 */
export function ctaDoArtigo(
  seccao: SeccaoJornal,
  slug: string,
  idioma: Idioma,
): { href: string; titulo: string; texto: string; botao: string } {
  const utm = new URLSearchParams({
    utm_source: 'agoramoz_news',
    utm_medium: 'artigo',
    utm_campaign: slug.slice(0, 64).replace(/-+$/, ''),
  }).toString();
  if (idioma === 'en') {
    return {
      href: `/en/diagnostico?${utm}`,
      titulo: 'What does this mean for your business?',
      texto: 'A strategic diagnostic maps the risks and opportunities of this scenario to your operation.',
      botao: 'Request the strategic diagnostic',
    };
  }
  const destinos: Partial<Record<SeccaoJornal, { href: string; texto: string; botao: string }>> = {
    energia: {
      href: '/mz/energia-mineracao',
      texto:
        'Qualificação de fornecedores, gestão documental e acompanhamento de oportunidades para energia, mineração e serviços industriais em Moçambique.',
      botao: 'Ver solução para energia',
    },
    tecnologia: {
      href: '/solucoes/agentes-ia',
      texto:
        'Agentes de IA ancorados nas fontes da sua empresa, com citação da origem e aprovação humana nas decisões críticas.',
      botao: 'Ver agentes de IA',
    },
  };
  const d = destinos[seccao];
  return d
    ? {
        href: `${d.href}?${utm}`,
        titulo: 'O que isto muda no seu negócio?',
        texto: d.texto,
        botao: d.botao,
      }
    : {
        href: `/diagnostico?${utm}`,
        titulo: 'O que isto muda no seu negócio?',
        texto: 'O diagnóstico estratégico liga os riscos e as oportunidades deste cenário à sua operação.',
        botao: 'Solicitar Diagnóstico Estratégico',
      };
}
