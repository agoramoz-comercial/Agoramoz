import { indicePassagens } from './fontes';
import {
  semPassagens,
  type Aula,
  type Bloco,
  type Curso,
  type Exercicio,
  type Fonte,
  type Nivel,
  type Pergunta,
  type Resultado,
} from './modelo';
import { verificarConteudoAula, verificarResultado, type Falha } from './verificar';

/**
 * Cursos escritos no repositório (D-49), publicados sem precisar da base.
 *
 * O rascunho passa pelo MESMO verificador que os cursos gerados no admin; o
 * que falhar é retirado e fica nas notas, e um teste exige zero falhas — é o
 * ciclo «escrever → verificar → corrigir» feito à mão, até dar certo. As
 * passagens de cada aula são as que ela cita.
 */

export interface RascunhoAula {
  readonly titulo: string;
  readonly objectivo: string;
  readonly minutos: number;
  readonly blocos: readonly Bloco[];
  readonly perguntas: readonly Pergunta[];
  readonly exercicio?: Exercicio;
}

export interface Rascunho {
  readonly slug: string;
  readonly titulo: string;
  readonly subtitulo: string;
  readonly publico: string;
  readonly nivel: Nivel;
  readonly prerequisitos: readonly string[];
  readonly resultados: readonly Resultado[];
  readonly modulos: readonly { titulo: string; resumo: string; aulas: readonly RascunhoAula[] }[];
  /** Quantas rondas de verificação e correcção foram precisas até zero falhas. */
  readonly rondas: number;
  readonly emitidoEm: string;
  readonly nota: string;
}

function citadas(a: RascunhoAula): string[] {
  const ids = [...a.blocos.flatMap((b) => b.fontes), ...a.perguntas.flatMap((p) => p.fontes), ...(a.exercicio?.fontes ?? [])];
  return [...new Set(ids)].slice(0, 40);
}

export function montarEstatico(r: Rascunho, fontes: readonly Fonte[]): { curso: Curso; falhas: Falha[] } {
  const passagens = indicePassagens(fontes);
  const falhas: Falha[] = [];
  const notas: string[] = [r.nota];
  let aceites = 0;
  let retirados = 0;

  const resultados = r.resultados.filter((x, i) => {
    const f = verificarResultado(x, { passagens }, `resultado ${i + 1}`);
    falhas.push(...f);
    if (f.length) retirados += 1;
    else aceites += 1;
    return !f.length;
  });

  const modulos = r.modulos
    .map((m, mi) => ({
      titulo: m.titulo,
      resumo: m.resumo,
      aulas: m.aulas
        .map((a, ai): Aula | null => {
          const ids = citadas(a);
          const v = verificarConteudoAula({ blocos: [...a.blocos], perguntas: [...a.perguntas], exercicio: a.exercicio }, { passagens });
          for (const f of v.falhas) falhas.push({ ...f, onde: `módulo ${mi + 1}, aula ${ai + 1}, ${f.onde}` });
          const ok = v.blocos.length + v.perguntas.length + (v.exercicio ? 1 : 0);
          aceites += ok;
          retirados += v.total - ok;
          if (v.total - ok) notas.push(`Módulo ${mi + 1}, aula ${ai + 1}: ${v.total - ok} elemento(s) retirado(s) na verificação.`);
          if (!v.blocos.length) return null;
          return {
            titulo: a.titulo,
            objectivo: a.objectivo,
            minutos: a.minutos,
            passagens: ids.length ? ids : ['F1.1'],
            blocos: v.blocos,
            perguntas: v.perguntas,
            ...(v.exercicio ? { exercicio: v.exercicio } : {}),
          };
        })
        .filter((a): a is Aula => a !== null),
    }))
    .filter((m) => m.aulas.length > 0);

  return {
    curso: {
      versao: 1,
      slug: r.slug,
      titulo: r.titulo,
      subtitulo: r.subtitulo,
      publico: r.publico,
      nivel: r.nivel,
      prerequisitos: [...r.prerequisitos],
      resultados,
      modulos,
      fontes: fontes.map(semPassagens),
      verificacao: { emitidaEm: r.emitidoEm, aceites, retirados, tentativas: r.rondas, notas: notas.slice(0, 60) },
    },
    falhas,
  };
}
