'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm, Controller, type FieldErrors, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { Field, inputClass } from './Field';
import {
  CARTOES,
  COMPANY_SIZES,
  DECISION_ROLES,
  STEP_FIELDS,
  TIMEFRAMES,
  leadSchemaPara,
  type LeadInput,
} from '@/lib/forms/lead-schema';
import { CARTOES_AUTOMATICOS, cartaoInicial, minutosRestantes, podeIrPara, setorValido } from '@/lib/forms/carrossel';
import { COUNTRY_CODES, GLOBAL_CODES, GLOBAL_MARKETS } from '@/content/registry';
import { NOME_PAIS } from '@/content/i18n/chrome';
import { FORM, OBJETIVOS, PAPEIS, PERGUNTAS, PRAZOS, TAMANHOS } from '@/content/i18n/formulario';
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

const TOTAL = CARTOES.length;
const INDICE_SETOR = CARTOES.indexOf('setor');

/**
 * O tempo de ver a escolha marcada antes de o cartão mudar. Sem ele, a opção
 * tocada desaparece no mesmo instante e a pessoa fica sem saber o que marcou.
 */
const PAUSA_MS = 260;

/**
 * O diagnóstico em carrossel: uma pergunta por cartão.
 *
 * Nos dois idiomas, com as mesmas regras. O que muda com `idioma`: os textos,
 * as mensagens de validação (`leadSchemaPara`), os nomes, setores e faixas do
 * mercado — e o campo `idioma` que viaja com o pedido, para o servidor guardar
 * o consentimento que a pessoa LEU.
 *
 * O que NÃO muda: os valores guardados (`imediato`, `decisor`, `mz-2`…), o
 * pedido à API e o rascunho. O `stepId` da analítica passa a ser o id do
 * cartão (`pais`, `faixa`…), igual nos dois idiomas.
 *
 * A lógica que não precisa de React — por onde começar, o que conta como
 * respondido, quanto falta — vive em `lib/forms/carrossel.ts`, com testes.
 */
