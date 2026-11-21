import { describe, expect, it } from 'vitest';
import { cursoSchema, duracao, minutosDoCurso, slugDe } from './modelo';
import { criarFonte, indicePassagens, indiceParaPlanear, partirEmPassagens } from './fontes';
import { normalizar, numeros, suporte, verificarBloco, verificarPergunta, verificarResultado, descreverFalhas } from './verificar';
import { escreverAula, montarCurso, planear, sugerirTema, type Motor, type PedidoCurso } from './ciclo';
import { promptAula, promptPlano, promptTema } from './prompts';
import { gerarTema } from './gerar';

// Texto de exemplo escrito para os testes (não é uma fonte real).
const TEXTO = `# Gestão de stock

O inventário periódico conta todos os artigos do armazém no fim de cada mês. A contagem compara o stock físico com o registo do sistema.

Quando a diferença ultrapassa 2% do valor do stock, o responsável abre uma ocorrência e investiga a causa.

O método FIFO determina que os artigos que entram primeiro saem primeiro. Este método reduz perdas de produtos perecíveis.

- Receber a mercadoria e conferir a guia de remessa.
- Registar a entrada no sistema no mesmo dia.
- Arrumar os artigos novos atrás dos antigos.

Em 2024 a empresa reduziu as quebras para 1 250 unidades por ano.`;

// Passagens curtas (200) para cada ideia ficar na sua passagem.
const fonte = { ...criarFonte(1, 'Manual de armazém (exemplo)', 'texto', TEXTO), passagens: partirEmPassagens(TEXTO, 'F1', 200) };
const fontes = [fonte];
const passagens = indicePassagens(fontes);
const pedido: PedidoCurso = {
  titulo: 'Gestão de stock no armazém',
  tema: 'Contar, receber e arrumar o stock.',
  publico: 'Responsáveis de armazém', nivel: 'iniciacao', minutos: 60 };

describe('fontes em passagens', () => {
  it('numera e não perde texto', () => {
    expect(fonte.passagens.length).toBeGreaterThan(0);
    expect(fonte.passagens[0]!.id).toBe('F1.1');
    const tudo = normalizar(fonte.passagens.map((p) => p.texto).join(' '));
    expect(tudo).toContain(normalizar('Arrumar os artigos novos atrás dos antigos'));
    expect(tudo).toContain('1 250 unidades');
  });
  it('respeita o tamanho máximo e parte parágrafos enormes por frases', () => {
    const grande = Array.from({ length: 60 }, (_, i) => `Frase número ${i} sobre armazéns e stock.`).join(' ');
    const ps = partirEmPassagens(grande, 'F2', 300);
    expect(ps.length).toBeGreaterThan(5);
    for (const p of ps) expect(p.texto.length).toBeLessThanOrEqual(300);
    expect(ps.every((p) => /\.$/.test(p.texto))).toBe(true);
  });
  it('é estável e junta parágrafos curtos', () => {
    expect(partirEmPassagens(TEXTO, 'F1', 200)).toEqual(fonte.passagens);
    expect(criarFonte(1, 'x', 'texto', TEXTO).passagens).toHaveLength(1);
  });
  it('o índice para planear leva ids e corta no tecto', () => {
    const i = indiceParaPlanear(fontes);
    expect(i).toContain('[F1.1]');
    expect(indiceParaPlanear(fontes, 50)).toContain('cortado');
  });
});

describe('números', () => {
  it('lê milhares, decimais e percentagens', () => {
    expect(numeros('1 250 unidades, 2% e 12,5% em 2024').map((n) => [n.valor, n.pct])).toEqual([
      [1250, false],
      [2, true],
      [12.5, true],
      [2024, false],
    ]);
    expect(numeros('1.735.000 MZN')[0]!.valor).toBe(1735000);
  });
});

const id = (txt: string) => [...passagens].find(([, t]) => t.includes(txt))![0];
const P_FIFO = id('FIFO');
const P_DIF = id('2%');
const P_2024 = id('2024');

