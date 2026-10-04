import { describe, expect, it } from 'vitest';
import { cartoesDe, erroDoCartao, montarEnvio, primeiroComErro, respostasValidas } from './cartoes';
import { validarResposta } from './respostas';
import { specInquerito, type Pergunta } from './spec';

const SPEC = specInquerito.parse({
  schemaVersion: 'survey.v1',
  idioma: 'pt',
  boasVindas: { titulo: 'Olá' },
  agradecimento: { titulo: 'Obrigado' },
  perguntas: [
    { tipo: 'seccao', chave: 'intro', titulo: 'Sobre a empresa' },
    {
      tipo: 'escolha_unica',
      chave: 'usa_erp',
      titulo: 'Usa ERP?',
      obrigatoria: true,
      opcoes: [
        { chave: 'sim', rotulo: 'Sim' },
        { chave: 'nao', rotulo: 'Não' },
      ],
    },
    {
      tipo: 'texto_curto',
      chave: 'qual_erp',
      titulo: 'Qual?',
      obrigatoria: true,
      mostrarSe: { pergunta: 'usa_erp', op: 'igual', valor: 'sim' },
    },
    { tipo: 'numero', chave: 'pessoas', titulo: 'Pessoas', min: 1, max: 1000 },
    { tipo: 'nps', chave: 'nps', titulo: 'Recomendaria?' },
  ],
  contacto: { campos: ['nome', 'email'], textoConsentimento: 'Aceito.' },
});

const pergunta = (chave: string) => SPEC.perguntas.find((p) => p.chave === chave) as Pergunta;
const chaves = (r: Parameters<typeof cartoesDe>[1]) =>
  cartoesDe(SPEC, r).map((c) => (c.tipo === 'contacto' ? '#contacto' : c.pergunta.chave));

describe('cartões visíveis', () => {
  it('a condicional abre e fecha com a resposta validada; o contacto vem no fim', () => {
    expect(chaves({})).toEqual(['intro', 'usa_erp', 'pessoas', 'nps', '#contacto']);
    expect(chaves({ usa_erp: 'sim' })).toEqual([
      'intro',
      'usa_erp',
      'qual_erp',
      'pessoas',
      'nps',
      '#contacto',
    ]);
    // Um valor inválido nunca abre uma condicional.
    expect(chaves({ usa_erp: 'talvez' })).not.toContain('qual_erp');
  });

  it('mudar de ideias num cartão anterior tira a resposta escondida do envio', () => {
    const r = respostasValidas(SPEC, { usa_erp: 'nao', qual_erp: 'SAP' });
    expect(r).toEqual({ usa_erp: 'nao' });
  });
});

describe('erro por cartão', () => {
  it('obrigatória vazia, valor inválido, opcional vazia', () => {
    expect(erroDoCartao(pergunta('usa_erp'), undefined)).toBe('obrigatoria');
    expect(erroDoCartao(pergunta('usa_erp'), 'talvez')).toBe('invalida');
    expect(erroDoCartao(pergunta('pessoas'), '')).toBeNull();
    expect(erroDoCartao(pergunta('intro'), undefined)).toBeNull();
  });

  it('número com vírgula e fora do intervalo', () => {
    expect(erroDoCartao(pergunta('pessoas'), '12,5')).toBeNull();
    expect(erroDoCartao(pergunta('pessoas'), '0')).toBe('invalida');
    expect(erroDoCartao(pergunta('pessoas'), 'doze')).toBe('invalida');
  });

  it('primeiroComErro aponta o cartão a corrigir antes de enviar', () => {
    const r = { usa_erp: 'sim' };
    expect(primeiroComErro(cartoesDe(SPEC, r), r)).toBe(2);
    const ok = { usa_erp: 'sim', qual_erp: 'Odoo' };
    expect(primeiroComErro(cartoesDe(SPEC, ok), ok)).toBe(-1);
  });
});

describe('envio', () => {
  it('o que o browser monta é exactamente o que o servidor aceita', () => {
    const corpo = montarEnvio(
      SPEC,
      { usa_erp: 'sim', qual_erp: ' Odoo ', pessoas: '12,5', nps: 9 },
      { nome: ' Ana ', email: 'ana@exemplo.test' },
      true,
    );
    expect(corpo).toEqual({
      respostas: { usa_erp: 'sim', qual_erp: 'Odoo', pessoas: 12.5, nps: 9 },
      contacto: { nome: 'Ana', email: 'ana@exemplo.test', consentimento: true },
    });
    expect(validarResposta(SPEC, corpo).ok).toBe(true);
  });

  it('contacto em branco é resposta anónima, sem consentimento a seguir', () => {
    const corpo = montarEnvio(SPEC, { usa_erp: 'nao' }, { nome: '  ', email: '' }, true);
    expect(corpo).toEqual({ respostas: { usa_erp: 'nao' } });
  });

  it('contacto sem consentimento chega ao servidor e é recusado lá', () => {
    const corpo = montarEnvio(SPEC, { usa_erp: 'nao' }, { email: 'ana@exemplo.test' }, false);
    const r = validarResposta(SPEC, corpo);
    expect(r.ok).toBe(false);
  });
});
