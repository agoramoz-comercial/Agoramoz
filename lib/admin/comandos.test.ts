import { describe, expect, it } from 'vitest';
import { gruposVisiveis } from './navegacao';
import { comandosDe, emCampo, filtrarComandos, interpretar, normalizar } from './comandos';

const nada = { inqueritos: false, news: false, energia: false, direcao: false, admin: false };

describe('comandos da paleta', () => {
  const cs = comandosDe(gruposVisiveis(nada));

  it('nascem da navegação visível: sem módulos nem admin, não há Gabinete nem Equipa', () => {
    const hrefs = cs.map((c) => c.href);
    expect(hrefs).toContain('/admin');
    expect(hrefs).toContain('/admin/oportunidades?vista=atrasadas');
    expect(hrefs).not.toContain('/admin/gabinete');
    expect(hrefs).not.toContain('/admin/equipa');
  });

  it('mostram o atalho de teclado quando existe', () => {
    expect(cs.find((c) => c.href === '/admin')?.atalho).toBe('g h');
    expect(cs.find((c) => c.href === '/admin/diagnosticos?estado=por-rever')?.atalho).toBe('g r');
  });

  it('filtram sem acentos e com vários termos; os que começam pelo termo primeiro', () => {
    expect(filtrarComandos(cs, 'organizacoes').map((c) => c.texto)).toEqual(['Organizações']);
    expect(filtrarComandos(cs, 'pipe sem').map((c) => c.texto)).toEqual(['Pipeline · Sem dono']);
    expect(filtrarComandos(cs, 'rever')[0]?.texto).toBe('Diagnósticos por rever');
    expect(filtrarComandos(cs, 'p')[0]?.texto.startsWith('P')).toBe(true);
    expect(filtrarComandos(cs, '  ')).toHaveLength(cs.length);
    expect(filtrarComandos(cs, 'zzz')).toEqual([]);
  });

  it('normaliza acentos e maiúsculas', () => {
    expect(normalizar('Ação RÁPIDA')).toBe('acao rapida');
  });
});

describe('atalhos', () => {
  it('g + tecla navega; uma segunda tecla desconhecida não faz nada', () => {
    expect(interpretar('g', false)).toEqual({ tipo: 'pendente' });
    expect(interpretar('p', true)).toEqual({ tipo: 'ir', href: '/admin/oportunidades' });
    expect(interpretar('d', true)).toEqual({ tipo: 'ir', href: '/admin/painel' });
    expect(interpretar('x', true)).toEqual({ tipo: 'nada' });
  });

  it('/ abre a pesquisa, ? a ajuda, j/k movem', () => {
    expect(interpretar('/', false)).toEqual({ tipo: 'paleta' });
    expect(interpretar('?', false)).toEqual({ tipo: 'ajuda' });
    expect(interpretar('j', false)).toEqual({ tipo: 'mover', passo: 1 });
    expect(interpretar('k', false)).toEqual({ tipo: 'mover', passo: -1 });
    expect(interpretar('h', false)).toEqual({ tipo: 'nada' });
  });

  it('dentro de campos as letras são texto', () => {
    expect(emCampo({ tagName: 'INPUT' })).toBe(true);
    expect(emCampo({ tagName: 'TEXTAREA' })).toBe(true);
    expect(emCampo({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(emCampo({ tagName: 'A' })).toBe(false);
    expect(emCampo(null)).toBe(false);
  });
});
