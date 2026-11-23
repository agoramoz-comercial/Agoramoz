import type { ArtigoDaLista, SeccaoJornal } from './artigo';
import { SECCOES_JORNAL } from './artigo';
import type { PaisNews } from './paises';
import { EVIDENCIAS, type AnaliseProfunda, type Evidencia } from './profunda';

/**
 * Contagens para os gráficos do News. Tudo é contado sobre o que a base
 * devolveu: nada se estima, nada se arredonda para «parecer» melhor. Sem
 * dados, devolve-se vazio — e o gráfico não aparece.
 */

export interface Contagem<K extends string = string> {
  readonly chave: K;
  readonly n: number;
}

export function porPais(lista: readonly ArtigoDaLista[]): Contagem<PaisNews>[] {
  const m = new Map<PaisNews, number>();
  for (const a of lista) if (a.pais) m.set(a.pais, (m.get(a.pais) ?? 0) + 1);
  return [...m].map(([chave, n]) => ({ chave, n })).sort((a, b) => b.n - a.n || a.chave.localeCompare(b.chave));
}

export function porSeccao(lista: readonly ArtigoDaLista[]): Contagem<SeccaoJornal>[] {
  return SECCOES_JORNAL.map((chave) => ({ chave, n: lista.filter((a) => a.seccao === chave).length })).filter(
    (c) => c.n > 0,
  );
}

/** Por mês de publicação (AAAA-MM, hora de Maputo), do mais antigo para o mais recente. */
export function porMes(lista: readonly ArtigoDaLista[]): Contagem[] {
  const m = new Map<string, number>();
  for (const a of lista) {
    const d = new Date(a.publicado_em);
    if (Number.isNaN(d.getTime())) continue;
    const mes = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo', year: 'numeric', month: '2-digit' })
      .format(d)
      .slice(0, 7);
    m.set(mes, (m.get(mes) ?? 0) + 1);
  }
  return [...m].map(([chave, n]) => ({ chave, n })).sort((a, b) => a.chave.localeCompare(b.chave));
}

/** As mais gostadas (só as que têm pelo menos um gosto). */
export function maisGostadas(lista: readonly ArtigoDaLista[], max = 5): ArtigoDaLista[] {
  return lista
    .filter((a) => a.gostos > 0)
    .slice()
    .sort((a, b) => b.gostos - a.gostos || b.publicado_em.localeCompare(a.publicado_em))
    .slice(0, max);
}

/** Quantas afirmações da análise profunda têm cada nível de evidência. */
export function porEvidencia(a: AnaliseProfunda): Contagem<Evidencia>[] {
  const todas = [a.impacto, ...a.sectores, ...a.riscos, ...a.oportunidades];
  return EVIDENCIAS.map((chave) => ({ chave, n: todas.filter((x) => x.evidencia === chave).length }));
}

export function porProbabilidade(a: AnaliseProfunda): Contagem<'alta' | 'media' | 'baixa'>[] {
  return (['alta', 'media', 'baixa'] as const).map((chave) => ({
    chave,
    n: a.riscos.filter((r) => r.probabilidade === chave).length,
  }));
}

export function porEfeito(a: AnaliseProfunda): Contagem<'positivo' | 'negativo' | 'misto' | 'incerto'>[] {
  return (['positivo', 'negativo', 'misto', 'incerto'] as const).map((chave) => ({
    chave,
    n: a.sectores.filter((s) => s.efeito === chave).length,
  }));
}

/** Gatilhos de cada cenário (o cenário retirado por números inventados fica `null`). */
export function gatilhosPorCenario(a: AnaliseProfunda): Contagem<'base' | 'optimista' | 'pessimista'>[] {
  return (['pessimista', 'base', 'optimista'] as const).flatMap((chave) => {
    const c = a.cenarios[chave];
    return c ? [{ chave, n: c.gatilhos.length }] : [];
  });
}

/** Total de uma lista de contagens. */
export const total = (c: readonly Contagem[]) => c.reduce((s, x) => s + x.n, 0);
