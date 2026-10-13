'use client';

import { useId, useRef, useState } from 'react';
import { CASA_REFERENCIA } from '@/content/projetos/fazenda-inteligente-001';
import { avaliarCenario } from '@/lib/terrabuild/cenarios';
import { milhoes, mzn, num } from '@/lib/terrabuild/formato';
import { resumoCapital } from '@/lib/terrabuild/obra';
import { cn } from '@/lib/utils/cn';
import { useGemeo } from './estado';
import { useRastreio } from './rastreio';
import { ROTULO } from './ui';

/**
 * Três camadas de informação sobre o mesmo projeto. Na versão real, as duas
 * últimas exigem conta, verificação de identidade e permissão; aqui estão
 * abertas — com aviso — para mostrar o que cada uma traz.
 */

const CAMADAS = [
  { id: 'publica', nome: 'Pública' },
  { id: 'investidor', nome: 'Investidor registado' },
  { id: 'tecnica', nome: 'Técnica' },
] as const;
type IdCamada = (typeof CAMADAS)[number]['id'];

export function CamadasAcesso() {
  const { projeto: p } = useGemeo();
  const rastrear = useRastreio(p.slug);
  const [ativa, setAtiva] = useState<IdCamada>('publica');
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const escolher = (i: number) => {
    const k = (i + CAMADAS.length) % CAMADAS.length;
    rastrear('access_layer');
    setAtiva(CAMADAS[k]!.id);
    refs.current[k]?.focus();
  };

  const capital = resumoCapital(p);
  const b = avaliarCenario(p, p.cenarios.find((c) => c.id === 'B')!, CASA_REFERENCIA);

  return (
    <div>
      <div role="tablist" aria-label="Camadas de acesso" className="flex flex-wrap gap-2">
        {CAMADAS.map((c, i) => (
          <button
            key={c.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${base}-tab-${c.id}`}
            aria-selected={ativa === c.id}
            aria-controls={`${base}-painel-${c.id}`}
            tabIndex={ativa === c.id ? 0 : -1}
            onClick={() => escolher(i)}
            onKeyDown={(e) => {
              const alvo = ({ ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: CAMADAS.length - 1 } as Record<string, number>)[e.key];
              if (alvo === undefined) return;
              e.preventDefault(); // sem isto, Home e End também rolam a página
              escolher(alvo);
            }}
            className={cn(
              'min-h-11 border px-4 text-sm',
              ativa === c.id ? 'border-[color:var(--color-signal-500)]' : 'border-[color:var(--border)] text-[color:var(--muted)]',
            )}
          >
            {c.nome}
          </button>
        ))}
      </div>

      {CAMADAS.map((c) => (
        <div
          key={c.id}
          role="tabpanel"
          id={`${base}-painel-${c.id}`}
          aria-labelledby={`${base}-tab-${c.id}`}
          hidden={ativa !== c.id}
          tabIndex={0}
          className="mt-6"
        >
          {c.id !== 'publica' ? (
            <p className="mb-5 border-l-2 border-[color:var(--color-energy-500)] pl-4 text-sm">
              Na versão real esta camada exige conta, verificação de identidade e permissão do promotor. Nesta demonstração está aberta para
              mostrar a ideia — e os dados continuam fictícios.
            </p>
          ) : null}
          {c.id === 'publica' ? (
            <Lista
              itens={[
                ['Conceito', 'Fazenda de 12 ha com produção, habitação, armazenamento, água, energia solar e processamento.'],
                ['Localização', `Aproximada: província de ${p.provincia}. Sem coordenadas — a localização exata é dado sensível.`],
                ['Área e cultura', `${num(p.areaHa)} ha · ${p.culturaPrincipal.toLowerCase()}`],
                ['Progresso', `${Math.round(capital.progresso)} % (simulado), fase «${p.fases[p.faseAtual]!.nome}»`],
                ['Capital-alvo (fictício)', `${milhoes(capital.orcamento)}`],
                ['Impacto (fictício)', `${b.empregos} empregos no cenário recomendado; ${num(b.emissoesEvitadasT, 1)} t CO₂/ano evitadas (fatores da demo)`],
                ['Riscos resumidos', 'Cheia no canto sudeste, custos ainda conceptuais, dependência de mercado.'],
                ['Componentes disponíveis para apoio (simulado)', `${capital.porIniciar + capital.emCurso} de ${p.componentes.length}`],
              ]}
            />
          ) : c.id === 'investidor' ? (
            <Lista
              itens={[
                ['Exemplo de caso económico (cenário B)', `Capital necessário ${milhoes(b.investimento)}, margem ${mzn(b.margemAnual)}/ano, ${b.retornoAnos === null ? 'sem recuperação do capital com estes pressupostos' : `recuperação simples do capital em ${num(b.retornoAnos, 1)} anos`} — tudo fictício. Não é uma projeção nem uma promessa de retorno.`],
                ['Orçamento por componente', p.componentes.map((x) => `${x.nome}: ${milhoes(x.orcamento)}`).join(' · ')],
                ['Plano de aquisições', 'Fornecedores fictícios A a H, com versões e desvios por componente (ver «Marcos»).'],
                ['Contratos autorizados', 'Exemplo: contrato de empreitada e de fornecimento solar — não existem nesta demonstração.'],
                ['Evidências de execução', `${p.componentes.reduce((s, x) => s + x.evidencias.length, 0)} registos georreferenciados na grelha local`],
                ['Pagamentos simulados', `${milhoes(capital.libertado)} (fictícios) libertados por tranches validadas`],
                ['Riscos detalhados', 'Ver «Riscos e como seria em produção», mais abaixo.'],
              ]}
            />
          ) : (
            <Lista
              itens={[
                ['Coordenadas', 'Grelha local em metros (E, N), com a origem no canto sudoeste. Latitude e longitude ocultas nesta demonstração.'],
                ['Plantas e quantidades', 'No construtor: esquema da casa, regras e quantidades com fórmula.'],
                ['Modelo BIM', 'Na versão real, IFC como formato neutro, versionado e ligado às quantidades.'],
                ['Cotações', 'Base de preços fictícia demo-2026-10 (MZN, sem IVA). Não são cotações.'],
                ['Aprovações', 'Licenças e aprovações por obter: nenhuma existe nesta demonstração.'],
                ['Documentação da propriedade', 'Título ou autorização de uso da terra (DUAT) a validar antes de qualquer projeto real.'],
                ['Segurança', 'Numa versão real: perfis e permissões, encriptação e registo de auditoria de cada alteração, incluindo as feitas por IA. Nada disto existe nesta demonstração.'],
              ]}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Lista({ itens }: { itens: readonly (readonly [string, string])[] }) {
  return (
    <dl className="grid gap-x-10 gap-y-4 text-sm md:grid-cols-2">
      {itens.map(([k, v]) => (
        <div key={k} className="border-t border-[color:var(--hairline)] pt-3">
          <dt className={ROTULO}>{k}</dt>
          <dd className="mt-1">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
