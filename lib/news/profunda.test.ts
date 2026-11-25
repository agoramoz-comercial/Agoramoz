import { describe, expect, it, vi } from 'vitest';
import { EXEMPLO_PROFUNDA } from './exemplo-profunda';
import { PAISES_NEWS } from './paises';
import {
  esquemaProfunda,
  gerarProfunda,
  lerProfunda,
  numerosInventados,
  promptProfunda,
  respostaKimi,
  serieLimpa,
  verificarProfunda,
  type RespostaKimi,
} from './profunda';

const FONTE =
  'O Governo anunciou que a tarifa portuária no corredor de Maputo sobe 12,5% a partir de 1 de Março de 2027. ' +
  'O porto movimentou 31 milhões de toneladas no ano passado, segundo a empresa gestora. Os importadores de bens ' +
  'alimentares dizem que vão repassar parte do custo e pedem um período de transição. '.repeat(2);

function resposta(): RespostaKimi {
  const e = EXEMPLO_PROFUNDA;
  // `parse` deita fora versão, país, modelo, data e retirados (chaves desconhecidas).
  return respostaKimi.parse({
    ...e,
    cenarios: { base: e.cenarios.base!, optimista: e.cenarios.optimista!, pessimista: e.cenarios.pessimista! },
  });
}

function kimiQueResponde(corpo: unknown, status = 200) {
  return vi.fn(async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(corpo) } }] }), { status }),
  ) as unknown as typeof fetch;
}

const CONFIG = { ligada: true, chave: 'k'.repeat(32), modelo: 'kimi-teste', baseUrl: 'https://api.moonshot.ai/v1' };

describe('análise profunda — esquema', () => {
  it('o exemplo de QA passa no esquema de leitura e tem os países conhecidos', () => {
    expect(esquemaProfunda.safeParse(EXEMPLO_PROFUNDA).success).toBe(true);
    expect(lerProfunda(EXEMPLO_PROFUNDA)).not.toBeNull();
    expect(PAISES_NEWS).toHaveLength(13);
  });

  it('recusa etiquetas fora de E1–E4, tipos desconhecidos e país fora da lista', () => {
    expect(lerProfunda({ ...EXEMPLO_PROFUNDA, impacto: { ...EXEMPLO_PROFUNDA.impacto, evidencia: 'E5' } })).toBeNull();
    expect(lerProfunda({ ...EXEMPLO_PROFUNDA, impacto: { ...EXEMPLO_PROFUNDA.impacto, tipo: 'certeza' } })).toBeNull();
    expect(lerProfunda({ ...EXEMPLO_PROFUNDA, pais: 'xx' })).toBeNull();
    // Artigos antigos: sem camada profunda, nada a mostrar (e nada partido).
    expect(lerProfunda(null)).toBeNull();
    expect(lerProfunda(undefined)).toBeNull();
  });

  it('o prompt nomeia o país, os agentes e a regra dos números', () => {
    const p = promptProfunda('za', 'en');
    expect(p).toContain('South Africa');
    expect(p).toMatch(/AG-04/);
    expect(p).toMatch(/AG-22 Red Team/);
    expect(p).toMatch(/NEVER write a number/);
  });
});

describe('análise profunda — números só da fonte', () => {
  it('detecta números que não estão no documento (e aceita os que estão)', () => {
    expect(numerosInventados({ t: 'A tarifa sobe 12,5% e o porto movimentou 31 milhões' }, FONTE)).toEqual([]);
    expect(numerosInventados({ t: 'Perda de 40% das margens' }, FONTE)).toEqual(['40%']);
  });

  it('retira os itens com números inventados e conta-os', () => {
    const r = resposta();
    const contaminada: RespostaKimi = {
      ...r,
      riscos: [...r.riscos, { ...r.riscos[0]!, titulo: 'Queda de 37% no volume' }],
      sectores: [...r.sectores, { ...r.sectores[0]!, nome: 'Banca', explicacao: 'Crédito cai 18 pontos.' }],
      cenarios: { ...r.cenarios, pessimista: { ...r.cenarios.pessimista, descricao: 'PIB recua 2,3% em 2028.' } },
    };
    const v = verificarProfunda(contaminada, FONTE);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.analise.retirados).toBe(3);
    expect(v.analise.riscos).toHaveLength(r.riscos.length);
    expect(v.analise.sectores).toHaveLength(r.sectores.length);
    expect(v.analise.cenarios.pessimista).toBeNull();
    expect(JSON.stringify(v.analise)).not.toMatch(/37%|18 pontos|2,3%/);
  });

  it('recusa a análise inteira se o impacto principal trouxer um número inventado', () => {
    const r = resposta();
    const v = verificarProfunda({ ...r, impacto: { ...r.impacto, resumo: 'Custos sobem 45% para todos.' } }, FONTE);
    expect(v).toEqual({ ok: false, motivo: 'numeros-no-impacto' });
  });
});

