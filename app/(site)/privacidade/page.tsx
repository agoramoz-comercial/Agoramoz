import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SITE } from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({
  title: 'Política de privacidade',
  description: 'Como a AGORAMOZ trata os dados submetidos através deste website.',
  path: '/privacidade',
});

const BLOCKS = [
  {
    h: 'Que dados recolhemos',
    p: 'Apenas os dados que submete voluntariamente no formulário de diagnóstico: nome, email profissional, contacto telefónico, empresa, país, setor, dimensão da equipa, website, descrição do processo a melhorar, prazo de decisão, faixa de investimento indicativa e o seu papel na decisão.',
  },
  {
    h: 'Para que os usamos',
    p: 'Exclusivamente para responder ao seu pedido, preparar o diagnóstico e dar seguimento comercial ao assunto que submeteu. Não vendemos, alugamos nem partilhamos os seus dados com terceiros para fins de marketing.',
  },
  {
    h: 'Durante quanto tempo',
    p: 'Mantemos os dados enquanto o contacto comercial estiver ativo e pelo período necessário ao cumprimento de obrigações legais aplicáveis. Pode pedir a eliminação a qualquer momento.',
  },
  {
    h: 'Os seus direitos',
    p: 'Pode solicitar acesso, correção, oposição, limitação ou eliminação dos seus dados. Em Portugal aplicam-se os direitos previstos no RGPD; no Brasil, os previstos na LGPD. Para exercer qualquer um destes direitos, escreva-nos.',
  },
  {
    h: 'Cookies e medição',
    p: 'Este website não utiliza cookies de publicidade nem de perfilagem de terceiros. A medição de utilização é agregada e não identifica visitantes individualmente.',
  },
  {
    h: 'Segurança',
    p: 'Os dados submetidos são transmitidos por ligação cifrada. O acesso interno é limitado às pessoas que precisam dele para responder ao seu pedido.',
  },
];

export default function PrivacidadePage() {
  return (
    <Section surface="light">
      <BreadcrumbJsonLd items={[{ name: 'Início', path: '/' }, { name: 'Política de privacidade', path: '/privacidade' }]} />

      <SectionHeading
        as="h1"
        eyebrow="Privacidade"
        title="Como tratamos os seus dados."
        lead="Este documento descreve o tratamento dos dados submetidos através deste website. É deliberadamente curto: recolhemos pouco e usamo-lo para uma coisa só."
      />
      <div className="mt-12 max-w-[46rem] space-y-9">
        {BLOCKS.map((b) => (
          <section key={b.h}>
            <h2 className="font-display text-[length:var(--text-h3)]">{b.h}</h2>
            <p className="mt-3 text-[color:var(--muted)]">{b.p}</p>
          </section>
        ))}
        <section>
          <h2 className="font-display text-[length:var(--text-h3)]">Contacto</h2>
          <p className="mt-3 text-[color:var(--muted)]">
            Para qualquer questão sobre o tratamento dos seus dados:{' '}
            <a href={`mailto:${SITE.email}`} className="text-[color:var(--accent)] underline underline-offset-4">
              {SITE.email}
            </a>
          </p>
        </section>
      </div>
    </Section>
  );
}
