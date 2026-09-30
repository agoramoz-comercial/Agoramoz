import { DIAGNOSTIC_CODES } from '@/lib/diagnostic/mercado';
import { VALIDACAO } from '@/content/i18n/formulario';
import type { Idioma } from '@/content/types';
import { IDIOMAS } from '@/lib/i18n/texto';
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
 * Toda a validação tem de ter mensagem própria, no idioma do formulário.
 *
 * Sem ela, o Zod emite o seu texto por omissão — e não é só inglês: é
 * `Invalid option: expected one of "mz"|"pt"|"br"`, que despeja os
 * identificadores internos no ecrã de quem está a preencher o formulário. Quem
 * chegou ao passo 4 e leu «Invalid option» não fica a saber o que corrigir, e
 * fica a saber o que não lhe diz respeito.
 *
 * O teste que acompanha este ficheiro exige que nenhuma mensagem seja do Zod.
 */

/**
 * Os schemas são construídos por idioma: as REGRAS são as mesmas, só a
 * mensagem muda. Construir duas vezes a partir de uma só função é o que
 * impede que um dia a validação inglesa aceite o que a portuguesa recusa.
 */
function construir(idioma: Idioma) {
  const m = (k: keyof typeof VALIDACAO) => VALIDACAO[k][idioma];

  /**
   * Um schema por cartão do carrossel, pela ordem em que aparecem. Uma
   * pergunta por cartão: a de escolha única avança sozinha, e só o contacto
   * junta vários campos — é o único momento em que se escreve.
   */
  const cartoes = {
    pais: z.object({
      // Os três mercados de operação e os dez de expansão. A lista vive em
      // `lib/diagnostic/mercado.ts`, não aqui: um código novo entra uma vez.
      country: z.enum(DIAGNOSTIC_CODES, { message: m('pais') }),
    }),
    setor: z.object({ sector: z.string().min(1, m('setor')) }),
    processos: z.object({ processToImprove: z.array(z.string()).min(1, m('processo')) }),
    dimensao: z.object({ companySize: z.enum(COMPANY_SIZES, { message: m('dimensao') }) }),
    prazo: z.object({ decisionTimeframe: z.enum(TIMEFRAMES, { message: m('prazo') }) }),
    papel: z.object({ decisionRole: z.enum(DECISION_ROLES, { message: m('papel') }) }),
    faixa: z.object({ investmentBand: z.string().min(1, m('faixa')) }),
    /**
     * Opcional desde o carrossel. Era a única área de texto obrigatória, com
     * mínimo de 20 caracteres, a meio do formulário — o ponto onde mais se
     * desiste. Quem a preenche dá contexto que a pontuação e a regra
     * CONTEXTO_INSUFICIENTE continuam a ler; quem a salta não é bloqueado.
     */
    impacto: z.object({ problemImpact: z.string().max(1500, m('impactoLongo')).default('') }),
    contacto: z.object({
      name: z.string().min(2, m('nome')),
      workEmail: z.string().email(m('email')),
      phone: z.string().min(6, m('telefone')),
      company: z.string().min(2, m('empresa')),
      currentWebsite: z.string().max(200, m('websiteLongo')).optional().or(z.literal('')),
      consent: z.literal(true, { message: m('consentimento') }),
      /**
       * Honeypot. Deliberadamente SEM restrição de comprimento: se o schema o
       * rejeitasse, o pedido devolvia 400 e o bot aprendia que falhou.
       * Aceitamos a validação e descartamos silenciosamente no route handler,
       * devolvendo um sucesso indistinguível.
       */
      fax: z.string().optional(),
    }),
  } as const;

  const leadSchema = cartoes.pais
    .merge(cartoes.setor)
    .merge(cartoes.processos)
    .merge(cartoes.dimensao)
    .merge(cartoes.prazo)
    .merge(cartoes.papel)
    .merge(cartoes.faixa)
    .merge(cartoes.impacto)
    .merge(cartoes.contacto)
    .extend({
      /**
       * O idioma em que o formulário foi MOSTRADO. Não é uma preferência: é o
       * que decide que texto de consentimento o servidor guarda. Por omissão
       * português, que é o que qualquer pedido anterior a este campo era.
       *
       * Fica em `responses.raw` e FORA da chave de idempotência — a mesma
       * pessoa com as mesmas respostas nos dois idiomas é o mesmo pedido.
       */
      idioma: z.enum(IDIOMAS).default('pt'),
    });

  return { cartoes, leadSchema };
}

const PT = construir('pt');
const EN = construir('en');

/** O schema do servidor. As mensagens não saem daqui: a rota responde sempre a mesma mensagem genérica. */
export const leadSchema = PT.leadSchema;

/** O schema do formulário, com as mensagens no idioma de quem o preenche. */
export function leadSchemaPara(idioma: Idioma) {
  return idioma === 'en' ? EN.leadSchema : PT.leadSchema;
}

export type LeadInput = z.infer<typeof leadSchema>;

/**
 * Os cartões do carrossel, pela ordem. O id é estável: é o `stepId` da
 * analítica (`step_viewed`, `form_step_completed`) e a chave dos textos.
 * A ordem vai do mais fácil ao mais pessoal — mercado e processo primeiro,
 * orçamento depois de o papel estar dito, contacto no fim.
 */
export const CARTOES = [
  'pais',
  'setor',
  'processos',
  'dimensao',
  'prazo',
  'papel',
  'faixa',
  'impacto',
  'contacto',
] as const;
export type CartaoId = (typeof CARTOES)[number];

export const STEP_SCHEMAS = CARTOES.map((c) => PT.cartoes[c]);

/** Os campos que cada cartão valida antes de avançar. */
export const STEP_FIELDS = [
  ['country'],
  ['sector'],
  ['processToImprove'],
  ['companySize'],
  ['decisionTimeframe'],
  ['decisionRole'],
  ['investmentBand'],
  ['problemImpact'],
  ['name', 'workEmail', 'phone', 'company', 'currentWebsite', 'consent'],
] as const satisfies readonly (readonly (keyof LeadInput)[])[];
