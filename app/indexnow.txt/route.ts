import { CHAVE_INDEXNOW } from '@/lib/seo/indexnow';

/** O ficheiro da chave IndexNow (ver `lib/seo/indexnow.ts`): a chave, e só a chave. */
export const dynamic = 'force-static';

export function GET() {
  return new Response(CHAVE_INDEXNOW, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
  });
}
