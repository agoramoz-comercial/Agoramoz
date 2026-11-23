import { serverEnv } from '@/lib/config/env';

/**
 * O endereço público de uma fotografia do News (bucket `news-imagens`, 0023).
 * O caminho guardado é a base sem extensão: `.webp` para o site (o next/image
 * optimiza a partir daí) e `.jpg` para a revista em PDF (o pdf-lib só embute
 * JPEG e PNG). Sem SUPABASE_URL, não há fotografia — nunca um endereço partido.
 */
export const BUCKET_IMAGENS = 'news-imagens';

export function urlDaImagem(caminho: string | null | undefined, formato: 'webp' | 'jpg' = 'webp'): string | null {
  if (!caminho) return null;
  let base: string | undefined;
  try {
    base = serverEnv().SUPABASE_URL;
  } catch {
    base = process.env.SUPABASE_URL;
  }
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET_IMAGENS}/${caminho}.${formato}`;
}
