import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Assistente } from '@/components/projetos/Assistente';
import { CamadasAcesso } from '@/components/projetos/CamadasAcesso';
import { Cenarios } from '@/components/projetos/Cenarios';
import { Construtor } from '@/components/projetos/Construtor';
import { GemeoProvider } from '@/components/projetos/estado';
import { Marcos } from '@/components/projetos/Marcos';
import { PainelAgricola } from '@/components/projetos/PainelAgricola';
import { Visualizador } from '@/components/projetos/Visualizador';
import { FinalCta } from '@/components/sections/FinalCta';
import { Badge } from '@/components/ui/Badge';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { FAZENDA_001 as P } from '@/content/projetos/fazenda-inteligente-001';
import { DEMO_DISCLAIMER } from '@/content/types';
import { milhoes, num } from '@/lib/terrabuild/formato';
import { resumoCapital } from '@/lib/terrabuild/obra';
import { buildMetadata } from '@/lib/seo/site';
import { cn } from '@/lib/utils/cn';

/**
 * Ficha da Fazenda Inteligente 001 — DEMONSTRAÇÃO TerraBuild (D-41).
 * Dados fictícios, nada guardado, fora do índice. O gémeo, o construtor, o
 * painel agrícola, os cenários, os marcos e o assistente partilham um só
 * estado em memória (`GemeoProvider`).
 */
export const metadata: Metadata = buildMetadata({
  title: 'Fazenda Inteligente 001: demonstração (dados fictícios)',
  description:
    'Gémeo digital fictício de uma fazenda de 12 ha: camadas, linha temporal da obra, quantidades e custos ao vivo, cenários agrícolas e marcos simulados.',
  path: '/projetos/fazenda-inteligente-001',
  noindex: true,
});

const SECCOES = [
  ['#gemeo', 'Gémeo digital'],
  ['#construtor', 'Construtor'],
  ['#agricultura', 'Agricultura'],
  ['#cenarios', 'Cenários'],
  ['#marcos', 'Marcos'],
  ['#acesso', 'Acesso'],
  ['#assistente', 'Assistente'],
  ['#riscos', 'Riscos'],
] as const;

const MATURIDADE = ['Conceito', 'Em validação', 'Aprovado', 'As built'] as const;

const RISCOS = [
  ['Dados 3D insuficientes', 'Cobertura ou resolução fraca no local real.', 'Validar a cobertura antes de escolher o terreno; levantamento com drone ou fotogrametria como alternativa.'],
  ['Orçamentos incorretos', 'Modelo incompleto ou preços desatualizados.', 'Versões, faixas de incerteza, contingência e aprovação por profissional qualificado.'],
  ['Atividade financeira não autorizada', 'Misturar pagamento, crowdfunding e investimento.', 'Instituição de pagamento autorizada, instrumento jurídico definido e KYC/AML antes de captar fundos.'],
  ['Dependência tecnológica', 'Um único fornecedor de mapas muda preço ou termos.', 'Arquitetura modular, formatos abertos (IFC) e levantamento com drone, quando o projeto for real.'],
  ['Visualização confundida com projeto aprovado', 'O realismo do modelo parece aprovação técnica.', 'Selo de maturidade visível em cada projeto (aqui: «conceito»): conceito, em validação, aprovado ou as built.'],
] as const;

