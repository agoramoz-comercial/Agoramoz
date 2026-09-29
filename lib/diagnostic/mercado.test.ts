import { describe, expect, it } from 'vitest';
import { GLOBAL_CODES, GLOBAL_MARKETS } from '@/content/registry';
import { leadSchema } from '@/lib/forms/lead-schema';
import { consentTextFor, consentVersionFor } from './consent';
import {
  DIAGNOSTIC_CODES,
  ehCodigoDeDiagnostico,
  mercadoDoDiagnostico,
  nomeDoMercado,
  rotuloDoSetor,
} from './mercado';

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
        // Nos dois idiomas: «5 000 CHF» e «CHF 5,000».
        expect(b.label.pt, `${c}/${b.id}/pt`).toContain(m.currency);
        expect(b.label.en, `${c}/${b.id}/en`).toContain(m.currency);
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

describe('rótulos para o painel interno', () => {
  it('o setor lê-se no mercado do lead, não no rótulo genérico', () => {
    // `logistica` existe no registo genérico e nos EAU com nomes diferentes.
    expect(rotuloDoSetor('ae', 'logistica')).toBe('Logística e aviação');
    expect(rotuloDoSetor(null, 'logistica')).toBe('Logística e transportes');
  });

  it('um setor global aparece com nome, não com slug', () => {
    const slug = GLOBAL_MARKETS.ch.sectors[0]!.slug;
    expect(rotuloDoSetor('ch', slug)).toBe(GLOBAL_MARKETS.ch.sectors[0]!.name.pt);
  });

  it('nada desconhecido lança: devolve o que foi guardado', () => {
    expect(rotuloDoSetor('xx', 'inventado')).toBe('inventado');
    expect(nomeDoMercado('xx')).toBe('xx');
    expect(nomeDoMercado(null)).toBe('—');
    expect(nomeDoMercado('ch')).toBe('Suíça');
  });
});

describe('o consentimento guardado é o mostrado', () => {
  /**
   * O formulário mostra `mercadoDoDiagnostico(c, idioma).consentText`; o
   * servidor guarda `consentTextFor(c, idioma)`. Têm de ser o mesmo texto,
   * byte a byte, nos treze mercados e nos dois idiomas — e os dois idiomas têm
   * de ser textos diferentes, senão o inglês é português copiado.
   */
  it('13 mercados × 2 idiomas', () => {
    for (const c of DIAGNOSTIC_CODES) {
      for (const idioma of ['pt', 'en'] as const) {
        expect(consentTextFor(c, idioma), `${c}/${idioma}`).toBe(mercadoDoDiagnostico(c, idioma)!.consentText);
      }
      expect(consentTextFor(c, 'en'), c).not.toBe(consentTextFor(c, 'pt'));
    }
  });

  it('em inglês, nomes, setores e faixas saem em inglês', () => {
    const mz = mercadoDoDiagnostico('mz', 'en')!;
    expect(mz.name).toBe('Mozambique');
    expect(mz.sectors.find((s) => s.slug === 'energia-mineracao')?.label).toBe('Energy, mining and industrial services');
    expect(mz.investmentBands[0]!.label).toBe('Up to MZN 250,000');
    expect(mercadoDoDiagnostico('ch', 'en')!.name).toBe('Switzerland');
  });

  it('por omissão, português — nada do que já existia muda', () => {
    expect(mercadoDoDiagnostico('mz')!.investmentBands[0]!.label).toBe('Até 250 000 MZN');
    expect(mercadoDoDiagnostico('mz')!.name).toBe('Moçambique');
  });
});

describe('o consentimento cabe na base', () => {
  /**
   * `consent_records` só aceita texto de 1 a 4000 caracteres e versão até 40
   * (`0002_crm.sql`). Um texto ou versão fora disso é uma transacção abortada e
   * um 503 para quem acabou de preencher cinco passos — nos 13 mercados e nos
   * dois idiomas, sem excepção.
   */
  it('13 mercados × 2 idiomas dentro dos limites de consent_records', async () => {
    for (const c of DIAGNOSTIC_CODES) {
      for (const idioma of ['pt', 'en'] as const) {
        const texto = consentTextFor(c, idioma);
        const versao = await consentVersionFor(c, idioma);
        expect(texto.length, `${c}/${idioma}`).toBeGreaterThan(0);
        expect(texto.length, `${c}/${idioma}`).toBeLessThanOrEqual(4000);
        expect(versao.length, `${c}/${idioma}: ${versao}`).toBeLessThanOrEqual(40);
      }
      expect(await consentVersionFor(c, 'en')).not.toBe(await consentVersionFor(c, 'pt'));
    }
  });
});
