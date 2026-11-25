import { describe, expect, it, vi } from 'vitest';
import { SECCOES_JORNAL } from './artigo';
import { EXEMPLO_PROFUNDA } from './exemplo-profunda';
import { geografiaCitada, geografiaDoArtigo } from './geografia';
import {
  CODIGO_BM,
  INDICADORES,
  INDICADORES_BASE,
  INDICADORES_DA_SECCAO,
  formatarIndicador,
  formatarVariacao,
  indicadoresDoPais,
  indicadoresEmTexto,
  lerSerieBM,
} from './indicadores';
import { PAISES_NEWS } from './paises';
import { respostaKimi, verificarProfunda } from './profunda';

const linhasBM = (valores: [number, number | null][]) => [
  { page: 1, pages: 1, per_page: 14, total: valores.length },
  valores.map(([ano, v]) => ({ date: String(ano), value: v, indicator: { id: 'X' }, country: { id: 'MZ' } })),
];

function bmQueResponde(porCodigo: Record<string, unknown>) {
  return vi.fn(async (url: string) => {
    const cod = /indicator\/([^?]+)/.exec(url)![1]!;
    return porCodigo[cod] ? new Response(JSON.stringify(porCodigo[cod])) : new Response('{}', { status: 404 });
  }) as unknown as typeof fetch;
}

describe('indicadores do Banco Mundial', () => {
  it('cada secção tem 4–6 indicadores conhecidos; o base também; todos os países têm código', () => {
    for (const s of SECCOES_JORNAL) {
      const l = INDICADORES_DA_SECCAO[s];
      expect(l.length).toBeGreaterThanOrEqual(4);
      expect(l.length).toBeLessThanOrEqual(6);
      for (const c of l) expect(INDICADORES[c]).toBeDefined();
    }
    for (const c of INDICADORES_BASE) expect(INDICADORES[c]).toBeDefined();
    for (const p of PAISES_NEWS) expect(CODIGO_BM[p]).toMatch(/^[A-Z]{2}$/);
    expect(CODIGO_BM.uk).toBe('GB');
  });

  it('lê a série, ignora anos sem valor, ordena e guarda no máximo 10', () => {
    const s = lerSerieBM(linhasBM([[2024, null], [2023, 4.2], [2022, 9.8], ...Array.from({ length: 12 }, (_, i) => [2010 - i, i] as [number, number])]));
    expect(s!.at(-1)).toEqual({ ano: 2023, valor: 4.2 });
    expect(s!.length).toBe(10);
    expect(lerSerieBM([{ message: 'erro' }])).toBeNull();
    expect(lerSerieBM(linhasBM([[2024, null]]))).toBeNull();
  });

  it('o painel só aparece com pelo menos dois indicadores lidos; falhas não inventam nada', async () => {
    const um = bmQueResponde({ 'FP.CPI.TOTL.ZG': linhasBM([[2022, 9.8], [2023, 7.1]]) });
    expect(await indicadoresDoPais('mz', ['FP.CPI.TOTL.ZG', 'NY.GDP.MKTP.KD.ZG'], { fetch: um })).toBeNull();
    const dois = bmQueResponde({
      'FP.CPI.TOTL.ZG': linhasBM([[2022, 9.8], [2023, 7.1]]),
      'NY.GDP.MKTP.KD.ZG': linhasBM([[2023, 5]]),
    });
    const p = await indicadoresDoPais('mz', ['FP.CPI.TOTL.ZG', 'NY.GDP.MKTP.KD.ZG', 'NAO.EXISTE'], { fetch: dois });
    expect(p!.itens.map((i) => i.def.codigo)).toEqual(['FP.CPI.TOTL.ZG', 'NY.GDP.MKTP.KD.ZG']);
    const inf = p!.itens[0]!;
    expect(inf.ultimo).toEqual({ ano: 2023, valor: 7.1 });
    expect(inf.variacao).toBeCloseTo(-2.7);
    expect(inf.fonteUrl).toBe('https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=MZ');
    expect(p!.itens[1]!.variacao).toBeNull();
    const rede = vi.fn(async () => {
      throw new Error('sem rede');
    }) as unknown as typeof fetch;
    expect(await indicadoresDoPais('mz', INDICADORES_BASE, { fetch: rede })).toBeNull();
  });

  it('formata valores e variações com unidade', () => {
    const inf = INDICADORES['FP.CPI.TOTL.ZG']!;
    expect(formatarIndicador(7.12, inf, 'pt')).toBe('7,1%');
    expect(formatarVariacao(-2.7, inf, 'pt')).toBe('−2,7 p.p.');
    expect(formatarIndicador(512.3, INDICADORES['NY.GDP.PCAP.CD']!, 'en')).toBe('US$ 512');
  });

  it('a leitura dos indicadores só fica com números do documento ou dos indicadores passados', () => {
    const painel = {
      pais: 'mz' as const,
      fonte: 'Banco Mundial — World Development Indicators' as const,
      itens: [
        {
          def: INDICADORES['FP.CPI.TOTL.ZG']!,
          serie: [{ ano: 2022, valor: 9.8 }, { ano: 2023, valor: 7.1 }],
          ultimo: { ano: 2023, valor: 7.1 },
          variacao: -2.7,
          fonteUrl: '',
        },
      ],
    };
    const fonteInd = indicadoresEmTexto(painel);
    const doc = 'A tarifa portuária sobe 12,5% no corredor de Maputo. '.repeat(6);
    const e = EXEMPLO_PROFUNDA;
    const r = respostaKimi.parse({
      ...e,
      cenarios: { base: e.cenarios.base!, optimista: e.cenarios.optimista!, pessimista: e.cenarios.pessimista! },
      leituraIndicadores: [
        { indicador: 'FP.CPI.TOTL.ZG', texto: 'Com a inflação em 7,1% em 2023, a subida de 12,5% pesa mais.', evidencia: 'E1', tipo: 'hypothesis' },
        { texto: 'A inflação deve cair para 4% em 2026.', evidencia: 'E3', tipo: 'forecast' },
      ],
    });
    const v = verificarProfunda(r, doc, fonteInd);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.analise.leituraIndicadores.map((x) => x.texto)).toEqual(['Com a inflação em 7,1% em 2023, a subida de 12,5% pesa mais.']);
    // Sem indicadores no pedido, nenhuma leitura fica.
    const sem = verificarProfunda(r, doc);
    if (sem.ok) expect(sem.analise.leituraIndicadores).toEqual([]);
  });
});

