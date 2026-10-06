import Image, { type StaticImageData } from 'next/image';
import { Linkedin } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { DitherMark } from '@/components/ui/DitherMark';
import { FOUNDERS } from '@/content/site';
import { CHROME } from '@/content/i18n/chrome';
import { FUNDADORES, conteudoDoInicio } from '@/content/i18n/inicio';
import type { Idioma } from '@/content/types';
import { t } from '@/lib/i18n/texto';
import gerson from '@/public/equipa/gerson.png';
import sheinaz from '@/public/equipa/sheinaz.png';

/**
 * Perfis de quem lidera.
 *
 * Em repouso: retrato de estúdio sobre vermelho (`.qa/retratos.mjs`) numa
 * janela quadrada, numeral techno, nome e cargo. No estado activo: chapa de
 * tinta sobre o retrato, com a responsabilidade e a ligação ao LinkedIn.
 *
 * Três decisões que não são de gosto:
 *
 * 1. A revelação é CSS, não GSAP. A verificação de QA carrega as páginas sem
 *    JavaScript; um estado de sobreposição dependente do GSAP deixaria a
 *    biografia inalcançável nesse cenário. O `Reveal` continua a tratar da
 *    entrada, que é ornamento e pode faltar.
 *
 * 2. A sobreposição só existe onde há rato — `@media (hover: hover) and
 *    (pointer: fine)` em `globals.css`. Em toque, o mesmo texto fica no fluxo,
 *    sempre visível. É onde a referência visual falha: lá, quem usa telemóvel
 *    ou teclado nunca lê a biografia.
 *
 * 3. O retrato não tem `priority`. A secção está abaixo da dobra nas três
 *    páginas onde aparece — `/`, `/perfil` e `/sobre` — e marcá-la como
 *    prioritária competiria com o LCP real de cada uma delas.
 *
 * O bloco de credenciais só existe quando há credenciais. Ver a nota em
 * `content/site.ts` sobre porque é que esse array está vazio de propósito.
 */

/**
 * Retrato por pessoa. O `Record` sobre os literais de `photo` é o que impede,
 * em tempo de compilação, acrescentar um fundador e esquecer o retrato: falta
 * uma chave, o `pnpm build` reprova. Não é um teste que alguém possa apagar.
 */
type ChaveRetrato = (typeof FOUNDERS.people)[number]['photo'];

const RETRATOS: Record<ChaveRetrato, StaticImageData> = { gerson, sheinaz };

/**
 * O cartão ocupa metade da largura útil a partir de `md`. O contentor máximo é
 * 88rem com goteira, pelo que 34rem é o tecto real de cada coluna — pedir mais
 * ao `next/image` seria servir píxeis que ninguém vê.
 */
const TAMANHOS = '(min-width: 1024px) 34rem, (min-width: 768px) 44vw, 92vw';

export function Founders({ idioma = 'pt' }: { idioma?: Idioma }) {
  const { corpo } = conteudoDoInicio(idioma).fundadores;
  return (
    <Reveal className="mt-16">
      <ul className="grid gap-8 md:grid-cols-2 lg:gap-10">
        {FOUNDERS.people.map((p, i) => (
          <li key={p.name} data-animate>
            <article className="perfil-cartao">
              <div className="perfil-janela">
                {/*
                  `alt` vazio de propósito: o nome está imediatamente a seguir,
                  no mesmo cartão. Repeti-lo aqui faria um leitor de ecrã
                  anunciar a mesma pessoa duas vezes seguidas.
                */}
                <Image
                  src={RETRATOS[p.photo]}
                  alt=""
                  sizes={TAMANHOS}
                  fill
                  className="perfil-retrato"
                />
              </div>

              <div className="perfil-chapa">
                <p className="max-w-[42ch] text-sm leading-[var(--leading-body)]">{corpo(p.photo)}</p>

                <a
                  href={p.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-11 items-center gap-2.5 transition-opacity hover:opacity-75"
                >
                  <Linkedin aria-hidden className="size-4" />
                  <span className="rule-label">{t(FUNDADORES.linkedin, idioma).replace('{nome}', p.name)}</span>
                  <span
                    aria-hidden
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  >
                    ↗
                  </span>
                  <span className="sr-only">{t(CHROME.novoSeparador, idioma)}</span>
                </a>
              </div>

              <div className="flex items-start gap-4 border-t border-dashed border-[color:var(--hairline)] p-6 md:p-7">
                <span className="numeral text-[length:var(--text-h3)] text-[color:var(--muted)]">
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div className="min-w-0">
                  <h3 className="font-display text-[length:var(--text-h3)] leading-[var(--leading-heading)] font-bold tracking-[var(--tracking-heading)]">
                    {p.name}
                  </h3>
                  <p className="mt-2 flex items-center gap-2.5">
                    <DitherMark size="sm" />
                    <span className="rule-label text-[color:var(--accent)]">{p.role}</span>
                  </p>
                </div>
              </div>
            </article>

            {p.certifications.length > 0 && (
              <div className="mt-6">
                <p className="rule-label text-[color:var(--muted)]">{t(FUNDADORES.certificacoes, idioma)}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {p.certifications.map((c) => (
                    <li
                      key={`${c.issuer}-${c.name}`}
                      className="border border-dashed border-[color:var(--hairline)] px-3 py-2"
                    >
                      <span className="block text-sm text-[color:var(--on-surface)]">{c.name}</span>
                      <span className="rule-label mt-0.5 block text-[color:var(--muted)]">
                        {c.issuer}
                        {c.year ? ` · ${c.year}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
