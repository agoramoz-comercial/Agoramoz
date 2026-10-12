import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizarResultado, padraoLike, VAZIO, type ResultadoPesquisa } from './pesquisa-modelo';

/**
 * A pesquisa global pela sessão de quem pede (RLS da equipa).
 *
 * Com a 0019 aplicada usa `pesquisar_global` — uma só ida à base, com índices
 * trigram e procura no nome, email, telefone e domínio. Antes disso a função
 * não existe (42883 / PGRST202) e a pesquisa faz o essencial por nome e email,
 * para o atalho funcionar desde o primeiro dia.
 */
export async function pesquisar(sb: SupabaseClient, termo: string): Promise<ResultadoPesquisa | null> {
  const { data, error } = await sb.rpc('pesquisar_global', { p_q: termo });
  if (!error) return normalizarResultado(data);
  if (error.code !== '42883' && error.code !== 'PGRST202') return null;
  return pesquisarSemFuncao(sb, termo);
}

async function pesquisarSemFuncao(sb: SupabaseClient, termo: string): Promise<ResultadoPesquisa | null> {
  const p = padraoLike(termo);
  const [porNome, porEmail, orgs, deals] = await Promise.all([
    sb.from('contacts').select('id, name, email').ilike('name', p).order('name').limit(8),
    sb.from('contacts').select('id, name, email').ilike('email', p).order('name').limit(8),
    sb.from('organisations').select('id, name, normalized_domain').ilike('name', p).order('name').limit(8),
    sb
      .from('deals')
      .select('id, stage, contacts!inner(name), organisations(name)')
      .ilike('contacts.name', p)
      .order('updated_at', { ascending: false })
      .limit(8),
  ]);
  if (porNome.error || porEmail.error || orgs.error || deals.error) return null;

  const contactos = new Map<string, { id: string; nome: string; email: string | null }>();
  for (const c of [...(porNome.data ?? []), ...(porEmail.data ?? [])] as { id: string; name: string; email: string | null }[]) {
    if (!contactos.has(c.id)) contactos.set(c.id, { id: c.id, nome: c.name, email: c.email });
  }
  return normalizarResultado({
    ...VAZIO,
    contactos: [...contactos.values()],
    organizacoes: ((orgs.data ?? []) as { id: string; name: string; normalized_domain: string | null }[]).map((o) => ({
      id: o.id,
      nome: o.name,
      dominio: o.normalized_domain,
    })),
    oportunidades: ((deals.data ?? []) as unknown as { id: string; stage: string; contacts: { name: string }; organisations: { name: string } | null }[]).map(
      (d) => ({ id: d.id, fase: d.stage, contacto: d.contacts.name, organizacao: d.organisations?.name ?? null }),
    ),
  });
}
