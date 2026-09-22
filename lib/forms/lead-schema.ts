import { z } from 'zod';

/**
 * Sem 'use client': o route handler importa EXATAMENTE este schema, pelo que
 * a validação do cliente e a do servidor não podem divergir.
 */

export const COMPANY_SIZES = ['1-9', '10-49', '50-249', '250+'] as const;
export const DECISION_ROLES = ['decisor', 'co-decisor', 'influenciador', 'pesquisa'] as const;
export const TIMEFRAMES = ['imediato', '1-3-meses', '3-6-meses', 'sem-data'] as const;

export const stepContext = z.object({
  country: z.enum(['mz', 'pt', 'br']),
  sector: z.string().min(1, 'Selecione o setor.'),
});

export const stepCompany = z.object({
  company: z.string().min(2, 'Indique o nome da empresa.'),
  companySize: z.enum(COMPANY_SIZES),
  currentWebsite: z.string().max(200).optional().or(z.literal('')),
});

export const stepProblem = z.object({
  processToImprove: z.array(z.string()).min(1, 'Selecione pelo menos um processo.'),
  problemImpact: z.string().min(20, 'Descreva o impacto em pelo menos 20 caracteres.').max(1500),
});

export const stepDecision = z.object({
  decisionTimeframe: z.enum(TIMEFRAMES),
  investmentBand: z.string().min(1, 'Selecione uma faixa.'),
  decisionRole: z.enum(DECISION_ROLES),
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
