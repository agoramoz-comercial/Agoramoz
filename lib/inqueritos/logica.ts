import type { Condicao, Pergunta, SpecInquerito } from './spec';

/**
 * Que perguntas vê quem responde, dadas as respostas até agora.
 *
 * Pura e usada nos dois lados: o browser decide o próximo cartão, o servidor
 * recusa respostas a perguntas que não deviam ter sido vistas. Como uma
 * condição só aponta para uma pergunta anterior (garantido em `spec.ts`), uma
 * passagem pela ordem basta.
 */

export type ValorResposta = string | number | readonly string[];
export type Respostas = Readonly<Record<string, ValorResposta | undefined>>;

export function condicaoCumprida(c: Condicao, respostas: Respostas): boolean {
  const v = respostas[c.pergunta];
  // «Se não for X»: sem resposta também não é X — como o «seguinte» do Forms.
  if (c.op === 'diferente') return v === undefined || (!Array.isArray(v) && String(v) !== c.valor);
  if (v === undefined) return false;
  if (c.op === 'inclui') return Array.isArray(v) && v.includes(c.valor);
  return !Array.isArray(v) && String(v) === c.valor;
}

/**
 * O percurso pela ordem do inquérito — a ÚNICA regra de visibilidade, usada
 * pelo browser (cartões), pelo servidor (validação) e pela pré-visualização.
 * Chama-se uma vez por bloco, pela ordem, com as respostas que contam até ali.
 *
 *  - Uma pergunta cuja condição aponta para outra ESCONDIDA também fica
 *    escondida, mesmo que a resposta antiga ainda lá esteja: mudar de ideias
 *    num cartão anterior não pode deixar perguntas órfãs à vista.
 *  - Ramificação por secção (o «ir para a secção» do Microsoft Forms, o
 *    «logic jump» do Typeform): uma secção escondida esconde também as
 *    perguntas que tem até à secção seguinte.
 */
export function percursoDeVisibilidade(): (p: Pergunta, respostas: Respostas) => boolean {
  const vistas = new Set<string>();
  let seccaoEscondida = false;
  return (p, respostas) => {
    const m = p.mostrarSe;
    // «Mostrar se P não for X» com P escondida: o salto de P nunca disparou,
    // logo o bloco aparece (saltos encadeados — o padrão do Forms). As outras
    // regras precisam de P à vista; uma resposta antiga a P não conta.
    const propria =
      !m ||
      (m.op === 'diferente'
        ? !vistas.has(m.pergunta) || condicaoCumprida(m, respostas)
        : vistas.has(m.pergunta) && condicaoCumprida(m, respostas));
    if (p.tipo === 'seccao') seccaoEscondida = !propria;
    const mostra = propria && !seccaoEscondida;
    if (mostra) vistas.add(p.chave);
    return mostra;
  };
}

/**
 * Os cartões à vista. Além do percurso, retira o título de uma secção cujas
 * perguntas ficaram TODAS escondidas (vários saltos da mesma pergunta para
 * secções diferentes): seria um cartão vazio. Uma secção sem perguntas por
 * desenho (uma declaração) fica. Secções não têm resposta, por isso isto não
 * muda o que o servidor aceita.
 */
export function visiveis(spec: Pick<SpecInquerito, 'perguntas'>, respostas: Respostas): Pergunta[] {
  const visivel = percursoDeVisibilidade();
  const marcas = spec.perguntas.map((p) => visivel(p, respostas));
  const resultado: Pergunta[] = [];
  spec.perguntas.forEach((p, i) => {
    if (!marcas[i]) return;
    if (p.tipo === 'seccao') {
      let temPerguntas = false;
      let algumaVisivel = false;
      for (let j = i + 1; j < spec.perguntas.length && spec.perguntas[j]!.tipo !== 'seccao'; j++) {
        temPerguntas = true;
        if (marcas[j]) algumaVisivel = true;
      }
      if (temPerguntas && !algumaVisivel) return;
    }
    resultado.push(p);
  });
  return resultado;
}
