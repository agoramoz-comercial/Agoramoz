import {
  COUNTRIES,
  COUNTRY_CODES,
  GLOBAL_CODES,
  GLOBAL_MARKETS,
  SECTOR_LABELS,
  isCountryCode,
  isGlobalCode,
} from '@/content/registry';
import type { Currency, InvestmentBand } from '@/content/types';

/**
 * A porta única do diagnóstico para qualquer mercado.
 *
 * O formulário, a pontuação, a evidência e o consentimento precisam das mesmas
 * cinco coisas sobre um mercado: nome, moeda, faixas, setores e o texto que a
 * pessoa aceita. Existem dois donos desses dados — `COUNTRIES` (os três
 * mercados de operação) e `GLOBAL_MARKETS` (os dez de expansão) — e esta
 * função LÊ de ambos. Não copia nada: não é uma terceira fonte de verdade, é a
 * única forma de a pedir. Sem ela, cada consumidor teria o seu `if` entre os
 * dois registos, e o dia em que um deles se esquecesse de um lado seria o dia
 * em que um lead suíço dava erro no servidor.
 *
 * Os textos saem em português porque o formulário é, por agora, português. O
 * consentimento guardado tem de ser o que a pessoa VIU.
 */

export const DIAGNOSTIC_CODES = [...COUNTRY_CODES, ...GLOBAL_CODES] as const;
export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number];

export interface MercadoDiagnostico {
  readonly code: DiagnosticCode;
  readonly name: string;
  readonly currency: Currency;
  readonly dialCode: string;
  readonly consentText: string;
  readonly policyHref: string;
  readonly investmentBands: readonly InvestmentBand[];
  readonly sectors: readonly { readonly slug: string; readonly label: string }[];
  /** Mercado onde operamos (`true`) ou de expansão (`false`). */
  readonly operacao: boolean;
}

export function ehCodigoDeDiagnostico(valor: string): valor is DiagnosticCode {
  return (DIAGNOSTIC_CODES as readonly string[]).includes(valor);
}

export function mercadoDoDiagnostico(code: string): MercadoDiagnostico | null {
  if (isCountryCode(code)) {
    const c = COUNTRIES[code];
    return {
      code,
      name: c.name,
      currency: c.currency,
      dialCode: c.dialCode,
      consentText: c.consent.text,
      policyHref: c.consent.policyHref,
      investmentBands: c.investmentBands,
      sectors: c.sectors.map((s) => ({ slug: s, label: SECTOR_LABELS[s] })),
      operacao: true,
    };
  }
  if (isGlobalCode(code)) {
    const m = GLOBAL_MARKETS[code];
    return {
      code,
      name: m.name.pt,
      currency: m.currency,
      dialCode: m.dialCode,
      consentText: m.consent.text.pt,
      policyHref: m.consent.policyHref,
      investmentBands: m.investmentBands,
      sectors: m.sectors.map((s) => ({ slug: s.slug, label: s.name.pt })),
      operacao: false,
    };
  }
  return null;
}
