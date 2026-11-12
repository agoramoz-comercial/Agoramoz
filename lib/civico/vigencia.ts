import { urlPublica } from '@/lib/news/limites';
import type { Resposta } from './resposta';

/**
 * Verificador de vigência.
 *
 * O motor escreve de memória e o corpus dele é pequeno. Na primeira consulta
 * real (2026-11-12) respondeu a uma pergunta sobre heranças com os artigos
 * 2133.º e 2134.º do Código Civil — revogados em 2019. A resposta vinha bem
 * formada, confiante e errada. Isto existe para que isso não chegue a quem
 * pergunta sem um aviso, e para que aconteça menos:
 *
 * 1. **Antes**: uma nota de vigência segue com cada pedido (`notaDeVigencia`),
 *    a dizer ao motor que diplomas foram substituídos e a pedir-lhe que não
 *    invente citações literais. Medido com o motor real: com a nota, passou a
 *    citar a Lei n.º 23/2019 e a dizer «o texto não consta do corpus» em vez
 *    de citar artigos revogados.
 * 2. **Depois**: a resposta é lida à procura de citações de diplomas
 *    revogados (`verificarVigencia`). É uma comparação de texto contra um
 *    registo, não uma opinião de um modelo: ou cita, ou não cita.
 *
 * ## O registo
 *
 * Cada entrada é uma REVOGAÇÃO — um facto que não deixa de ser verdade — e
 * não a afirmação de que um diploma «está em vigor», que pode caducar sem
 * ninguém dar por isso. Cada uma foi lida no texto do Boletim da República
 * indicado em `fonte`, na data de `VERIFICADO_EM`. Acrescentar uma entrada é
 * ler a norma revogatória do diploma novo e escrever aqui o que ela diz;
 * nunca de memória, nunca porque um modelo o afirmou.
 *
 * Um diploma que não está no registo sai como «por verificar» — nunca como
 * «em vigor».
 */

export const VERIFICADO_EM = '2026-11-12';

export interface Revogacao {
  readonly id: string;
  /** O que foi revogado, como se escreve a quem lê. */
  readonly revogado: string;
  /** O diploma que o revogou. */
  readonly substituto: string;
  /** Um facto a mais, só quando foi lido na fonte (ex.: a data de entrada em vigor). */
  readonly nota?: string;
  /** Onde a norma revogatória foi lida. */
  readonly fonte: { readonly titulo: string; readonly href: string };
  /** Números de diploma (`23/2007`) que contam como citação do revogado. */
  readonly numerosRevogados: readonly string[];
  /** Número do diploma substituto (`13/2023`). */
  readonly numeroSubstituto: string;
}

export const REVOGACOES: readonly Revogacao[] = [
  {
    id: 'trabalho',
    revogado: 'Lei n.º 23/2007, de 1 de Agosto (Lei do Trabalho de 2007)',
    substituto: 'Lei n.º 13/2023, de 25 de Agosto (Lei do Trabalho)',
    nota: 'Entrou em vigor 180 dias após a publicação, a 21 de Fevereiro de 2024.',
    fonte: {
      titulo: 'Lei n.º 13/2023 no Boletim da República (cópia do Tribunal Supremo)',
      href: 'https://ts.gov.mz/wp-content/uploads/2024/05/Lei-No-13-2023-de-25-de-Agosto-NOVA-LEI-DO-TRABALHO-BR_165_I_SEI_RIE_2Ao__230831_091658.pdf',
    },
    numerosRevogados: ['23/2007'],
    numeroSubstituto: '13/2023',
  },
  {
    id: 'sucessoes',
    revogado: 'Livro V do Código Civil (Direito das Sucessões, artigos 2024.º a 2334.º)',
    substituto: 'Lei n.º 23/2019, de 23 de Dezembro (Lei das Sucessões)',
    fonte: {
      titulo: 'Lei n.º 23/2019 no Boletim da República (cópia)',
      href: 'https://reformar.co.mz/documentos-diversos/lei-23-2019-lei-das-sucessoes.pdf',
    },
    // Sem número próprio: o Livro V reconhece-se pelos artigos (ver `citaLivroV`).
    numerosRevogados: [],
    numeroSubstituto: '23/2019',
  },
  {
    id: 'familia',
    revogado: 'Lei n.º 10/2004, de 25 de Agosto (Lei da Família de 2004)',
    substituto: 'Lei n.º 22/2019, de 11 de Dezembro (Lei da Família)',
    fonte: {
      titulo: 'Lei n.º 22/2019 no Boletim da República (cópia na FAOLEX)',
      href: 'https://faolex.fao.org/docs/pdf/moz208614.pdf',
    },
    numerosRevogados: ['10/2004'],
    numeroSubstituto: '22/2019',
  },
  {
    id: 'penal',
    revogado: 'Código Penal aprovado pela Lei n.º 35/2014, de 31 de Dezembro',
    substituto: 'Lei n.º 24/2019, de 24 de Dezembro (Código Penal)',
    fonte: {
      titulo: 'Lei n.º 24/2019 no Boletim da República (cópia)',
      href: 'https://reformar.co.mz/documentos-diversos/lei-24-2019-lei-de-revisao-do-codigo-penal.pdf',
    },
    numerosRevogados: ['35/2014'],
    numeroSubstituto: '24/2019',
  },
];

