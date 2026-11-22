import { InicioV3, metadadosV3 } from '@/components/v3/inicio';

/** «O que estamos a ver» lê os artigos mais recentes do Moz News: renova a cada 10 min. */
export const revalidate = 600;

export const metadata = metadadosV3('pt');

export default function Pagina() {
  return <InicioV3 lingua="pt" />;
}
