import { describe, expect, it } from 'vitest';
import { estadoConsentimento, linhaTemporal, type RegistoConsentimento } from './ficha360';

const reg = (o: Partial<RegistoConsentimento>): RegistoConsentimento => ({
  id: 'r',
  purpose: 'contacto_comercial',
  granted: true,
  consent_text: 'texto',
  consent_version: 'v1',
  captured_at: '2026-10-01T10:00:00Z',
  withdrawn_at: null,
  ...o,
});

describe('estado do consentimento', () => {
  it('vale o registo mais recente por finalidade', () => {
    const r = estadoConsentimento([
      reg({ id: 'a', captured_at: '2026-09-01T10:00:00Z', granted: false }),
      reg({ id: 'b', captured_at: '2026-10-01T10:00:00Z', consent_version: 'v2' }),
    ]);
    expect(r).toEqual([{ finalidade: 'contacto_comercial', estado: 'concedido', desde: '2026-10-01T10:00:00Z', versao: 'v2', registos: 2 }]);
  });

  it('retirado conta desde a retirada; recusado quando nunca foi dado', () => {
    const r = estadoConsentimento([
      reg({ id: 'a', purpose: 'marketing', withdrawn_at: '2026-10-05T09:00:00Z' }),
      reg({ id: 'b', purpose: 'analise', granted: false }),
    ]);
    expect(r.map((c) => [c.finalidade, c.estado, c.desde])).toEqual([
      ['analise', 'recusado', '2026-10-01T10:00:00Z'],
      ['marketing', 'retirado', '2026-10-05T09:00:00Z'],
    ]);
  });

  it('sem registos, sem estado (não se inventa consentimento)', () => {
    expect(estadoConsentimento([])).toEqual([]);
  });
});

describe('finalidades por extenso', () => {
  it('as conhecidas por extenso; as outras como vieram', async () => {
    const { rotuloFinalidade } = await import('./ficha360');
    expect(rotuloFinalidade('diagnostico-comercial')).toBe('Contacto comercial (diagnóstico)');
    expect(rotuloFinalidade('outra')).toBe('outra');
  });
});

describe('linha temporal unificada', () => {
  const nomes = new Map([['u1', 'Ana']]);

  it('junta as fontes, do mais recente para o mais antigo, com ligações', () => {
    const r = linhaTemporal(
      {
        actividades: [{ id: 1, activity_type: 'chamada', body: 'Ligou', metadata: {}, occurred_at: '2026-10-10T10:00:00Z', deal_id: 'd1' }],
        respostas: [{ id: 'r1', submitted_at: '2026-10-01T10:00:00Z', diagnostico: { id: 'g1', tier: 'B', score: 640 } }],
        consentimentos: [reg({ id: 'c1', captured_at: '2026-10-01T10:00:00Z', withdrawn_at: '2026-10-11T10:00:00Z' })],
        oportunidades: [{ id: 'd1', created_at: '2026-10-01T10:00:05Z' }],
      },
      nomes,
    );
    expect(r.map((e) => e.id)).toEqual(['cons-r:c1', 'act:1', 'op:d1', 'resp:r1', 'cons:c1']);
    expect(r.find((e) => e.id === 'act:1')).toMatchObject({ titulo: 'Chamada', detalhe: 'Ligou', href: '/admin/oportunidades/d1' });
    expect(r.find((e) => e.id === 'resp:r1')?.href).toBe('/admin/diagnosticos/g1');
  });

  it('não repete o texto da próxima acção (já está no título)', () => {
    const r = linhaTemporal(
      {
        actividades: [{ id: 2, activity_type: 'proxima_accao', body: 'Enviar proposta', metadata: { quando: '2026-10-12T09:00:00Z' }, occurred_at: '2026-10-10T10:00:00Z', deal_id: 'd1' }],
        respostas: [],
        consentimentos: [],
        oportunidades: [],
      },
      nomes,
    );
    expect(r[0]!.titulo).toBe('Próxima acção: Enviar proposta');
    expect(r[0]!.detalhe).not.toContain('Enviar proposta');
  });
});
