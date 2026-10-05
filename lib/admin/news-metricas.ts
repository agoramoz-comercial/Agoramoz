import 'server-only';
import type { createSessionClient } from '@/lib/auth/client';

type Cliente = Awaited<ReturnType<typeof createSessionClient>>;

export interface Conversoes {
  /** Respostas (diagnóstico, inquérito) que chegaram com esta campanha do News. */
  readonly respostas: number;
  /** Oportunidades do CRM cuja campanha de aquisição é esta. */
  readonly oportunidades: number;
}

/**
 * O que cada anúncio gerou depois do clique: o anúncio leva
 * `utm_source=agoramoz_news&utm_medium=outdoor&utm_campaign=<slug>`, e a
 * atribuição (0009) guarda isso na resposta e na oportunidade. É uma
 * estimativa: quem limpa o browser ou volta por outro caminho perde a marca.
 * `null` quando a leitura falhou — nunca zeros inventados.
 */
export async function conversoesPorCampanha(
  supabase: Cliente,
  slugs: readonly string[],
): Promise<Map<string, Conversoes> | null> {
  const mapa = new Map<string, Conversoes>(slugs.map((s) => [s, { respostas: 0, oportunidades: 0 }]));
  if (slugs.length === 0) return mapa;

  const [respostas, oportunidades] = await Promise.all([
    supabase
      .from('response_attribution')
      .select('utm_campaign')
      .eq('utm_source', 'agoramoz_news')
      .eq('utm_medium', 'outdoor')
      .in('utm_campaign', [...slugs])
      .limit(10_000),
    supabase
      .from('deals')
      .select('acquisition_campaign')
      .in('acquisition_campaign', [...slugs])
      .limit(10_000),
  ]);
  if (respostas.error || oportunidades.error) return null;

  for (const r of (respostas.data ?? []) as { utm_campaign: string | null }[]) {
    const actual = r.utm_campaign ? mapa.get(r.utm_campaign) : undefined;
    if (actual && r.utm_campaign) mapa.set(r.utm_campaign, { ...actual, respostas: actual.respostas + 1 });
  }
  for (const d of (oportunidades.data ?? []) as { acquisition_campaign: string | null }[]) {
    const actual = d.acquisition_campaign ? mapa.get(d.acquisition_campaign) : undefined;
    if (actual && d.acquisition_campaign)
      mapa.set(d.acquisition_campaign, { ...actual, oportunidades: actual.oportunidades + 1 });
  }
  return mapa;
}
