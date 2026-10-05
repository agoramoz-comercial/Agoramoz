'use server';

import { randomBytes, randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSessionClient } from '@/lib/auth/client';
import { serverEnv } from '@/lib/config/env';
import { slugDe } from '@/lib/inqueritos/construtor';
import { fimDoDia } from '@/lib/inqueritos/links';
import { hashToken, tokenDoLink } from '@/lib/inqueritos/token';
import { LIMITES, specInicial, specInquerito } from '@/lib/inqueritos/spec';
import { log } from '@/lib/log/logger';
import { RPC, type NomeRpc } from './rpc';

/**
 * Acções de escrita do admin.
 *
 * Nenhuma escreve em tabela. Todas chamam uma função `security definer` da
 * migração 0006, que verifica o papel outra vez, deriva o autor de
 * `auth.uid()` em vez de o aceitar como argumento, confirma a revisão onde
 * faz sentido e escreve a auditoria na mesma transação.
 *
 * É por isso que um botão escondido não é um problema de segurança aqui: o
 * ecrã decide o que mostrar, a base decide o que acontece.
 */

/**
 * Traduz o erro para algo que se possa mostrar.
 *
 * Nunca se devolve a mensagem do Postgres tal como vem: pode descrever o
 * esquema, e num erro de unicidade pode conter o próprio valor que colidiu.
 * Os códigos são os que as funções de 0006 levantam de propósito.
 */
function mensagemDe(codigo: string | undefined, mensagem: string | undefined): string {
  switch (codigo) {
    case '42501':
      return 'Não tem permissão para esta acção.';
    case '40001':
      return 'O registo mudou entretanto. Recarregue a página e reveja antes de decidir.';
    case 'P0002':
      return 'Registo não encontrado.';
    case '23505':
      // Nunca a mensagem do Postgres: traz o valor que colidiu.
      return 'Já existe um registo com este identificador.';
    case '23514':
    case '23503':
    case '22023':
      // Texto nosso, escrito nas funções da migração para ser lido por pessoas.
      return mensagem?.split('\n')[0] ?? 'Pedido inválido.';
    default:
      return 'Não foi possível concluir a acção.';
  }
}

/**
 * Chama a função e devolve o que ela devolve; num erro, volta a `destino`
 * com a mensagem traduzida. Separada de `chamar` para as acções que precisam
 * do resultado (o id de um inquérito acabado de criar).
 */
