/**
 * Regras da troca de palavra-passe do admin. Puro, para ser testável sem
 * Supabase; a acção (`mudarPalavraPasse`) aplica-as antes de falar com a base.
 *
 * Mínimo de 12 caracteres: uma palavra-passe provisória (como as que se
 * escrevem num chat para criar uma conta) é curta e já não é secreta — a
 * definitiva tem de ser outra coisa. Máximo de 72: o bcrypt do Supabase Auth
 * ignora o que passar daí, e aceitar mais seria prometer segurança que não há.
 */

export const MINIMO = 12;
export const MAXIMO = 72;

/**
 * A marca, em `app_metadata` (só a chave de serviço a escreve), que obriga a
 * trocar a palavra-passe no próximo acesso. O middleware lê-a do utilizador
 * que já obteve com `getUser()` — sem consulta extra.
 */
export const MARCA_TROCA = 'trocar_palavra_passe';

export function trocaObrigatoria(appMetadata: unknown): boolean {
  return (
    typeof appMetadata === 'object' &&
    appMetadata !== null &&
    (appMetadata as Record<string, unknown>)[MARCA_TROCA] === true
  );
}

export type ErroPalavraPasse = 'curta' | 'longa' | 'diferentes' | 'igual' | 'vazia';

export const MENSAGEM: Record<ErroPalavraPasse | 'actual' | 'recusada' | 'tentativas' | 'indisponivel', string> = {
  vazia: 'Preencha os três campos.',
  curta: `A palavra-passe nova tem de ter pelo menos ${MINIMO} caracteres.`,
  longa: `A palavra-passe nova tem no máximo ${MAXIMO} caracteres.`,
  diferentes: 'A confirmação não é igual à palavra-passe nova.',
  igual: 'A palavra-passe nova tem de ser diferente da actual.',
  actual: 'A palavra-passe actual não está certa.',
  recusada: 'O serviço de autenticação recusou a palavra-passe nova. Escolha outra, mais longa e menos previsível.',
  tentativas: 'Demasiadas tentativas. Espere uns minutos e tente de novo.',
  indisponivel: 'A palavra-passe foi mudada, mas não foi possível concluir o registo. Avise o administrador.',
};

export function validarTroca(actual: string, nova: string, confirmacao: string): ErroPalavraPasse | null {
  if (!actual || !nova || !confirmacao) return 'vazia';
  if (nova.length < MINIMO) return 'curta';
  if (nova.length > MAXIMO) return 'longa';
  if (nova !== confirmacao) return 'diferentes';
  if (nova === actual) return 'igual';
  return null;
}
