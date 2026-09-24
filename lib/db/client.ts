import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/config/env';

/**
 * Cliente de servidor para o Postgres do Supabase.
 *
 * Usa a chave de serviço, que **ignora RLS**. Por isso:
 *
 * - nunca é importado por código de cliente — o `assertServer` abaixo
 *   transforma um engano desses em erro imediato em vez de um segredo no
 *   bundle;
 * - não serve o admin. O admin usa a sessão do utilizador, sujeita a RLS,
 *   para que um erro numa política não se traduza em toda a gente ver tudo.
 *   Esta chave existe só para a ingestão, onde não há utilizador autenticado.
 *
 * `persistSession: false` e `autoRefreshToken: false` porque num runtime
 * serverless não há sessão para persistir nem token para renovar — deixá-los
 * ligados só cria temporizadores que a instância nunca vive para disparar.
 */

let cache: SupabaseClient | null = null;

function assertServer(): void {
  if (typeof window !== 'undefined') {
    throw new Error('O cliente administrativo da base de dados não pode ser usado no browser.');
  }
}

/**
 * Devolve `null` quando a persistência não está configurada, em vez de lançar.
 * A rota decide o que fazer com isso — e decide de forma explícita, em vez de
 * rebentar num sítio onde o erro seria lido como falha de sistema.
 */
export function dbAdmin(): SupabaseClient | null {
  assertServer();
  const env = serverEnv();

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;

  cache ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'agoramoz-web' } },
  });

  return cache;
}

/** Só para testes: força a próxima chamada a reconstruir o cliente. */
export function resetDbCache(): void {
  cache = null;
}

export interface IngestResult {
  readonly duplicate: boolean;
  readonly response_id: string;
  readonly contact_id: string;
  readonly organisation_id: string | null;
  readonly diagnostic_id: string;
  readonly deal_id: string | null;
  readonly score: number;
  readonly tier: string;
}

export interface IngestArgs {
  readonly questionnaireSlug: string;
  readonly payload: unknown;
  readonly normalized: unknown;
  readonly idempotencyKey: string;
  readonly inputFingerprint: string;
  readonly score: number;
  readonly tier: string;
  readonly rulesetVersion: string;
  readonly scoringVersion: string;
  readonly findings: unknown;
  readonly evidenceBundle: unknown;
  readonly consentText: string;
  readonly consentVersion: string;
  readonly correlationId: string;
  readonly ipHash?: string | null;
  readonly userAgentHash?: string | null;
}

/**
 * Chama a função transacional de ingestão.
 *
 * Tudo o que esta função faz acontece numa transação do lado da base: ou grava
 * o lead, o consentimento, a resposta, o diagnóstico, a oportunidade e o
 * evento de fila, ou não grava nada. Não há estado intermédio possível.
 */
export async function ingestDiagnosticResponse(
  client: SupabaseClient,
  args: IngestArgs,
): Promise<IngestResult> {
  const { data, error } = await client.rpc('ingest_diagnostic_response', {
    p_questionnaire_slug: args.questionnaireSlug,
    p_payload: args.payload,
    p_normalized: args.normalized,
    p_idempotency_key: args.idempotencyKey,
    p_input_fingerprint: args.inputFingerprint,
    p_score: args.score,
    p_tier: args.tier,
    p_ruleset_version: args.rulesetVersion,
    p_scoring_version: args.scoringVersion,
    p_findings: args.findings,
    p_evidence_bundle: args.evidenceBundle,
    p_consent_text: args.consentText,
    p_consent_version: args.consentVersion,
    p_correlation_id: args.correlationId,
    p_ip_hash: args.ipHash ?? null,
    p_user_agent_hash: args.userAgentHash ?? null,
  });

  if (error) {
    /**
     * A mensagem do Postgres pode conter fragmentos do que foi submetido.
     * Propaga-se o código, que é o que serve para diagnosticar, e não o texto.
     */
    const e = new Error(`Ingestão falhou (${error.code ?? 'sem código'})`);
    (e as Error & { code?: string }).code = error.code;
    throw e;
  }

  return data as IngestResult;
}
