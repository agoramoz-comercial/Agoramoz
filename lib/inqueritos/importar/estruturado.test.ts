import { describe, expect, it, vi } from 'vitest';
import { SEM_RESERVADAS } from '../construtor';
import type { ImportadorIA } from '../ia';
import { specInicial, type Pergunta } from '../spec';
import { rascunhoImportado, type PerguntaImportada } from './esquema';
import { analisarEstruturado, lerOpcoes, lerSimNao, lerTipo } from './estruturado';
import { analisarTexto } from './local';
import { importarTexto } from './servidor';

/** O formato com campos, como o fundador o escreve para descrever um inquérito. */
const FICHA = `Título: Avaliação de Satisfação 2026
Introdução: Obrigado por dedicar 3 minutos.

Secção 1: Perfil
Texto da secção: Responda pensando na sua organização.

Pergunta 1: Em que sector opera a sua organização?
Tipo: Escolha única
Obrigatória: Sim
Opções: Energia; Agricultura; Banca e seguros; Outro

Pergunta 2: Que serviços já utilizou?
Tipo: Caixas de verificação
Obrigatória: Não
Subtítulo: Escolha todas as que se aplicam.
Opções:
- Websites
- Automação
- Agentes de IA

Secção 2: Experiência
Pergunta 3: Como avalia o atendimento?
Tipo: Escala linear 1 a 5
Obrigatória: Sim

Pergunta 4: Tem contrato de manutenção?
Tipo: Sim/Não
Obrigatória: S

Pergunta 5: Qual o valor mensal do contrato?
Tipo: Número
Mín: 0
Máx: 100000
Condição: P4 = Sim

Pergunta 6: Quando terminou o último projecto?
Tipo: Data

Pergunta 7: Recomendaria a AGORAMOZ?
Tipo: NPS

Pergunta 8: O que podíamos fazer melhor?
Tipo: Parágrafo
Obrigatória: Não

Agradecimento: Obrigado! A equipa lê todas as respostas.`;

const perguntasDe = (r: { blocos: readonly unknown[] }) =>
  r.blocos.filter(
    (b): b is PerguntaImportada & { bloco: 'pergunta' } => (b as { bloco: string }).bloco === 'pergunta',
  );

