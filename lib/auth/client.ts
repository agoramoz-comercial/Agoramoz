import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { serverEnv } from '@/lib/config/env';

/**
 * Cliente da sessão de quem está autenticado.
 *
 * Duas decisões que definem o resto da área administrativa:
 *
 * 1. **Sujeito a RLS.** Não usa a chave de serviço. Um erro numa política
 *    passa a ser «esta pessoa não vê nada», e não «toda a gente vê tudo». O
 *    `dbAdmin()` de `lib/db/client.ts` continua reservado à ingestão pública,
 *    onde não há utilizador nenhum.
 *
 * 2. **Nunca chega ao browser.** A chave anónima entra como variável de
 *    servidor, sem prefixo `NEXT_PUBLIC_`. A chave é desenhada para poder ser
 *    pública; não a publicar significa que não há token em JavaScript, não há
 *    sessão no `localStorage`, e a CSP mantém `connect-src 'self'` — o admin
 *    não fala com domínio nenhum a partir do browser. Todo o ecrã é
 *    renderizado no servidor e toda a mutação é Server Action.
 */
export async function createSessionClient(): Promise<SupabaseClient> {
  const env = serverEnv();

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('A área administrativa exige SUPABASE_URL e SUPABASE_ANON_KEY.');
  }

  const store = await cookies();

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          /**
           * Um Server Component não pode escrever cookies. Isso é esperado: a
           * renovação do token acontece no middleware, que pode. Ignorar aqui
           * é correcto — ignorar em silêncio no middleware é que seria um bug,
           * e lá o `setAll` escreve mesmo.
           */
        }
      },
    },
  });
}

/** Indica se a configuração da área administrativa está completa. */
export function adminConfigured(): boolean {
  const env = serverEnv();
  return Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
}