describe('verificador', () => {
  const ctx = { passagens };
  it('aceita uma paráfrase fiel', () => {
    expect(
      verificarBloco(
        {
          tipo: 'explicacao',
          texto: 'No método FIFO, os artigos que entram primeiro saem primeiro, o que reduz perdas de perecíveis.',
          fontes: [P_FIFO],
        },
        ctx,
      ),
    ).toEqual([]);
  });
  it('recusa passagens que não existem ou que não são da aula', () => {
    expect(verificarBloco({ tipo: 'explicacao', texto: 'FIFO', fontes: ['F9.9'] }, ctx)[0]!.motivo).toBe('passagem_inexistente');
    const f = verificarBloco(
      { tipo: 'explicacao', texto: 'Os artigos que entram primeiro saem primeiro.', fontes: [P_FIFO] },
      { passagens, permitidas: new Set(['F1.1']) },
    );
    expect(f.map((x) => x.motivo)).toContain('passagem_fora_da_aula');
  });
  it('recusa números que não estão na fonte (mas tolera estrutura até 10)', () => {
    const f = verificarBloco(
      { tipo: 'explicacao', texto: 'Quando a diferença ultrapassa 5% do valor do stock, abre-se uma ocorrência.', fontes: [P_DIF] },
      ctx,
    );
    expect(f.map((x) => x.motivo)).toEqual(['numero_sem_fonte']);
    expect(
      verificarBloco(
        { tipo: 'explicacao', texto: 'Quando a diferença ultrapassa 2% do valor do stock, abre-se uma ocorrência.', fontes: [P_DIF] },
        ctx,
      ),
    ).toEqual([]);
    expect(
      verificarBloco({ tipo: 'explicacao', texto: 'Em 2024 a empresa reduziu as quebras para 1 250 unidades.', fontes: [P_2024] }, ctx),
    ).toEqual([]);
    expect(verificarBloco({ tipo: 'explicacao', texto: 'Em 2023 a empresa reduziu as quebras.', fontes: [P_2024] }, ctx)[0]!.motivo).toBe(
      'numero_sem_fonte',
    );
  });
  it('recusa ideias que não estão na fonte', () => {
    const f = verificarBloco(
      { tipo: 'explicacao', texto: 'Recomenda-se contratar seguradoras internacionais com cobertura cambial.', fontes: [P_FIFO] },
      ctx,
    );
    expect(f.map((x) => x.motivo)).toEqual(['suporte_fraco']);
  });
  it('citação tem de ser literal (acentos e maiúsculas não contam)', () => {
    const base = { tipo: 'citacao' as const, texto: 'O princípio do FIFO: primeiro a entrar, primeiro a sair.', fontes: [P_FIFO] };
    expect(verificarBloco({ ...base, citacao: 'os artigos que entram primeiro saem primeiro' }, ctx)).toEqual([]);
    expect(verificarBloco({ ...base, citacao: 'os artigos que entram antes saem antes' }, ctx).map((x) => x.motivo)).toContain(
      'citacao_nao_literal',
    );
    expect(verificarBloco(base, ctx).map((x) => x.motivo)).toContain('citacao_nao_literal');
  });
  it('perguntas: opções distintas e resposta com apoio', () => {
    const p = {
      enunciado: 'O que determina o método FIFO?',
      opcoes: [
        'Os artigos que entram primeiro saem primeiro',
        'Os últimos saem primeiro',
        'Conta-se o stock todos os dias',
        'Não se regista nada',
      ],
      correcta: 0,
      justificacao: 'O método FIFO determina que os artigos que entram primeiro saem primeiro.',
      fontes: [P_FIFO],
    };
    expect(verificarPergunta(p, ctx)).toEqual([]);
    expect(verificarPergunta({ ...p, opcoes: ['A', 'a', 'B', 'C'] }, ctx).map((x) => x.motivo)).toContain('opcoes_repetidas');
  });
  it('resultados e descrição legível das falhas', () => {
    expect(verificarResultado({ texto: 'Aplicar o método FIFO para reduzir perdas de perecíveis.', fontes: [P_FIFO] }, ctx)).toEqual([]);
    const d = descreverFalhas([{ onde: 'bloco 2', motivo: 'numero_sem_fonte', detalhe: '5%' }]);
    expect(d[0]).toBe('bloco 2: tem um número que não está nas passagens citadas (5%).');
  });
  it('suporte é 1 sem palavras de conteúdo', () => {
    expect(suporte('e a o', 'qualquer')).toBe(1);
  });
});

