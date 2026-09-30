import { mercadoDoDiagnostico } from '@/lib/diagnostic/mercado';
import { CARTOES, STEP_SCHEMAS, type CartaoId, type LeadInput } from './lead-schema';

/**
 * A lógica do carrossel do diagnóstico, sem React — para ser testada.
 *
 * Três decisões que tornam o formulário menos cansativo sem esconder nada:
 *
 *  1. **Uma pergunta por cartão.** As de escolha única avançam sozinhas ao
 *     escolher (clique, Enter ou Espaço — nunca as setas, que só percorrem as
 *     opções). O avanço é anunciado antes, como o WCAG 3.2.2 pede.
 *  2. **Começa onde a pessoa está.** Quem chega de uma página de país com
 *     `?pais=` e `?setor=`, ou volta com rascunho, entra no primeiro cartão
 *     por responder — e o progresso mostra o que já está feito.
 *  3. **O texto livre é opcional**, num cartão próprio, antes do contacto.
 */

/** Cartões de escolha única: avançam sozinhos quando se escolhe. */
export const CARTOES_AUTOMATICOS: ReadonlySet<CartaoId> = new Set([
  'pais',
  'setor',
  'dimensao',
  'prazo',
  'papel',
  'faixa',
]);

/** Cartões que se podem saltar sem resposta. */
export const CARTOES_OPCIONAIS: ReadonlySet<CartaoId> = new Set(['impacto']);

/**
 * Segundos estimados por cartão, para o «cerca de N min» do cabeçalho. São
 * estimativas de desenho, não medições: tocar numa opção, ler uma lista de
 * oito, escrever três linhas, preencher o contacto.
 */
const SEGUNDOS: Record<CartaoId, number> = {
  pais: 5,
  setor: 6,
  processos: 12,
  dimensao: 5,
  prazo: 5,
  papel: 5,
  faixa: 6,
  impacto: 25,
  contacto: 45,
};

/** O setor só vale se pertencer à lista do mercado escolhido. */
export function setorValido(country: string | undefined, sector: string | undefined): boolean {
  if (!country || !sector) return false;
  return mercadoDoDiagnostico(country)?.sectors.some((s) => s.slug === sector) ?? false;
}

/** Um cartão está respondido quando o seu schema aceita os valores actuais. */
export function cartaoRespondido(indice: number, valores: Partial<LeadInput>): boolean {
  const id = CARTOES[indice];
  const schema = STEP_SCHEMAS[indice];
  if (!id || !schema) return false;
  if (id === 'setor') return setorValido(valores.country, valores.sector);
  return schema.safeParse(valores).success;
}

/**
 * O primeiro cartão por responder. Os opcionais e o contacto não contam como
 * «respondidos» por omissão: um vazio válido não quer dizer que a pessoa os
 * viu. Por isso a procura pára no primeiro opcional.
 */
export function cartaoInicial(valores: Partial<LeadInput>): number {
  for (let i = 0; i < CARTOES.length; i++) {
    const id = CARTOES[i]!;
    if (CARTOES_OPCIONAIS.has(id) || id === 'contacto') return i;
    if (!cartaoRespondido(i, valores)) return i;
  }
  return CARTOES.length - 1;
}

/** Minutos que faltam, a partir do cartão actual, arredondados para cima. */
export function minutosRestantes(indice: number): number {
  const segundos = CARTOES.slice(Math.max(0, indice)).reduce((s, id) => s + SEGUNDOS[id], 0);
  return Math.max(1, Math.ceil(segundos / 60));
}

/**
 * Pode ir directamente a um cartão (pelos pontos de progresso)? Só a um já
 * visitado — saltar para a frente deixaria perguntas obrigatórias por ver.
 */
export function podeIrPara(destino: number, maisAvancado: number): boolean {
  return Number.isInteger(destino) && destino >= 0 && destino <= maisAvancado && destino < CARTOES.length;
}
