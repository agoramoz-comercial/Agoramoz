import { z } from 'zod';
import { chaves, dataObrigatoria, dataOpcional, marcado, opcional, valorOpcional } from '@/lib/forms/campos';
import {
  AREAS,
  CHAPEUS,
  ESTADOS_DECISAO,
  ESTADOS_PRIORIDADE,
  FASES_EXECUCAO,
  FASES_PROJETO,
  hojeEmMaputo,
  MOEDAS,
  PRONTIDAO,
  projetoActivo,
  TIPOS_MOVIMENTO,
  TIPOS_PRIORIDADE,
  type Chapeu,
} from './modelo';

/**
 * Os formulários do Gabinete. Validados aqui E pelos CHECK/funções da 0018:
 * aqui para a mensagem chegar antes e em português claro; lá para a regra
 * valer mesmo para quem não passe por este ecrã.
 */

const RISCOS = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' } as const;

const vazioNulo = <T extends string>(valores: readonly [T, ...T[]]) =>
  z.union([z.enum(valores), z.literal('')]).transform((v) => (v === '' ? null : v));

export const formularioDecisao = z
  .object({
    titulo: z.string().trim().min(3, 'Dê um título com pelo menos 3 caracteres.').max(200),
    contexto: opcional(2000),
    chapeu: z.enum(Object.keys(CHAPEUS) as [Chapeu, ...Chapeu[]], { message: 'Escolha o chapéu: Founder, CEO ou CTO.' }),
    estado: z.enum(chaves(ESTADOS_DECISAO)),
    decisao: opcional(2000),
    responsavel: opcional(120),
    consultados: opcional(300),
    indicador: opcional(200),
    dataRevisao: dataOpcional,
    recorrente: marcado,
    quemDecidiu: vazioNulo(['fundador', 'delegada'] as const),
  })
  .refine((f) => ['decidida', 'eliminar'].includes(f.estado) || (f.responsavel !== null && f.dataRevisao !== null), {
    message: 'Uma decisão em aberto precisa de responsável e data de revisão.',
    path: ['responsavel'],
  })
  .refine((f) => f.estado !== 'decidida' || (f.decisao !== null && f.quemDecidiu !== null), {
    message: 'Para fechar a decisão, escreva o que se decidiu e quem decidiu.',
    path: ['decisao'],
  });
export type FormularioDecisao = z.infer<typeof formularioDecisao>;

export const formularioPrioridade = z.object({
  trimestre: z.string().trim().regex(/^20\d{2}-T[1-4]$/, 'Trimestre inválido (ex.: 2026-T4).'),
  tipo: z.enum(chaves(TIPOS_PRIORIDADE)),
  resultado: z.string().trim().min(3, 'Escreva o resultado esperado.').max(300),
  indicador: opcional(200),
  meta: opcional(200),
  estado: z.enum(chaves(ESTADOS_PRIORIDADE)),
  nota: opcional(1000),
});

const PRONTIDAO_CHAVES = PRONTIDAO.map((c) => c.chave);

export const formularioProjeto = z
  .object({
    nome: z.string().trim().min(3, 'Dê um nome com pelo menos 3 caracteres.').max(160),
    cliente: opcional(160),
    fase: z.enum(chaves(FASES_PROJETO)),
    responsavel: opcional(120),
    sponsor: opcional(120),
    resultado: opcional(1000),
    escopo: opcional(2000),
    moeda: z.enum(MOEDAS),
    receitaContratada: valorOpcional,
    receitaFaturada: valorOpcional,
    receitaRecebida: valorOpcional,
    custosVariaveis: valorOpcional,
    prontidao: z.object(
      Object.fromEntries(PRONTIDAO_CHAVES.map((c) => [c, marcado])) as Record<(typeof PRONTIDAO)[number]['chave'], typeof marcado>,
    ),
    risco: z.enum(chaves(RISCOS)),
    proximaAccao: opcional(300),
    proximaData: dataOpcional,
    ligacao: opcional(2048).refine(
      (v) => v === null || (/^https:\/\/[^\s/]+/.test(v) && !/\s/.test(v)),
      'A ligação tem de começar por https:// (SharePoint, Drive…).',
    ),
  })
  .refine((f) => !projetoActivo(f.fase) || (f.proximaAccao !== null && f.proximaData !== null), {
    message: 'Um projecto activo precisa de próxima acção e data.',
    path: ['proximaAccao'],
  })
  .refine((f) => f.receitaFaturada === null || f.receitaContratada === null || f.receitaFaturada <= f.receitaContratada, {
    message: 'A receita faturada não pode passar a contratada.',
    path: ['receitaFaturada'],
  })
  .refine((f) => f.receitaRecebida === null || f.receitaFaturada === null || f.receitaRecebida <= f.receitaFaturada, {
    message: 'A receita recebida não pode passar a faturada.',
    path: ['receitaRecebida'],
  })
  .superRefine((f, ctx) => {
    if (!(FASES_EXECUCAO as readonly string[]).includes(f.fase)) return;
    const falta = PRONTIDAO.filter((c) => !f.prontidao[c.chave]).map((c) => c.texto);
    if (falta.length > 0) {
      ctx.addIssue({ code: 'custom', message: `Para implementar falta: ${falta.join(', ')}.`, path: ['fase'] });
    }
  });
export type FormularioProjeto = z.infer<typeof formularioProjeto>;

/** Os sete critérios na ordem que `guardar_projeto` recebe (`p_prontidao`). */
export function prontidaoParaGravar(f: FormularioProjeto): boolean[] {
  return PRONTIDAO.map((c) => f.prontidao[c.chave]);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const formularioMovimento = z
  .object({
    tipo: z.enum(chaves(TIPOS_MOVIMENTO)),
    descricao: z.string().trim().min(1, 'Descreva o movimento.').max(200),
    projeto: z
      .string()
      .trim()
      .refine((v) => v === '' || UUID.test(v), 'Projecto inválido.')
      .transform((v) => (v === '' ? null : v)),
    valor: valorOpcional.refine((v) => v !== null, 'Indique o valor.'),
    moeda: z.enum(MOEDAS),
    dataPrevista: dataObrigatoria('Indique a data.'),
    dataEfectiva: dataOpcional,
  })
  .refine((f) => f.tipo === 'saldo' || (f.valor ?? 0) > 0, {
    message: 'Um recebimento ou pagamento tem de ter valor maior do que zero.',
    path: ['valor'],
  })
  // Realizado é passado (a base também o impõe): no fuso de Maputo.
  .refine((f) => (f.tipo === 'saldo' ? f.dataPrevista : (f.dataEfectiva ?? '')) <= hojeEmMaputo(new Date()), {
    message: 'A data efectiva (ou do saldo) não pode ser futura.',
    path: ['dataEfectiva'],
  });

const horas = (min: number) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(',', '.'))
    .refine((v) => /^\d{1,2}(\.\d)?$/.test(v) && Number(v) >= min && Number(v) <= 80, `Horas por semana entre ${min} e 80.`)
    .transform(Number);

export const formularioPessoa = z.object({
  nome: z.string().trim().min(1, 'Indique o nome.').max(80),
  funcao: opcional(80),
  area: z.enum(chaves(AREAS)),
  horasSemana: horas(0),
  activa: marcado,
});

export const formularioAlocacao = z.object({
  pessoa: z.string().uuid('Escolha a pessoa.'),
  projeto: z.string().uuid('Escolha o projecto.'),
  horasSemana: horas(0.5),
  ate: dataOpcional,
});
