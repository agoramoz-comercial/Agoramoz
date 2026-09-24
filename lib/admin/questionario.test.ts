import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * O slug do questionário tem de ser o mesmo em dois sítios que não se falam:
 * a migração que o publica e o valor por omissão que a rota usa para o
 * procurar.
 *
 * Se divergirem, nada falha em build nem em typecheck. Falha a primeira
 * submissão real, com `23503 — Nenhuma versão publicada`, e a rota devolve 503
 * a toda a gente. É a mesma classe de defeito que existia até 0008: estado
 * combinado entre duas fontes, sem nada a verificar que combinam.
 */

const SQL = readFileSync('supabase/migrations/0008_seed_questionario.sql', 'utf-8');
const ENV = readFileSync('lib/config/env.ts', 'utf-8');

function slugDaMigracao(): string | undefined {
  return /insert into public\.questionnaires[\s\S]*?select '([a-z0-9-]+)'/.exec(SQL)?.[1];
}

function slugPorOmissao(): string | undefined {
  return /DIAGNOSTIC_QUESTIONNAIRE_SLUG:[\s\S]*?\.default\('([a-z0-9-]+)'\)/.exec(ENV)?.[1];
}

describe('questionário público', () => {
  it('a migração publica o mesmo slug que a rota procura', () => {
    const naMigracao = slugDaMigracao();
    const naRota = slugPorOmissao();

    expect(naMigracao, 'slug não encontrado em 0008').toBeDefined();
    expect(naRota, 'valor por omissão não encontrado em lib/config/env.ts').toBeDefined();
    expect(naMigracao).toBe(naRota);
  });

  it('a versão é publicada e idempotente', () => {
    // `published_at` nulo faz a função de ingestão ignorar a versão, e o efeito
    // é exactamente o mesmo de ela não existir.
    expect(SQL).toContain('published_at');
    expect(SQL).toMatch(/now\(\)/);
    // Sem as guardas, correr a migração duas vezes duplica o questionário e a
    // consulta por slug passa a ser ambígua.
    expect(SQL.match(/not exists/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
