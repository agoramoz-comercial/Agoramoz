'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { inputClass } from '@/components/form/Field';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { INQ } from '@/content/i18n/inquerito';
import type { Idioma, Texto } from '@/content/types';
import { track } from '@/lib/analytics/track';
import { t } from '@/lib/i18n/texto';
import {
  cartoesDe,
  erroDoCartao,
  montarEnvio,
  primeiroComErro,
  type DadosContacto,
  type ErroCartao,
  type Rascunho,
  type ValorRascunho,
} from '@/lib/inqueritos/cartoes';
import { validarResposta } from '@/lib/inqueritos/respostas';
import type { CampoContacto, Pergunta, SpecInquerito } from '@/lib/inqueritos/spec';
import { cn } from '@/lib/utils/cn';
import { EstadoInquerito } from './EstadoInquerito';

/**
 * Quem responde a um inquérito: boas-vindas → um cartão por pergunta →
 * agradecimento. O mesmo componente serve a página pública (`modo
 * 'publico'`) e a pré-visualização do construtor no admin (`'previa'`, que
 * não envia nem mede nada).
 *
 * Todo o texto vem do spec e é mostrado como texto — o React escapa-o, e não
 * há `dangerouslySetInnerHTML` aqui. A validação de cada cartão é a mesma
 * função que o servidor usa (`lib/inqueritos/cartoes.ts`), mas o servidor
 * valida tudo de novo: o browser só poupa uma ida e volta.
 */

type Props =
  | { modo: 'publico'; spec: SpecInquerito; inqueritoId: string; token: string }
  | { modo: 'previa'; spec: SpecInquerito; inqueritoId?: string; token?: undefined };

type Fase = 'inicio' | 'cartoes' | 'fim' | 'fechado';
type Envio = 'idle' | 'enviando' | 'erro' | 'limite';

/** O suficiente para ver a escolha marcada antes de o cartão mudar. */
const PAUSA_MS = 260;
const AUTOMATICOS = new Set<Pergunta['tipo']>(['escolha_unica', 'avaliacao', 'nps']);

const ROTULO_CAMPO: Record<CampoContacto, Texto> = {
  nome: INQ.campoNome,
  email: INQ.campoEmail,
  telefone: INQ.campoTelefone,
  organizacao: INQ.campoOrganizacao,
};
const TIPO_CAMPO: Record<CampoContacto, { type: string; autoComplete: string }> = {
  nome: { type: 'text', autoComplete: 'name' },
  email: { type: 'email', autoComplete: 'email' },
  telefone: { type: 'tel', autoComplete: 'tel' },
  organizacao: { type: 'text', autoComplete: 'organization' },
};

function preencher(texto: Texto, idioma: Idioma, valores: Record<string, string | number>) {
  return Object.entries(valores).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    t(texto, idioma),
  );
}

/** A regra que a pessoa precisa de conhecer antes de responder, ou nada. */
function dicaDe(p: Pergunta, idioma: Idioma): string | null {
  switch (p.tipo) {
    case 'escolha_multipla': {
      const min = p.min ?? 1;
      if (p.max !== undefined && min > 1)
        return preencher(INQ.escolhaEntre, idioma, { min, max: p.max });
      if (p.max !== undefined) return preencher(INQ.escolhaMax, idioma, { max: p.max });
      return min > 1 ? preencher(INQ.escolhaMin, idioma, { min }) : null;
    }
    case 'numero': {
      const partes: string[] = [];
      if (p.min !== undefined && p.max !== undefined)
        partes.push(preencher(INQ.numeroEntre, idioma, { min: p.min, max: p.max }));
      else if (p.min !== undefined) partes.push(preencher(INQ.numeroMin, idioma, { min: p.min }));
      else if (p.max !== undefined) partes.push(preencher(INQ.numeroMax, idioma, { max: p.max }));
      if (p.inteiro) partes.push(t(INQ.numeroInteiro, idioma));
      return partes.length > 0 ? partes.join(' ') : null;
    }
    default:
      return null;
  }
}

/**
 * O id da submissão (UUID v4). `crypto.randomUUID` falta em origens não
 * seguras e em Safari anterior a 15.4; `getRandomValues` existe em todos.
 */