/* -------------------------------------------------------- ciclo com motor falso */

const planoBom = {
  titulo: 'Gestão de stock no armazém',
  subtitulo: 'Inventário, FIFO e recepção',
  prerequisitos: [],
  resultados: [
    { texto: 'Aplicar o método FIFO para reduzir perdas de perecíveis.', fontes: [P_FIFO] },
    { texto: 'Dominar técnicas avançadas de blockchain logística.', fontes: [P_FIFO] },
  ],
  modulos: [
    {
      titulo: 'Controlo do stock',
      resumo: 'Inventário e método FIFO.',
      aulas: [
        {
          titulo: 'FIFO e inventário',
          objectivo: 'Perceber o FIFO e o inventário periódico.',
          minutos: 30,
          passagens: [P_FIFO, P_DIF, 'F9.9'],
        },
      ],
    },
  ],
};

const aulaMa = {
  blocos: [{ tipo: 'explicacao', texto: 'Quando a diferença ultrapassa 5% do valor do stock, abre-se uma ocorrência.', fontes: [P_DIF] }],
  perguntas: [],
};
const aulaBoa = {
  blocos: [
    {
      tipo: 'explicacao',
      texto: 'Quando a diferença ultrapassa 2% do valor do stock, o responsável abre uma ocorrência e investiga a causa.',
      fontes: [P_DIF],
      itens: null,
    },
    {
      tipo: 'explicacao',
      texto: 'O método FIFO: os artigos que entram primeiro saem primeiro, o que reduz perdas de perecíveis.',
      fontes: [P_FIFO],
      extra: 'ignorado',
    },
    { tipo: 'exemplo', texto: 'Uma ideia sem qualquer apoio: comprar drones para o armazém.', fontes: [P_FIFO] },
  ],
  perguntas: [
    {
      enunciado: 'Quando se abre uma ocorrência?',
      opcoes: ['Quando a diferença ultrapassa 2% do valor do stock', 'Todos os dias', 'Nunca', 'Quando chove'],
      correcta: 0,
      justificacao: 'A diferença acima de 2% do valor do stock leva o responsável a abrir uma ocorrência.',
      fontes: [P_DIF],
    },
  ],
};

