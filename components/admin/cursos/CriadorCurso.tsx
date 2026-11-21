'use client';

import { useId, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleDashed, FileUp, Globe, Loader2, PenLine, Printer, Save, Sparkles, Trash2, XCircle } from 'lucide-react';
import { inputClass } from '@/components/form/Field';
import { DocumentoCurso } from '@/components/cursos/DocumentoCurso';
import { cn } from '@/lib/utils/cn';
import { agrupar } from '@/lib/propostas/modelo';
import { ACEITES, ErroFicheiro, textoDoFicheiro } from '@/lib/propostas/ficheiro';
import { criarFonte } from '@/lib/cursos/fontes';
import {
  LIMITES,
  NIVEIS,
  ROTULO_NIVEL,
  ROTULO_ORIGEM,
  type Aula,
  type Curso,
  type Fonte,
  type Nivel,
  type OrigemFonte,
} from '@/lib/cursos/modelo';
import { montarCurso, type Peca, type PedidoCurso, type Plano } from '@/lib/cursos/ciclo';
import { descreverFalhas } from '@/lib/cursos/verificar';
import type { Resposta, RespostaFontes } from '@/lib/cursos/gerar';

/**
 * O criador de cursos (D-49).
 *
 * 1. As fontes: ficheiros lidos NESTE computador (o mesmo leitor das
 *    propostas), texto colado, ou pela IA — pesquisa na internet (com o
 *    link confirmado) ou texto-base escrito por ela, sempre marcado como
 *    tal. Tudo partido em passagens numeradas.
 * 2. O pedido: o título (fixo: o curso alinha-se por ele), público, nível,
 *    duração e o tema, que a IA escreve a partir do título e das fontes
 *    (pode rever-se antes de gerar).
 * 3. Gerar: o plano, depois cada aula, uma a uma — cada peça passa pelo
 *    ciclo no servidor (gerar → verificar → corrigir, até 3 vezes) e o
 *    ecrã mostra o que passou, o que foi retirado e porquê.
 * 4. O documento: revê-se, descarrega-se em PDF, guarda-se, publica-se.
 *
 * As acções chegam por propriedade: no admin são as reais; na
 * pré-visualização de QA, um motor simulado.
 */

export interface AccoesCriador {
  readonly pesquisarFontes: (entrada: unknown) => Promise<RespostaFontes>;
  readonly textoBase: (entrada: unknown) => Promise<RespostaFontes>;
  readonly sugerirTema: (entrada: unknown) => Promise<Resposta<string>>;
  readonly planear: (entrada: unknown) => Promise<Resposta<Plano>>;
  readonly escreverAula: (entrada: unknown) => Promise<Resposta<Aula>>;
  readonly guardar?: (entrada: unknown) => Promise<{ ok: true; id: string; slug: string; revisao: number } | { ok: false; erro: string }>;
}

interface FonteCarregada {
  readonly nome: string;
  readonly tipo: Fonte['tipo'];
  readonly texto: string;
  readonly avisos: readonly string[];
  readonly url?: string;
  readonly origem?: OrigemFonte;
}

type EstadoPeca = {
  readonly rotulo: string;
  readonly estado: 'espera' | 'a-gerar' | 'ok' | 'parcial' | 'falhou';
  readonly detalhe?: string;
};

const ROTULO = 'text-sm font-medium';
const AJUDA = 'text-xs text-[color:var(--muted)]';
const CAIXA = 'grid gap-4 border border-[color:var(--border)] bg-[color:var(--surface)] p-4';
const BOTAO =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[--radius-xs] border border-[color:var(--border)] px-3 text-sm hover:bg-[color:var(--surface-raised)] disabled:opacity-50';
const BOTAO_PRIMARIO =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[--radius-xs] bg-[color:var(--color-signal-600)] px-4 text-sm font-medium text-white disabled:opacity-50';

