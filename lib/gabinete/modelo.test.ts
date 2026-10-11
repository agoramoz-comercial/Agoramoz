import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  formularioAlocacao,
  formularioDecisao,
  formularioMovimento,
  formularioPrioridade,
  formularioProjeto,
  prontidaoParaGravar,
} from './formularios';
import { movimentoDe, projetoDe } from './leitura';
import {
  AREAS,
  caixaPorMoeda,
  capacidade,
  CHAPEUS,
  delegacao,
  ESTADOS_DECISAO,
  ESTADOS_PRIORIDADE,
  FASES_PROJETO,
  higieneProjetos,
  margemPercentual,
  painelCeo,
  painelCto,
  podeEntrarEm,
  previsaoPorMoeda,
  PRONTIDAO,
  receitaPorMoeda,
  riscosDe,
  somarDias,
  TIPOS_MOVIMENTO,
  TIPOS_PRIORIDADE,
  trimestreDe,
  type Decisao,
  type Movimento,
  type Pessoa,
  type Projeto,
} from './modelo';

const SQL = readFileSync('supabase/migrations/0018_gabinete.sql', 'utf-8');

/** Os valores de um `check (coluna in (...))` da 0018. */
function checkDe(coluna: string): string[] {
  const m = SQL.match(new RegExp(`\\n  ${coluna} text[^\\n]*?check \\(${coluna} in \\(([^)]*)\\)`, 's'));
  expect(m, `CHECK de ${coluna}`).not.toBeNull();
  return [...m![1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]!).sort();
}

describe('os vocabulários são os mesmos da base', () => {
  it.each([
    ['chapeu', CHAPEUS],
    ['estado', ESTADOS_DECISAO],
    ['tipo', TIPOS_PRIORIDADE],
    ['fase', FASES_PROJETO],
    ['area', AREAS],
  ] as const)('%s', (coluna, vocab) => {
    expect(checkDe(coluna)).toEqual(Object.keys(vocab).sort());
  });

  it('estados da prioridade, tipos de movimento e prontidão', () => {
    expect(SQL).toContain(`check (estado in ('em_curso', 'em_risco', 'concluida', 'abandonada'))`);
    expect(Object.keys(ESTADOS_PRIORIDADE)).toEqual(['em_curso', 'em_risco', 'concluida', 'abandonada']);
    expect(SQL).toContain(`check (tipo in ('saldo', 'recebimento', 'pagamento'))`);
    expect(Object.keys(TIPOS_MOVIMENTO)).toEqual(['saldo', 'recebimento', 'pagamento']);
    for (const c of PRONTIDAO) expect(SQL).toContain(`${c.coluna} boolean not null default false`);
  });
});

describe('datas', () => {
  it('trimestre de uma data', () => {
    expect(trimestreDe('2026-01-01')).toBe('2026-T1');
    expect(trimestreDe('2026-03-31')).toBe('2026-T1');
    expect(trimestreDe('2026-10-07')).toBe('2026-T4');
  });
  it('somar dias atravessa meses e anos', () => {
    expect(somarDias('2026-12-20', 30)).toBe('2027-01-19');
  });
});

const PRONTO = Object.fromEntries(PRONTIDAO.map((c) => [c.coluna, true])) as Projeto['prontidao'];

function projeto(p: Partial<Projeto> = {}): Projeto {
  return {
    id: 'p1',
    nome: 'Portal',
    cliente: null,
    fase: 'arquitetura',
    responsavel: 'Gerson',
    sponsor: null,
    resultado: null,
    escopo: 'Escopo',
    moeda: 'MZN',
    receita_contratada: null,
    receita_faturada: null,
    receita_recebida: null,
    custos_variaveis: null,
    margem_bruta: null,
    prontidao: { ...PRONTO, pronto_capacidade: false },
    risco: 'baixo',
    proxima_accao: 'Rever',
    proxima_data: '2026-10-10',
    ligacao: null,
    revisao: 1,
    updated_at: '2026-10-01T00:00:00Z',
    ...p,
  };
}

let seq = 0;
function mov(p: Partial<Movimento>): Movimento {
  seq += 1;
  return {
    id: `m${seq}`,
    tipo: 'recebimento',
    descricao: 'x',
    projeto_id: null,
    valor: 0,
    moeda: 'MZN',
    data_prevista: '2026-10-10',
    data_efectiva: null,
    revisao: 1,
    created_at: '2026-10-01T00:00:00Z',
    ...p,
  };
}

function decisao(p: Partial<Decisao>): Decisao {
  seq += 1;
  return {
    id: `d${seq}`,
    titulo: 'D',
    contexto: null,
    chapeu: 'ceo',
    estado: 'exige_minha',
    decisao: null,
    responsavel: 'Gerson',
    consultados: null,
    indicador: null,
    data_revisao: '2026-10-10',
    recorrente: false,
    quem_decidiu: null,
    decidida_em: null,
    revisao: 1,
    updated_at: '2026-10-01T00:00:00Z',
    ...p,
  };
}

