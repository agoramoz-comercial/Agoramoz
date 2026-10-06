import Link from 'next/link';
import { BotaoEnviar } from '@/components/admin/BotaoEnviar';
import { AdminHeading, DataHora, StateBadge } from '@/components/admin/primitives';
import { inputClass } from '@/components/form/Field';
import {
  avaliarOportunidade,
  desligarStakeholder,
  guardarDocumento,
  guardarMemo,
  guardarOportunidade,
  ligarStakeholder,
  mudarFaseCeno,
  registarCeno,
} from '@/lib/admin/energia-actions';
import { dataCurta, type Documento, type Oportunidade, type Registo, type Stakeholder } from '@/lib/energia/leitura';
import {
  ALERTA,
  alertasDe,
  CRITERIOS,
  DECISOES,
  ESTADOS_DOCUMENTO,
  FASES,
  FONTES,
  formatarValor,
  MEMO,
  ORDEM_QUALIFICADA,
  ordemDe,
  PAPEIS_LIGACAO,
  PASTAS,
  PRIORIDADE,
  SCORE_MINIMO,
  SECTORES,
  TIPOS_STAKEHOLDER,
  textoFase,
  URGENCIAS,
} from '@/lib/energia/modelo';
import { AJUDA, AREA, CAIXA, CamposOportunidade, EnergiaNav, H2, Opcoes, ROTULO } from './partes';

export interface StakeholderLigado {
  readonly stakeholder: Stakeholder;
  readonly papel: string;
}

const TOM_FASE = (fase: string) =>
  fase === 'perdida'
    ? ({ texto: 'Perdida', tom: 'mau' } as const)
    : fase === 'arquivada'
      ? ({ texto: 'Arquivada', tom: 'neutro' } as const)
      : ({ texto: textoFase(fase), tom: (ordemDe(fase) ?? 0) >= 9 ? 'bom' : 'espera' } as const);

const TIPO_REGISTO: Record<Registo['tipo'], string> = {
  nota: 'Nota',
  reuniao: 'Reunião',
  decisao: 'Decisão do comité',
  fase: 'Mudança de etapa',
  documento: 'Sala documental',
};

function valorDe(o: Oportunidade): string {
  if (o.valor_min === null && o.valor_max === null) return 'Sem estimativa';
  if (o.valor_min !== null && o.valor_max !== null && o.valor_min !== o.valor_max)
    return `${formatarValor(o.valor_min, o.moeda)} – ${formatarValor(o.valor_max, o.moeda)}`;
  return formatarValor((o.valor_min ?? o.valor_max)!, o.moeda);
}

