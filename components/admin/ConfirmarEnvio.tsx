'use client';

import { useRef, useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { BotaoEnviar } from '@/components/admin/BotaoEnviar';

/**
 * Acção destrutiva em dois passos, dentro do próprio formulário: o primeiro
 * clique pede confirmação, o segundo envia. Sem `confirm()` do browser — não
 * é acessível nem estilizável, e algumas vistas embebidas bloqueiam-no.
 *
 * O foco vai para o botão de confirmação, e «Cancelar» devolve-o ao botão
 * inicial: quem usa teclado não fica perdido.
 */
export function ConfirmarEnvio({
  children,
  pergunta,
  confirmar,
  aEnviar,
  variant = 'outline',
  size = 'sm',
}: {
  children: React.ReactNode;
  pergunta: string;
  confirmar: string;
  aEnviar: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}) {
  const [aConfirmar, setAConfirmar] = useState(false);
  const caixa = useRef<HTMLSpanElement>(null);

  if (!aConfirmar) {
    return (
      <span ref={caixa} className="contents">
        <Button type="button" variant={variant} size={size} onClick={() => setAConfirmar(true)}>
          {children}
        </Button>
      </span>
    );
  }
  return (
    <div role="group" aria-label={pergunta} className="flex flex-wrap items-center gap-3">
      <p className="text-sm font-medium">{pergunta}</p>
      <BotaoEnviar size={size} aEnviar={aEnviar} autoFocus>
        {confirmar}
      </BotaoEnviar>
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => {
          setAConfirmar(false);
          requestAnimationFrame(() => caixa.current?.querySelector('button')?.focus());
        }}
      >
        Cancelar
      </Button>
    </div>
  );
}
