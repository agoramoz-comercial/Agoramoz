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
  if (v === undefined) return false;
  if (c.op === 'inclui') return Array.isArray(v) && v.includes(c.valor);
  return !Array.isArray(v) && String(v) === c.valor;
}

export function visiveis(spec: Pick<SpecInquerito, 'perguntas'>, respostas: Respostas): Pergunta[] {
  const vistas = new Set<string>();
  const resultado: Pergunta[] = [];
  for (const p of spec.perguntas) {
    // Uma pergunta cuja condição aponta para outra ESCONDIDA também fica
    // escondida, mesmo que a resposta antiga ainda lá esteja: mudar de ideias
    // num cartão anterior não pode deixar perguntas órfãs à vista.
    const mostra =
      !p.mostrarSe ||
      (vistas.has(p.mostrarSe.pergunta) && condicaoCumprida(p.mostrarSe, respostas));
    if (mostra) {
      vistas.add(p.chave);
      resultado.push(p);
    }
  }
  return resultado;
}
