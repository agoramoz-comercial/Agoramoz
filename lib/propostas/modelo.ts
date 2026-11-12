import { z } from 'zod';

/**
 * O modelo de uma proposta comercial AGORAMOZ, no estilo editorial A4.
 *
 * Funções puras: o editor, a pré-visualização e os testes usam exactamente
 * as mesmas contas. Três regras do estilo editorial vivem aqui, e não no
 * desenho, para não dependerem de alguém se lembrar delas:
 *
 * 1. **A aritmética é feita, não escrita.** O total, as semanas e a margem
 *    são calculados a partir das fases — ninguém escreve um total à mão.
 * 2. **Números com espaço de milhar**: `1 735 000 MZN` (espaço fino, que não
 *    parte a linha). `toLocaleString('pt-PT')` não agrupa números de quatro
 *    algarismos, por isso o agrupamento é feito aqui.
 * 3. **Nada inventado.** A proposta só tem o que alguém escreveu; um campo
 *    vazio fica vazio (no papel, a secção não aparece).
 *
 * E uma regra do AEOS (limites iniciais de Finanças): **nenhuma proposta sem
 * margem projetada** — o custo de cada fase é pedido no editor e a margem
 * aparece nas verificações. O custo e a margem NUNCA vão para o papel.
 */

export const MOEDAS = ['MZN', 'USD', 'EUR'] as const;
export type Moeda = (typeof MOEDAS)[number];

/** Os limites existem para que cada secção caiba na sua página A4. */
export const LIMITES = {
  contexto: 6,
  objectivos: 6,
  solucao: 8,
  fases: 8,
  opcoes: 3,
  condicoes: 8,
  riscos: 6,
  passos: 6,
  textoCurto: 120,
  textoMedio: 400,
  carta: 2_400,
} as const;

const curto = z.string().max(LIMITES.textoCurto);
const medio = z.string().max(LIMITES.textoMedio);
const numero = z.number().finite();

const linhaSchema = z.object({ titulo: curto, texto: medio }).strict();
const faseSchema = z
  .object({
    nome: curto,
    entregaveis: medio,
    semanasMin: numero.int().min(0).max(104),
    semanasMax: numero.int().min(0).max(104),
    valor: numero.min(0).max(1e12),
    /** Interno: nunca impresso. */
    custo: numero.min(0).max(1e12).nullable(),
  })
  .strict();
const opcaoSchema = z
  .object({
    nome: curto,
    descricao: medio,
    valor: numero.min(0).max(1e12),
    recomendada: z.boolean(),
  })
  .strict();
const riscoSchema = z.object({ risco: curto, mitigacao: medio }).strict();

export const propostaSchema = z
  .object({
    versao: z.literal(1),
    projeto: curto,
    titulo: curto,
    cliente: curto,
    destinatario: curto,
    preparadaPor: curto,
    /** AAAA-MM-DD. */
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    validadeDias: numero.int().min(1).max(365),
    moeda: z.enum(MOEDAS),
    assunto: curto,
    carta: z.string().max(LIMITES.carta),
    decisao: medio,
    contexto: z.array(linhaSchema).max(LIMITES.contexto),
    objectivos: z.array(medio).max(LIMITES.objectivos),
    solucao: z.array(linhaSchema).max(LIMITES.solucao),
    fases: z.array(faseSchema).max(LIMITES.fases),
    opcoes: z.array(opcaoSchema).max(LIMITES.opcoes),
    condicoes: z.array(medio).max(LIMITES.condicoes),
    riscos: z.array(riscoSchema).max(LIMITES.riscos),
    passos: z.array(medio).max(LIMITES.passos),
  })
  .strict();

export type Proposta = z.infer<typeof propostaSchema>;
export type Fase = Proposta['fases'][number];
export type Linha = Proposta['contexto'][number];
export type Opcao = Proposta['opcoes'][number];
export type Risco = Proposta['riscos'][number];

/** Os contactos comerciais da AGORAMOZ, como o estilo editorial os pede. */
export const CONTACTOS = {
  email: 'comercial@agoramoz.com',
  telefone: '+258 82 478 0097',
  local: 'Maputo, Moçambique',
} as const;

export function propostaVazia(hoje: string): Proposta {
  return {
    versao: 1,
    projeto: '',
    titulo: '',
    cliente: '',
    destinatario: '',
    preparadaPor: 'AGORAMOZ',
    data: hoje,
    validadeDias: 30,
    moeda: 'MZN',
    assunto: '',
    carta: '',
    decisao: '',
    contexto: [],
    objectivos: [],
    solucao: [],
    fases: [],
    opcoes: [],
    condicoes: [],
    riscos: [],
    passos: [],
  };
}

/** Um rascunho guardado ou importado só entra se for uma proposta válida. */
export function lerProposta(x: unknown): Proposta | null {
  const r = propostaSchema.safeParse(x);
  return r.success ? r.data : null;
}

/* --------------------------------------------------------------- números */

/** Espaço fino que não parte a linha: o separador de milhar do estilo editorial. */
export const MILHAR = '\u202F';

