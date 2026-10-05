import type { Instrumentation } from 'next';
import { camposDoErro } from '@/lib/log/erro-servidor';
import { log } from '@/lib/log/logger';

/**
 * Todo o erro de servidor (render, Server Action, rota) passa pelo nosso log,
 * com o digest que o ecrã de erro mostra como «Referência». Sem isto, uma
 * Server Action que falhava não deixava rasto nenhum nos registos.
 */
export const onRequestError: Instrumentation.onRequestError = (erro, pedido, contexto) => {
  log.error('servidor.erro', { outcome: 'failed', ...camposDoErro(erro, pedido, contexto) });
};
