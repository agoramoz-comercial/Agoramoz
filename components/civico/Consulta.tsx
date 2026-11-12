'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DitherMark } from '@/components/ui/DitherMark';
import { Field, inputClass } from '@/components/form/Field';
import { CIVICO, type TemaCivico } from '@/content/civico';
import {
  CONTEXTO_MAX,
  PERGUNTA_MAX,
  PERGUNTA_MIN,
  TROCAS_MAX,
  dadoPessoalEm,
  limparPergunta,
  ordemAoAssistente,
  type DadoPessoal,
} from '@/lib/civico/limites';
import { normalizar, validarResposta, type Resposta } from '@/lib/civico/resposta';
import { conferir, validarConferencia, validarOficial, type ArtigoOficial, type Conferencia } from '@/lib/civico/conferir';
import { validarVigencia, type Vigencia } from '@/lib/civico/vigencia';
import { SITE } from '@/content/site';
import { cn } from '@/lib/utils/cn';
import { ConferenciaVista, OficialVista, RespostaVista } from './RespostaVista';

/**
 * A consulta cívica: o estado partilhado, o campo da pergunta e a conversa.
 *
 * Fala só com `/api/civico/consulta` — nunca com o motor.
 *
 * A resposta chega em fluxo: a página escreve enquanto o motor escreve, com o
 * mesmo normalizador do servidor (`normalizar`), e troca o texto a meio pela
 * resposta final — a que traz as fontes e a verificação de vigência.
 *
 * **Nada fica guardado no browser.** O News guarda o histórico no
 * `localStorage`; aqui não, de propósito: uma pergunta sobre um despedimento
 * ou uma herança, num telemóvel partilhado ou num cibercafé, não pode estar à
 * espera da pessoa seguinte. A conversa vive na memória deste separador e
 * desaparece ao fechar ou recarregar — e a página di-lo.
 *
 * O estado vive num contexto porque o campo principal está no hero (superfície
 * escura) e a conversa na secção seguinte (clara): são dois sítios da página,
 * uma só conversa.
 */

interface Troca {
  readonly id: string;
  readonly pergunta: string;
  readonly resposta: Resposta;
  /** A verificação de vigência feita no servidor sobre a resposta inteira. */
  readonly vigencia: Vigencia | null;
  /** Os artigos do texto oficial, do nosso corpus. */
  readonly oficial: readonly ArtigoOficial[];
  /** O que o conferidor retirou da resposta. */
  readonly conferencia: Conferencia | null;
}

type Estado =
  | { readonly tipo: 'parado' }
  /** `parcial` é o que o motor já escreveu, enquanto escreve; `oficial` chega antes dele. */
  | { readonly tipo: 'a-perguntar'; readonly pergunta: string; readonly parcial: Resposta | null; readonly oficial: readonly ArtigoOficial[] }
  /** `repetir` é a pergunta que falhou, quando faz sentido tentar a mesma outra vez. */
  | { readonly tipo: 'erro'; readonly mensagem: string; readonly repetir: string | null };

interface Consulta {
  readonly activo: boolean;
  readonly estado: Estado;
  readonly trocas: readonly Troca[];
  readonly aberta: Troca | null;
  /** Envia a pergunta. Devolve a mensagem de erro do campo, ou `null` se seguiu. */
  readonly perguntar: (texto: string) => string | null;
  readonly abrir: (id: string) => void;
  readonly recomecar: () => void;
  readonly regiaoRef: React.RefObject<HTMLDivElement | null>;
  readonly tituloRef: React.RefObject<HTMLHeadingElement | null>;
}

const Contexto = createContext<Consulta | null>(null);

function useConsulta(): Consulta {
  const c = useContext(Contexto);
  if (!c) throw new Error('Os componentes da consulta cívica têm de estar dentro de <ConsultaProvider>.');
  return c;
}

