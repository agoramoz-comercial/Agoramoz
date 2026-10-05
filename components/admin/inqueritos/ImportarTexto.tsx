'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { Check, CornerDownRight, FileText, Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ResultadoAccaoImportar } from '@/lib/admin/importar-inquerito';
import { NOME_DO_TIPO } from '@/lib/inqueritos/construtor';
import { MAX_TEXTO } from '@/lib/inqueritos/importar/esquema';
import type { Pergunta, SpecInquerito } from '@/lib/inqueritos/spec';
import { cn } from '@/lib/utils/cn';

/**
 * «Colar e transformar»: o admin cola o inquérito tal como está no Word, no
 * Google Docs ou numa mensagem, e recebe a estrutura — secções, texto de
 * secção, perguntas com tipo, obrigatoriedade, subtítulo, opções e condições
 * — com o PORQUÊ de cada tipo, antes de aplicar. Nada é guardado aqui: aplicar
 * muda o construtor, e só o «Guardar» de sempre escreve.
 */

export type EntradaImportar = {
  readonly id: string;
  readonly texto: string;
  readonly motor: 'kimi' | 'local';
  readonly modo: 'substituir' | 'acrescentar';
  readonly base: SpecInquerito;
};

type Proposta = Extract<ResultadoAccaoImportar, { ok: true }>;

/** O formato com campos: o mais exacto — cada campo é lido tal como está, sem IA. */
const MODELO_FICHA = `Título: Avaliação de Satisfação do Cliente 2026
Introdução: Obrigado por dedicar 3 minutos a ajudar-nos a melhorar.

Secção 1: Perfil
Texto da secção: Responda pensando na sua organização.

Pergunta 1: Em que sector opera a sua organização?
Tipo: Escolha única
Obrigatória: Sim
Opções: Energia; Agricultura; Banca e seguros; Outro

Pergunta 2: Que serviços já utilizou?
Tipo: Escolha múltipla
Obrigatória: Não
Subtítulo: Escolha todas as que se aplicam.
Opções: Websites; Automação; Agentes de IA; Software à medida

Secção 2: Experiência
Pergunta 3: Como avalia o atendimento?
Tipo: Avaliação (1 a 5)
Obrigatória: Sim

Pergunta 4: Recomendaria a AGORAMOZ a um colega?
Tipo: NPS (0 a 10)
Obrigatória: Sim

Pergunta 5: O que podíamos fazer melhor?
Tipo: Texto longo
Obrigatória: Não
Condição: P4 = 6

Agradecimento: Obrigado! A equipa lê todas as respostas.`;

const EXEMPLO = `Inquérito de Maturidade Digital 2026
Este inquérito ajuda-nos a perceber como a sua equipa trabalha hoje. Leva 3 minutos.

Secção 1: Perfil da empresa
Responda pensando na empresa como um todo.

1. Em que sector opera a empresa? *
a) Energia
b) Agricultura
c) Serviços financeiros
d) Outro

2. Quantas pessoas trabalham na empresa?
(Inclua contratados a tempo inteiro)

3. A empresa usa um ERP? (Sim/Não) (obrigatória)

4. Se sim, qual ERP usa?

Secção 2: Ferramentas e processos
5. Que áreas gastam mais tempo em tarefas repetidas? (escolha múltipla, até 3)
- Finanças
- Vendas
- Recursos humanos
- Operações

6. Como avalia as ferramentas actuais? [escala 1 a 5]

7. Recomendaria a AGORAMOZ a um colega?

8. Descreva o principal desafio da sua equipa. (opcional)

Obrigado
A equipa AGORAMOZ lê todas as respostas.`;

const MOTIVO_FALLBACK: Record<string, string> = {
  indisponivel: 'A IA não está configurada no servidor',
  timeout: 'O Kimi demorou demasiado a responder',
  rede: 'Não foi possível ligar ao Kimi',
  json: 'A resposta do Kimi não era aproveitável',
  esquema: 'A resposta do Kimi não seguia o formato pedido',
  vazio: 'O Kimi não devolveu estrutura',
  sem_perguntas: 'O Kimi não encontrou perguntas',
  http_401: 'O Kimi recusou a chave (verificar KIMI_API_KEY)',
  http_403: 'O Kimi recusou o acesso (verificar a conta)',
  http_429: 'A conta Kimi está no limite de pedidos (o nível da conta sobe com o saldo carregado)',
};

