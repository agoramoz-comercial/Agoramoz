'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { modulosDaSessao } from '@/lib/auth/modulos';
import { requireRole } from '@/lib/auth/session';
import {
  formularioAlocacao,
  formularioDecisao,
  formularioMovimento,
  formularioPessoa,
  formularioPrioridade,
  formularioProjeto,
  prontidaoParaGravar,
} from '@/lib/gabinete/formularios';
import { PRONTIDAO } from '@/lib/gabinete/modelo';
import { executar, voltarCom } from './executar';

/**
 * Acções do Gabinete do Fundador (0018). A base decide quem pode — cada função
 * exige o módulo `direcao` e que a linha seja de quem pede —; aqui valida-se a
 * forma, porque o que chega a uma Server Action é tão pouco confiável como o
 * que chega a uma rota. Sem o módulo, nem se chega à base.
 */

const BASE = '/admin/gabinete';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Escrever no gabinete: papel com escrita, troca de palavra-passe feita, e o módulo. */
async function exigirGabinete(): Promise<void> {
  await requireRole(['admin', 'comercial']);
  const modulos = await modulosDaSessao();
  if (!modulos.includes('direcao')) redirect('/admin');
}

/** O browser conta uma mudança de linha como 1 no `maxLength` mas envia CRLF: normalizar. */
const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? '').replace(/\r\n?/g, '\n');

function idOpcional(formData: FormData, destino: string): string | null {
  const v = texto(formData, 'id').trim();
  if (v === '') return null;
  if (!UUID.test(v)) voltarCom(destino, 'Pedido inválido.');
  return v;
}

function idDe(formData: FormData, campo: string, destino: string): string {
  const v = texto(formData, campo).trim();
  if (!UUID.test(v)) voltarCom(destino, 'Pedido inválido.');
  return v;
}

/** Criar não leva revisão; editar leva a que a página leu. */
function revisaoDe(formData: FormData, id: string | null, destino: string): number | null {
  if (id === null) return null;
  const n = Number(formData.get('revisao'));
  if (!Number.isInteger(n) || n < 1) voltarCom(destino, 'Pedido inválido.');
  return n;
}

function primeiroErro(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? 'Verifique os campos.';
}

/** Dentro do gabinete, e só para caminhos nossos: o destino vem do formulário. */
function destinoDe(formData: FormData, omissao: string): string {
  const v = texto(formData, 'voltar').trim();
  return /^\/admin\/gabinete(\/[a-z0-9-]+)*$/.test(v) ? v : omissao;
}

function mudou(...caminhos: string[]): void {
  revalidatePath(BASE);
  revalidatePath(`${BASE}/cto`);
  for (const c of caminhos) revalidatePath(c);
}

function idDevolvido(id: unknown, destino: string): string {
  if (typeof id !== 'string' || !UUID.test(id)) voltarCom(destino, 'Não foi possível concluir a acção.');
  return id;
}

// ── Decisões ──────────────────────────────────────────────────────────────────

export async function guardarDecisao(formData: FormData): Promise<void> {
  await exigirGabinete();
  const id = idOpcional(formData, `${BASE}/decisoes`);
  const destino = id ? `${BASE}/decisoes/${id}` : `${BASE}/decisoes/nova`;
  const revisao = revisaoDe(formData, id, destino);
  const f = formularioDecisao.safeParse({
    titulo: texto(formData, 'titulo'),
    contexto: texto(formData, 'contexto'),
    chapeu: texto(formData, 'chapeu'),
    estado: texto(formData, 'estado'),
    decisao: texto(formData, 'decisao'),
    responsavel: texto(formData, 'responsavel'),
    consultados: texto(formData, 'consultados'),
    indicador: texto(formData, 'indicador'),
    dataRevisao: texto(formData, 'dataRevisao'),
    recorrente: texto(formData, 'recorrente'),
    quemDecidiu: texto(formData, 'quemDecidiu'),
  });
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  const d = f.data;
  const novo = idDevolvido(
    await executar(
      'guardar_decisao',
      {
        p_id: id,
        p_revisao: revisao,
        p_titulo: d.titulo,
        p_contexto: d.contexto,
        p_chapeu: d.chapeu,
        p_estado: d.estado,
        p_decisao: d.decisao,
        p_responsavel: d.responsavel,
        p_consultados: d.consultados,
        p_indicador: d.indicador,
        p_data_revisao: d.dataRevisao,
        p_recorrente: d.recorrente,
        p_quem_decidiu: d.quemDecidiu,
      },
      destino,
    ),
    destino,
  );
  mudou(`${BASE}/decisoes`, `${BASE}/decisoes/${novo}`);
  redirect(`${BASE}/decisoes/${novo}?ok=${id ? 'guardada' : 'criada'}`);
}

