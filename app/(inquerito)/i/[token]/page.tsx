import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { EstadoInquerito } from '@/components/inqueritos/EstadoInquerito';
import { PaginaInquerito } from '@/components/inqueritos/PaginaInquerito';
import { INQ } from '@/content/i18n/inquerito';
import { serverEnv } from '@/lib/config/env';
import { dbAdmin } from '@/lib/db/client';
import { t } from '@/lib/i18n/texto';
import {
  ErroDeBase,
  obterInqueritoPublico,
  type InqueritoPublico,
} from '@/lib/inqueritos/servidor';
import { TOKEN_VALIDO, hashToken } from '@/lib/inqueritos/token';
import { log } from '@/lib/log/logger';

/**
 * `/i/<token>` — a página de quem responde.
 *
 * Lê o inquérito pela chave de serviço, só pela função pública da 0013, e
 * só com o hash do token. Um link desconhecido é o mesmo 404 de uma rota que
 * não existe (e o de `SURVEYS=off`): não se distingue «nunca existiu» de
 * «desligado». Fechado e expirado dizem-no, porque quem tem o link precisa
 * de saber que não vale a pena insistir.
 */

export const dynamic = 'force-dynamic';

type Carregado = InqueritoPublico | { readonly estado: 'indisponivel' };

/** `cache` junta a leitura dos metadados e a da página num só pedido à base. */
const carregar = cache(async (token: string): Promise<Carregado | null> => {
  if (serverEnv().SURVEYS !== 'on' || !TOKEN_VALIDO.test(token)) return null;
  const cliente = dbAdmin();
  if (!cliente) {
    log.error('inquerito.pagina_falhou', { reason: 'sem-cliente', outcome: 'failed' });
    return { estado: 'indisponivel' };
  }
  try {
    const r = await obterInqueritoPublico(cliente, hashToken(token));
    return r.estado === 'inexistente' ? null : r;
  } catch (erro) {
    log.error('inquerito.pagina_falhou', {
      errorCode: erro instanceof ErroDeBase ? erro.codigo : 'desconhecido',
      outcome: 'failed',
    });
    return { estado: 'indisponivel' };
  }
});

type Params = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const r = await carregar(token);
  const titulo = r?.estado === 'aberto' ? r.spec.boasVindas.titulo : t(INQ.metaTitulo, 'pt');
  return {
    title: titulo,
    robots: { index: false, follow: false, nocache: true },
    referrer: 'no-referrer',
  };
}

export default async function InqueritoPage({ params }: Params) {
  const { token } = await params;
  const r = await carregar(token);
  // `carregar` já devolve null para `inexistente`; a segunda condição é para o tipo.
  if (!r || r.estado === 'inexistente') notFound();

  if (r.estado !== 'aberto') {
    return <EstadoInquerito estado={r.estado} idioma="pt" />;
  }

  return <PaginaInquerito spec={r.spec} inqueritoId={r.inquerito} token={token} />;
}
