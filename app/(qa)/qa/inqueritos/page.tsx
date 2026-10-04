import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { CascaAdmin } from '@/components/admin/CascaAdmin';
import { EditorInquerito } from '@/components/admin/inqueritos/EditorInquerito';
import { specInquerito } from '@/lib/inqueritos/spec';

/**
 * Pré-visualização do construtor de inquéritos para o QA visual, sem sessão
 * nem base. Só com `ADMIN_PREVIEW=on` e nunca na produção da Vercel.
 *
 * O inquérito é UM EXEMPLO. As acções não escrevem nada: voltam a esta
 * página. `?papel=leitura` mostra a vista sem edição.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pré-visualização do construtor',
  robots: { index: false, follow: false, nocache: true },
};

async function semEfeito(): Promise<void> {
  'use server';
  redirect('/qa/inqueritos?ok=guardado');
}

const EXEMPLO = specInquerito.parse({
  schemaVersion: 'survey.v1',
  idioma: 'pt',
  boasVindas: {
    titulo: 'Como trabalha a sua equipa hoje',
    corpo: 'Exemplo de QA. Três perguntas.',
  },
  agradecimento: { titulo: 'Resposta registada. Obrigado.' },
  perguntas: [
    {
      tipo: 'escolha_unica',
      chave: 'p1',
      titulo: 'A empresa usa um ERP?',
      obrigatoria: true,
      opcoes: [
        { chave: 'o1', rotulo: 'Sim' },
        { chave: 'o2', rotulo: 'Não' },
      ],
    },
    {
      tipo: 'texto_curto',
      chave: 'p2',
      titulo: 'Qual?',
      obrigatoria: true,
      mostrarSe: { pergunta: 'p1', op: 'igual', valor: 'o1' },
    },
    { tipo: 'nps', chave: 'p3', titulo: 'Recomendaria a AGORAMOZ a um colega?' },
  ],
});

export default async function PreviaConstrutorPage({
  searchParams,
}: {
  searchParams: Promise<{ papel?: string; ok?: string }>;
}) {
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV === 'production') notFound();
  const { papel, ok } = await searchParams;
  const leitura = papel === 'leitura';

  return (
    <div
      data-surface="light"
      className="min-h-screen bg-[color:var(--surface)] text-[color:var(--on-surface)]"
    >
      <p
        role="note"
        className="bg-[color:var(--on-surface)] px-4 py-2 text-center text-xs text-[color:var(--surface)]"
      >
        Pré-visualização de QA — inquérito de exemplo, nada é guardado.
      </p>
      <CascaAdmin
        sessao={{
          nome: 'Pré-visualização',
          email: 'qa@exemplo.test',
          papel: leitura ? 'leitura' : 'comercial',
        }}
        inqueritos
      >
        <EditorInquerito
          dados={{
            id: '00000000-0000-4000-8000-000000000001',
            nome: 'Levantamento de processos (exemplo)',
            estado: 'aberto',
            emVigor: { versao: 2, publicadaEm: '2026-10-01T09:00:00.000Z' },
            temRascunho: false,
            spec: EXEMPLO,
          }}
          escreve={!leitura}
          ok={ok}
          guardar={semEfeito}
          definirActivo={semEfeito}
        />
      </CascaAdmin>
    </div>
  );
}
