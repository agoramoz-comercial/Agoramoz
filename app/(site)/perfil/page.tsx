import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import Link from 'next/link';
import { ViewTracker } from '@/components/analytics/ViewTracker';
import { CountriesBand } from '@/components/sections/CountriesBand';
import { FinalCta } from '@/components/sections/FinalCta';
import { Founders } from '@/components/sections/Founders';
import { ProcessTimeline } from '@/components/sections/ProcessTimeline';
import { ProofSection } from '@/components/sections/ProofSection';
import { SolutionsGrid } from '@/components/sections/SolutionsGrid';
import { FaqJsonLd } from '@/components/seo/JsonLd';
import { Accordion } from '@/components/ui/Accordion';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { PERFIL } from '@/content/landing/perfil';
import { OFFER, PROCESS, PROOF, PROOF_SECTION, RISK_REDUCTION, SITE, SOCIAL } from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';

/**
 * A página de destino do tráfego do perfil de empresa no Google.
 *
 * Existe para que esse tráfego seja isolável e medível: é o URL que vai no
 * campo «Website» do perfil, com `utm_campaign=gbp`, e é a única ligação onde
 * essa etiqueta aparece. Sem ela, «veio do perfil» e «veio da pesquisa normal»
 * seriam indistinguíveis — o Google envia o mesmo referenciador nos dois casos.
 *
 * SOBRE A DUPLICAÇÃO. `/mz` já é o hub de Moçambique, e duas páginas sobre a
 * mesma coisa competem uma com a outra na pesquisa. A diferença é o ângulo:
 * `/mz` posiciona-se num mercado; esta responde «encontrei-vos no Google, quem
 * são e o que acontece se vos contactar». Por isso o conteúdo é reutilizado —
 * oferta, processo, prova, soluções — e só o enquadramento é próprio. Se ainda
 * assim canibalizar, passa a `noindex, follow`: a função dela é converter um
 * canal conhecido, não disputar posições.
 */

export const metadata: Metadata = buildMetadata({
  title: PERFIL.seo.title,
  description: PERFIL.seo.description,
  path: '/perfil',
  imagemPropria: true,
});

export default function PerfilPage() {
  return (
    <>
      <ViewTracker event={{ name: 'gbp_landing_view', landing: 'perfil' }} />
      <FaqJsonLd items={PERFIL.faq} path="/perfil" />

      <Section surface="deep" contour>
        <Breadcrumbs items={[{ name: 'Início', path: '/' }, { name: 'Perfil', path: '/perfil' }]} className="mb-10" />
        <SectionHeading
          as="h1"
          eyebrow={PERFIL.hero.eyebrow}
          title={PERFIL.hero.h1}
          lead={PERFIL.hero.lead}
          max="wide"
        />
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/diagnostico"
            className="inline-flex min-h-12 items-center border border-[color:var(--accent)] px-6 text-sm"
          >
            {OFFER.name}
          </Link>
          <Link href="/solucoes" className="inline-flex min-h-12 items-center px-2 text-sm underline">
            Ver o que fazemos
          </Link>
        </div>
      </Section>

      <Section surface="light" aria-labelledby="h-promessa">
        <SectionHeading
          id="h-promessa"
          eyebrow={PERFIL.promessa.eyebrow}
          title={PERFIL.promessa.title}
          lead={PERFIL.promessa.lead}
          max="wide"
        />
        <ol className="mt-10 grid gap-4 sm:grid-cols-2">
          {PERFIL.promessa.passos.map((p, i) => (
            <li key={p} className="border-l-2 border-[color:var(--accent)] pl-5 text-[color:var(--muted)]">
              <span className="font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] text-[color:var(--accent)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="mt-1">{p}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section surface="tint" aria-labelledby="h-solucoes-perfil">
        <SectionHeading
          id="h-solucoes-perfil"
          eyebrow="O que fazemos"
          title="Cinco capacidades, um sistema."
          lead="Não são cinco produtos avulsos: são as peças de uma mesma infraestrutura, e um diagnóstico decide quais fazem falta."
          max="wide"
        />
        <SolutionsGrid />
      </Section>

      <Section surface="light" aria-labelledby="h-metodo-perfil">
        <SectionHeading
          id="h-metodo-perfil"
          eyebrow={PROCESS.eyebrow}
          title={PROCESS.title}
          lead={PROCESS.lead}
          max="wide"
        />
        <ProcessTimeline />
      </Section>

      <Section surface="deep" contour aria-labelledby="h-prova-perfil">
        <SectionHeading
          id="h-prova-perfil"
          eyebrow={PROOF_SECTION.eyebrow}
          title={PROOF_SECTION.title}
          lead={PROOF_SECTION.lead}
          max="wide"
        />
        <ProofSection items={PROOF} />
      </Section>

      <Section surface="light" aria-labelledby="h-risco-perfil">
        <SectionHeading
          id="h-risco-perfil"
          eyebrow={RISK_REDUCTION.eyebrow}
          title={RISK_REDUCTION.title}
          lead={RISK_REDUCTION.body}
          max="wide"
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {RISK_REDUCTION.points.map((p) => (
            <p key={p} className="border-l-2 border-[color:var(--accent)] pl-5 text-[color:var(--muted)]">
              {p}
            </p>
          ))}
        </div>
      </Section>

      <Section surface="tint" aria-labelledby="h-local-perfil">
        <SectionHeading
          id="h-local-perfil"
          eyebrow={PERFIL.local.eyebrow}
          title={PERFIL.local.title}
          lead={PERFIL.local.lead}
          max="wide"
        />
        <CountriesBand />
      </Section>

      <Section surface="light" aria-labelledby="h-quem-perfil">
        <Founders />
      </Section>

      <Section surface="deep" contour aria-labelledby="h-faq-perfil">
        <SectionHeading id="h-faq-perfil" eyebrow="Perguntas frequentes" title="O que nos perguntam primeiro." max="wide" />
        <Accordion items={[...PERFIL.faq]} className="mt-12" />
      </Section>

      <Section surface="light" aria-labelledby="h-contacto-perfil">
        <SectionHeading
          id="h-contacto-perfil"
          eyebrow="Contacto"
          title="Fale connosco pelo canal que preferir."
          lead="O diagnóstico é o caminho mais rápido para uma resposta útil, porque já traz o contexto. Mas se preferir escrever primeiro, escreva."
          max="wide"
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {SOCIAL.map((s) => (
            <li key={s.id}>
              <a
                href={s.href}
                target={s.id === 'whatsapp' ? '_blank' : undefined}
                rel={s.id === 'whatsapp' ? 'noopener noreferrer' : undefined}
                className="flex min-h-12 items-center border-l-2 border-[color:var(--accent)] pl-5 underline underline-offset-4"
              >
                {s.label} · {s.handle}
              </a>
            </li>
          ))}
          <li>
            <a
              href={`mailto:${SITE.email}`}
              className="flex min-h-12 items-center border-l-2 border-[color:var(--accent)] pl-5 underline underline-offset-4"
            >
              Correio · {SITE.email}
            </a>
          </li>
        </ul>
      </Section>

      <Section surface="deep" contour>
        <FinalCta />
      </Section>
    </>
  );
}
