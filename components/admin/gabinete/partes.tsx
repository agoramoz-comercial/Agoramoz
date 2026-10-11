import { BotaoEnviar } from '@/components/admin/BotaoEnviar';
import { GuardaRascunho } from '@/components/admin/espaco/GuardaRascunho';
import { AJUDA, AREA, CAIXA, Campo, H2, NavEspaco, Opcoes, ROTULO } from '@/components/admin/espaco/partes';
import { inputClass } from '@/components/form/Field';
import {
  guardarAlocacao,
  guardarMovimento,
  guardarPessoa,
  guardarPrioridade,
} from '@/lib/admin/gabinete-actions';
import {
  AREAS,
  CHAPEUS,
  ESTADOS_DECISAO,
  ESTADOS_PRIORIDADE,
  FASES_PROJETO,
  MOEDAS,
  PRONTIDAO,
  projetoActivo,
  QUEM_DECIDIU,
  TIPOS_MOVIMENTO,
  TIPOS_PRIORIDADE,
  type Decisao,
  type Pessoa,
  type Prioridade,
  type Projeto,
  type TipoPrioridade,
} from '@/lib/gabinete/modelo';

/**
 * Peças do Gabinete do Fundador. Componentes de servidor: o gabinete funciona
 * sem JavaScript (o guarda-rascunho é o único cliente), e os formulários são
 * formulários — POST para as Server Actions de `gabinete-actions`.
 */

const SECCOES = [
  { href: '/admin/gabinete', texto: 'Painel CEO', chave: 'ceo' },
  { href: '/admin/gabinete/cto', texto: 'Painel CTO', chave: 'cto' },
  { href: '/admin/gabinete/prioridades', texto: 'Prioridades', chave: 'prioridades' },
  { href: '/admin/gabinete/decisoes', texto: 'Decisões', chave: 'decisoes' },
  { href: '/admin/gabinete/projetos', texto: 'Projectos', chave: 'projetos' },
  { href: '/admin/gabinete/tesouraria', texto: 'Tesouraria', chave: 'tesouraria' },
  { href: '/admin/gabinete/capacidade', texto: 'Capacidade', chave: 'capacidade' },
  { href: '/admin/gabinete/manual', texto: 'Manual', chave: 'manual' },
] as const;

export type SeccaoGabinete = (typeof SECCOES)[number]['chave'];

export function GabineteNav({ activo }: { activo: SeccaoGabinete }) {
  return <NavEspaco seccoes={SECCOES} activo={activo} rotulo="Secções do Gabinete" />;
}

/** As mensagens de sucesso de todas as acções do gabinete. */
export const OK = {
  criada: 'Registada.',
  guardada: 'Guardada.',
  criado: 'Projecto registado.',
  guardado: 'Guardado.',
  registado: 'Movimento registado.',
  'pessoa-criada': 'Pessoa registada.',
  'pessoa-guardada': 'Pessoa guardada.',
  alocacao: 'Alocação guardada.',
  'alocacao-removida': 'Alocação removida.',
} as const;

/** Data `AAAA-MM-DD` → «6 out. 2026», sem depender do fuso do servidor. */
export function dataCurta(dia: string | null): string {
  if (!dia) return '—';
  const [a, m, d] = dia.slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return '—';
  return new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(a, m - 1, d)),
  );
}

const CAIXA_MARCAR = 'flex min-h-11 items-center gap-3 text-sm';

// ── Decisão ───────────────────────────────────────────────────────────────────

