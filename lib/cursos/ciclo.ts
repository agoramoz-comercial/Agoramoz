import { z } from 'zod';
import {
  aulaSchema,
  blocoSchema,
  exercicioSchema,
  moduloSchema,
  perguntaSchema,
  resultadoSchema,
  semPassagens,
  slugDe,
  type Aula,
  type Curso,
  type Fonte,
  type Nivel,
} from './modelo';
import { indicePassagens } from './fontes';
import { descreverFalhas, verificarConteudoAula, verificarResultado, type Falha } from './verificar';
import { promptAula, promptPlano, SCHEMA_AULA, SCHEMA_PLANO } from './prompts';

/**
 * O ciclo (D-49): gerar → verificar → devolver as falhas → gerar outra vez.
 *
 * O motor (a IA do ZabaEdu, ou o simulado nos testes) é só uma função que
 * recebe um pedido e devolve JSON. Tudo o resto é daqui:
 *
 * - até `MAX_TENTATIVAS` por peça (o plano; cada aula);
 * - cada tentativa leva a lista exacta do que falhou na anterior;
 * - fica a melhor tentativa (mais afirmações aceites, menos falhas);
 * - o que nunca passou é retirado e fica no relatório — nunca publicado.
 */

export const MAX_TENTATIVAS = 3;

export type Tarefa = 'planear' | 'escrever_aula';
export type Motor = (pedido: { tarefa: Tarefa; prompt: string; schema: object }) => Promise<unknown>;

export interface PedidoCurso {
  readonly tema: string;
  readonly publico: string;
  readonly nivel: Nivel;
  /** Minutos totais desejados (aproximado). */
  readonly minutos: number;
}

/* ------------------------------------------------------------------ plano */

const aulaPlanoSchema = aulaSchema.pick({ titulo: true, objectivo: true, minutos: true, passagens: true });
export const planoSchema = z.object({
  titulo: aulaSchema.shape.titulo,
  subtitulo: z.string().trim().max(300).default(''),
  prerequisitos: z.array(z.string().trim().min(1).max(200)).max(6).default([]),
  resultados: z.array(z.object(resultadoSchema.shape)).min(1).max(10),
  modulos: z
    .array(
      z.object({
        ...moduloSchema.pick({ titulo: true, resumo: true }).shape,
        aulas: z.array(z.object(aulaPlanoSchema.shape)).min(1).max(6),
      }),
    )
    .min(1)
    .max(8),
});
export type Plano = z.infer<typeof planoSchema>;

/*
 * O que vem do motor lê-se com tolerância à forma (chaves a mais caem, `null`
 * conta como ausente) e com rigor no conteúdo, que é o que o verificador vê.
 */
function semNulos(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(semNulos);
  if (x && typeof x === 'object')
    return Object.fromEntries(
      Object.entries(x)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, semNulos(v)]),
    );
  return x;
}
const conteudoAulaSchema = z.object({
  blocos: z.array(z.object(blocoSchema.shape)).max(12),
  perguntas: z.array(z.object(perguntaSchema.shape)).max(5).default([]),
  exercicio: z.object(exercicioSchema.shape).optional(),
});

/** Resultado de uma peça depois do ciclo. */
export interface Peca<T> {
  readonly valor: T | null;
  readonly falhas: readonly Falha[];
  readonly tentativas: number;
  /** Quantas afirmações ficaram e quantas foram retiradas. */
  readonly aceites: number;
  readonly retirados: number;
}

/** O que o motor devolveu não tem a forma pedida: conta como tentativa falhada. */
function formaInvalida(onde: string, e: z.ZodError): Falha[] {
  return e.issues
    .slice(0, 6)
    .map((i) => ({ onde, motivo: 'suporte_fraco' as const, detalhe: `forma inválida em ${i.path.join('.') || 'raiz'}: ${i.message}` }));
}

interface Tentativa<T> {
  valor: T | null;
  falhas: Falha[];
  aceites: number;
  retirados: number;
}

async function ciclo<T>(gerar: (falhasAnteriores: string[]) => Promise<Tentativa<T>>, max: number): Promise<Peca<T>> {
  let melhor: Tentativa<T> | null = null;
  let anteriores: string[] = [];
  let n = 0;
  while (n < max) {
    n += 1;
    let t: Tentativa<T>;
    try {
      t = await gerar(anteriores);
    } catch (e) {
      t = {
        valor: null,
        falhas: [{ onde: 'motor', motivo: 'suporte_fraco', detalhe: e instanceof Error ? e.message.slice(0, 160) : 'erro' }],
        aceites: 0,
        retirados: 0,
      };
    }
    const melhorQue = (a: Tentativa<T>, b: Tentativa<T> | null) =>
      !b ||
      (a.valor && !b.valor) ||
      (Boolean(a.valor) === Boolean(b.valor) && (a.aceites > b.aceites || (a.aceites === b.aceites && a.falhas.length < b.falhas.length)));
    if (melhorQue(t, melhor)) melhor = t;
    if (t.valor && t.falhas.length === 0) break;
    anteriores = descreverFalhas(t.falhas);
  }
  const m = melhor!;
  return { valor: m.valor, falhas: m.falhas, tentativas: n, aceites: m.aceites, retirados: m.retirados };
}

/* ------------------------------------------------------------ planear */

