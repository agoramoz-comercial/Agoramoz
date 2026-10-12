import { describe, expect, it } from 'vitest';
import { umDe } from './um';

describe('umDe — relação embutida do PostgREST', () => {
  it('objecto (um-para-um) devolve-se a si mesmo', () => {
    expect(umDe({ id: 'd1' })).toEqual({ id: 'd1' });
  });
  it('lista devolve o primeiro; lista vazia, null', () => {
    expect(umDe([{ id: 'a' }, { id: 'b' }])).toEqual({ id: 'a' });
    expect(umDe([])).toBeNull();
  });
  it('null e undefined dão null', () => {
    expect(umDe(null)).toBeNull();
    expect(umDe(undefined)).toBeNull();
  });
});
