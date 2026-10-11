import type { SolutionPage, SolutionSlug } from '../../types';
import { agentesIaEn } from './agentes-ia';
import { automacaoDeProcessosEn } from './automacao-de-processos';
import { infraestruturaDigitalEn } from './infraestrutura-digital';
import { softwareEmpresarialEn } from './software-empresarial';
import { websitesAvancadosEn } from './websites-avancados';
import { integracaoDeSistemasEn } from './integracao-de-sistemas';
import { estabilizacaoEEvolucaoEn } from './estabilizacao-e-evolucao';

/**
 * As sete soluções em inglês. `Record<SolutionSlug, …>` e não
 * `Record<string, …>`: uma solução portuguesa nova sem tradução falha na
 * compilação, em vez de ir parar a um 404 com hreflang a apontar-lhe.
 */
export const SOLUTIONS_EN: Record<SolutionSlug, SolutionPage> = {
  'websites-avancados': websitesAvancadosEn,
  'software-empresarial': softwareEmpresarialEn,
  'automacao-de-processos': automacaoDeProcessosEn,
  'agentes-ia': agentesIaEn,
  'integracao-de-sistemas': integracaoDeSistemasEn,
  'infraestrutura-digital': infraestruturaDigitalEn,
  'estabilizacao-e-evolucao': estabilizacaoEEvolucaoEn,
};
