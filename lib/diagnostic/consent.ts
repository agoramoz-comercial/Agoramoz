import { COUNTRIES } from '@/content/registry';
import type { CountryCode } from '@/content/types';

/**
 * Consentimento: o texto exacto que foi mostrado, e uma versão que o identifica.
 *
 * O texto vem de `content/countries/*.ts` — a MESMA fonte que o formulário
 * renderiza. Não há aqui uma cópia: se houvesse, um dia divergiriam e o que
 * ficaria guardado deixaria de ser o que a pessoa leu, que é precisamente o
 * que um registo de consentimento existe para provar.
 *
 * Os três textos são diferentes de propósito — o de Portugal invoca o RGPD, o
 * do Brasil a LGPD, o de Moçambique fica pelos direitos em termos gerais.
 * Guardar um texto único para os três seria guardar uma coisa que ninguém viu.
 */

/**
 * A versão é derivada do conteúdo, não escrita à mão.
 *
 * Uma versão manual é uma versão que alguém se esquece de subir: o texto muda,
 * o número fica, e os registos passam a dizer que se consentiu uma coisa
 * quando se consentiu outra. Derivando do texto, mudar uma vírgula muda a
 * versão sem ninguém ter de se lembrar.
 */
export async function consentVersionFor(country: CountryCode): Promise<string> {
  const texto = consentTextFor(country);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  const hex = Array.from(new Uint8Array(digest).slice(0, 6))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `consent.${country}.${hex}`;
}

export function consentTextFor(country: CountryCode): string {
  const texto = COUNTRIES[country]?.consent.text;
  if (!texto) {
    // Um país sem texto de consentimento é um erro de conteúdo, não um caso a
    // contornar com um texto genérico: guardar um consentimento que ninguém
    // viu é pior do que recusar a submissão.
    throw new Error(`Sem texto de consentimento para o país "${country}".`);
  }
  return texto;
}
