import { useEffect, useState } from 'react';

/**
 * O valor, mas só depois de parar de mudar durante `ms`. Serve as regiões
 * vivas: arrastar um deslizador muda o custo a cada passo, e um leitor de ecrã
 * deve ouvir o resultado final uma vez, não cada passo intermédio.
 */
export function useAtrasado<T>(valor: T, ms: number): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return atrasado;
}
