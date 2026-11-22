import { NOME_MERCADO, ROTULO_SETOR, SETOR_GLOBAL, traduzirFaixa } from '@/content/i18n/formulario';
import type { Lingua, SectorSlug } from '@/content/types';
import { mercadoDoDiagnostico, type MercadoDiagnostico } from '@/lib/diagnostic/mercado';
import { idiomaBase } from '@/lib/i18n/texto';

/**
 * O mercado do diagnóstico na língua de leitura.
 *
 * Os dados vêm SEMPRE de `mercadoDoDiagnostico` no idioma-base (português ou
 * inglês) — a mesma porta que o servidor usa. Em fr, es, de e ar só se trocam
 * os rótulos que a pessoa lê: nome do mercado, setores e as palavras das
 * faixas. O texto de consentimento NÃO se troca: fica na versão que o
 * servidor guarda (ver `CONSENTIMENTO_LINGUA`). Ids, slugs, moedas e pesos
 * nunca mudam.
 */
export function mercadoNaLingua(code: string, lingua: Lingua): MercadoDiagnostico | null {
  const base = mercadoDoDiagnostico(code, idiomaBase(lingua));
  if (!base || lingua === 'pt' || lingua === 'en') return base;
  return {
    ...base,
    name: NOME_MERCADO[base.code]?.[lingua] ?? base.name,
    investmentBands: base.investmentBands.map((b) => ({ ...b, label: traduzirFaixa(b.label, lingua) })),
    sectors: base.sectors.map((s) => {
      const operacao = base.operacao ? ROTULO_SETOR[s.slug as SectorSlug]?.[lingua] : undefined;
      return { ...s, label: operacao ?? SETOR_GLOBAL[s.label]?.[lingua] ?? s.label };
    }),
  };
}
