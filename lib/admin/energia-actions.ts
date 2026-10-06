'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { modulosDaSessao } from '@/lib/auth/modulos';
import { requireRole } from '@/lib/auth/session';
import {
  formularioAvaliacao,
  formularioDocumento,
  formularioFase,
  formularioLigacao,
  formularioMemo,
  formularioOportunidade,
  formularioRegisto,
  formularioStakeholder,
  memoParaGravar,
} from '@/lib/energia/formularios';
import { CRITERIOS, MEMO, podePassarPara, SCORE_MINIMO } from '@/lib/energia/modelo';
import { executar, voltarCom } from './executar';

/**
 * Acções do Espaço CEnO (0017). A base decide quem pode — cada função exige o
 * módulo `energia` e que a linha seja de quem pede —; aqui valida-se a forma,
 * porque o que chega a uma Server Action é tão pouco confiável como o que
 * chega a uma rota. Sem o módulo, nem se chega à base.
 */

const BASE = '/admin/energia';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Escrever no espaço: papel com escrita, troca de palavra-passe feita, e o módulo. */
async function exigirEnergia(): Promise<void> {
  await requireRole(['admin', 'comercial']);
  const modulos = await modulosDaSessao();
  if (!modulos.includes('energia')) redirect('/admin');
}

/** O browser conta uma mudança de linha como 1 no `maxLength` mas envia CRLF: normalizar. */
const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? '').replace(/\r\n?/g, '\n');

function idDe(formData: FormData, campo: string, destino: string): string {
  const v = texto(formData, campo).trim();
  if (!UUID.test(v)) voltarCom(destino, 'Pedido inválido.');
  return v;
}

function revisaoDe(formData: FormData, destino: string): number {
  const n = Number(formData.get('revisao'));
  if (!Number.isInteger(n) || n < 1) voltarCom(destino, 'Pedido inválido.');
  return n;
}

function primeiroErro(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? 'Verifique os campos.';
}

function mudou(...caminhos: string[]): void {
  revalidatePath(BASE);
  for (const c of caminhos) revalidatePath(c);
}

// ── Oportunidades ─────────────────────────────────────────────────────────────

function camposOportunidade(formData: FormData) {
  return formularioOportunidade.safeParse({
    titulo: texto(formData, 'titulo'),
    organizacao: texto(formData, 'organizacao'),
    sector: texto(formData, 'sector'),
    problema: texto(formData, 'problema'),
    fonte: texto(formData, 'fonte'),
    urgencia: texto(formData, 'urgencia'),
    valorMin: texto(formData, 'valorMin'),
    valorMax: texto(formData, 'valorMax'),
    moeda: texto(formData, 'moeda'),
    valorEvidencia: texto(formData, 'valorEvidencia'),
    proximaAccao: texto(formData, 'proximaAccao'),
    proximaData: texto(formData, 'proximaData'),
    responsavel: texto(formData, 'responsavel'),
    fase: texto(formData, 'fase') || undefined,
  });
}

function argumentosOportunidade(f: NonNullable<ReturnType<typeof camposOportunidade>['data']>) {
  return {
    p_titulo: f.titulo,
    p_organizacao: f.organizacao,
    p_sector: f.sector,
    p_problema: f.problema,
    p_fonte: f.fonte,
    p_urgencia: f.urgencia,
    p_valor_min: f.valorMin,
    p_valor_max: f.valorMax,
    p_moeda: f.moeda,
    p_valor_evidencia: f.valorEvidencia,
    p_proxima_accao: f.proximaAccao,
    p_proxima_data: f.proximaData,
    p_responsavel: f.responsavel,
  };
}

export async function criarOportunidade(formData: FormData): Promise<void> {
  await exigirEnergia();
  const destino = `${BASE}/oportunidades/nova`;
  const f = camposOportunidade(formData);
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  const id = await executar(
    'guardar_oportunidade',
    { p_id: null, p_revisao: null, ...argumentosOportunidade(f.data) },
    destino,
  );
  if (typeof id !== 'string' || !UUID.test(id)) voltarCom(destino, 'Não foi possível concluir a acção.');
  mudou(`${BASE}/oportunidades`);
  redirect(`${BASE}/oportunidades/${id}?ok=criada`);
}

