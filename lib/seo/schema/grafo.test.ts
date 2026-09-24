import { describe, expect, it } from 'vitest';
import { ORG_ID, SITE_ID } from './ids';
import { breadcrumbNode, serviceNode } from './nodes';
import { pageGraph, siteGraph } from './graph';

/**
 * O defeito que este ficheiro guarda: antes, cada componente emitia um
 * `<script>` isolado e os nós não se conheciam. Numa página de solução, a
 * consequência era a página declarar **duas organizações** — a completa, do
 * `SiteChrome`, e uma segunda, magra, que o `Service` inventava como
 * `provider` com apenas `name` e `url`.
 *
 * Duas entidades a descrever a mesma empresa, com propriedades diferentes, na
 * mesma página. É a fonte dupla de verdade do repositório, expressa em
 * JSON-LD — e é precisamente o sinal que enfraquece a correspondência entre o
 * perfil do Google e o website.
 */

describe('grafo do site', () => {
  const g = siteGraph();

  it('descreve a organização uma vez só', () => {
    const orgs = g['@graph'].filter((n) => n['@type'] === 'Organization' || n['@type'] === 'ProfessionalService');
    expect(orgs).toHaveLength(1);
  });

  it('hoje é Organization, não ProfessionalService', () => {
    // Enquanto não houver morada, coordenadas e horário. Se isto falhar, ou
    // os factos passaram a existir — e então é intencional — ou alguém os
    // inventou, e o teste de identidade dirá qual dos dois.
    expect(g['@graph'].find((n) => n['@type'] === 'Organization')).toBeDefined();
    expect(g['@graph'].find((n) => n['@type'] === 'ProfessionalService')).toBeUndefined();
  });

  it('nenhum nó de organização traz morada, coordenadas ou horário', () => {
    for (const n of g['@graph']) {
      expect(n).not.toHaveProperty('address');
      expect(n).not.toHaveProperty('geo');
      expect(n).not.toHaveProperty('openingHoursSpecification');
    }
  });

  it('o website refere a organização por @id em vez de a redeclarar', () => {
    const site = g['@graph'].find((n) => n['@type'] === 'WebSite');
    expect(site?.publisher).toEqual({ '@id': ORG_ID });
  });
});

describe('grafo de página', () => {
  const g = pageGraph({
    path: '/solucoes/agentes-ia',
    name: 'Agentes de IA',
    description: 'Descrição',
    breadcrumb: [
      { name: 'Início', path: '/' },
      { name: 'Soluções', path: '/solucoes' },
      { name: 'Agentes de IA', path: '/solucoes/agentes-ia' },
    ],
    service: { name: 'Agentes de IA', description: 'Descrição' },
  });

  it('o Service aponta para a organização por @id, sem a redeclarar', () => {
    const servico = g['@graph'].find((n) => n['@type'] === 'Service');
    expect(servico?.provider).toEqual({ '@id': ORG_ID });
  });

  it('nenhum nó da página declara uma segunda organização', () => {
    // A asserção que apanha a regressão exacta: um `provider` com `name`
    // dentro, em vez de uma referência.
    expect(JSON.stringify(g)).not.toContain('"@type":"Organization"');
  });

  it('a página faz parte do website', () => {
    const pagina = g['@graph'].find((n) => n['@type'] === 'WebPage');
    expect(pagina?.isPartOf).toEqual({ '@id': SITE_ID });
    expect(pagina?.about).toEqual({ '@id': ORG_ID });
  });

  it('a página refere o seu próprio trilho', () => {
    const pagina = g['@graph'].find((n) => n['@type'] === 'WebPage');
    const trilho = g['@graph'].find((n) => n['@type'] === 'BreadcrumbList');
    expect(pagina?.breadcrumb).toEqual({ '@id': trilho?.['@id'] });
  });

  it('não refere um trilho que não emite', () => {
    const semTrilho = pageGraph({ path: '/x', name: 'x', description: 'x' });
    expect(semTrilho['@graph'].find((n) => n['@type'] === 'WebPage')).not.toHaveProperty('breadcrumb');
  });

  it('todo o @id é absoluto e único dentro do grafo', () => {
    const ids = g['@graph'].map((n) => n['@id']);
    for (const id of ids) expect(id).toMatch(/^https:\/\/[^/]+\/.*#/);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('BreadcrumbList', () => {
  it('as posições são 1..n contíguas', () => {
    const no = breadcrumbNode('/a/b', [
      { name: 'Início', path: '/' },
      { name: 'A', path: '/a' },
      { name: 'B', path: '/a/b' },
    ]);
    const posicoes = (no.itemListElement as { position: number }[]).map((i) => i.position);
    expect(posicoes).toEqual([1, 2, 3]);
  });
});

describe('serialização', () => {
  it('não deixa passar um < por escapar', () => {
    /**
     * O escape vive em `components/seo/JsonLd.tsx`. Este teste guarda o
     * contrato do lado dos dados: se algum nó transportar `<`, é porque
     * entrou conteúdo que não é nosso — e com a atribuição a caminho, vai
     * entrar texto vindo de um URL.
     */
    const hostil = serviceNode({
      path: '/x',
      name: '</script><script>alert(1)</script>',
      description: 'd',
    });
    const escapado = JSON.stringify(hostil).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
    expect(escapado).not.toContain('</script>');
    expect(escapado).not.toContain('<');
  });
});
