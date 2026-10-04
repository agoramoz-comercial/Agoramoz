'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2, X } from 'lucide-react';
import { SurveyRenderer } from '@/components/inqueritos/SurveyRenderer';
import { Button } from '@/components/ui/Button';
import {
  NOME_DO_TIPO,
  TIPOS,
  acrescentar,
  apagar,
  duplicar,
  errosLegiveis,
  mover,
  mudarTipo,
  novaOpcao,
  semCondicao,
} from '@/lib/inqueritos/construtor';
import {
  CAMPOS_CONTACTO,
  LIMITES,
  specInquerito,
  valoresDeCondicao,
  type CampoContacto,
  type Pergunta,
  type SpecInquerito,
  type TipoPergunta,
} from '@/lib/inqueritos/spec';
import { cn } from '@/lib/utils/cn';

/**
 * O construtor de inquéritos — a excepção deliberada ao «admin sem estado de
 * cliente» (docs/INQUERITOS.md): editar perguntas, opções e condições com
 * uma ida ao servidor por tecla seria inutilizável. O estado vive aqui até
 * «Guardar»; depois, a Server Action valida tudo de novo e só as funções da
 * 0013 escrevem.
 *
 * A pré-visualização é o mesmo componente que quem responde vê.
 */

const CONSENTIMENTO_INICIAL: Record<SpecInquerito['idioma'], string> = {
  pt: 'Aceito que a AGORAMOZ use estes dados para me contactar sobre esta resposta.',
  en: 'I agree that AGORAMOZ may use these details to contact me about this response.',
};

const NOME_CAMPO: Record<CampoContacto, string> = {
  nome: 'Nome',
  email: 'Email',
  telefone: 'Telefone',
  organizacao: 'Organização',
};

const campo =
  'w-full min-h-11 rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--on-surface)]';
const rotulo = 'block text-xs font-medium text-[color:var(--muted)]';
const iconeBotao =
  'grid size-11 place-items-center rounded-[--radius-xs] text-[color:var(--muted)] hover:bg-[color:var(--surface-raised)] hover:text-[color:var(--on-surface)] disabled:opacity-30 disabled:hover:bg-transparent';

export interface PropsConstrutor {
  readonly id: string;
  readonly nomeInicial: string;
  readonly specInicial: SpecInquerito;
  /** Há um rascunho guardado e ainda não publicado. */
  readonly temRascunho: boolean;
  readonly guardar: (formData: FormData) => Promise<void>;
}

