import { describe, expect, it } from 'vitest';
import { lerFiltrosAuditoria, ligacaoDe, mudancas, rotuloAccao } from './auditoria';

const ID = '00000000-0000-4000-8000-000000000001';

describe('auditoria legível', () => {
  it('acções em português; uma desconhecida aparece como veio', () => {
    expect(rotuloAccao('oportunidade.mudar_fase')).toBe('Mudou a fase');
    expect(rotuloAccao('outra.coisa')).toBe('outra.coisa');
  });

  it('ligações só para objectos com ecrã e ids válidos', () => {
    expect(ligacaoDe('deal', ID)).toBe(`/admin/oportunidades/${ID}`);
    expect(ligacaoDe('diagnostic', ID)).toBe(`/admin/diagnosticos/${ID}`);
    expect(ligacaoDe('deal', '../../x')).toBeNull();
    expect(ligacaoDe('crm_lista', 'contactos')).toBeNull();
  });

  it('mostra só o que mudou, com valores curtos', () => {
    expect(mudancas({ stage: 'novo', owner: 'a' }, { stage: 'proposta', owner: 'a', nota: 'x'.repeat(100) })).toEqual([
      { campo: 'stage', antes: 'novo', depois: 'proposta' },
      { campo: 'nota', antes: '—', depois: `${'x'.repeat(79)}…` },
    ]);
    expect(mudancas(null, undefined)).toEqual([]);
    expect(mudancas([1], 'texto')).toEqual([]);
  });

  it('filtros: só valores conhecidos e bem formados', () => {
    expect(lerFiltrosAuditoria({ entidade: 'deal', pessoa: ID, desde: '2026-10-01', ate: '2026-10-12', id: ID })).toEqual({
      entidade: 'deal',
      pessoa: ID,
      desde: '2026-10-01',
      ate: '2026-10-12',
      id: ID,
    });
    expect(lerFiltrosAuditoria({ desde: '2026-13-45', ate: '2026-02-30' })).toMatchObject({ desde: undefined, ate: undefined });
    expect(lerFiltrosAuditoria({ entidade: 'ceno', pessoa: 'x', desde: '1/10/2026', id: 'a b' })).toEqual({
      entidade: undefined,
      pessoa: undefined,
      desde: undefined,
      ate: undefined,
      id: undefined,
    });
  });
});
