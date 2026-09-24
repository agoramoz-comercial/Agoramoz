import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COUNTRY_CODES, RESERVED_TOP_LEVEL_SLUGS } from '@/content/registry';

/**
 * `RESERVED_TOP_LEVEL_SLUGS` diz de si próprio, em comentário: «Verificado em
 * teste.» Não estava. O teste não existia em lado nenhum do repositório.
 *
 * Um comentário que afirma uma verificação inexistente é pior do que nenhum
 * comentário: quem o lê deixa de procurar o problema. O problema real é
 * concreto — se um código de país alguma vez colidir com um segmento estático,
 * o Next serve o estático e a rota de país desaparece sem erro nenhum, em build
 * ou em runtime. É uma página de mercado inteira a evaporar-se em silêncio.
 */

function segmentosDeTopo(): string[] {
  const raiz = 'app/(site)';
  return readdirSync(raiz)
    .filter((nome) => statSync(join(raiz, nome)).isDirectory())
    // `[pais]` é a rota dinâmica que estes segmentos podem sombrear; não é um
    // segmento estático e não se compara consigo própria.
    .filter((nome) => !nome.startsWith('[') && !nome.startsWith('('));
}

describe('segmentos estáticos de topo', () => {
  it('nenhum código de país colide com um segmento reservado', () => {
    const reservados = new Set<string>(RESERVED_TOP_LEVEL_SLUGS);
    const colisoes = COUNTRY_CODES.filter((c) => reservados.has(c));

    expect(colisoes).toEqual([]);
  });

  it('todo o directório estático de (site) está declarado como reservado', () => {
    // Este é o lado que faltava. A lista podia estar correcta e alguém criar
    // `app/(site)/notas/` sem a actualizar — e a colisão voltava a ser possível
    // sem nada a assinalá-la.
    const reservados = new Set<string>(RESERVED_TOP_LEVEL_SLUGS);
    const naoDeclarados = segmentosDeTopo().filter((s) => !reservados.has(s));

    expect(naoDeclarados).toEqual([]);
  });

  it('a verificação vê de facto os directórios', () => {
    // Sem isto, um erro no filtro fazia o teste acima passar por não ter nada
    // que comparar.
    expect(segmentosDeTopo().length).toBeGreaterThanOrEqual(6);
  });
});

describe('trilho de navegação', () => {
  /**
   * O `BreadcrumbList` era emitido em oito páginas e não havia trilho visível
   * em nenhuma. São dois problemas: a Google exige que os dados estruturados
   * descrevam conteúdo visível, e quem chega da pesquisa a uma página interna
   * não tinha forma de subir um nível.
   *
   * `components/layout/Breadcrumbs` rende os dois do MESMO array, pelo que
   * divergirem é impossível por construção. O que estes testes guardam é o
   * passo anterior: que ninguém volte a emitir só o estruturado.
   */
  function paginas(): { caminho: string; fonte: string }[] {
    const saida: { caminho: string; fonte: string }[] = [];
    const andar = (raiz: string) => {
      for (const nome of readdirSync(raiz)) {
        const caminho = join(raiz, nome);
        if (statSync(caminho).isDirectory()) andar(caminho);
        else if (nome === 'page.tsx') saida.push({ caminho, fonte: readFileSync(caminho, 'utf-8') });
      }
    };
    andar('app/(site)');
    return saida;
  }

  it('toda a página de (site) excepto a inicial rende um trilho', () => {
    const semTrilho = paginas()
      .filter((p) => p.caminho !== 'app/(site)/page.tsx')
      .filter((p) => !p.fonte.includes('<Breadcrumbs'))
      .map((p) => p.caminho);

    expect(semTrilho).toEqual([]);
  });

  it('a página inicial não rende trilho — é a raiz', () => {
    const inicial = paginas().find((p) => p.caminho === 'app/(site)/page.tsx');
    expect(inicial?.fonte).not.toContain('<Breadcrumbs');
  });

  it('ninguém emite um BreadcrumbList sem conteúdo visível', () => {
    // O export foi removido. Este teste impede que volte por atalho.
    for (const p of paginas()) {
      expect(p.fonte, p.caminho).not.toContain('BreadcrumbJsonLd');
    }
    expect(readFileSync('components/seo/JsonLd.tsx', 'utf-8')).not.toContain(
      'export function BreadcrumbJsonLd',
    );
  });

  it('a verificação vê de facto as páginas', () => {
    expect(paginas().length).toBeGreaterThanOrEqual(10);
  });
});
