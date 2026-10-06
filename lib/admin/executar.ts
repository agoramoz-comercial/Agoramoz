import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/auth/client';
import { log } from '@/lib/log/logger';
import { RPC, type NomeRpc } from './rpc';

/**
 * O caminho único das escritas do admin: chamar uma função `security definer`
 * pela sessão de quem está autenticado. Fica FORA dos ficheiros `'use server'`
 * de propósito — uma função exportada de lá é uma Server Action que qualquer
 * browser pode invocar; esta só é chamada pelas acções que validam primeiro.
 */

/**
 * Traduz o erro para algo que se possa mostrar.
 *
 * Nunca se devolve a mensagem do Postgres tal como vem: pode descrever o
 * esquema, e num erro de unicidade pode conter o próprio valor que colidiu.
 * Os códigos são os que as funções de 0006 levantam de propósito.
 */
function mensagemDe(codigo: string | undefined, mensagem: string | undefined): string {
  switch (codigo) {
    case '42501':
      return 'Não tem permissão para esta acção.';
    case '40001':
      return 'O registo mudou entretanto. Recarregue a página e reveja antes de decidir.';
    case 'P0002':
      return 'Registo não encontrado.';
    case '23505':
      // Nunca a mensagem do Postgres: traz o valor que colidiu.
      return 'Já existe um registo com este identificador.';
    case '23514':
    case '23503':
    case '22023':
      // Texto nosso, escrito nas funções da migração para ser lido por pessoas.
      return mensagem?.split('\n')[0] ?? 'Pedido inválido.';
    default:
      return 'Não foi possível concluir a acção.';
  }
}

/**
 * Chama a função e devolve o que ela devolve; num erro, volta a `destino`
 * com a mensagem traduzida. Separada de `chamar` para as acções que precisam
 * do resultado (o id de um inquérito acabado de criar).
 */
export async function executar(
  funcao: NomeRpc,
  argumentos: Record<string, unknown>,
  destino: string,
  traduzir?: (codigo: string | undefined) => string | undefined,
): Promise<unknown> {
  // Falha cedo e em desenvolvimento se alguém passar um argumento que a função
  // não declara: o PostgREST responderia «função não encontrada», que manda
  // procurar no sítio errado.
  const esperados = RPC[funcao] as readonly string[];
  for (const chave of Object.keys(argumentos)) {
    if (!esperados.includes(chave))
      throw new Error(`Parâmetro desconhecido em ${funcao}: ${chave}`);
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc(funcao, argumentos);

  if (error) {
    log.warn('admin.accao_recusada', {
      outcome: 'rejected',
      reason: funcao,
      errorCode: error.code ?? 'desconhecido',
    });
    const mensagem = traduzir?.(error.code) ?? mensagemDe(error.code, error.message);
    redirect(`${destino}?erro=${encodeURIComponent(mensagem)}`);
  }

  log.info('admin.accao', { outcome: 'accepted', reason: funcao });
  return data;
}

export function voltarCom(destino: string, erro: string): never {
  redirect(`${destino}?erro=${encodeURIComponent(erro)}`);
}
