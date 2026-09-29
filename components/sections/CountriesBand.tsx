import Link from 'next/link';
import { Reveal } from '@/components/motion/Reveal';
import { SoPortugues } from '@/components/ui/SoPortugues';
import { COUNTRIES, COUNTRY_CODES } from '@/content/registry';
import { NOME_PAIS, destinoDaEntrada } from '@/content/i18n/chrome';
import { CARTAO_GLOBAL, MERCADOS, POSICIONAMENTO } from '@/content/i18n/paginas';
import type { Idioma } from '@/content/types';
import { t } from '@/lib/i18n/texto';
import { cn } from '@/lib/utils/cn';

/**
 * Os mercados, três leituras conforme a largura:
 *
 * - **Telemóvel**: lista empilhada, uma entrada por linha.
 * - **Tablet**: cada entrada vira em linha — país à esquerda, posicionamento e
 *   ligação à direita. Empilhado a toda a largura, a 768px o nome do país
 *   ficava sozinho numa linha e o parágrafo esticava-se por 700px, que é largo
 *   demais para ler. Três colunas a essa largura não é opção: foi o que
 *   provocou a colisão que obrigou a recuar de `md:grid-cols-3`.
 * - **Desktop**: uma coluna por entrada, separadas por régua vertical. Com
 *   quatro entradas, 2×2: em quatro colunas o nome do país, no corpo `h2`,
 *   não cabia — «Moçambique» colidia com «Portugal» a 1440px (medido). Reduzir
 *   o corpo mudaria a escala tipográfica; a grelha muda, o desenho não.
 *
 * `comGlobal` acrescenta a quarta entrada pedida — PT-PT, PT-MZ, PT-BR e EN
 * num contexto global. Liga-se nas duas homes e nas páginas inglesas; nas
 * restantes (soluções em português, `/perfil`) a faixa fica como estava.
 */
export function CountriesBand({ idioma = 'pt', comGlobal = false }: { idioma?: Idioma; comGlobal?: boolean }) {
  const entradas = [
    ...COUNTRY_CODES.map((code) => ({
      chave: code,
      locale: COUNTRIES[code].locale as string,
      nome: t(NOME_PAIS[code], idioma),
      posicionamento: t(POSICIONAMENTO[code], idioma),
      href: `/${code}`,
      // As páginas de país só existem em português.
      soPortugues: idioma === 'en',
      hrefLang: idioma === 'en' ? 'pt' : undefined,
    })),
    ...(comGlobal
      ? [
          {
            chave: 'global',
            locale: 'EN',
            nome: t(CARTAO_GLOBAL.nome, idioma),
            posicionamento: t(CARTAO_GLOBAL.posicionamento, idioma),
            // O selo diz EN: leva ao global inglês, como o seletor e a barra de topo.
            href: destinoDaEntrada('global'),
            soPortugues: false,
            hrefLang: idioma === 'en' ? undefined : 'en',
          },
        ]
      : []),
  ];

  const quatro = entradas.length > 3;

  return (
    <Reveal className="mt-16">
      <ul className={cn('grid', quatro ? 'lg:grid-cols-2' : 'lg:grid-cols-3')}>
        {entradas.map((e, i) => (
          <li
            key={e.chave}
            data-animate
            className={
              quatro
                ? 'lg:odd:pr-8 lg:even:border-l lg:even:border-[color:var(--hairline)] lg:even:pl-8'
                : 'lg:border-l lg:border-[color:var(--hairline)] lg:first:border-l-0'
            }
          >
            <Link
              href={e.href}
              hrefLang={e.hrefLang}
              className={
                quatro
                  ? 'group grid h-full gap-x-10 gap-y-5 border-t border-dashed border-[color:var(--hairline)] py-8 md:grid-cols-12 lg:flex lg:flex-col lg:justify-between'
                  : 'group grid h-full gap-x-10 gap-y-5 border-t border-dashed border-[color:var(--hairline)] py-8 md:grid-cols-12 lg:flex lg:flex-col lg:justify-between lg:border-t-0 lg:px-8 lg:first:pl-0 lg:last:pr-0'
              }
            >
              <div className="md:col-span-5 lg:col-span-full">
                <div className="flex items-baseline gap-4">
                  <span className="rule-label text-[color:var(--muted)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="rule-label text-[color:var(--accent)]">{e.locale}</span>
                </div>

                <h3 className="mt-6 font-display text-[length:var(--text-h2)] leading-[1.02] font-bold tracking-[var(--tracking-heading)] transition-transform duration-500 group-hover:translate-x-1.5">
                  {e.nome}
                </h3>
              </div>

              <div className="flex flex-col justify-between md:col-span-7 lg:col-span-full lg:mt-5 lg:grow">
                <p className="max-w-[46ch] text-[color:var(--muted)]">{e.posicionamento}</p>

                <span className="rule-label mt-8 inline-flex items-center gap-2 text-[color:var(--accent)]">
                  {/*
                    Dois nós de texto, como o `Explorar {c.name}` original: num
                    `inline-flex` com `gap-2` cada nó é um item e o intervalo entre
                    eles é o `gap`, não um espaço. Juntar numa só string deslocava a
                    seta — medido pixel a pixel contra a versão anterior.
                  */}
                  {t(MERCADOS.explorar, idioma).split('{nome}')[0]}
                  {e.nome}
                  {e.soPortugues && <SoPortugues idioma={idioma} />}
                  <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
