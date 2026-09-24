import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Uma migração tem de correr em qualquer Postgres, não só naquele onde nasceu.
 *
 * O defeito que este teste existe para impedir: em `0001`, as funções
 * `current_role_of`, `is_staff` e `is_admin` eram criadas ANTES da tabela
 * `profiles` que leem. O Postgres valida o corpo de uma função `language sql`
 * no momento da criação (`check_function_bodies`, ligado por omissão), pelo
 * que isso falha com `42P01 — relation "public.profiles" does not exist`.
 *
 * Passou despercebido durante sete migrações porque a API de migrações da
 * Supabase não faz essa validação. No editor SQL, e em qualquer Postgres
 * normal, rebentava à primeira. Só se descobriu ao tentar criar uma base nova.
 *
 * Funções `plpgsql` não são validadas na criação, por isso não entram aqui.
 */

const DIR = 'supabase/migrations';

/** As migrações concatenadas por ordem, como correriam de uma vez. */
function fluxo(): string {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(`${DIR}/${f}`, 'utf-8'))
    .join('\n');
}

interface FuncaoSql {
  readonly nome: string;
  readonly posicao: number;
  readonly corpo: string;
}

function funcoesSql(sql: string): FuncaoSql[] {
  const encontradas: FuncaoSql[] = [];
  const re = /create or replace function (public\.[a-z_]+)\(([\s\S]*?)\$\$([\s\S]*?)\$\$;/g;

  for (const m of sql.matchAll(re)) {
    // Só as `language sql`; o corpo das `plpgsql` não é validado na criação.
    if (!/^\s*language sql\b/m.test(m[2]!)) continue;
    encontradas.push({ nome: m[1]!, posicao: m.index!, corpo: m[3]! });
  }
  return encontradas;
}

describe('ordem das migrações', () => {
  const sql = fluxo();

  it('encontra as funções `language sql` que existem', () => {
    // Guarda contra o teste passar por não ter encontrado nada.
    const nomes = funcoesSql(sql).map((f) => f.nome);
    expect(nomes).toContain('public.current_role_of');
    expect(nomes).toContain('public.is_staff');
    expect(nomes).toContain('public.is_admin');
  });

  it('nenhuma função `language sql` lê uma tabela criada depois dela', () => {
    const problemas: string[] = [];

    for (const f of funcoesSql(sql)) {
      for (const ref of new Set([...f.corpo.matchAll(/\bpublic\.([a-z_]+)\b/g)].map((m) => m[1]!))) {
        const criacao = sql.indexOf(`create table public.${ref} (`);
        if (criacao === -1) continue; // não é tabela nossa
        if (criacao > f.posicao) {
          problemas.push(`${f.nome} lê public.${ref}, que só é criada depois`);
        }
      }
    }

    expect(problemas, problemas.join('\n')).toEqual([]);
  });
});
