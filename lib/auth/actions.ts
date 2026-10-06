'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { hashForStorage } from '@/lib/diagnostic/normalize';
import {
  createMemoryRateLimiter,
  sourceFromHeaders,
  type RateLimiter,
} from '@/lib/http/rate-limit';
import { dbAdmin } from '@/lib/db/client';
import { log } from '@/lib/log/logger';
import { createSessionClient } from './client';
import { MARCA_TROCA, trocaObrigatoria, validarTroca } from './palavra-passe';

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

const CONTA = '/admin/conta';
let trocasPorConta: RateLimiter | null = null;

/**
 * Trocar a palavra-passe — obrigatório no primeiro acesso de uma conta criada
 * com palavra-passe provisória (marca `trocar_palavra_passe` em
 * `app_metadata`, que o middleware impõe).
 *
 * 1. Valida as regras (12+ caracteres, confirmada, diferente da actual).
 * 2. Reautentica com a actual: uma sessão aberta num computador esquecido não
 *    chega para mudar a palavra-passe.
 * 3. Muda-a pelo Supabase Auth.
 * 4. Retira a marca com a chave de serviço — `app_metadata` não é editável
 *    pelo próprio utilizador, e é por isso que a marca é de confiança.
 * 5. Renova o token (sem a marca) e termina as outras sessões.
 *
 * Nenhuma palavra-passe vai para o log, nem em hash.
 */
export async function mudarPalavraPasse(formData: FormData): Promise<void> {
  const actual = String(formData.get('actual') ?? '');
  const nova = String(formData.get('nova') ?? '');
  const confirmacao = String(formData.get('confirmacao') ?? '');

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect('/admin/entrar');

  trocasPorConta ??= createMemoryRateLimiter({ max: 5, windowMs: 10 * 60_000 });
  const contaHash = await hashForStorage(user.id);
  if (!trocasPorConta.check(contaHash).allowed) redirect(`${CONTA}?erro=tentativas`);

  const erro = validarTroca(actual, nova, confirmacao);
  if (erro) redirect(`${CONTA}?erro=${erro}`);

  const { error: erroActual } = await supabase.auth.signInWithPassword({ email: user.email, password: actual });
  if (erroActual) {
    log.warn('admin.palavra_passe_recusada', {
      outcome: 'rejected',
      reason: 'actual',
      entityType: 'conta',
      entityId: contaHash.slice(0, 16),
    });
    redirect(`${CONTA}?erro=actual`);
  }

  const { error: erroNova } = await supabase.auth.updateUser({ password: nova });
  if (erroNova) {
    log.warn('admin.palavra_passe_recusada', {
      outcome: 'rejected',
      reason: 'servico',
      errorCode: erroNova.code ?? 'desconhecido',
    });
    redirect(`${CONTA}?erro=recusada`);
  }

  if (trocaObrigatoria(user.app_metadata)) {
    const admin = dbAdmin();
    const { error: erroMarca } = admin
      ? await admin.auth.admin.updateUserById(user.id, { app_metadata: { [MARCA_TROCA]: false } })
      : { error: { code: 'sem_chave_de_servico' } };
    if (erroMarca) {
      log.error('admin.palavra_passe_marca_falhou', {
        outcome: 'failed',
        errorCode: ('code' in erroMarca && erroMarca.code) || 'desconhecido',
      });
      redirect(`${CONTA}?erro=indisponivel`);
    }
  }

  // Um token novo, já sem a marca (a base lê-a do JWT); e todas as outras
  // sessões terminadas — quem tivesse entrado com a palavra-passe antiga fica
  // de fora, que é o objectivo de a trocar.
  const { error: erroRefresh } = await supabase.auth.refreshSession();
  const { error: erroOutras } = await supabase.auth.signOut({ scope: 'others' });
  if (erroRefresh || erroOutras) {
    log.warn('admin.palavra_passe_sessoes', {
      outcome: 'failed',
      errorCode: (erroRefresh ?? erroOutras)?.code ?? 'desconhecido',
    });
  }

  log.info('admin.palavra_passe_mudada', { outcome: 'accepted', entityType: 'perfil', entityId: user.id });
  redirect(`${CONTA}?ok=1`);
}
