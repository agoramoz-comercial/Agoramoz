import { AdminHeading } from '@/components/admin/primitives';
import {
  CRITERIOS,
  DIAS_PARADA,
  DIAS_SEM_ACTIVIDADE,
  FASES,
  PRIORIDADE,
  PROBABILIDADE,
  SCORE_MINIMO,
  percentagem,
} from '@/lib/energia/modelo';
import { CAIXA, EnergiaNav, H2 } from './partes';

/**
 * O manual do Opportunity Operating System v1 — o texto do documento do
 * fundador, ao lado das regras que o sistema impõe. Estático: muda com o
 * processo, não com os dados.
 */

const TABELA = 'w-full min-w-[40rem] border-collapse text-left text-sm';
const TH = 'border-b border-[color:var(--border)] px-3 py-2 font-medium';
const TD = 'border-b border-[color:var(--border)] px-3 py-2 align-top';

const DIREITOS = [
  ['Abrir oportunidade', 'Aprova', 'Informado', 'Consultado', 'Informado'],
  ['Qualificar prioridade A', 'Recomenda', 'Aprova', 'Consultado', 'Consultado'],
  ['Definir parceiro', 'Responsável', 'Aprova', 'Consultado', 'Consultado'],
  ['Emitir proposta', 'Responsável', 'Aprova', 'Valida escopo', 'Valida termos'],
  ['Assinar MoU/contrato', 'Recomenda', 'Aprova/assina', 'Informado', 'Valida'],
  ['Comprometer investimento', 'Recomenda', 'Decide', 'Valida viabilidade', 'Valida exposição'],
  ['Abandonar oportunidade', 'Decide dentro do limite', 'Aprova casos estratégicos', 'Informado', 'Informado'],
  ['Transferir para execução', 'Responsável', 'Informado', 'Assume', 'Valida condições'],
] as const;

const REUNIOES = [
  {
    titulo: 'Segunda-feira: Pipeline, 30 minutos',
    itens: ['Novas oportunidades', 'Movimentos de etapa', 'Oportunidades bloqueadas', 'Próximas acções', 'Decisões necessárias'],
  },
  {
    titulo: 'Quinzenal: Comité de oportunidades, 60 minutos',
    itens: [
      'Prioridades A',
      'Business cases',
      'Alocação de recursos',
      'Riscos legais e financeiros',
      'Decisão: avançar, corrigir, incubar ou abandonar',
    ],
  },
  {
    titulo: 'Mensal: Revisão estratégica',
    itens: [
      'Sectores com maior tracção',
      'Parceiros activos',
      'Taxa de conversão',
      'Valor do pipeline',
      'Capacidade de execução',
      'Concentração de risco',
      'Lições das oportunidades perdidas',
    ],
  },
] as const;

const REGRAS = [
  ['Nenhuma oportunidade sem responsável.', 'Campo «Responsável» na ficha; a higiene do scorecard conta as que faltam.'],
  ['Nenhuma oportunidade sem próxima acção e data.', 'A base recusa gravar uma oportunidade activa sem as duas.'],
  [`Nenhuma oportunidade parada mais de ${DIAS_PARADA} dias sem decisão.`, 'Alerta no painel e na lista.'],
  [`Oportunidade sem actividade por ${DIAS_SEM_ACTIVIDADE} dias gera alerta.`, 'Alerta no painel e na lista.'],
  [`Qualificar exige o score mínimo (≥ ${SCORE_MINIMO}).`, 'A base recusa a etapa 4 ou seguinte sem os oito critérios e o total.'],
  ['Mudança para «qualificada» cria a sala documental.', 'As 12 pastas são criadas na primeira passagem à etapa 4.'],
  ['Oportunidade perdida exige o motivo.', 'A base recusa «Perdida» sem motivo.'],
  ['Uma oportunidade suspensa não conta como pipeline activo.', 'Perdidas e arquivadas ficam fora do pipeline e dos KPIs.'],
  ['A probabilidade não se baseia em «boa relação».', 'Vem da etapa (tabela abaixo), que tem critério de passagem.'],
  ['Todo contacto estratégico tem próxima acção ou fica inactivo.', '«Manter relação» não é uma próxima acção válida.'],
] as const;

const NAO_FAZER = [
  'Não desenvolver um sistema personalizado antes de validar o processo.',
  'Não medir sucesso pelo número de reuniões ou contactos.',
  'Não colocar todas as oportunidades no mesmo nível de prioridade.',
  'Não assinar parcerias sem proprietário, modelo económico e critérios de saída.',
  'Não permitir que informação estratégica exista apenas no WhatsApp ou na memória da Cofounder.',
] as const;