export async function planear(motor: Motor, pedido: PedidoCurso, fontes: readonly Fonte[], max = MAX_TENTATIVAS): Promise<Peca<Plano>> {
  const passagens = indicePassagens(fontes);
  return ciclo<Plano>(async (anteriores) => {
    const bruto = await motor({ tarefa: 'planear', prompt: promptPlano(pedido, fontes, anteriores), schema: SCHEMA_PLANO });
    const r = planoSchema.safeParse(semNulos(bruto));
    if (!r.success) return { valor: null, falhas: formaInvalida('plano', r.error), aceites: 0, retirados: 0 };
    const plano = r.data;
    const falhas: Falha[] = [];
    // Resultados: os que não passam saem.
    const resultados = plano.resultados.filter((x, i) => {
      const f = verificarResultado(x, { passagens }, `resultado ${i + 1}`);
      falhas.push(...f);
      return !f.length;
    });
    // Aulas: as passagens têm de existir; as inexistentes saem, e uma aula sem passagens sai.
    const modulos = plano.modulos
      .map((m, mi) => ({
        ...m,
        aulas: m.aulas
          .map((a, ai) => {
            const fora = a.passagens.filter((id) => !passagens.has(id));
            for (const id of fora) falhas.push({ onde: `módulo ${mi + 1}, aula ${ai + 1}`, motivo: 'passagem_inexistente', detalhe: id });
            return { ...a, passagens: a.passagens.filter((id) => passagens.has(id)) };
          })
          .filter((a) => a.passagens.length > 0),
      }))
      .filter((m) => m.aulas.length > 0);
    const retirados = plano.resultados.length - resultados.length;
    if (!resultados.length || !modulos.length) return { valor: null, falhas, aceites: resultados.length, retirados };
    return { valor: { ...plano, resultados, modulos }, falhas, aceites: resultados.length, retirados };
  }, max);
}

/* --------------------------------------------------------- escrever uma aula */

export type AulaPlano = Plano['modulos'][number]['aulas'][number];

export async function escreverAula(
  motor: Motor,
  contexto: { pedido: PedidoCurso; plano: Plano; modulo: number; aula: number },
  fontes: readonly Fonte[],
  max = MAX_TENTATIVAS,
): Promise<Peca<Aula>> {
  const passagens = indicePassagens(fontes);
  const a = contexto.plano.modulos[contexto.modulo]!.aulas[contexto.aula]!;
  const permitidas = new Set(a.passagens);
  const textoDasPassagens = a.passagens.map((id) => ({ id, texto: passagens.get(id) ?? '' }));
  return ciclo<Aula>(async (anteriores) => {
    const bruto = await motor({
      tarefa: 'escrever_aula',
      prompt: promptAula(contexto, a, textoDasPassagens, anteriores),
      schema: SCHEMA_AULA,
    });
    const r = conteudoAulaSchema.safeParse(semNulos(bruto));
    if (!r.success) return { valor: null, falhas: formaInvalida('aula', r.error), aceites: 0, retirados: 0 };
    const v = verificarConteudoAula(r.data, { passagens, permitidas });
    const aceites = v.blocos.length + v.perguntas.length + (v.exercicio ? 1 : 0);
    if (!v.blocos.length) return { valor: null, falhas: v.falhas, aceites, retirados: v.total - aceites };
    return {
      valor: { ...a, blocos: v.blocos, perguntas: v.perguntas, ...(v.exercicio ? { exercicio: v.exercicio } : {}) },
      falhas: v.falhas,
      aceites,
      retirados: v.total - aceites,
    };
  }, max);
}

/* ------------------------------------------------------------------ montar */

export interface Relatorio {
  readonly plano: Peca<Plano>;
  readonly aulas: readonly { modulo: number; aula: number; peca: Peca<Aula> }[];
}

/**
 * Junta o plano e as aulas escritas num curso. Uma aula que não passou fica
 * de fora (e o módulo, se ficar vazio); tudo isso vai para as notas.
 */
export function montarCurso(pedido: PedidoCurso, fontes: readonly Fonte[], rel: Relatorio, agora = new Date()): Curso | null {
  const plano = rel.plano.valor;
  if (!plano) return null;
  const notas: string[] = [];
  let aceites = rel.plano.aceites;
  let retirados = rel.plano.retirados;
  let tentativas = rel.plano.tentativas;
  if (rel.plano.retirados)
    notas.push(`Plano: ${rel.plano.retirados} resultado(s) de aprendizagem retirado(s) por não terem apoio nas fontes.`);

  const modulos = plano.modulos
    .map((m, mi) => {
      const aulas = m.aulas
        .map((_, ai) => {
          const r = rel.aulas.find((x) => x.modulo === mi && x.aula === ai);
          if (!r) {
            notas.push(`Módulo ${mi + 1}, aula ${ai + 1}: por escrever.`);
            return null;
          }
          aceites += r.peca.aceites;
          retirados += r.peca.retirados;
          tentativas += r.peca.tentativas;
          if (!r.peca.valor)
            notas.push(`Módulo ${mi + 1}, aula ${ai + 1}: retirada — nada passou a verificação em ${r.peca.tentativas} tentativa(s).`);
          else if (r.peca.retirados)
            notas.push(`Módulo ${mi + 1}, aula ${ai + 1}: ${r.peca.retirados} afirmação(ões) retirada(s) por falta de apoio nas fontes.`);
          return r.peca.valor;
        })
        .filter((a): a is Aula => a !== null);
      return { titulo: m.titulo, resumo: m.resumo, aulas };
    })
    .filter((m) => m.aulas.length > 0);
  if (!modulos.length) return null;

  return {
    versao: 1,
    slug: slugDe(plano.titulo) || 'curso',
    titulo: plano.titulo,
    subtitulo: plano.subtitulo,
    publico: pedido.publico,
    nivel: pedido.nivel,
    prerequisitos: plano.prerequisitos,
    resultados: plano.resultados,
    modulos,
    fontes: fontes.map(semPassagens),
    verificacao: { emitidaEm: agora.toISOString(), aceites, retirados, tentativas, notas: notas.slice(0, 60) },
  };
}
