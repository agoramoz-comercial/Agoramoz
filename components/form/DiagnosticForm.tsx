'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { Field, inputClass } from './Field';
import { COMPANY_SIZES, DECISION_ROLES, STEP_FIELDS, TIMEFRAMES, leadSchemaPara, type LeadInput } from '@/lib/forms/lead-schema';
import { COUNTRY_CODES, GLOBAL_CODES, GLOBAL_MARKETS } from '@/content/registry';
import { NOME_PAIS } from '@/content/i18n/chrome';
import { FORM, OBJETIVOS, PAPEIS, PASSOS, PRAZOS, TAMANHOS } from '@/content/i18n/formulario';
import type { Idioma } from '@/content/types';
import { SoPortugues } from '@/components/ui/SoPortugues';
import { ligacao } from '@/lib/i18n/rotas';
import { t } from '@/lib/i18n/texto';
import { ehCodigoDeDiagnostico, mercadoDoDiagnostico } from '@/lib/diagnostic/mercado';
import Link from 'next/link';
import { IMPROVEMENT_GOALS, SITE } from '@/content/site';
import { track } from '@/lib/analytics/track';
import { lerAtribuicao } from '@/lib/attribution/storage';
import { cn } from '@/lib/utils/cn';

const DRAFT_KEY = 'agoramoz:diagnostico:rascunho';

/**
 * Os ÚNICOS campos que podem ser gravados. Lista de permissão, não de
 * exclusão: acrescentar um campo pessoal ao formulário não o faz entrar aqui
 * por acidente.
 */
const DRAFT_FIELDS = [
  'country',
  'sector',
  'companySize',
  'processToImprove',
  'decisionTimeframe',
  'decisionRole',
] as const satisfies readonly (keyof LeadInput)[];
// `investmentBand` fica de fora de propósito: não identifica ninguém, mas é o
// campo comercialmente mais sensível do formulário e não vale o risco.

/** Os textos vivem em `content/i18n/formulario.ts`, nos dois idiomas. */
const TOTAL_PASSOS = PASSOS.length;

/**
 * Nos dois idiomas, com as mesmas regras. O que muda com `idioma`: os textos,
 * as mensagens de validação (`leadSchemaPara`), os nomes, setores e faixas do
 * mercado — e o campo `idioma` que viaja com o pedido, para o servidor guardar
 * o consentimento que a pessoa LEU.
 *
 * O que NÃO muda: os valores guardados (`imediato`, `decisor`, `mz-2`…) e o
 * `stepId` da analítica, que fica o título português. Mudá-lo partiria cada
 * relatório de funil em dois, um por idioma, sem nenhuma diferença real.
 */
