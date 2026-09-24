import { z } from 'zod';

/**
 * Validação de configuração no arranque.
 *
 * Porque existe: sem isto, uma variável em falta ou malformada só se revela no
 * primeiro pedido que a usa — em produção, no meio de um fluxo, com uma
 * mensagem obscura. Aqui falha no arranque, com o nome do que está errado.
 *
 * Regra que atravessa este ficheiro: **nunca imprimir valores**. As mensagens
 * de erro nomeiam a variável e descrevem o formato esperado, nada mais. Um
 * `process.exit` a despejar uma chave para os logs da plataforma seria pior do
 * que a falha que se está a diagnosticar.
 */

/**
 * `NEXT_PUBLIC_*` são substituídas em tempo de build e chegam ao browser.
 * Nunca pôr aqui nada que não possa ser lido por qualquer visitante.
 */
const publicSchema = z.object({
  /**
   * OPCIONAL, e é assim de propósito. `content/site.ts` já tem
   * `?? 'https://agoramoz.com'`, e a variável não está definida nem em
   * desenvolvimento nem no ambiente que serve produção — o site funciona à
   * mesma pelo valor por omissão. Exigi-la aqui partia o build para corrigir
   * um problema que não existe.
   *
   * O que esta validação faz é útil e mais modesto: se alguém a definir, tem
   * de ser um URL absoluto e sem barra final. Uma barra a mais duplica-se em
   * todos os canonicals e no sitemap.
   */
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url('deve ser um URL absoluto, com esquema (https://…)')
    .refine((v) => !v.endsWith('/'), 'não deve terminar em barra')
    .optional(),
  NEXT_PUBLIC_MOTION_DEBUG: z.enum(['0', '1']).optional(),
});

/**
 * Só no servidor. Qualquer coisa acrescentada aqui fica fora do bundle do
 * cliente porque nunca é referenciada por código de cliente — e o
 * `assertServerOnly` abaixo transforma um engano desses em erro imediato.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),

  /**
   * Janela e tecto do limitador da rota de diagnóstico. Opcionais com valores
   * por omissão deliberadamente conservadores: um formulário de diagnóstico
   * legítimo é submetido uma vez, não cinco vezes por minuto.
   */
  DIAGNOSTIC_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  DIAGNOSTIC_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

  /**
   * Tamanho máximo aceite no corpo do POST. O schema já limita cada campo,
   * mas a validação corre DEPOIS do parse — sem este tecto, um corpo de
   * megabytes é lido para memória antes de ser rejeitado.
   */
  DIAGNOSTIC_MAX_BODY_BYTES: z.coerce.number().int().positive().default(32_768),

  /**
   * A CSP entra em modo de relatório por omissão. Passar a `false` só depois
   * de as violações reportadas serem zero — impor uma política não testada
   * numa página que usa GSAP e fontes injetadas parte o site em silêncio para
   * quem já o tem em cache.
   */
  CSP_REPORT_ONLY: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

function format(error: z.ZodError): string {
  return error.issues
    .map((i) => `  ${i.path.join('.') || '(raiz)'}: ${i.message}`)
    .join('\n');
}

function parse<T extends z.ZodType>(schema: T, source: unknown, scope: string): z.infer<T> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;

  // Nomes e regras, nunca valores.
  throw new Error(`Configuração inválida (${scope}):\n${format(result.error)}`);
}

/**
 * Lida literalmente, campo a campo: o Next substitui `process.env.X` por texto
 * em tempo de build apenas quando o acesso é estático. `process.env[nome]` não
 * é substituído e devolveria `undefined` no browser.
 */
export const publicEnv = parse(
  publicSchema,
  {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_MOTION_DEBUG: process.env.NEXT_PUBLIC_MOTION_DEBUG,
  },
  'pública',
);

let serverCache: z.infer<typeof serverSchema> | null = null;

/**
 * Acesso à configuração de servidor. É função e não constante de propósito: se
 * fosse avaliada no topo do módulo, qualquer import acidental a partir de um
 * componente de cliente arrastava-a para o bundle e rebentava no browser em
 * vez de rebentar na revisão.
 */
export function serverEnv(): z.infer<typeof serverSchema> {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() foi chamada no browser. É configuração de servidor.');
  }
  serverCache ??= parse(
    serverSchema,
    {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      DIAGNOSTIC_RATE_LIMIT_MAX: process.env.DIAGNOSTIC_RATE_LIMIT_MAX,
      DIAGNOSTIC_RATE_LIMIT_WINDOW_MS: process.env.DIAGNOSTIC_RATE_LIMIT_WINDOW_MS,
      DIAGNOSTIC_MAX_BODY_BYTES: process.env.DIAGNOSTIC_MAX_BODY_BYTES,
      CSP_REPORT_ONLY: process.env.CSP_REPORT_ONLY,
    },
    'servidor',
  );
  return serverCache;
}

/** Só para testes: força a próxima chamada a reler o ambiente. */
export function resetServerEnvCache(): void {
  serverCache = null;
}