describe('ficha com campos', () => {
  const lida = analisarEstruturado(FICHA)!;
  const r = lida.rascunho;
  const ps = perguntasDe(r);

  it('é reconhecida como ficha e cumpre o contrato', () => {
    expect(lida.formato).toBe('ficha');
    expect(rascunhoImportado.safeParse(r).success).toBe(true);
  });

  it('título, introdução, agradecimento e secções com o seu texto', () => {
    expect(r).toMatchObject({
      titulo: 'Avaliação de Satisfação 2026',
      introducao: 'Obrigado por dedicar 3 minutos.',
      agradecimento: 'Obrigado! A equipa lê todas as respostas.',
    });
    expect(r.blocos.filter((b) => b.bloco === 'seccao')).toEqual([
      { bloco: 'seccao', titulo: 'Perfil', texto: 'Responda pensando na sua organização.' },
      { bloco: 'seccao', titulo: 'Experiência' },
    ]);
  });

  it('cada tipo é o declarado — e diz de onde veio', () => {
    expect(ps.map((p) => p.tipo)).toEqual([
      'escolha_unica',
      'escolha_multipla',
      'avaliacao',
      'escolha_unica',
      'numero',
      'data',
      'nps',
      'texto_longo',
    ]);
    expect(ps[0]!.razao).toBe('Tipo indicado no texto: «Escolha única».');
    expect(ps[1]!.razao).toBe('Tipo indicado no texto: «Caixas de verificação».');
  });

  it('obrigatoriedade, subtítulo e opções (na linha ou em lista)', () => {
    expect(ps.map((p) => p.obrigatoria)).toEqual([
      true,
      false,
      true,
      true,
      undefined,
      undefined,
      undefined,
      false,
    ]);
    expect(ps[0]!.opcoes).toEqual(['Energia', 'Agricultura', 'Banca e seguros', 'Outro']);
    expect(ps[1]!.opcoes).toEqual(['Websites', 'Automação', 'Agentes de IA']);
    expect(ps[1]!.ajuda).toBe('Escolha todas as que se aplicam.');
    expect(ps[3]!.opcoes).toEqual(['Sim', 'Não']);
  });

  it('mínimo, máximo e condição pelo número da pergunta', () => {
    expect(ps[4]).toMatchObject({ min: 0, max: 100000, condicao: { pergunta: 4, valor: 'Sim' } });
  });

  it('chega ao inquérito final configurado, mesmo pedindo o Kimi (que nem é chamado)', async () => {
    const estruturar = vi.fn<ImportadorIA['estruturar']>();
    const res = await importarTexto(
      {
        texto: FICHA,
        motor: 'kimi',
        modo: 'substituir',
        base: specInicial('pt'),
        reservadas: SEM_RESERVADAS,
      },
      { kimi: { modelo: 'kimi-k2.6', estruturar } },
    );
    expect(estruturar).not.toHaveBeenCalled();
    expect(res).toMatchObject({ ok: true, motor: 'local', formato: 'ficha' });
    if (!res.ok) return;
    expect(res.resumo).toMatchObject({ perguntas: 8, seccoes: 2, obrigatorias: 3, condicoes: 1 });
    const valor = res.spec.perguntas.find(
      (p) => p.titulo === 'Qual o valor mensal do contrato?',
    ) as Pergunta;
    expect(valor.mostrarSe?.op).toBe('igual');
    expect(res.spec.boasVindas.titulo).toBe('Avaliação de Satisfação 2026');
  });
});

describe('tabela', () => {
  const PIPE = `Inquérito de Clima 2026
| Nº | Secção | Pergunta | Tipo | Obrigatória | Opções | Subtítulo |
|---|---|---|---|---|---|---|
| 1 | Equipa | Quantas pessoas tem a equipa? | Número inteiro | Sim | | |
| 2 | Equipa | Como avalia a comunicação? | Avaliação | Sim | | De 1 (má) a 5 (excelente) |
| 3 | Ferramentas | Que ferramentas usa? | Escolha múltipla | Não | Excel; ERP; CRM | |
| 4 | Ferramentas | Comentários | Texto longo | Não | | |
Obrigado pela participação.`;

  it('lê as colunas pelo cabeçalho; secções quando a coluna muda', () => {
    const lida = analisarEstruturado(PIPE)!;
    expect(lida.formato).toBe('tabela');
    const r = lida.rascunho;
    expect(r.titulo).toBe('Inquérito de Clima 2026');
    expect(r.agradecimento).toBe('Obrigado pela participação.');
    expect(r.blocos.map((b) => (b.bloco === 'seccao' ? `# ${b.titulo}` : b.tipo))).toEqual([
      '# Equipa',
      'numero',
      'avaliacao',
      '# Ferramentas',
      'escolha_multipla',
      'texto_longo',
    ]);
    const ps = perguntasDe(r);
    expect(ps[0]).toMatchObject({ obrigatoria: true, inteiro: true });
    expect(ps[1]!.ajuda).toBe('De 1 (má) a 5 (excelente)');
    expect(ps[2]!.opcoes).toEqual(['Excel', 'ERP', 'CRM']);
  });

  it('também colada do Word ou do Excel, com tabulações', () => {
    const TAB = [
      'Pergunta\tTipo\tObrigatória\tOpções',
      'Usa ERP?\tSim/Não\tSim\t',
      'Qual?\tTexto curto\tNão\t',
    ].join('\n');
    const lida = analisarEstruturado(TAB)!;
    expect(lida.formato).toBe('tabela');
    expect(perguntasDe(lida.rascunho).map((p) => [p.tipo, p.obrigatoria, p.opcoes])).toEqual([
      ['escolha_unica', true, ['Sim', 'Não']],
      ['texto_curto', false, undefined],
    ]);
  });
});