describe('análise profunda — motor Kimi', () => {
  it('desligada ou sem chave: não pede nada e não inventa nada', async () => {
    const f = vi.fn() as unknown as typeof fetch;
    expect(await gerarProfunda({ fonte: FONTE, pais: 'mz', idioma: 'pt' }, { ...CONFIG, ligada: false, fetch: f })).toEqual({
      ok: false,
      falha: 'desligada',
    });
    expect(await gerarProfunda({ fonte: FONTE, pais: 'mz', idioma: 'pt' }, { ...CONFIG, chave: undefined, fetch: f })).toEqual({
      ok: false,
      falha: 'desligada',
    });
    expect(f).not.toHaveBeenCalled();
  });

  it('documento curto: recusa antes de gastar a conta', async () => {
    const f = vi.fn() as unknown as typeof fetch;
    const r = await gerarProfunda({ fonte: 'curto', pais: 'mz', idioma: 'pt' }, { ...CONFIG, fetch: f });
    expect(r).toEqual({ ok: false, falha: 'fonte-curta' });
    expect(f).not.toHaveBeenCalled();
  });

  it('resposta válida: guarda o país, o modelo e passa no esquema', async () => {
    const f = kimiQueResponde(resposta());
    const r = await gerarProfunda(
      { fonte: FONTE, pais: 'pt', idioma: 'pt' },
      { ...CONFIG, fetch: f, agora: () => new Date('2026-11-23T10:00:00Z') },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.analise.pais).toBe('pt');
    expect(r.analise.modelo).toBe('kimi-teste');
    expect(r.analise.geradaEm).toBe('2026-11-23T10:00:00.000Z');
    expect(esquemaProfunda.safeParse(r.analise).success).toBe(true);
    const corpo = JSON.parse((f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]![1].body as string);
    expect(corpo.response_format).toEqual({ type: 'json_object' });
    expect(corpo.messages[0].content).toContain('Portugal');
  });

  it('resposta fora do esquema, JSON inválido ou HTTP de erro: falha com código, sem camada', async () => {
    expect(await gerarProfunda({ fonte: FONTE, pais: 'mz', idioma: 'pt' }, { ...CONFIG, fetch: kimiQueResponde({ impacto: 1 }) })).toEqual({
      ok: false,
      falha: 'esquema',
    });
    const lixo = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'não é json' } }] }))) as unknown as typeof fetch;
    expect(await gerarProfunda({ fonte: FONTE, pais: 'mz', idioma: 'pt' }, { ...CONFIG, fetch: lixo })).toEqual({ ok: false, falha: 'json' });
    const erro = vi.fn(async () => new Response('x', { status: 503 })) as unknown as typeof fetch;
    expect(await gerarProfunda({ fonte: FONTE, pais: 'mz', idioma: 'pt' }, { ...CONFIG, fetch: erro })).toEqual({ ok: false, falha: 'http_503' });
    // IA-429-01: o 429 diz se é saldo ou limite (e o limite espera e repete).
    const semSaldo = vi.fn(async () => new Response(JSON.stringify({ error: { type: 'exceeded_current_quota_error' } }), { status: 429 })) as unknown as typeof fetch;
    expect(await gerarProfunda({ fonte: FONTE, pais: 'mz', idioma: 'pt' }, { ...CONFIG, fetch: semSaldo })).toEqual({ ok: false, falha: 'sem-saldo' });
    const limite = vi.fn(async () => new Response('x', { status: 429 })) as unknown as typeof fetch;
    expect(await gerarProfunda({ fonte: FONTE, pais: 'mz', idioma: 'pt' }, { ...CONFIG, fetch: limite, dormir: async () => undefined })).toEqual({ ok: false, falha: 'limite' });
    expect(limite).toHaveBeenCalledTimes(3);
  });
});

describe('análise profunda — séries para gráficos', () => {
  const FONTE_N =
    'O porto movimentou 31 milhões de toneladas em 2025 e 27 milhões em 2024. A tarifa sobe 12,5%. ' +
    'Os contentores representam 40% da carga e os granéis 35%. Em 2023 foram 3 novos terminais. '.repeat(3);
  const base = { titulo: 'Carga movimentada', unidade: 'Mt', fonte: 'Documento colado' } as const;

  it('fica a série cujos valores estão todos escritos no documento', () => {
    const s = { ...base, tipo: 'linha' as const, pontos: [{ rotulo: '2024', valor: 27 }, { rotulo: '2025', valor: 31 }] };
    expect(serieLimpa(s, FONTE_N)).toBe(true);
  });

  it('sai a série com um valor que o documento não dá, mesmo pequeno', () => {
    const s = { ...base, tipo: 'barras' as const, pontos: [{ rotulo: '2024', valor: 27 }, { rotulo: '2025', valor: 4 }] };
    expect(serieLimpa(s, FONTE_N)).toBe(false);
  });

  it('sai a série com um ano inventado no rótulo ou percentagem fora de 0–100', () => {
    const ano = { ...base, tipo: 'linha' as const, pontos: [{ rotulo: '2019', valor: 27 }, { rotulo: '2025', valor: 31 }] };
    expect(serieLimpa(ano, FONTE_N)).toBe(false);
    const pct = { ...base, tipo: 'percentagem' as const, pontos: [{ rotulo: 'A', valor: 40 }, { rotulo: 'B', valor: 2025 }] };
    expect(serieLimpa(pct, FONTE_N)).toBe(false);
  });

  it('a verificação retira e conta as séries contaminadas; artigos antigos ficam sem séries', () => {
    const r = resposta();
    const boa = { ...base, tipo: 'percentagem' as const, pontos: [{ rotulo: 'Contentores', valor: 40 }, { rotulo: 'Granéis', valor: 35 }] };
    const ma = { ...base, tipo: 'barras' as const, pontos: [{ rotulo: 'X', valor: 99 }, { rotulo: 'Y', valor: 31 }] };
    const v = verificarProfunda({ ...r, dados: [boa, ma] }, FONTE + FONTE_N);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.analise.dados).toEqual([boa]);
      expect(v.analise.retirados).toBeGreaterThanOrEqual(1);
    }
    const semDados: Record<string, unknown> = { ...EXEMPLO_PROFUNDA };
    delete semDados.dados;
    expect(lerProfunda(semDados)?.dados).toEqual([]);
  });

  it('o prompt pede séries só com números do documento', () => {
    expect(promptProfunda('mz', 'pt')).toMatch(/DATA SERIES RULES/);
  });
});
