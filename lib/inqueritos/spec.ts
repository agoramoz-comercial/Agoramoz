import { z } from 'zod';

/**
 * O formato de um inquérito (`questionnaire_versions.spec`, `schema_version
 * 'survey.v1'`).
 *
 * Um inquérito é um documento JSON versionado: publicado, fica imutável na
 * base (trigger `bloquear_versao_publicada`, 0003). Este esquema é a única
 * definição do formato — o construtor do admin, a rota pública e a página do
 * respondente validam contra ele.
 *
 * Regras que o esquema garante e que o resto do código assume:
 *  - chaves de pergunta e de opção estáveis e únicas;
 *  - `mostrarSe` só aponta para uma pergunta ANTERIOR que tenha resposta, e
 *    com um valor que essa pergunta pode dar — sem ciclos, sem condições mortas;
 *  - nenhum tipo de pergunta pede email ou telefone: dados de contacto só
 *    entram pelo bloco `contacto`, que obriga a consentimento.
 *
 * Todo o texto é texto: o respondente vê-o tal e qual, sem HTML nem markdown.
 */

export const SCHEMA_VERSION = 'survey.v1' as const;

export const LIMITES = {
  perguntas: 50,
  opcoes: 20,
  titulo: 300,
  ajuda: 500,
  rotuloOpcao: 120,
  textoCurto: 200,
  textoLongo: 4000,
  ecraTitulo: 160,
  ecraCorpo: 1000,
  consentimento: 4000,
  specBytes: 65_536,
} as const;

const chave = z.string().regex(/^[a-z0-9_]{1,40}$/, 'chave: minúsculas, números e _, até 40');
const texto = (max: number) => z.string().trim().min(1).max(max);
const textoOpcional = (max: number) => z.string().trim().max(max).optional();

const condicao = z.strictObject({
  pergunta: chave,
  op: z.enum(['igual', 'inclui']),
  valor: z.string().min(1).max(40),
});
export type Condicao = z.infer<typeof condicao>;

const base = {
  chave,
  titulo: texto(LIMITES.titulo),
  ajuda: textoOpcional(LIMITES.ajuda),
  obrigatoria: z.boolean().default(false),
  mostrarSe: condicao.optional(),
};

const opcao = z.strictObject({ chave, rotulo: texto(LIMITES.rotuloOpcao) });
const opcoes = z.array(opcao).min(2).max(LIMITES.opcoes);

const pergunta = z.discriminatedUnion('tipo', [
  z.strictObject({
    tipo: z.literal('texto_curto'),
    ...base,
    max: z.number().int().min(1).max(LIMITES.textoCurto).default(LIMITES.textoCurto),
  }),
  z.strictObject({
    tipo: z.literal('texto_longo'),
    ...base,
    max: z.number().int().min(1).max(LIMITES.textoLongo).default(LIMITES.textoLongo),
  }),
  z.strictObject({ tipo: z.literal('escolha_unica'), ...base, opcoes }),
  z.strictObject({
    tipo: z.literal('escolha_multipla'),
    ...base,
    opcoes,
    min: z.number().int().min(1).max(LIMITES.opcoes).optional(),
    max: z.number().int().min(1).max(LIMITES.opcoes).optional(),
  }),
  z.strictObject({ tipo: z.literal('avaliacao'), ...base }),
  z.strictObject({ tipo: z.literal('nps'), ...base }),
  z.strictObject({
    tipo: z.literal('numero'),
    ...base,
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    inteiro: z.boolean().default(false),
  }),
  z.strictObject({ tipo: z.literal('data'), ...base }),
  // Uma secção é texto entre perguntas: não tem resposta nem pode ser obrigatória.
  z.strictObject({
    tipo: z.literal('seccao'),
    chave,
    titulo: texto(LIMITES.titulo),
    ajuda: textoOpcional(LIMITES.ajuda),
    mostrarSe: condicao.optional(),
  }),
]);
export type Pergunta = z.infer<typeof pergunta>;
export type TipoPergunta = Pergunta['tipo'];

export const CAMPOS_CONTACTO = ['nome', 'email', 'telefone', 'organizacao'] as const;
export type CampoContacto = (typeof CAMPOS_CONTACTO)[number];

const ecra = z.strictObject({
  titulo: texto(LIMITES.ecraTitulo),
  corpo: textoOpcional(LIMITES.ecraCorpo),
});

const specBase = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  idioma: z.enum(['pt', 'en']),
  boasVindas: ecra,
  agradecimento: ecra,
  perguntas: z.array(pergunta).min(1).max(LIMITES.perguntas),
  /**
   * Bloco de contacto opcional. Sempre facultativo para quem responde: o
   * inquérito é anónimo por omissão. Se a pessoa deixar algum dado, tem de
   * aceitar este texto — e é este texto, exactamente, que fica registado.
   */
  contacto: z
    .strictObject({
      campos: z.array(z.enum(CAMPOS_CONTACTO)).min(1).max(CAMPOS_CONTACTO.length),
      textoConsentimento: texto(LIMITES.consentimento),
    })
    .optional(),
});

/** Perguntas que têm resposta (tudo menos secções). */
export function temResposta(p: Pergunta): p is Exclude<Pergunta, { tipo: 'seccao' }> {
  return p.tipo !== 'seccao';
}

