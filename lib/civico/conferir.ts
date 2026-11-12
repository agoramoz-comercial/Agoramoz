import type { Bloco, Resposta, Trecho } from './resposta';
import { textoDosBlocos } from './resposta';

/**
 * O conferidor: o que não foi conferido no texto oficial não chega a quem lê.
 *
 * Um modelo de linguagem não deixa de inventar por lho pedirem. Medido a
 * 2026-11-12, com a nota de vigência já a seguir em cada pedido, o motor
 * ainda escreveu um artigo com número, epígrafe e texto entre aspas que não
 * existem. O que se pode garantir não é que o modelo acerte — é que três
 * coisas, as que mais mal fazem quando são falsas, só passam conferidas:
 *
 * 1. **Citações entre aspas.** Ficam se estiverem, palavra por palavra, no
 *    corpus (`corpus.ts`). Senão, o bloco inteiro sai e fica uma nota.
 * 2. **Números de artigo.** Ficam se forem de um artigo que demos ao motor
 *    nesta resposta. Um número que o motor foi buscar à memória sai.
 * 3. **Contactos.** Um número de telefone escrito por um modelo não é um
 *    contacto: sai sempre.
 *
 * É determinístico: expressões regulares e comparação de texto, sem segundo
 * modelo a «avaliar» o primeiro. Custa respostas menos ricas — é o preço
 * certo para informação sobre a lei.
 *
 * Sem dependências de servidor: corre também no browser, sobre o texto que
 * ainda está a chegar, para que nem a meio da escrita apareça uma citação por
 * conferir. Aí `citacaoConferida` é sempre falsa; a resposta final, conferida
 * no servidor, repõe as que conferem.
 */

/** Um artigo do texto oficial, tal como segue para o motor e para o ecrã. */
export interface ArtigoOficial {
  /** `Lei n.º 13/2023, de 25 de Agosto`. */
  readonly diploma: string;
  /** `Lei do Trabalho`. */
  readonly titulo: string;
  /** `13/2023`. */
  readonly numero: string;
  readonly n: number;
  readonly epigrafe: string;
  readonly paragrafos: readonly string[];
  /** O artigo é mais longo do que o que aqui vai. */
  readonly cortado: boolean;
  readonly fonte: { readonly titulo: string; readonly href: string };
}

export interface Conferencia {
  /** Citações entre aspas retiradas por não constarem do texto oficial. */
  readonly citacoes: number;
  /** Números de artigo retirados por não serem dos artigos conferidos. */
  readonly artigos: number;
  /** Contactos retirados. */
  readonly contactos: number;
}

export interface OpcoesDeConferencia {
  /** Os números dos artigos que seguiram para o motor nesta resposta. */
  readonly artigos: ReadonlySet<number>;
  readonly citacaoConferida: (citacao: string) => boolean;
  /**
   * A pergunta de quem perguntou. Um termo entre aspas que vem dela («o
   * "Tribunal Arbitral dos Inquilinos" existe?») é o motor a repetir a
   * pessoa, não a citar a lei.
   */
  readonly pergunta?: string;
}

export const MARCA_ARTIGO = 'artigo [número por confirmar]';
export const MARCA_ARTIGOS = 'artigos [números por confirmar]';
export const MARCA_CONTACTO = '[contacto retirado: confirme no sítio oficial da instituição]';
export const NOTA_CITACAO =
  'Citação retirada: o texto que o assistente citou aqui não foi encontrado no texto oficial que conferimos.';

/** Texto entre aspas com tamanho de frase. Se é mesmo uma citação, decide `eCitacao`. */
const CITACAO = /(["“«])([^"“”«»]{25,900})(["”»])/gu;

/** Palavras que ligam um nome próprio sem lhe tirar a natureza de nome. */
const LIGACOES = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'para', 'a', 'o', 'em']);

/** Sem acentos, sem pontuação, minúsculas — para comparar com a pergunta. */
const plano = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * O que está entre aspas é uma citação de lei, ou um nome ou um termo?
 *
 * Medido com o motor real a 2026-11-12: a resposta «Não existe em Moçambique
 * uma instituição denominada "Tribunal Arbitral dos Inquilinos"» perdia o
 * parágrafo inteiro — e era precisamente a frase certa. Um nome
 * (todas as palavras com maiúscula, tirando as de ligação), um termo de
 * menos de cinco palavras, ou um pedaço da própria pergunta não são
 * citações: não afirmam o que a lei diz.
 */
function eCitacao(dentro: string, pergunta: string | undefined): boolean {
  const palavras = dentro.trim().split(/\s+/u);
  if (palavras.length < 5) return false;
  const eNome = palavras.every((p) => LIGACOES.has(p.toLowerCase()) || /^[\p{Lu}\d]/u.test(p));
  if (eNome) return false;
  if (pergunta) {
    const d = plano(dentro);
    if (d.length > 0 && plano(pergunta).includes(d)) return false;
  }
  return true;
}

/** «artigo 13», «Artigo 13.º», «art. 130», «arts. 12 e 13», «artigos 2133.º, 2134.º e 2135.º». */
const ARTIGO =
  /\b(art(?:igo|\.)?(s)?\.?)\s*(\d{1,4})(?:\.?\s?[ºo°])?((?:\s*(?:,|e|a)\s*\d{1,4}(?:\.?\s?[ºo°])?)*)(?![\d/])/giu;

/**
 * Um telefone: oito ou mais algarismos, com espaços ou hífenes pelo meio e
 * prefixo opcional. Um valor («25 000 000 MT») ou um prazo não são contactos.
 */
const CONTACTO =
  /(?<![\d/.,])(?:\+\s?258[\s-]?)?\d(?:[\s-]?\d){7,11}(?![\d/]|[.,]\d|\s*(?:MT|MZN|meticais|d[oó]lares|USD|EUR|euros|%|dias|anos|meses|horas))/giu;

