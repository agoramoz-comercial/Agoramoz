import type { SeccaoJornal } from './artigo';
import type { PaisNews } from './paises';

/**
 * Indicadores oficiais do país da notícia, do Banco Mundial (World
 * Development Indicators, API pública `api.worldbank.org/v2`, E1). Lidos no
 * servidor, guardados um dia em cache. Sem resposta, não há painel: nenhum
 * número é escrito à mão nem inventado.
 */

export interface DefIndicador {
  readonly codigo: string;
  readonly pt: string;
  readonly en: string;
  /** Unidade curta mostrada ao lado do valor. */
  readonly unidade: '%' | '% PIB' | 'US$' | 'pessoas' | 'LCU/US$' | 'por 100';
  readonly casas: number;
}

export const INDICADORES: Readonly<Record<string, DefIndicador>> = {
  'NY.GDP.MKTP.KD.ZG': { codigo: 'NY.GDP.MKTP.KD.ZG', pt: 'Crescimento do PIB real', en: 'Real GDP growth', unidade: '%', casas: 1 },
  'FP.CPI.TOTL.ZG': { codigo: 'FP.CPI.TOTL.ZG', pt: 'Inflação (preços no consumidor)', en: 'Inflation (consumer prices)', unidade: '%', casas: 1 },
  'NY.GDP.PCAP.CD': { codigo: 'NY.GDP.PCAP.CD', pt: 'PIB per capita', en: 'GDP per capita', unidade: 'US$', casas: 0 },
  'NE.TRD.GNFS.ZS': { codigo: 'NE.TRD.GNFS.ZS', pt: 'Comércio externo', en: 'Trade', unidade: '% PIB', casas: 1 },
  'NE.EXP.GNFS.ZS': { codigo: 'NE.EXP.GNFS.ZS', pt: 'Exportações de bens e serviços', en: 'Exports of goods and services', unidade: '% PIB', casas: 1 },
  'BX.KLT.DINV.WD.GD.ZS': { codigo: 'BX.KLT.DINV.WD.GD.ZS', pt: 'Investimento directo estrangeiro (entradas)', en: 'Foreign direct investment (inflows)', unidade: '% PIB', casas: 1 },
  'BN.CAB.XOKA.GD.ZS': { codigo: 'BN.CAB.XOKA.GD.ZS', pt: 'Saldo da balança corrente', en: 'Current account balance', unidade: '% PIB', casas: 1 },
  'PA.NUS.FCRF': { codigo: 'PA.NUS.FCRF', pt: 'Câmbio oficial (moeda local por US$)', en: 'Official exchange rate (LCU per US$)', unidade: 'LCU/US$', casas: 2 },
  'FS.AST.PRVT.GD.ZS': { codigo: 'FS.AST.PRVT.GD.ZS', pt: 'Crédito ao sector privado', en: 'Domestic credit to private sector', unidade: '% PIB', casas: 1 },
  'SL.UEM.TOTL.ZS': { codigo: 'SL.UEM.TOTL.ZS', pt: 'Desemprego (estimativa OIT)', en: 'Unemployment (ILO estimate)', unidade: '%', casas: 1 },
  'EG.ELC.ACCS.ZS': { codigo: 'EG.ELC.ACCS.ZS', pt: 'Acesso à electricidade', en: 'Access to electricity', unidade: '%', casas: 1 },
  'EG.FEC.RNEW.ZS': { codigo: 'EG.FEC.RNEW.ZS', pt: 'Energia renovável no consumo final', en: 'Renewable energy consumption', unidade: '%', casas: 1 },
  'NY.GDP.TOTL.RT.ZS': { codigo: 'NY.GDP.TOTL.RT.ZS', pt: 'Rendas de recursos naturais', en: 'Natural resources rents', unidade: '% PIB', casas: 1 },
  'IT.NET.USER.ZS': { codigo: 'IT.NET.USER.ZS', pt: 'Utilizadores de Internet', en: 'Internet users', unidade: '%', casas: 1 },
  'IT.CEL.SETS.P2': { codigo: 'IT.CEL.SETS.P2', pt: 'Assinaturas de telemóvel', en: 'Mobile subscriptions', unidade: 'por 100', casas: 0 },
  'GC.REV.XGRT.GD.ZS': { codigo: 'GC.REV.XGRT.GD.ZS', pt: 'Receita pública (sem donativos)', en: 'Government revenue (excl. grants)', unidade: '% PIB', casas: 1 },
  'SP.POP.TOTL': { codigo: 'SP.POP.TOTL', pt: 'População', en: 'Population', unidade: 'pessoas', casas: 0 },
};