export async function guardarOportunidade(formData: FormData): Promise<void> {
  await exigirEnergia();
  const id = idDe(formData, 'id', `${BASE}/oportunidades`);
  const destino = `${BASE}/oportunidades/${id}`;
  const revisao = revisaoDe(formData, destino);
  const f = camposOportunidade(formData);
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  await executar('guardar_oportunidade', { p_id: id, p_revisao: revisao, ...argumentosOportunidade(f.data) }, destino);
  mudou(`${BASE}/oportunidades`, destino);
  redirect(`${destino}?ok=guardada`);
}

export async function avaliarOportunidade(formData: FormData): Promise<void> {
  await exigirEnergia();
  const id = idDe(formData, 'id', `${BASE}/oportunidades`);
  const destino = `${BASE}/oportunidades/${id}`;
  const revisao = revisaoDe(formData, destino);
  const f = formularioAvaliacao.safeParse(Object.fromEntries(CRITERIOS.map((c) => [c.chave, texto(formData, c.chave)])));
  if (!f.success) voltarCom(destino, 'Avalie os oito critérios, de 0 a 5.');
  await executar(
    'avaliar_oportunidade',
    {
      p_id: id,
      p_revisao: revisao,
      p_dor: f.data.dor,
      p_urgencia: f.data.urgencia,
      p_decisor: f.data.decisor,
      p_capacidade: f.data.capacidade,
      p_adequacao: f.data.adequacao,
      p_controlo: f.data.controlo,
      p_informacao: f.data.informacao,
      p_valor: f.data.valor,
    },
    destino,
  );
  mudou(`${BASE}/oportunidades`, destino);
  redirect(`${destino}?ok=avaliada`);
}

export async function mudarFaseCeno(formData: FormData): Promise<void> {
  await exigirEnergia();
  const id = idDe(formData, 'id', `${BASE}/oportunidades`);
  const destino = `${BASE}/oportunidades/${id}`;
  const revisao = revisaoDe(formData, destino);
  const f = formularioFase.safeParse({
    fase: texto(formData, 'fase'),
    nota: texto(formData, 'nota'),
    motivo: texto(formData, 'motivo'),
  });
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  // O score mínimo verifica-o a base, com o valor que ela tem (não um campo
  // escondido que pode estar desactualizado noutra janela).
  const passagem = podePassarPara(f.data.fase, SCORE_MINIMO, f.data.motivo);
  if (!passagem.ok) voltarCom(destino, passagem.motivo ?? 'Etapa inválida.');
  await executar(
    'mudar_fase_ceno',
    { p_id: id, p_revisao: revisao, p_fase: f.data.fase, p_nota: f.data.nota, p_motivo: f.data.motivo },
    destino,
  );
  mudou(`${BASE}/oportunidades`, destino);
  redirect(`${destino}?ok=fase`);
}

export async function guardarMemo(formData: FormData): Promise<void> {
  await exigirEnergia();
  const id = idDe(formData, 'id', `${BASE}/oportunidades`);
  const destino = `${BASE}/oportunidades/${id}`;
  const revisao = revisaoDe(formData, destino);
  const f = formularioMemo.safeParse(Object.fromEntries(MEMO.map((m) => [m.chave, texto(formData, m.chave)])));
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  await executar('guardar_memo_ceno', { p_id: id, p_revisao: revisao, p_memo: memoParaGravar(f.data) }, destino);
  mudou(destino);
  redirect(`${destino}?ok=memo`);
}

export async function ligarStakeholder(formData: FormData): Promise<void> {
  await exigirEnergia();
  const id = idDe(formData, 'id', `${BASE}/oportunidades`);
  const destino = `${BASE}/oportunidades/${id}`;
  const f = formularioLigacao.safeParse({ stakeholder: texto(formData, 'stakeholder'), papel: texto(formData, 'papel') });
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  await executar(
    'ligar_stakeholder',
    { p_oportunidade: id, p_stakeholder: f.data.stakeholder, p_papel: f.data.papel },
    destino,
  );
  mudou(destino, `${BASE}/stakeholders/${f.data.stakeholder}`);
  redirect(`${destino}?ok=ligado`);
}

export async function desligarStakeholder(formData: FormData): Promise<void> {
  await exigirEnergia();
  const id = idDe(formData, 'id', `${BASE}/oportunidades`);
  const destino = `${BASE}/oportunidades/${id}`;
  const stakeholder = idDe(formData, 'stakeholder', destino);
  await executar('desligar_stakeholder', { p_oportunidade: id, p_stakeholder: stakeholder }, destino);
  mudou(destino, `${BASE}/stakeholders/${stakeholder}`);
  redirect(`${destino}?ok=desligado`);
}

