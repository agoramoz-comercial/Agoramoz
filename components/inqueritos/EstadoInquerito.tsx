import { INQ } from '@/content/i18n/inquerito';
import type { Idioma } from '@/content/types';
import { t } from '@/lib/i18n/texto';

export type EstadoMostrado = 'fechado' | 'expirado' | 'indisponivel';

/**
 * O ecrã de um link que não abre um formulário: fechado, expirado ou base em
 * baixo. Sem pormenores — quem tem o link não precisa de saber porquê, e quem
 * sonda não aprende nada. No mesmo palco do inquérito, sem caixa: a frase é o
 * conteúdo todo.
 */
export function EstadoInquerito({
  estado,
  idioma,
  nivel = 'h1',
  tituloRef,
}: {
  estado: EstadoMostrado;
  idioma: Idioma;
  /** `h2` quando aparece dentro da página de um inquérito que já tem `h1`. */
  nivel?: 'h1' | 'h2';
  /**
   * Quando o ecrã substitui um formulário (link fechado a meio do envio), o
   * botão com foco desaparece: o título recebe o foco, para quem usa leitor de
   * ecrã ouvir o que aconteceu.
   */
  tituloRef?: React.Ref<HTMLHeadingElement>;
}) {
  const Titulo = nivel;
  const titulo =
    estado === 'expirado'
      ? INQ.expiradoTitulo
      : estado === 'indisponivel'
        ? INQ.indisponivelTitulo
        : INQ.fechadoTitulo;
  const corpo = estado === 'indisponivel' ? INQ.indisponivelCorpo : INQ.fechadoCorpo;

  return (
    <div role={tituloRef ? undefined : 'status'} className="flex flex-1 flex-col justify-center py-10">
      <span aria-hidden className="block h-1 w-12 bg-[color:var(--on-surface)]" />
      <Titulo
        ref={tituloRef}
        tabIndex={tituloRef ? -1 : undefined}
        className="pergunta-titulo mt-6 max-w-[24ch] font-display font-bold text-balance outline-none"
      >
        {t(titulo, idioma)}
      </Titulo>
      <p className="mt-4 max-w-[48ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">
        {t(corpo, idioma)}
      </p>
    </div>
  );
}
