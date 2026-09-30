import { describe, expect, it } from 'vitest';
import { CARTOES, STEP_FIELDS, type LeadInput } from './lead-schema';
import {
  CARTOES_AUTOMATICOS,
  CARTOES_OPCIONAIS,
  cartaoInicial,
  cartaoRespondido,
  minutosRestantes,
  podeIrPara,
  setorValido,
} from './carrossel';

const RESPONDIDO: Partial<LeadInput> = {
  country: 'mz',
  sector: 'energia-mineracao',
  processToImprove: ['operacoes'],
  companySize: '10-49',
  decisionTimeframe: '1-3-meses',
  decisionRole: 'decisor',
  investmentBand: 'mz-2',
};

const indice = (id: (typeof CARTOES)[number]) => CARTOES.indexOf(id);

describe('cartões do carrossel', () => {
  it('são nove, e cada um valida só os seus campos', () => {
    expect(CARTOES).toHaveLength(9);
    expect(STEP_FIELDS).toHaveLength(CARTOES.length);
  });

  it('cada cartão automático tem exactamente um campo — escolher é responder', () => {
    for (const id of CARTOES_AUTOMATICOS) expect(STEP_FIELDS[indice(id)]).toHaveLength(1);
  });

  it('o único opcional é o texto livre', () => {
    expect([...CARTOES_OPCIONAIS]).toEqual(['impacto']);
  });

  it('o contacto é o último — os dados pessoais pedem-se no fim', () => {
    expect(CARTOES.at(-1)).toBe('contacto');
  });
});

describe('setorValido', () => {
  it('aceita um setor da lista do mercado', () => {
    expect(setorValido('mz', 'energia-mineracao')).toBe(true);
  });

  it('recusa um setor que não é do mercado, vindo de um link ou de um rascunho antigo', () => {
    expect(setorValido('mz', 'inventado')).toBe(false);
  });

  it('recusa sem país ou sem setor', () => {
    expect(setorValido(undefined, 'energia-mineracao')).toBe(false);
    expect(setorValido('mz', '')).toBe(false);
  });
});

describe('cartaoInicial', () => {
  it('começa no país quando não há nada', () => {
    expect(cartaoInicial({})).toBe(0);
  });

  it('com ?pais= e ?setor= válidos, começa nos processos', () => {
    expect(cartaoInicial({ country: 'mz', sector: 'energia-mineracao' })).toBe(indice('processos'));
  });

  it('com um setor que não é do mercado, pára no setor', () => {
    expect(cartaoInicial({ country: 'mz', sector: 'inventado' })).toBe(indice('setor'));
  });

  it('com tudo o que é obrigatório respondido, pára no opcional — não o dá por visto', () => {
    expect(cartaoInicial(RESPONDIDO)).toBe(indice('impacto'));
  });

  it('um buraco a meio manda voltar a ele, não ao fim', () => {
    expect(cartaoInicial({ ...RESPONDIDO, companySize: undefined })).toBe(indice('dimensao'));
  });
});

describe('cartaoRespondido', () => {
  it('o texto livre vazio é uma resposta válida', () => {
    expect(cartaoRespondido(indice('impacto'), { problemImpact: '' })).toBe(true);
  });

  it('processos exige pelo menos um', () => {
    expect(cartaoRespondido(indice('processos'), { processToImprove: [] })).toBe(false);
    expect(cartaoRespondido(indice('processos'), { processToImprove: ['operacoes'] })).toBe(true);
  });

  it('um índice fora da lista nunca está respondido', () => {
    expect(cartaoRespondido(99, RESPONDIDO)).toBe(false);
  });
});

describe('minutosRestantes', () => {
  it('é cerca de 2 minutos do início ao fim', () => {
    expect(minutosRestantes(0)).toBe(2);
  });

  it('desce à medida que se avança, e nunca abaixo de 1', () => {
    expect(minutosRestantes(indice('contacto'))).toBe(1);
    expect(minutosRestantes(indice('impacto'))).toBeLessThanOrEqual(minutosRestantes(0));
  });
});

describe('podeIrPara', () => {
  it('deixa voltar a um cartão já visitado', () => {
    expect(podeIrPara(1, 4)).toBe(true);
  });

  it('não deixa saltar para a frente do mais avançado', () => {
    expect(podeIrPara(5, 4)).toBe(false);
  });

  it('recusa índices negativos, fora da lista ou não inteiros', () => {
    expect(podeIrPara(-1, 4)).toBe(false);
    expect(podeIrPara(9, 20)).toBe(false);
    expect(podeIrPara(1.5, 4)).toBe(false);
  });
});
