import { LIMITES, type Pergunta, type SpecInquerito, type TipoPergunta } from './spec';

/**
 * As operações do construtor do admin, puras — o componente só guarda o
 * estado e chama isto. Testadas sem browser.
 *
 * As chaves (de pergunta e de opção) são geradas aqui e NUNCA mudam com a
 * edição do texto: os resultados agregam por chave, através das versões. Um
 * título corrigido depois de publicar não pode partir a série de respostas.
 */

type Idioma = SpecInquerito['idioma'];

export const TIPOS: readonly TipoPergunta[] = [
  'escolha_unica',
  'escolha_multipla',
  'texto_curto',
  'texto_longo',
  'avaliacao',
  'nps',
  'numero',
  'data',
  'seccao',
];

export const NOME_DO_TIPO: Record<TipoPergunta, string> = {
  escolha_unica: 'Escolha única',
  escolha_multipla: 'Escolha múltipla',
  texto_curto: 'Texto curto',
  texto_longo: 'Texto longo',
  avaliacao: 'Avaliação (1 a 5)',
  nps: 'NPS (0 a 10)',
  numero: 'Número',
  data: 'Data',
  seccao: 'Secção (só texto)',
};

/** A primeira chave `<prefixo><n>` livre. */
export function novaChave(usadas: Iterable<string>, prefixo: 'p' | 'o'): string {
  const conjunto = new Set(usadas);
  for (let n = 1; ; n += 1) {
    const chave = `${prefixo}${n}`;
    if (!conjunto.has(chave)) return chave;
  }
}

function opcoesIniciais(idioma: Idioma) {
  const rotulo = idioma === 'pt' ? 'Opção' : 'Option';
  return [
    { chave: 'o1', rotulo: `${rotulo} 1` },
    { chave: 'o2', rotulo: `${rotulo} 2` },
  ];
}

export function novaPergunta(tipo: TipoPergunta, chave: string, idioma: Idioma): Pergunta {
  const titulo =
    tipo === 'seccao'
      ? idioma === 'pt'
        ? 'Nova secção'
        : 'New section'
      : idioma === 'pt'
        ? 'Nova pergunta'
        : 'New question';
  switch (tipo) {
    case 'seccao':
      return { tipo, chave, titulo };
    case 'texto_curto':
      return { tipo, chave, titulo, obrigatoria: false, max: LIMITES.textoCurto };
    case 'texto_longo':
      return { tipo, chave, titulo, obrigatoria: false, max: LIMITES.textoLongo };
    case 'escolha_unica':
    case 'escolha_multipla':
      return { tipo, chave, titulo, obrigatoria: false, opcoes: opcoesIniciais(idioma) };
    case 'numero':
      return { tipo, chave, titulo, obrigatoria: false, inteiro: false };
    case 'avaliacao':
    case 'nps':
    case 'data':
      return { tipo, chave, titulo, obrigatoria: false };
  }
}

/** Muda o tipo mantendo o que faz sentido manter: texto, condição e, entre escolhas, as opções. */
export function mudarTipo(p: Pergunta, tipo: TipoPergunta, idioma: Idioma): Pergunta {
  if (p.tipo === tipo) return p;
  const nova = novaPergunta(tipo, p.chave, idioma);
  const comum = {
    titulo: p.titulo,
    ...(p.ajuda ? { ajuda: p.ajuda } : {}),
    ...(p.mostrarSe ? { mostrarSe: p.mostrarSe } : {}),
  };
  const obrigatoria = p.tipo !== 'seccao' ? { obrigatoria: p.obrigatoria } : {};
  if (nova.tipo === 'seccao') return { ...nova, ...comum };
  if ('opcoes' in nova && 'opcoes' in p) {
    return { ...nova, ...comum, ...obrigatoria, opcoes: p.opcoes } as Pergunta;
  }
  return { ...nova, ...comum, ...obrigatoria } as Pergunta;
}

export function acrescentar(
  perguntas: readonly Pergunta[],
  tipo: TipoPergunta,
  idioma: Idioma,
): Pergunta[] {
  const chave = novaChave(
    perguntas.map((p) => p.chave),
    'p',
  );
  return [...perguntas, novaPergunta(tipo, chave, idioma)];
}

export function duplicar(perguntas: readonly Pergunta[], i: number): Pergunta[] {
  const original = perguntas[i];
  if (!original) return [...perguntas];
  const chave = novaChave(
    perguntas.map((p) => p.chave),
    'p',
  );
  const copia = structuredClone(original) as Pergunta;
  return [...perguntas.slice(0, i + 1), { ...copia, chave }, ...perguntas.slice(i + 1)];
}

/**
 * Apaga e retira as condições que apontavam para a pergunta apagada — uma
 * condição órfã esconderia a pergunta para sempre. Devolve quantas retirou,
 * para o ecrã o dizer.
 */
