import type { Aula, Bloco, Exercicio, Pergunta, Resultado } from './modelo';

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
  | 'opcoes_repetidas'
  | 'grafico_sem_fonte'
  | 'conta_errada'
  | 'dados_sem_fonte'
  | 'motor_falhou';

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
  grafico_sem_fonte: 'tem no gráfico um valor que não está nas passagens citadas',
  conta_errada: 'tem uma conta que não dá o resultado escrito',
  dados_sem_fonte: 'diz que os dados vêm das fontes, mas um valor não está nas passagens citadas',
  motor_falhou: 'o motor (ZabaEdu) não deu resposta',
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

/** Os números de `texto` (fora os tolerados) que não aparecem em `fonte`. */
export function numerosForaDasFontes(texto: string, fonte: string): string[] {
  const nf = numeros(fonte);
  return numeros(texto)
    .filter((n) => !tolerado(n) && !nf.some((x) => x.valor === n.valor))
    .map((n) => n.bruto);
}

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
  const texto = [b.texto, ...(b.itens ?? []), b.grafico?.titulo ?? ''].join('\n');
  const falhas = verificarAfirmacao(onde, texto, b.fontes, ctx, MIN_SUPORTE, b.tipo === 'citacao' ? (b.citacao ?? '') : b.citacao).falhas;
  if (b.tipo === 'grafico') {
    if (!b.grafico) falhas.push({ onde, motivo: 'grafico_sem_fonte', detalhe: 'sem dados' });
    else {
      const nf = numeros(textosCitados(b.fontes, ctx));
      for (const x of b.grafico.series) {
        if (!nf.some((n) => n.valor === x.valor)) falhas.push({ onde, motivo: 'grafico_sem_fonte', detalhe: `${x.rotulo}: ${x.valor}` });
        for (const n of numeros(x.rotulo))
          if (!tolerado(n) && !nf.some((y) => y.valor === n.valor)) falhas.push({ onde, motivo: 'numero_sem_fonte', detalhe: n.bruto });
      }
    }
  }
  return falhas;
}

function textosCitados(ids: readonly string[], ctx: Contexto): string {
  return ids
    .map((id) => ctx.passagens.get(id))
    .filter((x): x is string => x !== undefined)
    .join('\n');
}

/* -------------------------------------------------------------- contas */

/**
 * Calcula uma expressão simples, escrita à portuguesa: números com vírgula
 * decimal e espaço nos milhares («1 735 000», «32,0»), `+ − - × x * / ÷` e
 * parênteses. Devolve `null` se não souber ler.
 */
export function avaliar(expr: string): number | null {
  const t = expr
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[−–]/g, '-')
    .replace(/[×x*]/g, '*')
    .replace(/÷/g, '/');
  const fichas: (number | string)[] = [];
  const re = /\s*(?:(\d{1,3}(?: \d{3})+(?:,\d+)?|\d+(?:,\d+)?)|([-+*/()]))/y;
  let i = 0;
  while (i < t.length) {
    if (/^\s*$/.test(t.slice(i))) break;
    re.lastIndex = i;
    const m = re.exec(t);
    if (!m) return null;
    fichas.push(m[1] !== undefined ? Number(m[1].replace(/ /g, '').replace(',', '.')) : m[2]!);
    i = re.lastIndex;
  }
  let p = 0;
  const prim = (): number | null => {
    const f = fichas[p];
    if (f === '(') {
      p += 1;
      const v = soma();
      if (fichas[p] !== ')') return null;
      p += 1;
      return v;
    }
    if (f === '-') {
      p += 1;
      const v = prim();
      return v === null ? null : -v;
    }
    if (typeof f === 'number') {
      p += 1;
      return f;
    }
    return null;
  };
  const produto = (): number | null => {
    let v = prim();
    while (v !== null && (fichas[p] === '*' || fichas[p] === '/')) {
      const op = fichas[p];
      p += 1;
      const d = prim();
      if (d === null || (op === '/' && d === 0)) return null;
      v = op === '*' ? v * d : v / d;
    }
    return v;
  };
  const soma = (): number | null => {
    let v = produto();
    while (v !== null && (fichas[p] === '+' || fichas[p] === '-')) {
      const op = fichas[p];
      p += 1;
      const d = produto();
      if (d === null) return null;
      v = op === '+' ? v + d : v - d;
    }
    return v;
  };
  const v = soma();
  return v !== null && p === fichas.length && Number.isFinite(v) ? v : null;
}

