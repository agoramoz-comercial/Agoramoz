import { CAIXA, H2, Rolavel } from '@/components/admin/espaco/partes';
import { AdminHeading } from '@/components/admin/primitives';
import { CHAPEUS, PRONTIDAO } from '@/lib/gabinete/modelo';
import { GabineteNav } from './partes';

/**
 * O manual do AGORAMOZ Work Operating System v1 — o texto do documento do
 * fundador, ao lado das regras que o gabinete impõe. Estático: muda com a
 * forma de trabalhar, não com os dados.
 */

const TABELA = 'w-full min-w-[44rem] border-collapse text-left text-sm';
const TH = 'border-b border-[color:var(--border)] px-3 py-2 font-medium';
const TD = 'border-b border-[color:var(--border)] px-3 py-2 align-top';
const LISTA = 'grid list-disc gap-1 pl-5 text-sm';
const NOTA = 'text-sm text-[color:var(--muted)]';

const AUTORIDADE = [
  ['Visão e missão', 'Decide', 'Executa', 'Consultado', 'Consultada', 'Informada'],
  ['Segmento prioritário', 'Consultado', 'Decide', 'Consultado', 'Recomenda', 'Consultada'],
  ['Meta financeira', 'Informado', 'Decide', 'Consultado', 'Consultada', 'Consultada'],
  ['Oportunidade energética', 'Informado', 'Aprova', 'Valida tecnologia', 'Lidera', 'Valida capacidade'],
  ['Proposta padrão', 'Informado', 'Aprova', 'Valida esforço', 'Recomenda', 'Valida entrega'],
  ['Arquitectura técnica', 'Informado', 'Informado', 'Decide', 'Consultada', 'Consultada'],
  ['Segurança', 'Informado', 'Assume risco empresarial', 'Decide controlos', 'Informada', 'Executa processos'],
  ['Prioridade de projecto', 'Informado', 'Decide/desempata', 'Recomenda', 'Recomenda', 'Gere portfólio'],
  ['Deploy', 'Informado', 'Informado', 'Autoriza', 'Informada', 'Coordenada'],
  ['Contratação', 'Consultado', 'Decide', 'Recomenda funções técnicas', 'Recomenda sua área', 'Gere processo'],
  ['Compra de software', 'Informado', 'Aprova orçamento', 'Aprova tecnicamente', 'Consultada', 'Regista'],
  ['Incidente crítico', 'Informado', 'Gere impacto empresarial', 'Lidera resposta técnica', 'Informada', 'Coordena comunicação'],
] as const;

const REUNIOES = [
  {
    titulo: 'Conselho de fundadores — mensal, ou quando existir decisão estrutural',
    itens: ['Direcção', 'Participações', 'Capital', 'Novos mercados', 'Parcerias estruturais', 'Nomeação de líderes', 'Riscos existenciais', 'Mudança de modelo de negócio'],
  },
  {
    titulo: 'Reunião executiva semanal — saída: decisão, responsável, prazo, indicador, ponto de revisão',
    itens: ['Caixa e recebimentos', 'Pipeline', 'Oportunidades estratégicas', 'Projectos', 'Capacidade', 'Clientes em risco', 'Incidentes', 'Prioridade trimestral', 'Decisões'],
  },
  {
    titulo: 'Reunião de tecnologia',
    itens: ['Entregas', 'Bloqueios', 'Incidentes', 'Segurança', 'Dívida técnica', 'Arquitectura', 'Capacidade', 'Releases'],
  },
  {
    titulo: 'Reunião de projecto — apenas para',
    itens: ['Progresso contra marcos', 'Decisões', 'Dependências', 'Riscos', 'Alterações de escopo', 'Critérios de aceitação'],
  },
] as const;

