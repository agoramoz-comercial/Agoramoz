import { z } from 'zod';
import { AGENTES, type AgenteZ } from './agentes-dados';

/**
 * Autonomia dos agentes ZABATAINA dentro da constituição (§10).
 *
 * Um agente pode analisar, propor e registar tarefas e rascunhos INTERNOS.
 * Tudo o que sai para fora, mexe em dinheiro, publica ou não se pode desfazer
 * fica em «precisa de aprovação» — e só um administrador aprova ou recusa.
 * Aprovar regista a decisão; nada é executado automaticamente: a execução
 * continua a ser feita por uma pessoa, no ecrã respectivo.
 *
 * A classe de cada proposta é decidida AQUI pelo tipo, nunca pelo modelo.
 */

export { AGENTES, type AgenteZ };

export const TIPOS_ACCAO = [
  'tarefa_interna',
  'rascunho_interno',
  'comunicacao_externa',
  'accao_financeira',
  'publicacao',
  'alteracao_irreversivel',
] as const;
export type TipoAccao = (typeof TIPOS_ACCAO)[number];

export const ROTULO_TIPO: Readonly<Record<TipoAccao, string>> = {
  tarefa_interna: 'Tarefa interna',
  rascunho_interno: 'Rascunho interno',
  comunicacao_externa: 'Comunicação externa',
  accao_financeira: 'Acção financeira',
  publicacao: 'Publicação',
  alteracao_irreversivel: 'Alteração irreversível',
};

/** Só o que fica dentro da casa e se pode desfazer dispensa aprovação. */
export function precisaAprovacao(tipo: TipoAccao): boolean {
  return tipo !== 'tarefa_interna' && tipo !== 'rascunho_interno';
}

export type EstadoAccao = 'registada' | 'precisa_aprovacao' | 'aprovada' | 'recusada';

export const ROTULO_ESTADO: Readonly<Record<EstadoAccao, string>> = {
  registada: 'Registada',
  precisa_aprovacao: 'Precisa de aprovação',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
};

export function estadoInicial(tipo: TipoAccao): EstadoAccao {
  return precisaAprovacao(tipo) ? 'precisa_aprovacao' : 'registada';
}

/** Só administradores decidem. Comercial e colaborador nunca. */
export function podeDecidir(papel: string | null | undefined): boolean {
  return papel === 'admin';
}

export function agentePorId(id: string): AgenteZ | undefined {
  return AGENTES.find((a) => a.id === id);
}

export const propostaSchema = z.object({
  tipo: z.enum(TIPOS_ACCAO),
  titulo: z.string().trim().min(3).max(140),
  descricao: z.string().trim().max(800).default(''),
});
export type Proposta = z.infer<typeof propostaSchema>;

export const respostaAgenteSchema = z.object({
  resposta: z.string().trim().min(1).max(4000),
  propostas: z.array(z.unknown()).max(10).default([]),
});

/** Do que o modelo devolveu: só propostas válidas, no máximo 3. As inválidas contam-se. */
export function propostasValidas(brutas: readonly unknown[]): { propostas: Proposta[]; retiradas: number } {
  const propostas: Proposta[] = [];
  let retiradas = 0;
  for (const b of brutas) {
    const r = propostaSchema.safeParse(b);
    if (r.success && propostas.length < 3) propostas.push(r.data);
    else retiradas++;
  }
  return { propostas, retiradas };
}

export interface AccaoAgente {
  readonly id: string;
  readonly agente: string;
  readonly tipo: TipoAccao;
  readonly titulo: string;
  readonly descricao: string;
  readonly estado: EstadoAccao;
  readonly alvo: string | null;
  readonly criadaEm: string;
}