// ── Prioridades ───────────────────────────────────────────────────────────────

export async function guardarPrioridade(formData: FormData): Promise<void> {
  await exigirGabinete();
  const destino = `${BASE}/prioridades`;
  const id = idOpcional(formData, destino);
  const revisao = revisaoDe(formData, id, destino);
  const f = formularioPrioridade.safeParse({
    trimestre: texto(formData, 'trimestre'),
    tipo: texto(formData, 'tipo'),
    resultado: texto(formData, 'resultado'),
    indicador: texto(formData, 'indicador'),
    meta: texto(formData, 'meta'),
    estado: texto(formData, 'estado'),
    nota: texto(formData, 'nota'),
  });
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  const p = f.data;
  await executar(
    'guardar_prioridade',
    {
      p_id: id,
      p_revisao: revisao,
      p_trimestre: p.trimestre,
      p_tipo: p.tipo,
      p_resultado: p.resultado,
      p_indicador: p.indicador,
      p_meta: p.meta,
      p_estado: p.estado,
      p_nota: p.nota,
    },
    destino,
    (codigo) => (codigo === '23505' ? 'Já existe uma prioridade deste tipo neste trimestre.' : undefined),
  );
  mudou(destino);
  redirect(`${destino}?trimestre=${encodeURIComponent(p.trimestre)}&ok=${id ? 'guardada' : 'criada'}`);
}

// ── Projectos ─────────────────────────────────────────────────────────────────

export async function guardarProjeto(formData: FormData): Promise<void> {
  await exigirGabinete();
  const id = idOpcional(formData, `${BASE}/projetos`);
  const destino = id ? `${BASE}/projetos/${id}` : `${BASE}/projetos/novo`;
  const revisao = revisaoDe(formData, id, destino);
  const f = formularioProjeto.safeParse({
    nome: texto(formData, 'nome'),
    cliente: texto(formData, 'cliente'),
    fase: texto(formData, 'fase'),
    responsavel: texto(formData, 'responsavel'),
    sponsor: texto(formData, 'sponsor'),
    resultado: texto(formData, 'resultado'),
    escopo: texto(formData, 'escopo'),
    moeda: texto(formData, 'moeda'),
    receitaContratada: texto(formData, 'receitaContratada'),
    receitaFaturada: texto(formData, 'receitaFaturada'),
    receitaRecebida: texto(formData, 'receitaRecebida'),
    custosVariaveis: texto(formData, 'custosVariaveis'),
    prontidao: Object.fromEntries(PRONTIDAO.map((c) => [c.chave, texto(formData, `pronto_${c.chave}`)])),
    risco: texto(formData, 'risco'),
    proximaAccao: texto(formData, 'proximaAccao'),
    proximaData: texto(formData, 'proximaData'),
    ligacao: texto(formData, 'ligacao'),
  });
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  const p = f.data;
  const novo = idDevolvido(
    await executar(
      'guardar_projeto',
      {
        p_id: id,
        p_revisao: revisao,
        p_nome: p.nome,
        p_cliente: p.cliente,
        p_fase: p.fase,
        p_responsavel: p.responsavel,
        p_sponsor: p.sponsor,
        p_resultado: p.resultado,
        p_escopo: p.escopo,
        p_moeda: p.moeda,
        p_receita_contratada: p.receitaContratada,
        p_receita_faturada: p.receitaFaturada,
        p_receita_recebida: p.receitaRecebida,
        p_custos_variaveis: p.custosVariaveis,
        p_prontidao: prontidaoParaGravar(p),
        p_risco: p.risco,
        p_proxima_accao: p.proximaAccao,
        p_proxima_data: p.proximaData,
        p_ligacao: p.ligacao,
      },
      destino,
    ),
    destino,
  );
  mudou(`${BASE}/projetos`, `${BASE}/projetos/${novo}`, `${BASE}/capacidade`, `${BASE}/tesouraria`);
  redirect(`${BASE}/projetos/${novo}?ok=${id ? 'guardado' : 'criado'}`);
}

