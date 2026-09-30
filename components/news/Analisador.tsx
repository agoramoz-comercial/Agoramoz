'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/form/Field';
import type { Idioma } from '@/content/types';
import { IDIOMAS_DO_MOTOR, NEWS } from '@/content/i18n/news';
import type { Analise } from '@/lib/news/esquema';
import { IDIOMAS_MOTOR, TEXTO_MIN, urlPublica, type IdiomaMotor } from '@/lib/news/pedido';
import { t } from '@/lib/i18n/texto';
import { cn } from '@/lib/utils/cn';
import { Relatorio } from './Relatorio';

/**
 * O analisador: formulário, estado, histórico e relatório.
 *
 * Fala só com `/api/news/analisar` — nunca com o motor. Não pede nome nem
 * e-mail: o original exigia-os antes de mostrar o relatório e gravava-os a
 * partir do browser, sem consentimento registado. Quem quiser falar connosco
 * tem o diagnóstico, que tem consentimento a sério.
 */

const CHAVE_HISTORICO = 'agoramoz:news:historico';
const MAX_HISTORICO = 10;

interface Entrada {
  id: string;
  titulo: string;
  idioma: IdiomaMotor;
  quando: string;
  analise: Analise;
}

/**
 * O que está no `localStorage` pode ter sido escrito por uma versão antiga da
 * página, ou por qualquer pessoa com acesso ao browser. Uma entrada que não
 * tem a forma do modelo actual sai, em vez de partir o relatório.
 */
function entradaValida(e: unknown): e is Entrada {
  const x = e as Partial<Entrada> | null;
  const a = x?.analise as Partial<Analise> | undefined;
  return (
    typeof x?.id === 'string' &&
    typeof x.titulo === 'string' &&
    typeof x.quando === 'string' &&
    IDIOMAS_MOTOR.includes(x.idioma as IdiomaMotor) &&
    typeof a?.titulo?.titulo === 'string' &&
    ['sectores', 'resumo', 'matriz', 'riscos', 'oportunidades', 'cadeias', 'perguntas', 'pontuacoes', 'seccoesEmFalta'].every(
      (k) => Array.isArray((a as Record<string, unknown>)[k]),
    ) &&
    typeof a.recomendacoes === 'object' &&
    a.recomendacoes !== null
  );
}

/** O histórico é uma conveniência: se o browser recusar o armazenamento, a página funciona na mesma. */
function lerHistorico(): Entrada[] {
  try {
    const bruto: unknown = JSON.parse(localStorage.getItem(CHAVE_HISTORICO) ?? '[]');
    return Array.isArray(bruto) ? bruto.filter(entradaValida).slice(0, MAX_HISTORICO) : [];
  } catch {
    return [];
  }
}

function gravarHistorico(h: Entrada[]): void {
  try {
    if (h.length === 0) localStorage.removeItem(CHAVE_HISTORICO);
    else localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(h));
  } catch {
    // Armazenamento recusado ou cheio: o histórico fica só em memória.
  }
}

/**
 * O histórico como loja externa, para `useSyncExternalStore`: o servidor e o
 * primeiro render do cliente veem uma lista vazia (sem desencontro de
 * hidratação), e o browser lê o `localStorage` depois. Outro separador que
 * altere o histórico actualiza este.
 */
const VAZIO: Entrada[] = [];
let cacheHistorico: Entrada[] | null = null;
const ouvintes = new Set<() => void>();

function historicoAtual(): Entrada[] {
  cacheHistorico ??= lerHistorico();
  return cacheHistorico;
}

function subscreverHistorico(avisar: () => void): () => void {
  ouvintes.add(avisar);
  const deOutroSeparador = (e: StorageEvent) => {
    if (e.key !== CHAVE_HISTORICO) return;
    cacheHistorico = null;
    avisar();
  };
  window.addEventListener('storage', deOutroSeparador);
  return () => {
    ouvintes.delete(avisar);
    window.removeEventListener('storage', deOutroSeparador);
  };
}