export async function registarCeno(formData: FormData): Promise<void> {
  await exigirEnergia();
  const id = idDe(formData, 'id', `${BASE}/oportunidades`);
  const destino = `${BASE}/oportunidades/${id}`;
  const f = formularioRegisto.safeParse({
    tipo: texto(formData, 'tipo'),
    decisao: texto(formData, 'decisao'),
    corpo: texto(formData, 'corpo'),
  });
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  await executar(
    'registar_ceno',
    { p_oportunidade: id, p_tipo: f.data.tipo, p_decisao: f.data.decisao, p_corpo: f.data.corpo },
    destino,
  );
  mudou(destino);
  redirect(`${destino}?ok=registo`);
}

export async function guardarDocumento(formData: FormData): Promise<void> {
  await exigirEnergia();
  const id = idDe(formData, 'id', `${BASE}/oportunidades`);
  const destino = `${BASE}/oportunidades/${id}`;
  const f = formularioDocumento.safeParse({
    pasta: texto(formData, 'pasta'),
    estado: texto(formData, 'estado'),
    ligacao: texto(formData, 'ligacao'),
    nota: texto(formData, 'nota'),
  });
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  await executar(
    'guardar_documento_ceno',
    { p_oportunidade: id, p_pasta: f.data.pasta, p_estado: f.data.estado, p_ligacao: f.data.ligacao, p_nota: f.data.nota },
    destino,
  );
  mudou(destino);
  redirect(`${destino}?ok=documento`);
}

// ── Stakeholders ──────────────────────────────────────────────────────────────

function camposStakeholder(formData: FormData) {
  return formularioStakeholder.safeParse({
    organizacao: texto(formData, 'organizacao'),
    pessoa: texto(formData, 'pessoa'),
    cargo: texto(formData, 'cargo'),
    pais: texto(formData, 'pais'),
    sector: texto(formData, 'sector'),
    tipo: texto(formData, 'tipo'),
    interesse: texto(formData, 'interesse'),
    poder: texto(formData, 'poder'),
    relacao: texto(formData, 'relacao'),
    ultima: texto(formData, 'ultima'),
    proximaAccao: texto(formData, 'proximaAccao'),
    proximaData: texto(formData, 'proximaData'),
    origem: texto(formData, 'origem'),
    consentimento: formData.get('consentimento') ?? '',
    responsavel: texto(formData, 'responsavel'),
    activo: formData.get('activo') ?? '',
  });
}

function argumentosStakeholder(f: NonNullable<ReturnType<typeof camposStakeholder>['data']>) {
  return {
    p_organizacao: f.organizacao,
    p_pessoa: f.pessoa,
    p_cargo: f.cargo,
    p_pais: f.pais,
    p_sector: f.sector,
    p_tipo: f.tipo,
    p_interesse: f.interesse,
    p_poder: f.poder,
    p_relacao: f.relacao,
    p_ultima: f.ultima,
    p_proxima_accao: f.proximaAccao,
    p_proxima_data: f.proximaData,
    p_origem: f.origem,
    p_consentimento: f.consentimento,
    p_responsavel: f.responsavel,
    p_activo: f.activo,
  };
}

export async function criarStakeholder(formData: FormData): Promise<void> {
  await exigirEnergia();
  const destino = `${BASE}/stakeholders/novo`;
  const f = camposStakeholder(formData);
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  const id = await executar(
    'guardar_stakeholder',
    { p_id: null, p_revisao: null, ...argumentosStakeholder(f.data) },
    destino,
  );
  if (typeof id !== 'string' || !UUID.test(id)) voltarCom(destino, 'Não foi possível concluir a acção.');
  mudou(`${BASE}/stakeholders`);
  redirect(`${BASE}/stakeholders/${id}?ok=criado`);
}

export async function guardarStakeholder(formData: FormData): Promise<void> {
  await exigirEnergia();
  const id = idDe(formData, 'id', `${BASE}/stakeholders`);
  const destino = `${BASE}/stakeholders/${id}`;
  const revisao = revisaoDe(formData, destino);
  const f = camposStakeholder(formData);
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  await executar('guardar_stakeholder', { p_id: id, p_revisao: revisao, ...argumentosStakeholder(f.data) }, destino);
  mudou(`${BASE}/stakeholders`, destino);
  redirect(`${destino}?ok=guardado`);
}
