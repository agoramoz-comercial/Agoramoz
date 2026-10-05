import { describe, expect, it } from 'vitest';
import { SEM_RESERVADAS } from './construtor';
import { analisarEstruturado } from './importar/estruturado';
import { analisarTexto } from './importar/local';
import { normalizar } from './importar/normalizar';
import { lerSalto, separarSaltoDeOpcao } from './importar/saltos';
import { condicaoCumprida, visiveis } from './logica';
import { specInicial, specInquerito, type Pergunta, type SpecInquerito } from './spec';

/**
 * Ramificação ao estilo do Microsoft Forms («ir para a secção») e do Typeform
 * («logic jump»): uma secção escondida esconde as suas perguntas; um salto
 * escrito no texto vira «mostrar só se a resposta NÃO for…» nos blocos saltados.
 */

const opc = (...r: string[]) => r.map((rotulo, i) => ({ chave: `o${i + 1}`, rotulo }));

const SPEC = {
  ...specInicial('pt'),
  perguntas: [
    {
      tipo: 'escolha_unica',
      chave: 'usa',
      titulo: 'Usa ERP?',
      obrigatoria: true,
      opcoes: opc('Sim', 'Não'),
    },
    {
      tipo: 'seccao',
      chave: 's_erp',
      titulo: 'Sobre o ERP',
      mostrarSe: { pergunta: 'usa', op: 'igual', valor: 'o1' },
    },
    { tipo: 'texto_curto', chave: 'qual', titulo: 'Qual?', obrigatoria: false, max: 200 },
    { tipo: 'avaliacao', chave: 'nota', titulo: 'Como avalia?', obrigatoria: false },
    { tipo: 'seccao', chave: 's_fim', titulo: 'Para todos' },
    { tipo: 'texto_longo', chave: 'coment', titulo: 'Comentários', obrigatoria: false, max: 4000 },
  ],
} as unknown as SpecInquerito;

const chaves = (ps: Pergunta[]) => ps.map((p) => p.chave);

describe('lógica — secção esconde as suas perguntas', () => {
  it('o spec é válido', () => {
    expect(specInquerito.safeParse(SPEC).success).toBe(true);
  });

  it('com «Não», a secção do ERP e as suas perguntas desaparecem; a seguinte volta', () => {
    expect(chaves(visiveis(SPEC, { usa: 'o2' }))).toEqual(['usa', 's_fim', 'coment']);
  });

  it('com «Sim», tudo aparece', () => {
    expect(chaves(visiveis(SPEC, { usa: 'o1' }))).toEqual([
      'usa',
      's_erp',
      'qual',
      'nota',
      's_fim',
      'coment',
    ]);
  });
});

describe('condição «diferente»', () => {
  it('mostra quando a resposta não é aquela — e sem resposta também', () => {
    const c = { pergunta: 'usa', op: 'diferente' as const, valor: 'o2' };
    expect(condicaoCumprida(c, { usa: 'o1' })).toBe(true);
    expect(condicaoCumprida(c, { usa: 'o2' })).toBe(false);
    expect(condicaoCumprida(c, {})).toBe(true);
  });

  it('é aceite em escolha única; não em escolha múltipla', () => {
    const base = specInicial('pt');
    const com = (alvo: Record<string, unknown>) =>
      specInquerito.safeParse({
        ...base,
        perguntas: [
          alvo,
          {
            tipo: 'texto_curto',
            chave: 'x',
            titulo: 'X',
            mostrarSe: { pergunta: 'a', op: 'diferente', valor: 'o1' },
          },
        ],
      }).success;
    expect(com({ tipo: 'escolha_unica', chave: 'a', titulo: 'A', opcoes: opc('1', '2') })).toBe(
      true,
    );
    expect(com({ tipo: 'escolha_multipla', chave: 'a', titulo: 'A', opcoes: opc('1', '2') })).toBe(
      false,
    );
  });
});

