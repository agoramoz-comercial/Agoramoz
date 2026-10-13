import { describe, expect, it } from 'vitest';
import { abaixo, detectarNivel, minimo, nivelEfectivo, ORCAMENTO, type Sinais } from './qualidade';

const portatil: Sinais = { memoriaGB: 8, nucleos: 4, ponteiroGrosso: false, poupancaDados: false };

describe('níveis de qualidade 3D', () => {
  it('portátil comum fica em Normal', () => {
    expect(detectarNivel(portatil)).toBe('normal');
  });

  it('poupança de dados ganha a tudo: Leve', () => {
    expect(detectarNivel({ ...portatil, memoriaGB: 16, nucleos: 16, poupancaDados: true })).toBe('leve');
  });

  it('4 GB ou menos: Leve', () => {
    expect(detectarNivel({ ...portatil, memoriaGB: 4 })).toBe('leve');
    expect(detectarNivel({ ...portatil, memoriaGB: 2 })).toBe('leve');
  });

  it('telemóvel com 4 núcleos ou sem dizer quantos: Leve; com 8: Normal', () => {
    expect(detectarNivel({ ponteiroGrosso: true, poupancaDados: false, nucleos: 4 })).toBe('leve');
    expect(detectarNivel({ ponteiroGrosso: true, poupancaDados: false })).toBe('leve');
    expect(detectarNivel({ ponteiroGrosso: true, poupancaDados: false, nucleos: 8, memoriaGB: 8 })).toBe('normal');
  });

  it('Alta só com 8 GB, 8 núcleos e rato; sinais em falta não sobem o nível', () => {
    expect(detectarNivel({ ...portatil, nucleos: 8 })).toBe('alta');
    expect(detectarNivel({ ponteiroGrosso: false, poupancaDados: false, nucleos: 12 })).toBe('normal');
    expect(detectarNivel({ ...portatil, nucleos: 8, ponteiroGrosso: true })).toBe('normal');
  });

  it('a escolha manual ganha à automática', () => {
    expect(nivelEfectivo('alta', { ...portatil, memoriaGB: 2 })).toBe('alta');
    expect(nivelEfectivo('leve', { ...portatil, nucleos: 16 })).toBe('leve');
    expect(nivelEfectivo('auto', portatil)).toBe('normal');
  });

  it('descer um degrau e o mínimo de dois níveis', () => {
    expect(abaixo('alta')).toBe('normal');
    expect(abaixo('normal')).toBe('leve');
    expect(abaixo('leve')).toBe('leve');
    expect(minimo('alta', 'normal')).toBe('normal');
    expect(minimo('leve', 'alta')).toBe('leve');
  });

  it('Leve não descarrega modelos nem faz sombras; os tectos crescem com o nível', () => {
    expect(ORCAMENTO.leve.modelos).toBe(false);
    expect(ORCAMENTO.leve.sombras).toBe(0);
    expect(ORCAMENTO.leve.triangulos).toBeLessThan(ORCAMENTO.normal.triangulos);
    expect(ORCAMENTO.normal.triangulos).toBeLessThan(ORCAMENTO.alta.triangulos);
    expect(ORCAMENTO.normal.dpr[1]).toBeLessThanOrEqual(1.5);
  });
});
