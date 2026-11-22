import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Accordion } from '@/components/ui/Accordion';
import { Hero } from '@/components/home/Hero';
import { SegmentSelector } from '@/components/home/SegmentSelector';
import { FlowDiagram } from '@/components/home/FlowDiagram';
import { ProblemGrid } from '@/components/sections/ProblemGrid';
import { CaminhosGrid } from '@/components/sections/CaminhosGrid';
import { ProdutosProva } from '@/components/sections/ProdutosProva';
import { OQueEstamosAVer } from '@/components/sections/OQueEstamosAVer';
import { CountriesBand } from '@/components/sections/CountriesBand';
import { SectorExplorer } from '@/components/sections/SectorExplorer';
import { ProcessTimeline } from '@/components/sections/ProcessTimeline';
import { OfferSection } from '@/components/sections/OfferSection';
import { ProofSection } from '@/components/sections/ProofSection';
import { Founders } from '@/components/sections/Founders';
import { FinalCta } from '@/components/sections/FinalCta';
import { Marquee } from '@/components/motion/Marquee';
import { Reveal } from '@/components/motion/Reveal';
import { FaqJsonLd } from '@/components/seo/JsonLd';
import { getSolutionSummaries } from '@/content/registry';
import { RESUMO_SOLUCAO } from '@/content/i18n/chrome';
import { INICIO, conteudoDoInicio } from '@/content/i18n/inicio';
import { CAMINHOS_SECAO, IDEIAS, ONDE } from '@/content/i18n/inicio-2026';
import type { Idioma } from '@/content/types';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';

/**
 * Ordem de 2026 (benchmark «Como vendem os gigantes»): a oferta e o primeiro
 * passo sobem, a explicação desce. 1 hero com garantias · 2 caminho · 3
 * problema → caminho · 4 três caminhos · 5 sistema · 6 diagnóstico · 7 prova
 * (produtos a funcionar) · 8 fases · 9 risco · 10 onde trabalhamos · 11 quem
 * lidera · 12 o que estamos a ver · 13 FAQ · 14 chamada final.
 *
 * A página inicial nos dois idiomas, com a marcação que estava em
 * `app/(site)/page.tsx`. As quatro entradas de mercado — PT-PT, PT-MZ, PT-BR
 * e EN num contexto global — aparecem nas duas: no seletor do topo, na faixa
 * de mercados e no filtro de setores.
 */
