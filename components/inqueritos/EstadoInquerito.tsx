import { INQ } from '@/content/i18n/inquerito';
import type { Idioma } from '@/content/types';
import { t } from '@/lib/i18n/texto';

export type EstadoMostrado = 'fechado' | 'expirado' | 'indisponivel';

/**
 * O ecrã de um link que não abre um formulário: fechado, expirado ou base em
 * baixo. Sem pormenores — quem tem o link não precisa de saber porquê, e quem
 * sonda não aprende nada.
 */
export function EstadoInquerito({
  estado,
  idioma,
  nivel = 'h1',
}: {
  estado: EstadoMostrado;
  idioma: Idioma;
  /** `h2` quando aparece dentro da página de um inquérito que já tem `h1`. */
  nivel?: 'h1' | 'h2';
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
    <div
      role="status"
      className="border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-6 md:p-8"
    >
      <Titulo className="font-display text-[length:var(--text-h3)] text-balance">
        {t(titulo, idioma)}
      </Titulo>
      <p className="mt-3 max-w-[48ch] text-[color:var(--muted)]">{t(corpo, idioma)}</p>
    </div>
  );
}
