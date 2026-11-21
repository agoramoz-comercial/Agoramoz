import { LIMITES, ROTULO_NIVEL, type Fonte } from './modelo';
import { indiceParaPlanear } from './fontes';
import type { Plano, PedidoCurso } from './ciclo';

/**
 * Os pedidos ao motor (D-49). Ficam aqui, não no ZabaEdu: a função do lado
 * de lá só reencaminha para a IA. Assim as regras mudam com um deploy nosso.
 *
 * As regras repetem, em linguagem do modelo, o que o verificador vai exigir
 * (`verificar.ts`): citar ids, citar palavra a palavra, não escrever números
 * que não estejam lá, não acrescentar conhecimento próprio.
 */

const REGRAS = [
  'Escreves em português de Moçambique (norma europeia), claro e directo.',
  'Usas SÓ a informação das passagens dadas. Não acrescentas conhecimento teu, exemplos inventados, nomes, datas ou números.',
  'Cada afirmação leva em "fontes" os ids das passagens que a sustentam (ex.: "F1.3"). Só ids que te foram dados.',
  'Parafraseia de perto: usa as palavras das passagens. Uma frase cujas palavras-chave não estão nas passagens citadas é rejeitada.',
  'Números (valores, datas, percentagens) só se estiverem, tal e qual, nas passagens citadas.',
  'Uma "citacao" é copiada letra a letra de uma passagem citada.',
  'Respondes só com JSON no esquema pedido.',
].join('\n- ');

const corrigir = (anteriores: readonly string[]) =>
  anteriores.length
    ? `\n\nA TUA TENTATIVA ANTERIOR FOI REJEITADA PELO VERIFICADOR. Corrige exactamente isto (ou retira o que não tem apoio):\n- ${anteriores.slice(0, 30).join('\n- ')}`
    : '';

export function promptTema(pedido: Omit<PedidoCurso, 'tema'>, fontes: readonly Fonte[], anteriores: readonly string[]): string {
  return `És o desenhador pedagógico da AGORAMOZ. A equipa escolheu o título de um curso; tu escreves o tema: o que o curso vai tratar para cumprir o que o título promete, com o que as fontes abaixo cobrem.

Regras:
- Escreves em português de Moçambique (norma europeia), claro e directo.
- O título é fixo. O tema não o muda nem o alarga: diz, em 2 a 4 frases (no máximo ${LIMITES.tema} caracteres), que assuntos do título o curso trata, por que ordem e com que finalidade prática.
- Só assuntos que as fontes cobrem. Se o título promete algo que as fontes não tratam, não o incluas.
- Sem números, datas, nomes ou exemplos que não estejam nas fontes.
- Respondes só com JSON no esquema pedido.

Pedido:
- Título do curso: ${pedido.titulo}
- Público: ${pedido.publico || 'por definir'}
- Nível: ${ROTULO_NIVEL[pedido.nivel]}
- Duração aproximada: ${pedido.minutos} minutos no total

Índice das fontes (o começo de cada passagem):
${indiceParaPlanear(fontes)}${corrigir(anteriores)}`;
}

export function promptPlano(pedido: PedidoCurso, fontes: readonly Fonte[], anteriores: readonly string[]): string {
  return `És o desenhador pedagógico da AGORAMOZ. Vais planear um curso a partir das fontes abaixo.

Regras:
- ${REGRAS}

Pedido:
- Título do curso (fixo, escolhido pela equipa): ${pedido.titulo}
- Tema: ${pedido.tema}
- Público: ${pedido.publico}
- Nível: ${ROTULO_NIVEL[pedido.nivel]}
- Duração aproximada: ${pedido.minutos} minutos no total

Alinhamento com o título:
- O curso cumpre o que o título promete. Cada resultado, módulo e aula serve o título e o tema; um assunto das fontes que não serve o título fica de fora, mesmo que esteja nas fontes.
- Os módulos seguem a ordem do tema e, juntos, cobrem o título de ponta a ponta.
- Em "titulo" devolves o título do pedido, palavra por palavra. "subtitulo" diz em 1 frase o que o curso entrega.

Planeia:
- 3 a 8 "resultados" de aprendizagem («No fim, vai ser capaz de …»), cada um com as passagens que o sustentam;
- 2 a 6 módulos, cada um com 1 a 5 aulas;
- para cada aula: título, objectivo, minutos e a lista "passagens" — os ids das passagens com que essa aula vai ser escrita (3 a 12; cobre as fontes sem repetir sem razão).
- "prerequisitos": só se as fontes os indicarem; senão, lista vazia.

Índice das fontes (o começo de cada passagem):
${indiceParaPlanear(fontes)}${corrigir(anteriores)}`;
}

