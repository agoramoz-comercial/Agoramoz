import { montarEstatico } from '@/lib/cursos/estaticos';
import type { Curso } from '@/lib/cursos/modelo';
import { RASCUNHO as IA_TRANSPORTE } from './ia-transporte-logistica/curso';
import { FONTES as FONTES_IA_TRANSPORTE } from './ia-transporte-logistica/fontes';

/**
 * Cursos publicados a partir do repositório (D-49). Aparecem em /cursos com
 * os da base (0022), sem depender dela; os da base com o mesmo endereço
 * ficam por baixo destes.
 */

export interface CursoEstatico {
  readonly curso: Curso;
  readonly publicadoEm: string;
}

export const CURSOS_ESTATICOS: readonly CursoEstatico[] = [
  { curso: montarEstatico(IA_TRANSPORTE, FONTES_IA_TRANSPORTE).curso, publicadoEm: IA_TRANSPORTE.emitidoEm },
];
