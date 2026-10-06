import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A 0015 é aplicada pelo fundador (`supabase/aplicar-0015.sql`). Estes testes
 * garantem que o ficheiro de aplicar é a migração e que as guardas estão lá. O
 * comportamento é provado num Postgres real por `.qa/news-comportamento.sql`.
 */

const MIGRACAO = readFileSync('supabase/migrations/0015_news.sql', 'utf-8');
const APLICAR = readFileSync('supabase/aplicar-0015.sql', 'utf-8');
const VERIFICAR = readFileSync('supabase/verificar-estado.sql', 'utf-8');

function cabecalhoDe(nome: string): string {
  const inicio = MIGRACAO.indexOf(`create or replace function public.${nome}(`);
  expect(inicio, `função ausente: ${nome}`).toBeGreaterThan(-1);
  return MIGRACAO.slice(inicio, MIGRACAO.indexOf('as $$', inicio));
}

function corpoDe(nome: string): string {
  const inicio = MIGRACAO.indexOf(`create or replace function public.${nome}(`);
  return MIGRACAO.slice(inicio, MIGRACAO.indexOf('$$;', MIGRACAO.indexOf('as $$', inicio)));
}

const PUBLICAS = [
  ['artigos_publicados', 'text, text, integer, timestamptz'],
  ['artigo_publicado', 'text'],
  ['gostar_artigo', 'text, text'],
  ['partilhar_artigo', 'text, text'],
  ['anuncios_activos', ''],
  ['registar_impressoes', 'jsonb, text'],
  ['registar_clique_anuncio', 'uuid, text, text'],
] as const;

describe('0015 — AGORAMOZ News', () => {
  it('um gosto, uma partilha ou uma impressão não mudam a data editorial (updated_at)', () => {
    expect(MIGRACAO).toContain(
      'when (old.gostos is not distinct from new.gostos and old.partilhas is not distinct from new.partilhas)',
    );
    expect(MIGRACAO).toContain('when (old.impressoes is not distinct from new.impressoes');
  });

  it('a revisão nula não salta o bloqueio optimista; publicar e arquivar têm guarda de estado', () => {
    expect(MIGRACAO).not.toMatch(/revisao <> p_revisao/);
    expect(corpoDe('publicar_artigo')).toContain("if a.estado = 'publicado' then");
    expect(corpoDe('arquivar_artigo')).toContain("if a.estado <> 'publicado' then");
  });

  it('as impressões de um lote são agregadas e tratadas por ordem fixa', () => {
    const corpo = corpoDe('registar_impressoes');
    expect(corpo).toContain('select distinct');
    expect(corpo).toContain('order by 1, 2');
  });

  it('o ficheiro de aplicar contém a migração, palavra por palavra', () => {
    expect(APLICAR.endsWith(MIGRACAO)).toBe(true);
  });

  it('é repetível: só formas idempotentes de criação', () => {
    expect(MIGRACAO).not.toMatch(/create table (?!if not exists)/);
    expect(MIGRACAO).not.toMatch(/create (unique )?index (?!if not exists)/);
    for (const p of [
      'news_artigos_select',
      'news_anuncios_select',
      'news_anuncio_posicoes_select',
    ]) {
      expect(MIGRACAO).toContain(`drop policy if exists ${p}`);
    }
    for (const t of ['news_artigos_set_updated_at', 'news_anuncios_set_updated_at']) {
      expect(MIGRACAO).toContain(`drop trigger if exists ${t}`);
    }
  });

  it('todas as tabelas têm RLS e começam sem direitos', () => {
    for (const t of [
      'news_artigos',
      'news_gostos',
      'news_anuncios',
      'news_anuncio_posicoes',
      'news_anuncio_vistos',
    ]) {
      expect(MIGRACAO).toContain(`alter table public.${t} enable row level security;`);
      expect(MIGRACAO).toContain(
        `revoke all on public.${t} from public, anon, authenticated, service_role;`,
      );
    }
    // Os hashes dos leitores nunca são lidos por ninguém.
    expect(MIGRACAO).not.toMatch(/grant select on public\.news_gostos/);
    expect(MIGRACAO).not.toMatch(/grant select on public\.news_anuncio_vistos/);
  });

  it('o caminho público só é executável pela chave de serviço', () => {
    for (const [nome, assinatura] of PUBLICAS) {
      const cab = cabecalhoDe(nome);
      expect(cab, nome).toContain('security definer');
      expect(cab, nome).toContain('set search_path = public, pg_catalog');
      expect(MIGRACAO).toContain(
        `revoke all on function public.${nome}(${assinatura}) from public, anon, authenticated;`,
      );
      expect(MIGRACAO).toContain(
        `grant execute on function public.${nome}(${assinatura}) to service_role;`,
      );
    }
  });

  it('o jornal só mostra artigos publicados', () => {
    expect(corpoDe('artigos_publicados')).toContain("a.estado = 'publicado'");
    expect(corpoDe('artigo_publicado')).toContain("a.estado = 'publicado'");
    expect(corpoDe('gostar_artigo')).toContain("estado = 'publicado'");
  });

  it('o gosto é idempotente e a chave tem forma de hash', () => {
    const corpo = corpoDe('gostar_artigo');
    expect(corpo).toContain('on conflict do nothing');
    expect(corpo).toContain("'^[0-9a-f]{64}$'");
  });

  it('o clique devolve o destino guardado, nunca um vindo de fora', () => {
    expect(cabecalhoDe('registar_clique_anuncio')).not.toMatch(/p_destino/);
    expect(corpoDe('registar_clique_anuncio')).toContain("'destino', n.destino");
    // O destino é um caminho do site (nunca `//host`) ou https — validado na própria tabela.
    expect(MIGRACAO).toContain("(destino ~ '^/[a-z0-9/_-]{0,119}$' and destino !~ '//')");
    expect(MIGRACAO).toContain('add constraint news_anuncios_destino_valido');
  });

  it('as acções da equipa verificam o papel e ficam na auditoria', () => {
    for (const nome of [
      'criar_artigo',
      'guardar_artigo',
      'publicar_artigo',
      'arquivar_artigo',
      'guardar_anuncio',
      'definir_anuncio_activo',
    ]) {
      const corpo = corpoDe(nome);
      expect(corpo, nome).toContain("exigir_papel(array['admin', 'comercial']");
      expect(corpo, nome).toContain('insert into public.audit_log');
    }
  });

  it('verificar-estado tem as linhas 26 e 27 para a 0015', () => {
    expect(VERIFICAR).toContain("select 26, 'função', 'news:");
    expect(VERIFICAR).toContain("select 27, 'direitos', 'news:");
    for (const [nome, assinatura] of PUBLICAS) {
      expect(VERIFICAR).toContain(`to_regprocedure('public.${nome}(${assinatura})')`);
    }
  });
});
