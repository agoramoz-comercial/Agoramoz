import { sanitizarCaminho, sanitizarReferenciador, sanitizarUtm } from './sanitize';
import type { Atribuicao } from './types';

/**
 * Constrói a origem de uma visita. Função pura: recebe o URL, o referenciador,
 * o que já estava guardado e a hora — e devolve o que passa a estar guardado.
 * Não toca em `window`, e por isso testa-se em Node.
 *
 * Três regras, e as três têm consequência comercial directa:
 *
 * 1. **O primeiro toque nunca é sobreposto.** Quem chega pelo perfil do Google
 *    e volta duas semanas depois pela pesquisa continua a ter o perfil como
 *    primeiro contacto. Sem isto, o canal que traz gente nova ficaria sempre
 *    creditado ao canal que a traz de volta.
 *
 * 2. **O último toque actualiza-se em cada navegação.**
 *
 * 3. **Os campos do toque só mudam quando o novo URL traz pelo menos um UTM**
 *    — a regra do «último clique não directo». Chegar por uma campanha e
 *    navegar para `/solucoes` não pode apagar a campanha; se apagasse, toda a
 *    atribuição se perderia à primeira ligação interna que a pessoa clicasse,
 *    que é o que acontece sempre.
 */
export function construirAtribuicao(entrada: {
  url: string;
  referrer: string;
  hostProprio: string;
  existente: Atribuicao | null;
  agora: Date;
}): Atribuicao {
  const { url, referrer, hostProprio, existente, agora } = entrada;

  let params: URLSearchParams;
  let caminho: string | null;
  try {
    const u = new URL(url);
    params = u.searchParams;
    caminho = sanitizarCaminho(u.pathname);
  } catch {
    params = new URLSearchParams();
    caminho = null;
  }

  const toque = {
    utm_source: sanitizarUtm(params.get('utm_source')),
    utm_medium: sanitizarUtm(params.get('utm_medium')),
    utm_campaign: sanitizarUtm(params.get('utm_campaign')),
    utm_content: sanitizarUtm(params.get('utm_content')),
  };

  const temUtm = Object.values(toque).some((v) => v !== null);
  const instante = agora.toISOString();

  if (existente === null) {
    return {
      ...toque,
      landing_page: caminho,
      referrer: sanitizarReferenciador(referrer, hostProprio),
      first_touch_at: instante,
      last_touch_at: instante,
    };
  }

  if (!temUtm) {
    return { ...existente, last_touch_at: instante };
  }

  return {
    ...toque,
    landing_page: caminho,
    referrer: sanitizarReferenciador(referrer, hostProprio),
    // O primeiro toque sobrevive a tudo.
    first_touch_at: existente.first_touch_at,
    last_touch_at: instante,
  };
}
