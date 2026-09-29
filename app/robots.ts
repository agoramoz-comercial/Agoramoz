import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { regrasPara } from '@/lib/seo/robots';

/**
 * Dinâmico de propósito: a decisão depende do host de cada pedido, não do
 * ambiente do build. Ver `lib/seo/robots.ts`.
 */
export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  return regrasPara((await headers()).get('host'));
}
