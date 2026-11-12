import { MapaAeos } from '@/components/admin/aeos/MapaAeos';
import { modulosDaSessao } from '@/lib/auth/modulos';
import { requireStaff } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';

export const metadata = { title: 'Mapa AEOS' };

/**
 * O mapa do AGORAMOZ Enterprise Operating System. As permissões são as da
 * navegação: quem não tem um espaço privado não vê a ligação nem a menção.
 */
export default async function AeosPage() {
  const sessao = await requireStaff();
  const modulos = await modulosDaSessao();
  const env = serverEnv();
  return (
    <MapaAeos
      permite={{
        inqueritos: env.SURVEYS === 'on',
        news: env.NEWS_BLOG === 'on',
        energia: modulos.includes('energia'),
        direcao: modulos.includes('direcao'),
        admin: sessao.papel === 'admin',
      }}
    />
  );
}
