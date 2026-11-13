import { describe, expect, it } from 'vitest';
import { csvFacturacao, diasDesde, estadoDe, filtrar, lerFiltro, nomeFicheiroFacturacao, totais, type LinhaFacturacao } from './facturacao';

const AGORA = new Date('2026-11-13T12:00:00Z');
const base = (x: Partial<LinhaFacturacao>): LinhaFacturacao => ({
  dealId: '00000000-0000-4000-8000-000000000001',
  cliente: 'Cliente de exemplo',
  contacto: 'Pessoa de exemplo',
  responsavel: 'Ana',
  ganhaEm: '2026-11-10T09:00:00Z',
  valor: 1_735_000,
  moeda: 'MZN',
  factura: null,
  ...x,
});
const factura = (estado: 'facturada' | 'anulada', extra = {}) => ({
  estado,
  numero: 'FT 2026/001',
  data: '2026-11-12',
  valor: 1_700_000,
  moeda: 'MZN',
  nota: null,
  motivoAnulacao: estado === 'anulada' ? 'Erro no valor' : null,
  revisao: 1,
  ...extra,
});

const LINHAS: LinhaFacturacao[] = [
  base({ dealId: 'a' }),
  base({ dealId: 'b', valor: 5_000, moeda: 'USD', ganhaEm: '2026-10-01T09:00:00Z' }),
  base({ dealId: 'c', valor: null, moeda: null }),
  base({ dealId: 'd', factura: factura('facturada') }),
  base({ dealId: 'e', factura: factura('anulada') }),
  base({ dealId: 'f', factura: factura('facturada', { data: '2026-10-30', valor: 10, moeda: 'USD', numero: 'FT 2026/000' }) }),
];

describe('a fila «A facturar»', () => {
  it('uma ganha sem factura válida está por facturar; uma anulada volta à fila', () => {
    expect(LINHAS.map(estadoDe)).toEqual(['por-facturar', 'por-facturar', 'por-facturar', 'facturada', 'por-facturar', 'facturada']);
  });

  it('filtros', () => {
    expect(filtrar(LINHAS, 'por-facturar').map((l) => l.dealId)).toEqual(['a', 'b', 'c', 'e']);
    expect(filtrar(LINHAS, 'facturadas').map((l) => l.dealId)).toEqual(['d', 'f']);
    expect(filtrar(LINHAS, 'todas')).toHaveLength(6);
    expect(lerFiltro('x')).toBe('por-facturar');
  });

  it('totais por moeda (nunca somados entre moedas), sem valor contado à parte, e atrasadas', () => {
    expect(totais(LINHAS, AGORA)).toEqual({
      porFacturar: { n: 4, semValor: 1, porMoeda: { MZN: 3_470_000, USD: 5_000 } },
      facturadoNoMes: { n: 1, porMoeda: { MZN: 1_700_000 } },
      atrasadas: 1,
    });
    expect(diasDesde('2026-11-10T09:00:00Z', AGORA)).toBe(3);
  });
});

describe('CSV para o contabilista', () => {
  const csv = csvFacturacao(LINHAS);
  const linhas = csv.replace(/^﻿/, '').split('\r\n').filter(Boolean);

  it('BOM, separador «;», uma linha por oportunidade, sem linhas em branco', () => {
    expect(csv.startsWith('﻿')).toBe(true);
    expect(linhas).toHaveLength(7);
    expect(linhas[0]).toContain('Estado;Cliente;Contacto');
  });

  it('facturada leva número, data e valor; anulada leva o motivo e volta a «Por facturar»', () => {
    expect(linhas[4]).toContain('Facturada;');
    expect(linhas[4]).toContain('FT 2026/001;2026-11-12;1700000.00;MZN');
    expect(linhas[5]).toMatch(/^Por facturar;/);
    expect(linhas[5]).toContain('FT 2026/001: Erro no valor');
  });

  it('um nome que começa por «=» não vira fórmula no Excel', () => {
    const perigo = csvFacturacao([base({ cliente: '=HYPERLINK("http://mal")' })]);
    expect(perigo).toContain(`"'=HYPERLINK(""http://mal"")"`);
  });

  it('nome do ficheiro com a data de Maputo', () => {
    expect(nomeFicheiroFacturacao(new Date('2026-11-13T23:30:00Z'))).toBe('a-facturar-2026-11-14.csv');
  });
});