async function executar(
  funcao: NomeRpc,
  argumentos: Record<string, unknown>,
  destino: string,
  traduzir?: (codigo: string | undefined) => string | undefined,
): Promise<unknown> {
  // Falha cedo e em desenvolvimento se alguém passar um argumento que a função
  // não declara: o PostgREST responderia «função não encontrada», que manda
  // procurar no sítio errado.
  const esperados = RPC[funcao] as readonly string[];
  for (const chave of Object.keys(argumentos)) {
    if (!esperados.includes(chave))
      throw new Error(`Parâmetro desconhecido em ${funcao}: ${chave}`);
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc(funcao, argumentos);

  if (error) {
    log.warn('admin.accao_recusada', {
      outcome: 'rejected',
      reason: funcao,
      errorCode: error.code ?? 'desconhecido',
    });
    const mensagem = traduzir?.(error.code) ?? mensagemDe(error.code, error.message);
    redirect(`${destino}?erro=${encodeURIComponent(mensagem)}`);
  }

  log.info('admin.accao', { outcome: 'accepted', reason: funcao });
  return data;
}

async function chamar(
  funcao: NomeRpc,
  argumentos: Record<string, unknown>,
  destino: string,
): Promise<never> {
  await executar(funcao, argumentos, destino);
  revalidatePath(destino);
  revalidatePath('/admin');
  redirect(`${destino}?ok=1`);
}

function idDe(formData: FormData, campo: string): string {
  const valor = String(formData.get(campo) ?? '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(valor)) redirect('/admin?erro=Pedido%20inv%C3%A1lido.');
  return valor;
}

function revisaoDe(formData: FormData): number {
  const n = Number(formData.get('revision'));
  if (!Number.isInteger(n) || n < 1) redirect('/admin?erro=Pedido%20inv%C3%A1lido.');
  return n;
}

// ── Diagnósticos ──────────────────────────────────────────────────────────

export async function enviarParaRevisao(formData: FormData): Promise<void> {
  const id = idDe(formData, 'id');
  await chamar(
    'enviar_para_revisao',
    { p_id: id, p_revision: revisaoDe(formData) },
    `/admin/diagnosticos/${id}`,
  );
}

export async function aprovarDiagnostico(formData: FormData): Promise<void> {
  const id = idDe(formData, 'id');
  await chamar(
    'aprovar_diagnostico',
    { p_id: id, p_revision: revisaoDe(formData) },
    `/admin/diagnosticos/${id}`,
  );
}

export async function rejeitarDiagnostico(formData: FormData): Promise<void> {
  const id = idDe(formData, 'id');
  await chamar(
    'rejeitar_diagnostico',
    {
      p_id: id,
      p_revision: revisaoDe(formData),
      p_motivo: String(formData.get('motivo') ?? ''),
    },
    `/admin/diagnosticos/${id}`,
  );
}

// ── Oportunidades ─────────────────────────────────────────────────────────

export async function mudarFase(formData: FormData): Promise<void> {
  const id = idDe(formData, 'id');
  await chamar(
    'mudar_fase_oportunidade',
    {
      p_deal_id: id,
      p_fase: String(formData.get('fase') ?? ''),
      p_nota: String(formData.get('nota') ?? '') || null,
    },
    `/admin/oportunidades/${id}`,
  );
}

export async function atribuirOportunidade(formData: FormData): Promise<void> {
  const id = idDe(formData, 'id');
  const dono = String(formData.get('owner') ?? '').trim();
  await chamar(
    'atribuir_oportunidade',
    { p_deal_id: id, p_owner: dono === '' ? null : dono },
    `/admin/oportunidades/${id}`,
  );
}

export async function registarNota(formData: FormData): Promise<void> {
  const id = idDe(formData, 'id');
  await chamar(
    'registar_actividade',
    { p_deal_id: id, p_tipo: 'nota', p_corpo: String(formData.get('corpo') ?? '') },
    `/admin/oportunidades/${id}`,
  );
}

// ── Equipa ────────────────────────────────────────────────────────────────

export async function definirPapel(formData: FormData): Promise<void> {
  await chamar(
    'definir_papel',
    { p_user: idDe(formData, 'id'), p_papel: String(formData.get('papel') ?? '') },
    '/admin/equipa',
  );
}

export async function definirActivo(formData: FormData): Promise<void> {
  await chamar(
    'definir_perfil_activo',
    { p_user: idDe(formData, 'id'), p_activo: formData.get('activo') === 'sim' },
    '/admin/equipa',
  );
}

// ── Inquéritos (0013) ─────────────────────────────────────────────────────

/** Com `SURVEYS=off` as funções da 0013 podem nem existir na base. */
function exigirInqueritos(): void {
  if (serverEnv().SURVEYS !== 'on') redirect('/admin');
}

const nomeDeInquerito = z.string().trim().min(1).max(160);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** O texto do formulário segue o tecto do spec, com folga para o nome e o JSON. */
const MAX_SPEC_TEXTO = LIMITES.specBytes + 8_192;
/** O tecto antigo da base (0013): perguntas e secções juntas. */
const BLOCOS_ANTES_DA_0014 = 50;

function voltarCom(destino: string, erro: string): never {
  redirect(`${destino}?erro=${encodeURIComponent(erro)}`);
}

export async function criarInquerito(formData: FormData): Promise<void> {
  exigirInqueritos();
  const destino = '/admin/inqueritos/novo';
  const nome = nomeDeInquerito.safeParse(formData.get('nome'));
  if (!nome.success) voltarCom(destino, 'Dê um nome ao inquérito (até 160 caracteres).');
  const idioma = formData.get('idioma') === 'en' ? 'en' : 'pt';

  // O sufixo aleatório evita colisões entre inquéritos com o mesmo nome; o
  // slug é interno e nunca aparece no link partilhado.
  const id = await executar(
    'criar_inquerito',
    {
      p_slug: slugDe(nome.data, randomBytes(3).toString('hex')),
      p_nome: nome.data,
      p_spec: specInicial(idioma),
    },
    destino,
  );
  if (typeof id !== 'string' || !UUID.test(id))
    voltarCom(destino, 'Não foi possível concluir a acção.');
  revalidatePath('/admin/inqueritos');
  redirect(`/admin/inqueritos/${id}?ok=criado`);
}

/**
 * Guarda o rascunho e, com `intencao=publicar`, publica-o a seguir. O spec
 * vem do construtor como JSON e é validado aqui pelo mesmo esquema que a
 * página pública usa — o browser já o validou, mas o que chega a uma Server
 * Action é tão pouco confiável como o que chega a uma rota.
 */
export async function guardarInquerito(formData: FormData): Promise<void> {
  exigirInqueritos();
  const id = idDe(formData, 'id');
  const destino = `/admin/inqueritos/${id}`;

  const nome = nomeDeInquerito.safeParse(formData.get('nome'));
  if (!nome.success) voltarCom(destino, 'Dê um nome ao inquérito (até 160 caracteres).');

  const texto = String(formData.get('spec') ?? '');
  if (texto.length === 0 || texto.length > MAX_SPEC_TEXTO) voltarCom(destino, 'Pedido inválido.');
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    voltarCom(destino, 'Pedido inválido.');
  }
  const spec = specInquerito.safeParse(bruto);
  if (!spec.success)
    voltarCom(destino, 'O inquérito tem problemas por corrigir. Nada foi guardado.');

  // Com a 0014 por aplicar, a base ainda recusa mais de 50 blocos com 22023.
  // O zod já aceitou o spec, por isso essa recusa só pode vir daí: diz-se o
  // passo que falta em vez de «formato inválido».
  const muitosBlocos = spec.data.perguntas.length > BLOCOS_ANTES_DA_0014;
  await executar(
    'guardar_rascunho',
    { p_id: id, p_nome: nome.data, p_spec: spec.data },
    destino,
    (codigo) =>
      codigo === '22023' && muitosBlocos
        ? 'A base de dados ainda aceita só 50 perguntas e secções: aplique supabase/aplicar-0014.sql no SQL Editor (linha 25 do verificar-estado). Nada foi guardado.'
        : undefined,
  );
  const publicar = formData.get('intencao') === 'publicar';
  if (publicar) await executar('publicar_versao', { p_id: id }, destino);

  revalidatePath(destino);
  revalidatePath('/admin/inqueritos');
  redirect(`${destino}?ok=${publicar ? 'publicado' : 'guardado'}`);
}

export async function definirInqueritoActivo(formData: FormData): Promise<void> {
  exigirInqueritos();
  const id = idDe(formData, 'id');
  await chamar(
    'definir_inquerito_activo',
    { p_id: id, p_activo: formData.get('activo') === 'sim' },
    `/admin/inqueritos/${id}`,
  );
}

/**
 * Um link novo. O id nasce aqui, o token deriva dele com o segredo
 * (`tokenDoLink`) e à base só chega o hash — o token nunca é guardado, e
 * volta a derivar-se quando a equipa abre o inquérito.
 */
export async function criarLink(formData: FormData): Promise<void> {
  exigirInqueritos();
  const id = idDe(formData, 'id');
  const destino = `/admin/inqueritos/${id}`;
  const segredo = serverEnv().SURVEY_LINK_SECRET;
  if (!segredo) voltarCom(destino, 'Falta configurar SURVEY_LINK_SECRET.');

  const rotulo = String(formData.get('rotulo') ?? '').trim();
  if (rotulo.length > 80) voltarCom(destino, 'O nome do link tem no máximo 80 caracteres.');

  const expiraTexto = String(formData.get('expira') ?? '').trim();
  const expira = expiraTexto ? fimDoDia(expiraTexto) : null;
  if (expiraTexto && !expira) voltarCom(destino, 'Data de expiração inválida.');

  const maxTexto = String(formData.get('max') ?? '').trim();
  const max = maxTexto ? Number(maxTexto) : null;
  if (max !== null && (!Number.isInteger(max) || max < 1 || max > 1_000_000)) {
    voltarCom(destino, 'O tecto de respostas é um número inteiro entre 1 e 1 000 000.');
  }

  const linkId = randomUUID();
  await executar(
    'criar_link',
    {
      p_id: id,
      p_link_id: linkId,
      p_token_hash: hashToken(tokenDoLink(segredo, linkId)),
      p_rotulo: rotulo || null,
      p_expira: expira,
      p_max: max,
    },
    destino,
  );
  revalidatePath(destino);
  redirect(`${destino}?ok=link#partilha`);
}

export async function revogarLink(formData: FormData): Promise<void> {
  exigirInqueritos();
  const id = idDe(formData, 'id');
  const destino = `/admin/inqueritos/${id}`;
  await executar('revogar_link', { p_link_id: idDe(formData, 'link') }, destino);
  revalidatePath(destino);
  redirect(`${destino}?ok=revogado#partilha`);
}
