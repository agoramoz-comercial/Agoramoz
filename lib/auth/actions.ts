'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { hashForStorage } from '@/lib/diagnostic/normalize';
import {
  createMemoryRateLimiter,
  sourceFromHeaders,
  type RateLimiter,
} from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';
import { createSessionClient } from './client';

/**
 * Entrada e saída da área administrativa.
 *
 * CSRF (T-16): as Server Actions do Next verificam `Origin` contra `Host` por
 * omissão, e não existe nenhum caminho `GET` que altere estado. Não se
 * reinventa aqui um mecanismo que a plataforma já impõe.
 *
 * Enumeração de utilizadores: a resposta é a MESMA para palavra-passe errada,
 * conta inexistente, conta sem perfil e perfil desactivado. Distinguir daria a
 * quem sonda uma lista de quem trabalha aqui.
 */

/**
 * Dois baldes, e é deliberado.
 *
 * O da origem trava quem tenta muitas contas a partir do mesmo sítio. O do
 * e-mail trava quem tenta a mesma conta a partir de muitos sítios — que é o
 * ataque que o primeiro balde não vê. Nenhum guarda o valor em claro.
 *
 * Limitação conhecida e herdada: os baldes vivem em memória, por instância.
 * Num ambiente com várias instâncias isto atrasa, não impede. O limite duro
 * continua a ser o do Supabase Auth.
 */
let porOrigem: RateLimiter | null = null;
let porConta: RateLimiter | null = null;

function limitadores(): { origem: RateLimiter; conta: RateLimiter } {
  porOrigem ??= createMemoryRateLimiter({ max: 10, windowMs: 10 * 60_000 });
  porConta ??= createMemoryRateLimiter({ max: 5, windowMs: 10 * 60_000 });
  return { origem: porOrigem, conta: porConta };
}

const ERRO_CREDENCIAIS = '/admin/entrar?erro=credenciais';
const ERRO_TENTATIVAS = '/admin/entrar?erro=tentativas';

export async function entrar(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');

  const cabecalhos = await headers();
  const origem = sourceFromHeaders(cabecalhos);
  const ipHash = await hashForStorage(origem);
  const contaHash = await hashForStorage(email);

  const { origem: balde, conta } = limitadores();

  // O balde da origem gasta-se mesmo com o corpo vazio: um pedido malformado
  // repetido é tão sinal de sondagem como um bem formado.
  if (!balde.check(ipHash).allowed || !conta.check(contaHash).allowed) {
    log.warn('admin.login_rate_limited', {
      outcome: 'rejected',
      entityType: 'origem',
      entityId: ipHash.slice(0, 16),
    });
    redirect(ERRO_TENTATIVAS);
  }

  if (!email || !password) redirect(ERRO_CREDENCIAIS);

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    log.warn('admin.login_failed', {
      outcome: 'rejected',
      reason: 'credenciais',
      // Hashes, nunca valores: serve para correlacionar tentativas, não para
      // saber quem tentou.
      entityType: 'conta',
      entityId: contaHash.slice(0, 16),
    });
    redirect(ERRO_CREDENCIAIS);
  }

  /**
   * Autenticado não é autorizado. Sem perfil activo, a sessão é terminada
   * imediatamente — deixá-la de pé daria a alguém sem acesso um cookie válido
   * e um admin vazio, que parece avaria em vez de recusa.
   */
  const { data: perfil } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!perfil || perfil.active !== true) {
    await supabase.auth.signOut();
    log.warn('admin.login_failed', {
      outcome: 'rejected',
      reason: perfil ? 'perfil-inactivo' : 'sem-perfil',
      entityType: 'conta',
      entityId: contaHash.slice(0, 16),
    });
    redirect(ERRO_CREDENCIAIS);
  }

  const uaHash = await hashForStorage(cabecalhos.get('user-agent') ?? '');
  const { error: erroAuditoria } = await supabase.rpc('registar_entrada', {
    p_ip_hash: ipHash,
    p_ua_hash: uaHash,
  });

  // A auditoria falhar não deve impedir a entrada de quem tem direito a
  // entrar, mas tem de ser visível: um período sem registos de entrada não
  // pode parecer um período sem entradas.
  if (erroAuditoria) {
    log.error('admin.login_audit_failed', {
      outcome: 'failed',
      errorCode: erroAuditoria.code ?? 'desconhecido',
    });
  }

  log.info('admin.login', { outcome: 'accepted', entityType: 'perfil', entityId: data.user.id });
  redirect('/admin');
}

export async function sair(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  log.info('admin.logout', { outcome: 'accepted' });
  redirect('/admin/entrar');
}