export function Inicio({ idioma }: { idioma: Idioma }) {
  const c = conteudoDoInicio(idioma);
  const capabilities = getSolutionSummaries().map((s) => t(RESUMO_SOLUCAO[s.slug].label, idioma));
  const { indice, aria } = INICIO;

  return (
    <>
      <FaqJsonLd items={c.faq} path={caminhoNoIdioma('/', idioma)} />

      {/* 1 — Hero (direcção A «Sinal»: a única excepção do vermelho) */}
      <Section
        surface="deep"
        spacing="tight"
        index={t(indice.inicio, idioma)}
        className="hero-sinal"
        aria-label={t(aria.apresentacao, idioma)}
      >
        <div className="pt-6 pb-4 lg:pt-10">
          <Hero idioma={idioma} />
        </div>
      </Section>

      {/* 2 — Seletor de país/setor */}
      <Section surface="deep" spacing="tight" aria-label={t(aria.caminho, idioma)}>
        <div className="grid lg:grid-cols-12">
          <div className="lg:col-span-7 lg:col-start-6">
            <SegmentSelector idioma={idioma} />
          </div>
        </div>
      </Section>

      {/* 3 — Problemas, cada um com o caminho que o resolve */}
      <Section surface="light" id="problemas" index={t(indice.problema, idioma)} aria-labelledby="h-problemas">
        <SectionHeading
          id="h-problemas"
          number="02"
          eyebrow={t(INICIO.problemas.eyebrow, idioma)}
          title={t(INICIO.problemas.titulo, idioma)}
          max="wide"
        />
        <ProblemGrid items={c.problemas} caminhos={idioma} />
      </Section>

      {/* 4 — A oferta em três caminhos (as sete capacidades lá dentro) */}
      <Section surface="deep" id="solucoes" index={t(indice.solucoes, idioma)} contour aria-labelledby="h-solucoes">
        <SectionHeading
          id="h-solucoes"
          number="03"
          eyebrow={t(CAMINHOS_SECAO.eyebrow, idioma)}
          title={t(CAMINHOS_SECAO.titulo, idioma)}
          lead={t(INICIO.solucoes.lead, idioma)}
        />
        <CaminhosGrid idioma={idioma} problemas={c.problemas} />
      </Section>

      {/* 5 — Como funciona por dentro (a secção com pin) */}
      <Section
        surface="dark"
        spacing="none"
        index={t(indice.sistema, idioma)}
        bleed
        className="py-[var(--space-section)] lg:py-0"
        aria-label={t(aria.sistema, idioma)}
      >
        <FlowDiagram idioma={idioma} />
      </Section>

      {/* 6 — Oferta de entrada, com o diagnóstico na página */}
      <Section surface="deep" id="diagnostico" index={t(indice.diagnostico, idioma)} contour aria-label={t(aria.oferta, idioma)}>
        <OfferSection idioma={idioma} formulario />
      </Section>

      {/* 7 — Prova: produtos AGORAMOZ a funcionar + demonstrações */}
      <Section surface="light" id="prova" index={t(indice.prova, idioma)} aria-labelledby="h-prova">
        <SectionHeading
          id="h-prova"
          number="04"
          eyebrow={c.provaSecao.eyebrow}
          title={c.provaSecao.title}
          lead={c.provaSecao.lead}
          max="wide"
        />
        <ProdutosProva idioma={idioma} />
        <ProofSection items={c.prova} idioma={idioma} />
      </Section>

      {/* 8 — Processo */}
      <Section surface="deep" id="processo" index={t(indice.processo, idioma)} aria-labelledby="h-processo">
        <SectionHeading
          id="h-processo"
          number="05"
          eyebrow={c.processo.eyebrow}
          title={c.processo.title}
          lead={c.processo.lead}
        />
        <ProcessTimeline idioma={idioma} />
      </Section>

      {/* 9 — O que fica escrito antes de começar (redução de risco) */}
      <Section surface="tint" index={t(indice.risco, idioma)} aria-labelledby="h-risco">
        <SectionHeading
          id="h-risco"
          number="06"
          eyebrow={c.risco.eyebrow}
          title={c.risco.title}
          lead={c.risco.body}
          max="wide"
        />
        <Reveal className="mt-16 grid gap-x-16 md:grid-cols-2">
          {c.risco.points.map((p, i) => (
            <p
              key={p}
              data-animate
              className="flex items-baseline gap-6 border-t border-dashed border-[color:var(--hairline)] py-6 text-[color:var(--muted)]"
            >
              <span className="rule-label shrink-0 text-[color:var(--accent)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              {p}
            </p>
          ))}
        </Reveal>
      </Section>

      {/* 10 — Onde trabalhamos: mercados → setores */}
      <Section surface="deep" id="mercados" index={t(ONDE.indice, idioma)} contour aria-labelledby="h-mercados">
        <SectionHeading
          id="h-mercados"
          number="07"
          eyebrow={t(INICIO.mercados.eyebrow, idioma)}
          title={t(INICIO.mercados.titulo, idioma)}
          lead={t(INICIO.mercados.lead, idioma)}
        />
        <CountriesBand idioma={idioma} comGlobal />

        <div id="setores" className="mt-[var(--space-section-tight)] scroll-mt-28">
          <SectionHeading
            id="h-setores"
            eyebrow={t(INICIO.setores.eyebrow, idioma)}
            title={t(INICIO.setores.titulo, idioma)}
            lead={t(INICIO.setores.lead, idioma)}
          />
          <SectorExplorer idioma={idioma} comGlobal />
        </div>
      </Section>

      {/* Faixa de capacidades — em movimento contínuo */}
      <Section surface="deep" spacing="none" bleed aria-hidden>
        <div className="rule border-b border-[color:var(--hairline)] py-6">
          <Marquee items={capabilities} />
        </div>
      </Section>

      {/* 11 — Fundadores */}
      <Section surface="dark" index={t(indice.equipa, idioma)} aria-labelledby="h-fundadores">
        <SectionHeading
          id="h-fundadores"
          number="08"
          eyebrow={c.fundadores.eyebrow}
          title={c.fundadores.title}
        />
        <Founders idioma={idioma} />
      </Section>

      {/* 12 — O que estamos a ver (Moz News) */}
      <Section surface="light" id="ideias" index={t(IDEIAS.indice, idioma)} aria-labelledby="h-ideias">
        <SectionHeading id="h-ideias" number="09" eyebrow={t(IDEIAS.eyebrow, idioma)} title={t(IDEIAS.titulo, idioma)} />
        <OQueEstamosAVer idioma={idioma} />
      </Section>

      {/* 13 — FAQ */}
      <Section surface="deep" id="faq" index={t(indice.perguntas, idioma)} aria-labelledby="h-faq">
        <SectionHeading
          id="h-faq"
          number="10"
          eyebrow={t(INICIO.faq.eyebrow, idioma)}
          title={t(INICIO.faq.titulo, idioma)}
        />
        <div className="mt-16 grid lg:grid-cols-12">
          <div className="lg:col-span-9 lg:col-start-4">
            <Accordion items={c.faq} />
          </div>
        </div>
      </Section>

      {/* 14 — CTA final: leva ao diagnóstico desta página, sem mudar de página */}
      <Section surface="dark" index={t(indice.contacto, idioma)} contour aria-label={t(aria.contacto, idioma)}>
        <FinalCta idioma={idioma} href="#diagnostico" />
      </Section>
    </>
  );
}