export default function Fazenda001Page() {
  const capital = resumoCapital(P);
  return (
    <>
      <Section surface="deep" contour>
        <Breadcrumbs
          items={[
            { name: 'Início', path: '/' },
            { name: 'Projetos', path: '/projetos' },
            { name: P.nome, path: `/projetos/${P.slug}` },
          ]}
          className="mb-10"
        />
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Badge variant="conceptual">Demonstração · dados fictícios</Badge>
          <Badge>Maturidade: conceito</Badge>
        </div>
        <SectionHeading
          as="h1"
          eyebrow="AGORAMOZ TerraBuild"
          title={P.nome}
          lead="Um gémeo digital de uma propriedade agrícola fictícia: veja o terreno, a obra fase a fase, os materiais e custos de exemplo de cada decisão, os cenários de produção e o capital por marcos, tudo simulado."
          max="wide"
        />
        <p className="mt-8 max-w-[62ch] border-l-2 border-[color:var(--color-energy-500)] pl-4 text-sm text-[color:var(--muted)]">
          {DEMO_DISCLAIMER} Não é um projeto aprovado, um orçamento, nem uma oferta de investimento ou de financiamento. O que escrever ou escolher nesta página não é guardado, enviado nem cobrado; só contamos, sem identificar ninguém, que partes da demonstração são usadas.
        </p>
        <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4 lg:grid-cols-7">
          {(
            [
              ['Localização', `${P.provincia} (aproximada, fictícia)`],
              ['Área', `${num(P.areaHa)} ha`],
              ['Cultura principal', P.culturaPrincipal],
              ['Capital necessário', `${milhoes(capital.orcamento)} (fictício)`],
              ['Estado', 'Em execução (simulado)'],
              ['Risco', 'Médio'],
              ['Progresso', `${Math.round(capital.progresso)} % (simulado)`],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="border-t border-[color:var(--hairline)] pt-3">
              <dt className="rule-label text-[color:var(--muted)]">{k}</dt>
              <dd className="mt-1.5 text-sm font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <nav aria-label="Secções desta página" className="mt-12">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {SECCOES.map(([href, nome]) => (
              <li key={href}>
                <a href={href} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
                  {nome}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Section>

      <GemeoProvider>
        <Section surface="deep" id="gemeo" aria-labelledby="h-gemeo" spacing="tight">
          <SectionHeading
            id="h-gemeo"
            number="01"
            eyebrow="Gémeo digital"
            title="O terreno, as redes e a obra, camada a camada."
            lead="Planta 2D em qualquer ligação; vista 3D a pedido. Mude a base, ligue camadas e percorra a linha temporal da obra."
          />
          <div className="mt-10">
            <Visualizador />
          </div>
        </Section>

        <Section surface="light" id="construtor" aria-labelledby="h-construtor">
          <SectionHeading
            id="h-construtor"
            number="02"
            eyebrow="Construtor e quantidades"
            title="Cada alteração à casa, com o seu custo de exemplo."
            lead="Mude as medidas, os materiais ou a implantação da casa principal: as quantidades, o custo, as interferências e a explicação da variação atualizam-se."
          />
          <div className="mt-12">
            <Construtor />
          </div>
        </Section>

        <Section surface="tint" id="agricultura" aria-labelledby="h-agricultura">
          <SectionHeading
            id="h-agricultura"
            number="03"
            eyebrow="Motor agrícola"
            title="Da área cultivada à margem, passando pela água."
            lead="Escolha a cultura e a área: produção, receita, custos, preço de equilíbrio, água e risco climático, em três cenários de mercado."
          />
          <div className="mt-12">
            <PainelAgricola />
          </div>
        </Section>

        <Section surface="light" id="cenarios" aria-labelledby="h-cenarios">
          <SectionHeading
            id="h-cenarios"
            number="04"
            eyebrow="Cenários"
            title="Essencial, recomendado ou avançado."
            lead="Capital necessário, custos, produção, receita, risco, tempo de recuperação do capital, empregos, água, energia e emissões, lado a lado — tudo fictício."
          />
          <div className="mt-12">
            <Cenarios />
          </div>
        </Section>

        <Section surface="deep" id="marcos" aria-labelledby="h-marcos">
          <SectionHeading
            id="h-marcos"
            number="05"
            eyebrow="Construção verificável por marcos"
            title="Na simulação, o dinheiro só avança quando a obra o prova."
            lead="Componentes por financiar, com orçamento, responsável, evidências georreferenciadas, validação técnica e histórico de versões — tudo de exemplo."
          />
          <div className="mt-12">
            <Marcos />
          </div>
        </Section>

        <Section surface="light" id="acesso" aria-labelledby="h-acesso">
          <SectionHeading
            id="h-acesso"
            number="06"
            eyebrow="Camadas de acesso"
            title="Público, investidor e técnico veem coisas diferentes."
            lead="Numa versão real, a separação protegeria plantas, dados comerciais e a localização exata do terreno. Aqui as três camadas estão abertas, com dados fictícios."
          />
          <div className="mt-12">
            <CamadasAcesso />
          </div>
        </Section>

        <Section surface="tint" id="assistente" aria-labelledby="h-assistente">
          <SectionHeading
            id="h-assistente"
            number="07"
            eyebrow="Assistente de projeto"
            title="Pergunte ao projeto."
            lead="Explica o terreno, a planta, os materiais, os riscos e o impacto de cada alteração no custo — com os números desta página."
          />
          <div className="mt-12">
            <Assistente />
          </div>
        </Section>
      </GemeoProvider>

      <Section surface="deep" id="riscos" aria-labelledby="h-riscos">
        <SectionHeading
          id="h-riscos"
          number="08"
          eyebrow="Riscos e como seria em produção"
          title="O que esta demonstração não é."
          lead="Não é um projeto aprovado, um orçamento, nem uma oferta de investimento ou de financiamento. Para passar a ser real, cada risco abaixo exigiria uma resposta concreta."
        />
        <ol className="mt-10 flex flex-wrap items-center gap-2 text-xs" aria-label="Maturidade do modelo">
          {MATURIDADE.map((m, i) => (
            <li
              key={m}
              aria-current={i === 0 ? 'step' : undefined}
              className={cn(
                'rule-label border px-3 py-2',
                i === 0 ? 'border-[color:var(--color-energy-500)] text-[color:var(--on-surface)]' : 'border-[color:var(--hairline)] text-[color:var(--muted)]',
              )}
            >
              {m}
            </li>
          ))}
        </ol>
        <div role="region" aria-label="Riscos e respostas" tabIndex={0} className="relative mt-10 overflow-x-auto focus-visible:outline-2">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="rule-label text-[color:var(--muted)]">
              <tr>
                <th scope="col" className="py-2 pr-6 font-normal">Risco</th>
                <th scope="col" className="py-2 pr-6 font-normal">Causa</th>
                <th scope="col" className="py-2 font-normal">Resposta prevista</th>
              </tr>
            </thead>
            <tbody>
              {RISCOS.map(([r, c, s]) => (
                <tr key={r} className="border-t border-[color:var(--hairline)] align-top">
                  <th scope="row" className="py-3 pr-6 font-medium">{r}</th>
                  <td className="py-3 pr-6 text-[color:var(--muted)]">{c}</td>
                  <td className="py-3">{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section surface="deep" contour>
        <FinalCta
          title="Tem um processo real para melhorar? Comece pelo diagnóstico."
          body="A demonstração não guarda nada. No diagnóstico, descreve o processo que quer melhorar e a AGORAMOZ analisa o problema, a viabilidade e o próximo passo — com o seu consentimento."
        />
      </Section>
    </>
  );
}
