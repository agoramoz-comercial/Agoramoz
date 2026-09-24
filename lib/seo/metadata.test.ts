import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COUNTRIES, COUNTRY_CODES, SECTOR_PAGES, SOLUTIONS } from '@/content/registry';
import { buildMetadata, OG_IMAGE_PADRAO, SITE_URL } from './site';

/**
 * Três defeitos medidos em produção a 2026-09-24, e os guardas que impedem
 * cada um de voltar.
 *
 * 1. `<title>` com a marca duas vezes — `'... | AGORAMOZ | AGORAMOZ'` nas cinco
 *    páginas de solução, porque o conteúdo já trazia o sufixo e o template da
 *    raiz voltava a acrescentá-lo. Nada falhava: nem o build, nem o typecheck,
 *    nem um teste. Só se via no HTML servido.
 * 2. Nenhuma etiqueta `og:image` em página nenhuma, apesar de
 *    `/opengraph-image` responder `200 image/png`. Cada partilha saía sem
 *    imagem.
 * 3. Títulos e descrições sem ninguém a verificar que são únicos — duas páginas
 *    com o mesmo título competem uma com a outra na pesquisa.
 */

function ficheiros(raiz: string, sufixo: string): string[] {
  const saida: string[] = [];
  for (const nome of readdirSync(raiz)) {
    const caminho = join(raiz, nome);
    if (statSync(caminho).isDirectory()) saida.push(...ficheiros(caminho, sufixo));
    else if (caminho.endsWith(sufixo)) saida.push(caminho);
  }
  return saida;
}

