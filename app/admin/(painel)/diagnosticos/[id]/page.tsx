import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AdminHeading,
  DataHora,
  DefinitionList,
  EmptyState,
  StateBadge,
} from '@/components/admin/primitives';
import { BotaoEnviar } from '@/components/admin/BotaoEnviar';
import { ConfirmarEnvio } from '@/components/admin/ConfirmarEnvio';
import { Feedback } from '@/components/admin/Feedback';
import { VoltarLista } from '@/components/admin/MemoriaLista';
import { Trilho } from '@/components/admin/Trilho';
import {
  ACHADO,
  CLASSIFICACAO,
  ESTADO_DIAGNOSTICO,
  FASE_OPORTUNIDADE,
  ORIGEM_EVIDENCIA,
  SEVERIDADE,
} from '@/lib/admin/labels';
import { nomeDoMercado, rotuloDoSetor } from '@/lib/diagnostic/mercado';
import { CONSEQUENCIAS } from '@/content/i18n/formulario';
import { aprovarDiagnostico, enviarParaRevisao, rejeitarDiagnostico } from '@/lib/admin/actions';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { crmOperacional } from '@/lib/crm/activacao';

export const metadata = { title: 'Rever diagnóstico' };

/**
 * O ecrã de revisão. É aqui que o portão de aprovação humana existe de facto.
 *
 * Três regras que a apresentação tem de respeitar, e que não são estéticas:
 *
 * 1. **O texto livre do cliente é citação, nunca instrução.** `problemImpact`
 *    é o único campo onde ele escreve o que quer, e por isso é o vetor natural
 *    de injeção. Aparece marcado como palavras dele, dentro de `<blockquote>`,
 *    e o motor nunca o leu como comando — só o comprimento entrou nas regras.
 *
 * 2. **Cada facto mostra a origem.** «Respondido pelo cliente», «calculado» ou
 *    «conteúdo da AGORAMOZ». Não há uma quarta origem, e em particular não há
 *    «referência de mercado»: a AGORAMOZ não tem hoje nenhuma fonte dessas
 *    verificada, e um ecrã que a sugerisse convidava a inventá-la.
 *
 * 3. **A revisão viaja com a decisão.** O campo oculto `revision` é comparado
 *    na base: aprovar um conteúdo que mudou entretanto é recusado em vez de
 *    aprovar outra coisa.
 */

interface Achado {
  ruleId: string;
  code: string;
  severity: string;
  evidenceIds?: string[];
  facts?: Record<string, unknown>;
}

interface Evidencia {
  id: string;
  source: string;
  key: string;
  value: unknown;
}

const ROTULO_RESPOSTA: Record<string, string> = {
  country: 'País',
  sector: 'Setor',
  company: 'Empresa',
  companySize: 'Dimensão',
  currentWebsite: 'Site actual',
  processToImprove: 'Processos a melhorar',
  problemImpact: 'Impacto',
  problemConsequences: 'Consequência',
  currentSystems: 'Sistemas que participam',
  desiredDecision: 'Decisão pretendida',
  decisionTimeframe: 'Prazo de decisão',
  investmentBand: 'Faixa de investimento',
  decisionRole: 'Papel de quem respondeu',
  name: 'Nome',
  workEmail: 'Correio',
  phone: 'Telefone',
  consent: 'Consentimento',
  idioma: 'Idioma do formulário',
};

/** Os campos de texto livre: mostrados como citação, nunca na lista factual. */
const TEXTO_LIVRE = ['problemImpact', 'currentSystems', 'desiredDecision'];

function mostrarValor(chave: string, valor: unknown, pais: string | null): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (Array.isArray(valor)) {
    if (chave === 'problemConsequences')
      return valor.map((c) => (String(c) in CONSEQUENCIAS ? CONSEQUENCIAS[String(c) as keyof typeof CONSEQUENCIAS].pt : String(c))).join(', ');
    return valor.join(', ');
  }
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';

  const texto = String(valor);
  if (chave === 'sector') return rotuloDoSetor(pais, texto);
  if (chave === 'country') return nomeDoMercado(texto);
  return texto;
}

