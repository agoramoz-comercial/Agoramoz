'use server';

import { z } from 'zod';
import { createSessionClient } from '@/lib/auth/client';
import { currentSession, podeEscrever } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import { createMemoryRateLimiter } from '@/lib/http/rate-limit';
import { chavesReservadas } from '@/lib/inqueritos/construtor';
import {
  importadorKimiDoAmbiente,
  importarTexto,
  MAX_TEXTO,
  type RespostaImportacao,
} from '@/lib/inqueritos/importar/servidor';
import { specInquerito } from '@/lib/inqueritos/spec';
import { log } from '@/lib/log/logger';

/**
 * «Colar e transformar» no construtor. Devolve uma PROPOSTA de inquérito e
 * não escreve nada: o admin revê, aplica no construtor e só o «Guardar» de
 * sempre grava — validado outra vez pela função `guardar_rascunho`.
 *
 * Mesmo sem escrita, a autorização é do servidor: sessão válida e papel que
 * escreve (admin ou comercial). As chaves reservadas vêm da base (com RLS),
 * nunca do browser. O texto colado nunca vai para os logs.
 */

/** Cada transformação pelo Kimi gasta créditos da conta: tecto por pessoa. */
const limiteIA = createMemoryRateLimiter({ max: 10, windowMs: 600_000, maxKeys: 1_000 });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const entrada = z.object({
  id: z.string().regex(UUID),
  texto: z.string().trim().min(1).max(MAX_TEXTO),
  motor: z.enum(['kimi', 'local']),
  modo: z.enum(['substituir', 'acrescentar']),
  /** O último spec válido do construtor: dá o idioma, os ecrãs e as perguntas a manter. */
  base: z.unknown(),
});

export type ResultadoAccaoImportar =
  | RespostaImportacao
  | { readonly ok: false; readonly motivo: string };

export async function importarTextoInquerito(bruto: unknown): Promise<ResultadoAccaoImportar> {
  const env = serverEnv();
  if (env.SURVEYS !== 'on') return { ok: false, motivo: 'Os inquéritos estão desligados.' };

  const sessao = await currentSession();
  if (!sessao || !podeEscrever(sessao.papel))
    return { ok: false, motivo: 'Não tem permissão para esta acção.' };

  const e = entrada.safeParse(bruto);
  if (!e.success) {
    const grande = e.error.issues.some((i) => i.path[0] === 'texto' && i.code === 'too_big');
    return {
      ok: false,
      motivo: grande
        ? `O texto tem mais de ${MAX_TEXTO.toLocaleString('pt-PT')} caracteres. Divida-o em partes e use «Acrescentar ao fim».`
        : 'Cole o texto do inquérito antes de transformar.',
    };
  }
  const base = specInquerito.safeParse(e.data.base);
  if (!base.success)
    return { ok: false, motivo: 'Corrija os problemas assinalados no inquérito antes de importar.' };

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from('questionnaire_versions')
    .select('spec')
    .eq('questionnaire_id', e.data.id)
    .not('published_at', 'is', null);
  if (error) {
    log.warn('inquerito.importar_falhou', {
      outcome: 'failed',
      errorCode: error.code ?? 'desconhecido',
    });
    return { ok: false, motivo: 'Não foi possível ler o inquérito. Tente de novo.' };
  }
  const reservadas = chavesReservadas((data ?? []).map((v: { spec: unknown }) => v.spec));

  const kimi = e.data.motor === 'kimi' ? importadorKimiDoAmbiente(env) : null;
  if (kimi && !limiteIA.check(sessao.userId).allowed) {
    log.warn('inquerito.importar_limitado', { outcome: 'rejected', motor: 'kimi' });
    return {
      ok: false,
      motivo:
        'Chegou ao limite de transformações com IA (10 em 10 minutos). Use o analisador local ou aguarde.',
    };
  }

  const inicio = Date.now();
  const r = await importarTexto(
    { texto: e.data.texto, motor: e.data.motor, modo: e.data.modo, base: base.data, reservadas },
    { kimi },
  );
  log.info('inquerito.importar', {
    outcome: r.ok ? 'ok' : 'rejected',
    motor: r.motor,
    caracteres: e.data.texto.length,
    perguntas: r.ok ? r.resumo.perguntas : 0,
    durationMs: Date.now() - inicio,
    ...(r.caiuParaLocal ? { reason: r.caiuParaLocal } : {}),
    ...(r.ok && r.partes
      ? {
          partes: r.partes.total,
          partesLocal: r.partes.local,
          ...(r.partes.motivo ? { reason: r.partes.motivo } : {}),
        }
      : {}),
  });
  return r;
}