export function Construtor({
  id,
  nomeInicial,
  specInicial,
  temRascunho,
  guardar,
}: PropsConstrutor) {
  const base = useId();
  const [nome, setNome] = useState(nomeInicial);
  const [spec, setSpec] = useState<SpecInquerito>(specInicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const [tipoNovo, setTipoNovo] = useState<TipoPergunta>('escolha_unica');
  const aSubmeter = useRef(false);

  const validacao = useMemo(() => specInquerito.safeParse(spec), [spec]);
  const erros = useMemo(
    () => (validacao.success ? [] : errosLegiveis(spec, validacao.error.issues)),
    [spec, validacao],
  );

  // A pré-visualização mostra a última versão sem problemas: enquanto se
  // escreve um título, o inquérito passa por estados inválidos, e a prévia
  // não deve piscar. Ajuste de estado durante o render — o padrão do React
  // para «estado derivado com memória».
  const [previa, setPrevia] = useState<SpecInquerito>(specInicial);
  if (validacao.success && validacao.data !== previa) setPrevia(validacao.data);

  const inicial = useMemo(() => JSON.stringify(specInicial), [specInicial]);
  const sujo = nome !== nomeInicial || JSON.stringify(spec) !== inicial;
  const valido = validacao.success && nome.trim().length > 0;

  // Sair com alterações por guardar pede confirmação ao browser.
  useEffect(() => {
    if (!sujo) return;
    const antes = (e: BeforeUnloadEvent) => {
      if (aSubmeter.current) return;
      e.preventDefault();
    };
    window.addEventListener('beforeunload', antes);
    return () => window.removeEventListener('beforeunload', antes);
  }, [sujo]);

  function alterar(patch: Partial<SpecInquerito>) {
    setSpec((s) => ({ ...s, ...patch }));
  }

  function alterarPergunta(i: number, f: (p: Pergunta) => Pergunta) {
    setSpec((s) => ({ ...s, perguntas: s.perguntas.map((p, j) => (j === i ? f(p) : p)) }));
  }

  function definirPerguntas(perguntas: Pergunta[]) {
    setSpec((s) => ({ ...s, perguntas }));
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="min-w-0 space-y-8">
        <form
          action={guardar}
          onSubmit={() => {
            aSubmeter.current = true;
          }}
          className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] bg-[color:var(--surface)] px-1 py-3"
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="nome" value={nome} />
          <input type="hidden" name="spec" value={JSON.stringify(spec)} />
          <p className="text-sm text-[color:var(--muted)]" aria-live="polite">
            {erros.length > 0
              ? `${erros.length} ${erros.length === 1 ? 'problema' : 'problemas'} por corrigir`
              : sujo
                ? 'Alterações por guardar'
                : temRascunho
                  ? 'Rascunho guardado, por publicar'
                  : 'Sem alterações'}
          </p>
          <Botoes podeGuardar={valido && sujo} podePublicar={valido && (sujo || temRascunho)} />
        </form>

        {aviso && (
          <p
            role="status"
            className="flex items-start justify-between gap-3 border border-[color:var(--border)] px-4 py-3 text-sm"
          >
            {aviso}
            <button
              type="button"
              onClick={() => setAviso(null)}
              className="min-h-11 text-[color:var(--muted)] underline"
            >
              Fechar
            </button>
          </p>
        )}

        {erros.length > 0 && (
          <div className="border border-[color:var(--color-signal-700)] px-4 py-3">
            <p className="text-sm font-medium">Por corrigir antes de guardar</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--muted)]">
              {erros.map((e) => (
                <li key={e.texto}>{e.texto}</li>
              ))}
            </ul>
          </div>
        )}

        <Seccao titulo="Geral">
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <div>
              <label htmlFor={`${base}-nome`} className={rotulo}>
                Nome interno (só a equipa vê)
              </label>
              <input
                id={`${base}-nome`}
                className={cn(campo, 'mt-1.5')}
                value={nome}
                maxLength={160}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={`${base}-idioma`} className={rotulo}>
                Idioma de quem responde
              </label>
              <select
                id={`${base}-idioma`}
                className={cn(campo, 'mt-1.5')}
                value={spec.idioma}
                onChange={(e) => alterar({ idioma: e.target.value === 'en' ? 'en' : 'pt' })}
              >
                <option value="pt">Português</option>
                <option value="en">Inglês</option>
              </select>
            </div>
          </div>
        </Seccao>

        <Seccao titulo="Boas-vindas">
          <Ecra
            base={`${base}-bv`}
            titulo={spec.boasVindas.titulo}
            corpo={spec.boasVindas.corpo ?? ''}
            onTitulo={(titulo) => alterar({ boasVindas: { ...spec.boasVindas, titulo } })}
            onCorpo={(corpo) =>
              alterar({ boasVindas: { ...spec.boasVindas, corpo: corpo || undefined } })
            }
          />
        </Seccao>

        <Seccao titulo={`Perguntas (${spec.perguntas.length} de ${LIMITES.perguntas})`}>
          <ol className="space-y-4">
            {spec.perguntas.map((p, i) => (
              <li key={p.chave}>
                <EditorPergunta
                  base={`${base}-${p.chave}`}
                  pergunta={p}
                  indice={i}
                  total={spec.perguntas.length}
                  anteriores={spec.perguntas.slice(0, i)}
                  idioma={spec.idioma}
                  erros={erros.filter((e) => e.pergunta === i).map((e) => e.texto)}
                  onAlterar={(f) => alterarPergunta(i, f)}
                  onMover={(delta) => definirPerguntas(mover(spec.perguntas, i, delta))}
                  onDuplicar={() => definirPerguntas(duplicar(spec.perguntas, i))}
                  onApagar={() => {
                    const r = apagar(spec.perguntas, i);
                    definirPerguntas(r.perguntas);
                    setAviso(
                      r.condicoesRetiradas > 0
                        ? `Pergunta apagada. ${r.condicoesRetiradas} ${
                            r.condicoesRetiradas === 1
                              ? 'condição que dependia dela foi retirada'
                              : 'condições que dependiam dela foram retiradas'
                          }.`
                        : 'Pergunta apagada.',
                    );
                  }}
                />
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor={`${base}-tipo-novo`} className={rotulo}>
                Tipo da pergunta nova
              </label>
              <select
                id={`${base}-tipo-novo`}
                className={cn(campo, 'mt-1.5 w-56')}
                value={tipoNovo}
                onChange={(e) => setTipoNovo(e.target.value as TipoPergunta)}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {NOME_DO_TIPO[t]}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={spec.perguntas.length >= LIMITES.perguntas}
              onClick={() => definirPerguntas(acrescentar(spec.perguntas, tipoNovo, spec.idioma))}
            >
              <Plus aria-hidden className="size-4" />
              Acrescentar pergunta
            </Button>
          </div>
        </Seccao>

        <Seccao titulo="Contacto no fim">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={Boolean(spec.contacto)}
              onChange={(e) =>
                alterar({
                  contacto: e.target.checked
                    ? {
                        campos: ['nome', 'email'],
                        textoConsentimento: CONSENTIMENTO_INICIAL[spec.idioma],
                      }
                    : undefined,
                })
              }
            />
            <span>
              Oferecer um cartão final para quem quiser deixar contacto.
              <span className="block text-xs text-[color:var(--muted)]">
                É sempre opcional para quem responde. Sem contacto, a resposta não identifica
                ninguém. Com email e consentimento, entra no CRM como contacto — nunca como
                oportunidade.
              </span>
            </span>
          </label>

          {spec.contacto && (
            <div className="mt-4 space-y-4">
              <fieldset>
                <legend className={rotulo}>Campos a oferecer</legend>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                  {CAMPOS_CONTACTO.map((c) => (
                    <label key={c} className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={spec.contacto!.campos.includes(c)}
                        onChange={(e) => {
                          const atual = spec.contacto!.campos;
                          const campos = e.target.checked
                            ? CAMPOS_CONTACTO.filter((x) => x === c || atual.includes(x))
                            : atual.filter((x) => x !== c);
                          alterar({ contacto: { ...spec.contacto!, campos } });
                        }}
                      />
                      {NOME_CAMPO[c]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor={`${base}-consentimento`} className={rotulo}>
                  Texto do consentimento — é exactamente isto que fica registado
                </label>
                <textarea
                  id={`${base}-consentimento`}
                  rows={3}
                  className={cn(campo, 'mt-1.5')}
                  maxLength={LIMITES.consentimento}
                  value={spec.contacto.textoConsentimento}
                  onChange={(e) =>
                    alterar({
                      contacto: { ...spec.contacto!, textoConsentimento: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          )}
        </Seccao>

        <Seccao titulo="Agradecimento">
          <Ecra
            base={`${base}-ag`}
            titulo={spec.agradecimento.titulo}
            corpo={spec.agradecimento.corpo ?? ''}
            onTitulo={(titulo) => alterar({ agradecimento: { ...spec.agradecimento, titulo } })}
            onCorpo={(corpo) =>
              alterar({ agradecimento: { ...spec.agradecimento, corpo: corpo || undefined } })
            }
          />
        </Seccao>
      </div>

      <aside aria-labelledby={`${base}-previa`} className="min-w-0">
        <div className="xl:sticky xl:top-4">
          <h2 id={`${base}-previa`} className="mb-3 text-sm font-medium">
            Pré-visualização
          </h2>
          {!validacao.success && (
            <p className="mb-3 text-xs text-[color:var(--muted)]">
              Mostra a última versão sem problemas.
            </p>
          )}
          <div
            data-surface="deep"
            className="bg-[color:var(--surface)] p-4 text-[color:var(--on-surface)]"
          >
            <p className="mb-4 text-[length:var(--text-lead)] font-bold text-balance">
              {previa.boasVindas.titulo}
            </p>
            <SurveyRenderer modo="previa" spec={previa} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Botoes({ podeGuardar, podePublicar }: { podeGuardar: boolean; podePublicar: boolean }) {
  const { pending, data } = useFormStatus();
  const intencao = data?.get('intencao');
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="submit"
        name="intencao"
        value="guardar"
        variant="outline"
        size="sm"
        disabled={pending || !podeGuardar}
      >
        {pending && intencao === 'guardar' ? 'A guardar…' : 'Guardar rascunho'}
      </Button>
      <Button
        type="submit"
        name="intencao"
        value="publicar"
        size="sm"
        disabled={pending || !podePublicar}
      >
        {pending && intencao === 'publicar' ? 'A publicar…' : 'Publicar'}
      </Button>
    </div>
  );
}

function Seccao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 text-sm font-medium">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Ecra({
  base,
  titulo,
  corpo,
  onTitulo,
  onCorpo,
}: {
  base: string;
  titulo: string;
  corpo: string;
  onTitulo: (v: string) => void;
  onCorpo: (v: string) => void;
}) {
  return (
    <div className="space-y-3 border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-4">
      <div>
        <label htmlFor={`${base}-titulo`} className={rotulo}>
          Título
        </label>
        <input
          id={`${base}-titulo`}
          className={cn(campo, 'mt-1.5')}
          maxLength={LIMITES.ecraTitulo}
          value={titulo}
          onChange={(e) => onTitulo(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor={`${base}-corpo`} className={rotulo}>
          Texto (opcional)
        </label>
        <textarea
          id={`${base}-corpo`}
          rows={2}
          className={cn(campo, 'mt-1.5')}
          maxLength={LIMITES.ecraCorpo}
          value={corpo}
          onChange={(e) => onCorpo(e.target.value)}
        />
      </div>
    </div>
  );
}

/** Um número opcional: vazio é «sem limite». */
function numeroOuNada(v: string): number | undefined {
  if (v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function EditorPergunta({
  base,
  pergunta: p,
  indice,
  total,
  anteriores,
  idioma,
  erros,
  onAlterar,
  onMover,
  onDuplicar,
  onApagar,
}: {
  base: string;
  pergunta: Pergunta;
  indice: number;
  total: number;
  anteriores: readonly Pergunta[];
  idioma: SpecInquerito['idioma'];
  erros: readonly string[];
  onAlterar: (f: (p: Pergunta) => Pergunta) => void;
  onMover: (delta: -1 | 1) => void;
  onDuplicar: () => void;
  onApagar: () => void;
}) {
  const n = indice + 1;
  const condicionaveis = anteriores.filter((a) => valoresDeCondicao(a) !== null);
  const alvo = p.mostrarSe ? anteriores.find((a) => a.chave === p.mostrarSe!.pergunta) : undefined;
  const possiveis = alvo ? valoresDeCondicao(alvo) : null;

  function rotuloDoValor(a: Pergunta, valor: string): string {
    if ('opcoes' in a) return a.opcoes.find((o) => o.chave === valor)?.rotulo || valor;
    return valor;
  }

  return (
    <article
      aria-labelledby={`${base}-cab`}
      className={cn(
        'border bg-[color:var(--surface-raised)] p-4',
        erros.length > 0
          ? 'border-[color:var(--color-signal-700)]'
          : 'border-[color:var(--border)]',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${base}-cab`} className="text-sm font-medium">
          {p.tipo === 'seccao' ? `Secção · posição ${n}` : `Pergunta ${n}`}
          <span className="sr-only"> — {p.titulo || 'sem título'}</span>
        </h3>
        <div className="flex items-center">
          <button
            type="button"
            className={iconeBotao}
            aria-label={`Subir a pergunta ${n}`}
            title="Subir"
            disabled={indice === 0}
            onClick={() => onMover(-1)}
          >
            <ArrowUp aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            className={iconeBotao}
            aria-label={`Descer a pergunta ${n}`}
            title="Descer"
            disabled={indice === total - 1}
            onClick={() => onMover(1)}
          >
            <ArrowDown aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            className={iconeBotao}
            aria-label={`Duplicar a pergunta ${n}`}
            title="Duplicar"
            disabled={total >= LIMITES.perguntas}
            onClick={onDuplicar}
          >
            <Copy aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            className={iconeBotao}
            aria-label={`Apagar a pergunta ${n}`}
            title="Apagar"
            disabled={total <= 1}
            onClick={onApagar}
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_14rem]">
        <div>
          <label htmlFor={`${base}-titulo`} className={rotulo}>
            {p.tipo === 'seccao' ? 'Título da secção' : 'Pergunta'}
          </label>
          <input
            id={`${base}-titulo`}
            className={cn(campo, 'mt-1.5')}
            maxLength={LIMITES.titulo}
            value={p.titulo}
            onChange={(e) => onAlterar((q) => ({ ...q, titulo: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor={`${base}-tipo`} className={rotulo}>
            Tipo
          </label>
          <select
            id={`${base}-tipo`}
            className={cn(campo, 'mt-1.5')}
            value={p.tipo}
            onChange={(e) => onAlterar((q) => mudarTipo(q, e.target.value as TipoPergunta, idioma))}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {NOME_DO_TIPO[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor={`${base}-ajuda`} className={rotulo}>
          Ajuda (opcional)
        </label>
        <input
          id={`${base}-ajuda`}
          className={cn(campo, 'mt-1.5')}
          maxLength={LIMITES.ajuda}
          value={p.ajuda ?? ''}
          onChange={(e) => onAlterar((q) => ({ ...q, ajuda: e.target.value || undefined }))}
        />
      </div>

      {p.tipo !== 'seccao' && (
        <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={p.obrigatoria}
            onChange={(e) =>
              onAlterar((q) => (q.tipo === 'seccao' ? q : { ...q, obrigatoria: e.target.checked }))
            }
          />
          Resposta obrigatória
        </label>
      )}

      {(p.tipo === 'texto_curto' || p.tipo === 'texto_longo') && (
        <div className="mt-3 w-48">
          <label htmlFor={`${base}-max`} className={rotulo}>
            Máximo de caracteres
          </label>
          <input
            id={`${base}-max`}
            type="number"
            min={1}
            max={p.tipo === 'texto_curto' ? LIMITES.textoCurto : LIMITES.textoLongo}
            className={cn(campo, 'mt-1.5')}
            value={p.max}
            onChange={(e) =>
              onAlterar((q) =>
                q.tipo === 'texto_curto' || q.tipo === 'texto_longo'
                  ? ({ ...q, max: numeroOuNada(e.target.value) ?? 1 } as Pergunta)
                  : q,
              )
            }
          />
        </div>
      )}

      {(p.tipo === 'escolha_unica' || p.tipo === 'escolha_multipla') && (
        <fieldset className="mt-4">
          <legend className={rotulo}>Opções</legend>
          <ol className="mt-2 space-y-2">
            {p.opcoes.map((o, j) => (
              <li key={o.chave} className="flex items-center gap-2">
                <label htmlFor={`${base}-o-${o.chave}`} className="sr-only">
                  Opção {j + 1}
                </label>
                <input
                  id={`${base}-o-${o.chave}`}
                  className={campo}
                  maxLength={LIMITES.rotuloOpcao}
                  value={o.rotulo}
                  onChange={(e) =>
                    onAlterar((q) =>
                      'opcoes' in q
                        ? ({
                            ...q,
                            opcoes: q.opcoes.map((x) =>
                              x.chave === o.chave ? { ...x, rotulo: e.target.value } : x,
                            ),
                          } as Pergunta)
                        : q,
                    )
                  }
                />
                <button
                  type="button"
                  className={iconeBotao}
                  aria-label={`Retirar a opção ${j + 1}`}
                  title="Retirar"
                  disabled={p.opcoes.length <= 2}
                  onClick={() =>
                    onAlterar((q) =>
                      'opcoes' in q
                        ? ({
                            ...q,
                            opcoes: q.opcoes.filter((x) => x.chave !== o.chave),
                          } as Pergunta)
                        : q,
                    )
                  }
                >
                  <X aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ol>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 gap-1.5"
            disabled={p.opcoes.length >= LIMITES.opcoes}
            onClick={() =>
              onAlterar((q) =>
                'opcoes' in q ? ({ ...q, opcoes: novaOpcao(q.opcoes, idioma) } as Pergunta) : q,
              )
            }
          >
            <Plus aria-hidden className="size-4" />
            Acrescentar opção
          </Button>
        </fieldset>
      )}

      {(p.tipo === 'escolha_multipla' || p.tipo === 'numero') && (
        <div className="mt-3 flex flex-wrap gap-3">
          {(['min', 'max'] as const).map((k) => (
            <div key={k} className="w-40">
              <label htmlFor={`${base}-${k}`} className={rotulo}>
                {p.tipo === 'numero'
                  ? k === 'min'
                    ? 'Valor mínimo'
                    : 'Valor máximo'
                  : k === 'min'
                    ? 'Mínimo de escolhas'
                    : 'Máximo de escolhas'}
              </label>
              <input
                id={`${base}-${k}`}
                type="number"
                className={cn(campo, 'mt-1.5')}
                placeholder="sem limite"
                value={p[k] ?? ''}
                onChange={(e) =>
                  onAlterar((q) =>
                    q.tipo === 'escolha_multipla' || q.tipo === 'numero'
                      ? ({ ...q, [k]: numeroOuNada(e.target.value) } as Pergunta)
                      : q,
                  )
                }
              />
            </div>
          ))}
          {p.tipo === 'numero' && (
            <label className="flex min-h-11 items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={p.inteiro}
                onChange={(e) =>
                  onAlterar((q) => (q.tipo === 'numero' ? { ...q, inteiro: e.target.checked } : q))
                }
              />
              Só números inteiros
            </label>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-[color:var(--hairline)] pt-3">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={Boolean(p.mostrarSe)}
            disabled={!p.mostrarSe && condicionaveis.length === 0}
            onChange={(e) => {
              const primeira = condicionaveis[0];
              const vals = primeira ? valoresDeCondicao(primeira) : null;
              onAlterar((q) => {
                if (!e.target.checked || !primeira || !vals) return semCondicao(q);
                return {
                  ...q,
                  mostrarSe: {
                    pergunta: primeira.chave,
                    op: vals.ops[0]!,
                    valor: vals.valores[0]!,
                  },
                };
              });
            }}
          />
          Mostrar só consoante uma resposta anterior
        </label>
        {!p.mostrarSe && condicionaveis.length === 0 && (
          <p className="text-xs text-[color:var(--muted)]">
            Só escolhas, avaliações e NPS anteriores servem de condição.
          </p>
        )}

        {p.mostrarSe && (
          <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div>
              <label htmlFor={`${base}-cond-p`} className={rotulo}>
                Se a pergunta
              </label>
              <select
                id={`${base}-cond-p`}
                className={cn(campo, 'mt-1.5')}
                value={p.mostrarSe.pergunta}
                onChange={(e) => {
                  const nova = condicionaveis.find((a) => a.chave === e.target.value);
                  const vals = nova ? valoresDeCondicao(nova) : null;
                  if (!nova || !vals) return;
                  onAlterar((q) => ({
                    ...q,
                    mostrarSe: { pergunta: nova.chave, op: vals.ops[0]!, valor: vals.valores[0]! },
                  }));
                }}
              >
                {!alvo && (
                  <option value={p.mostrarSe.pergunta}>(pergunta que já não está antes)</option>
                )}
                {condicionaveis.map((a) => (
                  <option key={a.chave} value={a.chave}>
                    {`${anteriores.indexOf(a) + 1}. ${a.titulo || 'sem título'}`}
                  </option>
                ))}
              </select>
            </div>
            <p className="pb-3 text-sm text-[color:var(--muted)]">
              {p.mostrarSe.op === 'inclui' ? 'incluir' : 'for'}
            </p>
            <div>
              <label htmlFor={`${base}-cond-v`} className={rotulo}>
                Valor
              </label>
              <select
                id={`${base}-cond-v`}
                className={cn(campo, 'mt-1.5')}
                value={p.mostrarSe.valor}
                disabled={!possiveis}
                onChange={(e) =>
                  onAlterar((q) =>
                    q.mostrarSe
                      ? { ...q, mostrarSe: { ...q.mostrarSe, valor: e.target.value } }
                      : q,
                  )
                }
              >
                {alvo &&
                  possiveis?.valores.map((v) => (
                    <option key={v} value={v}>
                      {rotuloDoValor(alvo, v)}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {erros.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-[color:var(--color-signal-700)]">
          {erros.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </article>
  );
}
