import { describe, expect, it } from 'vitest';
import * as registry from '@/content/registry';
import * as site from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';
import { caminhoBase, caminhoNoIdioma, ehIdioma, IDIOMAS, paresDeIdioma, t } from './texto';

/**
 * A guarda que torna o bilinguismo real.
 *
 * O compilador já impede um `Texto` sem inglês. O que ele NÃO vê é o inglês
 * que existe e é português copiado — que é como «traduzir depois» acaba
 * sempre: alguém duplica o campo para o build passar e ninguém volta lá.
 *
 * Este teste percorre a camada de conteúdo inteira à procura de objectos com a
 * forma de `Texto` e recusa os dois casos.
 */

type Achado = { caminho: string; pt: string; en: string };

function ehTexto(v: unknown): v is { pt: string; en: string } {
  if (typeof v !== 'object' || v === null) return false;
  const chaves = Object.keys(v);
  return (
    chaves.length === 2 &&
    chaves.includes('pt') &&
    chaves.includes('en') &&
    typeof (v as Record<string, unknown>).pt === 'string' &&
    typeof (v as Record<string, unknown>).en === 'string'
  );
}

function recolher(valor: unknown, caminho: string, acc: Achado[], vistos: WeakSet<object>): Achado[] {
  if (typeof valor !== 'object' || valor === null) return acc;
  if (vistos.has(valor)) return acc;
  vistos.add(valor);

  if (ehTexto(valor)) {
    acc.push({ caminho, pt: valor.pt, en: valor.en });
    return acc;
  }
  for (const [chave, filho] of Object.entries(valor)) {
    recolher(filho, `${caminho}.${chave}`, acc, vistos);
  }
  return acc;
}

const textos = [
  ...recolher(registry, 'registry', [], new WeakSet()),
  ...recolher(site, 'site', [], new WeakSet()),
];

describe('texto bilingue', () => {
  it('nenhum lado está vazio', () => {
    const maus = textos.filter((x) => x.pt.trim() === '' || x.en.trim() === '');
    expect(maus.map((x) => x.caminho)).toEqual([]);
  });

  /**
   * Três palavras é o limiar: abaixo disso há termos que são legitimamente
   * iguais nas duas línguas — «AGORAMOZ», «LNG», «Maputo», um código de país.
   * Acima, um texto idêntico nas duas colunas é português a fazer-se passar
   * por inglês.
   */
  it('nenhuma frase de mais de três palavras é igual nas duas línguas', () => {
    const copiados = textos.filter(
      (x) => x.pt.trim() === x.en.trim() && x.pt.trim().split(/\s+/).length > 3,
    );
    expect(
      copiados.map((x) => `${x.caminho}: "${x.pt.slice(0, 60)}"`),
      'português copiado para o campo inglês',
    ).toEqual([]);
  });

  it('o próprio extractor funciona', () => {
    // Guarda contra o teste passar por não ter encontrado nada — que é a
    // maneira mais silenciosa de um teste deixar de proteger o que protegia.
    const amostra = recolher(
      { a: { pt: 'olá mundo inteiro aqui', en: 'hello whole world here' }, b: [{ pt: 'x', en: 'y' }] },
      'amostra',
      [],
      new WeakSet(),
    );
    expect(amostra).toHaveLength(2);
    expect(ehTexto({ pt: 'a', en: 'b' })).toBe(true);
    expect(ehTexto({ pt: 'a' })).toBe(false);
    expect(ehTexto({ pt: 'a', en: 'b', extra: 1 })).toBe(false);
  });
});

describe('caminhos por idioma', () => {
  it('o português fica na raiz', () => {
    expect(caminhoNoIdioma('/', 'pt')).toBe('/');
    expect(caminhoNoIdioma('/perfil', 'pt')).toBe('/perfil');
  });

  it('o inglês ganha o prefixo', () => {
    expect(caminhoNoIdioma('/perfil', 'en')).toBe('/en/perfil');
    expect(caminhoNoIdioma('/solucoes/agentes-ia', 'en')).toBe('/en/solucoes/agentes-ia');
  });

  /**
   * O caso que parte em silêncio: `/en` + `/` daria `/en/`, e `/en/` e `/en`
   * são URLs distintos para um motor de busca — duas versões da mesma página a
   * competir uma com a outra.
   */
  it('a raiz em inglês é /en, sem barra final', () => {
    expect(caminhoNoIdioma('/', 'en')).toBe('/en');
    expect(caminhoNoIdioma('/', 'en')).not.toBe('/en/');
  });

  /**
   * Achado da revisão: `caminhoNoIdioma` não era idempotente. Um seletor de
   * idioma que passasse o `pathname` actual — o uso óbvio — produzia
   * `/en/en/perfil` quando já estava em inglês. Passava em todos os testes
   * que eu tinha escrito, porque nenhum lhe dava um caminho já prefixado.
   */
  it('é idempotente: prefixar duas vezes não duplica', () => {
    for (const rota of ['/', '/perfil', '/solucoes/agentes-ia']) {
      const uma = caminhoNoIdioma(rota, 'en');
      expect(caminhoNoIdioma(uma, 'en')).toBe(uma);
      expect(caminhoNoIdioma(uma, 'pt')).toBe(rota);
    }
  });

  it('os pares são recíprocos', () => {
    for (const rota of ['/', '/perfil', '/sobre', '/solucoes']) {
      const par = paresDeIdioma(rota);
      expect(par.pt).toBe(rota);
      expect(par.en.startsWith('/en')).toBe(true);
      expect(caminhoNoIdioma(par.pt, 'en')).toBe(par.en);
    }
  });

  it('reconhece os idiomas e recusa o resto', () => {
    expect(IDIOMAS).toEqual(['pt', 'en']);
    expect(ehIdioma('pt')).toBe(true);
    expect(ehIdioma('en')).toBe(true);
    expect(ehIdioma('pt-PT')).toBe(false);
    expect(ehIdioma('fr')).toBe(false);
  });

  it('lê o lado certo', () => {
    const x = { pt: 'sistemas', en: 'systems' } as const;
    expect(t(x, 'pt')).toBe('sistemas');
    expect(t(x, 'en')).toBe('systems');
  });
});

