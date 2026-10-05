import 'server-only';
import { createHash } from 'node:crypto';
import { TOKEN } from './leitor';

/**
 * A chave que a base guarda: `sha256(token:id)`. Ligada ao artigo ou anúncio,
 * para que a mesma pessoa não seja seguível de artigo para artigo. Um token
 * com forma errada não dá chave (e o gosto/alcance simplesmente não conta).
 */
export function chaveDoLeitor(token: unknown, id: string): string | null {
  if (typeof token !== 'string' || !TOKEN.test(token)) return null;
  return createHash('sha256').update(`${token}:${id}`).digest('hex');
}
