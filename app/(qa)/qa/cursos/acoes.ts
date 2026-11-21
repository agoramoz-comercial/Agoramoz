'use server';

import { gerarAula, gerarPlano, gerarTema } from '@/lib/cursos/gerar';
import { criarMotor } from '@/lib/cursos/motor';

/**
 * Acções da pré-visualização: sem sessão, por isso SÓ com `ADMIN_PREVIEW=on`
 * e nunca na Vercel. O motor é o configurado (no QA, o simulado em
 * `.qa/cursos-motor-simulado.mjs`), pelo adaptador verdadeiro.
 */
const fechado = () => process.env.ADMIN_PREVIEW !== 'on' || Boolean(process.env.VERCEL);

export async function temaQa(entrada: unknown) {
  if (fechado()) return { ok: false as const, erro: 'Indisponível.' };
  try {
    return await gerarTema(criarMotor(), entrada);
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Motor indisponível.' };
  }
}

export async function planearQa(entrada: unknown) {
  if (fechado()) return { ok: false as const, erro: 'Indisponível.' };
  try {
    return await gerarPlano(criarMotor(), entrada);
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Motor indisponível.' };
  }
}

export async function aulaQa(entrada: unknown) {
  if (fechado()) return { ok: false as const, erro: 'Indisponível.' };
  try {
    return await gerarAula(criarMotor(), entrada);
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Motor indisponível.' };
  }
}