/**
 * Os indicadores de cada secção: os que dizem alguma coisa sobre o tema da
 * notícia (não um painel genérico). O PIB e a inflação abrem quase todos,
 * porque enquadram qualquer leitura de impacto.
 */
export const INDICADORES_DA_SECCAO: Readonly<Record<SeccaoJornal, readonly string[]>> = {
  economia: ['NY.GDP.MKTP.KD.ZG', 'FP.CPI.TOTL.ZG', 'NY.GDP.PCAP.CD', 'BN.CAB.XOKA.GD.ZS', 'SL.UEM.TOTL.ZS'],
  mercados: ['FP.CPI.TOTL.ZG', 'PA.NUS.FCRF', 'NE.TRD.GNFS.ZS', 'FS.AST.PRVT.GD.ZS', 'BN.CAB.XOKA.GD.ZS'],
  energia: ['EG.ELC.ACCS.ZS', 'EG.FEC.RNEW.ZS', 'NY.GDP.TOTL.RT.ZS', 'NE.EXP.GNFS.ZS', 'NY.GDP.MKTP.KD.ZG'],
  tecnologia: ['IT.NET.USER.ZS', 'IT.CEL.SETS.P2', 'NY.GDP.PCAP.CD', 'BX.KLT.DINV.WD.GD.ZS'],
  negocios: ['NY.GDP.MKTP.KD.ZG', 'BX.KLT.DINV.WD.GD.ZS', 'FS.AST.PRVT.GD.ZS', 'FP.CPI.TOTL.ZG', 'NE.TRD.GNFS.ZS'],
  politica: ['GC.REV.XGRT.GD.ZS', 'FP.CPI.TOTL.ZG', 'NY.GDP.MKTP.KD.ZG', 'BN.CAB.XOKA.GD.ZS', 'PA.NUS.FCRF'],
};

/** Quando a secção não se sabe (ex.: na geração da análise): o enquadramento macro. */
export const INDICADORES_BASE = ['NY.GDP.MKTP.KD.ZG', 'FP.CPI.TOTL.ZG', 'NE.TRD.GNFS.ZS', 'BX.KLT.DINV.WD.GD.ZS', 'PA.NUS.FCRF'] as const;

/** Código do país no Banco Mundial (ISO 3166-1 alfa-2; o Reino Unido é GB). */
export const CODIGO_BM: Record<PaisNews, string> = {
  mz: 'MZ', pt: 'PT', br: 'BR', ch: 'CH', sg: 'SG', us: 'US', uk: 'GB',
  de: 'DE', fr: 'FR', ae: 'AE', sa: 'SA', za: 'ZA', ca: 'CA',
};

export interface PontoAno {
  readonly ano: number;
  readonly valor: number;
}

export interface IndicadorPais {
  readonly def: DefIndicador;
  /** Do mais antigo ao mais recente, só anos com valor (até 10). */
  readonly serie: readonly PontoAno[];
  readonly ultimo: PontoAno;
  /** Variação face ao ano anterior com valor (na unidade do indicador; pontos percentuais nos %). */
  readonly variacao: number | null;
  /** Ligação para o indicador no site do Banco Mundial (para o leitor confirmar). */
  readonly fonteUrl: string;
}

export interface PainelIndicadores {
  readonly pais: PaisNews;
  readonly itens: readonly IndicadorPais[];
  readonly fonte: 'Banco Mundial — World Development Indicators';
}

const ANOS = 12;
const MAX_PONTOS = 10;
const URL_API = 'https://api.worldbank.org/v2';

/**
 * Só na pré-visualização local de QA (`NEWS_QA_LOCAL=1`), um servidor simulado
 * em loopback pode substituir a API; em produção é sempre o Banco Mundial.
 */
function baseApi(): string {
  const qa = process.env.NEWS_QA_LOCAL === '1' ? process.env.NEWS_BM_URL : undefined;
  return qa && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(qa) ? qa : URL_API;
}

/** Lê a resposta da API (`[meta, linhas]`) e devolve a série limpa, ou null. */
export function lerSerieBM(json: unknown): PontoAno[] | null {
  if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) return null;
  const pontos: PontoAno[] = [];
  for (const l of json[1] as unknown[]) {
    if (!l || typeof l !== 'object') continue;
    const { date, value } = l as { date?: unknown; value?: unknown };
    const ano = Number(date);
    if (!Number.isInteger(ano) || typeof value !== 'number' || !Number.isFinite(value)) continue;
    pontos.push({ ano, valor: value });
  }
  pontos.sort((a, b) => a.ano - b.ano);
  return pontos.length ? pontos.slice(-MAX_PONTOS) : null;
}

