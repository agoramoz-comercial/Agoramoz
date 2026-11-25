import { describe, expect, it } from 'vitest';
import { chaveRascunho, gravarRascunho, lerRascunho, rascunhoVazio, serializarRascunho, type RascunhoCurso } from './rascunho';

const base: RascunhoCurso = {
  titulo: 'Gestão de startups',
  tema: '',
  publico: 'Fundadores',
  nivel: 'progressivo',
  minutos: 600,
  comFontes: true,
  fontes: [{ nome: 'a.pdf', tipo: 'pdf', texto: 'x'.repeat(50), avisos: [] }],
  curso: null,
  fontesFinais: [],
  guardado: null,
  em: '2026-11-25T10:00:00.000Z',
};

describe('CUR-RAS-01 rascunho do criador de cursos', () => {
  it('ida e volta mantém o trabalho', () => {
    expect(lerRascunho(serializarRascunho(base))).toEqual(base);
  });

  it('chave por utilizador, sem caracteres estranhos', () => {
    expect(chaveRascunho('abc-123')).toBe('agoramoz:curso-rascunho:abc-123');
    expect(chaveRascunho('a/../b')).toBe('agoramoz:curso-rascunho:ab');
  });

  it('rascunho estragado, de outra versão ou com tipos inválidos é ignorado', () => {
    expect(lerRascunho('{')).toBeNull();
    expect(lerRascunho(JSON.stringify({ ...base, v: 99 }))).toBeNull();
    const r = lerRascunho(JSON.stringify({ v: 1, ...base, fontes: [{ nome: 'x', tipo: 'exe', texto: 'y', avisos: [] }], nivel: 'mau', minutos: 99999 }));
    expect(r?.fontes).toEqual([]);
    expect(r?.nivel).toBe('iniciacao');
    expect(r?.minutos).toBe(120);
  });

  it('links que não são https não voltam', () => {
    const r = lerRascunho(JSON.stringify({ v: 1, ...base, fontes: [{ nome: 'x', tipo: 'web', texto: 'y', avisos: [], url: 'javascript:alert(1)' }] }));
    expect(r?.fontes[0]?.url).toBeUndefined();
  });

  it('vazio não conta como rascunho', () => {
    expect(rascunhoVazio({ ...base, titulo: '', publico: '', fontes: [] })).toBe(true);
    expect(rascunhoVazio(base)).toBe(false);
  });

  it('sem espaço, grava sem as fontes; sem nada, apaga', () => {
    const guardados: string[] = [];
    let chamadas = 0;
    const cheio = {
      setItem: (_k: string, v: string) => {
        chamadas++;
        if (chamadas === 1) throw new Error('QuotaExceededError');
        guardados.push(v);
      },
      removeItem: () => undefined,
    };
    expect(gravarRascunho(cheio, 'k', base)).toBe('sem-fontes');
    expect(lerRascunho(guardados[0]!)?.fontes).toEqual([]);
    const nada = { setItem: () => { throw new Error('x'); }, removeItem: () => undefined };
    expect(gravarRascunho(nada, 'k', base)).toBe('nada');
  });
});