/** Títulos declarados no conteúdo, dentro de um bloco `seo:`. */
function titulosDeConteudo(): { ficheiro: string; titulo: string }[] {
  const saida: { ficheiro: string; titulo: string }[] = [];
  for (const f of ficheiros('content', '.ts')) {
    const sql = readFileSync(f, 'utf-8');
    for (const m of sql.matchAll(/seo:\s*\{\s*title:\s*['`]([^'`]*)['`]/g)) {
      saida.push({ ficheiro: f, titulo: m[1]! });
    }
  }
  return saida;
}

/** Chamadas a `buildMetadata` nas páginas públicas. */
function metadadosDePaginas(): { ficheiro: string; corpo: string }[] {
  const saida: { ficheiro: string; corpo: string }[] = [];
  for (const f of ficheiros('app/(site)', 'page.tsx')) {
    const src = readFileSync(f, 'utf-8');
    const m = /buildMetadata\(\{([\s\S]*?)\n\}\)/.exec(src);
    if (m) saida.push({ ficheiro: f, corpo: m[1]! });
  }
  return saida;
}

describe('buildMetadata', () => {
  const meta = buildMetadata({ title: 'Teste', description: 'Descrição', path: '/teste' });

  it('emite sempre imagem de partilha em Open Graph e Twitter', () => {
    // O defeito nº 2. Este teste falha se alguém voltar a retirar `images` do
    // objecto `openGraph` — que foi o que, na prática, existiu desde o início.
    expect(meta.openGraph?.images).toBeDefined();
    expect(meta.openGraph?.images).toHaveLength(1);
    expect(meta.twitter?.images).toBeDefined();
  });

  it('a imagem por omissão aponta para um caminho absoluto do próprio domínio', () => {
    expect(OG_IMAGE_PADRAO.url.startsWith(`${SITE_URL}/`)).toBe(true);
    expect(OG_IMAGE_PADRAO.width).toBe(1200);
    expect(OG_IMAGE_PADRAO.height).toBe(630);
  });

  it('o canonical é absoluto', () => {
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/teste`);
  });

  it('por omissão deixa o template da raiz acrescentar a marca', () => {
    expect(meta.title).toBe('Teste');
  });

  it('com tituloAbsoluto, ignora o template', () => {
    const raiz = buildMetadata({
      title: 'AGORAMOZ — algo',
      description: 'd',
      path: '/',
      tituloAbsoluto: true,
    });
    expect(raiz.title).toEqual({ absolute: 'AGORAMOZ — algo' });
  });
});

describe('a marca aparece uma vez só no título', () => {
  /**
   * O template `'%s | AGORAMOZ'` em `app/layout.tsx` é o dono da marca. Um
   * título que já a contenha passa a tê-la duas vezes — e o `<title>` é o
   * recurso mais escasso de uma página: o Google corta-o por largura, pelo que
   * a marca repetida rouba espaço a palavras que descrevem a página.
   */
  it('nenhum título de conteúdo contém AGORAMOZ', () => {
    const infractores = titulosDeConteudo().filter((t) => t.titulo.includes('AGORAMOZ'));
    expect(infractores.map((t) => `${t.ficheiro}: ${t.titulo}`)).toEqual([]);
  });

  it('nenhuma página usa AGORAMOZ no título sem declarar tituloAbsoluto', () => {
    const infractores = metadadosDePaginas()
      .filter((p) => /title:\s*[^,]*AGORAMOZ/.test(p.corpo))
      .filter((p) => !p.corpo.includes('tituloAbsoluto: true'))
      .map((p) => p.ficheiro);

    expect(infractores).toEqual([]);
  });
});

describe('títulos e descrições são únicos', () => {
  /**
   * Duas páginas com o mesmo título competem uma com a outra: o Google escolhe
   * uma e trata a outra como duplicada. É o critério de aceitação «páginas de
   * serviço indexáveis e únicas», verificado em vez de prometido.
   *
   * A verificação corre sobre o registry — que é o que gera as páginas de país,
   * solução e setor — mais as páginas estáticas lidas da fonte.
   */
  function todos(): { rota: string; titulo: string; descricao: string }[] {
    const doRegistry = [
      ...COUNTRY_CODES.map((c) => ({
        rota: `/${c}`,
        titulo: COUNTRIES[c].seo.title,
        descricao: COUNTRIES[c].seo.description,
      })),
      ...Object.values(SOLUTIONS).map((s) => ({
        rota: `/solucoes/${s.slug}`,
        titulo: s.seo.title,
        descricao: s.seo.description,
      })),
      ...Object.values(SECTOR_PAGES).map((p) => ({
        rota: `/${p.country}/${p.sector}`,
        titulo: p.seo.title,
        descricao: p.seo.description,
      })),
    ];

    const estaticas = metadadosDePaginas().flatMap((p) => {
      const titulo = /title:\s*['`]([^'`]*)['`]/.exec(p.corpo)?.[1];
      const descricao = /description:\s*\n?\s*['`]([^'`]*)['`]/.exec(p.corpo)?.[1];
      // A inicial compõe o título com um template literal; não é comparável por
      // regex e é única por construção.
      return titulo && descricao ? [{ rota: p.ficheiro, titulo, descricao }] : [];
    });

    return [...doRegistry, ...estaticas];
  }

  function repetidos(valores: string[]): string[] {
    const contagem = new Map<string, number>();
    for (const v of valores) contagem.set(v, (contagem.get(v) ?? 0) + 1);
    return [...contagem.entries()].filter(([, n]) => n > 1).map(([v]) => v);
  }

  it('não há dois títulos iguais', () => {
    expect(repetidos(todos().map((p) => p.titulo))).toEqual([]);
  });

  it('não há duas descrições iguais', () => {
    expect(repetidos(todos().map((p) => p.descricao))).toEqual([]);
  });

  it('a verificação cobre de facto as páginas todas', () => {
    // Sem isto, um erro nas expressões regulares fazia os testes acima passarem
    // por não terem nada para comparar — o modo de falha mais perigoso de um
    // teste que lê a fonte.
    expect(todos().length).toBeGreaterThanOrEqual(
      COUNTRY_CODES.length + Object.keys(SOLUTIONS).length + Object.keys(SECTOR_PAGES).length + 5,
    );
  });
});

describe('imagem de partilha por página', () => {
  /**
   * Medido a 2026-09-24, com `next start` e `curl`, porque nenhuma destas
   * regras é visível no código:
   *
   * · `app/opengraph-image.tsx` NÃO é herdado pelas páginas em `app/(site)/`.
   *   Uma página sem ficheiro no próprio segmento não emitia `og:image`
   *   nenhuma — a causa-raiz do defeito que existia em produção.
   * · Declarar `images` em `buildMetadata` SUPRIME a convenção de ficheiro.
   * · O URL que o Next serve pela convenção leva um hash de conteúdo
   *   (`/diagnostico/opengraph-image-1x7g51?67aff32f...`) que não é previsível.
   *   Construí-lo à mão dá **404** — foi o que aconteceu à primeira tentativa.
   *
   * Daí a regra, nos dois sentidos: uma rota com ficheiro próprio TEM de pedir
   * `imagemPropria`, e uma que o peça TEM de ter ficheiro. Errar de um lado dá
   * imagem partida; do outro, imagem genérica onde devia ser específica.
   */
  function segmentos(): { dir: string; temFicheiro: boolean; pedeFlag: boolean }[] {
    const saida: { dir: string; temFicheiro: boolean; pedeFlag: boolean }[] = [];
    const andar = (raiz: string) => {
      const nomes = readdirSync(raiz);
      if (nomes.includes('page.tsx')) {
        saida.push({
          dir: raiz,
          temFicheiro: nomes.includes('opengraph-image.tsx'),
          pedeFlag: readFileSync(join(raiz, 'page.tsx'), 'utf-8').includes('imagemPropria: true'),
        });
      }
      for (const nome of nomes) {
        const caminho = join(raiz, nome);
        if (statSync(caminho).isDirectory()) andar(caminho);
      }
    };
    andar('app/(site)');
    return saida;
  }

  it('toda a rota com imagem própria declara imagemPropria', () => {
    const esquecidas = segmentos().filter((s) => s.temFicheiro && !s.pedeFlag).map((s) => s.dir);
    expect(esquecidas).toEqual([]);
  });

  it('toda a rota que declara imagemPropria tem o ficheiro', () => {
    // Este e o lado que da 404: a flag sem ficheiro faz o Next nao emitir nada.
    const mentirosas = segmentos().filter((s) => s.pedeFlag && !s.temFicheiro).map((s) => s.dir);
    expect(mentirosas).toEqual([]);
  });

  it('não se constrói o URL de uma imagem de convenção à mão', () => {
    // A primeira tentativa fazia isto e produzia 404 em todas as páginas com
    // imagem própria. O hash não é previsível a partir do código.
    expect(readFileSync('lib/seo/site.ts', 'utf-8')).not.toContain('imagemDaRota');
  });

  it('a verificação vê de facto os segmentos', () => {
    const s = segmentos();
    expect(s.length).toBeGreaterThanOrEqual(10);
    expect(s.filter((x) => x.temFicheiro).length).toBeGreaterThanOrEqual(4);
  });
});