export default async function RevisaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { erro, ok } = await searchParams;
  const sessao = await requireStaff();
  const supabase = await createSessionClient();

  const { data: diagnostico } = await supabase
    .from('diagnostics')
    .select(
      'id, state, revision, score, tier, findings, evidence_bundle, ruleset_version, scoring_version, created_at, approved_at, rejected_at, rejection_reason, responses(id, raw, submitted_at, contacts(id, name, email, phone, organisations(id, name)))',
    )
    .eq('id', id)
    .maybeSingle();

  if (!diagnostico) notFound();

  const resposta = diagnostico.responses as unknown as {
    id: string;
    raw: Record<string, unknown>;
    submitted_at: string;
    contacts: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      organisations: { id: string; name: string } | null;
    } | null;
  } | null;

  const contacto = resposta?.contacts ?? null;
  const bruto = resposta?.raw ?? {};
  const achados = (diagnostico.findings ?? []) as unknown as Achado[];
  const pacote = (diagnostico.evidence_bundle ?? {}) as { evidence?: Evidencia[] };
  const evidencia = pacote.evidence ?? [];

  /**
   * A oportunidade criada pela mesma submissão (`deals.source_response_id`,
   * com índice). Com a 0019, aprovar ou rejeitar aqui também lhe muda a
   * fase — por isso a ligação fica à vista antes da decisão.
   */
  const [negocio, activo] = await Promise.all([
    resposta
      ? supabase.from('deals').select('id, stage, owner_id').eq('source_response_id', resposta.id).maybeSingle()
      : Promise.resolve({ data: null }),
    crmOperacional(supabase),
  ]);
  const deal = negocio.data as { id: string; stage: string; owner_id: string | null } | null;
  const dono = deal?.owner_id
    ? ((await supabase.from('profiles').select('display_name').eq('id', deal.owner_id).maybeSingle()).data as { display_name: string } | null)
    : null;

  const estado = diagnostico.state as keyof typeof ESTADO_DIAGNOSTICO;
  const escreve = podeEscrever(sessao.papel);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <Trilho itens={[{ texto: 'Diagnósticos', href: '/admin/diagnosticos' }, { texto: contacto?.name ?? 'Diagnóstico' }]} />
        <VoltarLista chave="diagnosticos" lista="/admin/diagnosticos" texto="Voltar à lista" />
      </div>
      <AdminHeading
        titulo="Rever diagnóstico"
        descricao="Aprovar significa: este diagnóstico está correcto e pode seguir. Não existe ainda texto redigido nem documento — o que se aprova são os achados e a classificação."
        accao={<StateBadge rotulo={ESTADO_DIAGNOSTICO[estado]} />}
      />

      <Feedback
        erro={erro}
        ok={ok}
        textos={{
          'em-revisao': 'Enviado para revisão. Já pode aprovar ou rejeitar.',
          aprovado:
            activo === true
              ? 'Diagnóstico aprovado. Se a oportunidade estava em «Novo», passou a «Qualificação».'
              : 'Diagnóstico aprovado.',
          rejeitado:
            activo === true
              ? 'Diagnóstico rejeitado. Se a oportunidade estava em «Novo», foi marcada como perdida (não qualificado).'
              : 'Diagnóstico rejeitado. O motivo ficou registado.',
          '1': 'Acção registada.',
        }}
      />

      <section aria-labelledby="resumo" className="mb-10">
        <h2 id="resumo" className="sr-only">
          Resumo
        </h2>
        <DefinitionList
          itens={[
            {
              termo: 'Contacto',
              valor: contacto ? (
                <Link href={`/admin/contactos/${contacto.id}`} className="underline">
                  {contacto.name} · {contacto.email}
                </Link>
              ) : (
                '—'
              ),
            },
            {
              termo: 'Organização',
              valor: contacto?.organisations ? (
                <Link
                  href={`/admin/organizacoes/${contacto.organisations.id}`}
                  className="underline"
                >
                  {contacto.organisations.name}
                </Link>
              ) : (
                'Sem organização associada'
              ),
            },
            { termo: 'Telefone', valor: contacto?.phone ?? '—' },
            {
              termo: 'Oportunidade',
              valor: deal ? (
                <span className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/oportunidades/${deal.id}`} className="underline">
                    Abrir a oportunidade
                  </Link>
                  <StateBadge rotulo={FASE_OPORTUNIDADE[deal.stage as keyof typeof FASE_OPORTUNIDADE]} />
                  <span className="text-xs text-[color:var(--muted)]">
                    {deal.owner_id ? `Responsável: ${dono?.display_name ?? '(perfil removido)'}` : 'Sem dono'}
                  </span>
                </span>
              ) : (
                'Nenhuma criada por esta submissão'
              ),
            },
            { termo: 'Submetido', valor: <DataHora valor={resposta?.submitted_at} /> },
            {
              termo: 'Classificação',
              valor: `${diagnostico.tier} — ${CLASSIFICACAO[diagnostico.tier as string] ?? ''} (${diagnostico.score} pontos)`,
            },
            {
              termo: 'Versões',
              valor: (
                <span className="text-xs text-[color:var(--muted)]">
                  regras {diagnostico.ruleset_version} · pontuação {diagnostico.scoring_version} ·
                  revisão {diagnostico.revision}
                </span>
              ),
            },
            ...(diagnostico.rejection_reason
              ? [{ termo: 'Motivo da rejeição', valor: diagnostico.rejection_reason as string }]
              : []),
          ]}
        />
      </section>

      <section aria-labelledby="achados" className="mb-10">
        <h2 id="achados" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
          Achados
        </h2>

        {achados.length === 0 ? (
          <EmptyState
            titulo="Nenhuma regra disparou."
            descricao="As respostas não apresentam nenhuma das tensões estruturais que o motor procura."
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {achados.map((a) => {
              const rotulo = ACHADO[a.code];
              return (
                <li key={a.ruleId} className="border border-[color:var(--border)] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-medium">{rotulo?.titulo ?? a.code}</h3>
                    <StateBadge rotulo={SEVERIDADE[a.severity]} />
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    {rotulo?.explicacao ?? 'Regra sem descrição no admin.'}
                  </p>
                  {a.facts && Object.keys(a.facts).length > 0 ? (
                    <p className="mt-3 font-[family-name:var(--font-chakra)] text-xs text-[color:var(--muted)]">
                      {Object.entries(a.facts)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(' · ')}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-[color:var(--muted)]">
                    Regra {a.ruleId} · evidência {(a.evidenceIds ?? []).join(', ') || '—'}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="respostas" className="mb-10">
        <h2 id="respostas" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
          O que o cliente respondeu
        </h2>

        <DefinitionList
          itens={Object.entries(bruto)
            .filter(([k]) => !TEXTO_LIVRE.includes(k) && k !== 'fax')
            .map(([k, v]) => ({
              termo: ROTULO_RESPOSTA[k] ?? k,
              valor: mostrarValor(k, v, typeof bruto.country === 'string' ? bruto.country : null),
            }))}
        />

        {/* Citações, nunca instruções. Os campos de texto livre são o vetor de
            injeção conhecido: o motor só leu o comprimento do impacto, e os
            sistemas e a decisão (D-38) não entram na pontuação. Por isso ficam
            fora da lista de respostas factuais e aparecem aqui, como citação.
            Opcionais: vazio mostra «—», não um bloco em branco. */}
        {TEXTO_LIVRE.map((k) => (
          <div key={k}>
            <h3 className="mt-8 mb-2 font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
              {ROTULO_RESPOSTA[k]}, nas palavras do cliente
            </h3>
            <blockquote className="border-l-2 border-[color:var(--border)] py-2 pl-4 text-sm whitespace-pre-wrap italic">
              {String(bruto[k] || '—')}
            </blockquote>
          </div>
        ))}
      </section>

      <section aria-labelledby="evidencia" className="mb-10">
        <h2 id="evidencia" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
          Evidência
        </h2>
        <p className="mb-4 max-w-[70ch] text-sm text-[color:var(--muted)]">
          Cada facto tem origem. Não existe origem «referência de mercado»: a AGORAMOZ não tem hoje
          nenhuma fonte dessas verificada, e um diagnóstico que a invocasse estaria a inventar.
        </p>

        <div className="overflow-x-auto border border-[color:var(--border)]">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Factos usados pelo motor, com a respectiva origem</caption>
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-raised)]">
                {['Identificador', 'Origem', 'Campo', 'Valor'].map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className="px-4 py-3 text-left font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evidencia.map((e) => (
                <tr key={e.id} className="border-b border-[color:var(--hairline)] last:border-b-0">
                  <td className="px-4 py-3 font-[family-name:var(--font-chakra)] text-xs">
                    {e.id}
                  </td>
                  <td className="px-4 py-3">{ORIGEM_EVIDENCIA[e.source] ?? e.source}</td>
                  <td className="px-4 py-3 text-xs text-[color:var(--muted)]">{e.key}</td>
                  <td className="px-4 py-3">
                    {Array.isArray(e.value) ? e.value.join(', ') : String(e.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="decisao">
        <h2 id="decisao" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
          Decisão
        </h2>

        {!escreve ? (
          <p className="text-sm text-[color:var(--muted)]">
            O seu papel é de leitura. A decisão cabe a quem tem papel comercial ou de administração.
          </p>
        ) : estado === 'computed' ? (
          <form action={enviarParaRevisao} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={diagnostico.id as string} />
            <input type="hidden" name="revision" value={String(diagnostico.revision)} />
            <BotaoEnviar variant="solid" aEnviar="A enviar…">
              Enviar para revisão
            </BotaoEnviar>
            <span className="text-sm text-[color:var(--muted)]">
              Passa a constar da fila de decisão.
            </span>
          </form>
        ) : estado === 'pending_review' ? (
          <div className="flex flex-col gap-8 lg:flex-row">
            <form action={aprovarDiagnostico} className="lg:w-64">
              <input type="hidden" name="id" value={diagnostico.id as string} />
              <input type="hidden" name="revision" value={String(diagnostico.revision)} />
              <BotaoEnviar variant="solid" className="w-full" aEnviar="A aprovar…">
                Aprovar
              </BotaoEnviar>
              <p className="mt-2 text-xs text-[color:var(--muted)]">
                Fica registado quem aprovou e quando. De aprovado só se sai por revogação.
              </p>
            </form>

            <form action={rejeitarDiagnostico} className="flex-1">
              <input type="hidden" name="id" value={diagnostico.id as string} />
              <input type="hidden" name="revision" value={String(diagnostico.revision)} />
              <label htmlFor="motivo" className="block text-sm font-medium">
                Motivo da rejeição
              </label>
              <textarea
                id="motivo"
                name="motivo"
                rows={3}
                required
                minLength={10}
                className="mt-2 w-full rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-sm"
              />
              <p className="mt-1 text-xs text-[color:var(--muted)]">
                Obrigatório. Uma rejeição sem motivo é inútil para quem a ler depois.
              </p>
              <div className="mt-3">
                <ConfirmarEnvio pergunta="Rejeitar este diagnóstico?" confirmar="Sim, rejeitar" aEnviar="A rejeitar…">
                  Rejeitar
                </ConfirmarEnvio>
              </div>
            </form>
          </div>
        ) : (
          <DefinitionList
            itens={[
              { termo: 'Estado', valor: ESTADO_DIAGNOSTICO[estado]?.texto ?? estado },
              { termo: 'Aprovado em', valor: <DataHora valor={diagnostico.approved_at} /> },
              { termo: 'Rejeitado em', valor: <DataHora valor={diagnostico.rejected_at} /> },
            ]}
          />
        )}
      </section>
    </>
  );
}
