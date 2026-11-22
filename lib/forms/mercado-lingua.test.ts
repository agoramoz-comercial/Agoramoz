import { describe, expect, it } from 'vitest';
import { LINGUAS } from '@/lib/i18n/texto';
import { DIAGNOSTIC_CODES, mercadoDoDiagnostico } from '@/lib/diagnostic/mercado';
import { CONSEQUENCIAS, FORM, OBJETIVOS, PAPEIS, PERGUNTAS, PRAZOS, TAMANHOS, VALIDACAO } from '@/content/i18n/formulario';
import { DIAGNOSTICO } from '@/content/i18n/diagnostico';
import { leadSchemaPara } from './lead-schema';
import { mercadoNaLingua } from './mercado-lingua';

const QUATRO = ['fr', 'es', 'de', 'ar'] as const;
/** Palavras que são legitimamente iguais ao inglês nessa língua. */
const IGUAIS = new Set([
  'fr:Mozambique', 'es:Mozambique', 'fr:Portugal', 'es:Portugal', 'de:Portugal',
  'fr:France', 'fr:Canada', 'fr:Construction',
]);

describe('diagnóstico nas seis línguas', () => {
  it('cada mercado tem nome, setores e faixas traduzidos nas quatro línguas novas', () => {
    const emIngles: string[] = [];
    for (const code of DIAGNOSTIC_CODES) {
      const en = mercadoDoDiagnostico(code, 'en')!;
      for (const l of QUATRO) {
        const m = mercadoNaLingua(code, l)!;
        if (m.name === en.name && !IGUAIS.has(`${l}:${en.name}`)) emIngles.push(`${code}.${l}.nome`);
        m.sectors.forEach((s, i) => {
          if (s.label === en.sectors[i]!.label && !IGUAIS.has(`${l}:${s.label}`))
            emIngles.push(`${code}.${l}.setor:${s.slug}`);
        });
        m.investmentBands.forEach((b, i) => {
          const original = en.investmentBands[i]!.label;
          const soMontantes = !/^(Up to|Over|Not yet)/.test(original);
          if (!soMontantes && b.label === original) emIngles.push(`${code}.${l}.faixa:${b.id}`);
        });
      }
    }
    expect(emIngles).toEqual([]);
  });

  it('nada do que o servidor lê muda com a língua', () => {
    for (const code of DIAGNOSTIC_CODES) {
      const en = mercadoDoDiagnostico(code, 'en')!;
      for (const l of QUATRO) {
        const m = mercadoNaLingua(code, l)!;
        expect(m.code).toBe(en.code);
        expect(m.currency).toBe(en.currency);
        expect(m.consentText).toBe(en.consentText);
        expect(m.sectors.map((s) => s.slug)).toEqual(en.sectors.map((s) => s.slug));
        expect(m.investmentBands.map((b) => [b.id, b.scoreWeight])).toEqual(
          en.investmentBands.map((b) => [b.id, b.scoreWeight]),
        );
      }
    }
    expect(mercadoNaLingua('mz', 'pt')).toEqual(mercadoDoDiagnostico('mz', 'pt'));
  });

  it('todos os textos do formulário existem nas quatro línguas', () => {
    const grupos = { PERGUNTAS, TAMANHOS, PRAZOS, PAPEIS, OBJETIVOS, CONSEQUENCIAS, FORM, VALIDACAO };
    const faltas: string[] = [];
    for (const [g, obj] of Object.entries(grupos)) {
      for (const [k, v] of Object.entries(obj as Record<string, Record<string, string>>)) {
        for (const l of QUATRO) if (!v[l]?.trim()) faltas.push(`${g}.${k}.${l}`);
      }
    }
    for (const e of DIAGNOSTICO.entregas) for (const l of QUATRO) if (!e[l]) faltas.push(`entregas.${e.pt}.${l}`);
    expect(faltas).toEqual([]);
  });

  it('a validação fala a língua do formulário e as regras não mudam', () => {
    for (const l of LINGUAS) {
      const r = leadSchemaPara(l).safeParse({});
      expect(r.success).toBe(false);
    }
    const fr = leadSchemaPara('fr').safeParse({ country: 'xx' });
    const msgs = fr.success ? [] : fr.error.issues.map((i) => i.message);
    expect(msgs).toContain(VALIDACAO.pais.fr);
    expect(leadSchemaPara('ar')).toBe(leadSchemaPara('ar'));
  });
});