describe('hreflang', () => {
  const alternates = (m: ReturnType<typeof buildMetadata>) =>
    (m.alternates?.languages ?? {}) as Record<string, string>;

  it('sem bilingue, nada muda', () => {
    const m = buildMetadata({ title: 'x', description: 'y', path: '/sobre' });
    expect(m.alternates?.languages).toBeUndefined();
  });

  it('com bilingue, emite o par', () => {
    const l = alternates(buildMetadata({ title: 'x', description: 'y', path: '/perfil', bilingue: true }));
    expect(l.pt).toBe('/perfil');
    expect(l.en).toBe('/en/perfil');
  });

  /**
   * O defeito que este teste existe para impedir: `languages` já transportava
   * o hreflang POR MERCADO (`pt-MZ`, `pt-PT`, `pt-BR`, `x-default`) desde a
   * primeira versão do site. Um `bilingue` que sobrescrevesse em vez de somar
   * apagaria essa correspondência em silêncio — o build passava, os testes
   * passavam, e as três páginas de mercado deixavam de se conhecer.
   */
  it('o idioma SOMA-SE ao mercado, nunca o substitui', () => {
    const mercados = { 'pt-MZ': '/mz', 'pt-PT': '/pt', 'pt-BR': '/br', 'x-default': '/' };
    const l = alternates(
      buildMetadata({ title: 'x', description: 'y', path: '/', bilingue: true, languages: mercados }),
    );
    for (const [chave, valor] of Object.entries(mercados)) expect(l[chave]).toBe(valor);
    expect(l.en).toBe('/en');
  });

  /**
   * Segundo achado: sem `x-default`, o Google escolhe sozinho o que serve a
   * quem não corresponde a `pt` nem a `en`. Aponta ao português, que é a
   * versão canónica.
   */
  it('x-default aponta ao português', () => {
    const l = alternates(buildMetadata({ title: 'x', description: 'y', path: '/perfil', bilingue: true }));
    expect(l['x-default']).toBe('/perfil');
    const raiz = alternates(buildMetadata({ title: 'x', description: 'y', path: '/en', bilingue: true }));
    expect(raiz['x-default']).toBe('/');
  });

  it('o x-default de mercado ganha ao de idioma', () => {
    const l = alternates(
      buildMetadata({
        title: 'x', description: 'y', path: '/', bilingue: true,
        languages: { 'pt-MZ': '/mz', 'x-default': '/' },
      }),
    );
    expect(l['x-default']).toBe('/');
    expect(l['pt-MZ']).toBe('/mz');
    expect(l.en).toBe('/en');
  });

  it('a página inglesa e a portuguesa declaram o mesmo par', () => {
    const pt = alternates(buildMetadata({ title: 'x', description: 'y', path: '/perfil', bilingue: true }));
    const en = alternates(buildMetadata({ title: 'x', description: 'y', path: '/en/perfil', bilingue: true }));
    expect(en).toEqual(pt);
  });

  it('og:locale segue o idioma da página', () => {
    const og = (path: string) =>
      buildMetadata({ title: 'x', description: 'y', path, bilingue: true }).openGraph as Record<string, unknown>;
    expect(og('/en/global').locale).toBe('en_GB');
    expect(og('/en/global').alternateLocale).toBe('pt_PT');
    expect(og('/global').locale).toBe('pt_PT');
    expect(og('/energia').locale).toBe('pt_PT');
  });

  it('caminhoBase reduz de qualquer lado', () => {
    expect(caminhoBase('/perfil')).toBe('/perfil');
    expect(caminhoBase('/en/perfil')).toBe('/perfil');
    expect(caminhoBase('/en')).toBe('/');
    expect(caminhoBase('/')).toBe('/');
    // `/energia` começa por `/en` como texto e NÃO é uma rota inglesa.
    expect(caminhoBase('/energia')).toBe('/energia');
  });
});
