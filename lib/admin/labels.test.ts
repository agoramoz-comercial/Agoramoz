import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DIAGNOSTIC_STATES } from '@/lib/diagnostic/types';
import { ESTADO_DIAGNOSTICO, FASES_OPORTUNIDADE, FASE_OPORTUNIDADE } from './labels';

describe('rótulos de estado', () => {
  it('todos os estados de diagnóstico têm rótulo', () => {
    for (const estado of DIAGNOSTIC_STATES) {
      expect(ESTADO_DIAGNOSTICO[estado], `estado sem rótulo: ${estado}`).toBeDefined();
      expect(ESTADO_DIAGNOSTICO[estado].texto.length).toBeGreaterThan(0);
    }
  });

  it('não há rótulos a mais do que estados', () => {
    expect(Object.keys(ESTADO_DIAGNOSTICO).sort()).toEqual([...DIAGNOSTIC_STATES].sort());
  });

  it('as fases coincidem com o CHECK da tabela deals', () => {
    // Lê a lista do SQL em vez de a repetir: acrescentar uma fase na base sem
    // lhe dar nome aqui passa a partir o teste, em vez de aparecer vazia.
    const sql = readFileSync('supabase/migrations/0003_questionnaires_diagnostics.sql', 'utf-8');
    const bloco = /check \(stage in \(([^)]+)\)\)/.exec(sql)?.[1];
    expect(bloco).toBeDefined();

    const noSql = [...bloco!.matchAll(/'([a-z]+)'/g)].map((m) => m[1]!).sort();
    expect([...FASES_OPORTUNIDADE].sort()).toEqual(noSql);
    expect(Object.keys(FASE_OPORTUNIDADE).sort()).toEqual(noSql);
  });
});
