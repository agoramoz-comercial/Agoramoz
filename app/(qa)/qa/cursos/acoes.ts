'use server';

import { gerarAula, gerarFontesPesquisa, gerarFonteTextoBase, gerarPlano, gerarTema } from '@/lib/cursos/gerar';
import { criarMotor } from '@/lib/cursos/motor';

/**
 * Acções da pré-visualização: sem sessão, por isso SÓ com `ADMIN_PREVIEW=on`
 * e nunca na Vercel. O motor é o configurado (no QA, o simulado em
 * `.qa/cursos-motor-simulado.mjs`), pelo adaptador verdadeiro.
 */
const fechado = () => process.env.ADMIN_PREVIEW !== 'on' || Boolean(process.env.VERCEL);

/** No QA, o link «confirma-se» se for de um domínio de exemplo: o QA não sai para a internet. */
const confirmarQa = async (u: string) => /^https:\/\/[a-z0-9.-]+\.example\.(org|com)\//.test(u) && !u.includes('nao-existe');

export async function pesquisaQa(entrada: unknown) {
  if (fechado()) return { ok: false as const, erro: 'Indisponível.' };
  try {
    return await gerarFontesPesquisa(criarMotor(), entrada, confirmarQa);
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Motor indisponível.' };
  }
}

export async function textoBaseQa(entrada: unknown) {
  if (fechado()) return { ok: false as const, erro: 'Indisponível.' };
  try {
    return await gerarFonteTextoBase(criarMotor(), entrada);
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Motor indisponível.' };
  }
}

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
