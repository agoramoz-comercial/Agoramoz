import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  alertasDe,
  CRITERIOS,
  DECISOES,
  ESTADOS_DOCUMENTO,
  FASES,
  FONTES,
  kpiPrincipal,
  MEMO,
  PAPEIS_LIGACAO,
  PASTAS,
  podePassarPara,
  prioridadeDe,
  PROBABILIDADE,
  RELACOES,
  scorecard,
  SECTORES,
  TIPOS_STAKEHOLDER,
  TODAS_AS_FASES,
  totalDe,
  URGENCIAS,
  valorCentral,
  type OportunidadeResumo,
} from './modelo';
import {
  formularioDocumento,
  formularioMemo,
  formularioOportunidade,
  formularioRegisto,
  formularioStakeholder,
  memoParaGravar,
} from './formularios';

const SQL = readFileSync('supabase/migrations/0017_espaco_ceno.sql', 'utf-8');

/** Os valores de um `check (coluna in (...))` da 0017. */
function checkDe(coluna: string): string[] {
  const m = SQL.match(new RegExp(`${coluna} text[^;]*?check \\(${coluna}[^(]*in \\(([^)]*)\\)`, 's'));
  expect(m, `CHECK de ${coluna}`).not.toBeNull();
  return [...m![1]!.matchAll(/'([a-z_A-Z]+)'/g)].map((x) => x[1]!).sort();
}

describe('os vocabulários são os mesmos da base', () => {
  it.each([
    ['fase', TODAS_AS_FASES],
    ['sector', Object.keys(SECTORES)],
    ['fonte', Object.keys(FONTES)],
    ['urgencia', Object.keys(URGENCIAS)],
    ['tipo', Object.keys(TIPOS_STAKEHOLDER)],
    ['relacao', Object.keys(RELACOES)],
    ['papel', Object.keys(PAPEIS_LIGACAO)],
    ['estado', Object.keys(ESTADOS_DOCUMENTO)],
  ])('%s', (coluna, valores) => {
    expect([...valores].sort()).toEqual(checkDe(coluna));
  });

  it('decisões, secções do memo e colunas do score', () => {
    expect(SQL).toContain(`decisao in (${Object.keys(DECISOES).map((d) => `'${d}'`).join(', ')})`);
    for (const m of MEMO) expect(SQL).toContain(`'${m.chave}'`);
    for (const c of CRITERIOS) expect(SQL).toContain(`${c.coluna} smallint check (${c.coluna} between 0 and 5)`);
  });

  it('a ordem das etapas é a de ceno_ordem_fase', () => {
    for (const f of FASES) expect(SQL).toContain(`when '${f.chave}' then ${f.ordem}`);
    expect(FASES).toHaveLength(12);
    expect(PASTAS).toHaveLength(12);
    expect(MEMO).toHaveLength(12);
    expect(CRITERIOS).toHaveLength(8);
  });

  it('as probabilidades crescem com a etapa e ficam entre 0 e 1', () => {
    const p = FASES.map((f) => PROBABILIDADE[f.chave]);
    for (let i = 1; i < p.length; i++) expect(p[i]!).toBeGreaterThanOrEqual(p[i - 1]!);
    expect(Math.min(...p)).toBeGreaterThan(0);
    expect(Math.max(...p)).toBeLessThanOrEqual(1);
  });
});

describe('qualificação', () => {
  it('prioridade nas fronteiras do documento', () => {
    expect(prioridadeDe(40)).toBe('A');
    expect(prioridadeDe(32)).toBe('A');
    expect(prioridadeDe(31)).toBe('B');
    expect(prioridadeDe(24)).toBe('B');
    expect(prioridadeDe(23)).toBe('incubacao');
    expect(prioridadeDe(16)).toBe('incubacao');
    expect(prioridadeDe(15)).toBe('abandonar');
    expect(prioridadeDe(0)).toBe('abandonar');
    expect(prioridadeDe(null)).toBeNull();
  });

  it('o total só existe com os oito critérios', () => {
    const todos = Object.fromEntries(CRITERIOS.map((c) => [c.coluna, 4]));
    expect(totalDe(todos)).toBe(32);
    expect(totalDe({ ...todos, c_valor: null })).toBeNull();
  });

  it('passagem: qualificar exige score ≥ 24; perder exige motivo', () => {
    expect(podePassarPara('contacto', null).ok).toBe(true);
    expect(podePassarPara('qualificada', null).ok).toBe(false);
    expect(podePassarPara('qualificada', 23).ok).toBe(false);
    expect(podePassarPara('qualificada', 24).ok).toBe(true);
    expect(podePassarPara('acordo', 20).ok).toBe(false);
    expect(podePassarPara('perdida', null).ok).toBe(false);
    expect(podePassarPara('perdida', null, 'Sem orçamento').ok).toBe(true);
    expect(podePassarPara('arquivada', null).ok).toBe(true);
    expect(podePassarPara('inventada', 40).ok).toBe(false);
  });
});

