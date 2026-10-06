/**
 * Prazo para as chamadas à base no jornal e nas suas rotas.
 *
 * Porque existe: a 2026-10-06 o pool de ligações da API do Supabase esgotou
 * (`PGRST003`) e cada pedido ao `/news` esperou ~60 s antes de falhar — para
 * quem visita, o site «não deixava entrar». Com um prazo curto, a página
 * mostra o estado honesto («não foi possível carregar») em segundos, e as
 * rotas respondem (o clique num anúncio redirecciona sempre).
 *
 * O prazo não cancela a consulta na base (isso é com a 0016, `lock_timeout` e
 * `statement_timeout`); protege quem está do lado de cá.
 */

/** Leituras da página do jornal (lista, artigo, anúncios). */
export const LIMITE_LEITURA_MS = 4000;
/** Rotas públicas (gosto, partilha, impressões, clique). */
export const LIMITE_ROTA_MS = 3000;

type Resultado = { data: unknown; error: unknown };
type Falha = { data: null; error: { code: 'timeout' | 'excepcao' } };

export function comLimite<R extends Resultado>(chamada: PromiseLike<R>, ms: number): Promise<R | Falha> {
  return new Promise((resolver) => {
    const relogio = setTimeout(() => resolver({ data: null, error: { code: 'timeout' } }), ms);
    Promise.resolve(chamada).then(
      (r) => {
        clearTimeout(relogio);
        resolver(r);
      },
      () => {
        clearTimeout(relogio);
        resolver({ data: null, error: { code: 'excepcao' } });
      },
    );
  });
}