function definirHistorico(h: Entrada[]): void {
  cacheHistorico = h;
  gravarHistorico(h);
  for (const avisar of ouvintes) avisar();
}

type Estado =
  | { tipo: 'inicial' }
  | { tipo: 'a-analisar' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; analise: Analise };

type ChaveErro = keyof typeof NEWS.erros;

export function Analisador({ idioma }: { idioma: Idioma }) {
  const [modo, setModo] = useState<'url' | 'texto'>('url');
  const [url, setUrl] = useState('');
  const [texto, setTexto] = useState('');
  const [idiomaRelatorio, setIdiomaRelatorio] = useState<IdiomaMotor>(idioma);
  const [erroCampo, setErroCampo] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: 'inicial' });
  const historico = useSyncExternalStore(subscreverHistorico, historicoAtual, () => VAZIO);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const abortar = useRef<AbortController | null>(null);

  useEffect(() => () => abortar.current?.abort(), []);

  // Um relatório novo leva o foco ao seu título: quem usa leitor de ecrã ouve
  // que chegou, e quem usa rato não fica a olhar para o formulário.
  useEffect(() => {
    if (estado.tipo !== 'pronto') return;
    tituloRef.current?.focus({ preventScroll: true });
    tituloRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [estado]);

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroCampo(null);

    if (modo === 'url' && !urlPublica(url.trim())) return setErroCampo(t(NEWS.erroUrl, idioma));
    if (modo === 'texto' && texto.trim().length < TEXTO_MIN) return setErroCampo(t(NEWS.erroTexto, idioma));

    abortar.current?.abort();
    const controlador = new AbortController();
    abortar.current = controlador;
    setEstado({ tipo: 'a-analisar' });

    try {
      const res = await fetch('/api/news/analisar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          modo === 'url'
            ? { modo, url: url.trim(), idioma: idiomaRelatorio }
            : { modo, texto: texto.trim(), idioma: idiomaRelatorio },
        ),
        signal: controlador.signal,
      });

      if (!res.ok) {
        const chave = (String(res.status) in NEWS.erros ? String(res.status) : '502') as ChaveErro;
        return setEstado({ tipo: 'erro', mensagem: t(NEWS.erros[chave], idioma) });
      }

      const corpo = (await res.json()) as { analise?: Analise };
      if (!corpo.analise) return setEstado({ tipo: 'erro', mensagem: t(NEWS.erros[502], idioma) });

      const analise = corpo.analise;
      setEstado({ tipo: 'pronto', analise });

      const entrada: Entrada = {
        id: crypto.randomUUID(),
        titulo: analise.titulo.titulo || url || texto.slice(0, 60),
        idioma: idiomaRelatorio,
        quando: new Date().toISOString(),
        analise,
      };
      definirHistorico([entrada, ...historicoAtual()].slice(0, MAX_HISTORICO));
    } catch (erro) {
      if ((erro as { name?: string }).name === 'AbortError') return;
      setEstado({ tipo: 'erro', mensagem: t(NEWS.erros.rede, idioma) });
    }
  };

  const aAnalisar = estado.tipo === 'a-analisar';

  return (
    <div className="grid gap-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16 print:hidden">
        <form
          onSubmit={submeter}
          noValidate
          aria-busy={aAnalisar}
          className="grid gap-6 border border-[color:var(--border)] p-5 sm:p-8"
        >
          <h2 className="text-[length:var(--text-h3)] font-bold tracking-[var(--tracking-heading)]">
            {t(NEWS.formTitulo, idioma)}
          </h2>

          <fieldset>
            <legend className="text-sm font-medium">{t(NEWS.modoLegenda, idioma)}</legend>
            <div className="mt-2 inline-flex border border-[color:var(--border)]">
              {(['url', 'texto'] as const).map((m) => (
                <label
                  key={m}
                  className={cn(
                    'cursor-pointer px-5 py-2.5 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2',
                    modo === m ? 'bg-[color:var(--on-surface)] text-[color:var(--surface)]' : 'text-[color:var(--muted)]',
                  )}
                >
                  <input
                    type="radio"
                    name="modo"
                    value={m}
                    checked={modo === m}
                    onChange={() => {
                      setModo(m);
                      setErroCampo(null);
                    }}
                    className="sr-only"
                  />
                  {t(m === 'url' ? NEWS.modoUrl : NEWS.modoTexto, idioma)}
                </label>
              ))}
            </div>
          </fieldset>

          {modo === 'url' ? (
            <Field
              label={t(NEWS.rotuloUrl, idioma)}
              hint={t(NEWS.dicaUrl, idioma)}
              error={erroCampo ?? undefined}
              required
              idioma={idioma}
            >
              {({ id, describedBy, invalid }) => (
                <input
                  id={id}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  className={inputClass}
                />
              )}
            </Field>
          ) : (
            <Field
              label={t(NEWS.rotuloTexto, idioma)}
              hint={t(NEWS.dicaTexto, idioma)}
              error={erroCampo ?? undefined}
              required
              idioma={idioma}
            >
              {({ id, describedBy, invalid }) => (
                <textarea
                  id={id}
                  rows={8}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  className={inputClass}
                />
              )}
            </Field>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Field label={t(NEWS.rotuloIdioma, idioma)} required idioma={idioma} className="sm:w-56">
              {({ id }) => (
                <select
                  id={id}
                  value={idiomaRelatorio}
                  onChange={(e) => setIdiomaRelatorio(e.target.value as IdiomaMotor)}
                  className={inputClass}
                >
                  {IDIOMAS_MOTOR.map((i) => (
                    <option key={i} value={i}>
                      {IDIOMAS_DO_MOTOR[i]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Button type="submit" disabled={aAnalisar} className="sm:min-w-44">
              {aAnalisar ? t(NEWS.aAnalisar, idioma) : t(NEWS.analisar, idioma)}
            </Button>
          </div>

          <div role="status" aria-live="polite" className="min-h-6 text-sm">
            {aAnalisar && <p className="text-[color:var(--muted)]">{t(NEWS.aAnalisarDetalhe, idioma)}</p>}
            {estado.tipo === 'erro' && <p className="text-[color:var(--signal)]">{estado.mensagem}</p>}
            {estado.tipo === 'pronto' && <p className="sr-only">{t(NEWS.pronto, idioma)}</p>}
          </div>
        </form>

        <aside aria-labelledby="news-historico">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="news-historico" className="rule-label text-[color:var(--muted)]">
              {t(NEWS.historico, idioma)}
            </h2>
            {historico.length > 0 && (
              <button
                type="button"
                onClick={() => definirHistorico([])}
                className="text-sm underline-offset-4 hover:underline"
              >
                {t(NEWS.limparHistorico, idioma)}
              </button>
            )}
          </div>
          {historico.length > 0 && (
            <ul className="mt-4 grid gap-1" role="list">
              {historico.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => setEstado({ tipo: 'pronto', analise: h.analise })}
                    className="grid w-full gap-0.5 border-t border-[color:var(--border)] py-3 text-left hover:text-[color:var(--muted)]"
                  >
                    <span className="line-clamp-2 text-sm font-medium">{h.titulo}</span>
                    <span className="text-[length:var(--text-micro)] tabular-nums text-[color:var(--muted)]">
                      {new Date(h.quando).toLocaleString(idioma === 'en' ? 'en-GB' : 'pt-PT')} · {h.idioma.toUpperCase()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[length:var(--text-micro)] text-[color:var(--muted)]">{t(NEWS.historicoNota, idioma)}</p>
        </aside>
      </div>

      {estado.tipo === 'pronto' && (
        <div id="news-resultado">
          <Relatorio analise={estado.analise} idioma={idioma} tituloRef={tituloRef} />
        </div>
      )}
    </div>
  );
}
