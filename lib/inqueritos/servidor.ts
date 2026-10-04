import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { specInquerito, type SpecInquerito } from './spec';
import type { ContactoValidado } from './respostas';
import type { ValorResposta } from './logica';

/**
 * O caminho público na base — só com a chave de serviço (`dbAdmin()`), só
 * pelas duas funções da 0013. Nada aqui lê ou escreve tabelas directamente.
 */

export type EstadoFechado = 'fechado' | 'expirado' | 'inexistente';

export type InqueritoPublico =
  | {
      readonly estado: 'aberto';
      readonly inquerito: string;
      readonly versao: number;
      readonly spec: SpecInquerito;
    }
  | { readonly estado: EstadoFechado };

const respostaObter = z.union([
  z.object({
    estado: z.literal('aberto'),
    inquerito: z.string().uuid(),
    versao: z.number().int().positive(),
    spec: z.unknown(),
  }),
  z.object({ estado: z.enum(['fechado', 'expirado', 'inexistente']) }),
]);

export class ErroDeBase extends Error {
  constructor(readonly codigo: string) {
    super(`inquerito: ${codigo}`);
  }
}

export async function obterInqueritoPublico(
  cliente: SupabaseClient,
  tokenHash: string,
): Promise<InqueritoPublico> {
  const { data, error } = await cliente.rpc('obter_inquerito_publico', { p_token_hash: tokenHash });
  if (error) throw new ErroDeBase(error.code ?? 'rpc');
  const r = respostaObter.safeParse(data);
  if (!r.success) throw new ErroDeBase('forma');
  if (r.data.estado !== 'aberto') return { estado: r.data.estado };

  // Um inquérito publicado que já não passa no esquema é um defeito nosso, não
  // um estado do link: falha alto (503 + log) em vez de mostrar um formulário
  // meio lido.
  const spec = specInquerito.safeParse(r.data.spec);
  if (!spec.success) throw new ErroDeBase('spec-invalido');
  return { estado: 'aberto', inquerito: r.data.inquerito, versao: r.data.versao, spec: spec.data };
}

export interface GravarResposta {
  readonly tokenHash: string;
  readonly respostas: Readonly<Record<string, ValorResposta>>;
  readonly idempotencyKey: string;
  readonly fingerprint: string;
  readonly contacto: ContactoValidado | null;
  readonly versaoConsentimento: string | null;
  readonly ipHash: string | null;
  readonly uaHash: string | null;
}

const respostaGravar = z.union([
  z.object({ ok: z.literal(true), duplicado: z.boolean() }),
  // `limitado`: o limite durável por origem da base (50 por link e IP em 10 min).
  z.object({
    ok: z.literal(false),
    estado: z.enum(['fechado', 'expirado', 'inexistente', 'limitado']),
  }),
]);

export type ResultadoGravar = z.infer<typeof respostaGravar>;

export async function gravarResposta(
  cliente: SupabaseClient,
  g: GravarResposta,
): Promise<ResultadoGravar> {
  const { data, error } = await cliente.rpc('ingest_survey_response', {
    p_token_hash: g.tokenHash,
    p_respostas: g.respostas,
    p_idempotency_key: g.idempotencyKey,
    p_fingerprint: g.fingerprint,
    // O consentimento viaja dentro do contacto, como a função o lê. Só existe
    // contacto validado quando a pessoa aceitou (ver respostas.ts).
    p_contacto: g.contacto ? { ...g.contacto, consentimento: true } : null,
    p_consentimento_versao: g.versaoConsentimento,
    p_ip_hash: g.ipHash,
    p_ua_hash: g.uaHash,
  });
  if (error) throw new ErroDeBase(error.code ?? 'rpc');
  const r = respostaGravar.safeParse(data);
  if (!r.success) throw new ErroDeBase('forma');
  return r.data;
}
