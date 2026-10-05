import { z } from 'zod';

/**
 * O contrato entre quem LÊ o texto colado (o analisador local ou o Kimi) e
 * quem o transforma num inquérito válido (`normalizar.ts`).
 *
 * É tolerante de propósito: um modelo de linguagem erra um campo aqui e ali,
 * e um campo errado não pode deitar fora o resto. Cada campo opcional cai para
 * `undefined` quando vem mal (`.catch`), textos longos demais são cortados, e
 * chaves desconhecidas são ignoradas. A severidade fica toda em `normalizar`,
 * que só deixa sair um `SpecInquerito` que passa a validação completa.
 */

/** O máximo de texto colado: um inquérito de 50 perguntas cabe com folga. */
export const MAX_TEXTO = 20_000;

export const TIPOS_IMPORTAVEIS = [
  'texto_curto',
  'texto_longo',
  'escolha_unica',
  'escolha_multipla',
  'avaliacao',
  'nps',
  'numero',
  'data',
] as const;
export type TipoImportavel = (typeof TIPOS_IMPORTAVEIS)[number];

/** Nenhum texto deste contrato precisa de mais: o resto é ruído ou abuso. */
const TETO = 5_000;

const texto = z
  .string()
  .transform((s) => s.trim().slice(0, TETO))
  .pipe(z.string().min(1));
const textoOpcional = z
  .string()
  .transform((s) => s.trim().slice(0, TETO))
  .optional()
  .catch(undefined);
const inteiro = z.number().int().optional().catch(undefined);

const blocoSeccao = z.object({
  bloco: z.literal('seccao'),
  titulo: texto,
  texto: textoOpcional,
});

const blocoPergunta = z.object({
  bloco: z.literal('pergunta'),
  titulo: texto,
  /** Subtítulo: a ajuda mostrada por baixo da pergunta. */
  ajuda: textoOpcional,
  tipo: z.enum(TIPOS_IMPORTAVEIS).optional().catch(undefined),
  obrigatoria: z.boolean().optional().catch(undefined),
  opcoes: z
    .array(z.string().transform((s) => s.trim().slice(0, TETO)))
    .max(100)
    .optional()
    .catch(undefined),
  /** Escolha múltipla: quantas no mínimo e no máximo. Número: o intervalo. */
  min: inteiro,
  max: inteiro,
  inteiro: z.boolean().optional().catch(undefined),
  /**
   * «Mostrar só se…»: `pergunta` é o número de ordem (1, 2, 3…) de uma
   * pergunta ANTERIOR entre as perguntas do rascunho (as secções não contam);
   * `valor` é o rótulo da opção (ou o número da escala).
   */
  condicao: z
    .object({ pergunta: z.number().int().positive(), valor: z.string().min(1).max(200) })
    .optional()
    .catch(undefined),
  /** Porque é que este tipo foi escolhido — mostrado ao admin na revisão. */
  razao: z
    .string()
    .transform((s) => s.trim().slice(0, 300))
    .optional()
    .catch(undefined),
});

export const blocoImportado = z.discriminatedUnion('bloco', [blocoSeccao, blocoPergunta]);

export const rascunhoImportado = z.object({
  titulo: textoOpcional,
  introducao: textoOpcional,
  agradecimento: textoOpcional,
  /** Blocos que vierem mal são descartados um a um, nunca o rascunho inteiro. */
  blocos: z
    .array(z.unknown())
    .max(200)
    .transform((lista) =>
      lista.flatMap((b) => {
        const r = blocoImportado.safeParse(b);
        return r.success ? [r.data] : [];
      }),
    ),
});

export type RascunhoImportado = z.infer<typeof rascunhoImportado>;
export type BlocoImportado = z.infer<typeof blocoImportado>;
export type PerguntaImportada = z.infer<typeof blocoPergunta>;
