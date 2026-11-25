import { describe, expect, it } from 'vitest';
import { destinoSeguro, gruposVisiveis } from './navegacao';

const tudo = { inqueritos: true, news: true, energia: true, direcao: true, admin: true };
const nada = { inqueritos: false, news: false, energia: false, direcao: false, admin: false };

describe('NAV-TAR-01 navegação por tarefa', () => {
  it('com tudo ligado, mostra os seis grupos pela ordem do trabalho', () => {
    expect(gruposVisiveis(tudo).map((g) => g.titulo)).toEqual(['Hoje', 'Vender', 'Publicar', 'Ensinar', 'Medir', 'Configurar']);
  });

  it('não perde nem ganha entradas: as mesmas 19 de antes, com os mesmos endereços', () => {
    const hrefs = gruposVisiveis(tudo).flatMap((g) => g.entradas.map((e) => e.href)).sort();
    expect(hrefs).toEqual(
      [
        '/admin', '/admin/painel', '/admin/aeos',
        '/admin/oportunidades', '/admin/diagnosticos', '/admin/propostas', '/admin/facturacao', '/admin/contactos', '/admin/organizacoes',
        '/admin/trafego', '/admin/aquisicao', '/admin/inqueritos', '/admin/news',
        '/admin/cursos',
        '/admin/gabinete', '/admin/energia',
        '/admin/fila', '/admin/equipa', '/admin/auditoria',
      ].sort(),
    );
  });

  it('Vender junta o funil comercial pela ordem do trabalho', () => {
    const vender = gruposVisiveis(nada).find((g) => g.titulo === 'Vender')!;
    expect(vender.entradas.map((e) => e.texto)).toEqual(['Pipeline', 'Diagnósticos', 'Propostas', 'Facturação', 'Contactos', 'Organizações']);
  });

  it('sem módulos nem papel admin: nada de Publicar (flags desligadas) nem Configurar', () => {
    const grupos = gruposVisiveis(nada);
    expect(grupos.map((g) => g.titulo)).toEqual(['Hoje', 'Vender', 'Ensinar', 'Medir']);
    const hrefs = grupos.flatMap((g) => g.entradas.map((e) => e.href));
    for (const h of ['/admin/inqueritos', '/admin/news', '/admin/fila', '/admin/equipa', '/admin/auditoria', '/admin/gabinete', '/admin/energia'])
      expect(hrefs).not.toContain(h);
  });

  it('as permissões não mudam: cada entrada restrita continua com a mesma regra', () => {
    const so = (p: Partial<typeof nada>) =>
      gruposVisiveis({ ...nada, ...p }).flatMap((g) => g.entradas.map((e) => e.href));
    expect(so({ direcao: true })).toContain('/admin/gabinete');
    expect(so({ direcao: true })).not.toContain('/admin/energia');
    expect(so({ energia: true })).toContain('/admin/energia');
    expect(so({ admin: true })).toEqual(expect.arrayContaining(['/admin/fila', '/admin/equipa', '/admin/auditoria']));
    expect(so({ admin: true })).not.toContain('/admin/gabinete');
    expect(so({ news: true })).toContain('/admin/news');
    expect(so({ inqueritos: true })).toContain('/admin/inqueritos');
  });

  it('o trabalho abre pelo Hoje; o painel analítico e o mapa AEOS passam para Medir', () => {
    expect(gruposVisiveis(nada)[0]!.entradas.map((e) => e.href)).toEqual(['/admin']);
    expect(gruposVisiveis(nada).find((g) => g.titulo === 'Medir')!.entradas.map((e) => e.href)).toEqual([
      '/admin/painel',
      '/admin/trafego',
      '/admin/aquisicao',
      '/admin/aeos',
    ]);
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
