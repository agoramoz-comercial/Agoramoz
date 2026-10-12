import { describe, expect, it } from 'vitest';
import { csvContactos, csvOportunidades, nomeFicheiro } from './csv';
import type { OportunidadePipeline } from './pipeline';

const op: OportunidadePipeline = {
  id: 'd1',
  stage: 'proposta',
  tier: 'B',
  score: 640,
  owner_id: 'u1',
  next_action_at: '2026-10-12T13:00:00Z',
  proxima_accao: '=HYPERLINK("http://mal")',
  fase_desde: null,
  valor: 350000,
  moeda: 'MZN',
  created_at: '2026-10-01T08:00:00Z',
  canal: 'organico',
  campanha: null,
  contacto: { id: 'c1', nome: 'Ana; Silva' },
  organizacao: null,
  ultima_actividade: null,
};

describe('CSV do CRM', () => {
  it('oportunidades: BOM, cabeçalho, rótulos legíveis, hora de Maputo', () => {
    const csv = csvOportunidades([op], new Map([['u1', 'Gerson']]));
    expect(csv.startsWith('﻿Contacto;Organização;Fase;')).toBe(true);
    const [, linha] = csv.split('\r\n');
    expect(linha).toContain('"Ana; Silva";;Proposta;Gerson;');
    expect(linha).toContain(';2026-10-12 15:00;350000.00;MZN;B;640;');
  });

  it('nunca entrega uma fórmula: uma célula começada por = passa a texto', () => {
    const csv = csvOportunidades([op], new Map());
    expect(csv).toContain(`"'=HYPERLINK(""http://mal"")"`);
    expect(csv).not.toMatch(/;=HYPERLINK/);
  });

  it('contactos: campos em falta ficam vazios; + e @ protegidos', () => {
    const csv = csvContactos([{ id: 'c1', nome: '+258 Ana', email: '@x', telefone: null, papel: null, organizacao: null, criado: '2026-10-01T08:00:00Z' }]);
    const [, l] = csv.split('\r\n');
    expect(l).toBe("'+258 Ana;'@x;;;;2026-10-01 10:00;c1");
  });

  it('nome do ficheiro com o dia de Maputo', () => {
    expect(nomeFicheiro('contactos', new Date('2026-10-11T22:30:00Z'))).toBe('contactos-2026-10-12.csv');
  });
});
