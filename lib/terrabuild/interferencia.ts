import type { Elemento, Projeto } from '@/content/projetos/tipos';
import { cantos, dentroDe, intersectam, segmentoComoRetangulo, type Poligono } from './geometria';
import type { CasaConfig } from './quantidades';

/**
 * Deteção de interferências da implantação da casa: sobreposição com outra
 * construção, com uma estrada, com um talhão ou com uma rede; afastamento
 * curto; e saída do terreno. É o «clash detection» de um BIM, reduzido a
 * retângulos — o suficiente para mostrar a ideia sem prometer o resto.
 */

export type TipoConflito = 'sobreposicao' | 'afastamento' | 'limite' | 'area-futura';

export interface Conflito {
  readonly tipo: TipoConflito;
  readonly elemento: string;
  readonly nome: string;
  readonly mensagem: string;
}

/** Afastamento mínimo (m) às construções e estradas; às redes enterradas basta não pisar. */
export const AFASTAMENTO = 3;
export const MARGEM_LIMITE = 5;

export function poligonoCasa(c: CasaConfig): Poligono {
  return cantos({ cx: c.x, cy: c.y, w: c.comprimento, d: c.largura, rot: c.rotacao });
}

export function poligonosElemento(e: Elemento): Poligono[] {
  const f = e.forma;
  switch (f.tipo) {
    case 'caixa':
    case 'area':
    case 'painel':
      return [cantos(f.r)];
    case 'cilindro':
      return [cantos({ cx: f.cx, cy: f.cy, w: f.raio * 2, d: f.raio * 2 })];
    case 'linha':
      return f.pontos.slice(1).map((b, i) => cantos(segmentoComoRetangulo(f.pontos[i]!, b, f.largura)));
  }
}

export function interferencias(p: Projeto, casa: CasaConfig): Conflito[] {
  const alvo = poligonoCasa(casa);
  const out: Conflito[] = [];
  if (!dentroDe(alvo, p.terreno.largura, p.terreno.profundidade, MARGEM_LIMITE)) {
    out.push({
      tipo: 'limite',
      elemento: 'vedacao',
      nome: 'Limite do terreno',
      mensagem: `A casa fica a menos de ${MARGEM_LIMITE} m da vedação ou fora do terreno.`,
    });
  }
  for (const e of p.elementos) {
    if (e.id === 'casa-principal' || e.id === 'vedacao') continue;
    const polis = poligonosElemento(e);
    const rede = e.forma.tipo === 'linha' && e.forma.largura < 1;
    if (polis.some((q) => intersectam(alvo, q))) {
      out.push(
        e.futuro
          ? { tipo: 'area-futura', elemento: e.id, nome: e.nome, mensagem: `Ocupa a ${e.nome.toLowerCase()}, reservada para depois.` }
          : {
              tipo: 'sobreposicao',
              elemento: e.id,
              nome: e.nome,
              mensagem: rede ? `Fica por cima da ${e.nome.toLowerCase()}.` : `Sobrepõe-se a: ${e.nome.toLowerCase()}.`,
            },
      );
      continue;
    }
    if (!rede && !e.futuro && e.camada !== 'talhoes' && polis.some((q) => intersectam(alvo, q, AFASTAMENTO))) {
      out.push({ tipo: 'afastamento', elemento: e.id, nome: e.nome, mensagem: `Fica a menos de ${AFASTAMENTO} m de: ${e.nome.toLowerCase()}.` });
    }
  }
  return out;
}
