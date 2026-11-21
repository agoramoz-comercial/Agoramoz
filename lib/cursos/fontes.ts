import { LIMITES, type Fonte, type Passagem } from './modelo';

/**
 * As fontes, partidas em passagens citáveis (D-49).
 *
 * Uma passagem é um ou mais parágrafos seguidos, até ~1 200 caracteres,
 * nunca partindo uma frase a meio quando se pode evitar. O número da passagem
 * é estável para o mesmo texto: o curso cita `F2.14` e qualquer pessoa pode
 * ir ver o que lá está.
 */

function frases(p: string): string[] {
  return p.split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ý0-9«"“(])/u).filter(Boolean);
}

export function partirEmPassagens(texto: string, idFonte: string, max: number = LIMITES.passagem): Passagem[] {
  const paragrafos = texto
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n|\n(?=#{1,6}\s)|\n(?=[-•*]\s)/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);

  const pedacos: string[] = [];
  let actual = '';
  const fechar = () => {
    if (actual.trim()) pedacos.push(actual.trim());
    actual = '';
  };
  for (const p of paragrafos) {
    if (p.length > max) {
      fechar();
      // Parágrafo enorme: parte-se por frases; uma frase enorme, por palavras.
      let parte = '';
      for (const f of frases(p)) {
        if ((parte + ' ' + f).length > max && parte) {
          pedacos.push(parte.trim());
          parte = '';
        }
        if (f.length > max) {
          for (let i = 0; i < f.length; i += max) pedacos.push(f.slice(i, i + max));
        } else parte += ` ${f}`;
      }
      if (parte.trim()) pedacos.push(parte.trim());
      continue;
    }
    if ((actual + '\n' + p).length > max) fechar();
    actual = actual ? `${actual}\n${p}` : p;
  }
  fechar();
  return pedacos.slice(0, 2_000).map((t, i) => ({ id: `${idFonte}.${i + 1}`, texto: t }));
}

export function criarFonte(
  n: number,
  titulo: string,
  tipo: Fonte['tipo'],
  texto: string,
  extra: Pick<Fonte, 'url' | 'origem'> = {},
): Fonte {
  const id = `F${n}`;
  return {
    id,
    titulo: titulo.slice(0, LIMITES.curto),
    tipo,
    ...(extra.url ? { url: extra.url } : {}),
    ...(extra.origem ? { origem: extra.origem } : {}),
    passagens: partirEmPassagens(texto.slice(0, LIMITES.caracteresPorFonte), id),
  };
}

/** Todas as passagens, por id. */
export function indicePassagens(fontes: readonly Fonte[]): Map<string, string> {
  return new Map(fontes.flatMap((f) => f.passagens.map((p) => [p.id, p.texto] as const)));
}

/**
 * O que segue para o motor planear: o começo de cada passagem (o motor vê
 * o mapa das fontes, não o texto todo), até um tecto. Sem texto, não há plano.
 */
export function indiceParaPlanear(fontes: readonly Fonte[], tecto = 40_000): string {
  const linhas: string[] = [];
  let total = 0;
  for (const f of fontes) {
    linhas.push(`# ${f.id} — ${f.titulo}`);
    for (const p of f.passagens) {
      const l = `[${p.id}] ${p.texto.slice(0, 220).replace(/\s+/g, ' ')}${p.texto.length > 220 ? '…' : ''}`;
      if (total + l.length > tecto) return [...linhas, '(…índice cortado no tecto)'].join('\n');
      linhas.push(l);
      total += l.length;
    }
  }
  return linhas.join('\n');
}

/**
 * Os números de um texto em inglês: vírgula nos milhares, ponto decimal
 * («2,500 km» → 2500, «US$ 6.2 billion» → 6.2, «3.4%» → 3.4).
 */
export function numerosIngles(s: string): number[] {
  return [...s.matchAll(/(?<![\w.,])(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?/g)].map((m) =>
    Number(`${m[1]!.replace(/,/g, '')}${m[2] ? `.${m[2]}` : ''}`),
  );
}

/**
 * Confere uma tradução: cada número da passagem traduzida tem de existir no
 * original. Devolve os que faltam (lista vazia = tradução numericamente fiel).
 */
export function numerosForaDoOriginal(traducao: string, original: string, numerosPt: (s: string) => { valor: number }[]): number[] {
  const orig = numerosIngles(original);
  return numerosPt(traducao)
    .map((n) => n.valor)
    .filter((v) => !orig.some((o) => Math.abs(o - v) < 1e-9));
}