describe('o que NÃO é estrutura declarada fica para o analisador livre', () => {
  it.each([
    ['numerado do Word', '1. Usa um ERP?\na) Sim\nb) Não\n2. Qual?'],
    ['com uma nota solta', 'Nota: responda com calma\n1. Usa um ERP? (Sim/Não)'],
    ['chat', 'Usou o parque? Sim / Não\nO que mudaria?'],
  ])('%s → null', (_n, texto) => {
    expect(analisarEstruturado(texto)).toBeNull();
  });
});

describe('vocabulário', () => {
  it.each([
    ['Escolha única', 'escolha_unica'],
    ['Lista pendente', 'escolha_unica'],
    ['Dropdown', 'escolha_unica'],
    ['Multiple choice', 'escolha_unica'],
    ['Escolha múltipla', 'escolha_multipla'],
    ['Caixas de verificação', 'escolha_multipla'],
    ['Checkbox', 'escolha_multipla'],
    ['Avaliação (1 a 5)', 'avaliacao'],
    ['Estrelas', 'avaliacao'],
    ['Escala linear 0-10', 'nps'],
    ['NPS (0 a 10)', 'nps'],
    ['Número', 'numero'],
    ['Data', 'data'],
    ['Resposta curta', 'texto_curto'],
    ['Texto curto', 'texto_curto'],
    ['Parágrafo', 'texto_longo'],
    ['Texto longo', 'texto_longo'],
    ['Secção (só texto)', 'seccao'],
  ])('«%s» → %s', (dito, tipo) => {
    expect(lerTipo(dito)?.tipo).toBe(tipo);
  });

  it('escala de outro intervalo fica número com mínimo e máximo', () => {
    expect(lerTipo('Escala 1 a 7')).toMatchObject({ tipo: 'numero', min: 1, max: 7 });
  });

  it.each([
    ['Sim', true],
    ['S', true],
    ['X', true],
    ['Obrigatória', true],
    ['Não', false],
    ['Opcional', false],
    ['-', false],
    ['', undefined],
  ])('obrigatória «%s» → %s', (v, esperado) => {
    expect(lerSimNao(v)).toBe(esperado);
  });

  it('opções por «;», «|», «/» ou vírgulas curtas — uma frase com vírgulas é uma só', () => {
    expect(lerOpcoes('A; B; C')).toEqual(['A', 'B', 'C']);
    expect(lerOpcoes('Sim | Não')).toEqual(['Sim', 'Não']);
    expect(lerOpcoes('Sim / Não / Talvez')).toEqual(['Sim', 'Não', 'Talvez']);
    expect(lerOpcoes('Energia, Banca, Outro')).toEqual(['Energia', 'Banca', 'Outro']);
    expect(lerOpcoes('Sim, mas só quando a equipa tem tempo e orçamento disponível')).toHaveLength(1);
  });
});

describe('marcas de lista do Word', () => {
  it('«\\uF0B7» e «o» seguido de tabulação são marcas de opção', () => {
    const texto = '1. Qual o sector?\n\tEnergia\n\tBanca\no\tOutro';
    const p = perguntasDe(analisarTexto(texto))[0]!;
    expect(p.opcoes).toEqual(['Energia', 'Banca', 'Outro']);
    expect(p.tipo).toBe('escolha_unica');
  });
});