describe('saltos escritos no texto', () => {
  it.each([
    ['Se Não, passe para a Secção 3', { valor: 'Não', alvo: 'seccao', numero: '3' }],
    [
      '(Se respondeu «Não», avance para a pergunta 10)',
      { valor: 'Não', alvo: 'pergunta', numero: '10' },
    ],
    ['Caso responda Sim: ir para o fim.', { valor: 'Sim', alvo: 'fim' }],
    ['If No, skip to Section 2', { valor: 'No', alvo: 'seccao', numero: '2' }],
  ])('«%s»', (linha, esperado) => {
    expect(lerSalto(linha)).toEqual(esperado);
  });

  it('não confunde perguntas condicionais nem frases com «se»', () => {
    expect(lerSalto('Se sim, qual ERP usa?')).toBeNull();
    expect(lerSalto('Se possível, responda até sexta.')).toBeNull();
  });

  it.each([
    ['Não → Secção 3', 'Não', { alvo: 'seccao', numero: '3' }],
    ['Não (passe para a P10)', 'Não', { alvo: 'pergunta', numero: '10' }],
    ['Sim – ir para o fim', 'Sim', { alvo: 'fim' }],
  ])('opção «%s»', (texto, rotulo, destino) => {
    const r = separarSaltoDeOpcao(texto);
    expect(r.rotulo).toBe(rotulo);
    expect(r.salto).toMatchObject({ valor: rotulo, ...destino });
  });

  it('uma opção normal fica como está', () => {
    expect(separarSaltoDeOpcao('Outro - especifique')).toEqual({ rotulo: 'Outro - especifique' });
    expect(separarSaltoDeOpcao('Agricultura')).toEqual({ rotulo: 'Agricultura' });
  });
});

const TEXTO = `Inquérito de ERP
Secção 1: Perfil
1. A empresa usa um ERP?
a) Sim
b) Não
Se Não, passe para a Secção 3

Secção 2: Sobre o ERP
2. Qual ERP usa?
3. Como avalia o ERP de 1 a 5?

Secção 3: Planos
4. Pensa investir em software este ano?
a) Sim
b) Não → Secção 4
5. Quanto pensa investir?

Secção 4: Para todos
6. Comentários finais`;

describe('do texto ao inquérito com ramificação', () => {
  const r = normalizar(analisarTexto(TEXTO), {
    base: specInicial('pt'),
    reservadas: SEM_RESERVADAS,
    modo: 'substituir',
  });
  if (!r.ok) throw new Error(r.motivo);
  const porTitulo = (t: string) => r.spec.perguntas.find((p) => p.titulo === t)!;

  it('a opção perde a seta e fica limpa', () => {
    const p4 = porTitulo('Pensa investir em software este ano?') as Extract<
      Pergunta,
      { tipo: 'escolha_unica' }
    >;
    expect(p4.opcoes.map((o) => o.rotulo)).toEqual(['Sim', 'Não']);
  });

  it('«Se Não → Secção 3» esconde a Secção 2 inteira (pela secção)', () => {
    expect(porTitulo('Sobre o ERP').mostrarSe).toMatchObject({ op: 'diferente' });
    expect(porTitulo('Qual ERP usa?').mostrarSe).toBeUndefined();
  });

  it('«Não → Secção 4» esconde a pergunta 5, que está a meio da sua secção', () => {
    expect(porTitulo('Quanto pensa investir?').mostrarSe).toMatchObject({ op: 'diferente' });
    expect(porTitulo('Para todos').mostrarSe).toBeUndefined();
  });

  it('a experiência de quem responde segue os saltos', () => {
    const usa = porTitulo('A empresa usa um ERP?').chave;
    const investe = porTitulo('Pensa investir em software este ano?').chave;
    const titulos = (resp: Record<string, string>) =>
      visiveis(r.spec, resp)
        .filter((p) => p.tipo !== 'seccao')
        .map((p) => p.titulo);
    expect(titulos({ [usa]: 'o2', [investe]: 'o2' })).toEqual([
      'A empresa usa um ERP?',
      'Pensa investir em software este ano?',
      'Comentários finais',
    ]);
    expect(titulos({ [usa]: 'o1', [investe]: 'o1' })).toHaveLength(6);
  });

  it('um salto para trás é retirado com aviso', () => {
    const r2 = normalizar(
      analisarTexto(
        'Secção 1: A\n1. Usa?\na) Sim\nb) Não\nSecção 2: B\n2. Outra?\na) Sim\nb) Não\nSe Sim, passe para a Secção 1',
      ),
      { base: specInicial('pt'), reservadas: SEM_RESERVADAS, modo: 'substituir' },
    );
    expect(r2.ok && r2.avisos.some((a) => /não tem destino à frente/.test(a.texto))).toBe(true);
  });
});