/* ------------------------------------------------------------------- antes */

/**
 * A nota que segue ANTES da pergunta, numa mensagem própria. Vai sempre
 * inteira: são quatro linhas, e escolher «as que interessam» por palavras da
 * pergunta seria mais uma coisa a falhar em silêncio.
 */
export function notaDeVigencia(): string {
  const linhas = REVOGACOES.map((r) => `- ${r.substituto} revogou: ${r.revogado}.`);
  return [
    `Nota de vigência (AGORAMOZ, lida no Boletim da República a ${VERIFICADO_EM}):`,
    ...linhas,
    'Responde com base nos diplomas em vigor e não cites artigos de diplomas revogados.',
    'Se não tiveres o texto do diploma em vigor, não inventes citações literais nem números de artigo: explica a regra sem aspas e diz que o texto deve ser confirmado no Boletim da República.',
    'Não escrevas números de telefone, moradas, valores ou prazos de que não tenhas a certeza: diz a que instituição perguntar.',
    'Se a pergunta partir de uma lei, de um direito ou de uma instituição que não reconheces, diz que não a reconheces em vez de a confirmar.',
  ].join('\n');
}

/* ------------------------------------------------------------------ depois */

export type EstadoDiploma = 'revogado' | 'substituto' | 'por-verificar';

export interface DiplomaCitado {
  /** `Lei n.º 13/2023`, normalizado. */
  readonly nome: string;
  readonly estado: EstadoDiploma;
}

export interface AlertaVigencia {
  readonly id: string;
  /**
   * `revogado`: a resposta cita o diploma revogado e não o que o substituiu.
   * `mencionado`: cita os dois — pode estar só a explicar a mudança.
   */
  readonly tipo: 'revogado' | 'mencionado';
  readonly revogado: string;
  readonly substituto: string;
  readonly nota?: string;
  readonly fonte: { readonly titulo: string; readonly href: string };
}

export interface Vigencia {
  readonly alertas: readonly AlertaVigencia[];
  readonly diplomas: readonly DiplomaCitado[];
  readonly verificadoEm: string;
}

const TIPOS: Readonly<Record<string, string>> = {
  lei: 'Lei',
  'decreto-lei': 'Decreto-Lei',
  decreto: 'Decreto',
  'diploma ministerial': 'Diploma Ministerial',
  resolução: 'Resolução',
  resolucao: 'Resolução',
};

/** «Lei n.º 23/2007», «Lei nº 23/2007», «Lei 23/2007», «Decreto-Lei n.o 47344/66»… */
const CITACAO =
  /\b(Lei|Decreto-Lei|Decreto|Diploma Ministerial|Resolu[cç][aã]o)\s+(?:n\.?\s?[ºo°]?\.?\s*)?(\d{1,5})\s?\/\s?(\d{2,4})\b/giu;

const MAX_DIPLOMAS = 20;