describe('Microsoft Forms e Typeform — vocabulário', () => {
  it('Likert com afirmações em lista: uma pergunta por afirmação, com a escala', () => {
    const lida = analisarEstruturado(`Pergunta 1: Como avalia a nossa equipa?
Tipo: Likert
Obrigatória: Sim
Afirmações:
- Responde a tempo
- Explica com clareza
- Cumpre prazos
Pergunta 2: Recomendaria?
Tipo: NPS
Condição: P1 = Concordo`)!;
    const ps = perguntasDe(lida.rascunho);
    expect(ps.map((p) => p.titulo)).toEqual([
      'Responde a tempo',
      'Explica com clareza',
      'Cumpre prazos',
      'Recomendaria?',
    ]);
    expect(ps[0]).toMatchObject({
      tipo: 'escolha_unica',
      obrigatoria: true,
      ajuda: 'Como avalia a nossa equipa?',
      opcoes: ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'],
    });
    expect(ps[0]!.razao).toMatch(/uma pergunta por afirmação/);
    // A condição «P1» aponta para a primeira afirmação, e a NPS continua a ser a 4.ª pergunta.
    expect(ps[3]!.condicao).toEqual({ pergunta: 1, valor: 'Concordo' });
  });

  it('grelha numa tabela, com as colunas como opções', () => {
    const lida = analisarEstruturado(
      [
        '| Pergunta | Tipo | Afirmações | Opções |',
        '|---|---|---|---|',
        '| Satisfação com | Grelha | Preço; Prazo | Má; Boa; Óptima |',
      ].join('\n'),
    )!;
    const ps = perguntasDe(lida.rascunho);
    expect(ps.map((p) => [p.titulo, p.opcoes])).toEqual([
      ['Preço', ['Má', 'Boa', 'Óptima']],
      ['Prazo', ['Má', 'Boa', 'Óptima']],
    ]);
  });

  it.each([
    ['Declaração', 'seccao', undefined],
    ['Statement', 'seccao', undefined],
    ['Ranking', 'escolha_multipla', /ordenação ainda não existe/],
    ['Carregar ficheiro', 'texto_curto', /ficheiros ainda não existe/],
    ['Hora', 'texto_curto', /hora/],
    ['Escala de opinião 1-7', 'numero', undefined],
    ['Opinion scale 0-10', 'nps', undefined],
  ])('«%s» → %s', (dito, tipo, nota) => {
    const t = lerTipo(dito)!;
    expect(t.tipo).toBe(tipo);
    if (nota) expect(t.nota).toMatch(nota);
  });

  it('Legal fica Aceito / Não aceito, e a nota explica o tipo que não existe', () => {
    const lida = analisarEstruturado(`Pergunta 1: Aceita os termos?
Tipo: Legal
Obrigatória: Sim
Pergunta 2: Ordene as prioridades
Tipo: Ranking
Opções: Preço; Prazo; Qualidade`)!;
    const ps = perguntasDe(lida.rascunho);
    expect(ps[0]).toMatchObject({ tipo: 'escolha_unica', opcoes: ['Aceito', 'Não aceito'] });
    expect(ps[1]!.razao).toBe(
      'Tipo indicado no texto: «Ranking». A ordenação ainda não existe: ficou escolha múltipla (as mais importantes).',
    );
  });
});

describe('Likert sem afirmações (revisão ECC)', () => {
  it('«Escala Likert 1-5» é uma avaliação, não uma escala de concordância', () => {
    const lida = analisarEstruturado(
      'Pergunta 1: Quão satisfeito está?\nTipo: Escala Likert 1-5\nObrigatória: Sim',
    )!;
    expect(lida.rascunho.blocos).toHaveLength(1);
    expect(lida.rascunho.blocos[0]).toMatchObject({ bloco: 'pergunta', tipo: 'avaliacao' });
  });

  it('com afirmações e «1-5», as colunas são 1 a 5', () => {
    const lida = analisarEstruturado(
      'Pergunta 1: Avalie\nTipo: Likert 1-5\nObrigatória: Sim\nAfirmações:\n- Preço\n- Prazo',
    )!;
    const blocos = lida.rascunho.blocos;
    expect(blocos).toHaveLength(2);
    expect(blocos[0]).toMatchObject({ titulo: 'Preço', opcoes: ['1', '2', '3', '4', '5'] });
  });
});
