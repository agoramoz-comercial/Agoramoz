import { describe, expect, it } from 'vitest';
import {
  COMPANY_SIZES,
  DECISION_ROLES,
  STEP_FIELDS,
  STEP_SCHEMAS,
  TIMEFRAMES,
  leadSchema,
} from './lead-schema';

/**
 * O mesmo schema valida no browser e no servidor — é o que impede as duas
 * validações de divergirem. Estes testes fixam as fronteiras que decidem se
 * uma submissão entra ou é rejeitada, porque é aí que uma alteração descuidada
 * passa a recusar leads legítimos sem ninguém reparar.
 */

const valido = {
  country: 'mz',
  sector: 'energia-mineracao',
  company: 'Empresa Exemplo',
  companySize: '10-49',
  currentWebsite: '',
  processToImprove: ['comercial'],
  problemImpact: 'x'.repeat(20),
  decisionTimeframe: '1-3-meses',
  investmentBand: 'mz-2',
  decisionRole: 'decisor',
  name: 'Nome Exemplo',
  workEmail: 'nome@exemplo.co.mz',
  phone: '+258840000000',
  consent: true,
} as const;

describe('leadSchema — caso base', () => {
  it('aceita uma submissão completa e válida', () => {
    expect(leadSchema.safeParse(valido).success).toBe(true);
  });
});

describe('leadSchema — fronteiras do texto de impacto', () => {
  it.each([
    [19, false],
    [20, true],
    [1500, true],
    [1501, false],
  ])('%i caracteres → aceite: %s', (comprimento, esperado) => {
    const r = leadSchema.safeParse({ ...valido, problemImpact: 'x'.repeat(comprimento) });
    expect(r.success).toBe(esperado);
  });
});

describe('leadSchema — consentimento', () => {
  it('exige verdadeiro; falso não passa', () => {
    expect(leadSchema.safeParse({ ...valido, consent: false }).success).toBe(false);
  });

  it('exige que esteja presente', () => {
    const semConsentimento: Record<string, unknown> = { ...valido };
    delete semConsentimento.consent;
    expect(leadSchema.safeParse(semConsentimento).success).toBe(false);
  });
});

describe('leadSchema — honeypot', () => {
  /**
   * Sem limite de comprimento por decisão documentada em `lead-schema.ts`: se
   * o schema rejeitasse, a rota devolvia 400 e o bot aprendia que o campo o
   * denuncia. Aceita-se a validação e descarta-se depois, com um 202
   * indistinguível de sucesso.
   */
  it('aceita qualquer comprimento, para não denunciar a armadilha', () => {
    const r = leadSchema.safeParse({ ...valido, fax: 'x'.repeat(10_000) });
    expect(r.success).toBe(true);
  });

  it('é opcional', () => {
    expect(leadSchema.safeParse(valido).success).toBe(true);
  });
});

describe('leadSchema — enumerações', () => {
  it.each([...COMPANY_SIZES])('aceita a dimensão %s', (size) => {
    expect(leadSchema.safeParse({ ...valido, companySize: size }).success).toBe(true);
  });

  it.each([...TIMEFRAMES])('aceita o prazo %s', (prazo) => {
    expect(leadSchema.safeParse({ ...valido, decisionTimeframe: prazo }).success).toBe(true);
  });

  it.each([...DECISION_ROLES])('aceita o papel %s', (papel) => {
    expect(leadSchema.safeParse({ ...valido, decisionRole: papel }).success).toBe(true);
  });

  it.each(['mz', 'pt', 'br'])('aceita o país %s', (pais) => {
    expect(leadSchema.safeParse({ ...valido, country: pais }).success).toBe(true);
  });

  it('rejeita um país fora da lista', () => {
    expect(leadSchema.safeParse({ ...valido, country: 'ao' }).success).toBe(false);
  });
});

describe('leadSchema — contacto', () => {
  it.each([
    ['sem arroba', 'nome.exemplo.co.mz'],
    ['sem domínio', 'nome@'],
    ['vazio', ''],
  ])('rejeita e-mail %s', (_rotulo, email) => {
    expect(leadSchema.safeParse({ ...valido, workEmail: email }).success).toBe(false);
  });

  it('exige pelo menos um processo a melhorar', () => {
    expect(leadSchema.safeParse({ ...valido, processToImprove: [] }).success).toBe(false);
  });

  it('aceita website vazio mas rejeita acima de 200 caracteres', () => {
    expect(leadSchema.safeParse({ ...valido, currentWebsite: '' }).success).toBe(true);
    expect(leadSchema.safeParse({ ...valido, currentWebsite: 'x'.repeat(201) }).success).toBe(false);
  });
});

describe('formulário por passos', () => {
  it('tem um conjunto de campos por cada schema de passo', () => {
    expect(STEP_FIELDS).toHaveLength(STEP_SCHEMAS.length);
  });

  /**
   * A armadilha que este teste existe para apanhar: acrescentar um campo ao
   * `leadSchema` e esquecer o `STEP_FIELDS`. O campo passaria a ser exigido
   * pelo servidor mas nunca validado em nenhum passo — o utilizador chegaria
   * ao fim do formulário e levaria com um erro sem saber a que passo voltar.
   * O honeypot está fora de propósito: não é um campo que o utilizador preencha.
   */
  it('cobre todos os campos do schema, excepto o honeypot', () => {
    const noSchema = new Set(Object.keys(leadSchema.shape));
    const nosPassos = new Set(STEP_FIELDS.flat());

    noSchema.delete('fax');

    const emFalta = [...noSchema].filter((campo) => !nosPassos.has(campo as never));
    expect(emFalta).toEqual([]);
  });

  it('não refere campos que o schema não tem', () => {
    const noSchema = new Set(Object.keys(leadSchema.shape));
    const aMais = [...nosPassosUnicos()].filter((campo) => !noSchema.has(campo));
    expect(aMais).toEqual([]);
  });
});

function nosPassosUnicos(): Set<string> {
  return new Set(STEP_FIELDS.flat() as readonly string[]);
}
