import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { MagneticButton } from '@/components/motion/MagneticButton';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { CTA } from '@/content/site';

export function FinalCta({
  title = 'Antes de comprar mais tecnologia, descubra qual sistema produzirá maior impacto.',
  body = 'Partilhe o processo que pretende melhorar. A AGORAMOZ analisará o problema, a viabilidade e o próximo passo recomendado.',
  href = '/diagnostico',
}: {
  title?: string;
  body?: string;
  href?: string;
}) {
  return (
    <div>
      <SplitHeading
        as="h2"
        className="max-w-[16ch] text-[length:var(--text-h1)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]"
      >
        {title}
      </SplitHeading>

      <div className="rule mt-14 grid gap-10 pt-8 md:grid-cols-12 md:gap-8">
        <p className="text-[length:var(--text-lead)] text-[color:var(--muted)] md:col-span-6">{body}</p>

        <div className="flex flex-col gap-5 md:col-span-6 md:items-end">
          <MagneticButton>
            <Button asChild size="lg">
              <Link href={href}>
                {CTA.primary}
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </Button>
          </MagneticButton>
          <p className="rule-label text-[color:var(--muted)] md:text-right">
            Sem pressão comercial · Sem soluções genéricas · Sem promessas impossíveis
          </p>
        </div>
      </div>
    </div>
  );
}
