import type { Componente } from '@/content/projetos/tipos';
import { mzn } from './formato';

/**
 * Financiamento por marcos — SIMULADO. Nenhum passo reserva, cobra ou guarda
 * nada; o estado vive na memória da página e desaparece ao sair.
 *
 * O fluxo existe para mostrar o mecanismo que distingue a ideia de um
 * crowdfunding: o dinheiro só se liberta depois de evidência validada. Numa
 * versão real, os fundos ficariam numa instituição de pagamento autorizada,
 * com o instrumento jurídico definido e KYC/AML feitos ANTES do primeiro passo.
 */

export const PASSOS = [
  { id: 'selecionar', nome: 'Escolher o componente' },
  { id: 'comprometer', nome: 'Comprometer fundos' },
  { id: 'executar', nome: 'Executar o marco' },
  { id: 'evidencias', nome: 'Carregar evidências georreferenciadas' },
  { id: 'validar', nome: 'Validação técnica' },
  { id: 'comparar', nome: 'Comparar projeto e execução' },
  { id: 'libertar', nome: 'Libertar o pagamento' },
  { id: 'atualizar', nome: 'Atualizar o gémeo digital' },
] as const;

export type PassoId = (typeof PASSOS)[number]['id'];

export interface Simulacao {
  readonly componente: string;
  /** Índice em `PASSOS` do último passo feito. */
  readonly passo: number;
  readonly registo: readonly string[];
}

export const NADA_GUARDADO = 'Simulação terminada. Nada foi guardado nem cobrado.';

/** O que falta financiar neste componente. */
export function emFalta(c: Componente): number {
  return Math.max(0, c.orcamento - c.libertado);
}

function linha(passo: PassoId, c: Componente): string {
  const valor = mzn(emFalta(c));
  switch (passo) {
    case 'selecionar':
      return `Componente escolhido: ${c.nome}. Falta financiar ${valor} (fictício).`;
    case 'comprometer':
      return `${valor} ficariam comprometidos numa conta de custódia (escrow), numa instituição autorizada. Nesta demonstração nada foi reservado.`;
    case 'executar':
      return `${c.responsavel} executa o marco com o ${c.fornecedor.charAt(0).toLowerCase()}${c.fornecedor.slice(1)}.`;
    case 'evidencias': {
      const e = c.evidencias[0];
      return e
        ? `Evidência: ${e.descricao.charAt(0).toLowerCase()}${e.descricao.slice(1)} — grelha local E ${e.e} m, N ${e.n} m, ${e.data}.`
        : 'Evidência: fotografias georreferenciadas carregadas pela equipa de obra (exemplo).';
    }
    case 'validar':
      return 'Um técnico qualificado confirma a execução contra o projeto.';
    case 'comparar':
      return c.desvio === 0
        ? 'Execução conforme o orçamento: sem desvio.'
        : `Desvio de ${c.desvio > 0 ? '+' : '−'}${Math.abs(c.desvio)} % face ao orçamento, registado numa nova versão.`;
    case 'libertar':
      return `Pagamento de ${valor} libertado ao fornecedor (simulado).`;
    case 'atualizar':
      return `O gémeo digital marca «${c.nome}» como concluído.`;
  }
}

export function iniciar(c: Componente): Simulacao {
  return { componente: c.id, passo: 0, registo: [linha('selecionar', c)] };
}

export function concluida(s: Simulacao): boolean {
  return s.passo >= PASSOS.length - 1;
}

export function avancar(s: Simulacao, c: Componente): Simulacao {
  if (concluida(s) || s.componente !== c.id) return s;
  const passo = s.passo + 1;
  const registo = [...s.registo, linha(PASSOS[passo]!.id, c)];
  return { componente: s.componente, passo, registo: passo === PASSOS.length - 1 ? [...registo, NADA_GUARDADO] : registo };
}