/** Os campos de uma decisão (criar e editar usam os mesmos). */
export function CamposDecisao({ v }: { v?: Decisao }) {
  return (
    <>
      <Campo id="de-titulo" rotulo="Decisão a tomar">
        <input id="de-titulo" name="titulo" required minLength={3} maxLength={200} defaultValue={v?.titulo} className={inputClass} />
      </Campo>
      <Campo id="de-contexto" rotulo="Contexto" ajuda="O que está em jogo, opções, prazo.">
        <textarea id="de-contexto" name="contexto" maxLength={2000} defaultValue={v?.contexto ?? ''} aria-describedby="de-contexto-ajuda" className={AREA} />
      </Campo>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="de-chapeu" rotulo="Chapéu" ajuda="Que papel é responsável por esta decisão.">
          <select id="de-chapeu" name="chapeu" required defaultValue={v?.chapeu ?? 'ceo'} aria-describedby="de-chapeu-ajuda" className={inputClass}>
            {Object.entries(CHAPEUS).map(([k, c]) => (
              <option key={k} value={k}>
                {c.texto} — {c.pergunta}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="de-estado" rotulo="Estado">
          <select id="de-estado" name="estado" required defaultValue={v?.estado ?? 'exige_minha'} className={inputClass}>
            <Opcoes valores={ESTADOS_DECISAO} />
          </select>
        </Campo>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="de-responsavel" rotulo="Responsável" ajuda="Obrigatório enquanto estiver em aberto.">
          <input id="de-responsavel" name="responsavel" maxLength={120} defaultValue={v?.responsavel ?? ''} aria-describedby="de-responsavel-ajuda" className={inputClass} />
        </Campo>
        <Campo id="de-revisao" rotulo="Data de revisão" ajuda="Obrigatória enquanto estiver em aberto.">
          <input id="de-revisao" name="dataRevisao" type="date" defaultValue={v?.data_revisao ?? ''} aria-describedby="de-revisao-ajuda" className={inputClass} />
        </Campo>
        <Campo id="de-consultados" rotulo="Quem é consultado">
          <input id="de-consultados" name="consultados" maxLength={300} defaultValue={v?.consultados ?? ''} className={inputClass} />
        </Campo>
        <Campo id="de-indicador" rotulo="Indicador afectado">
          <input id="de-indicador" name="indicador" maxLength={200} defaultValue={v?.indicador ?? ''} className={inputClass} />
        </Campo>
      </div>
      <label className={CAIXA_MARCAR}>
        <input type="checkbox" name="recorrente" defaultChecked={v?.recorrente ?? false} className="size-5" />
        Decisão recorrente (conta para a métrica de delegação)
      </label>
      <fieldset className="grid gap-4 border-t border-[color:var(--border)] pt-5">
        <legend className={ROTULO}>Fecho</legend>
        <p className={AJUDA}>Para marcar «Decidida», escreva o que se decidiu e quem decidiu.</p>
        <Campo id="de-decisao" rotulo="O que se decidiu">
          <textarea id="de-decisao" name="decisao" maxLength={2000} defaultValue={v?.decisao ?? ''} className={AREA} />
        </Campo>
        <Campo id="de-quem" rotulo="Quem decidiu">
          <select id="de-quem" name="quemDecidiu" defaultValue={v?.quem_decidiu ?? ''} className={inputClass}>
            <option value="">— ainda por decidir —</option>
            <Opcoes valores={QUEM_DECIDIU} />
          </select>
        </Campo>
      </fieldset>
    </>
  );
}

// ── Projecto ──────────────────────────────────────────────────────────────────

/** Os campos de um projecto (criar e editar usam os mesmos). */
export function CamposProjeto({ v }: { v?: Projeto }) {
  const activo = !v || projetoActivo(v.fase);
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="pr-nome" rotulo="Projecto">
          <input id="pr-nome" name="nome" required minLength={3} maxLength={160} defaultValue={v?.nome} className={inputClass} />
        </Campo>
        <Campo id="pr-cliente" rotulo="Cliente">
          <input id="pr-cliente" name="cliente" maxLength={160} defaultValue={v?.cliente ?? ''} className={inputClass} />
        </Campo>
        <Campo id="pr-fase" rotulo="Fase" ajuda="Implementação, activação e evolução exigem os sete critérios.">
          <select id="pr-fase" name="fase" required defaultValue={v?.fase ?? 'diagnostico'} aria-describedby="pr-fase-ajuda" className={inputClass}>
            <Opcoes valores={FASES_PROJETO} />
          </select>
        </Campo>
        <Campo id="pr-risco" rotulo="Risco">
          <select id="pr-risco" name="risco" required defaultValue={v?.risco ?? 'baixo'} className={inputClass}>
            <option value="baixo">Baixo</option>
            <option value="medio">Médio</option>
            <option value="alto">Alto</option>
          </select>
        </Campo>
        <Campo id="pr-responsavel" rotulo="Responsável de entrega">
          <input id="pr-responsavel" name="responsavel" maxLength={120} defaultValue={v?.responsavel ?? ''} className={inputClass} />
        </Campo>
        <Campo id="pr-sponsor" rotulo="Sponsor do cliente">
          <input id="pr-sponsor" name="sponsor" maxLength={120} defaultValue={v?.sponsor ?? ''} className={inputClass} />
        </Campo>
      </div>
      <Campo id="pr-resultado" rotulo="Resultado contratado">
        <textarea id="pr-resultado" name="resultado" maxLength={1000} defaultValue={v?.resultado ?? ''} className={AREA} />
      </Campo>
      <Campo id="pr-escopo" rotulo="Escopo">
        <textarea id="pr-escopo" name="escopo" maxLength={2000} defaultValue={v?.escopo ?? ''} className={AREA} />
      </Campo>
      <fieldset className="grid gap-4">
        <legend className={ROTULO}>Economia do projecto</legend>
        <p className={AJUDA}>Faturada separada de recebida. Margem bruta = contratada − custos variáveis (calculada pela base).</p>
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr_1fr]">
          <Campo id="pr-moeda" rotulo="Moeda">
            <select id="pr-moeda" name="moeda" defaultValue={v?.moeda ?? 'MZN'} className={inputClass}>
              {MOEDAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="pr-contratada" rotulo="Receita contratada">
            <input id="pr-contratada" name="receitaContratada" inputMode="decimal" defaultValue={v?.receita_contratada ?? ''} className={inputClass} />
          </Campo>
          <Campo id="pr-custos" rotulo="Custos variáveis">
            <input id="pr-custos" name="custosVariaveis" inputMode="decimal" defaultValue={v?.custos_variaveis ?? ''} className={inputClass} />
          </Campo>
          <span aria-hidden className="hidden sm:block" />
          <Campo id="pr-faturada" rotulo="Receita faturada">
            <input id="pr-faturada" name="receitaFaturada" inputMode="decimal" defaultValue={v?.receita_faturada ?? ''} className={inputClass} />
          </Campo>
          <Campo id="pr-recebida" rotulo="Receita recebida">
            <input id="pr-recebida" name="receitaRecebida" inputMode="decimal" defaultValue={v?.receita_recebida ?? ''} className={inputClass} />
          </Campo>
        </div>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className={ROTULO}>Prontidão para implementar</legend>
        <p className={AJUDA}>Nenhum projecto entra em implementação sem os sete.</p>
        <div className="grid gap-x-6 sm:grid-cols-2">
          {PRONTIDAO.map((c) => (
            <label key={c.chave} className={CAIXA_MARCAR}>
              <input type="checkbox" name={`pronto_${c.chave}`} defaultChecked={v?.prontidao[c.coluna] ?? false} className="size-5" />
              {c.texto}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <Campo id="pr-accao" rotulo="Próxima acção" ajuda="Obrigatória enquanto o projecto estiver activo.">
          <input id="pr-accao" name="proximaAccao" required={activo} maxLength={300} defaultValue={v?.proxima_accao ?? ''} aria-describedby="pr-accao-ajuda" className={inputClass} />
        </Campo>
        <Campo id="pr-data" rotulo="Data">
          <input id="pr-data" name="proximaData" type="date" required={activo} defaultValue={v?.proxima_data ?? ''} className={inputClass} />
        </Campo>
      </div>
      <Campo id="pr-ligacao" rotulo="Pasta do projecto" ajuda="Ligação https para o SharePoint ou o Drive. Os ficheiros não vivem aqui.">
        <input id="pr-ligacao" name="ligacao" type="url" maxLength={2048} placeholder="https://" defaultValue={v?.ligacao ?? ''} aria-describedby="pr-ligacao-ajuda" className={inputClass} />
      </Campo>
    </>
  );
}

// ── Prioridade (em linha) ─────────────────────────────────────────────────────

/** Uma prioridade do trimestre: criar (sem `v`) ou editar. Uma por tipo. */
export function FormPrioridade({ trimestre, tipo, v }: { trimestre: string; tipo: TipoPrioridade; v?: Prioridade }) {
  const id = `pri-${tipo}`;
  return (
    <form action={guardarPrioridade} className={CAIXA} aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className={H2}>
        {TIPOS_PRIORIDADE[tipo]}
      </h2>
      <GuardaRascunho espaco="gabinete" chave={`prioridade-${trimestre}-${tipo}`} />
      <input type="hidden" name="trimestre" value={trimestre} />
      <input type="hidden" name="tipo" value={tipo} />
      {v && <input type="hidden" name="id" value={v.id} />}
      {v && <input type="hidden" name="revisao" value={v.revisao} />}
      <Campo id={`${id}-resultado`} rotulo="Resultado esperado" ajuda="Um resultado que organiza as tarefas — não uma tarefa.">
        <input id={`${id}-resultado`} name="resultado" required minLength={3} maxLength={300} defaultValue={v?.resultado ?? ''} aria-describedby={`${id}-resultado-ajuda`} className={inputClass} />
      </Campo>
      <div className="grid gap-5 sm:grid-cols-3">
        <Campo id={`${id}-indicador`} rotulo="Indicador">
          <input id={`${id}-indicador`} name="indicador" maxLength={200} defaultValue={v?.indicador ?? ''} className={inputClass} />
        </Campo>
        <Campo id={`${id}-meta`} rotulo="Meta">
          <input id={`${id}-meta`} name="meta" maxLength={200} defaultValue={v?.meta ?? ''} className={inputClass} />
        </Campo>
        <Campo id={`${id}-estado`} rotulo="Estado">
          <select id={`${id}-estado`} name="estado" defaultValue={v?.estado ?? 'em_curso'} className={inputClass}>
            <Opcoes valores={ESTADOS_PRIORIDADE} />
          </select>
        </Campo>
      </div>
      <Campo id={`${id}-nota`} rotulo="Nota">
        <textarea id={`${id}-nota`} name="nota" maxLength={1000} defaultValue={v?.nota ?? ''} className={AREA} />
      </Campo>
      <div>
        <BotaoEnviar size="sm" aEnviar="A guardar…">
          {v ? 'Guardar prioridade' : 'Definir prioridade'}
        </BotaoEnviar>
      </div>
    </form>
  );
}

// ── Movimento de tesouraria ───────────────────────────────────────────────────

export function FormMovimento({ projetos, hoje }: { projetos: readonly Pick<Projeto, 'id' | 'nome'>[]; hoje: string }) {
  return (
    <form action={guardarMovimento} className={CAIXA} aria-labelledby="mov-titulo">
      <h2 id="mov-titulo" className={H2}>
        Registar movimento
      </h2>
      <GuardaRascunho espaco="gabinete" chave="movimento" />
      <p className={AJUDA}>
        Saldo: o valor em caixa numa data (a fotografia de partida). Recebimento e pagamento: previstos até terem data
        efectiva. Sem conversão entre moedas.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="mov-tipo" rotulo="Tipo">
          <select id="mov-tipo" name="tipo" required defaultValue="recebimento" className={inputClass}>
            <Opcoes valores={TIPOS_MOVIMENTO} />
          </select>
        </Campo>
        <Campo id="mov-descricao" rotulo="Descrição">
          <input id="mov-descricao" name="descricao" required maxLength={200} className={inputClass} />
        </Campo>
        <Campo id="mov-valor" rotulo="Valor">
          <input id="mov-valor" name="valor" required inputMode="decimal" className={inputClass} />
        </Campo>
        <Campo id="mov-moeda" rotulo="Moeda">
          <select id="mov-moeda" name="moeda" defaultValue="MZN" className={inputClass}>
            {MOEDAS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="mov-prevista" rotulo="Data (prevista, ou do saldo)">
          <input id="mov-prevista" name="dataPrevista" type="date" required defaultValue={hoje} className={inputClass} />
        </Campo>
        <Campo id="mov-efectiva" rotulo="Data efectiva" ajuda="Em branco enquanto não aconteceu.">
          <input id="mov-efectiva" name="dataEfectiva" type="date" aria-describedby="mov-efectiva-ajuda" className={inputClass} />
        </Campo>
      </div>
      <Campo id="mov-projeto" rotulo="Projecto (opcional)">
        <select id="mov-projeto" name="projeto" defaultValue="" className={inputClass}>
          <option value="">— nenhum —</option>
          {projetos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </Campo>
      <div>
        <BotaoEnviar size="sm" aEnviar="A registar…">
          Registar movimento
        </BotaoEnviar>
      </div>
    </form>
  );
}

// ── Pessoa e alocação ─────────────────────────────────────────────────────────

export function FormPessoa({ v }: { v?: Pessoa }) {
  const id = v ? `pe-${v.id.slice(0, 8)}` : 'pe-nova';
  return (
    <form action={guardarPessoa} className={CAIXA} aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className={H2}>
        {v ? `Editar ${v.nome}` : 'Acrescentar pessoa'}
      </h2>
      <GuardaRascunho espaco="gabinete" chave={v ? `pessoa-${v.id}` : 'pessoa-nova'} />
      {v && <input type="hidden" name="id" value={v.id} />}
      {v && <input type="hidden" name="revisao" value={v.revisao} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id={`${id}-nome`} rotulo="Nome curto" ajuda="Só o necessário para planear — sem dados pessoais.">
          <input id={`${id}-nome`} name="nome" required maxLength={80} defaultValue={v?.nome ?? ''} aria-describedby={`${id}-nome-ajuda`} className={inputClass} />
        </Campo>
        <Campo id={`${id}-funcao`} rotulo="Função">
          <input id={`${id}-funcao`} name="funcao" maxLength={80} defaultValue={v?.funcao ?? ''} className={inputClass} />
        </Campo>
        <Campo id={`${id}-area`} rotulo="Área">
          <select id={`${id}-area`} name="area" defaultValue={v?.area ?? 'tecnologia'} className={inputClass}>
            <Opcoes valores={AREAS} />
          </select>
        </Campo>
        <Campo id={`${id}-horas`} rotulo="Horas por semana disponíveis">
          <input id={`${id}-horas`} name="horasSemana" required inputMode="decimal" defaultValue={v?.horas_semana ?? ''} className={inputClass} />
        </Campo>
      </div>
      <label className={CAIXA_MARCAR}>
        <input type="checkbox" name="activa" defaultChecked={v?.activa ?? true} className="size-5" />
        Activa (conta para a capacidade)
      </label>
      <div>
        <BotaoEnviar size="sm" aEnviar="A guardar…">
          {v ? 'Guardar pessoa' : 'Acrescentar pessoa'}
        </BotaoEnviar>
      </div>
    </form>
  );
}

/** Alocar horas de uma pessoa a um projecto (o par repetido actualiza). */
export function FormAlocacao({
  pessoas,
  projetos,
  voltar,
  projetoFixo,
}: {
  pessoas: readonly Pick<Pessoa, 'id' | 'nome'>[];
  projetos: readonly Pick<Projeto, 'id' | 'nome'>[];
  voltar: string;
  projetoFixo?: string;
}) {
  return (
    <form action={guardarAlocacao} className={CAIXA} aria-labelledby="al-titulo">
      <h2 id="al-titulo" className={H2}>
        Alocar capacidade
      </h2>
      <GuardaRascunho espaco="gabinete" chave={`alocacao-${projetoFixo ?? 'geral'}`} />
      <input type="hidden" name="voltar" value={voltar} />
      {projetoFixo && <input type="hidden" name="projeto" value={projetoFixo} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="al-pessoa" rotulo="Pessoa">
          <select id="al-pessoa" name="pessoa" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              — escolher —
            </option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </Campo>
        {!projetoFixo && (
          <Campo id="al-projeto" rotulo="Projecto">
            <select id="al-projeto" name="projeto" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                — escolher —
              </option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Campo>
        )}
        <Campo id="al-horas" rotulo="Horas por semana">
          <input id="al-horas" name="horasSemana" required inputMode="decimal" className={inputClass} />
        </Campo>
        <Campo id="al-ate" rotulo="Até (opcional)">
          <input id="al-ate" name="ate" type="date" className={inputClass} />
        </Campo>
      </div>
      <div>
        <BotaoEnviar size="sm" aEnviar="A alocar…">
          Alocar
        </BotaoEnviar>
      </div>
    </form>
  );
}
