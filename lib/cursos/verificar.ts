import type { Aula, Bloco, Pergunta, Resultado } from './modelo';

/**
 * O verificador (D-49): determinístico, sem segundo modelo.
 *
 * A IA escreve; isto decide o que fica. Cada afirmação traz as passagens que
 * a sustentam (`F1.3`) e tem de passar, contra o texto dessas passagens:
 *
 * 1. **Existência** — as passagens citadas existem e estão entre as que o
 *    plano destinou àquela aula (não se cita o que não se leu).
 * 2. **Citação literal** — uma citação aparece, palavra a palavra (sem contar
 *    acentos, maiúsculas e pontuação), numa das passagens citadas.
 * 3. **Números** — cada número escrito (valores, datas, percentagens) está
 *    nas passagens citadas. Os inteiros de 0 a 10 sem `%` são tolerados:
 *    são estrutura («3 passos»), não factos.
 * 4. **Suporte lexical** — pelo menos `MIN_SUPORTE` das palavras de conteúdo
 *    (radicais) do texto estão nas passagens citadas. Uma paráfrase fiel
 *    passa; uma ideia que não está lá, não.
 *
 * Não prova que a frase é verdadeira — prova que vem das fontes, que é o que
 * se prometeu. Quem cria o curso responde pelas fontes que carrega.
 */

export const MIN_SUPORTE = 0.5;
/** Os resultados de aprendizagem resumem várias aulas: exige-se um pouco menos. */
export const MIN_SUPORTE_RESULTADO = 0.4;

export type Motivo =
  | 'passagem_inexistente'
  | 'passagem_fora_da_aula'
  | 'citacao_nao_literal'
  | 'numero_sem_fonte'
  | 'suporte_fraco'
  | 'opcoes_repetidas';

export interface Falha {
  /** Onde: «bloco 3», «pergunta 2», «resultado 1». */
  readonly onde: string;
  readonly motivo: Motivo;
  readonly detalhe: string;
}

export const EXPLICA: Readonly<Record<Motivo, string>> = {
  passagem_inexistente: 'cita uma passagem que não existe',
  passagem_fora_da_aula: 'cita uma passagem que não foi dada a esta aula',
  citacao_nao_literal: 'a citação não aparece, palavra a palavra, na passagem',
  numero_sem_fonte: 'tem um número que não está nas passagens citadas',
  suporte_fraco: 'diz coisas que as passagens citadas não dizem',
  opcoes_repetidas: 'tem opções de resposta repetidas',
};

/* -------------------------------------------------------------- normalizar */

/** Minúsculas, sem acentos, sem pontuação, espaços simples. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[‘’“”«»"'`]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const VAZIAS = new Set(
  (
    'para pela pelo pelos pelas como mais menos muito muita muitos muitas que qual quais quando onde esta este estes estas isto isso aquilo ' +
    'essa esse esses essas aquela aquele seus suas sua seu nosso nossa nossos nossas deve devem pode podem sobre entre ainda tambem cada ' +
    'todo toda todos todas outro outra outros outras mesmo mesma depois antes ja nao sim sao foram sera serao seja sejam ser estar esta ' +
    'tem tinha tendo sido havia haver assim bem porque pois entao enquanto desde ate apos sem com contra num numa nuns numas dos das nos nas ' +
    'aos uma umas uns' +
    ' with from that this have they their which will would there were what when your into than then them these those also only'
  ).split(' '),
);

/** Radical grosseiro: as 6 primeiras letras chegam para «aprender/aprendizagem», «verificar/verificação». */
export function radicais(s: string): string[] {
  return normalizar(s)
    .split(' ')
    .filter((p) => p.length >= 4 && !VAZIAS.has(p) && !/^\d+$/.test(p))
    .map((p) => p.slice(0, 6));
}

/**
 * Os números de um texto, normalizados: «1 735 000» → 1735000, «12,5%» → 12.5,
 * «2024» → 2024. Devolve o valor e se era percentagem.
 */
export function numeros(s: string): { valor: number; pct: boolean; bruto: string }[] {
  const t = s.replace(/[\u00a0\u202f]/g, ' ');
  const re = /(?<![\w.,])(\d{1,3}(?:[ .]\d{3})+|\d+)(?:,(\d+)|\.(\d{1,2})(?!\d))?\s*(%|por cento)?/g;
  const out: { valor: number; pct: boolean; bruto: string }[] = [];
  for (const m of t.matchAll(re)) {
    const inteiro = m[1]!.replace(/[ .]/g, '');
    const dec = m[2] ?? m[3];
    out.push({ valor: Number(dec ? `${inteiro}.${dec}` : inteiro), pct: Boolean(m[4]), bruto: m[0].trim() });
  }
  return out;
}

const tolerado = (n: { valor: number; pct: boolean }) => !n.pct && Number.isInteger(n.valor) && n.valor <= 10;

