import { ROTULO_NIVEL, type Fonte } from './modelo';
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

export function promptPlano(pedido: PedidoCurso, fontes: readonly Fonte[], anteriores: readonly string[]): string {
  return `És o desenhador pedagógico da AGORAMOZ. Vais planear um curso a partir das fontes abaixo.

Regras:
- ${REGRAS}

Pedido:
- Tema: ${pedido.tema}
- Público: ${pedido.publico}
- Nível: ${ROTULO_NIVEL[pedido.nivel]}
- Duração aproximada: ${pedido.minutos} minutos no total

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
  return `És o autor da AGORAMOZ. Vais escrever uma aula do curso «${ctx.plano.titulo}» (${ROTULO_NIVEL[ctx.pedido.nivel]}, para ${ctx.pedido.publico}).

Regras:
- ${REGRAS}

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
