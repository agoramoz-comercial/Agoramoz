import type { Idioma } from '@/content/types';
import { NOME_DA_SECCAO, type ArtigoDaLista } from './artigo';

/** RSS 2.0 do jornal: os títulos e entradas publicados, com os endereços canónicos. */

function escapar(s: string): string {
  return s
    // Caracteres de controlo são ilegais em XML 1.0: um só invalidava o feed.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function rssDoJornal(artigos: readonly ArtigoDaLista[], idioma: Idioma, base: string): string {
  const raiz = `${base}${idioma === 'en' ? '/en' : ''}/news`;
  const itens = artigos
    .map(
      (a) => `    <item>
      <title>${escapar(a.titulo)}</title>
      <link>${raiz}/${a.slug}</link>
      <guid isPermaLink="true">${raiz}/${a.slug}</guid>
      <pubDate>${new Date(a.publicado_em).toUTCString()}</pubDate>
      <category>${escapar(NOME_DA_SECCAO[a.seccao][idioma])}</category>${
        a.entrada ? `\n      <description>${escapar(a.entrada)}</description>` : ''
      }
    </item>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AGORAMOZ News</title>
    <link>${raiz}</link>
    <atom:link href="${raiz}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${
      idioma === 'en'
        ? 'Business analysis for decision-makers in Mozambique and Portuguese-speaking markets.'
        : 'Análise de negócio para quem decide em Moçambique e nos mercados lusófonos.'
    }</description>
    <language>${idioma === 'en' ? 'en' : 'pt-PT'}</language>${
      artigos.length
        ? `\n    <lastBuildDate>${new Date(Math.max(...artigos.map((a) => Date.parse(a.actualizado_em)))).toUTCString()}</lastBuildDate>`
        : ''
    }
${itens}
  </channel>
</rss>
`;
}
