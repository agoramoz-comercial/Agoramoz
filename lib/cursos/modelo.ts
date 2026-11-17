import { z } from 'zod';

/**
 * Cursos AGORAMOZ (D-49): o modelo.
 *
 * Um curso nasce SÓ das fontes que quem o cria carrega (PDF, Word, texto).
 * Cada fonte é partida em passagens numeradas (`F1.3` = fonte 1, passagem 3)
 * e cada coisa que o curso afirma — um resultado de aprendizagem, um bloco de
 * uma aula, a justificação de uma pergunta — leva as passagens que a sustentam.
 * É isso que permite verificar, sem segundo modelo, que nada foi inventado
 * (`verificar.ts`).
 *
 * O texto das fontes nunca é publicado: fica guardado para verificar e
 * refazer. O público vê o curso e a lista das fontes (título e tipo).
 */

export const NIVEIS = ['iniciacao', 'intermedio', 'avancado'] as const;
export type Nivel = (typeof NIVEIS)[number];
export const ROTULO_NIVEL: Readonly<Record<Nivel, string>> = { iniciacao: 'Iniciação', intermedio: 'Intermédio', avancado: 'Avançado' };

export const LIMITES = {
  fontes: 12,
  caracteresPorFonte: 400_000,
  /** Soma de todas as fontes: o que cabe num pedido ao servidor (1 MB) com folga. */
  caracteresTotal: 450_000,
  passagem: 1_200,
  modulos: 8,
  aulasPorModulo: 6,
  blocosPorAula: 12,
  perguntasPorAula: 5,
  resultados: 10,
  texto: 2_000,
  curto: 160,
} as const;

/** `F1.3`: fonte 1, passagem 3. */
export const ID_PASSAGEM = /^F([1-9]\d?)\.([1-9]\d{0,3})$/;

const curto = z.string().trim().min(1).max(LIMITES.curto);
const texto = z.string().trim().min(1).max(LIMITES.texto);
const ids = z.array(z.string().regex(ID_PASSAGEM)).min(1).max(8);

export const passagemSchema = z.strictObject({
  id: z.string().regex(ID_PASSAGEM),
  texto: z
    .string()
    .min(1)
    .max(LIMITES.passagem * 2),
});
export type Passagem = z.infer<typeof passagemSchema>;

export const fonteSchema = z.strictObject({
  id: z.string().regex(/^F[1-9]\d?$/),
  titulo: curto,
  tipo: z.enum(['docx', 'pdf', 'txt', 'md', 'texto']),
  passagens: z.array(passagemSchema).min(1).max(2_000),
});
export type Fonte = z.infer<typeof fonteSchema>;

export const blocoSchema = z.strictObject({
  tipo: z.enum(['explicacao', 'exemplo', 'passos', 'citacao']),
  texto: texto,
  itens: z.array(z.string().trim().min(1).max(400)).max(10).optional(),
  /** Para `citacao`: as palavras exactas de uma passagem citada. */
  citacao: z.string().trim().min(10).max(600).optional(),
  fontes: ids,
});
export type Bloco = z.infer<typeof blocoSchema>;

export const perguntaSchema = z.strictObject({
  enunciado: z.string().trim().min(5).max(400),
  opcoes: z.array(z.string().trim().min(1).max(240)).length(4),
  correcta: z.number().int().min(0).max(3),
  justificacao: z.string().trim().min(5).max(600),
  fontes: ids,
});
export type Pergunta = z.infer<typeof perguntaSchema>;

export const aulaSchema = z.strictObject({
  titulo: curto,
  objectivo: z.string().trim().min(5).max(400),
  minutos: z.number().int().min(5).max(240),
  /** As passagens que o plano destinou a esta aula: é só com elas que se escreve. */
  passagens: z.array(z.string().regex(ID_PASSAGEM)).min(1).max(40),
  blocos: z.array(blocoSchema).max(LIMITES.blocosPorAula),
  perguntas: z.array(perguntaSchema).max(LIMITES.perguntasPorAula),
});
export type Aula = z.infer<typeof aulaSchema>;

export const moduloSchema = z.strictObject({
  titulo: curto,
  resumo: z.string().trim().min(5).max(600),
  aulas: z.array(aulaSchema).min(1).max(LIMITES.aulasPorModulo),
});
export type Modulo = z.infer<typeof moduloSchema>;

export const resultadoSchema = z.strictObject({ texto: z.string().trim().min(5).max(300), fontes: ids });
export type Resultado = z.infer<typeof resultadoSchema>;

export const verificacaoSchema = z.strictObject({
  emitidaEm: z.string(),
  aceites: z.number().int().min(0),
  retirados: z.number().int().min(0),
  tentativas: z.number().int().min(0),
  notas: z.array(z.string().max(300)).max(60),
});
export type Verificacao = z.infer<typeof verificacaoSchema>;

export const cursoSchema = z.strictObject({
  versao: z.literal(1),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+){0,12}$/)
    .max(80),
  titulo: curto,
  subtitulo: z.string().trim().max(300),
  publico: z.string().trim().min(3).max(300),
  nivel: z.enum(NIVEIS),
  prerequisitos: z.array(z.string().trim().min(1).max(200)).max(6),
  resultados: z.array(resultadoSchema).min(1).max(LIMITES.resultados),
  modulos: z.array(moduloSchema).min(1).max(LIMITES.modulos),
  fontes: z
    .array(z.strictObject({ id: z.string().regex(/^F[1-9]\d?$/), titulo: curto, tipo: fonteSchema.shape.tipo }))
    .min(1)
    .max(LIMITES.fontes),
  verificacao: verificacaoSchema,
});
export type Curso = z.infer<typeof cursoSchema>;

export function lerCurso(x: unknown): Curso | null {
  const r = cursoSchema.safeParse(x);
  return r.success ? r.data : null;
}

/* ------------------------------------------------------------------ contas */

export function minutosDoCurso(c: Pick<Curso, 'modulos'>): number {
  return c.modulos.reduce((s, m) => s + m.aulas.reduce((a, x) => a + x.minutos, 0), 0);
}

export function aulasDoCurso(c: Pick<Curso, 'modulos'>): number {
  return c.modulos.reduce((s, m) => s + m.aulas.length, 0);
}

/** «4 h 30 min», «45 min». */
export function duracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`;
}

/** Título → slug: minúsculas, sem acentos, hífenes. */
export function slugDe(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .slice(0, 12)
    .join('-')
    .slice(0, 80)
    .replace(/-+$/, '');
}
