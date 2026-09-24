/**
 * Tipagem deliberadamente leve na SAÍDA, estrita na ENTRADA.
 *
 * Modelar o schema.org inteiro em TypeScript é um poço sem fundo e não compra
 * nada: o que protege esta camada não é a forma do JSON que sai, é a forma dos
 * factos que entram. É por isso que `localBusinessNode` não aceita `Identity`
 * — aceita apenas factos já estreitados para `'confirmed'`, e é o compilador
 * que impede a chamada enquanto eles não existirem.
 */
export interface SchemaNode {
  readonly '@type': string;
  readonly '@id'?: string;
  readonly [chave: string]: unknown;
}

export interface SchemaGraph {
  readonly '@context': 'https://schema.org';
  readonly '@graph': readonly SchemaNode[];
}

/** Referência a outro nó do grafo, em vez de o redeclarar. */
export const ref = (id: string) => ({ '@id': id });