function motivoDoFallback(codigo: string): string {
  return (
    MOTIVO_FALLBACK[codigo] ??
    (codigo.startsWith('http_5') ? 'O Kimi está com problemas do lado dele' : 'O Kimi falhou')
  );
}

// A borda é o único sinal de que o campo existe (fundo igual ao da página):
// `--muted` dá 5,7:1, acima dos 3:1 do WCAG 1.4.11. O placeholder também.
const campo =
  'w-full rounded-[--radius-sm] border border-[color:var(--muted)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--on-surface)] placeholder:text-[color:var(--muted)]';

export function ImportarTexto({
  id,
  base,
  baseInvalida = false,
  iaDisponivel,
  modeloIA,
  importar,
  onAplicar,
}: {
  id: string;
  /** O último spec válido do construtor. */
  base: SpecInquerito;
  /** O inquérito tem erros por corrigir: a base enviada não seria o que se vê. */
  baseInvalida?: boolean;
  iaDisponivel: boolean;
  modeloIA?: string;
  importar: (entrada: EntradaImportar) => Promise<ResultadoAccaoImportar>;
  onAplicar: (spec: SpecInquerito, resumo: string) => void;
}) {
  const ids = useId();
  const [texto, setTexto] = useState('');
  const [motor, setMotor] = useState<'kimi' | 'local'>(iaDisponivel ? 'kimi' : 'local');
  const [modo, setModo] = useState<'substituir' | 'acrescentar'>('substituir');
  const [proposta, setProposta] = useState<Proposta | null>(null);
  /** O modo com que a proposta foi feita: mudar o rádio depois não a reinterpreta. */
  const [modoDaProposta, setModoDaProposta] = useState<'substituir' | 'acrescentar'>('substituir');
  /**
   * A base sobre a qual a proposta foi calculada. A proposta é o inquérito
   * INTEIRO; aplicá-la depois de o admin mudar o construtor apagaria essas
   * mudanças. O construtor troca a referência a cada alteração válida.
   */
  const [baseDaProposta, setBaseDaProposta] = useState<SpecInquerito | null>(null);
  const desactualizada = proposta !== null && baseDaProposta !== base;
  const [erro, setErro] = useState<string | null>(null);
  const [aCorrer, iniciar] = useTransition();
  const tituloProposta = useRef<HTMLHeadingElement>(null);
  const erroRef = useRef<HTMLParagraphElement>(null);
  const textoRef = useRef<HTMLTextAreaElement>(null);

  // O foco segue o resultado depois de ele existir no DOM (efeito, não rAF).
  useEffect(() => {
    if (proposta) tituloProposta.current?.focus();
  }, [proposta]);
  useEffect(() => {
    if (erro) erroRef.current?.focus();
  }, [erro]);

  function transformar() {
    setErro(null);
    setProposta(null);
    const pedido: EntradaImportar = { id, texto, motor, modo, base };
    iniciar(async () => {
      let r: ResultadoAccaoImportar;
      try {
        r = await importar(pedido);
      } catch {
        r = { ok: false, motivo: 'Não foi possível transformar agora. Tente de novo.' };
      }
      if (!r.ok) {
        setErro(r.motivo);
        return;
      }
      setBaseDaProposta(pedido.base);
      setModoDaProposta(pedido.modo);
      setProposta(r);
    });
  }

  function aplicar() {
    if (!proposta || desactualizada) return;
    const { resumo } = proposta;
    const n = resumo.perguntas;
    const s = resumo.seccoes;
    onAplicar(
      proposta.spec,
      `Inquérito ${modoDaProposta === 'substituir' ? 'substituído' : 'completado'}: ${n} pergunta${n === 1 ? '' : 's'}${s ? `, ${s} secç${s === 1 ? 'ão' : 'ões'}` : ''}. Reveja e carregue em «Guardar rascunho».`,
    );
    setProposta(null);
  }

  const tamanho = texto.length;
  const grande = tamanho > MAX_TEXTO;
  const bloqueado = texto.trim().length === 0 || grande || baseInvalida;

  return (
    <div className="border border-[color:var(--border)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--border)] bg-[color:var(--surface-raised)] px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Sparkles aria-hidden className="size-4" />
          Cole o inquérito em texto e receba a estrutura final
        </p>
        <span className="rule-label text-[color:var(--muted)]">
          {iaDisponivel ? `IA: Kimi${modeloIA ? ` · ${modeloIA}` : ''}` : 'Analisador local'}
        </span>
      </div>

      <div className="space-y-4 p-4">
        <p className="max-w-[70ch] text-sm text-[color:var(--muted)]">
          Do Word, do Google Docs ou de uma mensagem, tal como está. Se o texto disser a estrutura
          — campos «Tipo:», «Obrigatória:», «Opções:», «Subtítulo:», «Texto da secção:»,
          «Condição:», ou uma tabela com essas colunas — é lida exactamente assim, sem IA. Sem
          campos, reconhece secções, perguntas numeradas ou acabadas em «?», opções em lista ou
          em linhas soltas, obrigatórias («*»), escalas («1 a 5», «0 a 10») e condições («Se sim,
          …»). Mostra de onde veio cada tipo antes de aplicar.
        </p>

        <div>
          <div className="flex items-end justify-between gap-3">
            <label
              htmlFor={`${ids}-texto`}
              className="text-xs font-medium text-[color:var(--muted)]"
            >
              Texto do inquérito
            </label>
            {/* Só com o campo vazio: nunca apaga o que o admin colou. */}
            {texto.length === 0 && (
              <span className="flex flex-wrap gap-x-4">
                <button
                  type="button"
                  className="min-h-11 text-xs text-[color:var(--muted)] underline underline-offset-4 hover:text-[color:var(--on-surface)]"
                  onClick={() => {
                    setTexto(MODELO_FICHA);
                    textoRef.current?.focus();
                  }}
                >
                  Inserir modelo com campos
                </button>
                <button
                  type="button"
                  className="min-h-11 text-xs text-[color:var(--muted)] underline underline-offset-4 hover:text-[color:var(--on-surface)]"
                  onClick={() => {
                    setTexto(EXEMPLO);
                    textoRef.current?.focus();
                  }}
                >
                  Inserir exemplo
                </button>
              </span>
            )}
          </div>
          <textarea
            ref={textoRef}
            id={`${ids}-texto`}
            className={cn(
              campo,
              'mt-1.5 min-h-56 resize-y font-mono text-[0.8125rem] leading-relaxed',
            )}
            value={texto}
            spellCheck={false}
            aria-describedby={`${ids}-contador ${ids}-limite`}
            aria-invalid={grande || undefined}
            placeholder={'Título do inquérito\n\nSecção 1: …\n1. Primeira pergunta? *\na) Opção\nb) Opção'}
            onChange={(e) => setTexto(e.target.value)}
          />
          <div className="mt-1 flex flex-wrap items-start justify-between gap-x-3 text-xs">
            {/* Anunciado só ao passar o limite; a contagem em si não é viva
                (mudaria a cada tecla). */}
            <p id={`${ids}-limite`} aria-live="polite" className="text-[color:var(--signal)]">
              {grande && (
                <span className="flex items-start gap-1.5">
                  <TriangleAlert aria-hidden className="mt-0.5 size-3 shrink-0" />
                  Excede o limite em {(tamanho - MAX_TEXTO).toLocaleString('pt-PT')} caracteres:
                  encurte o texto para poder transformar.
                </span>
              )}
            </p>
            <p
              id={`${ids}-contador`}
              className="ml-auto text-right text-[color:var(--muted)] tabular-nums"
            >
              {tamanho.toLocaleString('pt-PT')} de {MAX_TEXTO.toLocaleString('pt-PT')} caracteres
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="min-w-0">
            <legend className="text-xs font-medium text-[color:var(--muted)]">Motor</legend>
            <div className="mt-1.5 space-y-1">
              <Radio
                nome={`${ids}-motor`}
                marcado={motor === 'kimi'}
                desligado={!iaDisponivel}
                onEscolher={() => setMotor('kimi')}
                titulo="Kimi (IA)"
                nota={
                  iaDisponivel
                    ? 'Entende texto desorganizado. O texto vai para a Moonshot AI: não inclua dados pessoais.'
                    : 'Por configurar no servidor (SURVEY_AI e KIMI_API_KEY).'
                }
              />
              <Radio
                nome={`${ids}-motor`}
                marcado={motor === 'local'}
                onEscolher={() => setMotor('local')}
                titulo="Analisador local"
                nota="Instantâneo, sem custo, o texto não sai do servidor."
              />
            </div>
          </fieldset>
          <fieldset className="min-w-0">
            <legend className="text-xs font-medium text-[color:var(--muted)]">O que fazer</legend>
            <div className="mt-1.5 space-y-1">
              <Radio
                nome={`${ids}-modo`}
                marcado={modo === 'substituir'}
                onEscolher={() => setModo('substituir')}
                titulo="Substituir o inquérito"
                nota="Troca perguntas, boas-vindas e agradecimento."
              />
              <Radio
                nome={`${ids}-modo`}
                marcado={modo === 'acrescentar'}
                onEscolher={() => setModo('acrescentar')}
                titulo="Juntar ao fim"
                nota="Mantém o que existe e junta as perguntas novas."
              />
            </div>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            className="gap-2"
            // A correr, o botão fica focável (aria-disabled em vez de disabled):
            // desligá-lo tirava o foco a quem carregou nele.
            disabled={!aCorrer && bloqueado}
            aria-disabled={aCorrer || undefined}
            aria-busy={aCorrer || undefined}
            onClick={() => {
              if (!aCorrer) transformar();
            }}
          >
            {aCorrer ? (
              <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Sparkles aria-hidden className="size-4" />
            )}
            {aCorrer
              ? motor === 'kimi'
                ? 'A transformar com o Kimi…'
                : 'A transformar…'
              : 'Transformar'}
          </Button>
          <p role="status" className="text-xs text-[color:var(--muted)]">
            {aCorrer
              ? motor === 'kimi'
                ? 'A transformar com o Kimi. Inquéritos longos podem levar até um minuto e meio.'
                : 'A transformar…'
              : baseInvalida
                ? 'Corrija primeiro os problemas assinalados no inquérito.'
                : ''}
          </p>
        </div>

        {erro && (
          <p
            ref={erroRef}
            tabIndex={-1}
            role="alert"
            className="flex scroll-mt-28 items-start gap-2 border border-[color:var(--color-signal-600)] px-3 py-2 text-sm outline-none"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {erro}
          </p>
        )}

        {proposta && (
          <RevisaoProposta
            proposta={proposta}
            base={baseDaProposta ?? base}
            desactualizada={desactualizada}
            modo={modoDaProposta}
            tituloRef={tituloProposta}
            idTitulo={`${ids}-proposta`}
            onAplicar={aplicar}
            onDescartar={() => {
              setProposta(null);
              textoRef.current?.focus();
            }}
          />
        )}
      </div>
    </div>
  );
}

