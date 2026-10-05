/**
 * Saltos ao estilo do Microsoft Forms («ir para a secção») e do Typeform
 * («logic jump»), escritos em texto:
 *
 *   «Se Não, passe para a Secção 3»      (linha depois da pergunta)
 *   «(Se respondeu «Não», avance para a pergunta 10)»
 *   «Não → Secção 3»  ·  «Não (passe para a P10)»  ·  «Sim – ir para o fim»
 *
 * O destino fica como foi escrito (número da secção ou da pergunta, ou o
 * fim); quem lê o texto resolve-o para a ordem no rascunho, e `normalizar`
 * transforma cada salto em «mostrar só se a resposta NÃO for…» nos blocos
 * saltados — que é o que o salto faz.
 */

export interface SaltoLido {
  /** A resposta que provoca o salto (o rótulo da opção, ou o número). */
  readonly valor: string;
  readonly alvo: 'seccao' | 'pergunta' | 'fim';
  /** O número escrito («3», «2.1»). Sem número no fim. */
  readonly numero?: string;
}

const VERBO =
  '(?:passe|passa|passar|avance|avança|avancar|avançar|salte|salta|saltar|siga|segue|seguir|v[aá]|ir|continue|continuar|go|skip|jump|proceed)';
const PARA = '(?:para|à|ao|até|a|to)';
const DESTINO =
  '(?:(?<s>secç[aã]o|seccao|secao|parte|bloco|section|part)\\s*(?<ns>\\d{1,3})|(?<p>pergunta|quest[aã]o|question|p|q)\\s*(?<np>\\d{1,3}(?:\\.\\d{1,3})?)|(?<f>fim|final|end|agradecimento))';

/** «Se Não, passe para a Secção 3», «Caso responda Sim: ir para o fim». */
const RE_LINHA = new RegExp(
  `^\\(?\\s*(?:se|caso|if)\\s+(?:respondeu|responder|responda|a resposta for|for|answered|the answer is)?\\s*["«“']?(?<valor>[^"»”',:;()]{1,40}?)["»”']?\\s*[,:;—–-]?\\s*(?:então\\s+)?${VERBO}\\s+(?:directamente\\s+|diretamente\\s+)?${PARA}\\s+(?:a\\s+|o\\s+)?${DESTINO}\\s*\\)?\\s*\\.?$`,
  'iu',
);

/** «Não → Secção 3», «Não (passe para a P10)», «Sim – ir para o fim». */
const RE_OPCAO = new RegExp(
  `^(?<rotulo>.+?)\\s*(?:→|->|=>|\\(|[-–—:])\\s*(?:${VERBO}\\s+)?(?:${PARA}\\s+)?(?:a\\s+|o\\s+)?${DESTINO}\\s*\\)?\\s*\\.?$`,
  'iu',
);

function destino(g: Record<string, string | undefined>): Omit<SaltoLido, 'valor'> {
  if (g.s) return { alvo: 'seccao', numero: g.ns! };
  if (g.p) return { alvo: 'pergunta', numero: g.np! };
  return { alvo: 'fim' };
}

/** Uma linha inteira que é um salto: «Se Não, passe para a Secção 3». */
export function lerSalto(l: string): SaltoLido | null {
  const m = RE_LINHA.exec(l.trim());
  if (!m?.groups) return null;
  const valor = m.groups.valor!.trim();
  if (!valor) return null;
  return { valor, ...destino(m.groups) };
}

/** Uma opção com o salto colado: «Não → Secção 3» → rótulo «Não» + salto. */
export function separarSaltoDeOpcao(opcao: string): { rotulo: string; salto?: SaltoLido } {
  const m = RE_OPCAO.exec(opcao.trim());
  if (!m?.groups) return { rotulo: opcao };
  const rotulo = m.groups.rotulo!.trim().replace(/[\s,;:–—-]+$/, '');
  if (!rotulo) return { rotulo: opcao };
  return { rotulo, salto: { valor: rotulo, ...destino(m.groups) } };
}

/** O salto na forma do rascunho: o destino já como ordem (secção n.º k, pergunta n.º k). */
export interface SaltoResolvido {
  valor: string;
  seccao?: number;
  pergunta?: number;
  fim?: true;
}

/**
 * Resolve o número escrito para a ordem no rascunho: primeiro pelo número que
 * o texto deu à secção/pergunta, depois pela ordem (a 3.ª secção).
 */
export function resolverSalto(
  s: SaltoLido,
  numeros: { seccoes: ReadonlyMap<string, number>; perguntas: ReadonlyMap<string, number> },
): SaltoResolvido | null {
  if (s.alvo === 'fim') return { valor: s.valor, fim: true };
  const mapa = s.alvo === 'seccao' ? numeros.seccoes : numeros.perguntas;
  const ordem = mapa.get(s.numero!) ?? (/^\d+$/.test(s.numero!) ? Number(s.numero) : undefined);
  if (!ordem) return null;
  return s.alvo === 'seccao' ? { valor: s.valor, seccao: ordem } : { valor: s.valor, pergunta: ordem };
}