describe('ciclo', () => {
  it('plano: retira resultados sem apoio e passagens inexistentes', async () => {
    const motor: Motor = async () => planoBom;
    const p = await planear(motor, pedido, fontes);
    expect(p.valor!.resultados).toHaveLength(1);
    expect(p.valor!.modulos[0]!.aulas[0]!.passagens).toEqual([P_FIFO, P_DIF]);
    expect(p.retirados).toBe(1);
    expect(p.tentativas).toBe(3); // tentou corrigir até ao máximo
  });

  it('aula: devolve as falhas ao motor e fica com a melhor tentativa', async () => {
    const plano = (await planear(async () => planoBom, pedido, fontes, 1)).valor!;
    const prompts: string[] = [];
    let n = 0;
    const motor: Motor = async ({ prompt }) => {
      prompts.push(prompt);
      n += 1;
      if (n === 1) throw new Error('motor em baixo');
      return n === 2 ? aulaMa : aulaBoa;
    };
    const a = await escreverAula(motor, { pedido, plano, modulo: 0, aula: 0 }, fontes);
    expect(a.tentativas).toBe(3);
    expect(prompts[2]).toContain('REJEITADA');
    expect(prompts[2]).toContain('5%');
    expect(a.valor!.blocos).toHaveLength(2);
    expect(a.valor!.perguntas).toHaveLength(1);
    expect(a.retirados).toBe(1);
    expect(a.valor!.passagens).toEqual([P_FIFO, P_DIF]);
  });

  it('pára à primeira quando tudo passa', async () => {
    const plano = (await planear(async () => planoBom, pedido, fontes, 1)).valor!;
    const limpa = { ...aulaBoa, blocos: aulaBoa.blocos.slice(0, 2) };
    let n = 0;
    const a = await escreverAula(async () => (n++, limpa), { pedido, plano, modulo: 0, aula: 0 }, fontes);
    expect(n).toBe(1);
    expect(a.falhas).toEqual([]);
  });

  it('motor em baixo: a falha diz que foi o motor, não as fontes', async () => {
    const motor: Motor = async () => {
      throw new Error('O motor está indisponível neste momento. (O ZabaEdu respondeu 500: …)');
    };
    const p = await planear(motor, pedido, fontes);
    expect(p.valor).toBeNull();
    expect(p.falhas[0]).toMatchObject({ onde: 'motor', motivo: 'motor_falhou' });
    const texto = descreverFalhas(p.falhas)[0]!;
    expect(texto).toMatch(/o motor \(ZabaEdu\) não deu resposta .*respondeu 500/);
    expect(texto).not.toMatch(/passagens citadas não dizem/);
  });

    it('forma inválida conta como falha, não rebenta', async () => {
    const p = await planear(async () => ({ nada: true }), pedido, fontes, 2);
    expect(p.valor).toBeNull();
    expect(p.tentativas).toBe(2);
  });

  it('monta um curso válido com o relatório de verificação', async () => {
    const plano = await planear(async () => planoBom, pedido, fontes, 1);
    const aula = await escreverAula(async () => aulaBoa, { pedido, plano: plano.valor!, modulo: 0, aula: 0 }, fontes, 1);
    const c = montarCurso(pedido, fontes, { plano, aulas: [{ modulo: 0, aula: 0, peca: aula }] }, new Date('2026-11-17T10:00:00Z'))!;
    expect(cursoSchema.safeParse(c).success).toBe(true);
    expect(c.slug).toBe('gestao-de-stock-no-armazem');
    expect(c.verificacao.retirados).toBe(2);
    expect(c.verificacao.notas.join(' ')).toMatch(/retirad/);
    expect(c.fontes).toEqual([{ id: 'F1', titulo: 'Manual de armazém (exemplo)', tipo: 'texto' }]);
    expect(montarCurso(pedido, fontes, { plano, aulas: [] })).toBeNull();
  });
});

describe('contas', () => {
  it('duração e slug', () => {
    expect(duracao(45)).toBe('45 min');
    expect(duracao(270)).toBe('4 h 30 min');
    expect(duracao(120)).toBe('2 h');
    expect(slugDe('Introdução à Gestão — 2.ª edição!')).toBe('introducao-a-gestao-2-edicao');
    expect(minutosDoCurso({ modulos: [] })).toBe(0);
  });
});

it('as passagens do exemplo são distintas', () => {
  expect(new Set([P_FIFO, P_DIF, P_2024]).size).toBe(3);
});

describe('ponta a ponta com o motor simulado', async () => {
  const { responderSimulado } = await import('./simulado');
  const texto = [
    'O inventário periódico conta todos os artigos do armazém no fim de cada mês, comparando o stock físico com o registo do sistema.',
    'Quando a diferença ultrapassa 2% do valor do stock, o responsável abre uma ocorrência e investiga a causa da diferença.',
    'O método FIFO determina que os artigos que entram primeiro saem primeiro, o que reduz perdas de produtos perecíveis.',
    'Na recepção, a mercadoria é conferida contra a guia de remessa e a entrada é registada no sistema no mesmo dia.',
    'Os artigos novos são arrumados atrás dos antigos, para que o método FIFO se cumpra sem esforço adicional.',
    'Em 2024 a empresa reduziu as quebras para 1 250 unidades por ano, depois de adoptar a contagem mensal.',
  ].join('\n\n');
  const fs = [{ ...criarFonte(1, 'Manual (exemplo)', 'texto', texto), passagens: partirEmPassagens(texto, 'F1', 160) }];
  const motor: Motor = async (p) => responderSimulado(p);

  it('o ciclo apanha os erros da 1.ª tentativa e monta um curso válido', async () => {
    const plano = await planear(motor, pedido, fs);
    expect(plano.tentativas).toBe(2);
    expect(plano.falhas).toEqual([]);
    const aulas = [];
    for (const [mi, m] of plano.valor!.modulos.entries())
      for (const ai of m.aulas.keys())
        aulas.push({ modulo: mi, aula: ai, peca: await escreverAula(motor, { pedido, plano: plano.valor!, modulo: mi, aula: ai }, fs) });
    for (const a of aulas) {
      expect(a.peca.tentativas).toBe(2);
      expect(a.peca.falhas).toEqual([]);
    }
    const c = montarCurso(pedido, fs, { plano, aulas })!;
    expect(cursoSchema.safeParse(c).success).toBe(true);
    expect(c.verificacao.retirados).toBe(0);
    expect(c.verificacao.tentativas).toBe(2 + 2 * aulas.length);
    // O motor propôs outro título na 1.ª tentativa: fica o da equipa.
    expect(c.titulo).toBe(pedido.titulo);
    expect(c.slug).toBe('gestao-de-stock-no-armazem');
  });

  it('tema: a IA escreve-o do título e das fontes; o número inventado é apanhado', async () => {
    const t = await sugerirTema(motor, { titulo: pedido.titulo, publico: '', nivel: 'iniciacao', minutos: 60 }, fs);
    expect(t.tentativas).toBe(2);
    expect(t.falhas).toEqual([]);
    expect(t.valor).toContain('«Gestão de stock no armazém»');
    expect(t.valor).not.toMatch(/1987|4 321/);
  });
});

