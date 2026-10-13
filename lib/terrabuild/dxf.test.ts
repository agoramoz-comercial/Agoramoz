import DxfParser from 'dxf-parser';
import { describe, expect, it } from 'vitest';
import { CASA_REFERENCIA, FAZENDA_001 as P } from '@/content/projetos/fazenda-inteligente-001';
import { implantacaoDxf, plantaCasaDxf } from './dxf';
import { plantaCasa } from './planta';

type Entidade = { type: string; layer: string; vertices?: { x: number; y: number }[]; text?: string };

function ler(texto: string) {
  const dxf = new DxfParser().parseSync(texto) as unknown as {
    header: Record<string, unknown>;
    tables: { layer: { layers: Record<string, unknown> } };
    entities: Entidade[];
  };
  const porCamada = (c: string) => dxf.entities.filter((e) => e.layer === c);
  return { dxf, porCamada };
}

describe('DXF (AutoCAD) da planta da casa', () => {
  it('abre num leitor DXF, em metros, com as camadas da planta', async () => {
    const { dxf, porCamada } = ler(await plantaCasaDxf(CASA_REFERENCIA));
    expect(dxf.header.$INSUNITS).toBe(6); // 6 = metros
    for (const c of ['PAREDES', 'DIVISORIAS', 'JANELAS', 'PORTAS', 'COTAS', 'TEXTO']) {
      expect(dxf.tables.layer.layers, c).toHaveProperty(c);
      expect(porCamada(c).length, c).toBeGreaterThan(0);
    }
  });

  it('a parede exterior mede o comprimento e a largura escolhidos', async () => {
    const casa = { ...CASA_REFERENCIA, comprimento: 12.5, largura: 8 };
    const { porCamada } = ler(await plantaCasaDxf(casa));
    const xs = porCamada('PAREDES').flatMap((e) => (e.vertices ?? []).map((v) => v.x));
    const ys = porCamada('PAREDES').flatMap((e) => (e.vertices ?? []).map((v) => v.y));
    expect(Math.min(...xs)).toBeCloseTo(0);
    expect(Math.max(...xs)).toBeCloseTo(12.5);
    expect(Math.max(...ys)).toBeCloseTo(8);
  });

  it('desenha cada janela e cada porta do esquema (as mesmas do construtor)', async () => {
    const pl = plantaCasa(CASA_REFERENCIA);
    const { porCamada } = ler(await plantaCasaDxf(CASA_REFERENCIA));
    // Por janela: o vão (rectângulo) e o vidro (linha). Por porta: a folha e o arco.
    expect(porCamada('JANELAS').length).toBe(pl.janelas.length * 2);
    expect(porCamada('PORTAS').filter((e) => e.type === 'ARC').length).toBe(pl.portas.length);
  });

  it('textos sem acentos (há leitores de DXF que não lêem UTF-8)', async () => {
    const texto = await implantacaoDxf(P, CASA_REFERENCIA);
    expect(/[^\x00-\x7f]/.test(texto)).toBe(false);
  });
});

describe('DXF (AutoCAD) da implantação', () => {
  it('tem o limite do terreno com as medidas do projeto', async () => {
    const { porCamada } = ler(await implantacaoDxf(P, CASA_REFERENCIA));
    const limite = porCamada('LIMITE').find((e) => (e.vertices?.length ?? 0) === 4)!;
    expect(Math.max(...limite.vertices!.map((v) => v.x))).toBeCloseTo(P.terreno.largura);
    expect(Math.max(...limite.vertices!.map((v) => v.y))).toBeCloseTo(P.terreno.profundidade);
  });

  it('tem estradas, construções, talhões, água, electricidade e curvas de nível', async () => {
    const { porCamada } = ler(await implantacaoDxf(P, CASA_REFERENCIA));
    for (const c of ['ESTRADAS', 'CONSTRUCOES', 'TALHOES', 'AGUA', 'ELETRICA', 'CURVAS', 'TEXTO']) expect(porCamada(c).length, c).toBeGreaterThan(0);
    const talhoes = P.elementos.filter((e) => e.camada === 'talhoes' && e.forma.tipo === 'area').length;
    expect(porCamada('TALHOES').filter((e) => e.type === 'LWPOLYLINE' || e.type === 'POLYLINE').length).toBeGreaterThanOrEqual(talhoes);
  });

  it('a casa principal sai na posição escolhida no construtor, não na de referência', async () => {
    const casa = { ...CASA_REFERENCIA, x: 120, y: 200 };
    const { porCamada } = ler(await implantacaoDxf(P, casa));
    const centros = porCamada('CONSTRUCOES')
      .filter((e) => e.vertices?.length === 4)
      .map((e) => [e.vertices!.reduce((s, v) => s + v.x, 0) / 4, e.vertices!.reduce((s, v) => s + v.y, 0) / 4]);
    expect(centros.some(([x, y]) => Math.abs(x! - 120) < 0.01 && Math.abs(y! - 200) < 0.01)).toBe(true);
  });
});
