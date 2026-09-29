import { describe, expect, it } from 'vitest';
import { destinoNoOutroIdioma, idiomaDoCaminho, inicioDoIdioma, ligacao, temPar } from './rotas';

/**
 * O comportamento das ligações entre idiomas. O teste de rotas
 * (`lib/seo/rotas.test.ts`) prova que cada rota bilingue tem as duas páginas;
 * este prova que o chrome aponta para elas — e só para elas.
 */
describe('rotas bilingues', () => {
  it('o idioma de um caminho', () => {
    expect(idiomaDoCaminho('/')).toBe('pt');
    expect(idiomaDoCaminho('/en')).toBe('en');
    expect(idiomaDoCaminho('/en/global/ch')).toBe('en');
    // `/energia` começa por «/en» como texto e não é inglês.
    expect(idiomaDoCaminho('/energia')).toBe('pt');
  });

  it('temPar aceita o caminho de qualquer lado', () => {
    expect(temPar('/global/ch')).toBe(true);
    expect(temPar('/en/global/ch')).toBe(true);
    expect(temPar('/perfil')).toBe(false);
  });

  it('ligação inglesa para rota traduzida vai à página inglesa', () => {
    expect(ligacao('/global', 'en')).toEqual({ href: '/en/global', soPortugues: false });
  });

  it('ligação inglesa para rota não traduzida vai à portuguesa, marcada', () => {
    expect(ligacao('/perfil', 'en')).toEqual({ href: '/perfil', soPortugues: true });
  });

  it('ligação portuguesa nunca é marcada', () => {
    expect(ligacao('/en/global', 'pt')).toEqual({ href: '/global', soPortugues: false });
    expect(ligacao('/perfil', 'pt')).toEqual({ href: '/perfil', soPortugues: false });
  });

  it('a entrada de cada idioma nunca é um 404', () => {
    expect(inicioDoIdioma('pt')).toBe('/');
    // Sem home inglesa, a entrada inglesa é o nível global; com ela, `/en`.
    expect(['/en', '/en/global']).toContain(inicioDoIdioma('en'));
    expect(inicioDoIdioma('en') === '/en').toBe(temPar('/'));
  });

  it('o seletor leva ao par quando existe', () => {
    expect(destinoNoOutroIdioma('/global/ch')).toEqual({ idioma: 'en', href: '/en/global/ch' });
    expect(destinoNoOutroIdioma('/en/global/ch')).toEqual({ idioma: 'pt', href: '/global/ch' });
  });

  it('o seletor leva à entrada do outro idioma quando não há par', () => {
    expect(destinoNoOutroIdioma('/perfil')).toEqual({ idioma: 'en', href: inicioDoIdioma('en') });
  });

  it('numa 404 inglesa com chrome português, o seletor segue o chrome e não o URL', () => {
    // `/en/global/zz` não existe; a raiz desenha-a com chrome português. O
    // botão «EN» tem de levar ao inglês, não à home portuguesa.
    expect(destinoNoOutroIdioma('/en/global/zz', 'pt').idioma).toBe('en');
    expect(destinoNoOutroIdioma('/en/global/zz', 'pt').href).toBe(inicioDoIdioma('en'));
  });
});
