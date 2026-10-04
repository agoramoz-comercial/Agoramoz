import { estadoDoLink, type EstadoLink } from './links';
import { qrDe, type QR } from './qr';
import { tokenDoLink, urlDoInquerito } from './token';

/**
 * Do que a base guarda (sem token) ao que o painel de partilha mostra. O
 * endereço volta a derivar-se do id com o segredo; só os links activos o
 * mostram — um link revogado ou expirado não precisa de ser copiado.
 */

export interface LinhaLink {
  readonly id: string;
  readonly rotulo: string | null;
  readonly created_at: string;
  readonly expires_at: string | null;
  readonly revoked_at: string | null;
  readonly max_responses: number | null;
}

export interface LinkMontado {
  readonly id: string;
  readonly rotulo: string | null;
  readonly criadoEm: string;
  readonly expiraEm: string | null;
  readonly max: number | null;
  readonly respostas: number;
  readonly estado: EstadoLink;
  readonly url: string | null;
  readonly qr: QR | null;
}

export function montarLinks(
  linhas: readonly LinhaLink[],
  respostasPorLink: ReadonlyMap<string, number>,
  segredo: string | undefined,
  origem: string,
  agora: Date,
): LinkMontado[] {
  return linhas.map((l) => {
    const respostas = respostasPorLink.get(l.id) ?? 0;
    const estado = estadoDoLink(
      {
        revokedAt: l.revoked_at,
        expiresAt: l.expires_at,
        maxResponses: l.max_responses,
        respostas,
      },
      agora,
    );
    const url =
      estado === 'activo' && segredo ? urlDoInquerito(origem, tokenDoLink(segredo, l.id)) : null;
    return {
      id: l.id,
      rotulo: l.rotulo,
      criadoEm: l.created_at,
      expiraEm: l.expires_at,
      max: l.max_responses,
      respostas,
      estado,
      url,
      qr: url ? qrDe(url) : null,
    };
  });
}