describe('na ficha com campos', () => {
  const FICHA = `Secção 1: Perfil
Pergunta 1: Usa um ERP?
Tipo: Sim/Não
Obrigatória: Sim
Lógica: Se Não, ir para a Secção 3

Secção 2: ERP
Condição: P1 = Sim
Pergunta 2: Qual?
Tipo: Texto curto

Secção 3: Para todos
Pergunta 3: Comentários
Tipo: Parágrafo`;

  it('«Lógica:» vira salto e «Condição:» numa secção condiciona a secção', () => {
    const lida = analisarEstruturado(FICHA)!;
    const blocos = lida.rascunho.blocos;
    expect(blocos[1]).toMatchObject({ bloco: 'pergunta', saltos: [{ valor: 'Não', seccao: 3 }] });
    expect(blocos[2]).toMatchObject({
      bloco: 'seccao',
      titulo: 'ERP',
      condicao: { pergunta: 1, valor: 'Sim' },
    });
    const r = normalizar(lida.rascunho, {
      base: specInicial('pt'),
      reservadas: SEM_RESERVADAS,
      modo: 'substituir',
    });
    if (!r.ok) throw new Error(r.motivo);
    // A secção já tinha condição própria: o salto vai pergunta a pergunta.
    expect(r.spec.perguntas[2]!.mostrarSe).toMatchObject({ op: 'igual' });
    expect(r.spec.perguntas[3]!.mostrarSe).toMatchObject({ op: 'diferente' });
  });
});

