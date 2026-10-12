import { describe, expect, it } from 'vitest';
import { destinoSeguro, gruposVisiveis } from './navegacao';

const tudo = { inqueritos: true, news: true, energia: true, direcao: true, admin: true };
const nada = { inqueritos: false, news: false, energia: false, direcao: false, admin: false };

describe('navegação agrupada do admin', () => {
  it('com tudo ligado, mostra os cinco grupos pela ordem do trabalho', () => {
    expect(gruposVisiveis(tudo).map((g) => g.titulo)).toEqual([
      'Trabalho',
      'Comercial',
      'Crescimento',
      'Espaços',
      'Sistema',
    ]);
  });

  it('sem módulos nem papel admin, esconde Espaços e Sistema e as flags desligadas', () => {
    const grupos = gruposVisiveis(nada);
    expect(grupos.map((g) => g.titulo)).toEqual(['Trabalho', 'Comercial', 'Crescimento']);
    const hrefs = grupos.flatMap((g) => g.entradas.map((e) => e.href));
    expect(hrefs).not.toContain('/admin/inqueritos');
    expect(hrefs).not.toContain('/admin/news');
    expect(hrefs).not.toContain('/admin/fila');
    expect(hrefs).not.toContain('/admin/equipa');
  });

  it('o Gabinete e o CEnO só aparecem a quem tem o módulo', () => {
    const so = (p: Partial<typeof nada>) =>
      gruposVisiveis({ ...nada, ...p }).flatMap((g) => g.entradas.map((e) => e.href));
    expect(so({ direcao: true })).toContain('/admin/gabinete');
    expect(so({ direcao: true })).not.toContain('/admin/energia');
    expect(so({ energia: true })).toContain('/admin/energia');
  });

  it('não deixa passar a regra interna para o cliente', () => {
    for (const g of gruposVisiveis(tudo)) for (const e of g.entradas) expect(Object.keys(e).sort()).toEqual(['href', 'icone', 'texto']);
  });
});

describe('voltar à lista', () => {
  const lista = '/admin/oportunidades';
  it('aceita a própria lista com filtros', () => {
    expect(destinoSeguro('/admin/oportunidades?fase=proposta&pagina=2', lista)).toBe(
      '/admin/oportunidades?fase=proposta&pagina=2',
    );
  });
  it('recusa outra lista, outro sítio ou nada', () => {
    expect(destinoSeguro('/admin/contactos?q=a', lista)).toBe(lista);
    expect(destinoSeguro('https://mal.example/admin/oportunidades', lista)).toBe(lista);
    expect(destinoSeguro('//mal.example', lista)).toBe(lista);
    expect(destinoSeguro(null, lista)).toBe(lista);
  });
  it('recusa caracteres fora do esperado num URL de filtros', () => {
    expect(destinoSeguro('/admin/oportunidades?x="><script>', lista)).toBe(lista);
  });
});
