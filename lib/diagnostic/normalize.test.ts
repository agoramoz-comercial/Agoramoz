import { describe, expect, it } from 'vitest';
import type { LeadInput } from '@/lib/forms/lead-schema';
import {
  emailDomain,
  idempotencyKey,
  inputFingerprint,
  normalizeDomain,
  normalizeEmail,
  normalizePhone,
  normalizeText,
} from './normalize';

function lead(overrides: Partial<LeadInput> = {}): LeadInput {
  return {
    country: 'mz',
    sector: 'energia-mineracao',
    company: 'Empresa Exemplo',
    companySize: '10-49',
    currentWebsite: '',
    processToImprove: ['comercial'],
    problemImpact: 'x'.repeat(40),
    decisionTimeframe: '1-3-meses',
    investmentBand: 'mz-2',
    decisionRole: 'decisor',
    name: 'Nome Exemplo',
    workEmail: 'Nome@Exemplo.CO.MZ',
    phone: '+258 84 000 0000',
    consent: true,
    ...overrides,
  };
}

describe('normalizações elementares', () => {
  it('põe o e-mail em minúsculas e apara', () => {
    expect(normalizeEmail('  Nome@Exemplo.CO.MZ ')).toBe('nome@exemplo.co.mz');
  });

  /**
   * Deliberado: `a.b@x.com` e `ab@x.com` são a mesma caixa no Gmail e contas
   * distintas noutros fornecedores. Fundir contactos que não são a mesma
   * pessoa é pior do que deixar dois registos para alguém juntar à mão.
   */
  it('não remove pontos nem sufixos do nome de utilizador', () => {
    expect(normalizeEmail('a.b+x@exemplo.com')).toBe('a.b+x@exemplo.com');
  });

  it('extrai o domínio e devolve vazio quando é malformado', () => {
    expect(emailDomain('Nome@Exemplo.CO.MZ')).toBe('exemplo.co.mz');
    expect(emailDomain('sem-arroba')).toBe('');
  });

  it('reduz o telefone a dígitos, preservando o mais', () => {
    expect(normalizePhone('+258 84 000 0000')).toBe('+258840000000');
    expect(normalizePhone('(84) 000-0000')).toBe('840000000');
  });

  /**
   * Não adivinha indicativo a partir do país escolhido: um prefixo inventado
   * produz números que não existem, e isso é pior do que um formato irregular.
   */
  it('não acrescenta indicativo que não estava lá', () => {
    expect(normalizePhone('840000000')).toBe('840000000');
  });

  it('colapsa espaço interno sem mexer em acentos nem caixa', () => {
    expect(normalizeText('  Energia   e   Mineração  ')).toBe('Energia e Mineração');
  });

  it.each([
    ['https://www.exemplo.co.mz/', 'exemplo.co.mz'],
    ['HTTP://Exemplo.co.mz', 'exemplo.co.mz'],
    ['exemplo.co.mz/pagina?x=1', 'exemplo.co.mz'],
    ['www.exemplo.co.mz.', 'exemplo.co.mz'],
  ])('reduz %s ao domínio %s', (entrada, esperado) => {
    expect(normalizeDomain(entrada)).toBe(esperado);
  });
});

describe('impressão digital das respostas', () => {
  it('é estável para o mesmo conteúdo', async () => {
    await expect(inputFingerprint(lead())).resolves.toBe(await inputFingerprint(lead()));
  });

  /**
   * A ordem por que se clicam três caixas não muda o que foi respondido. Sem
   * isto, submeter a mesma coisa duas vezes criava dois leads.
   */
  it('ignora a ordem dos processos selecionados', async () => {
    const a = await inputFingerprint(lead({ processToImprove: ['a', 'b', 'c'] }));
    const b = await inputFingerprint(lead({ processToImprove: ['c', 'a', 'b'] }));
    expect(a).toBe(b);
  });

  it('ignora espaço a mais e caixa no nome da empresa', async () => {
    const a = await inputFingerprint(lead({ company: 'Empresa   Exemplo' }));
    const b = await inputFingerprint(lead({ company: 'empresa exemplo' }));
    expect(a).toBe(b);
  });

  /**
   * Corrigir uma gralha no nome e voltar a submeter é a mesma resposta. Estes
   * campos ficam fora da projeção canónica de propósito.
   */
  it('não muda quando só o nome ou o telefone mudam', async () => {
    const a = await inputFingerprint(lead());
    const b = await inputFingerprint(lead({ name: 'Outro Nome', phone: '+258999999999' }));
    expect(a).toBe(b);
  });

  it('muda quando a substância da resposta muda', async () => {
    const a = await inputFingerprint(lead());
    const b = await inputFingerprint(lead({ problemImpact: 'y'.repeat(40) }));
    expect(a).not.toBe(b);
  });
});

describe('chave de idempotência', () => {
  it('é estável para a mesma resposta e a mesma versão', async () => {
    const a = await idempotencyKey(lead(), 'diagnostico-v1');
    const b = await idempotencyKey(lead(), 'diagnostico-v1');
    expect(a).toBe(b);
  });

  /**
   * Quando as perguntas mudam, a mesma pessoa pode responder de novo — é
   * resposta nova, não repetição.
   */
  it('muda quando a versão do questionário muda', async () => {
    const a = await idempotencyKey(lead(), 'diagnostico-v1');
    const b = await idempotencyKey(lead(), 'diagnostico-v2');
    expect(a).not.toBe(b);
  });

  it('separa pessoas diferentes com respostas iguais', async () => {
    const a = await idempotencyKey(lead({ workEmail: 'um@exemplo.co.mz' }), 'v1');
    const b = await idempotencyKey(lead({ workEmail: 'dois@exemplo.co.mz' }), 'v1');
    expect(a).not.toBe(b);
  });

  it('trata o e-mail em maiúsculas como o mesmo endereço', async () => {
    const a = await idempotencyKey(lead({ workEmail: 'UM@EXEMPLO.CO.MZ' }), 'v1');
    const b = await idempotencyKey(lead({ workEmail: 'um@exemplo.co.mz' }), 'v1');
    expect(a).toBe(b);
  });

  /** A chave vai para a base de dados e para logs. Não pode levar o endereço. */
  it('não contém o e-mail em claro', async () => {
    const chave = await idempotencyKey(lead({ workEmail: 'segredo@exemplo.co.mz' }), 'v1');
    expect(chave).not.toMatch(/segredo|exemplo/);
    expect(chave).toMatch(/^[0-9a-f]{64}$/);
  });
});