/** Os valores que uma condição pode comparar, por tipo da pergunta-alvo. */
export function valoresDeCondicao(
  alvo: Pergunta,
): { ops: readonly Condicao['op'][]; valores: readonly string[] } | null {
  switch (alvo.tipo) {
    case 'escolha_unica':
      return { ops: ['igual'], valores: alvo.opcoes.map((o) => o.chave) };
    case 'escolha_multipla':
      return { ops: ['inclui'], valores: alvo.opcoes.map((o) => o.chave) };
    case 'avaliacao':
      return { ops: ['igual'], valores: ['1', '2', '3', '4', '5'] };
    case 'nps':
      return { ops: ['igual'], valores: Array.from({ length: 11 }, (_, i) => String(i)) };
    default:
      // Texto, número e data não servem de condição na v1: comparar texto livre
      // por igualdade é frágil, e intervalos numéricos ficam para depois.
      return null;
  }
}

export const specInquerito = specBase.superRefine((spec, ctx) => {
  const vistas = new Map<string, Pergunta>();

  spec.perguntas.forEach((p, i) => {
    if (vistas.has(p.chave)) {
      ctx.addIssue({
        code: 'custom',
        path: ['perguntas', i, 'chave'],
        message: `chave repetida: ${p.chave}`,
      });
    }

    if ('opcoes' in p) {
      const chaves = p.opcoes.map((o) => o.chave);
      if (new Set(chaves).size !== chaves.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['perguntas', i, 'opcoes'],
          message: 'opções com chaves repetidas',
        });
      }
    }

    if (p.tipo === 'escolha_multipla') {
      if (p.min !== undefined && p.min > p.opcoes.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['perguntas', i, 'min'],
          message: 'mínimo maior do que o número de opções',
        });
      }
      if (p.max !== undefined && p.max > p.opcoes.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['perguntas', i, 'max'],
          message: 'máximo maior do que o número de opções',
        });
      }
      if (p.min !== undefined && p.max !== undefined && p.min > p.max) {
        ctx.addIssue({
          code: 'custom',
          path: ['perguntas', i, 'min'],
          message: 'mínimo maior do que o máximo',
        });
      }
    }

    if (p.tipo === 'numero' && p.min !== undefined && p.max !== undefined && p.min > p.max) {
      ctx.addIssue({
        code: 'custom',
        path: ['perguntas', i, 'min'],
        message: 'mínimo maior do que o máximo',
      });
    }

    if (p.mostrarSe) {
      // Só perguntas ANTERIORES: é o que torna impossível um ciclo.
      const alvo = vistas.get(p.mostrarSe.pergunta);
      const possiveis = alvo ? valoresDeCondicao(alvo) : null;
      if (!alvo) {
        ctx.addIssue({
          code: 'custom',
          path: ['perguntas', i, 'mostrarSe', 'pergunta'],
          message: 'a condição tem de apontar para uma pergunta anterior',
        });
      } else if (!possiveis) {
        ctx.addIssue({
          code: 'custom',
          path: ['perguntas', i, 'mostrarSe', 'pergunta'],
          message: `uma pergunta do tipo ${alvo.tipo} não serve de condição`,
        });
      } else {
        if (!possiveis.ops.includes(p.mostrarSe.op)) {
          ctx.addIssue({
            code: 'custom',
            path: ['perguntas', i, 'mostrarSe', 'op'],
            message: 'operação incompatível',
          });
        }
        if (!possiveis.valores.includes(p.mostrarSe.valor)) {
          ctx.addIssue({
            code: 'custom',
            path: ['perguntas', i, 'mostrarSe', 'valor'],
            message: 'valor que a pergunta-alvo não pode dar',
          });
        }
      }
    }

    vistas.set(p.chave, p);
  });

  if (!spec.perguntas.some(temResposta)) {
    ctx.addIssue({
      code: 'custom',
      path: ['perguntas'],
      message: 'o inquérito precisa de pelo menos uma pergunta',
    });
  }

  if (spec.contacto && new Set(spec.contacto.campos).size !== spec.contacto.campos.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['contacto', 'campos'],
      message: 'campos de contacto repetidos',
    });
  }

  const bytes = new TextEncoder().encode(JSON.stringify(spec)).length;
  if (bytes > LIMITES.specBytes) {
    ctx.addIssue({ code: 'custom', path: [], message: `inquérito grande demais (${bytes} bytes)` });
  }
});

export type SpecInquerito = z.infer<typeof specInquerito>;

/**
 * A versão do consentimento sai do TEXTO, não é escrita à mão — o mesmo
 * princípio de `lib/diagnostic/consent.ts`: mudar uma vírgula muda a versão,
 * e um registo diz sempre qual foi o texto que a pessoa leu.
 */
export async function versaoDoConsentimento(texto: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  const hex = Array.from(new Uint8Array(digest).slice(0, 6))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `consent.inquerito.${hex}`;
}

/** Um inquérito novo, pronto a editar: uma pergunta, sem contacto. */
export function specInicial(idioma: 'pt' | 'en' = 'pt'): SpecInquerito {
  return specInquerito.parse({
    schemaVersion: SCHEMA_VERSION,
    idioma,
    boasVindas:
      idioma === 'pt'
        ? { titulo: 'Obrigado por participar', corpo: 'Leva cerca de 2 minutos.' }
        : { titulo: 'Thank you for taking part', corpo: 'It takes about 2 minutes.' },
    agradecimento:
      idioma === 'pt'
        ? { titulo: 'Resposta registada. Obrigado.' }
        : { titulo: 'Response recorded. Thank you.' },
    perguntas: [
      {
        tipo: 'escolha_unica',
        chave: 'p1',
        titulo: idioma === 'pt' ? 'Primeira pergunta' : 'First question',
        obrigatoria: true,
        opcoes: [
          { chave: 'a', rotulo: idioma === 'pt' ? 'Opção A' : 'Option A' },
          { chave: 'b', rotulo: idioma === 'pt' ? 'Opção B' : 'Option B' },
        ],
      },
    ],
  });
}