function tipoDe(nome: string): Fonte['tipo'] {
  const e = nome.toLowerCase().split('.').pop();
  return e === 'docx' || e === 'pdf' || e === 'txt' || e === 'md' ? e : 'texto';
}

const inteiro = (n: number) => agrupar(n).replace(/,00$/, '');
const tamanho = (fs: readonly FonteCarregada[]) => fs.reduce((s, f) => s + f.texto.length, 0);

export function CriadorCurso({ accoes, motorLigado, podeGuardar }: { accoes: AccoesCriador; motorLigado: boolean; podeGuardar: boolean }) {
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [fontes, setFontes] = useState<FonteCarregada[]>([]);
  const [colado, setColado] = useState('');
  const [tituloColado, setTituloColado] = useState('');
  /** O texto da caixa veio da IA: a fonte entra marcada como tal, mesmo depois de editada. */
  const [coladoDaIA, setColadoDaIA] = useState(false);
  const [aLer, setALer] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [titulo, setTitulo] = useState('');
  const [tema, setTema] = useState('');
  const [aTema, setATema] = useState(false);
  const [aFontesIA, setAFontesIA] = useState<'pesquisa' | 'texto' | null>(null);
  const [recusadasIA, setRecusadasIA] = useState<string[]>([]);
  const [notaTema, setNotaTema] = useState<string | null>(null);
  const [publico, setPublico] = useState('');
  const [nivel, setNivel] = useState<Nivel>('iniciacao');
  const [minutos, setMinutos] = useState(120);

  const [aGerar, setAGerar] = useState(false);
  const [pecas, setPecas] = useState<EstadoPeca[]>([]);
  const [falhasPlano, setFalhasPlano] = useState<string[]>([]);
  const [curso, setCurso] = useState<Curso | null>(null);
  const [fontesFinais, setFontesFinais] = useState<Fonte[]>([]);
  const [guardado, setGuardado] = useState<{ id: string; slug: string; revisao: number } | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [escala, setEscala] = useState(0.62);

  const total = tamanho(fontes);
  const excede = total > LIMITES.caracteresTotal;
  const ocupado = aGerar || aTema || aFontesIA !== null;
  const podeFontesIA = motorLigado && !ocupado && titulo.trim().length >= 3 && fontes.length < LIMITES.fontes;

  /** A IA pesquisa fontes na internet ou escreve um texto-base, a partir do título (e do tema, se já houver). */
  async function pedirFontesIA(tipo: 'pesquisa' | 'texto') {
    setAFontesIA(tipo);
    setRecusadasIA([]);
    setMensagem(tipo === 'pesquisa' ? 'A IA está a pesquisar na internet e a confirmar os links…' : 'A IA está a escrever o texto-base…');
    const entrada = { titulo: titulo.trim(), tema: tema.trim(), publico: publico.trim(), nivel };
    const r = await (tipo === 'pesquisa' ? accoes.pesquisarFontes(entrada) : accoes.textoBase(entrada)).catch(() => ({
      ok: false as const,
      erro: 'Ligação interrompida.',
    }));
    setAFontesIA(null);
    if (!r.ok) {
      setMensagem(r.erro);
      return;
    }
    if (tipo === 'texto') {
      const f = r.fontes[0]!;
      setTituloColado(f.titulo);
      setColado(f.texto.slice(0, LIMITES.caracteresPorFonte));
      setColadoDaIA(true);
      setMensagem('A IA escreveu o texto na caixa «Colar texto como fonte». Reveja-o, edite o que quiser e carregue em «Juntar às fontes».');
      return;
    }
    const livres = LIMITES.fontes - fontes.length;
    const novas: FonteCarregada[] = r.fontes.slice(0, livres).map((f) => ({
      nome: f.titulo,
      tipo: f.origem === 'ia-pesquisa' ? 'web' : 'texto',
      texto: f.texto.slice(0, LIMITES.caracteresPorFonte),
      avisos: [],
      ...(f.url ? { url: f.url } : {}),
      origem: f.origem,
    }));
    setFontes((x) => [...x, ...novas]);
    setRecusadasIA([...r.recusadas]);
    setMensagem(`${novas.length} fonte(s) encontrada(s) pela IA, com o link confirmado. Reveja o texto de cada uma e retire o que não servir.`);
  }
  const podeSugerir = motorLigado && !ocupado && fontes.length > 0 && !excede && titulo.trim().length >= 3;
  const podeGerar = podeSugerir && publico.trim().length >= 3;
  /** Porque é que «Gerar» está desligado, em linguagem de quem usa o ecrã. */
  const falta = [
    !motorLigado && 'o motor dos cursos ligado',
    fontes.length === 0 && 'pelo menos uma fonte em «1. Fontes» (ficheiro, texto colado ou trazida pela IA)',
    excede && 'fontes mais pequenas (retire uma)',
    titulo.trim().length < 3 && 'o título do curso',
    publico.trim().length < 3 && '«Para quem»',
  ].filter((x): x is string => Boolean(x));

  /** A IA escreve o tema a partir do título e das fontes. Devolve o tema, ou null (com a razão no ecrã). */
  async function pedirTema(fs: Fonte[]): Promise<string | null> {
    setATema(true);
    setNotaTema(null);
    const r = await accoes
      .sugerirTema({ pedido: { titulo: titulo.trim(), publico: publico.trim(), nivel, minutos }, fontes: fs })
      .catch(() => ({ ok: false as const, erro: 'Ligação interrompida.' }));
    setATema(false);
    if (!r.ok) {
      setNotaTema(r.erro);
      return null;
    }
    if (!r.peca.valor) {
      setNotaTema(
        `A IA não propôs um tema aceitável em ${r.peca.tentativas} tentativa(s): ${descreverFalhas(r.peca.falhas).slice(0, 2).join(' ')} Escreva-o à mão.`,
      );
      return null;
    }
    setTema(r.peca.valor);
    setNotaTema(`Tema gerado pela IA a partir do título e das fontes (${r.peca.tentativas} tentativa(s)). Pode editá-lo antes de gerar.`);
    return r.peca.valor;
  }

  const fontesDoPedido = () =>
    fontes.map((f, i) => criarFonte(i + 1, f.nome, f.tipo, f.texto, { ...(f.url ? { url: f.url } : {}), ...(f.origem ? { origem: f.origem } : {}) }));

  async function carregar(lista: FileList): Promise<void> {
    setALer(true);
    const novas: FonteCarregada[] = [];
    const erros: string[] = [];
    for (const f of Array.from(lista)) {
      if (fontes.length + novas.length >= LIMITES.fontes) {
        erros.push(`No máximo ${LIMITES.fontes} fontes.`);
        break;
      }
      try {
        const { texto, avisos } = await textoDoFicheiro(f);
        if (texto.trim().length < 200) throw new ErroFicheiro(`«${f.name}» tem pouco texto para ser fonte de um curso.`);
        novas.push({
          nome: f.name.replace(/\.[a-z0-9]+$/i, ''),
          tipo: tipoDe(f.name),
          texto: texto.slice(0, LIMITES.caracteresPorFonte),
          avisos,
        });
      } catch (e) {
        erros.push(e instanceof ErroFicheiro ? e.message : `Não foi possível ler «${f.name}».`);
      }
    }
    setFontes((x) => [...x, ...novas]);
    setMensagem(erros.length ? erros.join(' ') : `${novas.length} fonte(s) lida(s) neste computador.`);
    setALer(false);
  }

  function juntarColado() {
    if (colado.trim().length < 200) {
      setMensagem('Cole pelo menos 200 caracteres de texto.');
      return;
    }
    setFontes((x) => [
      ...x,
      {
        nome: tituloColado.trim() || `Texto colado ${x.length + 1}`,
        tipo: 'texto',
        texto: colado.slice(0, LIMITES.caracteresPorFonte),
        avisos: [],
        ...(coladoDaIA ? { origem: 'ia-texto' as const } : {}),
      },
    ]);
    setColado('');
    setTituloColado('');
    setColadoDaIA(false);
  }

  const marcar = (i: number, p: EstadoPeca) => setPecas((x) => x.map((y, j) => (j === i ? p : y)));

  async function gerar() {
    setAGerar(true);
    setCurso(null);
    setGuardado(null);
    setFalhasPlano([]);
    setMensagem(null);
    const fs = fontesDoPedido();
    // Sem tema, a IA escreve-o primeiro a partir do título.
    let temaFinal = tema.trim();
    if (temaFinal.length < 3) {
      setPecas([{ rotulo: 'Tema do curso', estado: 'a-gerar' }]);
      const t = await pedirTema(fs);
      if (!t) {
        setPecas([{ rotulo: 'Tema do curso', estado: 'falhou', detalhe: 'Sem tema, o curso não foi gerado.' }]);
        setAGerar(false);
        return;
      }
      temaFinal = t;
    }
    const pedido: PedidoCurso = { titulo: titulo.trim(), tema: temaFinal, publico: publico.trim(), nivel, minutos };
    setPecas([{ rotulo: 'Plano do curso', estado: 'a-gerar' }]);

    const rp = await accoes.planear({ pedido, fontes: fs }).catch(() => ({ ok: false as const, erro: 'Ligação interrompida.' }));
    if (!rp.ok || !rp.peca.valor) {
      const falhas = rp.ok ? descreverFalhas(rp.peca.falhas) : [];
      setFalhasPlano(falhas);
      marcar(0, {
        rotulo: 'Plano do curso',
        estado: 'falhou',
        detalhe: rp.ok ? `Sem plano aceitável em ${rp.peca.tentativas} tentativa(s).` : rp.erro,
      });
      setAGerar(false);
      return;
    }
    const plano = rp.peca;
    const p = plano.valor!;
    setFalhasPlano(descreverFalhas(plano.falhas));
    const lista: EstadoPeca[] = [
      {
        rotulo: 'Plano do curso',
        estado: plano.retirados ? 'parcial' : 'ok',
        detalhe: `${p.modulos.length} módulos · ${plano.tentativas} tentativa(s)${plano.retirados ? ` · ${plano.retirados} resultado(s) retirado(s)` : ''}`,
      },
    ];
    const indices: { modulo: number; aula: number }[] = [];
    p.modulos.forEach((m, mi) =>
      m.aulas.forEach((a, ai) => {
        indices.push({ modulo: mi, aula: ai });
        lista.push({ rotulo: `${mi + 1}.${ai + 1} ${a.titulo}`, estado: 'espera' });
      }),
    );
    setPecas(lista);

    const porId = new Map(fs.flatMap((f) => f.passagens.map((x) => [x.id, x] as const)));
    const aulas: { modulo: number; aula: number; peca: Peca<Aula> }[] = [];
    for (const [k, ix] of indices.entries()) {
      const a = p.modulos[ix.modulo]!.aulas[ix.aula]!;
      const rotulo = `${ix.modulo + 1}.${ix.aula + 1} ${a.titulo}`;
      marcar(k + 1, { rotulo, estado: 'a-gerar' });
      const passagens = a.passagens.map((x) => porId.get(x)).filter((x): x is NonNullable<typeof x> => Boolean(x));
      const r = await accoes
        .escreverAula({ pedido, plano: p, ...ix, passagens })
        .catch(() => ({ ok: false as const, erro: 'Ligação interrompida.' }));
      if (!r.ok) {
        marcar(k + 1, { rotulo, estado: 'falhou', detalhe: r.erro });
        continue;
      }
      aulas.push({ ...ix, peca: r.peca });
      marcar(k + 1, {
        rotulo,
        estado: !r.peca.valor ? 'falhou' : r.peca.retirados ? 'parcial' : 'ok',
        detalhe: r.peca.valor
          ? `${r.peca.aceites} aceite(s)${r.peca.retirados ? `, ${r.peca.retirados} retirada(s)` : ''} · ${r.peca.tentativas} tentativa(s)`
          : `Nada passou a verificação em ${r.peca.tentativas} tentativa(s): ${descreverFalhas(r.peca.falhas).slice(0, 2).join(' ')}`,
      });
    }

    const c = montarCurso(pedido, fs, { plano, aulas });
    setCurso(c);
    setFontesFinais(fs);
    setMensagem(
      c
        ? 'Curso montado com o que passou a verificação. Reveja o documento.'
        : 'Nenhuma aula passou a verificação: o curso não foi montado.',
    );
    setAGerar(false);
  }

  async function guardar() {
    if (!curso || !accoes.guardar) return;
    setAGuardar(true);
    const r = await accoes
      .guardar({ id: guardado?.id ?? null, revisao: guardado?.revisao ?? null, curso, fontes: fontesFinais })
      .catch(() => ({ ok: false as const, erro: 'Ligação interrompida.' }));
    setAGuardar(false);
    if (r.ok) {
      setGuardado({ id: r.id, slug: r.slug, revisao: r.revisao });
      setMensagem('Curso guardado como rascunho. Publique-o na página do curso.');
    } else setMensagem(r.erro);
  }

  function imprimir() {
    if (!curso) return;
    const antes = document.title;
    document.title = `Curso AGORAMOZ — ${curso.titulo}`;
    window.addEventListener('afterprint', () => (document.title = antes), { once: true });
    window.print();
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 print:hidden lg:grid-cols-2">
        <section className={CAIXA} aria-labelledby={`${id}-fontes`}>
          <div>
            <h2 id={`${id}-fontes`} className="text-base font-medium">
              1. Fontes
            </h2>
            <p className={cn(AJUDA, 'mt-1')}>
              O curso nasce só daqui. Os ficheiros são lidos neste computador e partidos em passagens numeradas (F1.1, F1.2…); cada
              afirmação do curso vai citar as passagens que a sustentam. Até {LIMITES.fontes} fontes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => entrada.current?.click()} disabled={aLer || ocupado} className={BOTAO}>
              <FileUp aria-hidden className="size-4" />
              {aLer ? 'A ler…' : 'Carregar ficheiros'}
            </button>
            <span className={AJUDA}>Word (.docx), PDF com texto, .txt ou .md · até 10 MB cada</span>
            <input
              ref={entrada}
              type="file"
              multiple
              accept={ACEITES}
              className="sr-only"
              tabIndex={-1}
              aria-label="Carregar fontes do curso"
              onChange={(e) => {
                if (e.target.files?.length) carregar(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
          {fontes.length > 0 && (
            <ul role="list" className="grid gap-2" aria-label="Fontes carregadas">
              {fontes.map((f, i) => (
                <li key={i} className="flex items-start justify-between gap-3 border-t border-[color:var(--border)] pt-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">F{i + 1}</span> · {f.nome}{' '}
                    <span className={AJUDA}>
                      ({f.tipo.toUpperCase()} · {inteiro(f.texto.length)} caracteres)
                    </span>
                    {f.origem && (
                      <span className={cn(AJUDA, 'block font-medium text-[color:var(--on-surface)]')} data-origem={f.origem}>
                        {ROTULO_ORIGEM[f.origem]}
                      </span>
                    )}
                    {f.url && (
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className={cn(AJUDA, 'block break-all underline')}>
                        {f.url}
                      </a>
                    )}
                    {f.avisos.length > 0 && <span className={cn(AJUDA, 'block')}>{f.avisos.join(' ')}</span>}
                    {f.origem && (
                      <details className="mt-1">
                        <summary className={cn(AJUDA, 'cursor-pointer')}>Ver o texto</summary>
                        <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-line text-xs">{f.texto}</p>
                      </details>
                    )}
                  </span>
                  <button
                    type="button"
                    className={cn(BOTAO, 'min-h-9 px-2')}
                    disabled={ocupado}
                    onClick={() => setFontes((x) => x.filter((_, j) => j !== i))}
                    aria-label={`Retirar a fonte ${f.nome}`}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 border-t border-[color:var(--border)] pt-3">
            <p className={ROTULO}>Ou deixe a IA trazer as fontes</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => pedirFontesIA('pesquisa')} disabled={!podeFontesIA} className={BOTAO}>
                {aFontesIA === 'pesquisa' ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Globe aria-hidden className="size-4" />}
                {aFontesIA === 'pesquisa' ? 'A pesquisar…' : 'Pesquisar fontes na internet'}
              </button>
            </div>
            <p className={AJUDA}>
              {titulo.trim().length < 3
                ? 'Escreva primeiro o título do curso (em 2.): é por ele que a IA procura e escreve.'
                : 'A pesquisa traz páginas da internet com o link, confirmado daqui; o conteúdo confirma-se no link. Para um texto escrito pela IA, use «Colar texto como fonte».'}
            </p>
            {recusadasIA.length > 0 && (
              <details>
                <summary className={cn(AJUDA, 'cursor-pointer')}>O que a pesquisa trouxe e não entrou ({recusadasIA.length})</summary>
                <ul role="list" className={cn(AJUDA, 'mt-1 grid gap-1')}>
                  {recusadasIA.map((x, i) => (
                    <li key={i} className="break-all">
                      {x}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          {excede && (
            <p role="alert" className="text-sm">
              As fontes somam {inteiro(total)} caracteres; o máximo é {inteiro(LIMITES.caracteresTotal)}. Retire uma fonte.
            </p>
          )}
          <details className="grid gap-2" open={coladoDaIA || undefined}>
            <summary className="cursor-pointer text-sm">Colar texto como fonte (ou pedir à IA que o escreva)</summary>
            <div className="mt-2 grid gap-1">
              <button
                type="button"
                onClick={() => pedirFontesIA('texto')}
                disabled={!podeFontesIA}
                className={cn(BOTAO, 'justify-self-start')}
              >
                {aFontesIA === 'texto' ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <PenLine aria-hidden className="size-4" />}
                {aFontesIA === 'texto' ? 'A IA está a escrever…' : colado.trim() && coladoDaIA ? 'Escrever outro texto com IA' : 'Escrever o texto com IA'}
              </button>
              <p className={AJUDA}>
                {titulo.trim().length < 3
                  ? 'Escreva primeiro o título do curso (em 2.): é sobre ele que a IA escreve.'
                  : 'A IA escreve sobre o título do curso. Reveja e edite antes de juntar: a fonte fica marcada «Escrita pela IA, sem origem verificável», também no curso publicado.'}
              </p>
            </div>
            <label className={cn(ROTULO, 'mt-2 block')} htmlFor={`${id}-titulo-colado`}>
              Título da fonte
            </label>
            <input
              id={`${id}-titulo-colado`}
              value={tituloColado}
              onChange={(e) => setTituloColado(e.target.value)}
              maxLength={160}
              className={inputClass}
            />
            <label className={cn(ROTULO, 'mt-2 block')} htmlFor={`${id}-colado`}>
              Texto
            </label>
            <textarea
              id={`${id}-colado`}
              value={colado}
              onChange={(e) => {
                setColado(e.target.value);
                if (!e.target.value.trim()) setColadoDaIA(false);
              }}
              rows={coladoDaIA ? 14 : 6}
              disabled={aFontesIA === 'texto'}
              aria-describedby={coladoDaIA ? `${id}-colado-ia` : undefined}
              className={cn(inputClass, 'min-h-0 text-sm')}
            />
            {coladoDaIA && (
              <p id={`${id}-colado-ia`} className={cn(AJUDA, 'font-medium text-[color:var(--on-surface)]')}>
                Texto escrito pela IA. Ao juntar, fica marcado «Escrita pela IA, sem origem verificável», mesmo que o edite.
              </p>
            )}
            <button type="button" onClick={juntarColado} disabled={aFontesIA === 'texto'} className={cn(BOTAO, 'mt-2 justify-self-start')}>
              Juntar às fontes
            </button>
          </details>
        </section>

        <section className={CAIXA} aria-labelledby={`${id}-pedido`}>
          <h2 id={`${id}-pedido`} className="text-base font-medium">
            2. O curso
          </h2>
          <div className="grid gap-1">
            <label className={ROTULO} htmlFor={`${id}-titulo`}>
              Título do curso
            </label>
            <input
              id={`${id}-titulo`}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={LIMITES.curto}
              className={inputClass}
              placeholder="Ex.: Gestão de stock num armazém"
              aria-describedby={`${id}-titulo-ajuda`}
            />
            <p id={`${id}-titulo-ajuda`} className={AJUDA}>
              Fica tal e qual no curso. O tema, os resultados, os módulos e as aulas alinham-se por ele; o que as fontes têm e não serve o
              título fica de fora.
            </p>
          </div>
          <div className="grid gap-1">
            <label className={ROTULO} htmlFor={`${id}-publico`}>
              Para quem
            </label>
            <input
              id={`${id}-publico`}
              value={publico}
              onChange={(e) => setPublico(e.target.value)}
              maxLength={300}
              className={inputClass}
              placeholder="Ex.: Responsáveis de armazém sem formação prévia"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className={ROTULO} htmlFor={`${id}-nivel`}>
                Nível
              </label>
              <select id={`${id}-nivel`} value={nivel} onChange={(e) => setNivel(e.target.value as Nivel)} className={inputClass}>
                {NIVEIS.map((n) => (
                  <option key={n} value={n}>
                    {ROTULO_NIVEL[n]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <label className={ROTULO} htmlFor={`${id}-minutos`}>
                Duração aproximada (minutos)
              </label>
              <input
                id={`${id}-minutos`}
                type="number"
                min={15}
                max={1200}
                step={15}
                value={minutos}
                onChange={(e) => setMinutos(Math.min(1200, Math.max(15, Number(e.target.value) || 15)))}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className={ROTULO} htmlFor={`${id}-tema`}>
                Tema (gerado pela IA)
              </label>
              <button type="button" onClick={() => pedirTema(fontesDoPedido())} disabled={!podeSugerir} className={cn(BOTAO, 'min-h-9')}>
                {aTema ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Sparkles aria-hidden className="size-4" />}
                {aTema ? 'A gerar o tema…' : tema.trim() ? 'Gerar outro tema' : 'Gerar o tema com IA'}
              </button>
            </div>
            <textarea
              id={`${id}-tema`}
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              maxLength={LIMITES.tema}
              rows={4}
              disabled={aTema}
              className={cn(inputClass, 'min-h-0 text-sm')}
              placeholder="A IA escreve-o a partir do título e das fontes. Se ficar vazio, é gerado ao carregar em «Gerar e verificar»."
              aria-describedby={`${id}-tema-ajuda`}
            />
            <p id={`${id}-tema-ajuda`} className={AJUDA} aria-live="polite">
              {notaTema ?? 'O que o curso trata para cumprir o título, só com o que as fontes cobrem. Orienta o plano; não é publicado.'}
            </p>
          </div>
          <button type="button" onClick={gerar} disabled={!podeGerar} className={cn(BOTAO_PRIMARIO, 'justify-self-start')}>
            {aGerar ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Sparkles aria-hidden className="size-4" />}
            {aGerar ? 'A gerar e a verificar…' : '3. Gerar e verificar o curso'}
          </button>
          {!ocupado && falta.length > 0 && (
            <p className="text-sm" data-falta>
              Para gerar, falta: {falta.join('; ')}.
            </p>
          )}
          {!motorLigado && (
            <p className={AJUDA} role="note">
              O motor dos cursos está desligado. Para ligar: criar a função agoramoz_llm no ZabaEdu e definir CURSOS_ENGINE,
              ZABAEDU_FUNCTION_URL e ZABAEDU_CHAVE na Vercel (docs/CURSOS.md).
            </p>
          )}
          <p className={AJUDA}>
            Cada peça é gerada pelo motor e verificada aqui: passagens que existem, citações literais, números que estão nas fontes,
            palavras-chave que as fontes sustentam. O que falha volta ao motor com a razão (até 3 vezes); o que nunca passa é retirado e
            fica no relatório.
          </p>
        </section>
      </div>

      {mensagem && (
        <p role="status" className="text-sm print:hidden">
          {mensagem}
        </p>
      )}

      {pecas.length > 0 && (
        <section className={cn(CAIXA, 'print:hidden')} aria-labelledby={`${id}-progresso`} aria-live="polite">
          <h2 id={`${id}-progresso`} className="text-base font-medium">
            Geração e verificação
          </h2>
          <ol role="list" className="grid gap-1 text-sm">
            {pecas.map((x, i) => (
              <li key={i} className="flex items-start gap-2" data-estado={x.estado}>
                {x.estado === 'ok' && <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />}
                {x.estado === 'parcial' && <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 opacity-60" />}
                {x.estado === 'falhou' && <XCircle aria-hidden className="mt-0.5 size-4 shrink-0" />}
                {x.estado === 'a-gerar' && <Loader2 aria-hidden className="mt-0.5 size-4 shrink-0 animate-spin" />}
                {x.estado === 'espera' && <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 opacity-50" />}
                <span>
                  <span className="sr-only">
                    {
                      {
                        ok: 'Verificada: ',
                        parcial: 'Verificada com retirados: ',
                        falhou: 'Falhou: ',
                        'a-gerar': 'A gerar: ',
                        espera: 'Em espera: ',
                      }[x.estado]
                    }
                  </span>
                  {x.rotulo}
                  {x.detalhe && <span className={cn(AJUDA, 'block')}>{x.detalhe}</span>}
                </span>
              </li>
            ))}
          </ol>
          {falhasPlano.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm">O que o verificador recusou no plano ({falhasPlano.length})</summary>
              <ul role="list" className={cn(AJUDA, 'mt-2 grid gap-1')}>
                {falhasPlano.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {curso && (
        <>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button type="button" onClick={imprimir} className={BOTAO_PRIMARIO}>
              <Printer aria-hidden className="size-4" />
              Descarregar PDF
            </button>
            {podeGuardar && accoes.guardar && (
              <button type="button" onClick={guardar} disabled={aGuardar} className={BOTAO}>
                <Save aria-hidden className="size-4" />
                {aGuardar ? 'A guardar…' : guardado ? 'Guardar outra vez' : 'Guardar como rascunho'}
              </button>
            )}
            {guardado && (
              <Link href={`/admin/cursos/${guardado.id}`} className="text-sm underline">
                Abrir o curso guardado (publicar)
              </Link>
            )}
            <label className="ml-auto flex items-center gap-2 text-sm">
              Zoom
              <input type="range" min={0.35} max={1} step={0.05} value={escala} onChange={(e) => setEscala(Number(e.target.value))} />
              <span className="w-10 tabular-nums">{Math.round(escala * 100)}%</span>
            </label>
          </div>
          <p className={cn(AJUDA, 'print:hidden')}>
            Em «Descarregar PDF», escolha «Guardar como PDF», papel A4, margens «Nenhuma» e com gráficos de fundo.
          </p>
          <div className="overflow-x-auto" style={{ '--escala': escala } as CSSProperties}>
            <DocumentoCurso curso={curso} />
          </div>
        </>
      )}
    </div>
  );
}
