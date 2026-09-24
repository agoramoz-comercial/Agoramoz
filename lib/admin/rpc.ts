/**
 * O contrato com a migração 0006.
 *
 * Existe como dado, e não espalhado por chamadas, para que um teste o possa
 * comparar com a assinatura real lida do ficheiro SQL. Um parâmetro renomeado
 * no SQL sem o correspondente aqui não parte o typecheck nem o lint: parte a
 * primeira vez que alguém carrega em «Aprovar». Assim parte em CI.
 */
export const RPC = {
  enviar_para_revisao: ['p_id', 'p_revision'],
  aprovar_diagnostico: ['p_id', 'p_revision'],
  rejeitar_diagnostico: ['p_id', 'p_revision', 'p_motivo'],
  mudar_fase_oportunidade: ['p_deal_id', 'p_fase', 'p_nota'],
  atribuir_oportunidade: ['p_deal_id', 'p_owner'],
  registar_actividade: ['p_deal_id', 'p_tipo', 'p_corpo'],
  criar_perfil: ['p_user', 'p_nome', 'p_papel'],
  definir_papel: ['p_user', 'p_papel'],
  definir_perfil_activo: ['p_user', 'p_activo'],
  registar_entrada: ['p_ip_hash', 'p_ua_hash'],
} as const satisfies Record<string, readonly string[]>;

export type NomeRpc = keyof typeof RPC;
