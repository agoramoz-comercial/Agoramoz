import { Mensagens } from '@/components/admin/espaco/partes';
import { LimparParametros } from '@/components/admin/LimparParametros';

/**
 * O resultado de uma acção, no topo do ecrã: o erro (traduzido por
 * `executar`) ou a confirmação específica do código `ok`. Depois de mostrada,
 * a mensagem sai do URL — recarregar ou partilhar o endereço não volta a dizer
 * «Fase actualizada.» sobre algo que já passou.
 */
export function Feedback({
  erro,
  ok,
  textos,
}: {
  erro?: string;
  ok?: string;
  textos: Readonly<Record<string, string>>;
}) {
  return (
    <>
      <Mensagens erro={erro} ok={ok} textos={textos} />
      {erro || ok ? <LimparParametros chaves={['ok', 'erro']} /> : null}
    </>
  );
}
