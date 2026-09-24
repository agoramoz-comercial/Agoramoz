import type { Metadata } from 'next';
import { NotFoundContent } from '@/components/layout/NotFoundContent';
import { SiteChrome } from '@/components/layout/SiteChrome';

/**
 * Destino da reescrita do middleware quando `/admin` não deve existir para
 * quem pede. O estado 404 vem da própria reescrita; esta página só desenha.
 *
 * Porque não se reescreve para um caminho inventado: uma reescrita para uma
 * rota inexistente devolve o 404 certo e regista `NoFallbackError` no servidor
 * a cada pedido — um robô a varrer `/admin/*` encheria os registos de produção
 * com erros internos que não são erros. Medido: com esta rota, zero.
 *
 * E porque não chama `notFound()`: sendo uma rota estática, o `notFound()` em
 * pré-geração produz um documento HTML vazio com o conteúdo só no fluxo do
 * React — quem não tem JavaScript veria uma página em branco. Desenhar
 * directamente devolve HTML completo.
 *
 * Fica fora de `(site)` de propósito: a casca vem daqui, e dentro do grupo
 * ficaria casca dentro de casca.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function NaoEncontrado() {
  return (
    <SiteChrome>
      <NotFoundContent />
    </SiteChrome>
  );
}
