import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Portfolio } from '@/components/projetos/Portfolio';
import { SubmeterTerreno } from '@/components/projetos/SubmeterTerreno';
import { FinalCta } from '@/components/sections/FinalCta';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { DEMO_DISCLAIMER } from '@/content/types';
import { buildMetadata } from '@/lib/seo/site';

/**
 * Hub dos projetos — DEMONSTRAÇÃO TerraBuild (D-41). Fora do índice e do
 * sitemap até existir um projeto real e autorizado: números fictícios não
 * devem aparecer em pesquisas como se fossem da AGORAMOZ.
 */
export const metadata: Metadata = buildMetadata({
  title: 'Projetos: demonstração TerraBuild em Moçambique',
  description:
    'Demonstração com dados fictícios: terreno em 2D e 3D, construção simulada, materiais e custos, cenários agrícolas e financiamento por marcos verificáveis.',
  path: '/projetos',
  noindex: true,
});

const PASSOS = [
  { n: '01', titulo: 'Terreno', texto: 'Limites, relevo, água, acessos e risco, num gémeo digital do território.' },
  { n: '02', titulo: 'Projeto', texto: 'Construções implantadas no terreno, com quantidades, custos e interferências calculados.' },
  { n: '03', titulo: 'Capital', texto: 'Cenários de investimento e componentes financiáveis, cada um com orçamento e responsável.' },
  { n: '04', titulo: 'Execução verificável', texto: 'O dinheiro de cada marco só se liberta depois de evidência georreferenciada e validação técnica.' },
] as const;

export default function ProjetosPage() {
  return (
    <>
      <Section surface="deep" contour>
        <Breadcrumbs items={[{ name: 'Início', path: '/' }, { name: 'Projetos', path: '/projetos' }]} className="mb-10" />
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Badge variant="conceptual">Demonstração · dados fictícios</Badge>
          <span className="rule-label text-[color:var(--muted)]">AGORAMOZ TerraBuild</span>
        </div>
        <SectionHeading
          as="h1"
          eyebrow="Da terra ao investimento"
          title="Construa o futuro diretamente sobre o território"
          lead="Explore projetos agrícolas e imobiliários em 3D, simule construções, consulte materiais, custos, impacto e necessidades de capital, e acompanhe cada etapa desde o terreno até à operação."
          max="wide"
        />
        <p className="mt-8 max-w-[62ch] border-l-2 border-[color:var(--color-energy-500)] pl-4 text-sm text-[color:var(--muted)]">
          {DEMO_DISCLAIMER} O que escrever ou escolher nestas páginas não é guardado, enviado nem cobrado; só contamos, sem identificar ninguém, que partes da demonstração são usadas.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild size="lg">
            <Link href="/projetos/fazenda-inteligente-001#gemeo-3d">Explorar projeto em 3D</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/projetos/fazenda-inteligente-001#construtor">Simular construção</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/projetos/fazenda-inteligente-001#marcos">Ver plano de capital</Link>
          </Button>
          <SubmeterTerreno />
        </div>
      </Section>

      <Section surface="light" aria-labelledby="h-portfolio">
        <SectionHeading
          id="h-portfolio"
          eyebrow="Portefólio de demonstração"
          title="Projetos ativos, planeados e concluídos — todos fictícios."
          lead="O mapa mostra a localização aproximada, por província. Só a Fazenda Inteligente 001 tem gémeo digital nesta demonstração."
        />
        <div className="mt-12">
          <Portfolio />
        </div>
      </Section>

      <Section surface="deep" aria-labelledby="h-como">
        <SectionHeading id="h-como" eyebrow="Como funciona" title="Terra, arquitetura, agricultura, capital e execução num único gémeo digital." max="wide" />
        <ol className="mt-12 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map((p) => (
            <li key={p.n} className="border-t border-[color:var(--hairline)] pt-5">
              <span className="numeral text-[length:var(--text-h3)] text-[color:var(--muted)]">{p.n}</span>
              <h3 className="mt-3 font-display text-[length:var(--text-h3)] font-semibold">{p.titulo}</h3>
              <p className="mt-2 text-sm text-[color:var(--muted)]">{p.texto}</p>
            </li>
          ))}
        </ol>
        <p className="mt-12 max-w-[70ch] text-sm text-[color:var(--muted)]">
          Uma plataforma real usaria mapas e dados geoespaciais licenciados, levantamento com drone, modelos BIM e uma instituição de pagamento
          autorizada. Esta demonstração gera tudo no navegador, com dados fictícios, para mostrar a experiência antes de existir um terreno.
        </p>
      </Section>

      <Section surface="deep" contour>
        <FinalCta />
      </Section>
    </>
  );
}
