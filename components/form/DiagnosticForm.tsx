'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { Field, inputClass } from './Field';
import { COMPANY_SIZES, DECISION_ROLES, STEP_FIELDS, TIMEFRAMES, leadSchema, type LeadInput } from '@/lib/forms/lead-schema';
import { COUNTRIES, COUNTRY_CODES, SECTOR_LABELS } from '@/content/registry';
import Link from 'next/link';
import { IMPROVEMENT_GOALS, SITE } from '@/content/site';
import type { CountryCode } from '@/content/types';
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

const STEP_TITLES = [
  'Onde opera a sua empresa',
  'A sua empresa',
  'O processo a melhorar',
  'A decisão',
  'Como o contactamos',
];

const SIZE_LABELS: Record<(typeof COMPANY_SIZES)[number], string> = {
  '1-9': '1 a 9 colaboradores',
  '10-49': '10 a 49',
  '50-249': '50 a 249',
  '250+': '250 ou mais',
};
const TIME_LABELS: Record<(typeof TIMEFRAMES)[number], string> = {
  imediato: 'Imediato',
  '1-3-meses': 'Nos próximos 1 a 3 meses',
  '3-6-meses': 'Em 3 a 6 meses',
  'sem-data': 'Ainda sem data',
};
const ROLE_LABELS: Record<(typeof DECISION_ROLES)[number], string> = {
  decisor: 'Decido',
  'co-decisor': 'Decido em conjunto',
  influenciador: 'Influencio a decisão',
  pesquisa: 'Estou a recolher informação',
};

