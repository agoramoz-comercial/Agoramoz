import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RPC } from '@/lib/admin/rpc';
import { PAISES_NEWS } from './paises';
import { IMAGEM } from './artigo';

/**
 * A 0023 (país, fotografia e análise profunda do News) é aplicada pelo
 * fundador, numa parte (`supabase/aplicar-0023.sql`). Estes testes guardam a
 * forma: repetível, colunas opcionais (os artigos antigos continuam a abrir),
 * país obrigatório para publicar, escrita só pelas funções e pela redacção.
 */

const MIGRACAO = readFileSync('supabase/migrations/0023_news_pais_imagem_profunda.sql', 'utf-8');
const APLICAR = readFileSync('supabase/aplicar-0023.sql', 'utf-8');
const VERIFICAR = readFileSync('supabase/verificar-estado.sql', 'utf-8');
const FIM = '-- ===== fim do cabeçalho: daqui para baixo é a migração 0023, sem alterações =====\n';

function corpoDe(nome: string): string {
  const inicio = MIGRACAO.indexOf(`function public.${nome}(`);
  expect(inicio, `função ausente: ${nome}`).toBeGreaterThan(-1);
  return MIGRACAO.slice(inicio, MIGRACAO.indexOf('$$;', MIGRACAO.indexOf('as $$', inicio)));
}

describe('0023 — News: país, fotografia, análise profunda', () => {
  it('o ficheiro de aplicar é a migração palavra por palavra, e cabe no SQL Editor', () => {
    const i = APLICAR.indexOf(FIM);
    expect(i).toBeGreaterThan(0);
    expect(APLICAR.slice(i + FIM.length)).toBe(MIGRACAO);
    expect(APLICAR.length).toBeLessThan(21_000);
    expect(MIGRACAO.trimEnd().endsWith("notify pgrst, 'reload schema';")).toBe(true);
    expect(VERIFICAR).toContain("select 35, 'news_profunda'");
  });

  it('é repetível e as colunas novas são opcionais', () => {
    for (const c of ['pais', 'imagem_caminho', 'imagem_alt', 'imagem_credito', 'analise_profunda'])
      expect(MIGRACAO).toContain(`add column if not exists ${c} `);
    expect(MIGRACAO).not.toMatch(/not null default|set not null/);
    expect(MIGRACAO).not.toMatch(/create table (?!if not exists)/);
    for (const p of ['news_imagens_inserir', 'news_imagens_actualizar', 'news_imagens_apagar'])
      expect(MIGRACAO).toContain(`drop policy if exists ${p} on storage.objects;`);
    expect(MIGRACAO).toContain('on conflict (id) do update');
  });

  it('a lista de países da base é a do código', () => {
    const m = MIGRACAO.match(/pais in \(([^)]+)\)/);
    const daBase = m![1]!.split(',').map((x) => x.trim().replace(/'/g, ''));
    expect(daBase).toEqual([...PAISES_NEWS]);
  });

  it('o caminho da fotografia tem a mesma forma na base e no código', () => {
    expect(MIGRACAO).toContain("imagem_caminho ~ '^[0-9a-f-]{36}/[a-z0-9]{8,32}$'");
    expect(IMAGEM.test('00000000-0000-4000-8000-000000000001/abcdef0123456789')).toBe(true);
    expect(IMAGEM.test('../x/abc')).toBe(false);
  });

  it('publicar exige o país; as escritas exigem papel, revisão, lock_timeout e auditoria', () => {
    expect(corpoDe('publicar_artigo')).toMatch(/if a\.pais is null then/);
    for (const f of ['definir_pais_artigo', 'definir_imagem_artigo', 'guardar_profunda_artigo', 'publicar_artigo']) {
      const c = corpoDe(f);
      expect(c).toContain("exigir_papel(array['admin', 'comercial']");
      expect(c).toContain('a.revisao is distinct from p_revisao');
      expect(c).toContain("set lock_timeout = '4s'");
      expect(c).toContain('insert into public.audit_log');
    }
    // A auditoria da camada profunda nunca leva o conteúdo.
    expect(corpoDe('guardar_profunda_artigo')).not.toMatch(/jsonb_build_object\([^)]*p_profunda\b(?! is)/);
    // A fotografia só pode viver na pasta do próprio artigo.
    expect(corpoDe('definir_imagem_artigo')).toContain("split_part(p_caminho, '/', 1) <> p_id::text");
  });

  it('as leituras públicas só para a chave de serviço; as escritas só para autenticados', () => {
    expect(MIGRACAO).toContain('grant execute on function public.artigos_publicados(text, text, integer, timestamptz) to service_role;');
    expect(MIGRACAO).toContain('revoke all on function public.artigo_publicado(text) from public, anon, authenticated;');
    for (const f of ['definir_pais_artigo(uuid, integer, text)', 'definir_imagem_artigo(uuid, integer, text, text, text)', 'guardar_profunda_artigo(uuid, integer, jsonb)']) {
      expect(MIGRACAO).toContain(`revoke all on function public.${f} from public, anon;`);
      expect(MIGRACAO).toContain(`grant execute on function public.${f} to authenticated;`);
    }
    // O bucket: leitura pública, escrita só de admin/comercial e só nele.
    expect(MIGRACAO).not.toMatch(/create policy news_imagens_\w+ on storage\.objects for select/);
    expect(MIGRACAO.match(/current_role_of\(auth\.uid\(\)\) in \('admin', 'comercial'\)/g)).toHaveLength(3);
    expect(MIGRACAO.match(/bucket_id = 'news-imagens'/g)).toHaveLength(3);
  });

  it('as funções novas estão no mapa de RPC do admin', () => {
    expect(RPC.definir_pais_artigo).toEqual(['p_id', 'p_revisao', 'p_pais']);
    expect(RPC.guardar_profunda_artigo).toEqual(['p_id', 'p_revisao', 'p_profunda']);
  });
});