// ── Tesouraria ────────────────────────────────────────────────────────────────

export async function guardarMovimento(formData: FormData): Promise<void> {
  await exigirGabinete();
  const destino = `${BASE}/tesouraria`;
  const id = idOpcional(formData, destino);
  const revisao = revisaoDe(formData, id, destino);
  const f = formularioMovimento.safeParse({
    tipo: texto(formData, 'tipo'),
    descricao: texto(formData, 'descricao'),
    projeto: texto(formData, 'projeto'),
    valor: texto(formData, 'valor'),
    moeda: texto(formData, 'moeda'),
    dataPrevista: texto(formData, 'dataPrevista'),
    dataEfectiva: texto(formData, 'dataEfectiva'),
  });
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  const m = f.data;
  await executar(
    'guardar_movimento',
    {
      p_id: id,
      p_revisao: revisao,
      p_tipo: m.tipo,
      p_descricao: m.descricao,
      p_projeto: m.projeto,
      p_valor: m.valor,
      p_moeda: m.moeda,
      p_data_prevista: m.dataPrevista,
      p_data_efectiva: m.dataEfectiva,
    },
    destino,
  );
  mudou(destino);
  redirect(`${destino}?ok=${id ? 'guardado' : 'registado'}`);
}

// ── Capacidade ────────────────────────────────────────────────────────────────

export async function guardarPessoa(formData: FormData): Promise<void> {
  await exigirGabinete();
  const destino = `${BASE}/capacidade`;
  const id = idOpcional(formData, destino);
  const revisao = revisaoDe(formData, id, destino);
  const f = formularioPessoa.safeParse({
    nome: texto(formData, 'nome'),
    funcao: texto(formData, 'funcao'),
    area: texto(formData, 'area'),
    horasSemana: texto(formData, 'horasSemana'),
    activa: texto(formData, 'activa'),
  });
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  const p = f.data;
  await executar(
    'guardar_pessoa',
    {
      p_id: id,
      p_revisao: revisao,
      p_nome: p.nome,
      p_funcao: p.funcao,
      p_area: p.area,
      p_horas_semana: p.horasSemana,
      p_activa: p.activa,
    },
    destino,
  );
  mudou(destino);
  redirect(`${destino}?ok=${id ? 'pessoa-guardada' : 'pessoa-criada'}`);
}

export async function guardarAlocacao(formData: FormData): Promise<void> {
  await exigirGabinete();
  const destino = destinoDe(formData, `${BASE}/capacidade`);
  const f = formularioAlocacao.safeParse({
    pessoa: texto(formData, 'pessoa'),
    projeto: texto(formData, 'projeto'),
    horasSemana: texto(formData, 'horasSemana'),
    ate: texto(formData, 'ate'),
  });
  if (!f.success) voltarCom(destino, primeiroErro(f.error.issues));
  const a = f.data;
  await executar(
    'guardar_alocacao',
    { p_pessoa: a.pessoa, p_projeto: a.projeto, p_horas_semana: a.horasSemana, p_ate: a.ate },
    destino,
  );
  mudou(`${BASE}/capacidade`, `${BASE}/projetos/${a.projeto}`);
  redirect(`${destino}?ok=alocacao`);
}

export async function removerAlocacao(formData: FormData): Promise<void> {
  await exigirGabinete();
  const destino = destinoDe(formData, `${BASE}/capacidade`);
  const pessoa = idDe(formData, 'pessoa', destino);
  const projeto = idDe(formData, 'projeto', destino);
  await executar('remover_alocacao', { p_pessoa: pessoa, p_projeto: projeto }, destino);
  mudou(`${BASE}/capacidade`, `${BASE}/projetos/${projeto}`);
  redirect(`${destino}?ok=alocacao-removida`);
}
