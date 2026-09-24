import type { LeadInput } from '@/lib/forms/lead-schema';

/**
 * Normalização determinística.
 *
 * Serve dois fins que têm de andar juntos: dar à base de dados uma forma
 * canónica por onde procurar duplicados, e produzir uma impressão digital
 * estável das respostas. Estável quer dizer que o mesmo conteúdo, escrito com
 * maiúsculas diferentes ou espaços a mais, dá a mesma impressão — senão a
 * idempotência não funciona e uma dupla submissão cria dois leads.
 */

/**
 * Minúsculas e aparado. Deliberadamente **sem** tratar pontos ou sufixos `+`
 * no nome de utilizador: `a.b@x.com` e `ab@x.com` são o mesmo endereço no
 * Gmail mas contas distintas noutros fornecedores, e fundir contactos que não
 * são a mesma pessoa é pior do que ter dois registos para fundir à mão.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Domínio do endereço, para associar a organização. Vazio se malformado. */
export function emailDomain(email: string): string {
  const at = normalizeEmail(email).lastIndexOf('@');
  return at === -1 ? '' : normalizeEmail(email).slice(at + 1);
}

/**
 * Só dígitos, com `+` inicial preservado quando existe. Não tenta inferir
 * indicativo de país a partir do país escolhido no formulário: adivinhar um
 * prefixo produz números que não existem, e um número errado é pior do que um
 * número em formato irregular.
 */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

/** Espaço interno colapsado e pontas aparadas. Preserva acentuação e caixa. */
export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Host em minúsculas, sem esquema, sem `www.`, sem barra final. */
export function normalizeDomain(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#].*$/, '')
    .replace(/\.$/, '');
  return cleaned;
}

/**
 * Projeção canónica das respostas.
 *
 * Só os campos que definem a SUBSTÂNCIA do que foi respondido. O nome e o
 * telefone ficam de fora de propósito: corrigir uma gralha no nome e voltar a
 * submeter é a mesma resposta, e deve ser reconhecida como tal em vez de criar
 * um lead novo. As listas são ordenadas porque a ordem em que se clicam três
 * caixas não muda o que foi dito.
 */
export function canonicalAnswers(input: LeadInput): Record<string, unknown> {
  return {
    country: input.country,
    sector: input.sector,
    company: normalizeText(input.company).toLowerCase(),
    companySize: input.companySize,
    currentWebsite: input.currentWebsite ? normalizeDomain(input.currentWebsite) : '',
    processToImprove: [...input.processToImprove].map(normalizeText).sort(),
    problemImpact: normalizeText(input.problemImpact),
    decisionTimeframe: input.decisionTimeframe,
    investmentBand: input.investmentBand,
    decisionRole: input.decisionRole,
    workEmail: normalizeEmail(input.workEmail),
  };
}

/**
 * Serialização com chaves ordenadas. `JSON.stringify` preserva a ordem de
 * inserção, pelo que sem isto dois objetos com os mesmos pares mas construídos
 * por caminhos diferentes davam impressões digitais diferentes.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);

  return `{${entries.join(',')}}`;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Impressão digital do conteúdo das respostas. */
export function inputFingerprint(input: LeadInput): Promise<string> {
  return sha256Hex(stableStringify(canonicalAnswers(input)));
}

/**
 * Chave de idempotência, derivada **no servidor**.
 *
 * Nunca aceite do cliente: um valor controlado por quem submete permitiria
 * sobrepor-se ao registo de outra pessoa se adivinhasse a chave, ou forçar
 * leads duplicados enviando chaves novas. Derivar aqui elimina as duas coisas.
 *
 * `questionnaireVersion` entra na chave para que o mesmo cliente possa voltar
 * a responder quando o questionário mudar — é uma resposta nova, não uma
 * repetição.
 */
export async function idempotencyKey(
  input: LeadInput,
  questionnaireVersion: string,
): Promise<string> {
  const fingerprint = await inputFingerprint(input);
  return sha256Hex(`${normalizeEmail(input.workEmail)}|${questionnaireVersion}|${fingerprint}`);
}

/**
 * Hash curto (128 bits) de um identificador técnico.
 *
 * Serve o user-agent e serve o IP: guardar o hash permite reconhecer repetição
 * e abuso vindos da mesma origem, e não permite reconstituir a origem. É a
 * diferença entre ter um sinal operacional e ter um registo de quem visitou o
 * quê — a primeira coisa é precisa, a segunda não.
 */
export async function shortHash(value: string): Promise<string> {
  return (await sha256Hex(value)).slice(0, 32);
}
