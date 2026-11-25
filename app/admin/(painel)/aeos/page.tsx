import { LequeAeos } from '@/components/admin/aeos/LequeAeos';
import { MapaAeos } from '@/components/admin/aeos/MapaAeos';
import { mapaLeque } from '@/lib/admin/aeos-mapa';
import { carregarAccoes, permissoesAeos } from '@/lib/admin/aeos-servidor';
import { podeDecidir } from '@/lib/admin/agentes';
import { decidirAccao, perguntarAgente } from '@/lib/admin/agentes-actions';
import { requireStaff } from '@/lib/auth/session';

export const metadata = { title: 'Mapa AEOS' };

/**
 * O mapa do AGORAMOZ Enterprise Operating System: o leque (com os agentes
 * ZABATAINA) e, por baixo, o documento. As permissões são as da navegação:
 * quem não tem um espaço privado não vê a ligação nem a menção.
 */
export default async function AeosPage() {
  const sessao = await requireStaff();
  const permite = await permissoesAeos(sessao);
  const accoes = await carregarAccoes();
  return (
    <>
      <LequeAeos
        mapa={mapaLeque(permite, accoes)}
        accoes={accoes}
        podeDecidir={podeDecidir(sessao.papel)}
        podePerguntar={sessao.papel === 'admin' || sessao.papel === 'comercial'}
        perguntar={perguntarAgente}
        decidir={decidirAccao}
      />
      <MapaAeos permite={permite} />
    </>
  );
}