const HOJE = '2026-10-07';

describe('projectos', () => {
  it('não entra em implementação sem os sete critérios, e diz quais faltam', () => {
    const r = podeEntrarEm('implementacao', projeto());
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('Para implementar falta: Capacidade reservada.');
    expect(podeEntrarEm('implementacao', projeto({ prontidao: PRONTO })).ok).toBe(true);
    expect(podeEntrarEm('prototipo', projeto()).ok).toBe(true);
  });

  it('margem percentual só com os dois valores', () => {
    expect(margemPercentual({ margem_bruta: 300, receita_contratada: 1000 })).toBe(0.3);
    expect(margemPercentual({ margem_bruta: null, receita_contratada: 1000 })).toBeNull();
    expect(margemPercentual({ margem_bruta: 10, receita_contratada: 0 })).toBeNull();
  });

  it('riscos: alto, acção atrasada, margem negativa; fechados não contam', () => {
    expect(riscosDe(projeto({ risco: 'alto', proxima_data: '2026-10-01', margem_bruta: -5 }), HOJE)).toEqual([
      'risco_alto',
      'accao_atrasada',
      'margem_negativa',
    ]);
    expect(riscosDe(projeto({ fase: 'encerrado', risco: 'alto' }), HOJE)).toEqual([]);
  });

  it('a leitura converte numeric em texto (PostgREST) e a prontidão', () => {
    const p = projetoDe({ id: 'x', nome: 'N', receita_contratada: '1500.50', margem_bruta: '-3', pronto_contrato: true });
    expect(p.receita_contratada).toBe(1500.5);
    expect(p.margem_bruta).toBe(-3);
    expect(p.prontidao.pronto_contrato).toBe(true);
    expect(p.prontidao.pronto_pagamento).toBe(false);
    expect(movimentoDe({ id: 'm', valor: '20.00' }).valor).toBe(20);
  });
});

describe('tesouraria', () => {
  const movs = [
    mov({ tipo: 'saldo', valor: 1000, data_prevista: '2026-09-30', data_efectiva: '2026-09-30' }),
    mov({ tipo: 'saldo', valor: 900, data_prevista: '2026-09-01', data_efectiva: '2026-09-01' }),
    mov({ tipo: 'recebimento', valor: 300, data_efectiva: '2026-10-02' }),
    mov({ tipo: 'pagamento', valor: 100, data_efectiva: '2026-10-03' }),
    // Antes do saldo: já está dentro da fotografia.
    mov({ tipo: 'recebimento', valor: 999, data_efectiva: '2026-09-15' }),
    mov({ tipo: 'recebimento', valor: 50, data_prevista: '2026-10-20' }),
    mov({ tipo: 'recebimento', valor: 70, data_prevista: '2026-10-01' }),
    mov({ tipo: 'pagamento', valor: 40, data_prevista: '2026-12-31' }),
    mov({ tipo: 'recebimento', valor: 5, moeda: 'USD', data_efectiva: '2026-10-02' }),
  ];

  it('caixa = último saldo + realizado depois dele; sem saldo, a moeda não aparece', () => {
    expect(caixaPorMoeda(movs)).toEqual([{ moeda: 'MZN', valor: 1200, desde: '2026-09-30' }]);
  });

  it('previsto a 30 dias e vencido, por moeda', () => {
    expect(previsaoPorMoeda(movs, HOJE)).toEqual([
      { moeda: 'MZN', recebimentos: 50, pagamentos: 0, recebimentosVencidos: 70, pagamentosVencidos: 0 },
    ]);
  });
});