export function promptAula(
  ctx: { pedido: PedidoCurso; plano: Plano; modulo: number; aula: number },
  aula: Plano['modulos'][number]['aulas'][number],
  passagens: readonly { id: string; texto: string }[],
  anteriores: readonly string[],
): string {
  const m = ctx.plano.modulos[ctx.modulo]!;
  return `És o autor da AGORAMOZ. Vais escrever uma aula do curso «${ctx.pedido.titulo}» (${ROTULO_NIVEL[ctx.pedido.nivel]}, para ${ctx.pedido.publico}).

Regras:
- ${REGRAS}
- A aula serve o título do curso e o objectivo abaixo: das passagens, usa o que responde a esse objectivo.

Tema do curso: ${ctx.pedido.tema}

Módulo ${ctx.modulo + 1}: ${m.titulo}
Aula ${ctx.aula + 1}: ${aula.titulo}
Objectivo: ${aula.objectivo}
Duração: ${aula.minutos} minutos

Escreve:
- 4 a 10 "blocos": "explicacao" (o essencial, por ordem), "exemplo" (só se as passagens tiverem um), "passos" (com "itens", se as passagens descreverem um procedimento), "citacao" (1 no máximo: "citacao" copiada letra a letra, "texto" a dizer porque importa);
- 2 a 4 "perguntas" de escolha múltipla: 4 opções diferentes, "correcta" é o índice (0–3), "justificacao" explica com base nas passagens.

Passagens desta aula (só estas):
${passagens.map((p) => `[${p.id}] ${p.texto}`).join('\n\n')}${corrigir(anteriores)}`;
}

/* ---------------------------------------------------------------- esquemas */

const ids = { type: 'array', items: { type: 'string', pattern: '^F\\d+\\.\\d+$' }, minItems: 1 };

export const SCHEMA_TEMA = {
  type: 'object',
  required: ['tema'],
  properties: { tema: { type: 'string', maxLength: LIMITES.tema } },
} as const;

export const SCHEMA_PLANO = {
  type: 'object',
  required: ['titulo', 'subtitulo', 'prerequisitos', 'resultados', 'modulos'],
  properties: {
    titulo: { type: 'string' },
    subtitulo: { type: 'string' },
    prerequisitos: { type: 'array', items: { type: 'string' } },
    resultados: {
      type: 'array',
      items: { type: 'object', required: ['texto', 'fontes'], properties: { texto: { type: 'string' }, fontes: ids } },
    },
    modulos: {
      type: 'array',
      items: {
        type: 'object',
        required: ['titulo', 'resumo', 'aulas'],
        properties: {
          titulo: { type: 'string' },
          resumo: { type: 'string' },
          aulas: {
            type: 'array',
            items: {
              type: 'object',
              required: ['titulo', 'objectivo', 'minutos', 'passagens'],
              properties: { titulo: { type: 'string' }, objectivo: { type: 'string' }, minutos: { type: 'integer' }, passagens: ids },
            },
          },
        },
      },
    },
  },
} as const;