/** `crypto.randomUUID` não existe fora de contexto seguro (http numa rede local). */
function novoId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/** O status HTTP da nossa rota → a mensagem. 500 é serviço, não pergunta. */
function mensagemDoStatus(status: number): string {
  const E = CIVICO.erros;
  const chave = status === 500 ? 503 : status === 415 ? 400 : status;
  return chave in E ? E[chave as keyof typeof E] : E[502];
}

function ehDado(v: unknown): v is DadoPessoal {
  return v === 'email' || v === 'numero';
}

function movimentoReduzido(): boolean {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.motion === 'reduced'
  );
}

const abortado = (erro: unknown) => (erro as { name?: string }).name === 'AbortError';

/** Um evento do fluxo da NOSSA rota (ver `app/api/civico/consulta/route.ts`). */
type Evento =
  | { readonly t: 'inicio'; readonly oficial: unknown }
  | { readonly t: 'd'; readonly v: string }
  | { readonly t: 'fim'; readonly resposta: unknown; readonly vigencia: unknown; readonly conferencia: unknown; readonly oficial: unknown }
  | { readonly t: 'erro'; readonly status: number };

/** Lê o fluxo linha a linha e entrega cada evento. Uma linha partida é ignorada. */
async function lerEventos(res: Response, aoEvento: (e: Evento) => void): Promise<void> {
  if (!res.body) return;
  const leitor = res.body.getReader();
  const descodificar = new TextDecoder();
  let pendente = '';
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    pendente += descodificar.decode(value, { stream: true });
    const linhas = pendente.split('\n');
    pendente = linhas.pop() ?? '';
    for (const linha of linhas) {
      if (!linha.startsWith('data: ')) continue;
      try {
        aoEvento(JSON.parse(linha.slice(6)) as Evento);
      } catch {
        // Segue para a linha seguinte.
      }
    }
  }
}

/** De quanto em quanto tempo a resposta parcial é redesenhada. Mais depressa não se lê melhor. */
const RITMO_MS = 70;