const PLANO = [
  {
    titulo: 'Semana 1: medição',
    itens: [
      'Inventariar todas as oportunidades e parceiros',
      'Mapear como uma oportunidade entra e avança',
      'Identificar documentos e canais actuais',
      'Classificar oportunidades activas',
      'Registar bloqueios e tempo parado',
    ],
  },
  {
    titulo: 'Semana 2: construção',
    itens: [
      'Etapas e critérios (já neste espaço)',
      'Score de qualificação (já neste espaço)',
      'Opportunity Memo (já neste espaço)',
      'Definir direitos de decisão',
      'Organizar estrutura documental (ligações SharePoint/Drive em cada pasta)',
    ],
  },
  {
    titulo: 'Semana 3: teste',
    itens: [
      'Inserir as dez oportunidades mais relevantes',
      'Realizar uma reunião de pipeline',
      'Aplicar o score',
      'Arquivar oportunidades sem adequação',
      'Produzir três memorandos completos',
      'Testar alertas',
    ],
  },
  {
    titulo: 'Semana 4: avaliação',
    itens: [
      'Medir qualidade dos dados',
      'Identificar etapas ambíguas',
      'Rever oportunidades bloqueadas',
      'Ajustar critérios',
      'Aprovar versão 1 do manual',
      'Decidir se existe alguma limitação que justifique desenvolvimento próprio',
    ],
  },
] as const;

/** Tabela larga: rola sozinha no telemóvel e o teclado chega lá (foco + nome). */
function Rolavel({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div role="region" aria-label={rotulo} tabIndex={0} className="overflow-x-auto focus-visible:outline-2">
      {children}
    </div>
  );
}