export function DiagnosticForm() {
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const started = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const presetCountry = params.get('pais');
  const presetSector = params.get('setor');

  const form = useForm<LeadInput>({
    resolver: zodResolver(leadSchema) as Resolver<LeadInput>,
    mode: 'onBlur',
    defaultValues: {
      country: (COUNTRY_CODES as readonly string[]).includes(presetCountry ?? '')
        ? (presetCountry as CountryCode)
        : undefined,
      sector: presetSector ?? '',
      processToImprove: [],
      currentWebsite: '',
      problemImpact: '',
      fax: '',
    },
  });

  const country = form.watch('country');
  const processes = form.watch('processToImprove') ?? [];
  const activeCountry = country ? COUNTRIES[country] : null;

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
      for (const key of DRAFT_FIELDS) {
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
    track({ name: 'form_step_completed', step: step + 1, stepId: STEP_TITLES[step]! });
    saveDraft();
    setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
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

  if (status === 'done') {
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
        <h2 className="mt-5 font-display text-[length:var(--text-h3)]">Pedido recebido.</h2>
        <p className="mt-3 max-w-md text-[color:var(--muted)]">
          Vamos analisar o que descreveu e responder com os próximos passos. Se concluirmos que não há
          adequação, dizemos isso — é mais útil para si do que uma proposta que não faz sentido.
        </p>

        <div className="rule mt-7 pt-6">
          <p className="rule-label text-[color:var(--muted)]">O que acontece agora</p>
          <ol className="mt-4 space-y-3">
            {[
              'Lemos o que descreveu e identificamos o bloqueio principal.',
              'Respondemos por email com o problema, a viabilidade e o próximo passo.',
              'Se fizer sentido avançar, marcamos uma conversa objetiva.',
            ].map((t, i) => (
              <li key={t} className="flex items-baseline gap-4 text-sm text-[color:var(--muted)]">
                <span className="rule-label shrink-0 text-[color:var(--accent)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {t}
              </li>
            ))}
          </ol>
        </div>

        <div className="rule mt-7 flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap">
          <Button asChild variant="outline">
            <a href={`https://wa.me/${SITE.whatsapp.e164}`} target="_blank" rel="noopener noreferrer">
              Acrescentar algo por WhatsApp
            </a>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/solucoes">Ver as soluções entretanto</Link>
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
          Passo {step + 1} de {STEP_TITLES.length}
        </p>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-[color:var(--border)]">
          <div
            className="h-full bg-[color:var(--accent)] transition-[width] duration-300"
            style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
          />
        </div>
      </div>

      <h2
        ref={headingRef}
        tabIndex={-1}
        aria-live="polite"
        className="mt-4 font-display text-[length:var(--text-h3)] outline-none"
      >
        {STEP_TITLES[step]}
      </h2>

      {stepErrors.length > 0 && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mt-5 rounded-[--radius-sm] border border-[color:var(--color-signal-600)] p-4 outline-none"
        >
          <p className="text-sm font-medium">Corrija os seguintes campos:</p>
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
                <ChipGroup
                  legend="País de operação"
                  columns={3}
                  value={field.value ?? null}
                  onChange={(v) => {
                    field.onChange(v);
                    form.setValue('sector', '');
                    markStarted();
                  }}
                  options={COUNTRY_CODES.map((c) => ({ value: c, label: COUNTRIES[c].name }))}
                />
              )}
            />
            {activeCountry && (
              <Controller
                control={form.control}
                name="sector"
                render={({ field }) => (
                  <ChipGroup
                    legend="Setor"
                    columns={2}
                    value={field.value || null}
                    onChange={field.onChange}
                    options={activeCountry.sectors.map((s) => ({ value: s, label: SECTOR_LABELS[s] }))}
                  />
                )}
              />
            )}
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Nome da empresa" required error={errors.company?.message}>
              {({ id, describedBy, invalid }) => (
                <input id={id} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="organization" className={inputClass} {...form.register('company')} />
              )}
            </Field>
            <Controller
              control={form.control}
              name="companySize"
              render={({ field }) => (
                <ChipGroup
                  legend="Número de colaboradores"
                  columns={2}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  options={COMPANY_SIZES.map((s) => ({ value: s, label: SIZE_LABELS[s] }))}
                />
              )}
            />
            <Field label="Website atual" hint="Se ainda não tiver, deixe em branco." error={errors.currentWebsite?.message}>
              {({ id, describedBy, invalid }) => (
                <input id={id} aria-describedby={describedBy} aria-invalid={invalid} inputMode="url" autoComplete="url" placeholder="exemplo.com" className={inputClass} {...form.register('currentWebsite')} />
              )}
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <fieldset className="border-0 p-0">
              <legend className="text-sm font-medium">
                O que pretende melhorar? <span className="text-[color:var(--accent)]" aria-hidden>*</span>
              </legend>
              <p className="mt-1 text-[length:var(--text-micro)] text-[color:var(--muted)]">
                Pode escolher mais do que um.
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
                      {g.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <Field
              label="Qual é o impacto atual deste problema?"
              required
              hint="Tempo perdido, erros, atrasos, oportunidades que não foram acompanhadas."
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
                <ChipGroup legend="Prazo da decisão" columns={2} value={field.value ?? null} onChange={field.onChange} options={TIMEFRAMES.map((t) => ({ value: t, label: TIME_LABELS[t] }))} />
              )}
            />
            <Controller
              control={form.control}
              name="investmentBand"
              render={({ field }) => (
                <ChipGroup
                  legend={`Faixa de investimento (${activeCountry.currency})`}
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
                <ChipGroup legend="O seu papel na decisão" columns={2} value={field.value ?? null} onChange={field.onChange} options={DECISION_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
              )}
            />
          </>
        )}

        {step === 4 && activeCountry && (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Nome" required error={errors.name?.message}>
                {({ id, describedBy, invalid }) => (
                  <input id={id} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="name" className={inputClass} {...form.register('name')} />
                )}
              </Field>
              <Field label="Email profissional" required error={errors.workEmail?.message}>
                {({ id, describedBy, invalid }) => (
                  <input id={id} type="email" aria-describedby={describedBy} aria-invalid={invalid} autoComplete="email" className={inputClass} {...form.register('workEmail')} />
                )}
              </Field>
            </div>

            <Field label="Telefone ou WhatsApp" required hint={`Indicativo ${activeCountry.dialCode}`} error={errors.phone?.message}>
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
                {activeCountry.consent.text}{' '}
                <a href={activeCountry.consent.policyHref} className="text-[color:var(--accent)] underline underline-offset-4">
                  Política de privacidade
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
          <p className="text-sm">Não foi possível enviar o pedido.</p>
          <p className="mt-1.5 text-sm text-[color:var(--muted)]">
            As suas respostas continuam aqui — carregue outra vez em enviar. Se voltar a falhar,
            fale connosco por{' '}
            <a
              href={`https://wa.me/${SITE.whatsapp.e164}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--accent)] underline underline-offset-4"
            >
              WhatsApp
            </a>{' '}
            ou{' '}
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
          Voltar
        </Button>

        {step < STEP_TITLES.length - 1 ? (
          <Button type="button" onClick={next} className="gap-1.5">
            Continuar
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={status === 'sending'} className="gap-1.5">
            {status === 'sending' && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Enviar pedido
          </Button>
        )}
      </div>
    </form>
  );
}
