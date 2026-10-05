/**
 * O que um erro de servidor deixa no log — e só isso.
 *
 * Sem isto, uma Server Action que rebentava mostrava ao fundador uma
 * «Referência» que não estava em nenhum log: o pedido nem aparecia. Aqui fica
 * o digest (a mesma referência do ecrã), a ROTA como padrão
 * (`/admin/inqueritos/[id]`, nunca o caminho com ids ou `?erro=`), o tipo
 * (`render`, `action`, `route`), o método, o nome do erro, a mensagem cortada e
 * o primeiro sítio da stack. Nunca o corpo, os cabeçalhos nem os cookies.
 */

export interface ContextoDoErro {
  readonly routePath: string;
  readonly routeType: string;
}

const MAX_MENSAGEM = 200;

/** O primeiro «ficheiro:linha» da stack, sem o caminho absoluto da máquina. */
function origemDe(stack: string | undefined): string | undefined {
  const linha = stack?.split('\n').find((l) => /^\s+at /.test(l));
  const m = linha && /([^/\\\s()]+:\d+(?::\d+)?)\)?\s*$/.exec(linha);
  return m ? m[1] : undefined;
}

export function camposDoErro(
  erro: unknown,
  pedido: { readonly method: string },
  contexto: ContextoDoErro,
): Record<string, string | undefined> {
  const e = erro instanceof Error ? erro : undefined;
  const digest =
    typeof (erro as { digest?: unknown } | null)?.digest === 'string'
      ? (erro as { digest: string }).digest
      : undefined;
  const mensagem = (e ? e.message : String(erro)).replace(/\s+/g, ' ').trim();
  return {
    digest,
    rota: contexto.routePath,
    tipoRota: contexto.routeType,
    metodo: pedido.method,
    erro: e?.name ?? typeof erro,
    mensagem: mensagem.length > MAX_MENSAGEM ? `${mensagem.slice(0, MAX_MENSAGEM)}…` : mensagem,
    origem: origemDe(e?.stack),
  };
}
