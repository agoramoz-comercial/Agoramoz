import Link from 'next/link';
import { Button } from '@/components/ui/Button';
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
    <div className="mx-auto max-w-[46rem] text-center">
      <h2 className="text-[length:var(--text-h2)]">{title}</h2>
      <p className="mt-5 text-[length:var(--text-lead)] text-[color:var(--muted)]">{body}</p>
      <Button asChild size="lg" className="mt-9">
        <Link href={href}>{CTA.primary}</Link>
      </Button>
      <p className="mt-5 font-mono text-[length:var(--text-micro)] text-[color:var(--muted)]">
        Sem pressão comercial. Sem soluções genéricas. Sem promessas impossíveis.
      </p>
    </div>
  );
}