function Lista({ itens }: { itens: readonly string[] }) {
  return (
    <ul className="grid list-disc gap-1 pl-5 text-sm">
      {itens.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

export function ManualEnergia() {
  return (
    <>
      <AdminHeading
        titulo="Manual"
        descricao="Opportunity Operating System v1: como uma oportunidade entra, avança, é decidida e passa à execução."
      />
      <EnergiaNav activo="manual" />

      <div className="grid max-w-5xl gap-8">
        <section aria-labelledby="m-kpi" className={CAIXA}>
          <h2 id="m-kpi" className={H2}>
            KPI principal
          </h2>
          <p className="text-sm">
            Percentagem de oportunidades prioritárias com problema validado, decisor identificado, modelo económico preliminar e
            próxima decisão registada.
          </p>
          <p className="text-sm text-[color:var(--muted)]">
            Como o espaço o mede: oportunidades activas A ou B com o problema escrito, um stakeholder ligado como decisor ou sponsor,
            e as secções «Modelo de receita» e «Próxima decisão» do memo preenchidas.
          </p>
        </section>

        <section aria-labelledby="m-etapas" className={CAIXA}>
          <h2 id="m-etapas" className={H2}>
            Etapas e critérios de passagem
          </h2>
          <p className="text-sm text-[color:var(--muted)]">
            A probabilidade é um pressuposto de referência para o pipeline ponderado, não um dado medido. Ajustar quando houver
            histórico real de conversões.
          </p>
          <Rolavel rotulo="Tabela das etapas">
            <table className={TABELA}>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Etapa
                  </th>
                  <th scope="col" className={TH}>
                    Condição de entrada
                  </th>
                  <th scope="col" className={TH}>
                    Critério de passagem
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Probabilidade
                  </th>
                </tr>
              </thead>
              <tbody>
                {FASES.map((f) => (
                  <tr key={f.chave}>
                    <th scope="row" className={`${TD} font-medium`}>
                      {f.ordem}. {f.texto}
                    </th>
                    <td className={TD}>{f.entrada}</td>
                    <td className={TD}>{f.passagem}</td>
                    <td className={`${TD} text-right tabular-nums`}>{percentagem(PROBABILIDADE[f.chave])}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row" className={`${TD} font-medium`}>
                    Perdida / arquivada
                  </th>
                  <td className={TD}>Sem adequação ou avanço</td>
                  <td className={TD}>Perdida: motivo obrigatório. Arquivada: sem condição (suspensa, fora do pipeline).</td>
                  <td className={`${TD} text-right`}>—</td>
                </tr>
              </tbody>
            </table>
          </Rolavel>
        </section>

        <section aria-labelledby="m-score" className={CAIXA}>
          <h2 id="m-score" className={H2}>
            Motor de qualificação
          </h2>
          <p className="text-sm">Cada critério de 0 a 5; total de 0 a 40.</p>
          <dl className="grid gap-3 sm:grid-cols-2">
            {CRITERIOS.map((c) => (
              <div key={c.chave} className="grid gap-1">
                <dt className="text-sm font-medium">{c.titulo}</dt>
                <dd className="text-sm text-[color:var(--muted)]">{c.pergunta}</dd>
              </div>
            ))}
          </dl>
          <ul className="grid gap-1 text-sm">
            {(['A', 'B', 'incubacao', 'abandonar'] as const).map((p) => (
              <li key={p}>
                <span className="font-medium">{PRIORIDADE[p].texto}</span> — {PRIORIDADE[p].nota}
              </li>
            ))}
          </ul>
          <p className="text-sm text-[color:var(--muted)]">
            O score não substitui julgamento executivo. Obriga a tornar o julgamento explícito e auditável.
          </p>
        </section>

        <section aria-labelledby="m-direitos" className={CAIXA}>
          <h2 id="m-direitos" className={H2}>
            Direitos de decisão
          </h2>
          <Rolavel rotulo="Tabela dos direitos de decisão">
            <table className={TABELA}>
              <thead>
                <tr>
                  {['Decisão', 'Cofounder', 'CEO', 'Técnico', 'Financeiro/Legal'].map((h) => (
                    <th key={h} scope="col" className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DIREITOS.map(([decisao, ...papeis]) => (
                  <tr key={decisao}>
                    <th scope="row" className={`${TD} font-medium`}>
                      {decisao}
                    </th>
                    {papeis.map((p, i) => (
                      <td key={i} className={TD}>
                        {p}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Rolavel>
        </section>

        <section aria-labelledby="m-reunioes" className={CAIXA}>
          <h2 id="m-reunioes" className={H2}>
            Reuniões operacionais
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {REUNIOES.map((r) => (
              <div key={r.titulo} className="grid content-start gap-2">
                <h3 className="text-sm font-semibold">{r.titulo}</h3>
                <Lista itens={r.itens} />
              </div>
            ))}
          </div>
          <p className="text-sm text-[color:var(--muted)]">
            Este espaço só é visível para si. Para o comité, partilhe o Opportunity Memo (vista de impressão na ficha), não a conta.
          </p>
        </section>

        <section aria-labelledby="m-regras" className={CAIXA}>
          <h2 id="m-regras" className={H2}>
            Regras e onde o sistema as aplica
          </h2>
          <Rolavel rotulo="Tabela das regras">
            <table className={TABELA}>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Regra
                  </th>
                  <th scope="col" className={TH}>
                    No Espaço CEnO
                  </th>
                </tr>
              </thead>
              <tbody>
                {REGRAS.map(([regra, onde]) => (
                  <tr key={regra}>
                    <td className={TD}>{regra}</td>
                    <td className={`${TD} text-[color:var(--muted)]`}>{onde}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Rolavel>
        </section>

        <section aria-labelledby="m-nao" className={CAIXA}>
          <h2 id="m-nao" className={H2}>
            O que não fazer
          </h2>
          <ol className="grid list-decimal gap-1 pl-5 text-sm">
            {NAO_FAZER.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="m-plano" className={CAIXA}>
          <h2 id="m-plano" className={H2}>
            Plano de 30 dias
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {PLANO.map((s) => (
              <div key={s.titulo} className="grid content-start gap-2">
                <h3 className="text-sm font-semibold">{s.titulo}</h3>
                <Lista itens={s.itens} />
              </div>
            ))}
          </div>
          <p className="text-sm">
            <span className="font-medium">Critério de validação:</span> 100% das oportunidades activas registadas; pelo menos 90% com
            responsável e próxima acção; todas as prioridades A com Opportunity Memo; o comité decide com os dados existentes.
          </p>
        </section>

        <section aria-labelledby="m-fase2" className={CAIXA}>
          <h2 id="m-fase2" className={H2}>
            Fase 2: Opportunity Intelligence Agent
          </h2>
          <p className="text-sm">
            Ainda não activo. Preparar briefings, resumir actas, comparar com os critérios, identificar documentos em falta e
            produzir a primeira versão do memo — sempre com aprovação humana antes de qualquer comunicação, fontes visíveis e sem
            inventar dados financeiros ou técnicos.
          </p>
        </section>
      </div>
    </>
  );
}
