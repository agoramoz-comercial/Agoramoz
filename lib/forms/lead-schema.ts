import { z } from 'zod';

/**
 * Sem 'use client': o route handler importa EXATAMENTE este schema, pelo que
 * a validação do cliente e a do servidor não podem divergir.
 */

/**
 * Desliga a compilação JIT do Zod.
 *
 * Por omissão o Zod constrói validadores optimizados com `new Function(...)`,
 * o que é avaliar uma string como JavaScript. Medido num browser real com a
 * CSP em modo de relatório: era a ÚNICA violação em dez rotas e três ecrãs, e
 * aparecia só em `/diagnostico` — a página onde um schema é validado do lado
 * do cliente. Mantê-la obrigaria a abrir `'unsafe-eval'` em `script-src` para
 * o site inteiro, que é a diretiva que impede um XSS de executar código
 * arbitrário a partir de uma string.
 *
 * O custo é desprezável aqui: o formulário valida uma mão-cheia de vezes, na
 * transição de passo e na submissão. Trocar microssegundos de validação por
 * uma política que vale para todas as páginas é troca fácil.
 *
 * Fica ANTES da construção dos schemas de propósito, e neste ficheiro porque
 * é o que cliente e servidor importam antes de qualquer validação.
 */
z.config({ jitless: true });

export const COMPANY_SIZES = ['1-9', '10-49', '50-249', '250+'] as const;
export const DECISION_ROLES = ['decisor', 'co-decisor', 'influenciador', 'pesquisa'] as const;
export const TIMEFRAMES = ['imediato', '1-3-meses', '3-6-meses', 'sem-data'] as const;

/**
 * Toda a validação tem de ter mensagem própria, em português.
 *
 * Sem ela, o Zod emite o seu texto por omissão — e não é só inglês: é
 * `Invalid option: expected one of "mz"|"pt"|"br"`, que despeja os
 * identificadores internos no ecrã de quem está a preencher o formulário. Quem
 * chegou ao passo 4 e leu «Invalid option» não fica a saber o que corrigir, e
 * fica a saber o que não lhe diz respeito.
 *
 * O teste que acompanha este ficheiro exige que nenhuma mensagem seja do Zod.
 */

export const stepContext = z.object({
  country: z.enum(['mz', 'pt', 'br'], { message: 'Selecione o país.' }),
  sector: z.string().min(1, 'Selecione o setor.'),
});

export const stepCompany = z.object({
  company: z.string().min(2, 'Indique o nome da empresa.'),
  companySize: z.enum(COMPANY_SIZES, { message: 'Selecione a dimensão da equipa.' }),
  currentWebsite: z.string().max(200, 'O endereço é demasiado longo.').optional().or(z.literal('')),
});

export const stepProblem = z.object({
  processToImprove: z.array(z.string()).min(1, 'Selecione pelo menos um processo.'),
  problemImpact: z
    .string()
    .min(20, 'Descreva o impacto em pelo menos 20 caracteres.')
    .max(1500, 'A descrição não pode passar de 1500 caracteres.'),
});

export const stepDecision = z.object({
  decisionTimeframe: z.enum(TIMEFRAMES, { message: 'Selecione o prazo de decisão.' }),
  investmentBand: z.string().min(1, 'Selecione uma faixa.'),
  decisionRole: z.enum(DECISION_ROLES, { message: 'Selecione o seu papel na decisão.' }),
});

export const stepContact = z.object({
  name: z.string().min(2, 'Indique o seu nome.'),
  workEmail: z.string().email('Indique um email válido.'),
  phone: z.string().min(6, 'Indique um contacto telefónico.'),
  consent: z.literal(true, { message: 'É necessário o seu consentimento para prosseguir.' }),
  /**
   * Honeypot. Deliberadamente SEM restrição de comprimento: se o schema o
   * rejeitasse, o pedido devolvia 400 e o bot aprendia que falhou. Aceitamos
   * a validação e descartamos silenciosamente no route handler, devolvendo
   * um sucesso indistinguível.
   */
  fax: z.string().optional(),
});

export const leadSchema = stepContext
  .merge(stepCompany)
  .merge(stepProblem)
  .merge(stepDecision)
  .merge(stepContact);

export type LeadInput = z.infer<typeof leadSchema>;

export const STEP_SCHEMAS = [stepContext, stepCompany, stepProblem, stepDecision, stepContact] as const;

export const STEP_FIELDS = [
  ['country', 'sector'],
  ['company', 'companySize', 'currentWebsite'],
  ['processToImprove', 'problemImpact'],
  ['decisionTimeframe', 'investmentBand', 'decisionRole'],
  ['name', 'workEmail', 'phone', 'consent'],
] as const;
