import { z } from 'zod';
import {
  CRITERIOS,
  DECISOES,
  ESTADOS_DOCUMENTO,
  FONTES,
  MEMO,
  MOEDAS,
  PAPEIS_LIGACAO,
  RELACOES,
  SECTORES,
  TIPOS_STAKEHOLDER,
  TODAS_AS_FASES,
  URGENCIAS,
  type EstadoFase,
} from './modelo';

/**
 * Os formulários do Espaço CEnO. O que vem do browser são dados, não
 * confiança: cada campo é validado aqui E pelos CHECK da 0017. Os textos de
 * erro dizem o que fazer, porque aparecem no ecrã tal como estão.
 */

const chaves = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No máximo ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v));

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const dataOpcional = z
  .string()
  .trim()
  .refine((v) => v === '' || (DATA.test(v) && !Number.isNaN(Date.parse(v))), 'Data inválida.')
  .transform((v) => (v === '' ? null : v));

/** «1 500 000», «1500000,50» ou «1500000.50» → número; vazio → nulo. */
const valorOpcional = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s ]/g, '').replace(',', '.'))
  .refine((v) => v === '' || /^\d{1,14}(\.\d{1,2})?$/.test(v), 'Valor inválido: use só números.')
  .transform((v) => (v === '' ? null : Number(v)));

const marcado = z
  .union([z.literal('on'), z.literal('1'), z.literal(''), z.undefined(), z.null()])
  .transform((v) => v === 'on' || v === '1');

export const formularioOportunidade = z
  .object({
    titulo: z.string().trim().min(3, 'Dê um título com pelo menos 3 caracteres.').max(160),
    organizacao: opcional(160),
    sector: z.enum(chaves(SECTORES), { message: 'Escolha o sector.' }),
    problema: opcional(2000),
    fonte: z
      .union([z.enum(chaves(FONTES)), z.literal('')])
      .transform((v) => (v === '' ? null : v)),
    urgencia: z.enum(chaves(URGENCIAS)),
    valorMin: valorOpcional,
    valorMax: valorOpcional,
    moeda: z.enum(MOEDAS),
    valorEvidencia: opcional(500),
    proximaAccao: z.string().trim().min(1, 'Uma oportunidade activa precisa de próxima acção.').max(300),
    proximaData: z.string().trim().regex(DATA, 'Indique a data da próxima acção.'),
    responsavel: opcional(120),
  })
  .refine((f) => f.valorMin === null || f.valorMax === null || f.valorMax >= f.valorMin, {
    message: 'O valor máximo não pode ser menor do que o mínimo.',
    path: ['valorMax'],
  })
  .refine((f) => (f.valorMin === null && f.valorMax === null) || f.valorEvidencia !== null, {
    message: 'Um valor precisa de evidência: de onde vem a estimativa?',
    path: ['valorEvidencia'],
  });
export type FormularioOportunidade = z.infer<typeof formularioOportunidade>;

export const formularioStakeholder = z
  .object({
    organizacao: z.string().trim().min(1, 'Indique a organização.').max(160),
    pessoa: opcional(120),
    cargo: opcional(120),
    pais: opcional(60),
    sector: opcional(80),
    tipo: z.enum(chaves(TIPOS_STAKEHOLDER), { message: 'Escolha o tipo de stakeholder.' }),
    interesse: opcional(1000),
    poder: z
      .union([z.enum(['1', '2', '3', '4', '5']), z.literal('')])
      .transform((v) => (v === '' ? null : Number(v))),
    relacao: z.enum(chaves(RELACOES)),
    ultima: dataOpcional,
    proximaAccao: opcional(300),
    proximaData: dataOpcional,
    origem: opcional(300),
    consentimento: marcado,
    responsavel: opcional(120),
    activo: marcado,
  })
  .refine((f) => !f.activo || (f.proximaAccao !== null && f.proximaData !== null), {
    message: '«Manter relação» não é uma próxima acção: um contacto activo precisa de acção e data — ou marque-o como inactivo.',
    path: ['proximaAccao'],
  });
export type FormularioStakeholder = z.infer<typeof formularioStakeholder>;

const nota = z.enum(['0', '1', '2', '3', '4', '5']).transform(Number);

export const formularioAvaliacao = z.object(
  Object.fromEntries(CRITERIOS.map((c) => [c.chave, nota])) as Record<(typeof CRITERIOS)[number]['chave'], typeof nota>,
);

export const formularioFase = z.object({
  fase: z
    .string()
    .refine((v): v is EstadoFase => (TODAS_AS_FASES as readonly string[]).includes(v), 'Etapa inválida.'),
  nota: opcional(4000),
  motivo: opcional(500),
});

export const formularioMemo = z.object(
  Object.fromEntries(MEMO.map((m) => [m.chave, z.string().max(4000, 'Cada secção tem no máximo 4000 caracteres.')])) as Record<
    (typeof MEMO)[number]['chave'],
    z.ZodString
  >,
);

/** Só as secções escritas vão para a base (vazias não ocupam espaço nem contam como feitas). */
export function memoParaGravar(m: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(m)
      .map(([k, v]) => [k, v.trim()] as const)
      .filter(([, v]) => v.length > 0),
  );
}

export const formularioRegisto = z
  .object({
    tipo: z.enum(['nota', 'reuniao', 'decisao']),
    decisao: z
      .union([z.enum(chaves(DECISOES)), z.literal('')])
      .transform((v) => (v === '' ? null : v)),
    corpo: opcional(4000),
  })
  .refine((f) => f.tipo !== 'decisao' || f.decisao !== null, {
    message: 'Escolha a decisão do comité.',
    path: ['decisao'],
  })
  .refine((f) => f.tipo === 'decisao' || f.corpo !== null, {
    message: 'Escreva a nota ou a ata.',
    path: ['corpo'],
  });

export const formularioDocumento = z.object({
  pasta: z.coerce.number().int().min(1).max(12),
  estado: z.enum(chaves(ESTADOS_DOCUMENTO)),
  ligacao: opcional(2048).refine(
    (v) => v === null || (/^https:\/\/[^\s/]+/.test(v) && !/\s/.test(v)),
    'A ligação tem de começar por https:// (SharePoint, Drive…).',
  ),
  nota: opcional(300),
});

export const formularioLigacao = z.object({
  stakeholder: z.string().uuid('Escolha um stakeholder.'),
  papel: z.enum(chaves(PAPEIS_LIGACAO)),
});