function Radio({
  nome,
  marcado,
  desligado,
  onEscolher,
  titulo,
  nota,
}: {
  nome: string;
  marcado: boolean;
  desligado?: boolean;
  onEscolher: () => void;
  titulo: string;
  nota: string;
}) {
  const idNota = useId();
  // O nome acessível é só o título; a nota (privacidade, porque está
  // desligado) é a descrição. Só o título esmaece: a nota explica o estado e
  // tem de manter o contraste.
  return (
    <div className="flex min-h-11 items-start gap-2.5 py-1 text-sm">
      <input
        type="radio"
        id={`${idNota}-r`}
        name={nome}
        className="mt-0.5 size-4 shrink-0"
        checked={marcado}
        disabled={desligado}
        aria-describedby={idNota}
        onChange={onEscolher}
      />
      <span>
        <label
          htmlFor={`${idNota}-r`}
          className={cn(
            'font-medium',
            desligado ? 'cursor-not-allowed text-[color:var(--muted)]' : 'cursor-pointer',
          )}
        >
          {titulo}
        </label>
        <span id={idNota} className="block text-xs text-[color:var(--muted)]">
          {nota}
        </span>
      </span>
    </div>
  );
}

/** A proposta como um mapa do inquérito: secções como réguas, perguntas numeradas. */
function RevisaoProposta({
  proposta,
  base,
  desactualizada,
  modo,
  tituloRef,
  idTitulo,
  onAplicar,
  onDescartar,
}: {
  proposta: Proposta;
  /** A base do momento do pedido — não a actual. */
  base: SpecInquerito;
  desactualizada: boolean;
  modo: 'substituir' | 'acrescentar';
  tituloRef: React.RefObject<HTMLHeadingElement | null>;
  idTitulo: string;
  onAplicar: () => void;
  onDescartar: () => void;
}) {
  const { spec, resumo, avisos, razoes, motor, caiuParaLocal, modelo, partes, formato } = proposta;
  const inicio = modo === 'acrescentar' ? base.perguntas.length : 0;
  const novas = spec.perguntas.slice(inicio);
  const porChave = new Map(spec.perguntas.map((p) => [p.chave, p]));
  const anteriores = spec.perguntas.slice(0, inicio).filter((p) => p.tipo !== 'seccao').length;
  const numeros = novas.reduce<number[]>((acc, p) => {
    const ultimo = acc.length ? acc[acc.length - 1]! : anteriores;
    acc.push(p.tipo === 'seccao' ? ultimo : ultimo + 1);
    return acc;
  }, []);

  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  const chips = [
    plural(resumo.perguntas, 'pergunta', 'perguntas'),
    resumo.seccoes ? plural(resumo.seccoes, 'secção', 'secções') : null,
    resumo.obrigatorias ? plural(resumo.obrigatorias, 'obrigatória', 'obrigatórias') : null,
    resumo.condicoes ? plural(resumo.condicoes, 'condição', 'condições') : null,
  ].filter((c): c is string => c !== null);

  return (
    <section aria-labelledby={idTitulo} className="border-t border-[color:var(--border)] pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3
          id={idTitulo}
          ref={tituloRef}
          tabIndex={-1}
          className="scroll-mt-28 text-sm font-medium outline-none"
        >
          Proposta
        </h3>
        <span className="rule-label text-[color:var(--muted)]">
          {formato
            ? 'Estrutura lida do texto'
            : motor === 'kimi'
              ? `Gerado por IA · ${modelo ?? 'Kimi'}`
              : 'Analisador local'}
        </span>
      </div>

      {formato && (
        <p className="mt-2 flex items-start gap-2 border border-[color:var(--border)] px-3 py-2 text-sm">
          <Check aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            {formato === 'tabela'
              ? 'O texto traz uma tabela com as colunas da estrutura'
              : 'O texto declara a estrutura em campos («Tipo», «Obrigatória», «Opções»…)'}
            : foi lida tal como está, sem IA — exacta e instantânea. Cada pergunta diz de onde veio
            o tipo.
          </span>
        </p>
      )}

      {caiuParaLocal && (
        <p className="mt-2 flex items-start gap-2 border border-[color:var(--border)] bg-[color:var(--surface-raised)] px-3 py-2 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="sr-only">Aviso: </span>
            {motivoDoFallback(caiuParaLocal)} — usei o analisador local. Reveja com atenção.
          </span>
        </p>
      )}

      {partes && partes.local > 0 && (
        <p className="mt-2 flex items-start gap-2 border border-[color:var(--border)] bg-[color:var(--surface-raised)] px-3 py-2 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="sr-only">Aviso: </span>
            O Kimi estruturou {partes.kimi} de {partes.total} partes; {partes.local}{' '}
            {partes.local === 1 ? 'ficou' : 'ficaram'} com o analisador local
            {partes.motivo ? ` — ${motivoDoFallback(partes.motivo)}` : ''}. Reveja essas com atenção.
          </span>
        </p>
      )}

      <ul role="list" className="mt-3 flex flex-wrap gap-2" aria-label="Resumo">
        {chips.map((c) => (
          <li
            key={c}
            className="border border-[color:var(--border)] px-2.5 py-1 text-xs tabular-nums"
          >
            {c}
          </li>
        ))}
      </ul>

      {modo === 'substituir' && (
        <p className="mt-3 text-sm">
          <span className="text-[color:var(--muted)]">Boas-vindas:</span> {spec.boasVindas.titulo}
          {spec.agradecimento.titulo !== base.agradecimento.titulo && (
            <>
              {' '}
              <span className="text-[color:var(--muted)]">· Agradecimento:</span>{' '}
              {spec.agradecimento.titulo}
            </>
          )}
        </p>
      )}

      <ol role="list" className="mt-4 border-l border-[color:var(--border)]">
        {novas.map((p, i) => {
          const posicao = inicio + i + 1;
          const avisosDaPergunta = avisos.filter((a) => a.pergunta === posicao).map((a) => a.texto);
          if (p.tipo === 'seccao') {
            return (
              <li key={p.chave} className="relative py-3 pl-5">
                <span
                  aria-hidden
                  className="absolute top-5 left-0 h-px w-3 bg-[color:var(--on-surface)]"
                />
                <p className="rule-label text-[color:var(--muted)]">Secção</p>
                <p className="font-display text-base font-semibold">{p.titulo}</p>
                {p.ajuda && (
                  <p className="mt-1 max-w-[70ch] text-sm whitespace-pre-line text-[color:var(--muted)]">
                    {p.ajuda}
                  </p>
                )}
                <Avisos lista={avisosDaPergunta} />
              </li>
            );
          }
          return (
            <li key={p.chave} className="relative py-3 pl-5">
              <span
                aria-hidden
                className="absolute top-5 left-0 h-px w-3 bg-[color:var(--border)]"
              />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-techno text-xs text-[color:var(--muted)] tabular-nums">
                  {String(numeros[i]).padStart(2, '0')}
                </span>
                <span className="text-sm font-medium">{p.titulo}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="border border-[color:var(--on-surface)] px-1.5 py-0.5">
                  {NOME_DO_TIPO[p.tipo]}
                </span>
                {p.obrigatoria && (
                  <span className="border border-[color:var(--border)] px-1.5 py-0.5">
                    Obrigatória
                  </span>
                )}
                {p.mostrarSe && <Condicao pergunta={p} porChave={porChave} />}
              </div>
              {p.ajuda && (
                <p className="mt-1.5 max-w-[70ch] text-sm whitespace-pre-line text-[color:var(--muted)]">
                  {p.ajuda}
                </p>
              )}
              {'opcoes' in p && (
                <p className="mt-1.5 text-sm">
                  <span className="sr-only">Opções: </span>
                  {p.opcoes.map((o) => o.rotulo).join(' · ')}
                </p>
              )}
              {razoes[p.chave] && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-[color:var(--muted)]">
                  <CornerDownRight aria-hidden className="mt-0.5 size-3 shrink-0" />
                  <span>
                    <span className="sr-only">Porquê este tipo: </span>
                    {razoes[p.chave]}
                  </span>
                </p>
              )}
              <Avisos lista={avisosDaPergunta} />
            </li>
          );
        })}
      </ol>

      <Avisos lista={avisos.filter((a) => a.pergunta === undefined).map((a) => a.texto)} geral />

      {desactualizada && (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 border border-[color:var(--color-signal-600)] px-3 py-2 text-sm"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          O inquérito mudou desde esta proposta. Carregue em «Transformar» de novo para não perder
          essas alterações.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="gap-2"
          disabled={desactualizada}
          onClick={onAplicar}
        >
          <Check aria-hidden className="size-4" />
          {modo === 'substituir' ? 'Aplicar: substituir o inquérito' : 'Aplicar: juntar ao fim'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDescartar}>
          Descartar proposta
        </Button>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-[color:var(--muted)]">
        <FileText aria-hidden className="size-3.5" />
        Aplicar muda o construtor; nada fica gravado até «Guardar rascunho».
      </p>
    </section>
  );
}

function Condicao({ pergunta, porChave }: { pergunta: Pergunta; porChave: Map<string, Pergunta> }) {
  const c = pergunta.mostrarSe!;
  const alvo = porChave.get(c.pergunta);
  const valor =
    alvo && 'opcoes' in alvo
      ? (alvo.opcoes.find((o) => o.chave === c.valor)?.rotulo ?? c.valor)
      : c.valor;
  return (
    <span className="border border-dashed border-[color:var(--border)] px-1.5 py-0.5">
      Só se «{alvo?.titulo ?? c.pergunta}» {c.op === 'inclui' ? 'incluir' : '='} {valor}
    </span>
  );
}

function Avisos({ lista, geral }: { lista: readonly string[]; geral?: boolean }) {
  if (lista.length === 0) return null;
  return (
    <ul role="list" className={cn('space-y-1 text-xs', geral ? 'mt-3' : 'mt-1.5')}>
      {lista.map((t, i) => (
        <li key={i} className="flex items-start gap-1.5 text-[color:var(--signal)]">
          <TriangleAlert aria-hidden className="mt-0.5 size-3 shrink-0" />
          <span>
            <span className="sr-only">Aviso: </span>
            {t}
          </span>
        </li>
      ))}
    </ul>
  );
}