describe('o servidor aplica a mesma ramificação', () => {
  it('recusa resposta a uma pergunta dentro de uma secção escondida', async () => {
    const { validarResposta } = await import('./respostas');
    const r = validarResposta(SPEC, { respostas: { usa: 'o2', qual: 'SAP' } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros).toContainEqual({ chave: 'qual', codigo: 'oculta' });
    const certo = validarResposta(SPEC, { respostas: { usa: 'o1', qual: 'SAP' } });
    expect(certo.ok).toBe(true);
  });
});

// ── Revisão ECC (code-reviewer) do Lote T ───────────────────────────────────

const doTexto = (t: string) => {
  const r = normalizar(analisarTexto(t), {
    base: specInicial('pt'),
    reservadas: SEM_RESERVADAS,
    modo: 'substituir',
  });
  if (!r.ok) throw new Error(r.motivo);
  return r;
};
const chaveDe = (spec: SpecInquerito, titulo: string) =>
  spec.perguntas.find((p) => p.titulo === titulo)!.chave;

describe('saltos encadeados (o padrão do Forms)', () => {
  const r = doTexto(`Teste
Secção 1: A
1. Q0? (Sim/Não)
Se Não, passe para a Secção 3
Secção 2: B
2. Q1? (Sim/Não)
Se Sim, passe para a Secção 4
3. Q1b?
Secção 3: C
4. Q2?
Secção 4: D
5. Q3?`);
  const q0 = chaveDe(r.spec, 'Q0?');

  it('um salto que nunca disparou (pergunta escondida) não esconde o destino de outro', () => {
    const titulos = visiveis(r.spec, { [q0]: 'o2' }).map((p) => p.titulo);
    expect(titulos).toEqual(['A', 'Q0?', 'C', 'Q2?', 'D', 'Q3?']);
  });

  it('o servidor aceita a resposta na secção de destino', async () => {
    const { validarResposta } = await import('./respostas');
    const v = validarResposta(r.spec, {
      respostas: { [q0]: 'o2', [chaveDe(r.spec, 'Q2?')]: 'x' },
    });
    expect(v.ok).toBe(true);
  });

  it('com «Sim» em Q0, o salto de Q1 continua a funcionar', () => {
    const q1 = chaveDe(r.spec, 'Q1?');
    const titulos = visiveis(r.spec, { [q0]: 'o1', [q1]: 'o1' }).map((p) => p.titulo);
    expect(titulos).toEqual(['A', 'Q0?', 'B', 'Q1?', 'D', 'Q3?']);
  });
});

describe('cada opção para uma secção diferente', () => {
  const r = doTexto(`Rotas
1. Qual área?
a) Vendas → Secção 2
b) Compras → Secção 3
c) Outra → Secção 4
Secção 2: Vendas
2. Quanto vende?
Secção 3: Compras
3. Quanto compra?
Secção 4: Outra
4. Qual?`);
  const area = chaveDe(r.spec, 'Qual área?');

  it('não deixa um cartão de secção vazio à vista', () => {
    expect(visiveis(r.spec, { [area]: 'o3' }).map((p) => p.titulo)).toEqual([
      'Qual área?',
      'Outra',
      'Qual?',
    ]);
  });

  it('uma secção sem perguntas por desenho (declaração) continua à vista', () => {
    const spec = {
      ...specInicial('pt'),
      perguntas: [
        { tipo: 'seccao', chave: 'decl', titulo: 'Declaração' },
        { tipo: 'seccao', chave: 's2', titulo: 'Perguntas' },
        { tipo: 'texto_curto', chave: 'q', titulo: 'Q', obrigatoria: false, max: 200 },
      ],
    } as unknown as SpecInquerito;
    expect(chaves(visiveis(spec, {}))).toEqual(['decl', 's2', 'q']);
  });
});

describe('opções que parecem saltos mas são rótulos', () => {
  it.each([
    'Residência - Bloco 3',
    'Material (Parte 2)',
    'Trimestre - Q1',
    'Satisfeito: final',
    'Outro: end',
    'Nenhum - fim',
    'Não sei: P2',
  ])('«%s» fica como está', (texto) => {
    expect(separarSaltoDeOpcao(texto)).toEqual({ rotulo: texto });
  });

  it('com verbo ou destino claro continua a ser salto', () => {
    expect(separarSaltoDeOpcao('Não - passe para a P10').salto).toMatchObject({
      alvo: 'pergunta',
      numero: '10',
    });
    expect(separarSaltoDeOpcao('Não: Secção 3').salto).toMatchObject({
      alvo: 'seccao',
      numero: '3',
    });
  });
});

describe('texto hostil não bloqueia o servidor', () => {
  it.each([' ', ' ', '　', ' '])('espaços «%s» em corrida', (esp) => {
    const inicio = performance.now();
    expect(lerSalto(`Se${esp.repeat(5000)}x`)).toBeNull();
    separarSaltoDeOpcao(`a -${esp.repeat(5000)}p`);
    analisarTexto(`1. Pergunta?\nSe${esp.repeat(2000)}x`);
    expect(performance.now() - inicio).toBeLessThan(500);
  });
});

describe('condição do Kimi com regra desconhecida', () => {
  it('cai inteira em vez de virar «igual» (que inverteria o salto)', async () => {
    const { rascunhoImportado } = await import('./importar/esquema');
    const r = rascunhoImportado.parse({
      blocos: [
        { bloco: 'pergunta', titulo: 'A?', tipo: 'escolha_unica', opcoes: ['Sim', 'Não'] },
        {
          bloco: 'pergunta',
          titulo: 'B?',
          condicao: { pergunta: 1, valor: 'Não', op: 'nao_for' },
        },
      ],
    });
    expect((r.blocos[1] as { condicao?: unknown }).condicao).toBeUndefined();
  });
});
