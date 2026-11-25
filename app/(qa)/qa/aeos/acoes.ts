'use server';

import { notFound } from 'next/navigation';
import type { RespostaPergunta } from '@/lib/admin/agentes-actions';

/** Pré-visualização de QA: respostas de exemplo, sem Kimi nem base. */
function soEmQa() {
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV === 'production') notFound();
}

export async function perguntarQa(): Promise<RespostaPergunta> {
  soEmQa();
  return {
    ok: true,
    resposta: 'Exemplo de QA: resposta do agente com base só no contexto do item.',
    propostas: [
      { tipo: 'tarefa_interna', titulo: 'Exemplo de QA: tarefa interna', descricao: '', estado: 'registada', guardada: true },
      { tipo: 'publicacao', titulo: 'Exemplo de QA: publicação', descricao: '', estado: 'precisa_aprovacao', guardada: true },
    ],
    retiradas: 0,
  };
}

export async function decidirQa(): Promise<{ ok: true }> {
  soEmQa();
  return { ok: true };
}
