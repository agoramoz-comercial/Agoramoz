import { describe, expect, it } from 'vitest';
import { montarEstatico } from '@/lib/cursos/estaticos';
import { numerosForaDoOriginal } from '@/lib/cursos/fontes';
import { cursoSchema, fonteSchema } from '@/lib/cursos/modelo';
import { descreverFalhas, numeros } from '@/lib/cursos/verificar';
import { RASCUNHO } from '@/content/cursos/ia-transporte-logistica/curso';
import { FONTES } from '@/content/cursos/ia-transporte-logistica/fontes';

/**
 * O ciclo «escrever → verificar → corrigir» do curso escrito no repositório:
 * o verificador tem de encontrar ZERO falhas. Uma afirmação, um número, um
 * gráfico ou uma conta sem apoio nas fontes parte este teste.
 */
describe('IA para Transporte e Logística em Moçambique', () => {
  const { curso, falhas } = montarEstatico(RASCUNHO, FONTES);

  it('as fontes têm a forma certa', () => {
    for (const f of FONTES) expect(fonteSchema.safeParse(f).success, f.id).toBe(true);
  });

  it('cada número da tradução está no original', () => {
    const fora = FONTES.flatMap((f) =>
      f.passagens.flatMap((p) => numerosForaDoOriginal(p.texto, p.original ?? p.texto, numeros).map((n) => `${p.id}: ${n}`)),
    );
    expect(fora).toEqual([]);
  });

  it('o verificador não encontra nenhuma falha', () => {
    expect(descreverFalhas(falhas)).toEqual([]);
  });

  it('nada foi retirado e o curso é válido', () => {
    expect(curso.verificacao.retirados).toBe(0);
    expect(cursoSchema.safeParse(curso).success).toBe(true);
    expect(curso.modulos.flatMap((m) => m.aulas)).toHaveLength(13);
    expect(curso.modulos.flatMap((m) => m.aulas).every((a) => a.exercicio)).toBe(true);
  });
});
