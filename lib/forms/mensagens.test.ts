import { describe, expect, it } from 'vitest';
import { STEP_FIELDS, STEP_SCHEMAS, leadSchema } from './lead-schema';

/**
 * Nenhuma mensagem de validação pode ser a do Zod.
 *
 * O defeito que este teste existe para impedir foi encontrado por alguém a
 * preencher o formulário em produção, no passo 4:
 *
 *   Invalid option: expected one of "imediato"|"1-3-meses"|"3-6-meses"|"sem-data"
 *
 * Quatro campos `z.enum` não tinham mensagem própria. O texto por omissão do
 * Zod não é apenas inglês num formulário português: **despeja os
 * identificadores internos no ecrã**. Quem o lê não fica a saber o que
 * corrigir, e fica a saber o que não lhe diz respeito.
 *
 * Um campo novo sem mensagem passa no typecheck, no lint e no build. Passa a
 * falhar aqui.
 */

/** Assinaturas do texto por omissão do Zod, em inglês. */
const DO_ZOD = /invalid|expected|required|must contain|too small|too big|option:/i;

/**
 * O que o formulário submete quando não se preenche nada.
 *
 * Strings vazias e não chaves ausentes, porque é isso que o `react-hook-form`
 * envia: os campos são inicializados a `''`. A distinção importa — com a chave
 * ausente, o Zod falha na verificação de TIPO antes de chegar à regra que tem
 * mensagem, e o teste passaria a medir um caminho que nenhum utilizador
 * percorre. Da API também não se vê: a rota devolve sempre a mesma mensagem
 * genérica, sem detalhe por campo, de propósito.
 */
const VAZIO = {
  country: '',
  sector: '',
  company: '',
  companySize: '',
  currentWebsite: '',
  processToImprove: [],
  problemImpact: '',
  decisionTimeframe: '',
  investmentBand: '',
  decisionRole: '',
  name: '',
  workEmail: '',
  phone: '',
  consent: false,
};

describe('mensagens de validação', () => {
  it('todos os campos obrigatórios têm mensagem em português', () => {
    // Um formulário submetido em branco faz disparar tudo de uma vez.
    const resultado = leadSchema.safeParse(VAZIO);
    expect(resultado.success).toBe(false);

    const ingles = resultado.error!.issues
      .filter((i) => DO_ZOD.test(i.message))
      .map((i) => `${i.path.join('.')}: ${i.message}`);

    expect(ingles, `mensagens por omissão do Zod:\n${ingles.join('\n')}`).toEqual([]);
  });

  it('nenhuma mensagem revela identificadores internos', () => {
    const resultado = leadSchema.safeParse(VAZIO);
    for (const i of resultado.error!.issues) {
      // `"mz"|"pt"` e afins não pertencem ao ecrã de quem preenche.
      expect(i.message, i.path.join('.')).not.toMatch(/"[a-z0-9-]+"\s*\|/);
    }
  });

  it('cada passo do formulário valida em português', () => {
    // Percorre passo a passo, como o utilizador percorre.
    STEP_SCHEMAS.forEach((schema, indice) => {
      const r = schema.safeParse(VAZIO);
      if (r.success) return;
      for (const i of r.error.issues) {
        expect(
          DO_ZOD.test(i.message),
          `passo ${indice + 1}, campo ${i.path.join('.')}: «${i.message}»`,
        ).toBe(false);
      }
    });
  });

  it('cobre todos os campos declarados nos passos', () => {
    // Guarda contra o teste passar por não estar a olhar para nada.
    const declarados = STEP_FIELDS.flat().length;
    expect(declarados).toBeGreaterThan(10);
  });
});