function novoIdDeSubmissao(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function mensagemDeErro(p: Pergunta, erro: ErroCartao, idioma: Idioma): string {
  if (erro === 'obrigatoria') return t(INQ.obrigatoria, idioma);
  if (p.tipo === 'texto_curto' || p.tipo === 'texto_longo')
    return preencher(INQ.textoLongo, idioma, { max: p.max });
  if (p.tipo === 'data') return t(INQ.dataFormato, idioma);
  return dicaDe(p, idioma) ?? t(INQ.invalida, idioma);
}

export function SurveyRenderer(props: Props) {
  const { spec, modo } = props;
  const idioma = spec.idioma;
  const base = useId();

  const [fase, setFase] = useState<Fase>('inicio');
  const [estadoFechado, setEstadoFechado] = useState<'fechado' | 'expirado'>('fechado');
  const [rascunho, setRascunho] = useState<Rascunho>({});
  const rascunhoRef = useRef<Rascunho>({});
  const [indice, setIndice] = useState(0);
  const indiceRef = useRef(0);
  const [direcao, setDirecao] = useState<'frente' | 'tras' | null>(null);
  const [erro, setErro] = useState<ErroCartao | null>(null);
  const [pedidoFocoErro, setPedidoFocoErro] = useState(0);
  const [contacto, setContacto] = useState<DadosContacto>({});
  const [consentimento, setConsentimento] = useState(false);
  const [errosContacto, setErrosContacto] = useState<ReadonlySet<string>>(new Set());
  const [envio, setEnvio] = useState<Envio>('idle');
  /** Guarda síncrona: dois cliques antes do novo render não fazem dois pedidos. */
  const aEnviar = useRef(false);
  const [fax, setFax] = useState('');

  const headingRef = useRef<HTMLHeadingElement>(null);
  const fimRef = useRef<HTMLHeadingElement>(null);
  const erroRef = useRef<HTMLDivElement>(null);
  const focarAoMudar = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vistos = useRef(new Set<number>());
  /** Um por submissão, criado no primeiro envio: repetir o envio não duplica a resposta. */
  const submissionId = useRef<string | null>(null);

  const cartoes = useMemo(() => cartoesDe(spec, rascunho), [spec, rascunho]);
  const total = cartoes.length;
  const cartao = cartoes[Math.min(indice, total - 1)]!;
  const ultimo = indice >= total - 1;

  const medir = modo === 'publico';
  const surveyId = props.inqueritoId;

  useEffect(() => {
    if (fase !== 'cartoes' || !medir || !surveyId || vistos.current.has(indice)) return;
    vistos.current.add(indice);
    track({ name: 'survey_step_viewed', surveyId, step: indice + 1 });
  }, [fase, indice, medir, surveyId]);

  useEffect(() => {
    if (focarAoMudar.current) headingRef.current?.focus();
  }, [indice, fase]);

  useEffect(() => {
    if (pedidoFocoErro > 0) erroRef.current?.focus();
  }, [pedidoFocoErro]);

  useEffect(() => {
    if (fase === 'fim') fimRef.current?.focus();
  }, [fase]);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  // Na pré-visualização do construtor o inquérito muda por baixo: se o cartão
  // actual deixou de existir, volta-se ao último que existe.
  useEffect(() => {
    if (total > 0 && indiceRef.current > total - 1) {
      indiceRef.current = total - 1;
      setIndice(total - 1);
    }
  }, [total]);

  // E uma pergunta que mudou de tipo perde a resposta de rascunho: um texto
  // antigo não serve de NPS, e um número fora da escala deixava-a sem foco.
  const tipos = useRef<Map<string, Pergunta['tipo']>>(new Map());
  useEffect(() => {
    const agora = new Map(spec.perguntas.map((p) => [p.chave, p.tipo] as const));
    const mudadas = [...agora].filter(
      ([k, t]) => tipos.current.has(k) && tipos.current.get(k) !== t,
    );
    tipos.current = agora;
    if (mudadas.length === 0) return;
    const limpo = { ...rascunhoRef.current };
    for (const [k] of mudadas) delete limpo[k];
    rascunhoRef.current = limpo;
    setRascunho(limpo);
  }, [spec.perguntas]);

  function definir(chave: string, valor: ValorRascunho) {
    rascunhoRef.current = { ...rascunhoRef.current, [chave]: valor };
    setRascunho(rascunhoRef.current);
    setErro(null);
  }

  function comecar() {
    focarAoMudar.current = true;
    setFase('cartoes');
    if (medir && surveyId) track({ name: 'survey_started', surveyId });
  }

  function irPara(destino: number) {
    if (temporizador.current) clearTimeout(temporizador.current);
    if (destino === indiceRef.current || destino < 0) return;
    focarAoMudar.current = true;
    setDirecao(destino > indiceRef.current ? 'frente' : 'tras');
    indiceRef.current = destino;
    setIndice(destino);
    setErro(null);
    // Um erro de envio é do envio, não do cartão para onde se foi.
    setEnvio((e) => (e === 'enviando' ? e : 'idle'));
  }

  function voltar() {
    if (indiceRef.current > 0) irPara(indiceRef.current - 1);
  }

  /**
   * Valida o cartão `de` e passa ao seguinte; no último, envia. Um avanço
   * automático em espera e um clique no mesmo instante não saltam dois
   * cartões, e o automático nunca envia.
   */
  function avancar(de = indiceRef.current, automatico = false) {
    if (de !== indiceRef.current) return;
    const atuais = cartoesDe(spec, rascunhoRef.current);
    const c = atuais[de];
    if (!c) return;
    if (c.tipo === 'pergunta') {
      const e = erroDoCartao(c.pergunta, rascunhoRef.current[c.pergunta.chave]);
      if (e) {
        setErro(e);
        setPedidoFocoErro((n) => n + 1);
        return;
      }
    }
    if (de >= atuais.length - 1) {
      if (!automatico) void enviar();
      return;
    }
    irPara(de + 1);
  }

  function escolher(chave: string, valor: ValorRascunho) {
    definir(chave, valor);
    if (temporizador.current) clearTimeout(temporizador.current);
    const de = indiceRef.current;
    temporizador.current = setTimeout(() => avancar(de, true), PAUSA_MS);
  }

  async function enviar() {
    if (aEnviar.current) return;
    const r = rascunhoRef.current;
    const atuais = cartoesDe(spec, r);
    const comErro = primeiroComErro(atuais, r);
    if (comErro >= 0) {
      const c = atuais[comErro];
      irPara(comErro);
      if (c?.tipo === 'pergunta') setErro(erroDoCartao(c.pergunta, r[c.pergunta.chave]));
      setPedidoFocoErro((n) => n + 1);
      return;
    }

    const corpo = montarEnvio(spec, r, contacto, consentimento);
    const validacao = validarResposta(spec, corpo);
    if (!validacao.ok) {
      const doContacto = new Set(
        validacao.erros.filter((e) => e.chave.startsWith('contacto')).map((e) => e.chave),
      );
      setErrosContacto(doContacto);
      if (doContacto.size > 0) {
        irPara(atuais.length - 1);
        setPedidoFocoErro((n) => n + 1);
        return;
      }
    }
    setErrosContacto(new Set());

    if (props.modo === 'previa') {
      setFase('fim');
      return;
    }

    aEnviar.current = true;
    setEnvio('enviando');
    try {
      submissionId.current ??= novoIdDeSubmissao();
      const res = await fetch('/api/inqueritos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: props.token,
          submissionId: submissionId.current,
          ...corpo,
          ...(fax ? { fax } : {}),
        }),
      });
      if (res.status === 200 || res.status === 202) {
        setEnvio('idle');
        setFase('fim');
        return;
      }
      if (res.status === 410 || res.status === 404) {
        const dados = (await res.json().catch(() => null)) as { estado?: string } | null;
        setEstadoFechado(dados?.estado === 'expirado' ? 'expirado' : 'fechado');
        setEnvio('idle');
        setFase('fechado');
        return;
      }
      setEnvio(res.status === 429 ? 'limite' : 'erro');
    } catch {
      setEnvio('erro');
    } finally {
      aEnviar.current = false;
    }
  }

  function recomecar() {
    rascunhoRef.current = {};
    setRascunho({});
    setContacto({});
    setConsentimento(false);
    setErrosContacto(new Set());
    indiceRef.current = 0;
    setIndice(0);
    setDirecao(null);
    focarAoMudar.current = false;
    setFase('inicio');
  }

  function onKeyDownTitulo(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      // Como avanço automático: no último cartão valida mas nunca envia —
      // enviar é sempre um gesto explícito no botão.
      avancar(indiceRef.current, true);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      voltar();
    }
  }

  const aviso =
    modo === 'previa' ? (
      <p className="mb-4 border border-dashed border-[color:var(--border)] px-4 py-2 text-[length:var(--text-micro)] text-[color:var(--muted)]">
        {t(INQ.previa, idioma)}
      </p>
    ) : null;

  // ── Fechado a meio (revogado ou tecto atingido entre abrir e enviar) ──────
  if (fase === 'fechado') {
    return <EstadoInquerito estado={estadoFechado} idioma={idioma} nivel="h2" />;
  }

  // ── Agradecimento ──────────────────────────────────────────────────────────
  if (fase === 'fim') {
    return (
      <div>
        {aviso}
        <div
          role="status"
          className="border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-6 md:p-8"
        >
          <span className="grid size-12 place-items-center rounded-full bg-[color:var(--ok)]">
            <Check aria-hidden className="size-6 text-[color:var(--surface)]" />
          </span>
          <h2
            ref={fimRef}
            tabIndex={-1}
            className="mt-5 font-display text-[length:var(--text-h3)] text-balance outline-none"
          >
            {spec.agradecimento.titulo}
          </h2>
          {spec.agradecimento.corpo && (
            <p className="mt-3 max-w-[56ch] whitespace-pre-line text-[color:var(--muted)]">
              {spec.agradecimento.corpo}
            </p>
          )}
          {modo === 'previa' && (
            <Button type="button" variant="outline" size="sm" className="mt-6" onClick={recomecar}>
              {t(INQ.recomecar, idioma)}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Boas-vindas ────────────────────────────────────────────────────────────
  if (fase === 'inicio') {
    return (
      <div>
        {aviso}
        <div className="border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-6 md:p-8">
          {spec.boasVindas.corpo && (
            <p className="max-w-[56ch] whitespace-pre-line text-[length:var(--text-lead)] text-[color:var(--muted)]">
              {spec.boasVindas.corpo}
            </p>
          )}
          <p className="rule mt-6 pt-5 text-sm text-[color:var(--muted)]">
            {t(spec.contacto ? INQ.contactoOpcional : INQ.semDados, idioma)}
          </p>
          <Button type="button" className="mt-6 gap-1.5" onClick={comecar}>
            {t(INQ.comecar, idioma)}
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Cartões ────────────────────────────────────────────────────────────────
  const tituloId = `${base}-titulo`;
  const ajudaId = `${base}-ajuda`;
  const dicaId = `${base}-dica`;
  const avisoId = `${base}-auto`;
  const erroId = `${base}-erro`;
  const passo = preencher(INQ.passo, idioma, { n: indice + 1, total });
  const p = cartao.tipo === 'pergunta' ? cartao.pergunta : null;
  const dica = p ? dicaDe(p, idioma) : null;
  const automatico = p !== null && AUTOMATICOS.has(p.tipo) && !ultimo;
  const descritores =
    [
      p?.ajuda ? ajudaId : null,
      dica ? dicaId : null,
      automatico ? avisoId : null,
      erro ? erroId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;
  const bruto = p ? rascunho[p.chave] : undefined;

  return (
    <div>
      {aviso}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          avancar();
        }}
        className="border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-6 md:p-8"
      >
        {/* Visual. Para leitores de ecrã, o passo vai dentro do título do cartão. */}
        <div aria-hidden>
          <p className="font-techno text-[length:var(--text-micro)] font-medium tracking-[var(--tracking-techno)] text-[color:var(--accent)] uppercase">
            {passo}
          </p>
          <div className="mt-3 h-1 w-full rounded-full bg-[color:var(--border)]">
            <div
              className="h-1 rounded-full bg-[color:var(--color-signal-600)] motion-safe:transition-[width] motion-safe:duration-300"
              style={{ width: `${Math.round(((indice + 1) / total) * 100)}%` }}
            />
          </div>
        </div>

        <div key={indice} data-cartao={direcao ?? undefined}>
          <h2
            ref={headingRef}
            tabIndex={-1}
            onKeyDown={onKeyDownTitulo}
            className="mt-6 font-display text-[length:var(--text-h3)] text-balance outline-none"
          >
            <span className="sr-only">{passo}. </span>
            {/* Só o título: é o nome acessível dos campos (aria-labelledby). */}
            <span id={tituloId}>{p ? p.titulo : t(INQ.contactoTitulo, idioma)}</span>
            {p && p.tipo !== 'seccao' && p.obrigatoria && (
              <span className="ml-1 text-[color:var(--accent)]" aria-hidden>
                *
              </span>
            )}
          </h2>
          {p?.ajuda && (
            <p
              id={ajudaId}
              className="mt-2 max-w-[60ch] whitespace-pre-line text-[color:var(--muted)]"
            >
              {p.ajuda}
            </p>
          )}
          {!p && (
            <p className="mt-2 max-w-[60ch] text-[color:var(--muted)]">
              {t(INQ.contactoCorpo, idioma)}
            </p>
          )}
          {dica && (
            <p id={dicaId} className="mt-2 text-sm text-[color:var(--muted)]">
              {dica}
            </p>
          )}
          {automatico && (
            <p
              id={avisoId}
              className="mt-2 text-[length:var(--text-micro)] text-[color:var(--muted)]"
            >
              {t(INQ.avancaSozinho, idioma)}
            </p>
          )}

          {p && erro && (
            <div
              ref={erroRef}
              tabIndex={-1}
              role="alert"
              id={erroId}
              className="mt-5 rounded-[--radius-sm] border border-[color:var(--color-signal-600)] p-4 text-sm outline-none"
            >
              {mensagemDeErro(p, erro, idioma)}
            </div>
          )}

          <div className="mt-6">
            {p && (
              <Entrada
                pergunta={p}
                valor={bruto}
                idioma={idioma}
                tituloId={tituloId}
                descritores={descritores}
                invalida={erro !== null}
                onMudar={(v) => definir(p.chave, v)}
                onEscolher={(v) => escolher(p.chave, v)}
              />
            )}
            {!p && spec.contacto && (
              <BlocoContacto
                campos={spec.contacto.campos}
                textoConsentimento={spec.contacto.textoConsentimento}
                idioma={idioma}
                base={base}
                valores={contacto}
                consentimento={consentimento}
                erros={errosContacto}
                erroRef={erroRef}
                onCampo={(c, v) => {
                  setContacto((atual) => ({ ...atual, [c]: v }));
                  setErrosContacto(new Set());
                }}
                onConsentimento={(v) => {
                  setConsentimento(v);
                  setErrosContacto(new Set());
                }}
              />
            )}
          </div>
        </div>

        {/* Armadilha — escondida de pessoas e de leitores de ecrã. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor={`${base}-fax`}>Fax</label>
          <input
            id={`${base}-fax`}
            tabIndex={-1}
            autoComplete="off"
            value={fax}
            onChange={(e) => setFax(e.target.value)}
          />
        </div>

        {(envio === 'erro' || envio === 'limite') && (
          <p
            role="alert"
            className="mt-6 border border-[color:var(--color-signal-600)] p-4 text-sm"
          >
            {t(envio === 'limite' ? INQ.limite : INQ.erroEnvio, idioma)}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={indice === 0}
            onClick={voltar}
            className="gap-1.5"
          >
            <ArrowLeft aria-hidden className="size-4" />
            {t(INQ.voltar, idioma)}
          </Button>
          {ultimo ? (
            // Chaves distintas: sem elas o React reaproveita o botão «Continuar»
            // (fundo claro) e a transição de cor mostra texto branco sobre claro.
            <Button key="enviar" type="submit" disabled={envio === 'enviando'} className="gap-1.5">
              {envio === 'enviando' && <Loader2 aria-hidden className="size-4 animate-spin" />}
              {t(envio === 'enviando' ? INQ.aEnviar : INQ.enviar, idioma)}
            </Button>
          ) : (
            <Button key="continuar" type="submit" variant="solid" className="gap-1.5">
              {t(INQ.continuar, idioma)}
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Entradas por tipo ────────────────────────────────────────────────────────

function Entrada({
  pergunta: p,
  valor,
  idioma,
  tituloId,
  descritores,
  invalida,
  onMudar,
  onEscolher,
}: {
  pergunta: Pergunta;
  valor: ValorRascunho | undefined;
  idioma: Idioma;
  tituloId: string;
  descritores: string | undefined;
  invalida: boolean;
  onMudar: (v: ValorRascunho) => void;
  onEscolher: (v: ValorRascunho) => void;
}) {
  const texto = typeof valor === 'string' ? valor : '';
  const comum = {
    'aria-labelledby': tituloId,
    'aria-describedby': descritores,
    'aria-invalid': invalida || undefined,
    'aria-required': p.tipo !== 'seccao' && p.obrigatoria ? true : undefined,
  } as const;

  switch (p.tipo) {
    case 'seccao':
      return null;
    case 'texto_curto':
      return (
        <input
          type="text"
          className={inputClass}
          maxLength={p.max}
          value={texto}
          onChange={(e) => onMudar(e.target.value)}
          {...comum}
        />
      );
    case 'texto_longo':
      return (
        <div>
          <textarea
            rows={5}
            className={cn(inputClass, 'min-h-32 resize-y')}
            maxLength={p.max}
            value={texto}
            onChange={(e) => onMudar(e.target.value)}
            {...comum}
          />
          <p
            aria-hidden
            className="mt-1.5 text-right text-[length:var(--text-micro)] text-[color:var(--muted)] tabular-nums"
          >
            {preencher(INQ.caracteres, idioma, { n: texto.length, max: p.max })}
          </p>
        </div>
      );
    case 'numero':
      return (
        <input
          type="text"
          inputMode={p.inteiro ? 'numeric' : 'decimal'}
          className={cn(inputClass, 'max-w-60 tabular-nums')}
          value={texto}
          onChange={(e) => onMudar(e.target.value)}
          {...comum}
        />
      );
    case 'data':
      return (
        <input
          type="date"
          className={cn(inputClass, 'max-w-60')}
          min="1900-01-01"
          max="2100-12-31"
          value={texto}
          onChange={(e) => onMudar(e.target.value)}
          {...comum}
        />
      );
    case 'escolha_unica':
      return (
        <ChipGroup
          legend={p.titulo}
          columns={p.opcoes.length <= 3 ? 1 : 2}
          value={typeof valor === 'string' ? valor : null}
          options={p.opcoes.map((o) => ({ value: o.chave, label: o.rotulo }))}
          onChange={(v) => onMudar(v)}
          onEscolha={(v) => onEscolher(v)}
          describedBy={descritores}
        />
      );
    case 'escolha_multipla': {
      const escolhidas = Array.isArray(valor) ? (valor as readonly string[]) : [];
      return (
        <fieldset className="min-w-0 border-0 p-0" aria-describedby={descritores}>
          <legend className="sr-only">{p.titulo}</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {p.opcoes.map((o) => {
              const marcada = escolhidas.includes(o.chave);
              return (
                <label
                  key={o.chave}
                  className={cn(
                    'flex min-h-12 cursor-pointer items-center gap-3 border px-4 py-3 text-[0.9375rem] transition-colors duration-300',
                    marcada
                      ? 'border-[color:var(--color-signal-600)] bg-[color:var(--color-signal-600)] text-white'
                      : 'border-[color:var(--border)] hover:border-[color:var(--on-surface)]',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={(e) =>
                      onMudar(
                        e.target.checked
                          ? [...escolhidas, o.chave]
                          : escolhidas.filter((k) => k !== o.chave),
                      )
                    }
                    className="size-4 shrink-0 accent-[color:var(--color-ink-900)]"
                  />
                  {o.rotulo}
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }
    case 'avaliacao':
    case 'nps': {
      const nps = p.tipo === 'nps';
      return (
        <Escala
          obrigatoria={p.obrigatoria}
          invalida={invalida}
          de={nps ? 0 : 1}
          ate={nps ? 10 : 5}
          valor={typeof valor === 'number' ? valor : null}
          idioma={idioma}
          tituloId={tituloId}
          descritores={descritores}
          extremos={
            nps
              ? [t(INQ.npsMin, idioma), t(INQ.npsMax, idioma)]
              : [t(INQ.avaliacaoMin, idioma), t(INQ.avaliacaoMax, idioma)]
          }
          onMudar={(v) => onMudar(v)}
          onEscolher={(v) => onEscolher(v)}
        />
      );
    }
  }
}

/**
 * Escala numérica (avaliação 1–5, NPS 0–10) num radiogroup com roving
 * tabindex — as setas percorrem, o clique ou Enter escolhe e avança. Em
 * linha, para os onze valores do NPS caberem num telemóvel sem 11 linhas.
 */
function Escala({
  obrigatoria,
  invalida,
  de,
  ate,
  valor,
  idioma,
  tituloId,
  descritores,
  extremos,
  onMudar,
  onEscolher,
}: {
  obrigatoria: boolean;
  invalida: boolean;
  de: number;
  ate: number;
  valor: number | null;
  idioma: Idioma;
  tituloId: string;
  descritores: string | undefined;
  extremos: readonly [string, string];
  onMudar: (v: number) => void;
  onEscolher: (v: number) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const valores = Array.from({ length: ate - de + 1 }, (_, i) => de + i);
  const ativo = Math.max(0, valor === null ? 0 : valores.indexOf(valor));
  const extremosId = useId();

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const teclas = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!teclas.includes(e.key)) return;
    e.preventDefault();
    let j = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = Math.min(valores.length - 1, i + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = Math.max(0, i - 1);
    if (e.key === 'Home') j = 0;
    if (e.key === 'End') j = valores.length - 1;
    refs.current[j]?.focus();
    onMudar(valores[j]!);
  }

  return (
    <div>
      <div
        role="radiogroup"
        aria-required={obrigatoria || undefined}
        aria-invalid={invalida || undefined}
        aria-labelledby={tituloId}
        aria-describedby={[extremosId, descritores].filter(Boolean).join(' ')}
        className="flex flex-wrap gap-1.5"
      >
        {valores.map((v, i) => {
          const marcado = v === valor;
          return (
            <button
              key={v}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={marcado}
              aria-label={preencher(INQ.deEscala, idioma, { n: v, max: ate })}
              tabIndex={i === ativo ? 0 : -1}
              onClick={() => {
                onMudar(v);
                onEscolher(v);
              }}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'grid min-h-11 min-w-11 flex-1 place-items-center border font-techno text-base tabular-nums transition-colors duration-300',
                marcado
                  ? 'border-[color:var(--color-signal-600)] bg-[color:var(--color-signal-600)] text-white'
                  : 'border-[color:var(--border)] hover:border-[color:var(--on-surface)]',
              )}
            >
              {v}
            </button>
          );
        })}
      </div>
      <p
        id={extremosId}
        className="mt-2 flex justify-between gap-4 text-[length:var(--text-micro)] text-[color:var(--muted)]"
      >
        <span>{extremos[0]}</span>
        <span className="text-right">{extremos[1]}</span>
      </p>
    </div>
  );
}

function BlocoContacto({
  campos,
  textoConsentimento,
  idioma,
  base,
  valores,
  consentimento,
  erros,
  erroRef,
  onCampo,
  onConsentimento,
}: {
  campos: readonly CampoContacto[];
  textoConsentimento: string;
  idioma: Idioma;
  base: string;
  valores: DadosContacto;
  consentimento: boolean;
  erros: ReadonlySet<string>;
  erroRef: React.RefObject<HTMLDivElement | null>;
  onCampo: (c: CampoContacto, v: string) => void;
  onConsentimento: (v: boolean) => void;
}) {
  const faltaConsentimento = erros.has('contacto.consentimento');
  const primeiroErro = campos.find((c) => erros.has(`contacto.${c}`));

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {campos.map((c) => {
          const id = `${base}-c-${c}`;
          const comErro = erros.has(`contacto.${c}`);
          return (
            <div key={c} className="min-w-0">
              <label htmlFor={id} className="block text-sm font-medium">
                {t(ROTULO_CAMPO[c], idioma)}
              </label>
              <input
                id={id}
                className={cn(inputClass, 'mt-2')}
                {...TIPO_CAMPO[c]}
                maxLength={c === 'email' ? 254 : 160}
                value={valores[c] ?? ''}
                aria-invalid={comErro || undefined}
                aria-describedby={comErro ? `${id}-erro` : undefined}
                onChange={(e) => onCampo(c, e.target.value)}
              />
              {comErro && (
                <div
                  ref={c === primeiroErro ? erroRef : undefined}
                  tabIndex={-1}
                  id={`${id}-erro`}
                  className="mt-1.5 text-sm text-[color:var(--signal)] outline-none"
                >
                  {t(INQ.contactoInvalido, idioma)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={consentimento}
          aria-invalid={faltaConsentimento || undefined}
          aria-describedby={faltaConsentimento ? `${base}-consentimento` : undefined}
          onChange={(e) => onConsentimento(e.target.checked)}
          className="mt-1 size-4 shrink-0"
        />
        <span className="whitespace-pre-line text-[color:var(--muted)]">{textoConsentimento}</span>
      </label>
      {faltaConsentimento && (
        <div
          ref={primeiroErro ? undefined : erroRef}
          tabIndex={-1}
          role="alert"
          id={`${base}-consentimento`}
          className="text-sm text-[color:var(--signal)] outline-none"
        >
          {t(INQ.consentimentoFalta, idioma)}
        </div>
      )}
    </div>
  );
}
