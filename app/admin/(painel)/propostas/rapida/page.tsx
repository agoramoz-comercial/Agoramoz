import Link from 'next/link';
import { AdminHeading } from '@/components/admin/primitives';
import { EditorProposta } from '@/components/admin/propostas/EditorProposta';
import { requireStaff } from '@/lib/auth/session';

export const metadata = { title: 'Proposta sem guardar' };

async function hoje(): Promise<string> {
  return new Date(Date.now()).toISOString().slice(0, 10);
}

/**
 * Gerar sem guardar: carregar ou colar o documento, ver as folhas no desenho
 * editorial e descarregar o PDF, sem gravar nada na base. Funciona com ou
 * sem a 0020 aplicada, e para toda a equipa (o perfil «leitura» incluído:
 * não há escrita). O rascunho fica só neste separador.
 */
export default async function PropostaRapidaPage() {
  await requireStaff();
  return (
    <>
      <div className="print:hidden">
        <AdminHeading
          titulo="Gerar sem guardar"
          descricao="Carregue o documento (.docx, .pdf, .txt, .md) ou cole o texto, reveja as folhas e descarregue o PDF. Nada é gravado na base; o rascunho fica só neste separador."
          accao={
            <Link href="/admin/propostas" className="text-sm underline">
              Todas as propostas
            </Link>
          }
        />
      </div>
      <EditorProposta hoje={await hoje()} />
    </>
  );
}
