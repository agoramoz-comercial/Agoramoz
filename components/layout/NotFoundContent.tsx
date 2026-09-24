import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Section } from '@/components/ui/Section';

/**
 * O conteúdo da página de 404, partilhado por dois sítios que precisam dele
 * por caminhos diferentes: `app/not-found.tsx`, para URL que não correspondem
 * a rota nenhuma, e `app/nao-encontrado/page.tsx`, para onde o middleware
 * reescreve o que não deve existir para quem pede.
 *
 * Dá sempre duas saídas: uma página sem navegação é um beco.
 */
export function NotFoundContent() {
  return (
    <Section surface="deep">
      <div className="mx-auto max-w-[36rem] py-16 text-center">
        <Eyebrow>Erro 404</Eyebrow>
        <h1 className="mt-5 text-[length:var(--text-h1)]">Esta página não existe.</h1>
        <p className="mt-5 text-[length:var(--text-lead)] text-[color:var(--muted)]">
          Pode ter seguido uma ligação antiga, ou a combinação de país e setor que procura ainda não
          tem página publicada.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/diagnostico">Solicitar Diagnóstico Estratégico</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}