const FONTES = [
  ['Lead e oportunidade', 'CRM (/admin/oportunidades)'],
  ['Contacto estratégico', 'CRM de stakeholders'],
  ['Contrato assinado', 'SharePoint'],
  ['Decisão executiva', 'Registo de decisões (este gabinete)'],
  ['Tarefa operacional', 'Planner'],
  ['Tarefa técnica', 'Azure DevOps ou GitHub'],
  ['Código', 'Repositório Git'],
  ['Documento técnico', 'Base de conhecimento'],
  ['Incidente', 'Sistema de incidentes'],
  ['Receita e despesa', 'Sistema financeiro'],
  ['Indicadores', 'Power BI'],
  ['Comunicação formal externa', 'Email'],
  ['Conversa rápida', 'Teams'],
  ['Credenciais', 'Cofre de segredos'],
] as const;

const METRICAS = [
  ['Caixa', 'Cobertura de custos', 'Investir, reduzir ou cobrar'],
  ['Recebimentos', 'Valor vencido', 'Escalar cobrança ou suspender trabalho'],
  ['Pipeline', 'Valor qualificado', 'Aumentar aquisição ou proteger capacidade'],
  ['Vendas', 'Conversão diagnóstico → contrato', 'Corrigir oferta ou venda'],
  ['Entrega', 'Marcos dentro do prazo', 'Repriorizar recursos'],
  ['Margem', 'Margem bruta por projecto', 'Corrigir preço, escopo ou execução'],
  ['Capacidade', 'Comprometida versus disponível', 'Vender, contratar ou adiar'],
  ['Qualidade', 'Defeitos e retrabalho', 'Corrigir processo técnico'],
  ['Tecnologia', 'Incidentes críticos', 'Corrigir arquitectura ou controlos'],
  ['Cliente', 'Activação e utilização', 'Melhorar onboarding'],
  ['Pessoas', 'Resultados por função', 'Orientar, delegar ou redesenhar'],
  ['Fundador', 'Decisões dependentes de si', 'Documentar e delegar'],
] as const;

const PASSAGEM = [
  '100 % das oportunidades activas registadas;',
  '100 % dos projectos com responsável, escopo, estado e próxima acção;',
  '100 % das decisões executivas relevantes com responsável e data;',
  'receita faturada separada de receita recebida;',
  'margem estimável por projecto;',
  'permissões atribuídas por função;',
  'a reunião executiva acontece sem recolher informação manualmente em vários canais;',
  'pelo menos três decisões recorrentes deixam de depender do fundador.',
] as const;

const PLANO = [
  {
    semana: 'Semana 1 — medição',
    itens: ['Inventariar ferramentas actuais', 'Listar oportunidades', 'Listar projectos', 'Inventariar documentos', 'Mapear canais de comunicação', 'Identificar acessos e credenciais', 'Listar decisões dependentes de si', 'Identificar a principal restrição'],
    saida: 'Mapa do ambiente actual e lista de informação dispersa.',
  },
  {
    semana: 'Semana 2 — construção',
    itens: ['Definir fontes oficiais', 'Configurar CRM inicial', 'Criar portfólio de projectos', 'Criar registo de decisões', 'Criar matriz de autoridade', 'Definir convenção de nomes', 'Organizar permissões'],
    saida: 'Ambiente mínimo funcional.',
  },
  {
    semana: 'Semana 3 — teste',
    itens: ['Migrar oportunidades activas', 'Migrar projectos activos', 'Executar uma reunião executiva', 'Testar um onboarding de cliente', 'Testar uma aprovação', 'Delegar três decisões recorrentes', 'Registar problemas do sistema'],
    saida: 'Primeiro ciclo operacional completo.',
  },
  {
    semana: 'Semana 4 — avaliação',
    itens: ['Medir adesão', 'Identificar dados em falta', 'Remover estruturas não utilizadas', 'Corrigir permissões', 'Rever indicadores', 'Documentar processos críticos', 'Escolher a restrição seguinte'],
    saida: 'Decisão: continuar, corrigir ou abandonar componentes que não mudam decisões.',
  },
] as const;

const NAO_FAZER = [
  'Não construir uma plataforma personalizada agora — este gabinete é deliberadamente pequeno: registos dentro do admin que já existe, sem integrações nem automações.',
  'Não automatizar processos que ainda mudam todas as semanas.',
  'Não criar canais, listas e dashboards sem proprietário.',
  'Não permitir que todos tenham acesso administrativo.',
  'Não acumular CEO, CTO, gestor de projecto e programador principal em todos os projectos.',
] as const;

