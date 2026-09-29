import { describe, expect, it } from 'vitest';
import { GLOBAL_CODES, GLOBAL_MARKETS } from '@/content/registry';
import { leadSchema } from '@/lib/forms/lead-schema';
import { consentTextFor } from './consent';
import { DIAGNOSTIC_CODES, ehCodigoDeDiagnostico, mercadoDoDiagnostico } from './mercado';

/**
 * A porta única tem de responder pelos treze mercados, com a mesma forma. Se
 * um mercado ficar de fora, o sintoma não é um erro de compilação — é um lead
 * desse país a dar 500 no servidor, porque `consentTextFor` lança.
 */
describe('mercadoDoDiagnostico', () => {
  it('resolve os treze códigos', () => {
    expect(DIAGNOSTIC_CODES).toHaveLength(13);
    for (const c of DIAGNOSTIC_CODES) expect(mercadoDoDiagnostico(c)?.code, c).toBe(c);
  });

  it('recusa o que não existe', () => {
    expect(mercadoDoDiagnostico('xx')).toBeNull();
    expect(ehCodigoDeDiagnostico('ch')).toBe(true);
    expect(ehCodigoDeDiagnostico('es')).toBe(false);
  });

  it('distingue operação de expansão', () => {
    expect(mercadoDoDiagnostico('mz')?.operacao).toBe(true);
    expect(mercadoDoDiagnostico('ch')?.operacao).toBe(false);
  });

  it('cada mercado tem consentimento, setores e cinco faixas', () => {
    for (const c of DIAGNOSTIC_CODES) {
      const m = mercadoDoDiagnostico(c)!;
      expect(m.consentText.length, c).toBeGreaterThan(80);
      expect(m.sectors.length, c).toBeGreaterThan(0);
      expect(m.investmentBands, c).toHaveLength(5);
      expect(m.dialCode, c).toMatch(/^\+\d{1,4}$/);
    }
  });

  /**
   * «Nunca convertidas de outra.» Uma faixa com a moeda errada seria a pior
   * forma de erro: parece certa, e está errada num fator de 18 (MZN/EUR) ou de
   * 20 (ZAR/USD).
   */
  it('nenhuma faixa global está noutra moeda que não a do seu mercado', () => {
    for (const c of GLOBAL_CODES) {
      const m = GLOBAL_MARKETS[c];
      for (const b of m.investmentBands) {
        if (b.id.endsWith('-0')) continue; // «Ainda a definir»
        expect(b.label, `${c}/${b.id}`).toContain(m.currency);
      }
    }
  });

  it('os pesos seguem a escala dos mercados de operação', () => {
    const escala = mercadoDoDiagnostico('pt')!.investmentBands.map((b) => b.scoreWeight).sort();
    for (const c of GLOBAL_CODES) {
      const pesos = GLOBAL_MARKETS[c].investmentBands.map((b) => b.scoreWeight).sort();
      expect(pesos, c).toEqual(escala);
    }
  });

  it('o consentimento de um mercado global não lança', () => {
    for (const c of GLOBAL_CODES) expect(() => consentTextFor(c)).not.toThrow();
  });

  it('o formulário aceita um mercado global', () => {
    const r = leadSchema.shape.country.safeParse('ch');
    expect(r.success).toBe(true);
    expect(leadSchema.shape.country.safeParse('xx').success).toBe(false);
  });
});
