import { describe, expect, it } from 'vitest';
import { lerDados, lerPerda, lerProximaAccao } from './formularios';

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe('próxima acção', () => {
  it('data e hora de Maputo viram um instante ISO (+02:00)', () => {
    const r = lerProximaAccao(fd({ accao: ' Ligar ao decisor ', data: '2026-10-14', hora: '15:30' }));
    expect(r).toEqual({ ok: true, valor: { accao: 'Ligar ao decisor', quando: '2026-10-14T15:30:00+02:00' } });
  });
  it('sem hora, assume as 09:00', () => {
    const r = lerProximaAccao(fd({ accao: 'Enviar proposta', data: '2026-10-14', hora: '' }));
    expect(r.ok && r.valor.quando).toBe('2026-10-14T09:00:00+02:00');
  });
  it('limpar: tudo vazio', () => {
    expect(lerProximaAccao(fd({ accao: '', data: '', hora: '' }))).toEqual({ ok: true, valor: { accao: null, quando: null } });
  });
  it('recusa acção sem data, data inválida e texto longo', () => {
    expect(lerProximaAccao(fd({ accao: 'X', data: '' })).ok).toBe(false);
    expect(lerProximaAccao(fd({ accao: 'X', data: '2026-02-30' })).ok).toBe(false);
    expect(lerProximaAccao(fd({ accao: 'x'.repeat(201), data: '2026-10-14' })).ok).toBe(false);
    expect(lerProximaAccao(fd({ accao: 'X', data: '2026-10-14', hora: '25:00' })).ok).toBe(false);
  });
});

describe('valor e fecho', () => {
  it('aceita vírgula decimal e espaços de milhares', () => {
    const r = lerDados(fd({ valor: '250 000,50', moeda: 'MZN', fecho: '2026-12-15' }));
    expect(r).toEqual({ ok: true, valor: { valor: 250000.5, moeda: 'MZN', fecho: '2026-12-15' } });
  });
  it('limpar o valor limpa a moeda', () => {
    expect(lerDados(fd({ valor: '', moeda: 'EUR', fecho: '' }))).toEqual({
      ok: true,
      valor: { valor: null, moeda: null, fecho: null },
    });
  });
  it('recusa valor sem moeda, negativo, moeda desconhecida', () => {
    expect(lerDados(fd({ valor: '10', moeda: '', fecho: '' })).ok).toBe(false);
    expect(lerDados(fd({ valor: '-1', moeda: 'EUR', fecho: '' })).ok).toBe(false);
    expect(lerDados(fd({ valor: '10', moeda: 'GBP', fecho: '' })).ok).toBe(false);
    expect(lerDados(fd({ valor: 'abc', moeda: 'EUR', fecho: '' })).ok).toBe(false);
  });
});

describe('perda', () => {
  it('motivo da lista, nota opcional', () => {
    expect(lerPerda(fd({ motivo: 'preco', nota: '' }))).toEqual({ ok: true, valor: { motivo: 'preco', nota: null } });
  });
  it('«outro» exige nota; motivo fora da lista é recusado', () => {
    expect(lerPerda(fd({ motivo: 'outro', nota: ' ' })).ok).toBe(false);
    expect(lerPerda(fd({ motivo: 'outro', nota: 'Mudou de estratégia' })).ok).toBe(true);
    expect(lerPerda(fd({ motivo: 'azar', nota: '' })).ok).toBe(false);
  });
});
