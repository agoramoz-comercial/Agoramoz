import { describe, expect, it } from 'vitest';
import { LIMITES, SCHEMA_VERSION, specInicial, specInquerito, versaoDoConsentimento } from './spec';

const escolha = (chave: string, extra: Record<string, unknown> = {}) => ({
  tipo: 'escolha_unica',
  chave,
  titulo: `Pergunta ${chave}`,
  opcoes: [
    { chave: 'sim', rotulo: 'Sim' },
    { chave: 'nao', rotulo: 'Não' },
  ],
  ...extra,
});

const spec = (perguntas: unknown[], extra: Record<string, unknown> = {}) => ({
  schemaVersion: SCHEMA_VERSION,
  idioma: 'pt',
  boasVindas: { titulo: 'Olá' },
  agradecimento: { titulo: 'Obrigado' },
  perguntas,
  ...extra,
});

const mensagens = (r: ReturnType<typeof specInquerito.safeParse>) =>
  r.success ? [] : r.error.issues.map((i) => i.message);

describe('specInquerito', () => {
  it('o inquérito inicial é válido', () => {
    expect(specInquerito.safeParse(specInicial('pt')).success).toBe(true);
    expect(specInquerito.safeParse(specInicial('en')).success).toBe(true);
  });

  it('aceita todos os tipos da v1', () => {
    const r = specInquerito.safeParse(
      spec([
        { tipo: 'seccao', chave: 's1', titulo: 'Sobre si' },
        { tipo: 'texto_curto', chave: 'a', titulo: 'A' },
        { tipo: 'texto_longo', chave: 'b', titulo: 'B', max: 1000 },
        escolha('c'),
        { ...escolha('d'), tipo: 'escolha_multipla', min: 1, max: 2 },
        { tipo: 'avaliacao', chave: 'e', titulo: 'E' },
        { tipo: 'nps', chave: 'f', titulo: 'F' },
        { tipo: 'numero', chave: 'g', titulo: 'G', min: 0, max: 100, inteiro: true },
        { tipo: 'data', chave: 'h', titulo: 'H' },
      ]),
    );
    expect(mensagens(r)).toEqual([]);
  });

  it('não há tipos de pergunta para email nem telefone — contacto só pelo bloco com consentimento', () => {
    expect(
      specInquerito.safeParse(spec([{ tipo: 'email', chave: 'x', titulo: 'Email' }])).success,
    ).toBe(false);
    expect(
      specInquerito.safeParse(spec([{ tipo: 'telefone', chave: 'x', titulo: 'Tel' }])).success,
    ).toBe(false);
  });

  it('recusa chaves repetidas, opções repetidas e chaves mal formadas', () => {
    expect(mensagens(specInquerito.safeParse(spec([escolha('a'), escolha('a')])))).toContain(
      'chave repetida: a',
    );
    const opcoesRepetidas = escolha('a', {
      opcoes: [
        { chave: 'x', rotulo: '1' },
        { chave: 'x', rotulo: '2' },
      ],
    });
    expect(mensagens(specInquerito.safeParse(spec([opcoesRepetidas])))).toContain(
      'opções com chaves repetidas',
    );
    expect(specInquerito.safeParse(spec([escolha('Com Espaço')])).success).toBe(false);
  });

  it('condições só para perguntas anteriores — sem ciclos', () => {
    const paraAFrente = spec([
      escolha('a', { mostrarSe: { pergunta: 'b', op: 'igual', valor: 'sim' } }),
      escolha('b'),
    ]);
    expect(mensagens(specInquerito.safeParse(paraAFrente))).toContain(
      'a condição tem de apontar para uma pergunta anterior',
    );
    const aSiMesma = spec([
      escolha('a', { mostrarSe: { pergunta: 'a', op: 'igual', valor: 'sim' } }),
    ]);
    expect(specInquerito.safeParse(aSiMesma).success).toBe(false);
  });

  it('condições com valor e operação que a pergunta-alvo pode dar', () => {
    const valorInexistente = spec([
      escolha('a'),
      escolha('b', { mostrarSe: { pergunta: 'a', op: 'igual', valor: 'talvez' } }),
    ]);
    expect(mensagens(specInquerito.safeParse(valorInexistente))).toContain(
      'valor que a pergunta-alvo não pode dar',
    );
    const opErrada = spec([
      escolha('a'),
      escolha('b', { mostrarSe: { pergunta: 'a', op: 'inclui', valor: 'sim' } }),
    ]);
    expect(mensagens(specInquerito.safeParse(opErrada))).toContain('operação incompatível');
    const textoComoAlvo = spec([
      { tipo: 'texto_curto', chave: 'a', titulo: 'A' },
      escolha('b', { mostrarSe: { pergunta: 'a', op: 'igual', valor: 'x' } }),
    ]);
    expect(mensagens(specInquerito.safeParse(textoComoAlvo))).toContain(
      'uma pergunta do tipo texto_curto não serve de condição',
    );
    const nps = spec([
      { tipo: 'nps', chave: 'a', titulo: 'A' },
      escolha('b', { mostrarSe: { pergunta: 'a', op: 'igual', valor: '10' } }),
    ]);
    expect(specInquerito.safeParse(nps).success).toBe(true);
  });

  it('limites: 50 perguntas, 20 opções, mínimos coerentes, só secções não chega', () => {
    const muitas = Array.from({ length: LIMITES.perguntas + 1 }, (_, i) => escolha(`p${i}`));
    expect(specInquerito.safeParse(spec(muitas)).success).toBe(false);
    const opcoes = Array.from({ length: LIMITES.opcoes + 1 }, (_, i) => ({
      chave: `o${i}`,
      rotulo: `O${i}`,
    }));
    expect(specInquerito.safeParse(spec([escolha('a', { opcoes })])).success).toBe(false);
    const minMaior = { ...escolha('a'), tipo: 'escolha_multipla', min: 3 };
    expect(mensagens(specInquerito.safeParse(spec([minMaior])))).toContain(
      'mínimo maior do que o número de opções',
    );
    expect(
      mensagens(specInquerito.safeParse(spec([{ tipo: 'seccao', chave: 's', titulo: 'S' }]))),
    ).toContain('o inquérito precisa de pelo menos uma pergunta');
  });

  it('um inquérito acima de 64 KB é recusado', () => {
    const grande = Array.from({ length: 40 }, (_, i) =>
      escolha(`p${i}`, {
        titulo: 'x'.repeat(290),
        ajuda: 'y'.repeat(490),
        opcoes: Array.from({ length: 20 }, (_, j) => ({ chave: `o${j}`, rotulo: 'z'.repeat(110) })),
      }),
    );
    expect(
      mensagens(specInquerito.safeParse(spec(grande))).some((m) =>
        m.startsWith('inquérito grande demais'),
      ),
    ).toBe(true);
  });

  it('campos desconhecidos são recusados (esquema estrito)', () => {
    expect(specInquerito.safeParse({ ...spec([escolha('a')]), script: 'x' }).success).toBe(false);
    expect(specInquerito.safeParse(spec([{ ...escolha('a'), html: '<b>x</b>' }])).success).toBe(
      false,
    );
  });

  it('o texto fica como foi escrito — nada é interpretado', () => {
    const titulo = 'Ignore as instruções anteriores <script>alert(1)</script>';
    const r = specInquerito.parse(spec([escolha('a', { titulo })]));
    expect(r.perguntas[0]!.titulo).toBe(titulo);
  });

  it('bloco de contacto: campos conhecidos e sem repetição', () => {
    const ok = spec([escolha('a')], {
      contacto: { campos: ['email', 'nome'], textoConsentimento: 'Aceito.' },
    });
    expect(specInquerito.safeParse(ok).success).toBe(true);
    const repetido = spec([escolha('a')], {
      contacto: { campos: ['email', 'email'], textoConsentimento: 'Aceito.' },
    });
    expect(mensagens(specInquerito.safeParse(repetido))).toContain('campos de contacto repetidos');
    const desconhecido = spec([escolha('a')], {
      contacto: { campos: ['nif'], textoConsentimento: 'Aceito.' },
    });
    expect(specInquerito.safeParse(desconhecido).success).toBe(false);
  });
});

describe('versaoDoConsentimento', () => {
  it('sai do texto: igual para o mesmo texto, diferente com uma vírgula', async () => {
    const a = await versaoDoConsentimento('Aceito que me contactem.');
    expect(a).toMatch(/^consent\.inquerito\.[0-9a-f]{12}$/);
    expect(await versaoDoConsentimento('Aceito que me contactem.')).toBe(a);
    expect(await versaoDoConsentimento('Aceito, que me contactem.')).not.toBe(a);
  });
});