describe('receita, capacidade, decisões', () => {
  it('receita por moeda, a receber e margem; suspensos fora', () => {
    const r = receitaPorMoeda([
      projeto({ receita_contratada: 1000, receita_faturada: 600, receita_recebida: 400, margem_bruta: 300 }),
      projeto({ receita_contratada: 500, margem_bruta: null }),
      projeto({ fase: 'suspenso', receita_contratada: 9999 }),
      projeto({ moeda: 'USD', receita_contratada: 0 }),
    ]);
    expect(r).toEqual([
      { moeda: 'MZN', contratada: 1500, faturada: 600, recebida: 400, aReceber: 200, margem: 300, comMargem: 1, projetos: 2 },
    ]);
  });

  it('capacidade: só pessoas activas, alocações em vigor e a projectos activos', () => {
    const pessoas: Pessoa[] = [
      { id: 'a', nome: 'A', funcao: null, area: 'tecnologia', horas_semana: 40, activa: true, revisao: 1 },
      { id: 'b', nome: 'B', funcao: null, area: 'comercial', horas_semana: 20, activa: true, revisao: 1 },
      { id: 'c', nome: 'C', funcao: null, area: 'tecnologia', horas_semana: 40, activa: false, revisao: 1 },
    ];
    const projetos = [projeto({ id: 'p1' }), projeto({ id: 'p2', fase: 'encerrado' })];
    const alocacoes = [
      { pessoa_id: 'a', projeto_id: 'p1', horas_semana: 30, ate: null },
      { pessoa_id: 'a', projeto_id: 'p2', horas_semana: 20, ate: null },
      { pessoa_id: 'b', projeto_id: 'p1', horas_semana: 25, ate: '2026-12-31' },
      { pessoa_id: 'b', projeto_id: 'p1', horas_semana: 99, ate: '2026-10-01' },
    ];
    const c = capacidade(pessoas, alocacoes, projetos, HOJE);
    expect(c.disponivel).toBe(60);
    expect(c.comprometida).toBe(55);
    expect(c.porPessoa.find((p) => p.pessoa.id === 'b')?.sobrealocada).toBe(true);
    expect(capacidade(pessoas, alocacoes, projetos, HOJE, 'tecnologia').disponivel).toBe(40);
    expect(capacidade([], [], [], HOJE).utilizacao).toBeNull();
  });

  it('a métrica crítica: recorrentes decididas sem o fundador; nula sem dados', () => {
    expect(delegacao([]).razao).toBeNull();
    const d = delegacao([
      decisao({ recorrente: true, estado: 'decidida', quem_decidiu: 'delegada' }),
      decisao({ recorrente: true, estado: 'decidida', quem_decidiu: 'fundador' }),
      decisao({ recorrente: true, estado: 'exige_minha' }),
      decisao({ recorrente: false, estado: 'decidida', quem_decidiu: 'delegada' }),
    ]);
    expect(d).toEqual({ delegadas: 1, total: 2, razao: 0.5 });
  });

  it('higiene: responsável, escopo, acção e data nos activos', () => {
    expect(higieneProjetos([projeto(), projeto({ escopo: null }), projeto({ fase: 'encerrado', escopo: null })])).toEqual({
      completos: 1,
      activos: 2,
      razao: 0.5,
    });
    expect(higieneProjetos([]).razao).toBeNull();
  });

  it('painéis CEO e CTO juntam tudo para o trimestre de hoje', () => {
    const dados = {
      decisoes: [
        decisao({ titulo: 'Tarde', data_revisao: '2026-10-20' }),
        decisao({ titulo: 'Cedo', data_revisao: '2026-10-01' }),
        decisao({ chapeu: 'cto', estado: 'precisa_info' }),
      ],
      prioridades: [
        { id: '1', trimestre: '2026-T4', tipo: 'tecnologica' as const, resultado: 'R', indicador: null, meta: null, estado: 'em_curso' as const, nota: null, revisao: 1 },
        { id: '2', trimestre: '2026-T3', tipo: 'comercial' as const, resultado: 'Velha', indicador: null, meta: null, estado: 'em_curso' as const, nota: null, revisao: 1 },
      ],
      projetos: [projeto({ risco: 'alto' }), projeto({ id: 'p2', fase: 'implementacao', prontidao: PRONTO })],
      movimentos: [],
      pessoas: [],
      alocacoes: [],
    };
    const ceo = painelCeo(dados, HOJE);
    expect(ceo.trimestre).toBe('2026-T4');
    expect(ceo.prioridades.map((p) => p.id)).toEqual(['1']);
    expect(ceo.decisoesMinhas.map((d) => d.titulo)).toEqual(['Cedo', 'Tarde']);
    expect(ceo.decisoesAtrasadas).toBe(1);
    expect(ceo.emRisco).toHaveLength(1);
    expect(ceo.caixa).toEqual([]);
    const cto = painelCto(dados, HOJE);
    expect(cto.decisoesCto).toHaveLength(1);
    expect(cto.prioridadeTecnologica?.id).toBe('1');
    expect(cto.emExecucao.map((p) => p.id)).toEqual(['p2']);
    expect(cto.porPreparar[0]?.falta).toEqual(['Capacidade reservada']);
  });
});