export function DiagnosticForm({
  idioma = 'pt',
  nivelTitulo = 'h2',
}: {
  idioma?: Idioma;
  /** `h3` quando o carrossel vive dentro de uma secção que já tem `h2`. */
  nivelTitulo?: 'h2' | 'h3';
}) {
  const params = useSearchParams();
  const presetCountry = params.get('pais');
  const presetSector = params.get('setor');
  const paisDoLink = presetCountry && ehCodigoDeDiagnostico(presetCountry) ? presetCountry : undefined;
  // Um `?setor=` que não é do mercado do link não se aceita: a lista do
  // cartão não o teria, e a pessoa ficava com uma resposta que não vê.
  const setorDoLink = paisDoLink && setorValido(paisDoLink, presetSector ?? undefined) ? presetSector! : '';

  const [indice, setIndice] = useState(() => cartaoInicial({ country: paisDoLink, sector: setorDoLink }));
  const [maisAvancado, setMaisAvancado] = useState(indice);
  const [direcao, setDirecao] = useState<'frente' | 'tras' | null>(null);
  const [pronto, setPronto] = useState(false);
  /** Cada incremento pede o foco na caixa de erros, depois do render que a mostra. */
  const [pedidoFocoErros, setPedidoFocoErros] = useState(0);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const indiceRef = useRef(indice);
  const started = useRef(false);
  const mudouCartao = useRef(false);
  const vistos = useRef(new Set<number>());
  const concluidos = useRef(new Set<number>());
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const formId = useId();

  const form = useForm<LeadInput>({
    resolver: zodResolver(leadSchemaPara(idioma)) as Resolver<LeadInput>,
    mode: 'onBlur',
    defaultValues: {
      country: paisDoLink,
      sector: setorDoLink,
      processToImprove: [],
      currentWebsite: '',
      problemImpact: '',
      fax: '',
      idioma,
    },
  });

  const country = form.watch('country');
  const processes = form.watch('processToImprove') ?? [];
  const impacto = form.watch('problemImpact') ?? '';
  // Pela porta única: resolve os treze mercados com a mesma forma.
  const activeCountry = country ? mercadoDoDiagnostico(country, idioma) : null;
  const cartao = CARTOES[indice]!;

  /**
   * Rascunho — e o que NUNCA entra nele.
   *
   * Um recarregar, uma chamada a entrar, um separador trocado, e perdia-se
   * tudo. Guardar o progresso é um ganho real. Mas guarda-se SÓ o
   * enquadramento — país, setor, dimensão, processos, prazo, papel — e NUNCA
   * nome, email, telefone, empresa ou o texto livre. Nada que identifique uma
   * pessoa fica no dispositivo.
   *
   * `sessionStorage` e não `localStorage`: morre com o separador. E é limpo no
   * envio, para não sobreviver ao seu propósito.
   *
   * Depois de repor, o carrossel salta para o primeiro cartão por responder.
   */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<LeadInput>;
        // O link manda sobre o rascunho. Quem preencheu Moçambique e a seguir
        // clica no CTA de /global/ch quer a Suíça. E um setor guardado para
        // outro mercado não pertence à lista deste.
        const outroMercado = paisDoLink !== undefined && draft.country !== paisDoLink;
        for (const key of DRAFT_FIELDS) {
          if (key === 'country' && paisDoLink) continue;
          if (key === 'sector' && (setorDoLink || outroMercado)) continue;
          const value = draft[key];
          if (value !== undefined && value !== null && value !== '') {
            form.setValue(key, value as never, { shouldValidate: false });
          }
        }
        const v = form.getValues();
        if (v.sector && !setorValido(v.country, v.sector)) form.setValue('sector', '');
        const inicio = cartaoInicial(form.getValues());
        indiceRef.current = inicio;
        setIndice(inicio);
        setMaisAvancado((m) => Math.max(m, inicio));
      }
    } catch {
      // Um rascunho ilegível não pode impedir o formulário de abrir.
    }
    setPronto(true);
    // Só na montagem: repor a meio de uma edição apagaria o que se está a escrever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Cada cartão visto conta uma vez — vista sem conclusão é a desistência. */
  useEffect(() => {
    if (!pronto || vistos.current.has(indice)) return;
    vistos.current.add(indice);
    track({ name: 'step_viewed', step: indice + 1, stepId: CARTOES[indice]! });
  }, [indice, pronto]);

  /** O foco segue a pergunta nova — nunca na primeira montagem. */
  useEffect(() => {
    if (mudouCartao.current) headingRef.current?.focus();
  }, [indice]);

  /**
   * Depois do efeito acima, de propósito: num envio com erros noutro cartão,
   * o salto e o pedido de foco chegam no mesmo render, e ganha a caixa de
   * erros do cartão novo. Sem temporizador em corrida com o React.
   */
  useEffect(() => {
    if (pedidoFocoErros > 0) errorRef.current?.focus();
  }, [pedidoFocoErros]);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

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
    track({
      name: 'diagnostic_started',
      formId: 'diagnostic',
      entryPath: window.location.pathname,
    });
  }

  function irPara(destino: number) {
    if (temporizador.current) clearTimeout(temporizador.current);
    if (destino === indiceRef.current || destino < 0 || destino >= TOTAL) return;
    mudouCartao.current = true;
    setDirecao(destino > indiceRef.current ? 'frente' : 'tras');
    indiceRef.current = destino;
    setIndice(destino);
    setMaisAvancado((m) => Math.max(m, destino));
  }

  function focarErros() {
    setPedidoFocoErros((n) => n + 1);
  }

  /**
   * Valida o cartão e passa ao seguinte. `de` é o cartão em que o pedido
   * nasceu: um avanço automático em espera e um clique em «Continuar» no
   * mesmo instante não podem saltar dois cartões.
   */
  async function avancar(de = indiceRef.current) {
    // O último cartão só se conclui com o envio. → ou deslizar ali não fazem
    // nada — senão o funil contava contactos «concluídos» que nunca chegaram.
    if (de !== indiceRef.current || de >= TOTAL - 1) return;
    markStarted();
    const ok = await form.trigger(STEP_FIELDS[de] as unknown as (keyof LeadInput)[]);
    if (de !== indiceRef.current) return;
    if (!ok) return focarErros();
    if (!concluidos.current.has(de)) {
      concluidos.current.add(de);
      track({
        name: 'form_step_completed',
        step: de + 1,
        stepId: CARTOES[de]!,
      });
    }
    saveDraft();
    irPara(de + 1);
  }

  /** Escolha única: marca, deixa ver, avança. */
  function escolher() {
    markStarted();
    if (temporizador.current) clearTimeout(temporizador.current);
    const de = indiceRef.current;
    temporizador.current = setTimeout(() => void avancar(de), PAUSA_MS);
  }

  function voltar() {
    if (indiceRef.current > 0) irPara(indiceRef.current - 1);
  }

  /** ← e → quando o foco está na pergunta (onde fica depois de cada mudança). */
  function onKeyDownPergunta(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      void avancar();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      voltar();
    }
  }

  /** Deslizar no telemóvel: para a esquerda avança (com validação), para a direita volta. */
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== 'touch') return;
    const alvo = e.target as HTMLElement;
    if (alvo.closest('input, textarea')) return;
    toque.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e: React.PointerEvent) {
    const inicio = toque.current;
    toque.current = null;
    if (!inicio) return;
    const dx = e.clientX - inicio.x;
    const dy = e.clientY - inicio.y;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    if (dx < 0) void avancar();
    else voltar();
  }

  /** No envio, um campo inválido noutro cartão leva a pessoa até ele. */
  function onInvalido(erros: FieldErrors<LeadInput>) {
    const comErro = STEP_FIELDS.findIndex((campos) => campos.some((c) => erros[c]));
    if (comErro >= 0 && comErro !== indiceRef.current) irPara(comErro);
    focarErros();
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
       * ao browser e ia parar à dataLayer. A qualificação vive só do lado do
       * servidor. Ver D-15 em `docs/DECISIONS.md`.
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
  }, onInvalido);

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
     * `15 000 – 50 000 €`. O rótulo é mostrado tal como está, sem conversão:
     * converter obrigaria a uma taxa de câmbio no repositório, que envelhece e
     * passa a mentir ao lead.
     */
    const resumo: [string, string][] = [
      ...(activeCountry ? ([[t(FORM.mercado, idioma), activeCountry.name]] as [string, string][]) : []),
      ...(setor ? ([[t(FORM.setor, idioma), setor]] as [string, string][]) : []),
      ...(faixa ? ([[t(FORM.faixaIndicada, idioma), faixa.label]] as [string, string][]) : []),
      ...(enviado.decisionTimeframe
        ? ([[t(FORM.prazoCurto, idioma), t(PRAZOS[enviado.decisionTimeframe], idioma)]] as [string, string][])
        : []),
    ];

    return (
      <div role="status" className="border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-8">
        <span className="grid size-12 place-items-center rounded-full bg-[color:var(--ok)]">
          <Check aria-hidden className="size-6 text-[color:var(--surface)]" />
        </span>
        <p className="mt-5 font-display text-[length:var(--text-h3)]">{t(FORM.recebido, idioma)}</p>
        <p className="mt-3 max-w-md text-[color:var(--muted)]">{t(FORM.recebidoCorpo, idioma)}</p>

        {resumo.length > 0 && (
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
                <span className="rule-label shrink-0 text-[color:var(--accent)]">{String(i + 1).padStart(2, '0')}</span>
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
  const stepErrors = (STEP_FIELDS[indice] as unknown as (keyof LeadInput)[]).filter((f) => errors[f]);
  const automatico = CARTOES_AUTOMATICOS.has(cartao);
  const pergunta = (i: number) =>
    t(PERGUNTAS[CARTOES[i]!], idioma)
      .replace('{moeda}', activeCountry?.currency ?? '')
      .replace(' ()', '');
  const Titulo = nivelTitulo;
  const avisoId = `${formId}-aviso`;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-6 md:p-8"
    >
      {/* Visual. Para leitores de ecrã, o progresso vai dentro da pergunta,
          que é o que recebe o foco em cada mudança de cartão. */}
      <div aria-hidden className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-techno font-medium text-[length:var(--text-micro)] tracking-[var(--tracking-techno)] text-[color:var(--accent)] uppercase">
          {t(FORM.pergunta, idioma)
            .replace('{n}', String(indice + 1))
            .replace('{total}', String(TOTAL))}
        </p>
        <p className="text-[length:var(--text-micro)] text-[color:var(--muted)]">
          {t(FORM.minutos, idioma).replace('{min}', String(minutosRestantes(indice)))}
        </p>
      </div>

      {/* Um segmento por pergunta. Os já vistos levam de volta a elas; os da
          frente ficam fechados, para nenhuma obrigatória ficar por ver. */}
      <nav aria-label={t(FORM.progresso, idioma)} className="mt-3">
        <ol className="grid gap-1" style={{ gridTemplateColumns: `repeat(${TOTAL}, minmax(0, 1fr))` }}>
          {CARTOES.map((id, i) => (
            <li key={id}>
              <button
                type="button"
                disabled={!podeIrPara(i, maisAvancado)}
                aria-current={i === indice ? 'step' : undefined}
                aria-label={t(FORM.irPara, idioma)
                  .replace('{n}', String(i + 1))
                  .replace('{pergunta}', pergunta(i))}
                onClick={() => irPara(i)}
                className="flex h-6 w-full items-center disabled:cursor-default"
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-1 w-full rounded-full transition-colors duration-300',
                    i === indice
                      ? 'bg-[color:var(--color-signal-600)]'
                      : i < indice
                        ? 'bg-[color:var(--on-surface)]'
                        : i <= maisAvancado
                          ? 'bg-[color:var(--muted)]'
                          : 'bg-[color:var(--border)]',
                  )}
                />
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div
        key={indice}
        data-cartao={direcao ?? undefined}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (toque.current = null)}
        style={{ touchAction: 'pan-y' }}
      >
        <Titulo
          ref={headingRef}
          tabIndex={-1}
          onKeyDown={onKeyDownPergunta}
          className="mt-5 scroll-mt-28 font-display text-[length:var(--text-h3)] text-balance outline-none"
        >
          <span className="sr-only">
            {t(FORM.pergunta, idioma)
              .replace('{n}', String(indice + 1))
              .replace('{total}', String(TOTAL))}
            .{' '}
          </span>
          {pergunta(indice)}
        </Titulo>
        {automatico && (
          <p id={avisoId} className="mt-2 text-[length:var(--text-micro)] text-[color:var(--muted)]">
            {t(FORM.avancaSozinho, idioma)}
          </p>
        )}

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

        <div className="mt-6 space-y-6">
          {cartao === 'pais' && (
            <Controller
              control={form.control}
              name="country"
              render={({ field }) => {
                /*
                  Dois grupos para o mesmo campo: primeiro os três mercados onde
                  operamos, depois os dez de expansão. Partilham o valor.
                  Mudar de país apaga o setor e a faixa, que são do mercado —
                  e fecha os cartões à frente até voltarem a ser respondidos.
                */
                const mudar = (v: string) => {
                  if (v !== field.value) {
                    form.setValue('sector', '');
                    form.setValue('investmentBand', '');
                    setMaisAvancado(Math.min(maisAvancado, INDICE_SETOR));
                  }
                  field.onChange(v);
                };
                return (
                  <div className="space-y-6">
                    <ChipGroup
                      legend={t(FORM.paisOperacao, idioma)}
                      showLegend
                      columns={3}
                      value={field.value ?? null}
                      onChange={mudar}
                      onEscolha={escolher}
                      describedBy={avisoId}
                      options={COUNTRY_CODES.map((c) => ({
                        value: c,
                        label: t(NOME_PAIS[c], idioma),
                      }))}
                    />
                    <ChipGroup
                      legend={t(FORM.global, idioma)}
                      showLegend
                      columns={3}
                      value={field.value ?? null}
                      onChange={mudar}
                      onEscolha={escolher}
                      describedBy={avisoId}
                      options={GLOBAL_CODES.map((c) => ({
                        value: c,
                        label: t(GLOBAL_MARKETS[c].name, idioma),
                      }))}
                    />
                  </div>
                );
              }}
            />
          )}

          {cartao === 'setor' && activeCountry && (
            <Controller
              control={form.control}
              name="sector"
              render={({ field }) => (
                <ChipGroup
                  legend={t(FORM.setor, idioma)}
                  columns={2}
                  value={field.value || null}
                  onChange={field.onChange}
                  onEscolha={escolher}
                  describedBy={avisoId}
                  options={activeCountry.sectors.map((s) => ({
                    value: s.slug,
                    label: s.label,
                  }))}
                />
              )}
            />
          )}

          {cartao === 'processos' && (
            <fieldset className="border-0 p-0">
              <legend className="text-sm text-[color:var(--muted)]">{t(FORM.melhorarDica, idioma)}</legend>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {IMPROVEMENT_GOALS.map((g) => {
                  const checked = processes.includes(g.value);
                  return (
                    <label
                      key={g.value}
                      className={cn(
                        'flex min-h-11 cursor-pointer items-center gap-3 rounded-[--radius-sm] border px-4 py-3 text-[0.9375rem]',
                        checked
                          ? 'border-[color:var(--accent)] bg-[color:var(--color-signal-600)] text-white'
                          : 'border-[color:var(--border)]',
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
                          form.setValue('processToImprove', nextVal, {
                            shouldValidate: true,
                          });
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
          )}

          {cartao === 'dimensao' && (
            <Controller
              control={form.control}
              name="companySize"
              render={({ field }) => (
                <ChipGroup
                  legend={t(FORM.colaboradores, idioma)}
                  columns={2}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  onEscolha={escolher}
                  describedBy={avisoId}
                  options={COMPANY_SIZES.map((s) => ({
                    value: s,
                    label: t(TAMANHOS[s], idioma),
                  }))}
                />
              )}
            />
          )}

          {cartao === 'prazo' && (
            <Controller
              control={form.control}
              name="decisionTimeframe"
              render={({ field }) => (
                <ChipGroup
                  legend={t(FORM.prazo, idioma)}
                  columns={2}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  onEscolha={escolher}
                  describedBy={avisoId}
                  options={TIMEFRAMES.map((p) => ({
                    value: p,
                    label: t(PRAZOS[p], idioma),
                  }))}
                />
              )}
            />
          )}

          {cartao === 'papel' && (
            <Controller
              control={form.control}
              name="decisionRole"
              render={({ field }) => (
                <ChipGroup
                  legend={t(FORM.papel, idioma)}
                  columns={2}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  onEscolha={escolher}
                  describedBy={avisoId}
                  options={DECISION_ROLES.map((r) => ({
                    value: r,
                    label: t(PAPEIS[r], idioma),
                  }))}
                />
              )}
            />
          )}

          {cartao === 'faixa' && activeCountry && (
            <Controller
              control={form.control}
              name="investmentBand"
              render={({ field }) => (
                <ChipGroup
                  legend={t(FORM.faixa, idioma).replace('{moeda}', activeCountry.currency)}
                  columns={2}
                  value={field.value || null}
                  onChange={field.onChange}
                  onEscolha={escolher}
                  describedBy={avisoId}
                  options={activeCountry.investmentBands.map((b) => ({
                    value: b.id,
                    label: b.label,
                  }))}
                />
              )}
            />
          )}

          {cartao === 'impacto' && (
            <Field
              label={t(FORM.impacto, idioma)}
              idioma={idioma}
              hint={t(FORM.impactoOpcionalDica, idioma)}
              error={errors.problemImpact?.message}
            >
              {({ id, describedBy, invalid }) => (
                <textarea
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  rows={4}
                  className={inputClass}
                  {...form.register('problemImpact')}
                />
              )}
            </Field>
          )}

          {cartao === 'contacto' && activeCountry && (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label={t(FORM.nome, idioma)} required idioma={idioma} error={errors.name?.message}>
                  {({ id, describedBy, invalid }) => (
                    <input
                      id={id}
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      autoComplete="name"
                      className={inputClass}
                      {...form.register('name')}
                    />
                  )}
                </Field>
                <Field label={t(FORM.email, idioma)} required idioma={idioma} error={errors.workEmail?.message}>
                  {({ id, describedBy, invalid }) => (
                    <input
                      id={id}
                      type="email"
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      autoComplete="email"
                      className={inputClass}
                      {...form.register('workEmail')}
                    />
                  )}
                </Field>
                <Field
                  label={t(FORM.telefone, idioma)}
                  required
                  idioma={idioma}
                  hint={t(FORM.indicativo, idioma).replace('{indicativo}', activeCountry.dialCode)}
                  error={errors.phone?.message}
                >
                  {({ id, describedBy, invalid }) => (
                    <input
                      id={id}
                      type="tel"
                      inputMode="tel"
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      autoComplete="tel"
                      className={inputClass}
                      {...form.register('phone')}
                    />
                  )}
                </Field>
                <Field label={t(FORM.nomeEmpresa, idioma)} required idioma={idioma} error={errors.company?.message}>
                  {({ id, describedBy, invalid }) => (
                    <input
                      id={id}
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      autoComplete="organization"
                      className={inputClass}
                      {...form.register('company')}
                    />
                  )}
                </Field>
              </div>

              <Field
                label={t(FORM.website, idioma)}
                hint={t(FORM.websiteDica, idioma)}
                idioma={idioma}
                error={errors.currentWebsite?.message}
              >
                {({ id, describedBy, invalid }) => (
                  <input
                    id={id}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    inputMode="url"
                    autoComplete="url"
                    placeholder={t(FORM.websiteExemplo, idioma)}
                    className={inputClass}
                    {...form.register('currentWebsite')}
                  />
                )}
              </Field>

              {/* Honeypot — escondido de pessoas e de leitores de ecrã, visível para bots. */}
              <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="fax-field">Fax</label>
                <input id="fax-field" tabIndex={-1} autoComplete="off" {...form.register('fax')} />
              </div>

              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  aria-invalid={Boolean(errors.consent)}
                  aria-describedby={errors.consent ? `${formId}-consentimento` : undefined}
                  className="mt-1 size-4 shrink-0"
                  {...form.register('consent')}
                />
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
              {errors.consent && (
                <p id={`${formId}-consentimento`} className="text-sm text-[color:var(--signal)]">
                  {errors.consent.message}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {status === 'error' && (
        /* O WhatsApp é a recuperação mais rápida — quem acabou de perder o
           envio não quer abrir o cliente de email. */
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
            <a href={`mailto:${SITE.email}`} className="text-[color:var(--accent)] underline underline-offset-4">
              {SITE.email}
            </a>
            .
          </p>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" disabled={indice === 0} onClick={voltar} className="gap-1.5">
          <ArrowLeft aria-hidden className="size-4" />
          {t(FORM.voltar, idioma)}
        </Button>

        {cartao === 'contacto' ? (
          <Button type="submit" disabled={status === 'sending'} className="gap-1.5">
            {status === 'sending' && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {t(FORM.enviar, idioma)}
          </Button>
        ) : (
          <Button
            type="button"
            variant={automatico ? 'outline' : undefined}
            onClick={() => void avancar()}
            className="gap-1.5"
          >
            {cartao === 'impacto' && impacto.trim() === '' ? t(FORM.saltar, idioma) : t(FORM.continuar, idioma)}
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