const AGORA = new Date('2026-10-20T10:00:00Z');

function op(p: Partial<OportunidadeResumo> & { id: string }): OportunidadeResumo {
  return {
    titulo: 'QA',
    fase: 'contacto',
    fase_desde: '2026-10-18T10:00:00Z',
    ultima_actividade: '2026-10-19T10:00:00Z',
    proxima_accao: 'Ligar',
    proxima_data: '2026-10-25',
    responsavel: 'Sheinaz',
    score_total: null,
    prioridade: null,
    valor_min: null,
    valor_max: null,
    moeda: 'USD',
    memo: {},
    ...p,
  };
}

describe('alertas', () => {
  it('uma oportunidade em dia não alerta', () => {
    expect(alertasDe(op({ id: 'a' }), AGORA)).toEqual([]);
  });

  it('acção em atraso, parada > 14 dias, sem actividade > 7 dias, A sem memo', () => {
    const o = op({
      id: 'b',
      proxima_data: '2026-10-19',
      fase_desde: '2026-10-01T10:00:00Z',
      ultima_actividade: '2026-10-10T10:00:00Z',
      prioridade: 'A',
      score_total: 34,
    });
    expect(alertasDe(o, AGORA)).toEqual(['accao_atrasada', 'parada', 'sem_actividade', 'a_sem_memo']);
  });

  it('terminadas, perdidas e arquivadas não alertam', () => {
    for (const fase of ['valor_realizado', 'perdida', 'arquivada']) {
      expect(alertasDe(op({ id: 'c', fase, proxima_data: '2020-01-01' }), AGORA)).toEqual([]);
    }
  });
});

describe('scorecard', () => {
  it('sem dados, as razões são nulas (nunca 0 inventado)', () => {
    const s = scorecard([], new Set(), [], AGORA);
    expect(s.taxaQualificacao).toBeNull();
    expect(s.acessoDecisores).toBeNull();
    expect(s.higiene).toBeNull();
    expect(s.propostaParaAcordo).toBeNull();
    expect(s.pipelinePonderado).toEqual({});
  });

  it('calcula qualificação, decisores, pipeline ponderado por moeda e higiene', () => {
    const ops = [
      op({ id: '1', fase: 'qualificada', score_total: 30, prioridade: 'B', valor_min: 100, valor_max: 300, moeda: 'USD' }),
      op({ id: '2', fase: 'proposta', score_total: 34, prioridade: 'A', valor_min: 1000, valor_max: null, moeda: 'MZN',
        memo: { oportunidade: 'x', problema: 'y', proxima_decisao: 'z' } }),
      op({ id: '3', fase: 'sinal', score_total: 12, prioridade: 'abandonar', responsavel: null }),
      op({ id: '4', fase: 'acordo', score_total: 33, prioridade: 'A', valor_min: 500, valor_max: 500 }),
      op({ id: '5', fase: 'perdida', proxima_accao: null, proxima_data: null }),
    ];
    const s = scorecard(ops, new Set(['1', '4']), [{ oportunidade_id: '4', para: 'proposta' }], AGORA);
    expect(s.analisadas).toBe(4);
    expect(s.qualificadas).toBe(3);
    expect(s.taxaQualificacao).toBe(0.75);
    expect(s.acessoDecisores).toBeCloseTo(2 / 3);
    // USD: (100+300)/2 × 0,25 = 50; MZN: 1000 × 0,55 = 550; o acordo já não é pipeline.
    expect(s.pipelinePonderado).toEqual({ USD: 50, MZN: 550 });
    expect(s.semValor).toBe(1);
    expect(s.activas).toBe(4);
    expect(s.higiene).toBe(0.75);
    expect(s.prioridadeA).toBe(2);
    expect(s.prioridadeAComMemo).toBe(1);
    // Chegaram a proposta: 2 (agora) e 4 (pelo registo e por estar em acordo); a acordo: 4.
    expect(s.propostaParaAcordo).toBe(0.5);
    expect(s.acordos).toBe(1);
    expect(s.perdidas).toBe(1);
  });

  it('KPI principal: prioritárias activas com problema, decisor, modelo económico e próxima decisão', () => {
    const pronta = { problema: 'Custo de energia alto', memo: { receita: 'Fee de estruturação', proxima_decisao: 'Comité 12/11' } };
    const ops = [
      { ...op({ id: 'p1', prioridade: 'A', score_total: 34 }), ...pronta },
      { ...op({ id: 'p2', prioridade: 'B', score_total: 26 }), ...pronta },
      { ...op({ id: 'p3', prioridade: 'B', score_total: 25 }), problema: null },
      { ...op({ id: 'p4', prioridade: 'A', score_total: 35, fase: 'perdida' }), ...pronta },
      { ...op({ id: 'p5', prioridade: 'incubacao', score_total: 18 }), ...pronta },
    ];
    expect(kpiPrincipal(ops, new Set(['p1', 'p3']))).toEqual({ prontas: 1, prioritarias: 3, razao: 1 / 3 });
    expect(kpiPrincipal([], new Set()).razao).toBeNull();
  });

  it('valor central do intervalo', () => {
    expect(valorCentral(10, 20)).toBe(15);
    expect(valorCentral(10, null)).toBe(10);
    expect(valorCentral(null, 20)).toBe(20);
    expect(valorCentral(null, null)).toBeNull();
  });
});