/** `1735000` → `1 735 000`. Até duas casas decimais, só quando as há. */
export function agrupar(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const negativo = n < 0;
  const [inteira, decimal] = Math.abs(Math.round(n * 100) / 100)
    .toFixed(2)
    .split('.') as [string, string];
  const agrupada = inteira.replace(/\B(?=(\d{3})+(?!\d))/g, MILHAR);
  return `${negativo ? '−' : ''}${agrupada}${decimal === '00' ? '' : `,${decimal}`}`;
}

export function valor(n: number, moeda: Moeda): string {
  return `${agrupar(n)}\u00A0${moeda}`;
}

/** `1185000` → `1 185k`; abaixo de mil, o número inteiro. Para os gráficos. */
export function compacto(n: number): string {
  return n >= 1000 ? `${agrupar(Math.round(n / 1000))}k` : agrupar(n);
}

export interface Totais {
  readonly total: number;
  readonly semanasMin: number;
  readonly semanasMax: number;
  /** Só quando todas as fases têm custo. */
  readonly custo: number | null;
  /** (total − custo) / total, de 0 a 1. Só com custo e total. */
  readonly margem: number | null;
}

export function totais(p: Pick<Proposta, 'fases'>): Totais {
  const total = p.fases.reduce((s, f) => s + f.valor, 0);
  const semanasMin = p.fases.reduce((s, f) => s + f.semanasMin, 0);
  const semanasMax = p.fases.reduce((s, f) => s + f.semanasMax, 0);
  const comCusto = p.fases.length > 0 && p.fases.every((f) => f.custo !== null);
  const custo = comCusto ? p.fases.reduce((s, f) => s + (f.custo ?? 0), 0) : null;
  const margem = custo !== null && total > 0 ? (total - custo) / total : null;
  return { total, semanasMin, semanasMax, custo, margem };
}

/* ----------------------------------------------------------------- datas */

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function partes(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.getUTCMonth() !== Number(m[2]) - 1) return null;
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
}

/** `2026-11-12` → `12 de Novembro de 2026`. */
export function dataPorExtenso(iso: string): string {
  const p = partes(iso);
  return p ? `${p[2]} de ${MESES[p[1]]} de ${p[0]}` : '—';
}

/** A data até à qual a proposta é válida, em AAAA-MM-DD. */
export function validaAte(iso: string, dias: number): string | null {
  const p = partes(iso);
  if (!p) return null;
  const d = new Date(Date.UTC(p[0], p[1], p[2] + dias));
  return d.toISOString().slice(0, 10);
}

/* ----------------------------------------------------------- verificação */

export interface Aviso {
  readonly nivel: 'bloqueia' | 'aviso';
  readonly texto: string;
}

/**
 * O que está por acertar antes de a proposta sair. «Bloqueia» é o que faria
 * o papel mentir ou ficar sem sentido (sem cliente, total errado, duas
 * opções recomendadas); «aviso» é o que o estilo ou o AEOS pedem.
 */
export function verificar(p: Proposta): Aviso[] {
  const avisos: Aviso[] = [];
  const bloqueia = (texto: string) => avisos.push({ nivel: 'bloqueia', texto });
  const aviso = (texto: string) => avisos.push({ nivel: 'aviso', texto });

  if (!p.cliente.trim()) bloqueia('Falta o cliente (preparada para).');
  if (!p.projeto.trim()) bloqueia('Falta o nome do projecto.');
  if (!partes(p.data)) bloqueia('A data não é válida.');
  p.fases.forEach((f, i) => {
    if (!f.nome.trim()) bloqueia(`A fase ${i + 1} não tem nome.`);
    if (f.semanasMin > f.semanasMax) bloqueia(`Na fase ${i + 1}, o mínimo de semanas é maior do que o máximo.`);
  });
  const recomendadas = p.opcoes.filter((o) => o.recomendada).length;
  if (recomendadas > 1) bloqueia('Há mais do que uma opção recomendada.');
  p.opcoes.forEach((o, i) => {
    if (!o.nome.trim()) bloqueia(`A opção ${String.fromCharCode(65 + i)} não tem nome.`);
  });

  if (p.fases.length === 0) aviso('Sem fases, a proposta não tem plano nem investimento.');
  const t = totais(p);
  if (p.fases.length > 0 && t.margem === null)
    aviso('Margem por projectar: indique o custo de cada fase (AEOS: nenhuma proposta sem margem projetada).');
  if (t.margem !== null && t.margem < 0) aviso('A margem projectada é negativa: o custo é maior do que o preço.');
  if (p.opcoes.length > 0 && recomendadas === 0) aviso('Nenhuma opção está marcada como recomendada.');
  if (!p.carta.trim()) aviso('Sem carta de apresentação.');
  if (p.passos.length === 0) aviso('Sem próximos passos.');
  return avisos;
}

export const podeSair = (avisos: readonly Aviso[]) => avisos.every((a) => a.nivel !== 'bloqueia');

/** Parágrafos da carta: separados por uma linha em branco. */
export const paragrafos = (texto: string) =>
  texto
    .split(/\n\s*\n/)
    .map((x) => x.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