interface Contagem {
  citacoes: number;
  artigos: number;
  contactos: number;
}

function limpar(texto: string, opcoes: OpcoesDeConferencia, conta: Contagem): { texto: string; citacaoRetirada: boolean } {
  let citacaoRetirada = false;

  let saida = texto.replace(CITACAO, (tudo, _abre: string, dentro: string) => {
    if (!eCitacao(dentro, opcoes.pergunta) || opcoes.citacaoConferida(dentro)) return tudo;
    conta.citacoes += 1;
    citacaoRetirada = true;
    return '';
  });

  saida = saida.replace(ARTIGO, (tudo, _palavra: string, plural: string | undefined, primeiro: string, resto: string) => {
    const numeros = [primeiro, ...(resto.match(/\d{1,4}/g) ?? [])].map(Number);
    if (numeros.every((n) => opcoes.artigos.has(n))) return tudo;
    conta.artigos += numeros.length;
    return plural || numeros.length > 1 ? MARCA_ARTIGOS : MARCA_ARTIGO;
  });

  saida = saida.replace(CONTACTO, () => {
    conta.contactos += 1;
    return MARCA_CONTACTO;
  });

  return { texto: saida, citacaoRetirada };
}

function limparTrechos(
  trechos: readonly Trecho[],
  opcoes: OpcoesDeConferencia,
  conta: Contagem,
): { trechos: Trecho[]; citacaoRetirada: boolean } {
  let citacaoRetirada = false;
  const saida = trechos.map((x) => {
    // O rótulo de uma ligação é o título de uma fonte, não uma afirmação sobre a lei.
    if (x.t === 'ligacao') return x;
    const r = limpar(x.v, opcoes, conta);
    citacaoRetirada ||= r.citacaoRetirada;
    return { ...x, v: r.texto };
  });
  return { trechos: saida.filter((x) => x.v.trim() !== '' || x.t === 'ligacao'), citacaoRetirada };
}

const nota = (): Bloco => ({ tipo: 'paragrafo', trechos: [{ t: 'enfase', v: NOTA_CITACAO }] });

/**
 * Passa a resposta pelo conferidor. Devolve a resposta limpa e a contagem do
 * que saiu — que a página mostra, porque retirar em silêncio seria outra
 * forma de não dizer a verdade.
 */
export function conferir(resposta: Resposta, opcoes: OpcoesDeConferencia): { resposta: Resposta; conferencia: Conferencia } {
  const conta: Contagem = { citacoes: 0, artigos: 0, contactos: 0 };
  const blocos: Bloco[] = [];

  for (const bloco of resposta.blocos) {
    switch (bloco.tipo) {
      case 'titulo': {
        blocos.push({ ...bloco, texto: limpar(bloco.texto, opcoes, conta).texto.trim() || bloco.texto });
        break;
      }
      case 'paragrafo':
      case 'citacao': {
        const r = limparTrechos(bloco.trechos, opcoes, conta);
        // Sem a citação, o que sobra do bloco («Artigo x — [Lei y]:») é uma
        // atribuição sem nada atribuído: sai o bloco, fica a nota.
        if (r.citacaoRetirada) blocos.push(nota());
        else if (r.trechos.length) blocos.push({ ...bloco, trechos: r.trechos });
        break;
      }
      case 'lista': {
        const itens = bloco.itens
          .map((item) => {
            const r = limparTrechos(item, opcoes, conta);
            return r.citacaoRetirada ? [{ t: 'enfase', v: NOTA_CITACAO } as Trecho] : r.trechos;
          })
          .filter((item) => item.length > 0);
        if (itens.length) blocos.push({ ...bloco, itens });
        break;
      }
      case 'tabela': {
        const celula = (c: string) => limpar(c, opcoes, conta).texto;
        blocos.push({ ...bloco, cabecalho: bloco.cabecalho.map(celula), linhas: bloco.linhas.map((l) => l.map(celula)) });
        break;
      }
    }
  }

  // Duas notas seguidas dizem o mesmo: fica uma.
  const semRepetir = blocos.filter((b, i) => !(i > 0 && eNota(b) && eNota(blocos[i - 1]!)));
  return {
    resposta: { blocos: semRepetir, fontes: resposta.fontes, texto: textoDosBlocos(semRepetir) },
    conferencia: conta,
  };
}

function eNota(b: Bloco): boolean {
  return b.tipo === 'paragrafo' && b.trechos.length === 1 && b.trechos[0]!.v === NOTA_CITACAO;
}

/* --------------------------------------------------------------- validação */

const eTexto = (v: unknown): v is string => typeof v === 'string';

export function validarOficial(x: unknown): x is ArtigoOficial[] {
  return (
    Array.isArray(x) &&
    x.length <= 8 &&
    x.every((a: Partial<ArtigoOficial> | null) => {
      return (
        !!a &&
        eTexto(a.diploma) &&
        eTexto(a.titulo) &&
        eTexto(a.numero) &&
        Number.isInteger(a.n) &&
        eTexto(a.epigrafe) &&
        Array.isArray(a.paragrafos) &&
        a.paragrafos.every(eTexto) &&
        typeof a.cortado === 'boolean' &&
        !!a.fonte &&
        eTexto(a.fonte.titulo) &&
        eTexto(a.fonte.href) &&
        /^https:\/\//.test(a.fonte.href)
      );
    })
  );
}

export function validarConferencia(x: unknown): x is Conferencia {
  const c = x as Partial<Conferencia> | null;
  return !!c && [c.citacoes, c.artigos, c.contactos].every((n) => Number.isInteger(n) && (n as number) >= 0);
}