const base = {
  titulo: 'Parque solar',
  organizacao: '',
  sector: 'solar',
  problema: '',
  fonte: '',
  urgencia: 'media',
  valorMin: '',
  valorMax: '',
  moeda: 'USD',
  valorEvidencia: '',
  proximaAccao: 'Ligar ao promotor',
  proximaData: '2026-10-25',
  responsavel: '',
};

describe('formulários', () => {
  it('oportunidade: vazios viram nulo, valores aceitam espaços e vírgula', () => {
    const r = formularioOportunidade.parse({ ...base, valorMin: '1 500 000', valorMax: '2000000,50', valorEvidencia: 'Caso semelhante' });
    expect(r.organizacao).toBeNull();
    expect(r.fonte).toBeNull();
    expect(r.valorMin).toBe(1500000);
    expect(r.valorMax).toBe(2000000.5);
  });

  it('oportunidade: valor sem evidência, máximo < mínimo e sem acção são recusados', () => {
    expect(formularioOportunidade.safeParse({ ...base, valorMin: '10' }).success).toBe(false);
    expect(formularioOportunidade.safeParse({ ...base, valorMin: '10', valorMax: '5', valorEvidencia: 'x' }).success).toBe(false);
    expect(formularioOportunidade.safeParse({ ...base, proximaAccao: '' }).success).toBe(false);
    expect(formularioOportunidade.safeParse({ ...base, sector: 'nuclear' }).success).toBe(false);
  });

  it('stakeholder activo precisa de acção e data; inactivo não', () => {
    const s = { organizacao: 'Banco QA', pessoa: '', cargo: '', pais: '', sector: '', tipo: 'banco', interesse: '',
      poder: '', relacao: 'nova', ultima: '', proximaAccao: '', proximaData: '', origem: '', consentimento: '', responsavel: '' };
    expect(formularioStakeholder.safeParse({ ...s, activo: 'on' }).success).toBe(false);
    expect(formularioStakeholder.safeParse({ ...s, activo: '' }).success).toBe(true);
    expect(formularioStakeholder.safeParse({ ...s, activo: 'on', proximaAccao: 'Enviar deck', proximaData: '2026-11-01' }).success).toBe(true);
  });

  it('registo: decisão exige o valor; nota exige texto', () => {
    expect(formularioRegisto.safeParse({ tipo: 'decisao', decisao: '', corpo: '' }).success).toBe(false);
    expect(formularioRegisto.safeParse({ tipo: 'decisao', decisao: 'incubar', corpo: '' }).success).toBe(true);
    expect(formularioRegisto.safeParse({ tipo: 'nota', decisao: '', corpo: '' }).success).toBe(false);
  });

  it('documento: só https', () => {
    expect(formularioDocumento.safeParse({ pasta: '5', estado: 'pronto', ligacao: 'http://x.test', nota: '' }).success).toBe(false);
    expect(formularioDocumento.safeParse({ pasta: '5', estado: 'pronto', ligacao: 'https://x.sharepoint.com/a', nota: '' }).success).toBe(true);
    expect(formularioDocumento.safeParse({ pasta: '13', estado: 'pronto', ligacao: '', nota: '' }).success).toBe(false);
  });

  it('fechadas não precisam de próxima acção; activas sim', () => {
    for (const fase of ['valor_realizado', 'perdida', 'arquivada'])
      expect(formularioOportunidade.safeParse({ ...base, fase, proximaAccao: '', proximaData: '' }).success).toBe(true);
    expect(formularioOportunidade.safeParse({ ...base, fase: 'proposta', proximaData: '' }).success).toBe(false);
  });

  it('datas impossíveis são recusadas (31 de Fevereiro não vira 3 de Março)', () => {
    expect(formularioOportunidade.safeParse({ ...base, proximaData: '2026-02-31' }).success).toBe(false);
    expect(formularioOportunidade.safeParse({ ...base, proximaData: '2028-02-29' }).success).toBe(true);
  });

  it('memo: acima do limite da base (64 KB) é recusado com uma mensagem humana', () => {
    const cheio = Object.fromEntries(MEMO.map((m) => [m.chave, 'ç'.repeat(4000)]));
    const r = formularioMemo.safeParse(cheio);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/demasiado longo/);
    expect(formularioMemo.safeParse({ ...cheio, ...Object.fromEntries(MEMO.slice(6).map((m) => [m.chave, ''])) }).success).toBe(true);
  });

  it('memo: só as secções escritas são gravadas', () => {
    expect(memoParaGravar({ oportunidade: '  x ', riscos: '   ', prazo: '' })).toEqual({ oportunidade: 'x' });
  });
});
