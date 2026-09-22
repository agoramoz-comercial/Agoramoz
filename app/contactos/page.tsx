import type { Metadata } from 'next';
import Link from 'next/link';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { COUNTRIES, COUNTRY_CODES } from '@/content/registry';
import { CTA, SITE } from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({
  title: 'Contactos',
  description:
    'Fale com a AGORAMOZ sobre o processo que pretende melhorar. Respondemos com o problema, a viabilidade e o próximo passo recomendado.',
  path: '/contactos',
});

export default function ContactosPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Início', path: '/' }, { name: 'Contactos', path: '/contactos' }]} />

      <Section surface="deep">
        <SectionHeading
          as="h1"
          eyebrow="Contactos"
          title="Descreva o processo. Respondemos com o próximo passo."
          lead="O caminho mais rápido é o formulário de diagnóstico: recolhe o contexto de que precisamos para responder com substância em vez de pedir uma reunião para perceber o assunto."
        />
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/diagnostico">{CTA.primary}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </Button>
        </div>
      </Section>

      <Section surface="light" aria-labelledby="h-mercados-contacto">
        <SectionHeading id="h-mercados-contacto" eyebrow="Por mercado" title="Onde operamos." />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {COUNTRY_CODES.map((code) => {
            const c = COUNTRIES[code];
            return (
              <div key={code} className="border border-[color:var(--border)] p-6">
                <h2 className="font-display text-[length:var(--text-h3)]">{c.name}</h2>
                <p className="mt-1.5 font-mono text-[length:var(--text-micro)] text-[color:var(--muted)]">
                  {c.dialCode} · {c.currency} · {c.privacyRegime === 'MZ' ? 'Proteção de dados' : c.privacyRegime}
                </p>
                <p className="mt-4 text-sm text-[color:var(--muted)]">{c.positioning}</p>
                {c.whatsapp ? (
                  <a
                    href={`https://wa.me/${c.whatsapp.e164}`}
                    className="mt-5 inline-block text-sm text-[color:var(--accent)] underline-offset-4 hover:underline"
                  >
                    WhatsApp {c.whatsapp.display}
                  </a>
                ) : (
                  <Link
                    href={`/diagnostico?pais=${code}`}
                    className="mt-5 inline-block text-sm text-[color:var(--accent)] underline-offset-4 hover:underline"
                  >
                    Solicitar diagnóstico para {c.name}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}