describe('título e tema', () => {
  const semTema = { titulo: pedido.titulo, publico: pedido.publico, nivel: pedido.nivel, minutos: pedido.minutos };

  it('o título fixo e o tema vão nos pedidos ao motor', () => {
    expect(promptTema(semTema, fontes, [])).toContain(`- Título do curso: ${pedido.titulo}`);
    const pp = promptPlano(pedido, fontes, []);
    expect(pp).toContain(`- Título do curso (fixo, escolhido pela equipa): ${pedido.titulo}`);
    expect(pp).toContain(`- Tema: ${pedido.tema}`);
    expect(pp).toMatch(/fica de fora/);
    const plano = { ...planoBom, titulo: 'Outro título qualquer' };
    const pa = promptAula({ pedido, plano, modulo: 0, aula: 0 }, plano.modulos[0]!.aulas[0]!, [], []);
    expect(pa).toContain(`«${pedido.titulo}»`);
    expect(pa).not.toContain('Outro título qualquer');
    expect(pa).toContain(`Tema do curso: ${pedido.tema}`);
  });

  it('o plano fica com o título do pedido, mesmo que o motor escreva outro', async () => {
    const motor: Motor = async () => ({ ...planoBom, titulo: 'Título inventado pelo motor' });
    const p = await planear(motor, pedido, fontes, 1);
    expect(p.valor!.titulo).toBe(pedido.titulo);
  });

  it('tema: número fora das fontes é recusado até ao fim; forma inválida não rebenta', async () => {
    const mau: Motor = async () => ({ tema: 'Um curso sobre stock que cobre 4 321 armazéns em todo o país.' });
    const t = await sugerirTema(mau, semTema, fontes);
    expect(t.valor).toBeNull();
    expect(t.tentativas).toBe(3);
    expect(t.falhas[0]).toMatchObject({ onde: 'tema', motivo: 'numero_sem_fonte' });
    const vazio = await sugerirTema(async () => ({ tema: '' }), semTema, fontes, 1);
    expect(vazio.valor).toBeNull();
  });

  it('tema: números das fontes e estrutura até 10 passam', async () => {
    const bom: Motor = async () => ({ tema: 'Os 3 passos do inventário e o limite de 2% de diferença no stock do armazém.' });
    const t = await sugerirTema(bom, semTema, fontes, 1);
    expect(t.valor).toMatch(/2%/);
  });

  it('gerarTema valida a entrada: sem título não chama o motor', async () => {
    let chamado = false;
    const m: Motor = async () => {
      chamado = true;
      return {};
    };
    const r = await gerarTema(m, { pedido: { ...semTema, titulo: 'x' }, fontes });
    expect(r.ok).toBe(false);
    expect(chamado).toBe(false);
    const ok = await gerarTema(async () => ({ tema: 'Contar e arrumar o stock do armazém, com o método FIFO.' }), {
      pedido: { ...semTema, publico: '' },
      fontes,
    });
    expect(ok.ok && ok.peca.valor).toBeTruthy();
  });
});