export function montarIndicador(def: DefIndicador, serie: readonly PontoAno[], pais: PaisNews): IndicadorPais | null {
  if (serie.length === 0) return null;
  const ultimo = serie[serie.length - 1]!;
  const antes = serie.length > 1 ? serie[serie.length - 2]! : null;
  return {
    def,
    serie,
    ultimo,
    variacao: antes ? ultimo.valor - antes.valor : null,
    fonteUrl: `https://data.worldbank.org/indicator/${def.codigo}?locations=${CODIGO_BM[pais]}`,
  };
}

export interface OpcoesIndicadores {
  readonly fetch?: typeof fetch;
  readonly agora?: () => Date;
  readonly timeoutMs?: number;
}

/**
 * O painel do país para uma lista de indicadores. Cada pedido tem o seu
 * prazo e falha sozinho; com menos de dois indicadores lidos, não há painel
 * (um painel de um número só não informa).
 */
export async function indicadoresDoPais(
  pais: PaisNews,
  codigos: readonly string[],
  o: OpcoesIndicadores = {},
): Promise<PainelIndicadores | null> {
  const ano = (o.agora?.() ?? new Date()).getUTCFullYear();
  const pedir = o.fetch ?? fetch;
  const lidos = await Promise.all(
    codigos.map(async (codigo) => {
      const def = INDICADORES[codigo];
      if (!def) return null;
      const url = `${baseApi()}/country/${CODIGO_BM[pais]}/indicator/${codigo}?format=json&per_page=${ANOS + 2}&date=${ano - ANOS}:${ano}`;
      try {
        const res = await pedir(url, {
          redirect: 'error',
          signal: AbortSignal.timeout(o.timeoutMs ?? 6_000),
          next: { revalidate: 86_400 },
        } as RequestInit);
        if (!res.ok) return null;
        const serie = lerSerieBM(await res.json());
        return serie ? montarIndicador(def, serie, pais) : null;
      } catch {
        return null;
      }
    }),
  );
  const itens = lidos.filter((x): x is IndicadorPais => x !== null);
  return itens.length >= 2 ? { pais, itens, fonte: 'Banco Mundial — World Development Indicators' } : null;
}

/** O formato de um valor de indicador, com a unidade. */
export function formatarIndicador(v: number, def: DefIndicador, idioma: 'pt' | 'en'): string {
  const loc = idioma === 'en' ? 'en-GB' : 'pt-PT';
  if (def.unidade === 'pessoas') {
    const m = v / 1e6;
    return idioma === 'en' ? `${m.toLocaleString(loc, { maximumFractionDigits: 1 })} million` : `${m.toLocaleString(loc, { maximumFractionDigits: 1 })} milhões`;
  }
  const n = v.toLocaleString(loc, { minimumFractionDigits: def.casas, maximumFractionDigits: def.casas });
  if (def.unidade === 'US$') return `US$ ${n}`;
  if (def.unidade === '%') return `${n}%`;
  if (def.unidade === '% PIB') return idioma === 'en' ? `${n}% of GDP` : `${n}% do PIB`;
  if (def.unidade === 'por 100') return idioma === 'en' ? `${n} per 100` : `${n} por 100`;
  return n;
}

/** Variação com sinal; nos % é em pontos percentuais. */
export function formatarVariacao(d: number, def: DefIndicador, idioma: 'pt' | 'en'): string {
  const loc = idioma === 'en' ? 'en-GB' : 'pt-PT';
  const sinal = d > 0 ? '+' : d < 0 ? '−' : '±';
  const n = Math.abs(d).toLocaleString(loc, { minimumFractionDigits: def.casas, maximumFractionDigits: def.casas });
  if (def.unidade === '%' || def.unidade === '% PIB') return `${sinal}${n} p.p.`;
  if (def.unidade === 'US$') return `${sinal}US$ ${n}`;
  return `${sinal}${n}`;
}

/**
 * Os indicadores em texto simples, para o pedido ao Kimi e para a conferência
 * dos números: cada valor aparece aqui exactamente como pode ser citado.
 */
export function indicadoresEmTexto(p: PainelIndicadores): string {
  return p.itens
    .map((i) => {
      const s = i.serie.map((x) => `${x.ano}: ${arredondar(x.valor, i.def.casas)}`).join('; ');
      return `- ${i.def.en} [${i.def.codigo}] (${i.def.unidade}): ${s}`;
    })
    .join('\n');
}

export function arredondar(v: number, casas: number): string {
  return v.toFixed(casas);
}
