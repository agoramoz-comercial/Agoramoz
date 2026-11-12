import { AdminHeading } from '@/components/admin/primitives';
import { EditorProposta } from '@/components/admin/propostas/EditorProposta';
import { requireStaff } from '@/lib/auth/session';

export const metadata = { title: 'Propostas' };

/** O dia de hoje, fora do corpo do componente (o compilador do React recusa ler a hora a desenhar). */
async function hoje(): Promise<string> {
  return new Date(Date.now()).toISOString().slice(0, 10);
}

/**
 * Gestão de Propostas (AEOS, bloco 2): o criador de propostas no estilo
 * editorial A4 da AGORAMOZ. Nada é guardado no servidor — ver o editor.
 */
export default async function PropostasPage() {
  await requireStaff();
  return (
    <>
      <div className="print:hidden">
        <AdminHeading
          titulo="Propostas"
          descricao="Escreva a proposta à esquerda e veja as folhas A4 à direita, no estilo editorial AGORAMOZ. O total, as semanas e a validade são calculados. «Imprimir / guardar PDF» gera o documento pelo browser. A proposta fica só neste separador: exporte o rascunho para a guardar."
        />
      </div>
      <EditorProposta hoje={await hoje()} />
    </>
  );
}
