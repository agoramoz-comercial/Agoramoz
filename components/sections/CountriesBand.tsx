import Link from 'next/link';
import { Reveal } from '@/components/motion/Reveal';
import { COUNTRIES, COUNTRY_CODES } from '@/content/registry';

/**
 * Três mercados, três leituras conforme a largura:
 *
 * - **Telemóvel**: lista empilhada, uma entrada por linha.
 * - **Tablet**: cada entrada vira em linha — país à esquerda, posicionamento e
 *   ligação à direita. Empilhado a toda a largura, a 768px o nome do país
 *   ficava sozinho numa linha e o parágrafo esticava-se por 700px, que é largo
 *   demais para ler. Três colunas a essa largura não é opção: foi o que
 *   provocou a colisão que obrigou a recuar de `md:grid-cols-3`.
 * - **Desktop**: três colunas separadas por régua vertical.
 */
export function CountriesBand() {
  return (
    <Reveal className="mt-16">
      <ul className="grid lg:grid-cols-3">
        {COUNTRY_CODES.map((code, i) => {
          const c = COUNTRIES[code];
          return (
            <li key={code} data-animate className="lg:border-l lg:border-[color:var(--hairline)] lg:first:border-l-0">
              <Link
                href={`/${code}`}
                className="group grid h-full gap-x-10 gap-y-5 border-t border-dashed border-[color:var(--hairline)] py-8 md:grid-cols-12 lg:flex lg:flex-col lg:justify-between lg:border-t-0 lg:px-8 lg:first:pl-0 lg:last:pr-0"
              >
                <div className="md:col-span-5 lg:col-span-full">
                  <div className="flex items-baseline gap-4">
                    <span className="rule-label text-[color:var(--muted)]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="rule-label text-[color:var(--accent)]">{c.locale}</span>
                  </div>

                  <h3 className="mt-6 font-display text-[length:var(--text-h2)] leading-[1.02] font-bold tracking-[var(--tracking-heading)] transition-transform duration-500 group-hover:translate-x-1.5">
                    {c.name}
                  </h3>
                </div>

                <div className="flex flex-col justify-between md:col-span-7 lg:col-span-full lg:mt-5 lg:grow">
                  <p className="max-w-[46ch] text-[color:var(--muted)]">{c.positioning}</p>

                  <span className="rule-label mt-8 inline-flex items-center gap-2 text-[color:var(--accent)]">
                    Explorar {c.name}
                    <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Reveal>
  );
}
