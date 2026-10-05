import { describe, expect, it } from 'vitest';
import { chaveDoRascunho, lerRascunho, serializarRascunho } from './rascunho';
import { specInquerito } from './spec';

const BASE = {
  schemaVersion: 'survey.v1',
  idioma: 'pt',
  boasVindas: { titulo: 'Olá' },
  agradecimento: { titulo: 'Obrigado' },
  perguntas: [
    {
      tipo: 'escolha_unica',
      chave: 'usa_erp',
      titulo: 'Usa ERP?',
      opcoes: [
        { chave: 'sim', rotulo: 'Sim' },
        { chave: 'nao', rotulo: 'Não' },
      ],
    },
    {
      tipo: 'escolha_multipla',
      chave: 'areas',
      titulo: 'Áreas',
      opcoes: [
        { chave: 'fin', rotulo: 'Finanças' },
        { chave: 'ops', rotulo: 'Operações' },
      ],
    },
    { tipo: 'texto_curto', chave: 'qual', titulo: 'Qual?', max: 10 },
    { tipo: 'numero', chave: 'pessoas', titulo: 'Pessoas' },
    { tipo: 'avaliacao', chave: 'nota', titulo: 'Nota' },
    { tipo: 'nps', chave: 'nps', titulo: 'NPS' },
    { tipo: 'seccao', chave: 'sec', titulo: 'Secção' },
  ],
  contacto: { campos: ['email'], textoConsentimento: 'Aceito.' },
} as const;
const SPEC = specInquerito.parse(BASE);

describe('chave do rascunho', () => {
  it('é estável para o mesmo inquérito e o mesmo spec', () => {
    expect(chaveDoRascunho('id-1', SPEC)).toBe(chaveDoRascunho('id-1', SPEC));
    expect(chaveDoRascunho('id-1', SPEC)).toMatch(/^agoraforms:id-1:[0-9a-z]+$/);
  });

  it('muda quando as perguntas ou as opções mudam', () => {
    const outraOpcao = specInquerito.parse({
      ...BASE,
      perguntas: BASE.perguntas.map((p) =>
        p.chave === 'usa_erp'
          ? { ...p, opcoes: [...p.opcoes, { chave: 'talvez', rotulo: 'Talvez' }] }
          : p,
      ),
    });
    expect(chaveDoRascunho('id-1', outraOpcao)).not.toBe(chaveDoRascunho('id-1', SPEC));
    expect(chaveDoRascunho('id-2', SPEC)).not.toBe(chaveDoRascunho('id-1', SPEC));
  });

  it('um título corrigido não perde o rascunho', () => {
    const titulo = specInquerito.parse({
      ...BASE,
      perguntas: BASE.perguntas.map((p) => (p.chave === 'qual' ? { ...p, titulo: 'Qual ERP?' } : p)),
    });
    expect(chaveDoRascunho('id-1', titulo)).toBe(chaveDoRascunho('id-1', SPEC));
  });
});

describe('ida e volta', () => {
  it('lê o que escreveu', () => {
    const r = { usa_erp: 'sim', areas: ['fin'], qual: 'SAP', pessoas: '12,5', nota: 4, nps: 10 };
    expect(lerRascunho(serializarRascunho(r, 3), SPEC)).toEqual({ respostas: r, indice: 3 });
  });

  it('nunca serializa dados de contacto: só recebe respostas', () => {
    const texto = serializarRascunho({ usa_erp: 'nao' }, 0);
    expect(texto).not.toContain('email');
    expect(JSON.parse(texto)).toEqual({ v: 1, indice: 0, respostas: { usa_erp: 'nao' } });
  });
});

describe('ler é desconfiar', () => {
  const ler = (respostas: unknown, extra: Record<string, unknown> = {}) =>
    lerRascunho(JSON.stringify({ v: 1, indice: 1, respostas, ...extra }), SPEC);

  it('descarta valores que o spec actual não aceita', () => {
    expect(
      ler({
        usa_erp: 'talvez', // opção que não existe
        areas: ['fin', 'fin', 'hack', 7], // duplicado, desconhecida, não texto
        qual: 'texto longo demais', // > max 10
        nota: 6, // fora de 1–5
        nps: 3.5, // não inteiro
        sec: 'x', // secção não tem resposta
        desconhecida: 'x',
        email: 'a@b.co',
      }),
    ).toEqual({ respostas: { areas: ['fin'] }, indice: 1 });
  });

  it('recusa JSON inválido, versão errada, forma errada ou vazio', () => {
    expect(lerRascunho(null, SPEC)).toBeNull();
    expect(lerRascunho('{', SPEC)).toBeNull();
    expect(lerRascunho(JSON.stringify({ v: 2, respostas: { usa_erp: 'sim' } }), SPEC)).toBeNull();
    expect(lerRascunho(JSON.stringify({ v: 1, respostas: ['sim'] }), SPEC)).toBeNull();
    expect(ler({})).toBeNull();
    expect(ler({ usa_erp: 'talvez' })).toBeNull();
  });

  it('recusa rascunhos enormes sem os interpretar', () => {
    expect(lerRascunho('x'.repeat(200_001), SPEC)).toBeNull();
  });

  it('um índice estranho volta a 0', () => {
    expect(ler({ usa_erp: 'sim' }, { indice: -3 })?.indice).toBe(0);
    expect(ler({ usa_erp: 'sim' }, { indice: '2' })?.indice).toBe(0);
  });

  it('não herda do protótipo', () => {
    const texto = '{"v":1,"indice":0,"respostas":{"__proto__":{"usa_erp":"sim"},"nota":2}}';
    expect(lerRascunho(texto, SPEC)).toEqual({ respostas: { nota: 2 }, indice: 0 });
  });
});
