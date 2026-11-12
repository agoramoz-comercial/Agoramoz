import { serverEnv } from '@/lib/config/env';

/**
 * O motor cívico está ligado e tem para onde chamar.
 *
 * Uma configuração inválida conta como desligado: a página `/civico` nunca
 * falha a construir por causa de uma variável mal posta — mostra o campo
 * desligado, e a rota regista `config-invalida` no primeiro pedido.
 */
export function motorCivicoLigado(): boolean {
  try {
    const env = serverEnv();
    return env.CIVICO_ENGINE === 'lovable' && Boolean(env.LOVABLE_CIVICO_URL);
  } catch {
    return false;
  }
}