export function apagar(
  perguntas: readonly Pergunta[],
  i: number,
): { perguntas: Pergunta[]; condicoesRetiradas: number } {
  const alvo = perguntas[i];
  if (!alvo) return { perguntas: [...perguntas], condicoesRetiradas: 0 };
  let condicoesRetiradas = 0;
  const resto = perguntas
    .filter((_, j) => j !== i)
    .map((p) => {
      if (p.mostrarSe?.pergunta !== alvo.chave) return p;
      condicoesRetiradas += 1;
      return semCondicao(p);
    });
  return { perguntas: resto, condicoesRetiradas };
}

/** A mesma pergunta, sem condição de visibilidade. */
export function semCondicao(p: Pergunta): Pergunta {
  const copia = { ...p };
  delete copia.mostrarSe;
  return copia;
}

export function mover(perguntas: readonly Pergunta[], i: number, delta: -1 | 1): Pergunta[] {
  const j = i + delta;
  if (j < 0 || j >= perguntas.length) return [...perguntas];
  const lista = [...perguntas];
  [lista[i], lista[j]] = [lista[j]!, lista[i]!];
  return lista;
}

export function novaOpcao(
  opcoes: readonly { chave: string; rotulo: string }[],
  idioma: Idioma,
): { chave: string; rotulo: string }[] {
  const chave = novaChave(
    opcoes.map((o) => o.chave),
    'o',
  );
  const n = opcoes.length + 1;
  return [...opcoes, { chave, rotulo: `${idioma === 'pt' ? 'Opção' : 'Option'} ${n}` }];
}

// ── Erros legíveis ───────────────────────────────────────────────────────────

export interface ErroLegivel {
  /** Índice da pergunta a que o erro pertence, ou null se é do inquérito todo. */
  readonly pergunta: number | null;
  readonly texto: string;
}

const CAMPO: Record<string, string> = {
  titulo: 'título',
  ajuda: 'ajuda',
  opcoes: 'opções',
  rotulo: 'texto da opção',
  min: 'mínimo',
  max: 'máximo',
  mostrarSe: 'condição',
  corpo: 'texto',
  textoConsentimento: 'texto do consentimento',
  campos: 'campos de contacto',
};

interface Issue {
  readonly code: string;
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

function explicar(issue: Issue): string {
  const ultimo = [...issue.path].reverse().find((s) => typeof s === 'string') as string | undefined;
  const campo = ultimo ? (CAMPO[ultimo] ?? ultimo) : null;
  if (issue.code === 'too_small') {
    return campo === 'opções' ? 'precisa de pelo menos 2 opções' : `${campo ?? 'campo'} vazio`;
  }
  if (issue.code === 'too_big') return `${campo ?? 'campo'} longo demais`;
  if (issue.code === 'custom') return issue.message;
  return campo ? `${campo}: valor inválido` : issue.message;
}

/** Os problemas do zod em frases para quem constrói o inquérito, sem repetir. */
export function errosLegiveis(spec: SpecInquerito, issues: readonly Issue[]): ErroLegivel[] {
  const vistos = new Set<string>();
  const erros: ErroLegivel[] = [];
  for (const issue of issues) {
    const [raiz, indice, ...resto] = issue.path;
    let erro: ErroLegivel;
    if (raiz === 'perguntas' && typeof indice === 'number') {
      const titulo = spec.perguntas[indice]?.titulo?.trim();
      const opcao =
        resto[0] === 'opcoes' && typeof resto[1] === 'number' ? ` (opção ${resto[1] + 1})` : '';
      erro = {
        pergunta: indice,
        texto: `Pergunta ${indice + 1}${titulo ? ` «${titulo}»` : ''}${opcao}: ${explicar(issue)}.`,
      };
    } else if (raiz === 'boasVindas' || raiz === 'agradecimento') {
      const ecra = raiz === 'boasVindas' ? 'Boas-vindas' : 'Agradecimento';
      erro = { pergunta: null, texto: `${ecra}: ${explicar(issue)}.` };
    } else if (raiz === 'contacto') {
      erro = { pergunta: null, texto: `Contacto: ${explicar(issue)}.` };
    } else {
      erro = { pergunta: null, texto: `${explicar(issue)}.` };
    }
    if (!vistos.has(erro.texto)) {
      vistos.add(erro.texto);
      erros.push(erro);
    }
  }
  return erros;
}

// ── Identificador ────────────────────────────────────────────────────────────

/**
 * O `slug` de um inquérito novo: o nome sem acentos, e um sufixo aleatório
 * para dois inquéritos com o mesmo nome não colidirem. É interno — não
 * aparece no link partilhado, que é só o token.
 */
export function slugDe(nome: string, sufixo: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');
  return base ? `${base}-${sufixo}` : `inquerito-${sufixo}`;
}