describe('formulários', () => {
  const baseDecisao = {
    titulo: 'Escolher CRM',
    contexto: '',
    chapeu: 'ceo',
    estado: 'exige_minha',
    decisao: '',
    responsavel: 'Gerson',
    consultados: '',
    indicador: '',
    dataRevisao: '2026-10-14',
    recorrente: '',
    quemDecidiu: '',
  };

  it('decisão: aberta precisa de dono e data; decidida precisa do quê e de quem', () => {
    expect(formularioDecisao.safeParse(baseDecisao).success).toBe(true);
    expect(formularioDecisao.safeParse({ ...baseDecisao, responsavel: '' }).success).toBe(false);
    expect(formularioDecisao.safeParse({ ...baseDecisao, estado: 'decidida' }).success).toBe(false);
    expect(
      formularioDecisao.safeParse({ ...baseDecisao, estado: 'decidida', decisao: 'Listas', quemDecidiu: 'delegada' }).success,
    ).toBe(true);
    expect(formularioDecisao.safeParse({ ...baseDecisao, dataRevisao: '2026-02-31' }).success).toBe(false);
  });

  it('prioridade: trimestre válido', () => {
    const p = { trimestre: '2026-T4', tipo: 'comercial', resultado: 'Dez diagnósticos', indicador: '', meta: '', estado: 'em_curso', nota: '' };
    expect(formularioPrioridade.safeParse(p).success).toBe(true);
    expect(formularioPrioridade.safeParse({ ...p, trimestre: '2026-T5' }).success).toBe(false);
  });

  const baseProjeto = {
    nome: 'Portal',
    cliente: '',
    fase: 'arquitetura',
    responsavel: 'Gerson',
    sponsor: '',
    resultado: '',
    escopo: '',
    moeda: 'MZN',
    receitaContratada: '1 000 000',
    receitaFaturada: '400000',
    receitaRecebida: '',
    custosVariaveis: '600000,50',
    prontidao: { contrato: 'on', escopo: 'on', responsavel: 'on', capacidade: '', aceitacao: 'on', dependencias: 'on', pagamento: 'on' },
    risco: 'baixo',
    proximaAccao: 'Rever',
    proximaData: '2026-10-10',
    ligacao: '',
  };

  it('projecto: valores, prontidão na ordem da base e o bloqueio de implementação', () => {
    const r = formularioProjeto.parse(baseProjeto);
    expect(r.receitaContratada).toBe(1_000_000);
    expect(r.custosVariaveis).toBe(600000.5);
    expect(prontidaoParaGravar(r)).toEqual([true, true, true, false, true, true, true]);
    const impl = formularioProjeto.safeParse({ ...baseProjeto, fase: 'implementacao' });
    expect(impl.success).toBe(false);
    expect(impl.error?.issues[0]?.message).toBe('Para implementar falta: Capacidade reservada.');
    expect(formularioProjeto.safeParse({ ...baseProjeto, receitaFaturada: '2000000' }).success).toBe(false);
    expect(formularioProjeto.safeParse({ ...baseProjeto, proximaAccao: '' }).success).toBe(false);
    expect(formularioProjeto.safeParse({ ...baseProjeto, fase: 'encerrado', proximaAccao: '', proximaData: '' }).success).toBe(true);
    expect(formularioProjeto.safeParse({ ...baseProjeto, ligacao: 'http://x' }).success).toBe(false);
  });

  it('movimento: valor obrigatório, positivo excepto saldo', () => {
    const m = { tipo: 'recebimento', descricao: 'Fatura', projeto: '', valor: '100', moeda: 'MZN', dataPrevista: '2026-10-20', dataEfectiva: '' };
    expect(formularioMovimento.safeParse(m).success).toBe(true);
    expect(formularioMovimento.safeParse({ ...m, valor: '' }).success).toBe(false);
    expect(formularioMovimento.safeParse({ ...m, valor: '0' }).success).toBe(false);
    // Um saldo é um facto numa data passada (data de hoje ou antes).
    expect(formularioMovimento.safeParse({ ...m, tipo: 'saldo', valor: '0', dataPrevista: '2026-01-15' }).success).toBe(true);
    expect(formularioMovimento.safeParse({ ...m, tipo: 'saldo', valor: '5', dataPrevista: '2099-01-01' }).success).toBe(false);
    // Realizado é passado: data efectiva futura recusada; previsto no futuro, aceite.
    expect(formularioMovimento.safeParse({ ...m, dataEfectiva: '2099-01-01' }).success).toBe(false);
    expect(formularioMovimento.safeParse({ ...m, dataPrevista: '2099-01-01' }).success).toBe(true);
    expect(formularioMovimento.safeParse({ ...m, projeto: 'nao-e-uuid' }).success).toBe(false);
  });

  it('alocação: horas entre 0,5 e 80', () => {
    const a = { pessoa: '00000000-0000-4000-8000-000000000001', projeto: '00000000-0000-4000-8000-000000000002', horasSemana: '7,5', ate: '' };
    expect(formularioAlocacao.parse(a).horasSemana).toBe(7.5);
    expect(formularioAlocacao.safeParse({ ...a, horasSemana: '0' }).success).toBe(false);
    expect(formularioAlocacao.safeParse({ ...a, horasSemana: '81' }).success).toBe(false);
  });
});
