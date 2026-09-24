import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ingestDiagnosticResponse, type IngestArgs } from './client';

/**
 * O contrato entre a aplicação e a função transacional.
 *
 * Um parâmetro renomeado no SQL sem o correspondente no cliente não parte o
 * typecheck, não parte o lint e não parte nenhum teste de unidade: parte a
 * primeira submissão real em produção, com o lead a perder-se. Este teste lê a
 * assinatura da própria migração e compara-a com o que o cliente envia, para
 * que a divergência apareça aqui e não lá.
 */

const MIGRACAO = 'supabase/migrations/0005_ingest.sql';

function parametrosDaMigracao(): string[] {
  const sql = readFileSync(MIGRACAO, 'utf-8');
  const inicio = sql.indexOf('create or replace function public.ingest_diagnostic_response(');
  expect(inicio).toBeGreaterThan(-1);

  const abre = sql.indexOf('(', inicio);
  const fecha = sql.indexOf('\n)', abre);
  const corpo = sql.slice(abre + 1, fecha);

  return [...corpo.matchAll(/^\s*(p_[a-z_]+)\s/gm)].map((m) => m[1]!);
}

function argumentos(): IngestArgs {
  return {
    questionnaireSlug: 'diagnostico-estrategico',
    payload: { workEmail: 'a@b.com' },
    normalized: { sector: 'x' },
    idempotencyKey: 'a'.repeat(64),
    inputFingerprint: 'b'.repeat(64),
    score: 70,
    tier: 'A',
    rulesetVersion: '2026-09-24.1',
    scoringVersion: '2026-09-24.1',
    findings: [],
    evidenceBundle: {},
    consentText: 'texto',
    consentVersion: 'consent.mz.aabbccddeeff',
    correlationId: '11111111-1111-4111-8111-111111111111',
    ipHash: 'c'.repeat(32),
    userAgentHash: 'd'.repeat(32),
  };
}

function clienteFalso(resposta: { data?: unknown; error?: unknown } = { data: {} }) {
  const rpc = vi.fn().mockResolvedValue(resposta);
  return { cliente: { rpc } as unknown as SupabaseClient, rpc };
}

describe('contrato da função de ingestão', () => {
  it('envia exactamente os parâmetros declarados na migração, sem faltar nem sobrar', async () => {
    const { cliente, rpc } = clienteFalso();
    await ingestDiagnosticResponse(cliente, argumentos());

    const [nome, params] = rpc.mock.calls[0]!;
    expect(nome).toBe('ingest_diagnostic_response');
    expect(Object.keys(params).sort()).toEqual(parametrosDaMigracao().sort());
  });

  it('a migração declara os 16 parâmetros esperados', () => {
    // Guarda contra o próprio extrator: se a expressão regular deixasse de
    // apanhar a assinatura, o teste de cima passava a comparar duas listas
    // vazias e deixava de proteger fosse o que fosse.
    expect(parametrosDaMigracao()).toHaveLength(16);
  });
});

describe('erros de ingestão', () => {
  it('não propaga a mensagem do Postgres, que pode conter dados submetidos', async () => {
    const { cliente } = clienteFalso({
      error: { code: '23505', message: 'Key (normalized_email)=(pessoa@empresa.co.mz) already exists' },
    });

    await expect(ingestDiagnosticResponse(cliente, argumentos())).rejects.toThrow(
      /^Ingestão falhou \(23505\)$/,
    );
  });

  it('preserva o código do erro, que é o que serve para diagnosticar', async () => {
    const { cliente } = clienteFalso({ error: { code: '40001', message: 'serialization failure' } });

    await expect(ingestDiagnosticResponse(cliente, argumentos())).rejects.toMatchObject({
      code: '40001',
    });
  });

  it('um erro sem código continua a ser um erro', async () => {
    const { cliente } = clienteFalso({ error: { message: 'rede' } });

    await expect(ingestDiagnosticResponse(cliente, argumentos())).rejects.toThrow(/sem código/);
  });
});