export const SCHEMA_AULA = {
  type: 'object',
  required: ['blocos', 'perguntas'],
  properties: {
    blocos: {
      type: 'array',
      items: {
        type: 'object',
        required: ['tipo', 'texto', 'fontes'],
        properties: {
          tipo: { type: 'string', enum: ['explicacao', 'exemplo', 'passos', 'citacao'] },
          texto: { type: 'string' },
          itens: { type: 'array', items: { type: 'string' } },
          citacao: { type: 'string' },
          fontes: ids,
        },
      },
    },
    perguntas: {
      type: 'array',
      items: {
        type: 'object',
        required: ['enunciado', 'opcoes', 'correcta', 'justificacao', 'fontes'],
        properties: {
          enunciado: { type: 'string' },
          opcoes: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
          correcta: { type: 'integer', minimum: 0, maximum: 3 },
          justificacao: { type: 'string' },
          fontes: ids,
        },
      },
    },
  },
} as const;

/* ------------------------------------------------------- fontes pela IA */

export interface PedidoFontesIA {
  readonly titulo: string;
  readonly tema: string;
  readonly publico: string;
  readonly nivel: keyof typeof ROTULO_NIVEL;
}

const linhasPedido = (p: PedidoFontesIA) =>
  [
    `- Título do curso: ${p.titulo}`,
    p.tema ? `- Tema: ${p.tema}` : '',
    p.publico ? `- Público: ${p.publico}` : '',
    `- Nível: ${ROTULO_NIVEL[p.nivel]}`,
  ]
    .filter(Boolean)
    .join('\n');

export function promptPesquisa(p: PedidoFontesIA): string {
  return `És o investigador da AGORAMOZ. Pesquisa na internet fontes públicas e fiáveis para um curso.

Pedido:
${linhasPedido(p)}

Regras:
- 2 a 5 fontes que cubram, juntas, o que o título promete. Prefere organismos públicos, organizações internacionais, universidades, normas e documentação oficial; evita blogues anónimos e páginas de venda.
- Cada fonte tem de ser uma página real que encontraste agora: "url" é o endereço exacto (https) dessa página. Nunca escrevas um endereço de memória ou adivinhado.
- "texto": o que essa página diz sobre o tema, em português de Moçambique (norma europeia), fiel ao original e o mais próximo possível das palavras dele, com os números, datas e nomes tal como aparecem. Entre 300 e 6 000 caracteres. Nada que não esteja na página.
- "titulo": o título da página ou do documento, e quem o publicou.
- Respondes só com JSON no esquema pedido.`;
}

export function promptTextoBase(p: PedidoFontesIA): string {
  return `És um especialista que escreve, para a AGORAMOZ, um texto-base sobre o assunto de um curso. Este texto será a fonte do curso e ficará marcado como «escrito pela IA, sem origem verificável».

Pedido:
${linhasPedido(p)}

Regras:
- Português de Moçambique (norma europeia), claro, didáctico e organizado em secções com títulos («# …»).
- Cobre o que o título promete: conceitos, como se faz (passos), erros comuns e exemplos simples e genéricos.
- Só o que é conhecimento geral e estável do assunto. NÃO inventes números, percentagens, datas, nomes de pessoas ou empresas, estudos, leis ou citações. Se não tens a certeza de um facto, não o escrevas.
- Entre 2 500 e 9 000 caracteres.
- "titulo": um título descritivo do texto (não o do curso).
- Respondes só com JSON no esquema pedido.`;
}

export const SCHEMA_PESQUISA = {
  type: 'object',
  required: ['fontes'],
  properties: {
    fontes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['titulo', 'url', 'texto'],
        properties: { titulo: { type: 'string' }, url: { type: 'string' }, texto: { type: 'string' } },
      },
    },
  },
} as const;

export const SCHEMA_TEXTO_BASE = {
  type: 'object',
  required: ['titulo', 'texto'],
  properties: { titulo: { type: 'string' }, texto: { type: 'string' } },
} as const;