/** «a = b»: a conta está certa ao arredondamento das casas decimais escritas em b. */
export function contaCerta(linha: string): { certa: boolean; resultado: number | null; termos: number[] } {
  const [esq, dir, ...resto] = linha.split('=');
  if (!esq || dir === undefined || resto.length) return { certa: false, resultado: null, termos: [] };
  const calc = avaliar(esq);
  const res = avaliar(dir.replace(/%/g, ''));
  const termos = numeros(esq).map((n) => n.valor);
  if (calc === null || res === null) return { certa: false, resultado: res, termos };
  const casas = (dir.trim().split(',')[1] ?? '').replace(/\D/g, '').length;
  return { certa: Math.abs(calc - res) <= 0.5 * 10 ** -casas + 1e-9, resultado: res, termos };
}

/**
 * O exercício: as passagens existem; os dados «das fontes» estão nas
 * passagens; cada conta está certa e só usa números das fontes, dos dados ou
 * de contas anteriores; e os números do enunciado e da solução saem daí.
 * O texto do exercício não passa pelo suporte lexical: é uma tarefa, não uma
 * afirmação — os factos vão nos blocos da aula.
 */
export function verificarExercicio(e: Exercicio, ctx: Contexto, onde = 'exercício'): Falha[] {
  const falhas: Falha[] = [];
  for (const id of e.fontes) {
    if (!ctx.passagens.has(id)) falhas.push({ onde, motivo: 'passagem_inexistente', detalhe: id });
    else if (ctx.permitidas && !ctx.permitidas.has(id)) falhas.push({ onde, motivo: 'passagem_fora_da_aula', detalhe: id });
  }
  const daFonte = numeros(textosCitados(e.fontes, ctx)).map((n) => n.valor);
  const dosDados = e.dados ? e.dados.linhas.flatMap((l) => l.flatMap((c) => numeros(c).map((n) => n.valor))) : [];
  if (e.dados?.origem === 'fontes')
    for (const v of dosDados) if (!daFonte.includes(v)) falhas.push({ onde, motivo: 'dados_sem_fonte', detalhe: String(v) });
  const conhecidos = new Set<number>([...daFonte, ...dosDados]);
  const perto = (v: number) => [...conhecidos].some((k) => Math.abs(k - v) < 1e-9);
  for (const c of e.contas ?? []) {
    const r = contaCerta(c);
    if (!r.certa) falhas.push({ onde, motivo: 'conta_errada', detalhe: c.slice(0, 80) });
    // 100 converte em percentagem: é uma constante da conta, não um facto.
    for (const t of r.termos)
      if (!(Number.isInteger(t) && t <= 10) && t !== 100 && !perto(t))
        falhas.push({ onde, motivo: 'numero_sem_fonte', detalhe: `${t} em «${c.slice(0, 40)}»` });
    if (r.resultado !== null) conhecidos.add(r.resultado);
  }
  // No enunciado de uma tarefa, um ano («preveja 2026») é o alvo, não um facto: tolerado.
  const ano = (n: { valor: number; pct: boolean }) => !n.pct && Number.isInteger(n.valor) && n.valor >= 1900 && n.valor <= 2100;
  for (const n of numeros([e.contexto, ...e.passos, e.entregavel, e.solucao].join('\n')))
    if (!tolerado(n) && !ano(n) && !perto(n.valor)) falhas.push({ onde, motivo: 'numero_sem_fonte', detalhe: n.bruto });
  return falhas;
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
  readonly exercicio?: Exercicio;
  readonly falhas: Falha[];
  /** Quantas afirmações foram verificadas (antes de retirar as que falharam). */
  readonly total: number;
}

export function verificarConteudoAula(c: Pick<Aula, 'blocos' | 'perguntas'> & { exercicio?: Exercicio }, ctx: Contexto): AulaVerificada {
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
  let exercicio: Exercicio | undefined;
  if (c.exercicio) {
    const f = verificarExercicio(c.exercicio, ctx);
    falhas.push(...f);
    if (!f.length) exercicio = c.exercicio;
  }
  return {
    blocos,
    perguntas,
    ...(exercicio ? { exercicio } : {}),
    falhas,
    total: c.blocos.length + c.perguntas.length + (c.exercicio ? 1 : 0),
  };
}

/** Uma linha por falha, para devolver ao motor na tentativa seguinte. */
export function descreverFalhas(falhas: readonly Falha[]): string[] {
  return falhas.map((f) => `${f.onde}: ${EXPLICA[f.motivo]}${f.detalhe ? ` (${f.detalhe})` : ''}.`);
}