describe('geografia citada', () => {
  it('encontra províncias do país e países parceiros só quando nomeados', () => {
    const g = geografiaCitada('Os portos de Cabo Delgado e de Inhambane exportam para a China e a África do Sul; os EUA observam.', 'mz');
    expect(g.regioes.map((r) => r.nome)).toEqual(['Cabo Delgado', 'Inhambane']);
    expect(g.parceiros.map((p) => p.iso2).sort()).toEqual(['cn', 'us', 'za']);
    // O próprio país não é parceiro; palavras comuns não são países.
    const h = geografiaCitada('Moçambique e Mozambique: a gaza da cortina e os eua minúsculos não contam.', 'mz');
    expect(h.parceiros).toEqual([]);
  });

  it('sem nada geográfico, nada aparece (o mapa mostra só o país)', () => {
    expect(geografiaCitada('A tarifa sobe para todos os importadores.', 'pt')).toEqual({ regioes: [], parceiros: [] });
  });

  it('junta a geografia guardada da leitura do documento com a do texto publicado', () => {
    const g = geografiaDoArtigo({ pais: 'mz', titulo: 'Tarifa portuária', entrada: null, analise: {}, profunda: EXEMPLO_PROFUNDA });
    expect(g.regioes.map((r) => r.nome)).toEqual(expect.arrayContaining(['Maputo', 'Gaza']));
    expect(g.parceiros.map((p) => p.iso2)).toEqual(expect.arrayContaining(['za', 'cn']));
  });
});
