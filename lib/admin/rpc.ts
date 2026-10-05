/**
 * O contrato com as migrações 0006 (acções do CRM), 0013 (inquéritos) e 0015 (News).
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
  // 0013 — inquéritos
  criar_inquerito: ['p_slug', 'p_nome', 'p_spec'],
  guardar_rascunho: ['p_id', 'p_nome', 'p_spec'],
  publicar_versao: ['p_id'],
  definir_inquerito_activo: ['p_id', 'p_activo'],
  criar_link: ['p_id', 'p_link_id', 'p_token_hash', 'p_rotulo', 'p_expira', 'p_max'],
  revogar_link: ['p_link_id'],
  registar_exportacao_inquerito: ['p_id', 'p_com_contacto'],
  // 0015 — AGORAMOZ News (redacção e publicidade)
  criar_artigo: [
    'p_slug',
    'p_idioma',
    'p_titulo',
    'p_entrada',
    'p_seccao',
    'p_prioridade',
    'p_analise',
    'p_fonte_nome',
    'p_fonte_url',
  ],
  guardar_artigo: [
    'p_id',
    'p_revisao',
    'p_slug',
    'p_titulo',
    'p_entrada',
    'p_seccao',
    'p_nota',
    'p_fonte_nome',
    'p_fonte_url',
  ],
  publicar_artigo: ['p_id', 'p_revisao'],
  arquivar_artigo: ['p_id', 'p_revisao'],
  guardar_anuncio: [
    'p_id',
    'p_revisao',
    'p_slug',
    'p_titulo',
    'p_mensagem',
    'p_ticker',
    'p_cta',
    'p_destino',
    'p_tema',
    'p_inicio',
    'p_fim',
    'p_peso',
  ],
  definir_anuncio_activo: ['p_id', 'p_activo'],
} as const satisfies Record<string, readonly string[]>;

export type NomeRpc = keyof typeof RPC;
