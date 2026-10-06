'use client';

import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from '@/components/ui/Button';

/**
 * O botão de submeter de um formulário do admin que diz que está a trabalhar
 * e não aceita segundo clique enquanto a acção corre. A 2026-10-06 um
 * «Publicar» lento foi carregado 6 vezes em 6 segundos — cada clique era mais
 * um pedido à base já encravada.
 */
export function BotaoEnviar({
  children,
  aEnviar,
  ...props
}: Omit<ButtonProps, 'type'> & { aEnviar: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending || undefined}>
      {pending ? aEnviar : children}
    </Button>
  );
}
