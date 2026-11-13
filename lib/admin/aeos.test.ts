import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BLOCOS, PAINEIS, aeosVisivel } from './aeos';
import { gruposVisiveis } from './navegacao';

const tudo = {
  inqueritos: true,
  news: true,
  energia: true,
  direcao: true,
  admin: true,
};
const nada = {
  inqueritos: false,
  news: false,
  energia: false,
  direcao: false,
  admin: false,
};

/** O ficheiro da página de um endereço do admin, onde quer que esteja no grupo `(painel)`. */
const pagina = (href: string) => join(process.cwd(), 'app/admin/(painel)', href.replace(/^\/admin/, ''), 'page.tsx');

describe('o mapa AEOS', () => {
  it('tem os nove blocos e os sete painéis do documento, numerados', () => {
    expect(BLOCOS.map((b) => b.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(PAINEIS.map((p) => p.n)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('cada ligação do mapa leva a uma página que existe — nada aparece feito sem ecrã', () => {
    const hrefs = [...BLOCOS, ...PAINEIS].flatMap((x) => x.noAdmin.map((l) => l.href));
    for (const href of new Set(hrefs)) expect(existsSync(pagina(href)), href).toBe(true);
  });

  it('cada entrada da navegação leva a uma página que existe', () => {
    for (const g of gruposVisiveis(tudo)) for (const e of g.entradas) expect(existsSync(pagina(e.href)), e.href).toBe(true);
  });

  it('a quem não tem o Gabinete, o mapa não o menciona', () => {
    const { blocos, paineis } = aeosVisivel(nada);
    const textos = [...blocos, ...paineis].flatMap((x) => x.noAdmin.map((l) => `${l.href} ${l.texto}`)).join(' ');
    expect(textos).not.toMatch(/gabinete|energia|CEnO/i);
  });

  it('um painel sem ecrã visível é «por construir»; nenhum é «completo»', () => {
    const { paineis } = aeosVisivel(nada);
    expect(paineis.find((p) => p.nome === 'Product Portfolio')!.estado).toBe('por-construir');
    // A Facturação (D-48) é de toda a equipa: o painel Finance já tem um ecrã para todos.
    expect(paineis.find((p) => p.nome === 'Finance')!.estado).toBe('parcial');
    expect(aeosVisivel(tudo).paineis.find((p) => p.nome === 'Finance')!.estado).toBe('parcial');
    expect(new Set(aeosVisivel(tudo).paineis.map((p) => p.estado))).not.toContain('completo');
  });

  it('os Inquéritos e o News estão no bloco de Growth, Marketing e Receita', () => {
    const growth = aeosVisivel(tudo).blocos.find((b) => b.n === 2)!;
    expect(growth.noAdmin.map((l) => l.href)).toEqual(expect.arrayContaining(['/admin/inqueritos', '/admin/news', '/admin/propostas']));
  });

  it('a regra interna não passa para o cliente', () => {
    for (const b of aeosVisivel(tudo).blocos) for (const l of b.noAdmin) expect(Object.keys(l).sort()).toEqual(['href', 'texto']);
  });
});