const RISCOS = [
  ['Sistema excessivamente complexo', 'Equipa volta ao WhatsApp', 'Começar com seis componentes', 'CEO'],
  ['Falta de actualização', 'Dados divergentes', 'Proprietário por fonte', 'Operações'],
  ['Centralização no fundador', 'Tudo aguarda aprovação', 'Matriz de autoridade', 'CEO'],
  ['Permissões inadequadas', 'Documentos expostos', 'Acesso por função', 'CTO'],
  ['Automação prematura', 'Fluxos quebram frequentemente', 'Validar manualmente primeiro', 'CTO'],
  ['Proliferação de ferramentas', 'Mesma informação em vários locais', 'Fonte oficial definida', 'Operações'],
  ['Perda de margem nos projectos', 'Entrega cresce sem caixa', 'Margem por projecto', 'CEO'],
  ['Dependência técnica', 'Só o CTO consegue operar', 'Documentação e Tech Lead', 'CTO'],
  ['Dados de clientes misturados', 'Acesso cruzado', 'Espaços e permissões separados', 'CTO'],
] as const;

function Seccao({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className={CAIXA}>
      <h2 id={id} className={H2}>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export function ManualGabinete() {
  return (
    <>
      <AdminHeading
        titulo="Manual do gabinete"
        descricao="AGORAMOZ Work Operating System v1: separar os três chapéus, registar o que precisa de estar certo todas as semanas e medir quantas decisões já não dependem do fundador."
      />
      <GabineteNav activo="manual" />
      <div className="grid gap-6">
        <Seccao id="chapeus" titulo="Os três chapéus">
          <div className="grid gap-6 lg:grid-cols-3">
            {Object.entries(CHAPEUS).map(([k, c]) => (
              <div key={k} className="grid content-start gap-2">
                <h3 className="text-base font-semibold">{c.texto}</h3>
                <p className="text-sm">{c.pergunta}</p>
                <p className={NOTA}>
                  Horizonte: {c.horizonte}. Resultado: {c.resultado}.
                </p>
                <ul className={LISTA}>
                  {c.decide.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-sm">
            <strong>Regra crítica.</strong> Uma decisão não pode ser simultaneamente estratégica, comercial e técnica sem
            indicar que papel é responsável, quem é consultado, que indicador é afectado e qual é a data de revisão — os
            campos de cada decisão neste gabinete.
          </p>
          <p className={NOTA}>
            Não alternar entre CEO e CTO no mesmo bloco de trabalho: a mudança de contexto destrói capacidade de análise
            e aumenta decisões reactivas.
          </p>
        </Seccao>

        <Seccao id="autoridade" titulo="Matriz de autoridade">
          <Rolavel rotulo="Tabela da matriz de autoridade">
            <table className={TABELA}>
              <caption className="sr-only">Quem decide, aprova, recomenda e é consultado</caption>
              <thead>
                <tr>
                  {['Decisão', 'Founder', 'CEO', 'CTO', 'Cofounder Energia', 'Operações'].map((h) => (
                    <th key={h} scope="col" className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AUTORIDADE.map(([d, ...resto]) => (
                  <tr key={d}>
                    <th scope="row" className={`${TD} font-medium`}>
                      {d}
                    </th>
                    {resto.map((r, i) => (
                      <td key={i} className={TD}>
                        {r}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Rolavel>
          <div className="grid gap-2">
            <h3 className="text-base font-semibold">Regra de delegação</h3>
            <p className="text-sm">Uma decisão pode ser delegada quando:</p>
            <ul className={LISTA}>
              <li>é repetitiva;</li>
              <li>tem limites definidos;</li>
              <li>tem informação disponível;</li>
              <li>o impacto negativo máximo é aceitável;</li>
              <li>existe mecanismo de revisão.</li>
            </ul>
            <p className={NOTA}>
              Ao fechar uma decisão recorrente, marque «Delegada» quando foi resolvida sem si: é o que mede a métrica
              crítica do Painel CEO.
            </p>
          </div>
        </Seccao>

        <Seccao id="reunioes" titulo="Reuniões">
          <div className="grid gap-6 md:grid-cols-2">
            {REUNIOES.map((r) => (
              <div key={r.titulo} className="grid content-start gap-2">
                <h3 className="text-base font-semibold">{r.titulo}</h3>
                <ul className={LISTA}>
                  {r.itens.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className={NOTA}>
            A reunião executiva semanal segue o Painel CEO pela mesma ordem: caixa, pipeline, projectos, capacidade,
            prioridades, decisões.
          </p>
        </Seccao>

        <Seccao id="fontes" titulo="Fonte oficial por tipo de informação">
          <Rolavel rotulo="Tabela das fontes oficiais">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <caption className="sr-only">Onde vive cada tipo de informação</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>Informação</th>
                  <th scope="col" className={TH}>Fonte oficial</th>
                </tr>
              </thead>
              <tbody>
                {FONTES.map(([i, f]) => (
                  <tr key={i}>
                    <th scope="row" className={`${TD} font-medium`}>
                      {i}
                    </th>
                    <td className={TD}>{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Rolavel>
          <p className={NOTA}>
            O WhatsApp pode ser canal de contacto, mas qualquer compromisso, pedido relevante ou decisão passa para a
            fonte oficial.
          </p>
        </Seccao>

        <Seccao id="metricas" titulo="Painel de métricas — só as que mudam decisões">
          <Rolavel rotulo="Tabela de métricas e decisões">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <caption className="sr-only">Métrica por área e a decisão que ela muda</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>Área</th>
                  <th scope="col" className={TH}>Métrica</th>
                  <th scope="col" className={TH}>Decisão</th>
                </tr>
              </thead>
              <tbody>
                {METRICAS.map(([a, m, d]) => (
                  <tr key={a}>
                    <th scope="row" className={`${TD} font-medium`}>
                      {a}
                    </th>
                    <td className={TD}>{m}</td>
                    <td className={TD}>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Rolavel>
          <p className="text-sm">
            <strong>Métrica crítica:</strong> percentagem de decisões operacionais recorrentes resolvidas sem
            intervenção do fundador.
          </p>
        </Seccao>

        <Seccao id="prontidao" titulo="Antes de implementar">
          <p className="text-sm">Nenhum projecto entra em implementação sem os sete critérios — a base recusa-o:</p>
          <ul className={LISTA}>
            {PRONTIDAO.map((c) => (
              <li key={c.chave}>{c.texto}</li>
            ))}
          </ul>
        </Seccao>

        <Seccao id="passagem" titulo="Critério de passagem da v1">
          <ul className={LISTA}>
            {PASSAGEM.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Seccao>

        <Seccao id="plano" titulo="Plano de 30 dias">
          <div className="grid gap-6 md:grid-cols-2">
            {PLANO.map((s) => (
              <div key={s.semana} className="grid content-start gap-2">
                <h3 className="text-base font-semibold">{s.semana}</h3>
                <ul className={LISTA}>
                  {s.itens.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
                <p className={NOTA}>{s.saida}</p>
              </div>
            ))}
          </div>
        </Seccao>

        <Seccao id="nao-fazer" titulo="O que não fazer">
          <ol className="grid list-decimal gap-1 pl-5 text-sm">
            {NAO_FAZER.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ol>
        </Seccao>

        <Seccao id="riscos" titulo="Riscos">
          <Rolavel rotulo="Tabela de riscos">
            <table className={TABELA}>
              <caption className="sr-only">Riscos, sinal precoce, mitigação e responsável</caption>
              <thead>
                <tr>
                  {['Risco', 'Sinal precoce', 'Mitigação', 'Responsável'].map((h) => (
                    <th key={h} scope="col" className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RISCOS.map(([r, s, m, q]) => (
                  <tr key={r}>
                    <th scope="row" className={`${TD} font-medium`}>
                      {r}
                    </th>
                    <td className={TD}>{s}</td>
                    <td className={TD}>{m}</td>
                    <td className={TD}>{q}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Rolavel>
        </Seccao>
      </div>
    </>
  );
}