export function FichaOportunidade({
  op,
  ligados,
  stakeholders,
  registos,
  documentos,
  agora,
}: {
  op: Oportunidade;
  ligados: readonly StakeholderLigado[];
  stakeholders: readonly Stakeholder[];
  registos: readonly Registo[];
  documentos: readonly Documento[];
  agora: string;
}) {
  const alertas = alertasDe(op, new Date(agora));
  const ordem = ordemDe(op.fase);
  const naoLigados = stakeholders.filter((s) => !ligados.some((l) => l.stakeholder.id === s.id));
  const qualificada = ordem !== null && ordem >= ORDEM_QUALIFICADA;
  const memo = op.memo as Record<string, string | undefined>;

  return (
    <>
      <AdminHeading
        titulo={op.titulo}
        descricao={[op.organizacao, SECTORES[op.sector as keyof typeof SECTORES]].filter(Boolean).join(' · ')}
        accao={
          <Link href="/admin/energia/oportunidades" className="text-sm underline">
            Todas as oportunidades
          </Link>
        }
      />
      <EnergiaNav activo="oportunidades" />

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <StateBadge rotulo={TOM_FASE(op.fase)} />
        {op.prioridade ? <StateBadge rotulo={PRIORIDADE[op.prioridade]} /> : <StateBadge rotulo={{ texto: 'Score por avaliar', tom: 'neutro' }} />}
        {alertas.map((a) => (
          <StateBadge key={a} rotulo={ALERTA[a]} />
        ))}
      </div>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-8">
          {/* ── Resumo ─────────────────────────────────────────────── */}
          <section aria-labelledby="resumo" className={CAIXA}>
            <h2 id="resumo" className={H2}>
              Resumo
            </h2>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[11rem_1fr]">
              <dt className="text-[color:var(--muted)]">Próxima acção</dt>
              <dd>
                {op.proxima_accao ?? '—'}
                {op.proxima_data && <span className="text-[color:var(--muted)]"> · {dataCurta(op.proxima_data)}</span>}
              </dd>
              <dt className="text-[color:var(--muted)]">Responsável</dt>
              <dd>{op.responsavel ?? '—'}</dd>
              <dt className="text-[color:var(--muted)]">Problema económico</dt>
              <dd className="whitespace-pre-line">{op.problema ?? '—'}</dd>
              <dt className="text-[color:var(--muted)]">Valor potencial</dt>
              <dd>
                {valorDe(op)}
                {op.valor_evidencia && <span className="block text-[color:var(--muted)]">Evidência: {op.valor_evidencia}</span>}
              </dd>
              <dt className="text-[color:var(--muted)]">Fonte · urgência</dt>
              <dd>
                {op.fonte ? FONTES[op.fonte as keyof typeof FONTES] : '—'} ·{' '}
                {URGENCIAS[op.urgencia as keyof typeof URGENCIAS]}
              </dd>
              <dt className="text-[color:var(--muted)]">Na etapa desde</dt>
              <dd>
                <DataHora valor={op.fase_desde} />
              </dd>
              {op.motivo_perda && (
                <>
                  <dt className="text-[color:var(--muted)]">Motivo da perda</dt>
                  <dd>{op.motivo_perda}</dd>
                </>
              )}
            </dl>
          </section>

          {/* ── Etapa ──────────────────────────────────────────────── */}
          <form action={mudarFaseCeno} className={CAIXA} id="etapa" aria-labelledby="etapa-titulo">
            <h2 id="etapa-titulo" className={H2}>
              Etapa
            </h2>
            <input type="hidden" name="id" value={op.id} />
            <input type="hidden" name="revisao" value={op.revisao} />
            <input type="hidden" name="score" value={op.score_total ?? ''} />
            <p className="text-sm">
              Agora: <strong>{textoFase(op.fase)}</strong>
              {ordem !== null && FASES[ordem] && (
                <span className="block text-[color:var(--muted)]">Para passar: {FASES[ordem].passagem}.</span>
              )}
            </p>
            <div className="grid gap-2">
              <label htmlFor="fase-destino" className={ROTULO}>
                Mudar para
              </label>
              <select id="fase-destino" name="fase" required defaultValue="" className={inputClass} aria-describedby="fase-ajuda">
                <option value="" disabled>
                  Escolha a etapa
                </option>
                {FASES.map((f) => (
                  <option key={f.chave} value={f.chave} disabled={f.chave === op.fase}>
                    {f.ordem}. {f.texto}
                  </option>
                ))}
                <option value="perdida" disabled={op.fase === 'perdida'}>
                  Perdida (exige motivo)
                </option>
                <option value="arquivada" disabled={op.fase === 'arquivada'}>
                  Arquivada
                </option>
              </select>
              <p id="fase-ajuda" className={AJUDA}>
                Da etapa 4 em diante, o score tem de estar avaliado e ser pelo menos {SCORE_MINIMO}. Ao qualificar,
                abre-se a sala documental.
              </p>
            </div>
            <div className="grid gap-2">
              <label htmlFor="fase-nota" className={ROTULO}>
                Nota da mudança
              </label>
              <textarea id="fase-nota" name="nota" maxLength={4000} className={AREA} />
            </div>
            <div className="grid gap-2">
              <label htmlFor="fase-motivo" className={ROTULO}>
                Motivo (obrigatório se perdida)
              </label>
              <input id="fase-motivo" name="motivo" maxLength={500} className={inputClass} />
            </div>
            <div>
              <BotaoEnviar size="sm" aEnviar="A mudar…">
                Mudar de etapa
              </BotaoEnviar>
            </div>
          </form>

          {/* ── Score ──────────────────────────────────────────────── */}
          <form action={avaliarOportunidade} className={CAIXA} id="score" aria-labelledby="score-titulo">
            <h2 id="score-titulo" className={H2}>
              Score de qualificação
            </h2>
            <input type="hidden" name="id" value={op.id} />
            <input type="hidden" name="revisao" value={op.revisao} />
            <p className="text-sm">
              {op.score_total === null ? (
                'Ainda não avaliado.'
              ) : (
                <>
                  Total: <strong className="tabular-nums">{op.score_total}/40</strong> —{' '}
                  {op.prioridade && PRIORIDADE[op.prioridade].texto}
                  <span className="block text-[color:var(--muted)]">{op.prioridade && PRIORIDADE[op.prioridade].nota}</span>
                </>
              )}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {CRITERIOS.map((c) => (
                <div key={c.chave} className="grid gap-2">
                  <label htmlFor={`c-${c.chave}`} className={ROTULO}>
                    {c.titulo}
                  </label>
                  <select
                    id={`c-${c.chave}`}
                    name={c.chave}
                    required
                    defaultValue={op[c.coluna] ?? ''}
                    aria-describedby={`c-${c.chave}-pergunta`}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      0 a 5
                    </option>
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <p id={`c-${c.chave}-pergunta`} className="text-xs text-[color:var(--muted)]">
                    {c.pergunta}
                  </p>
                </div>
              ))}
            </div>
            <p className={AJUDA}>32–40 prioridade A · 24–31 B · 16–23 incubação · 0–15 abandonar. O score não substitui o julgamento: torna-o explícito.</p>
            <div>
              <BotaoEnviar size="sm" aEnviar="A gravar…">
                Gravar score
              </BotaoEnviar>
            </div>
          </form>

          {/* ── Registo e decisões ─────────────────────────────────── */}
          <section aria-labelledby="registo-titulo" id="registo" className={CAIXA}>
            <h2 id="registo-titulo" className={H2}>
              Registo e decisões
            </h2>
            <form action={registarCeno} className="grid gap-4">
              <input type="hidden" name="id" value={op.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="reg-tipo" className={ROTULO}>
                    Tipo
                  </label>
                  <select id="reg-tipo" name="tipo" defaultValue="nota" className={inputClass}>
                    <option value="nota">Nota</option>
                    <option value="reuniao">Reunião (ata)</option>
                    <option value="decisao">Decisão do comité</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="reg-decisao" className={ROTULO}>
                    Decisão (se do comité)
                  </label>
                  <select id="reg-decisao" name="decisao" defaultValue="" className={inputClass}>
                    <option value="">—</option>
                    <Opcoes valores={DECISOES} />
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <label htmlFor="reg-corpo" className={ROTULO}>
                  Texto
                </label>
                <textarea id="reg-corpo" name="corpo" maxLength={4000} className={AREA} />
              </div>
              <div>
                <BotaoEnviar size="sm" variant="outline" aEnviar="A registar…">
                  Registar
                </BotaoEnviar>
              </div>
            </form>
            {registos.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">Sem registos ainda.</p>
            ) : (
              <ol className="grid gap-4 border-t border-[color:var(--hairline)] pt-4">
                {registos.map((r) => (
                  <li key={r.id} className="grid gap-1 text-sm">
                    <p className="text-xs text-[color:var(--muted)]">
                      <DataHora valor={r.ocorreu_em} /> · {TIPO_REGISTO[r.tipo]}
                      {r.decisao && ` · ${DECISOES[r.decisao as keyof typeof DECISOES] ?? r.decisao}`}
                    </p>
                    {r.tipo === 'fase' && (
                      <p>
                        {textoFase(String(r.metadata.de ?? ''))} → {textoFase(String(r.metadata.para ?? ''))}
                      </p>
                    )}
                    {r.tipo === 'documento' && (
                      <p>
                        Pasta {String(r.metadata.pasta ?? '')} ·{' '}
                        {ESTADOS_DOCUMENTO[String(r.metadata.estado ?? '') as keyof typeof ESTADOS_DOCUMENTO] ?? ''}
                      </p>
                    )}
                    {r.corpo && <p className="whitespace-pre-line">{r.corpo}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="grid content-start gap-8">
          {/* ── Stakeholders ───────────────────────────────────────── */}
          <section aria-labelledby="st-titulo" id="stakeholders" className={CAIXA}>
            <h2 id="st-titulo" className={H2}>
              Stakeholders e decisores
            </h2>
            {ligados.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">
                Nenhum ligado. Sem decisor ou sponsor identificado, a oportunidade não está pronta para qualificar.
              </p>
            ) : (
              <ul className="grid gap-3">
                {ligados.map(({ stakeholder: s, papel }) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <Link href={`/admin/energia/stakeholders/${s.id}`} className="font-medium underline">
                        {s.pessoa ? `${s.pessoa} — ${s.organizacao}` : s.organizacao}
                      </Link>
                      <span className="block text-[color:var(--muted)]">
                        {PAPEIS_LIGACAO[papel as keyof typeof PAPEIS_LIGACAO] ?? papel} ·{' '}
                        {TIPOS_STAKEHOLDER[s.tipo as keyof typeof TIPOS_STAKEHOLDER] ?? s.tipo}
                      </span>
                    </span>
                    <form action={desligarStakeholder}>
                      <input type="hidden" name="id" value={op.id} />
                      <input type="hidden" name="stakeholder" value={s.id} />
                      <BotaoEnviar size="sm" variant="ghost" aEnviar="A retirar…">
                        Retirar
                      </BotaoEnviar>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {naoLigados.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">
                Para ligar alguém, crie primeiro o stakeholder em{' '}
                <Link href="/admin/energia/stakeholders/novo" className="underline">
                  Stakeholders
                </Link>
                .
              </p>
            ) : (
              <form action={ligarStakeholder} className="grid gap-4 border-t border-[color:var(--hairline)] pt-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
                <input type="hidden" name="id" value={op.id} />
                <div className="grid gap-2">
                  <label htmlFor="lig-st" className={ROTULO}>
                    Ligar stakeholder
                  </label>
                  <select id="lig-st" name="stakeholder" required defaultValue="" className={inputClass}>
                    <option value="" disabled>
                      Escolha
                    </option>
                    {naoLigados.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.pessoa ? `${s.pessoa} — ${s.organizacao}` : s.organizacao}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="lig-papel" className={ROTULO}>
                    Papel
                  </label>
                  <select id="lig-papel" name="papel" defaultValue="decisor" className={inputClass}>
                    <Opcoes valores={PAPEIS_LIGACAO} />
                  </select>
                </div>
                <BotaoEnviar size="sm" variant="outline" aEnviar="A ligar…">
                  Ligar
                </BotaoEnviar>
              </form>
            )}
          </section>

          {/* ── Opportunity Memo ───────────────────────────────────── */}
          <form action={guardarMemo} className={CAIXA} id="memo" aria-labelledby="memo-titulo">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="memo-titulo" className={H2}>
                Opportunity Memo
              </h2>
              <Link href={`/admin/energia/oportunidades/${op.id}/memo`} className="text-sm underline">
                Ver para imprimir
              </Link>
            </div>
            <p className={AJUDA}>Uma ou duas páginas. Obrigatório nas prioridades A.</p>
            <input type="hidden" name="id" value={op.id} />
            <input type="hidden" name="revisao" value={op.revisao} />
            {MEMO.map((m, i) => (
              <div key={m.chave} className="grid gap-2">
                <label htmlFor={`memo-${m.chave}`} className={ROTULO}>
                  {i + 1}. {m.titulo}
                </label>
                <textarea id={`memo-${m.chave}`} name={m.chave} maxLength={4000} defaultValue={memo[m.chave] ?? ''} className={AREA} />
              </div>
            ))}
            <div>
              <BotaoEnviar size="sm" aEnviar="A gravar…">
                Gravar memo
              </BotaoEnviar>
            </div>
          </form>

          {/* ── Sala documental ────────────────────────────────────── */}
          <section aria-labelledby="sala-titulo" id="sala" className={CAIXA}>
            <h2 id="sala-titulo" className={H2}>
              Sala de oportunidade
            </h2>
            {!qualificada && documentos.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">
                Abre-se automaticamente quando a oportunidade passar a «qualificada», com as doze pastas.
              </p>
            ) : (
              <ol className="grid gap-4">
                {PASTAS.map((nome, i) => {
                  const d = documentos.find((x) => x.pasta === i + 1);
                  return (
                    <li key={nome} className="grid gap-3 border-b border-[color:var(--hairline)] pb-4 last:border-b-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-medium">
                          {String(i + 1).padStart(2, '0')} · {nome}
                        </span>
                        <StateBadge
                          rotulo={{
                            texto: ESTADOS_DOCUMENTO[d?.estado ?? 'em_falta'],
                            tom: d?.estado === 'pronto' ? 'bom' : d?.estado === 'em_curso' ? 'espera' : 'neutro',
                          }}
                        />
                      </div>
                      {d?.ligacao && (
                        <a href={d.ligacao} target="_blank" rel="noopener noreferrer" className="break-all text-sm underline">
                          {d.ligacao}
                          <span className="sr-only"> (abre noutro separador)</span>
                        </a>
                      )}
                      <form action={guardarDocumento} className="grid gap-3 sm:grid-cols-[9rem_1fr_auto] sm:items-end">
                        <input type="hidden" name="id" value={op.id} />
                        <input type="hidden" name="pasta" value={i + 1} />
                        <input type="hidden" name="nota" value={d?.nota ?? ''} />
                        <div className="grid gap-1">
                          <label htmlFor={`doc-${i + 1}-estado`} className="text-xs text-[color:var(--muted)]">
                            Estado
                          </label>
                          <select id={`doc-${i + 1}-estado`} name="estado" defaultValue={d?.estado ?? 'em_falta'} className={inputClass}>
                            <Opcoes valores={ESTADOS_DOCUMENTO} />
                          </select>
                        </div>
                        <div className="grid gap-1">
                          <label htmlFor={`doc-${i + 1}-ligacao`} className="text-xs text-[color:var(--muted)]">
                            Ligação https (SharePoint, Drive…)
                          </label>
                          <input id={`doc-${i + 1}-ligacao`} name="ligacao" type="url" defaultValue={d?.ligacao ?? ''} className={inputClass} />
                        </div>
                        <BotaoEnviar size="sm" variant="outline" aEnviar="…">
                          Gravar
                        </BotaoEnviar>
                      </form>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* ── Dados ──────────────────────────────────────────────── */}
          <form action={guardarOportunidade} className={CAIXA} id="dados" aria-labelledby="dados-titulo">
            <h2 id="dados-titulo" className={H2}>
              Dados da oportunidade
            </h2>
            <input type="hidden" name="id" value={op.id} />
            <input type="hidden" name="revisao" value={op.revisao} />
            <CamposOportunidade v={op} />
            <div>
              <BotaoEnviar size="sm" aEnviar="A guardar…">
                Guardar dados
              </BotaoEnviar>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
