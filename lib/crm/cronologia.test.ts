import { describe, expect, it } from 'vitest';
import { descrever, formatarQuando } from './cronologia';

const nomes = new Map([
  ['u1', 'Ana'],
  ['u2', 'Rui'],
]);

const a = (activity_type: string, metadata: Record<string, unknown> = {}, body: string | null = null) => ({
  activity_type,
  metadata,
  body,
});

describe('cronologia legível', () => {
  it('fase com rótulos e motivo', () => {
    expect(descrever(a('fase', { de: 'novo', para: 'qualificacao' }), nomes).titulo).toBe('Fase: Novo → Qualificação');
    const p = descrever(a('fase', { de: 'proposta', para: 'perdido', motivo: 'preco' }), nomes);
    expect(p.titulo).toBe('Fase: Proposta → Perdido');
    expect(p.detalhe).toBe('Motivo: Preço');
  });
  it('a origem automática diz de onde veio', () => {
    expect(descrever(a('fase', { de: 'novo', para: 'qualificacao', origem: 'diagnostico_aprovado' }), nomes).detalhe)
      .toBe('Pelo diagnóstico aprovado');
  });
  it('atribuição por nome, nunca UUID', () => {
    expect(descrever(a('atribuicao', { de: null, para: 'u1' }), nomes).titulo).toBe('Responsável: ninguém → Ana');
    expect(descrever(a('atribuicao', { de: 'u1', para: 'desconhecido' }), nomes).titulo).toBe('Responsável: Ana → (perfil removido)');
  });
  it('próxima acção, valor e reuniões', () => {
    expect(descrever(a('proxima_accao', { quando: '2026-10-14T13:30:00Z' }, 'Ligar'), nomes).titulo).toBe(
      'Próxima acção: Ligar',
    );
    expect(descrever(a('proxima_accao', { quando: null }), nomes).titulo).toBe('Próxima acção retirada');
    expect(descrever(a('dados', { valor: 250000, moeda: 'MZN', data_prevista_fecho: '2026-12-15' }), nomes).detalhe)
      .toMatch(/250\s?000,00\s?MZN · fecho previsto 15\/12\/2026/);
    expect(descrever(a('reuniao_marcada', { inicio: '2026-10-14T13:30:00Z' }), nomes).titulo).toBe('Reunião marcada');
  });
  it('tipos manuais e desconhecidos', () => {
    expect(descrever(a('chamada', {}, 'Falámos'), nomes).titulo).toBe('Chamada');
    expect(descrever(a('xpto'), nomes).titulo).toBe('xpto');
  });
  it('datas em Maputo, com dia da semana', () => {
    expect(formatarQuando('2026-10-14T13:30:00Z')).toMatch(/qua.*14\/10\/2026.*15:30/);
  });
});