export function DiagnosticForm({ idioma = 'pt' }: { idioma?: Idioma }) {
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const started = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const presetCountry = params.get('pais');
  const presetSector = params.get('setor');

  const form = useForm<LeadInput>({
    resolver: zodResolver(leadSchemaPara(idioma)) as Resolver<LeadInput>,
    mode: 'onBlur',
    defaultValues: {
      country: presetCountry && ehCodigoDeDiagnostico(presetCountry) ? presetCountry : undefined,
      sector: presetSector ?? '',
      processToImprove: [],
      currentWebsite: '',
      problemImpact: '',
      fax: '',
      idioma,
    },
  });

  const country = form.watch('country');
  const processes = form.watch('processToImprove') ?? [];
  // Pela porta única: resolve os treze mercados com a mesma forma.
  const activeCountry = country ? mercadoDoDiagnostico(country, idioma) : null;

  useEffect(() => {
    if (step > 0 && headingRef.current) headingRef.current.focus();
  }, [step]);

  /**
   * Rascunho — e o que NUNCA entra nele.
   *
   * Cinco passos num telemóvel: um recarregar, uma chamada a entrar, um
   * separador trocado, e perdia-se tudo. Guardar o progresso é um ganho real.
   *
   * Mas isto é um formulário cujo próprio texto de consentimento fala de
   * proteção de dados. Por isso guarda-se SÓ o enquadramento — país, setor,
   * dimensão, processos, prazo, papel na decisão — e NUNCA nome, email,
   * telefone, empresa ou o texto livre sobre o impacto. Nada que identifique
   * uma pessoa fica no dispositivo.
   *
   * `sessionStorage` e não `localStorage`: morre com o separador. E é limpo no
   * envio, para não sobreviver ao seu propósito.
   */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<LeadInput>;
      // O link manda sobre o rascunho. Quem preencheu o passo 1 como
      // Moçambique e a seguir clica no CTA de /global/ch quer a Suíça — os CTA
      // globais dependem só do `?pais=`. E um setor guardado para outro
      // mercado não pertence à lista deste.
      const paisDoLink = presetCountry && ehCodigoDeDiagnostico(presetCountry) ? presetCountry : null;
      const outroMercado = paisDoLink !== null && draft.country !== paisDoLink;
      for (const key of DRAFT_FIELDS) {
        if (key === 'country' && paisDoLink) continue;
        if (key === 'sector' && (presetSector || outroMercado)) continue;
        const value = draft[key];
        if (value !== undefined && value !== null && value !== '') {
          form.setValue(key, value as never, { shouldValidate: false });
        }
      }
    } catch {
      // Um rascunho ilegível não pode impedir o formulário de abrir.
    }
    // Só na montagem: repor a meio de uma edição apagaria o que se está a escrever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveDraft() {
    try {
      const values = form.getValues();
      const draft: Record<string, unknown> = {};
      for (const key of DRAFT_FIELDS) draft[key] = values[key];
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Sem armazenamento (janela privada, cookies bloqueados) não há rascunho,
      // e o formulário funciona na mesma.
    }
  }

  function markStarted() {
    if (started.current) return;
    started.current = true;
    track({ name: 'diagnostic_started', formId: 'diagnostic', entryPath: window.location.pathname });
  }

  async function next() {
    const ok = await form.trigger(STEP_FIELDS[step] as unknown as (keyof LeadInput)[]);
    if (!ok) return errorRef.current?.focus();
    track({ name: 'form_step_completed', step: step + 1, stepId: PASSOS[step]!.pt });
    saveDraft();
    setStep((s) => Math.min(s + 1, TOTAL_PASSOS - 1));
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setStatus('sending');
    try {
      const res = await fetch('/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        /**
         * A atribuição viaja ao LADO do lead, não dentro dele.
         *
         * Se entrasse no `leadSchema`, entrava também em `rawForStorage` — que
         * é um spread — e portanto em `responses.raw`, que é imutável depois de
         * inserida. Uma origem errada ficava lá para sempre.
         *
         * E, sobretudo: a chave de idempotência deriva das respostas. Se a
         * origem contasse para ela, a MESMA pessoa a submeter o mesmo
         * formulário vinda de duas campanhas criava dois leads — exactamente o
         * defeito que a ingestão transacional existe para impedir.
         */
        body: JSON.stringify({ ...values, atribuicao: lerAtribuicao() }),
      });
      if (!res.ok) throw new Error('request failed');
      /**
       * O servidor já não devolve a classificação do lead, e este evento já
       * não a leva. Era um valor interno de priorização comercial que chegava
       * ao browser e ia parar à dataLayer — visível em devtools para o próprio
       * visitante que estava a ser classificado. A qualificação passa a viver
       * só do lado do servidor. Ver D-15 em `docs/DECISIONS.md`.
       */
      track({ name: 'diagnostic_submitted' });
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* nada a limpar */
      }
      setStatus('done');
    } catch {
      setStatus('error');
    }
  });

  const solucoes = ligacao('/solucoes', idioma);
  const politica = ligacao('/privacidade', idioma);

  if (status === 'done') {
    const enviado = form.getValues();
    const faixa = activeCountry?.investmentBands.find((b) => b.id === enviado.investmentBand);
    // `sector` é `string` no schema, não `SectorSlug`: procuro na lista do país
    // em vez de indexar às cegas o `Record`, que aceitaria um valor inventado.
    const setor = activeCountry?.sectors.find((s) => s.slug === enviado.sector)?.label;

    /**
     * As faixas já vivem na moeda nativa de cada país — `Até 250 000 MZN`,
     * `15 000 – 50 000 €`. O rótulo é mostrado tal como está, sem formatação
     * adicional e sem conversão: converter obrigaria a uma taxa de câmbio no
     * repositório, que envelhece e passa a mentir ao lead.
     */
    const resumo: [string, string][] = [
      ...(activeCountry ? ([[t(FORM.mercado, idioma), activeCountry.name]] as [string, string][]) : []),
      ...(setor ? ([[t(FORM.setor, idioma), setor]] as [string, string][]) : []),
      ...(faixa ? ([[t(FORM.faixaIndicada, idioma), faixa.label]] as [string, string][]) : []),
      ...(enviado.decisionTimeframe
        ? ([[t(FORM.prazoCurto, idioma), t(PRAZOS[enviado.decisionTimeframe], idioma)]] as [string, string][])
        : []),
    ];

    /**
     * O momento mais valioso do site acabava numa caixa sem saída: sem próximo
     * passo, sem prazo, sem canal alternativo e sem forma de voltar. Quem
     * acabou de confiar dados à empresa fica agora a saber o que acontece a
     * seguir e tem por onde continuar.
     */
    return (
      <div
        role="status"
        className="border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-8"
      >
        <span className="grid size-12 place-items-center rounded-full bg-[color:var(--ok)]">
          <Check aria-hidden className="size-6 text-[color:var(--surface)]" />
        </span>
        <h2 className="mt-5 font-display text-[length:var(--text-h3)]">{t(FORM.recebido, idioma)}</h2>
        <p className="mt-3 max-w-md text-[color:var(--muted)]">{t(FORM.recebidoCorpo, idioma)}</p>

        {resumo.length > 0 && (
          /**
             O ecrã mais valioso do site não devolvia nada do que a pessoa
             acabou de escrever. Devolver a faixa **na moeda do país** — e não
             convertida, nunca convertida — faz duas coisas: confirma ao lead
             que foi entendido, e ancora a conversa que vem a seguir no número
             que ele próprio indicou.
          */
          <div className="rule mt-7 pt-6">
            <p className="rule-label text-[color:var(--muted)]">{t(FORM.oQueRecebemos, idioma)}</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {resumo.map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt className="rule-label text-[color:var(--muted)]">{rotulo}</dt>
                  <dd className="mt-1 text-sm text-[color:var(--on-surface)]">{valor}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="rule mt-7 pt-6">
          <p className="rule-label text-[color:var(--muted)]">{t(FORM.agora, idioma)}</p>
          <ol className="mt-4 space-y-3">
            {[FORM.agora1, FORM.agora2, FORM.agora3].map((passo, i) => (
              <li key={passo.pt} className="flex items-baseline gap-4 text-sm text-[color:var(--muted)]">
                <span className="rule-label shrink-0 text-[color:var(--accent)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {t(passo, idioma)}
              </li>
            ))}
          </ol>
        </div>

        <div className="rule mt-7 flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap">
          <Button asChild variant="outline">
            <a href={`https://wa.me/${SITE.whatsapp.e164}`} target="_blank" rel="noopener noreferrer">
              {t(FORM.whatsapp, idioma)}
            </a>
          </Button>
          <Button asChild variant="ghost">
            <Link href={solucoes.href} hrefLang={solucoes.soPortugues ? 'pt' : undefined}>
              {t(FORM.verSolucoes, idioma)}
              {solucoes.soPortugues && <SoPortugues idioma={idioma} />}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const errors = form.formState.errors;
  const stepErrors = (STEP_FIELDS[step] as unknown as (keyof LeadInput)[]).filter((f) => errors[f]);

  return (
    <form
      onSubmit={onSubmit}
      onChange={markStarted}
      noValidate
      className="border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-6 md:p-8"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="font-techno font-medium text-[length:var(--text-micro)] tracking-[var(--tracking-techno)] text-[color:var(--accent)] uppercase">
          {t(FORM.passo, idioma).replace('{n}', String(step + 1)).replace('{total}', String(TOTAL_PASSOS))}
        </p>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-[color:var(--border)]">
          <div
            className="h-full bg-[color:var(--accent)] transition-[width] duration-300"
            style={{ width: `${((step + 1) / TOTAL_PASSOS) * 100}%` }}
          />
        </div>
      </div>

      <h2
        ref={headingRef}
        tabIndex={-1}
        aria-live="polite"
        className="mt-4 font-display text-[length:var(--text-h3)] outline-none"
      >
        {t(PASSOS[step]!, idioma)}
      </h2>

      {stepErrors.length > 0 && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mt-5 rounded-[--radius-sm] border border-[color:var(--color-signal-600)] p-4 outline-none"
        >
          <p className="text-sm font-medium">{t(FORM.corrija, idioma)}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--muted)]">
            {stepErrors.map((f) => (
              <li key={String(f)}>{String(errors[f]?.message)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-7 space-y-6">
        {step === 0 && (
          <>
            <Controller
              control={form.control}
              name="country"
              render={({ field }) => (
                /*
                  Dois grupos para o mesmo campo: primeiro os três mercados onde
                  operamos, depois os dez de expansão — «depois dos três países
                  aparece Global». Partilham o valor: escolher num deixa o
                  outro sem selecção, que é o que se quer.
                */
                <div className="space-y-6">
                  <ChipGroup
                    legend={t(FORM.paisOperacao, idioma)}
                    showLegend
                    columns={3}
                    value={field.value ?? null}
                    onChange={(v) => {
                      field.onChange(v);
                      form.setValue('sector', '');
                      form.setValue('investmentBand', '');
                      markStarted();
                    }}
                    options={COUNTRY_CODES.map((c) => ({ value: c, label: t(NOME_PAIS[c], idioma) }))}
                  />
                  <ChipGroup
                    legend={t(FORM.global, idioma)}
                    showLegend
                    columns={3}
                    value={field.value ?? null}
                    onChange={(v) => {
                      field.onChange(v);
                      form.setValue('sector', '');
                      form.setValue('investmentBand', '');
                      markStarted();
                    }}
                    options={GLOBAL_CODES.map((c) => ({ value: c, label: t(GLOBAL_MARKETS[c].name, idioma) }))}
                  />
                </div>
              )}
            />
            {activeCountry && (
              <Controller
                control={form.control}
                name="sector"
                render={({ field }) => (
                  <ChipGroup
                    legend={t(FORM.setor, idioma)}
                    showLegend
                    columns={2}
                    value={field.value || null}
                    onChange={field.onChange}
                    options={activeCountry.sectors.map((s) => ({ value: s.slug, label: s.label }))}
                  />
                )}
              />
            )}
          </>
        )}

        {step === 1 && (
          <>
            <Field label={t(FORM.nomeEmpresa, idioma)} required idioma={idioma} error={errors.company?.message}>
              {({ id, describedBy, invalid }) => (
                <input id={id} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="organization" className={inputClass} {...form.register('company')} />
              )}
            </Field>
            <Controller
              control={form.control}
              name="companySize"
              render={({ field }) => (
                <ChipGroup
                  legend={t(FORM.colaboradores, idioma)}
                  columns={2}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  options={COMPANY_SIZES.map((s) => ({ value: s, label: t(TAMANHOS[s], idioma) }))}
                />
              )}
            />
            <Field label={t(FORM.website, idioma)} hint={t(FORM.websiteDica, idioma)} idioma={idioma} error={errors.currentWebsite?.message}>
              {({ id, describedBy, invalid }) => (
                <input id={id} aria-describedby={describedBy} aria-invalid={invalid} inputMode="url" autoComplete="url" placeholder={t(FORM.websiteExemplo, idioma)} className={inputClass} {...form.register('currentWebsite')} />
              )}
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <fieldset className="border-0 p-0">
              <legend className="text-sm font-medium">
                {t(FORM.melhorar, idioma)} <span className="text-[color:var(--accent)]" aria-hidden>*</span>
              </legend>
              <p className="mt-1 text-[length:var(--text-micro)] text-[color:var(--muted)]">
                {t(FORM.melhorarDica, idioma)}
              </p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {IMPROVEMENT_GOALS.map((g) => {
                  const checked = processes.includes(g.value);
                  return (
                    <label
                      key={g.value}
                      className={cn(
                        'flex min-h-11 cursor-pointer items-center gap-3 rounded-[--radius-sm] border px-4 py-3 text-[0.9375rem]',
                        checked
                          ? 'border-[color:var(--accent)] bg-[color:var(--color-signal-600)] text-white': 'border-[color:var(--border)]',
                      )}
                    >
                      <input
                        type="checkbox"
                        value={g.value}
                        checked={checked}
                        onChange={(e) => {
                          const nextVal = e.target.checked
                            ? [...processes, g.value]
                            : processes.filter((v) => v !== g.value);
                          form.setValue('processToImprove', nextVal, { shouldValidate: true });
                          markStarted();
                        }}
                        className="size-4 shrink-0 accent-[color:var(--color-ink-900)]"
                      />
                      {t(OBJETIVOS[g.value], idioma)}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <Field
              label={t(FORM.impacto, idioma)}
              required
              idioma={idioma}
              hint={t(FORM.impactoDica, idioma)}
              error={errors.problemImpact?.message}
            >
              {({ id, describedBy, invalid }) => (
                <textarea id={id} aria-describedby={describedBy} aria-invalid={invalid} rows={5} className={inputClass} {...form.register('problemImpact')} />
              )}
            </Field>
          </>
        )}

        {step === 3 && activeCountry && (
          <>
            <Controller
              control={form.control}
              name="decisionTimeframe"
              render={({ field }) => (
                <ChipGroup legend={t(FORM.prazo, idioma)} columns={2} value={field.value ?? null} onChange={field.onChange} options={TIMEFRAMES.map((p) => ({ value: p, label: t(PRAZOS[p], idioma) }))} />
              )}
            />
            <Controller
              control={form.control}
              name="investmentBand"
              render={({ field }) => (
                <ChipGroup
                  legend={t(FORM.faixa, idioma).replace('{moeda}', activeCountry.currency)}
                  columns={2}
                  value={field.value || null}
                  onChange={field.onChange}
                  options={activeCountry.investmentBands.map((b) => ({ value: b.id, label: b.label }))}
                />
              )}
            />
            <Controller
              control={form.control}
              name="decisionRole"
              render={({ field }) => (
                <ChipGroup legend={t(FORM.papel, idioma)} columns={2} value={field.value ?? null} onChange={field.onChange} options={DECISION_ROLES.map((r) => ({ value: r, label: t(PAPEIS[r], idioma) }))} />
              )}
            />
          </>
        )}

        {step === 4 && activeCountry && (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label={t(FORM.nome, idioma)} required idioma={idioma} error={errors.name?.message}>
                {({ id, describedBy, invalid }) => (
                  <input id={id} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="name" className={inputClass} {...form.register('name')} />
                )}
              </Field>
              <Field label={t(FORM.email, idioma)} required idioma={idioma} error={errors.workEmail?.message}>
                {({ id, describedBy, invalid }) => (
                  <input id={id} type="email" aria-describedby={describedBy} aria-invalid={invalid} autoComplete="email" className={inputClass} {...form.register('workEmail')} />
                )}
              </Field>
            </div>

            <Field label={t(FORM.telefone, idioma)} required idioma={idioma} hint={t(FORM.indicativo, idioma).replace('{indicativo}', activeCountry.dialCode)} error={errors.phone?.message}>
              {({ id, describedBy, invalid }) => (
                <input id={id} type="tel" inputMode="tel" aria-describedby={describedBy} aria-invalid={invalid} autoComplete="tel" className={inputClass} {...form.register('phone')} />
              )}
            </Field>

            {/* Honeypot — escondido de pessoas e de leitores de ecrã, visível para bots. */}
            <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="fax-field">Fax</label>
              <input id="fax-field" tabIndex={-1} autoComplete="off" {...form.register('fax')} />
            </div>

            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1 size-4 shrink-0" {...form.register('consent')} />
              <span className="text-[color:var(--muted)]">
                {activeCountry.consentText}{' '}
                {/* A política só existe em português: em inglês, a ligação diz para onde vai. */}
                <a
                  href={politica.href}
                  hrefLang={politica.soPortugues ? 'pt' : undefined}
                  className="text-[color:var(--accent)] underline underline-offset-4"
                >
                  {t(FORM.politica, idioma)}
                  {politica.soPortugues && <SoPortugues idioma={idioma} />}
                </a>
              </span>
            </label>
            {errors.consent && <p className="text-sm text-[color:var(--color-signal-600)]">{errors.consent.message}</p>}
          </>
        )}
      </div>

      {status === 'error' && (
        /* O email estava escrito à mão aqui; passou a vir de SITE. E o WhatsApp
           é a recuperação mais rápida — quem acabou de perder cinco passos de
           formulário não quer abrir o cliente de email. */
        <div role="alert" className="mt-6 border border-[color:var(--color-signal-600)] p-4">
          <p className="text-sm">{t(FORM.erroTitulo, idioma)}</p>
          <p className="mt-1.5 text-sm text-[color:var(--muted)]">
            {t(FORM.erroCorpo, idioma)}{' '}
            <a
              href={`https://wa.me/${SITE.whatsapp.e164}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--accent)] underline underline-offset-4"
            >
              WhatsApp
            </a>{' '}
            {t(FORM.ou, idioma)}{' '}
            <a
              href={`mailto:${SITE.email}`}
              className="text-[color:var(--accent)] underline underline-offset-4"
            >
              {SITE.email}
            </a>
            .
          </p>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="gap-1.5">
          <ArrowLeft aria-hidden className="size-4" />
          {t(FORM.voltar, idioma)}
        </Button>

        {step < TOTAL_PASSOS - 1 ? (
          <Button type="button" onClick={next} className="gap-1.5">
            {t(FORM.continuar, idioma)}
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={status === 'sending'} className="gap-1.5">
            {status === 'sending' && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {t(FORM.enviar, idioma)}
          </Button>
        )}
      </div>
    </form>
  );
}
