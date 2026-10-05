/**
 * O leitor anónimo do jornal — o «um por browser» dos gostos e do alcance dos
 * anúncios.
 *
 * Um token aleatório de 128 bits guardado no `localStorage` deste browser.
 * Não é cookie, não sai noutros sites, não tem nome nem email; o servidor nem
 * o guarda: guarda `sha256(token:id)` por artigo ou anúncio, que não permite
 * ligar leituras entre artigos. Apagar os dados do site apaga-o.
 *
 * Sem `localStorage` (navegação privada restrita, bloqueado), não há token: o
 * gosto não conta e o alcance único não sobe — nunca se inventa uma chave.
 */

export const CHAVE_TOKEN = 'agoramoz:news:leitor:v1';
export const CHAVE_GOSTOS = 'agoramoz:news:gostos:v1';
export const TOKEN = /^[0-9a-f]{32}$/;

function gerar(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** O token deste browser, criado na primeira vez. `null` quando o armazenamento não existe. */
export function tokenDoLeitor(armazem: Pick<Storage, 'getItem' | 'setItem'> | null): string | null {
  if (!armazem) return null;
  try {
    const actual = armazem.getItem(CHAVE_TOKEN);
    if (actual && TOKEN.test(actual)) return actual;
    const novo = gerar();
    armazem.setItem(CHAVE_TOKEN, novo);
    return novo;
  } catch {
    return null;
  }
}

/** Os artigos de que este browser gostou (só para o botão aparecer marcado). */
export function gostosGuardados(armazem: Pick<Storage, 'getItem'> | null): Set<string> {
  if (!armazem) return new Set();
  try {
    const bruto: unknown = JSON.parse(armazem.getItem(CHAVE_GOSTOS) ?? '[]');
    if (!Array.isArray(bruto)) return new Set();
    return new Set(bruto.filter((s): s is string => typeof s === 'string').slice(-500));
  } catch {
    return new Set();
  }
}

export function guardarGosto(
  armazem: Pick<Storage, 'getItem' | 'setItem'> | null,
  slug: string,
): void {
  if (!armazem) return;
  try {
    const todos = gostosGuardados(armazem);
    todos.add(slug);
    armazem.setItem(CHAVE_GOSTOS, JSON.stringify([...todos].slice(-500)));
  } catch {
    // Sem armazenamento: o gosto contou no servidor; só o botão não fica lembrado.
  }
}