/** Os diplomas citados no texto, sem repetições, pela ordem em que aparecem. */
export function citacoesDe(texto: string): { tipo: string; numero: string }[] {
  const vistos = new Map<string, { tipo: string; numero: string }>();
  for (const m of texto.matchAll(CITACAO)) {
    const tipo = TIPOS[m[1]!.toLowerCase()] ?? m[1]!;
    const numero = `${Number(m[2])}/${m[3]}`;
    const chave = `${tipo} ${numero}`;
    if (!vistos.has(chave)) vistos.set(chave, { tipo, numero });
    if (vistos.size >= MAX_DIPLOMAS) break;
  }
  return [...vistos.values()];
}

/**
 * A resposta cita o Livro V do Código Civil?
 *
 * O Livro V não tem número de diploma próprio (o Código é o Decreto-Lei
 * n.º 47344, de 1966, e o resto dele continua em vigor). Reconhece-se por
 * falar do Código Civil E trazer um artigo entre o 2024.º e o 2334.º, ou
 * nomear o «Livro V» ou o «Direito das Sucessões» do Código.
 */
export function citaLivroV(texto: string): boolean {
  if (!/c[oó]digo\s+civil/iu.test(texto)) return false;
  if (/[Ll]ivro\s+V\b/u.test(texto)) return true;
  for (const m of texto.matchAll(/art(?:igo|\.)?s?\.?\s*(\d{4})\b/giu)) {
    const n = Number(m[1]);
    if (n >= 2024 && n <= 2334) return true;
  }
  return false;
}

export function verificarVigencia(resposta: Pick<Resposta, 'texto'>): Vigencia {
  const { texto } = resposta;
  const citados = citacoesDe(texto);
  const numeros = new Set(citados.map((c) => c.numero));

  const alertas: AlertaVigencia[] = [];
  for (const r of REVOGACOES) {
    const citaRevogado =
      r.numerosRevogados.some((n) => numeros.has(n)) || (r.id === 'sucessoes' && citaLivroV(texto));
    if (!citaRevogado) continue;
    alertas.push({
      id: r.id,
      tipo: numeros.has(r.numeroSubstituto) ? 'mencionado' : 'revogado',
      revogado: r.revogado,
      substituto: r.substituto,
      ...(r.nota ? { nota: r.nota } : {}),
      fonte: r.fonte,
    });
  }

  const revogados = new Set(REVOGACOES.flatMap((r) => r.numerosRevogados));
  const substitutos = new Set(REVOGACOES.map((r) => r.numeroSubstituto));
  const diplomas: DiplomaCitado[] = citados.map((c) => ({
    nome: `${c.tipo} n.º ${c.numero}`,
    estado: revogados.has(c.numero) ? 'revogado' : substitutos.has(c.numero) ? 'substituto' : 'por-verificar',
  }));

  // Os alertas graves primeiro: é o que a pessoa tem de ler antes da resposta.
  alertas.sort((a, b) => Number(b.tipo === 'revogado') - Number(a.tipo === 'revogado'));
  return { alertas, diplomas, verificadoEm: VERIFICADO_EM };
}

/* --------------------------------------------------------------- validação */

const eTexto = (v: unknown): v is string => typeof v === 'string';

/** O que chega ao browser é verificado antes de ser desenhado, como a resposta. */
export function validarVigencia(x: unknown): x is Vigencia {
  const v = x as Partial<Vigencia> | null;
  return (
    !!v &&
    eTexto(v.verificadoEm) &&
    Array.isArray(v.alertas) &&
    v.alertas.every((a: Partial<AlertaVigencia> | null) => {
      return (
        !!a &&
        eTexto(a.id) &&
        (a.tipo === 'revogado' || a.tipo === 'mencionado') &&
        eTexto(a.revogado) &&
        eTexto(a.substituto) &&
        (a.nota === undefined || eTexto(a.nota)) &&
        !!a.fonte &&
        eTexto(a.fonte.titulo) &&
        eTexto(a.fonte.href) &&
        urlPublica(a.fonte.href)
      );
    }) &&
    Array.isArray(v.diplomas) &&
    v.diplomas.length <= MAX_DIPLOMAS &&
    v.diplomas.every((d: Partial<DiplomaCitado> | null) => {
      return !!d && eTexto(d.nome) && (d.estado === 'revogado' || d.estado === 'substituto' || d.estado === 'por-verificar');
    })
  );
}