/* ---------------------------------------------------------------- verificar */

export interface Contexto {
  /** Todas as passagens do curso, por id. */
  readonly passagens: ReadonlyMap<string, string>;
  /** As que o plano deu a esta aula; sem isto, vale qualquer passagem existente. */
  readonly permitidas?: ReadonlySet<string>;
}

/** Fracção dos radicais de `texto` presentes em `fonte` (1 se o texto não tem radicais). */
export function suporte(texto: string, fonte: string): number {
  const r = radicais(texto);
  if (!r.length) return 1;
  const f = new Set(radicais(fonte));
  return r.filter((x) => f.has(x)).length / r.length;
}

function verificarAfirmacao(
  onde: string,
  texto: string,
  ids: readonly string[],
  ctx: Contexto,
  minSuporte: number,
  citacao?: string,
): { falhas: Falha[]; suporte: number } {
  const falhas: Falha[] = [];
  const textos: string[] = [];
  for (const id of ids) {
    const p = ctx.passagens.get(id);
    if (p === undefined) falhas.push({ onde, motivo: 'passagem_inexistente', detalhe: id });
    else if (ctx.permitidas && !ctx.permitidas.has(id)) falhas.push({ onde, motivo: 'passagem_fora_da_aula', detalhe: id });
    else textos.push(p);
  }
  if (!textos.length) return { falhas, suporte: 0 };
  const fonte = textos.join('\n');

  if (citacao !== undefined) {
    const c = normalizar(citacao);
    if (!c || !textos.some((p) => ` ${normalizar(p)} `.includes(` ${c} `)))
      falhas.push({ onde, motivo: 'citacao_nao_literal', detalhe: citacao.slice(0, 80) });
  }

  const nf = numeros(fonte);
  for (const n of numeros(`${texto} ${citacao ?? ''}`)) {
    if (tolerado(n)) continue;
    if (!nf.some((x) => x.valor === n.valor)) falhas.push({ onde, motivo: 'numero_sem_fonte', detalhe: n.bruto });
  }

  const s = suporte(texto, fonte);
  if (s < minSuporte) falhas.push({ onde, motivo: 'suporte_fraco', detalhe: `${Math.round(s * 100)}% das palavras-chave nas fontes` });
  return { falhas, suporte: s };
}

export function verificarBloco(b: Bloco, ctx: Contexto, onde = 'bloco'): Falha[] {
  const texto = [b.texto, ...(b.itens ?? [])].join('\n');
  return verificarAfirmacao(onde, texto, b.fontes, ctx, MIN_SUPORTE, b.tipo === 'citacao' ? (b.citacao ?? '') : b.citacao).falhas;
}

export function verificarPergunta(p: Pergunta, ctx: Contexto, onde = 'pergunta'): Falha[] {
  const falhas: Falha[] = [];
  if (new Set(p.opcoes.map(normalizar)).size !== p.opcoes.length) falhas.push({ onde, motivo: 'opcoes_repetidas', detalhe: '' });
  // O que tem de vir das fontes: a resposta certa e a justificação.
  const texto = `${p.opcoes[p.correcta] ?? ''}\n${p.justificacao}`;
  falhas.push(...verificarAfirmacao(onde, texto, p.fontes, ctx, MIN_SUPORTE).falhas);
  return falhas;
}

export function verificarResultado(r: Resultado, ctx: Contexto, onde = 'resultado'): Falha[] {
  return verificarAfirmacao(onde, r.texto, r.fontes, ctx, MIN_SUPORTE_RESULTADO).falhas;
}

export interface AulaVerificada {
  /** Só o que passou. */
  readonly blocos: Bloco[];
  readonly perguntas: Pergunta[];
  readonly falhas: Falha[];
  /** Quantas afirmações foram verificadas (antes de retirar as que falharam). */
  readonly total: number;
}

export function verificarConteudoAula(c: Pick<Aula, 'blocos' | 'perguntas'>, ctx: Contexto): AulaVerificada {
  const falhas: Falha[] = [];
  const blocos = c.blocos.filter((b, i) => {
    const f = verificarBloco(b, ctx, `bloco ${i + 1}`);
    falhas.push(...f);
    return f.length === 0;
  });
  const perguntas = c.perguntas.filter((p, i) => {
    const f = verificarPergunta(p, ctx, `pergunta ${i + 1}`);
    falhas.push(...f);
    return f.length === 0;
  });
  return { blocos, perguntas, falhas, total: c.blocos.length + c.perguntas.length };
}

/** Uma linha por falha, para devolver ao motor na tentativa seguinte. */
export function descreverFalhas(falhas: readonly Falha[]): string[] {
  return falhas.map((f) => `${f.onde}: ${EXPLICA[f.motivo]}${f.detalhe ? ` (${f.detalhe})` : ''}.`);
}
