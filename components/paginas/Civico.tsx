import Link from 'next/link';
import { Compositor, ConsultaProvider, Conversa } from '@/components/civico/Consulta';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { FaqJsonLd } from '@/components/seo/JsonLd';
import { Accordion } from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { CIVICO, MARCA_CIVICO } from '@/content/civico';
import { CHROME } from '@/content/i18n/chrome';

/**
 * AGORAMOZ Cívico.
 *
 * A lógica é a do portal cívico (`fonte-clara-source-guide.lovable.app`) — uma
 * pergunta entra, uma resposta com fontes sai, pelo motor Lovable. O que muda
 * é a página: o desenho é o do AGORAMOZ, a pergunta faz-se logo no hero (no
 * original estava atrás de um ecrã de boas-vindas em quatro passos), as fontes
 * de cada resposta ficam numeradas com o domínio à vista, e saem as promessas
 * que o original não podia provar (números de documentos, tempos, poupanças e
 * um depoimento sem autor).
 *
 * `activo` vem da rota: com o motor desligado, a página apresenta-se e o
 * campo fica desligado, a dizer porquê — nada é simulado.
 *
 * O trilho vem da rota, como nas outras páginas.
 */
export function Civico({ activo, trilho }: { activo: boolean; trilho: React.ReactNode }) {
  const faq = CIVICO.faq.map((f) => ({ q: f.q, a: f.a }));

  return (
    <ConsultaProvider activo={activo}>
      <FaqJsonLd items={faq} path="/civico" />

      <Section surface="deep" contour className="print:hidden">
        {trilho}
        <div className="rule flex flex-wrap items-baseline gap-4 pt-6">
          <span className="rule-label text-[color:var(--muted)]">{CIVICO.eyebrow}</span>
          <span className="rule-label text-[color:var(--accent)]">{MARCA_CIVICO}</span>
        </div>

        {/*
          A ordem no documento é a do telemóvel: título, campo, ficha. Em ecrãs
          largos a ficha sobe para o lado do título por colocação na grelha — a
          ordem de leitura e de tabulação não muda (a ficha não tem controlos).
        */}
        <div className="mt-10 grid gap-x-16 gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <SplitHeading
              as="h1"
              trigger="load"
              className="max-w-[17ch] text-[length:var(--text-h1)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]"
            >
              {CIVICO.titulo}
            </SplitHeading>
            <p className="mt-8 max-w-[54ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">
              {CIVICO.promessa}
            </p>
          </div>

          {/* O campo é o objecto do hero. Sem `data-animate`: um controlo tem de estar disponível no primeiro frame. */}
          <div className="border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-5 sm:p-8 lg:col-span-12 lg:row-start-2">
            <Compositor />
          </div>

          <dl className="self-end lg:col-span-4 lg:col-start-9 lg:row-start-1">
            {CIVICO.ficha.map((f) => (
              <div
                key={f.rotulo}
                className="flex items-baseline justify-between gap-6 border-t border-dashed border-[color:var(--hairline)] py-4"
              >
                <dt className="rule-label text-[color:var(--muted)]">{f.rotulo}</dt>
                <dd className="text-right text-sm font-medium">{f.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section surface="light" aria-label="Consulta e temas">
        <Conversa />
      </Section>

      <Section surface="tint" aria-labelledby="h-civico-passos" className="print:hidden">
        <SectionHeading id="h-civico-passos" eyebrow={CIVICO.passosEyebrow} title={CIVICO.passosTitulo} max="wide" />
        <ol className="mt-12 grid gap-px bg-[color:var(--border)] md:grid-cols-3">
          {CIVICO.passos.map((p, i) => (
            <li key={p.titulo} className="bg-[color:var(--surface)] p-6 sm:p-8">
              <span className="numeral chrome-text block text-[length:var(--text-numeral)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-6 text-lg font-bold">{p.titulo}</h3>
              <p className="mt-3 text-sm text-[color:var(--muted)]">{p.corpo}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section surface="light" aria-labelledby="h-civico-limites" className="print:hidden">
        <SectionHeading
          id="h-civico-limites"
          eyebrow={CIVICO.limitesEyebrow}
          title={CIVICO.limitesTitulo}
          max="wide"
        />
        <div className="mt-12 grid gap-x-16 gap-y-12 md:grid-cols-2">
          {[
            { titulo: CIVICO.eTitulo, itens: CIVICO.e, marca: '+' },
            { titulo: CIVICO.naoETitulo, itens: CIVICO.naoE, marca: '−' },
          ].map((coluna) => (
            <div key={coluna.titulo}>
              <h3 className="text-2xl font-bold tracking-[var(--tracking-heading)]">{coluna.titulo}</h3>
              <ul className="mt-5" role="list">
                {coluna.itens.map((item) => (
                  <li
                    key={item}
                    className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2 border-t border-[color:var(--hairline)] py-4"
                  >
                    <span aria-hidden className="font-techno text-[color:var(--muted)]">
                      {coluna.marca}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border border-dashed border-[color:var(--border)] bg-[color:var(--surface-raised)] p-6 sm:p-9">
          <h3 className="text-xl font-bold tracking-[var(--tracking-heading)]">{CIVICO.privacidadeTitulo}</h3>
          <ol className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-3" role="list">
            {CIVICO.privacidade.map((p, i) => (
              <li key={p} className="text-sm text-[color:var(--muted)]">
                <span aria-hidden className="font-techno mb-3 block tabular-nums text-[color:var(--on-surface)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {p}
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm">
            <Link href="/privacidade" className="underline underline-offset-4">
              Política de privacidade
            </Link>
          </p>
        </div>
      </Section>

      <Section surface="tint" aria-labelledby="h-civico-faq" className="print:hidden">
        <SectionHeading id="h-civico-faq" eyebrow={CIVICO.faqEyebrow} title={CIVICO.faqTitulo} max="wide" />
        <div className="mt-12 max-w-[52rem]">
          <Accordion items={faq} />
        </div>
      </Section>

      <Section surface="deep" contour aria-labelledby="h-civico-org" className="print:hidden">
        <SplitHeading
          as="h2"
          id="h-civico-org"
          className="max-w-[18ch] text-[length:var(--text-h1)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]"
        >
          {CIVICO.orgTitulo}
        </SplitHeading>
        <div className="rule mt-14 grid gap-10 pt-8 md:grid-cols-12 md:gap-8">
          <p className="text-[length:var(--text-lead)] text-[color:var(--muted)] md:col-span-6">{CIVICO.orgCorpo}</p>
          <div className="flex flex-col gap-3 sm:flex-row md:col-span-6 md:justify-end">
            <Button asChild size="lg">
              <Link href="/diagnostico">
                {CHROME.ctaPrimario.pt}
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={CIVICO.orgHref}>{CIVICO.orgCta}</Link>
            </Button>
          </div>
        </div>
      </Section>
    </ConsultaProvider>
  );
}