export function ConsultaProvider({ activo, children }: { activo: boolean; children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'parado' });
  const [trocas, setTrocas] = useState<readonly Troca[]>([]);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const abortar = useRef<AbortController | null>(null);
  const regiaoRef = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  // Só se desliza até à resposta quando a pessoa a escolhe na lista: no fim de
  // um fluxo ela já está a lê-la, e puxá-la para o topo tirava-lhe o sítio.
  const deslizar = useRef(false);
  // As trocas lidas dentro de `perguntar` sem o recriar a cada resposta.
  const trocasRef = useRef(trocas);
  useEffect(() => {
    trocasRef.current = trocas;
  }, [trocas]);

  useEffect(() => () => abortar.current?.abort(), []);

  // Uma resposta pronta leva o foco ao seu título: quem usa leitor de ecrã ouve
  // que chegou. O foco não desliza a página; só `abrir` o pede.
  useEffect(() => {
    if (!abertaId) return;
    const titulo = tituloRef.current;
    titulo?.focus({ preventScroll: true });
    if (!deslizar.current) return;
    deslizar.current = false;
    // O artigo inteiro, e não o título: o rótulo «Pergunta» fica por cima dele e
    // ficaria escondido atrás do cabeçalho fixo.
    (titulo?.closest('article') ?? titulo)?.scrollIntoView({
      behavior: movimentoReduzido() ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [abertaId]);

  const enviar = useCallback(async (pergunta: string) => {
    abortar.current?.abort();
    const controlador = new AbortController();
    abortar.current = controlador;
    setEstado({ tipo: 'a-perguntar', pergunta, parcial: null, oficial: [] });
    // Quem perguntou lá em cima vê logo que a pergunta seguiu.
    requestAnimationFrame(() =>
      regiaoRef.current?.scrollIntoView({ behavior: movimentoReduzido() ? 'auto' : 'smooth', block: 'start' }),
    );

    const historico = trocasRef.current.slice(-TROCAS_MAX).map((t) => ({
      pergunta: t.pergunta,
      resposta: t.resposta.texto.slice(0, CONTEXTO_MAX),
    }));

    let res: Response;
    try {
      res = await fetch('/api/civico/consulta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pergunta, historico }),
        signal: controlador.signal,
      });
    } catch (erro) {
      if (abortado(erro)) return;
      return setEstado({ tipo: 'erro', mensagem: CIVICO.erros.rede, repetir: pergunta });
    }

    // Tudo o que a rota sabe antes de o motor escrever vem em JSON, com o status.
    if (!res.ok) {
      let corpo: { dado?: unknown; motivo?: unknown } = {};
      try {
        corpo = (await res.json()) as typeof corpo;
      } catch (erro) {
        if (abortado(erro)) return;
      }
      if (res.status === 422 && corpo.motivo === 'ambito') {
        return setEstado({ tipo: 'erro', mensagem: CIVICO.erroAmbito, repetir: null });
      }
      if (res.status === 422 && ehDado(corpo.dado)) {
        return setEstado({ tipo: 'erro', mensagem: CIVICO.erroDado[corpo.dado], repetir: null });
      }
      // Um pedido recusado (4xx) falharia igual à segunda; uma falha do serviço pode passar.
      return setEstado({ tipo: 'erro', mensagem: mensagemDoStatus(res.status), repetir: res.status >= 500 ? pergunta : null });
    }

    // A partir daqui é o fluxo: pedaços de texto, e no fim a resposta inteira.
    let markdown = '';
    let desenhado = 0;
    let oficial: readonly ArtigoOficial[] = [];
    let artigos: ReadonlySet<number> = new Set();
    let final: Troca | null = null;
    let falha: number | null = null;
    try {
      await lerEventos(res, (e) => {
        if (e.t === 'inicio' && validarOficial(e.oficial)) {
          // O texto da lei chega primeiro, do nosso corpus: lê-se enquanto a explicação é escrita.
          oficial = e.oficial;
          artigos = new Set(oficial.map((a) => a.n));
          setEstado({ tipo: 'a-perguntar', pergunta, parcial: null, oficial });
        } else if (e.t === 'd' && typeof e.v === 'string') {
          markdown += e.v;
          const agora = performance.now();
          if (agora - desenhado < RITMO_MS) return;
          desenhado = agora;
          // O mesmo normalizador e o mesmo conferidor do servidor. A meio da
          // escrita nenhuma citação está conferida — por isso nenhuma aparece;
          // a resposta final repõe as que constam do texto oficial.
          const bruto = normalizar(markdown);
          const parcial = bruto ? conferir(bruto, { artigos, citacaoConferida: () => false, pergunta }).resposta : null;
          setEstado({ tipo: 'a-perguntar', pergunta, parcial, oficial });
        } else if (e.t === 'fim' && validarResposta(e.resposta)) {
          final = {
            id: novoId(),
            pergunta,
            resposta: e.resposta,
            vigencia: validarVigencia(e.vigencia) ? e.vigencia : null,
            oficial: validarOficial(e.oficial) ? e.oficial : oficial,
            conferencia: validarConferencia(e.conferencia) ? e.conferencia : null,
          };
        } else if (e.t === 'erro') {
          falha = typeof e.status === 'number' ? e.status : 502;
        }
      });
    } catch (erro) {
      if (abortado(erro)) return;
      return setEstado({ tipo: 'erro', mensagem: CIVICO.erros.rede, repetir: pergunta });
    }
    if (controlador.signal.aborted) return;

    // Um fluxo que acaba sem o `fim` (ligação cortada, proxy) é falha do
    // serviço: o texto a meio não fica no ecrã a fazer de resposta.
    const troca = final as Troca | null;
    if (!troca) {
      return setEstado({ tipo: 'erro', mensagem: mensagemDoStatus(falha ?? 502), repetir: pergunta });
    }
    setTrocas((t) => [...t, troca]);
    setAbertaId(troca.id);
    setEstado({ tipo: 'parado' });
  }, []);

  const perguntar = useCallback(
    (texto: string): string | null => {
      if (!activo) return CIVICO.desligado;
      const pergunta = limparPergunta(texto);
      if (pergunta.length < PERGUNTA_MIN) return CIVICO.erroCurta;
      if (pergunta.length > PERGUNTA_MAX) return CIVICO.erroLonga;
      const dado = dadoPessoalEm(pergunta);
      if (dado) return CIVICO.erroDado[dado];
      if (ordemAoAssistente(pergunta)) return CIVICO.erroAmbito;
      void enviar(pergunta);
      return null;
    },
    [activo, enviar],
  );

  const abrir = useCallback((id: string) => {
    // Uma resposta em curso, ao chegar, taparia a que a pessoa escolheu abrir.
    abortar.current?.abort();
    deslizar.current = true;
    setEstado({ tipo: 'parado' });
    setAbertaId(id);
  }, []);

  const recomecar = useCallback(() => {
    abortar.current?.abort();
    setTrocas([]);
    setAbertaId(null);
    setEstado({ tipo: 'parado' });
  }, []);

  const valor = useMemo<Consulta>(
    () => ({
      activo,
      estado,
      trocas,
      aberta: trocas.find((t) => t.id === abertaId) ?? null,
      perguntar,
      abrir,
      recomecar,
      regiaoRef,
      tituloRef,
    }),
    [activo, estado, trocas, abertaId, perguntar, abrir, recomecar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/* -------------------------------------------------------------- compositor */

/**
 * O campo da pergunta. Existe em dois sítios — no hero e por baixo de cada
 * resposta — com o texto próprio de cada um e o mesmo destino.
 */
/** A primeira pergunta de cada tema. */
const EXEMPLOS = CIVICO.temas.map((t) => t.perguntas[0]);

export function Compositor({ variante = 'principal', className }: { variante?: 'principal' | 'seguimento'; className?: string }) {
  const { activo, estado, perguntar } = useConsulta();
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const ocupado = estado.tipo === 'a-perguntar';
  const principal = variante === 'principal';
  const restam = PERGUNTA_MAX - texto.length;

  // No campo principal, uma pergunta de exemplo que vai rodando. É exemplo,
  // não rótulo (o rótulo é real, por cima). Com movimento reduzido, fica a primeira.
  const [exemplo, setExemplo] = useState(0);
  useEffect(() => {
    if (!principal || !activo || movimentoReduzido()) return;
    const t = setInterval(() => setExemplo((i) => (i + 1) % EXEMPLOS.length), 3800);
    return () => clearInterval(t);
  }, [principal, activo]);

  const submeter = () => {
    if (ocupado) return;
    const recusa = perguntar(texto);
    if (recusa) {
      setErro(recusa);
      // O erro do campo é anunciado pela região viva do `Field`; o foco volta ao campo.
      requestAnimationFrame(() => campoRef.current?.focus());
      return;
    }
    setErro(null);
    setTexto('');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submeter();
      }}
      noValidate
      aria-busy={ocupado}
      className={cn('grid gap-5', className)}
    >
      <Field
        label={principal ? CIVICO.rotuloPergunta : CIVICO.rotuloSeguimento}
        hint={principal ? CIVICO.dicaPergunta : CIVICO.dicaSeguimento}
        error={erro ?? undefined}
        required
      >
        {({ id, describedBy, invalid }) => (
          <textarea
            ref={campoRef}
            id={id}
            rows={principal ? 3 : 2}
            maxLength={PERGUNTA_MAX}
            placeholder={principal && activo ? CIVICO.exemplo.replace('{p}', EXEMPLOS[exemplo]!) : undefined}
            value={texto}
            disabled={!activo}
            onChange={(e) => {
              setTexto(e.target.value);
              if (erro) setErro(null);
            }}
            onKeyDown={(e) => {
              // Enter envia; Shift+Enter (e a composição de acentos) não.
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submeter();
              }
            }}
            enterKeyHint="send"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            aria-required
            className={cn(inputClass, 'resize-y text-base disabled:cursor-not-allowed disabled:opacity-50')}
          />
        )}
      </Field>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={cn(
            'font-techno text-[length:var(--text-micro)] tracking-[0.08em] tabular-nums',
            restam <= 40 ? 'text-[color:var(--on-surface)]' : 'text-[color:var(--muted)]',
          )}
        >
          {activo ? CIVICO.contador.replace('{n}', String(Math.max(0, restam))) : CIVICO.desligado}
        </p>
        <Button type="submit" size={principal ? 'lg' : 'md'} disabled={!activo || ocupado} className="sm:min-w-48">
          {ocupado ? CIVICO.aPerguntar : CIVICO.perguntar}
          {!ocupado && (
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------- conversa */

function Temas() {
  const { activo, estado, perguntar } = useConsulta();
  const ocupado = estado.tipo === 'a-perguntar';

  return (
    <section aria-labelledby="h-civico-temas">
      <div className="rule flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3 pt-6">
        <div>
          <p className="flex items-center gap-2.5">
            <DitherMark size="sm" />
            <span className="rule-label text-[color:var(--accent)]">{CIVICO.temasEyebrow}</span>
          </p>
          <h2
            id="h-civico-temas"
            className="mt-5 max-w-[22ch] text-[length:var(--text-h2)] tracking-[var(--tracking-heading)]"
          >
            {CIVICO.temasTitulo}
          </h2>
        </div>
        <p className="max-w-[32ch] text-sm text-[color:var(--muted)]">{CIVICO.temasNota}</p>
      </div>

      <ul className="mt-12 grid gap-px bg-[color:var(--border)] sm:grid-cols-2 lg:grid-cols-3" role="list">
        {CIVICO.temas.map((tema: TemaCivico, i) => (
          <li key={tema.id} className="bg-[color:var(--surface)] p-6 sm:p-8">
            <div className="flex items-baseline gap-4">
              <span aria-hidden className="numeral chrome-text text-[1.75rem]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="text-xl font-bold tracking-[var(--tracking-heading)]">{tema.nome}</h3>
            </div>
            <ul className="mt-5" role="list">
              {tema.perguntas.map((p) => (
                <li key={p} className="border-t border-dashed border-[color:var(--hairline)]">
                  <button
                    type="button"
                    disabled={!activo || ocupado}
                    onClick={() => perguntar(p)}
                    className="group flex min-h-12 w-full items-center justify-between gap-4 py-3 text-left text-[0.9375rem] transition-colors hover:text-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>{p}</span>
                    <span aria-hidden className="shrink-0 transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** O fio de espera: a altura é fixa, por isso não há salto de layout quando o texto começa. */
function Fio() {
  return (
    <div aria-hidden className="relative h-0.5 overflow-hidden bg-[color:var(--hairline)]">
      <div
        className="chrome-wire absolute inset-y-0 left-0 w-1/3"
        style={{ background: 'linear-gradient(90deg, transparent, var(--on-surface), transparent)' }}
      />
    </div>
  );
}

function textoParaCopiar(t: Troca): string {
  const fontes = t.resposta.fontes.map((f) => `[${f.n}] ${f.titulo} — ${f.href}`);
  const alertas = (t.vigencia?.alertas ?? [])
    .filter((a) => a.tipo === 'revogado')
    .map((a) => `${CIVICO.vigenciaRevogadoTitulo}: ${a.revogado}. ${CIVICO.vigenciaSubstituto}: ${a.substituto}.`);
  return [
    `${CIVICO.perguntaRotulo}: ${t.pergunta}`,
    ...alertas,
    t.resposta.texto,
    fontes.length ? `${CIVICO.fontesTitulo}:\n${fontes.join('\n')}` : CIVICO.semFonte,
    CIVICO.avisoResposta,
  ].join('\n\n');
}

/** O WhatsApp corta mensagens muito longas: vai o princípio da resposta e a ligação para a página. */
const MAX_WHATSAPP = 1_200;

function ligacaoWhatsApp(t: Troca): string {
  const corpo = t.resposta.texto.length > MAX_WHATSAPP ? `${t.resposta.texto.slice(0, MAX_WHATSAPP).trimEnd()}…` : t.resposta.texto;
  const texto = [`*${t.pergunta}*`, corpo, CIVICO.avisoResposta, `${SITE.url}/civico`].join('\n\n');
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

function Copiar({ troca }: { troca: Troca }) {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(t);
  }, [copiado]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(textoParaCopiar(troca));
          setCopiado(true);
        } catch {
          // Sem permissão para a área de transferência: o texto continua seleccionável.
        }
      }}
    >
      <span aria-live="polite">{copiado ? CIVICO.copiado : CIVICO.copiar}</span>
    </Button>
  );
}

/**
 * A resposta, a ser escrita ou já pronta. É o MESMO artigo nos dois momentos:
 * o título e o corpo não mudam de sítio quando o fluxo acaba — só chegam, por
 * baixo, as ligações, os diplomas e as acções.
 */
function Artigo({
  pergunta,
  resposta,
  oficial,
  troca,
  tituloRef,
}: {
  pergunta: string;
  /** `null` enquanto o motor ainda não escreveu nada. */
  resposta: Resposta | null;
  /** Os artigos do texto oficial: chegam antes da explicação. */
  oficial: readonly ArtigoOficial[];
  /** Só na resposta pronta. */
  troca: Troca | null;
  tituloRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const aEscrever = !troca;
  return (
    <article
      data-civico-imprimir={troca ? '' : undefined}
      aria-labelledby="civico-resposta"
      aria-busy={aEscrever}
      className="scroll-mt-28 border border-[color:var(--border)]"
    >
      <header className="border-b border-[color:var(--border)] p-5 sm:p-8">
        <p className="rule-label text-[color:var(--muted)]">{CIVICO.perguntaRotulo}</p>
        <h2
          id="civico-resposta"
          ref={tituloRef}
          tabIndex={-1}
          className="mt-3 max-w-[40ch] text-[length:var(--text-h3)] tracking-[var(--tracking-heading)]"
        >
          {pergunta}
        </h2>
      </header>

      <OficialVista oficial={oficial} />

      <div className="p-5 sm:p-8">
        <p className="rule-label mb-6 flex items-center gap-2.5 text-[color:var(--accent)]">
          <DitherMark size="sm" />
          {/* Com o texto da lei por cima, o que vem a seguir tem de dizer o que é. */}
          {oficial.length > 0 ? CIVICO.iaEyebrow : CIVICO.respostaEyebrow}
        </p>
        {troca?.conferencia && <ConferenciaVista conferencia={troca.conferencia} />}
        {aEscrever && (
          <div className="mb-6">
            <Fio />
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              {resposta ? CIVICO.aEscrever : CIVICO.aPerguntarDetalhe}
            </p>
          </div>
        )}
        {resposta && <RespostaVista resposta={resposta} vigencia={troca?.vigencia} aEscrever={aEscrever} />}
      </div>

      {troca && (
        <footer className="grid gap-5 border-t border-[color:var(--border)] bg-[color:var(--surface-raised)] p-5 sm:p-8">
          <p className="max-w-[70ch] text-sm text-[color:var(--muted)]">{CIVICO.avisoResposta}</p>
          <div className="flex flex-wrap gap-3 print:hidden">
            <Button asChild variant="solid" size="sm">
              <a href={ligacaoWhatsApp(troca)} target="_blank" rel="noopener noreferrer">
                {CIVICO.whatsapp}
                <span className="sr-only"> {CIVICO.abreNoutroSeparador}</span>
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              {CIVICO.imprimir}
            </Button>
            <Copiar troca={troca} />
          </div>
        </footer>
      )}
    </article>
  );
}

/**
 * A conversa: a resposta aberta, o seguimento, a lista do que já se perguntou
 * e os temas. Sem nenhuma pergunta feita, os temas são a página.
 */
export function Conversa() {
  const { estado, trocas, aberta, perguntar, abrir, recomecar, regiaoRef, tituloRef } = useConsulta();
  const aPerguntar = estado.tipo === 'a-perguntar';
  const emUso = aPerguntar || trocas.length > 0 || estado.tipo === 'erro';

  return (
    <div ref={regiaoRef} className="grid scroll-mt-28 gap-20">
      {/* Sempre montada: uma região viva que nasce já com texto não é anunciada.
          Diz os três momentos — nunca o texto a meio, que seria lido aos soluços. */}
      <div role="status" aria-live="polite" className="sr-only">
        {aPerguntar && (estado.parcial ? CIVICO.aEscrever : CIVICO.aPerguntarDetalhe)}
        {estado.tipo === 'parado' && aberta && CIVICO.pronta}
      </div>

      {emUso && (
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16 print:block">
          <div className="min-w-0">
            {estado.tipo === 'erro' && (
              <div role="alert" className="mb-8 flex flex-wrap items-center justify-between gap-4 border border-[color:var(--signal)] p-4 print:hidden">
                <p className="text-sm font-medium text-[color:var(--signal)]">{estado.mensagem}</p>
                {estado.repetir && (
                  <Button type="button" variant="outline" size="sm" onClick={() => perguntar(estado.repetir!)}>
                    {CIVICO.tentarDeNovo}
                  </Button>
                )}
              </div>
            )}

            {aPerguntar ? (
              <Artigo pergunta={estado.pergunta} resposta={estado.parcial} oficial={estado.oficial} troca={null} tituloRef={tituloRef} />
            ) : (
              aberta && (
                // A chave por troca repõe o estado interno (o «Copiado») a cada resposta.
                <Artigo
                  key={aberta.id}
                  pergunta={aberta.pergunta}
                  resposta={aberta.resposta}
                  oficial={aberta.oficial}
                  troca={aberta}
                  tituloRef={tituloRef}
                />
              )
            )}

            {!aPerguntar && trocas.length > 0 && <Compositor variante="seguimento" className="mt-10 print:hidden" />}
          </div>

          <aside aria-labelledby="civico-anteriores" className="print:hidden">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="civico-anteriores" className="rule-label text-[color:var(--muted)]">
                {CIVICO.anterioresTitulo}
              </h2>
              {trocas.length > 0 && (
                <button
                  type="button"
                  onClick={recomecar}
                  aria-label={CIVICO.novaConversaAria}
                  className="inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline"
                >
                  {CIVICO.novaConversa}
                </button>
              )}
            </div>
            {trocas.length > 0 ? (
              <ol className="mt-2" role="list">
                {trocas.map((t, i) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => abrir(t.id)}
                      aria-current={aberta?.id === t.id && !aPerguntar ? 'true' : undefined}
                      className="grid w-full grid-cols-[1.75rem_minmax(0,1fr)] items-baseline gap-x-2 border-t border-[color:var(--border)] py-3.5 text-left text-[color:var(--muted)] transition-colors hover:text-[color:var(--on-surface)] aria-[current=true]:text-[color:var(--on-surface)]"
                    >
                      <span aria-hidden className="font-techno text-[length:var(--text-micro)] tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="line-clamp-3 text-sm font-medium">{t.pergunta}</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--muted)]">{CIVICO.anterioresVazio}</p>
            )}
            <p className="mt-4 border-t border-[color:var(--border)] pt-4 text-[length:var(--text-micro)] text-[color:var(--muted)]">
              {CIVICO.anterioresNota}
            </p>
          </aside>
        </div>
      )}

      <div className="print:hidden">
        <Temas />
      </div>
    </div>
  );
}
