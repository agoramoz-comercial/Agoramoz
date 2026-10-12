/**
 * A leitura do `audit_log` por pessoas: o nome da acção em português, a
 * ligação para o objecto e o que mudou (antes → depois), sem despejar JSON.
 * Funções puras; a página só lê e mostra.
 */

export const ACCAO: Readonly<Record<string, string>> = {
  'oportunidade.mudar_fase': 'Mudou a fase',
  'oportunidade.perdida': 'Marcou como perdida',
  'oportunidade.motivo_perda': 'Registou o motivo da perda',
  'oportunidade.atribuir': 'Atribuiu o responsável',
  'oportunidade.proxima_accao': 'Definiu a próxima acção',
  'oportunidade.dados': 'Alterou valor e fecho',
  'oportunidade.actividade': 'Registou actividade',
  'diagnostico.enviar_para_revisao': 'Enviou o diagnóstico para revisão',
  'diagnostico.aprovar': 'Aprovou o diagnóstico',
  'diagnostico.rejeitar': 'Rejeitou o diagnóstico',
  'crm.exportar': 'Exportou uma lista (CSV)',
  'inquerito.criar': 'Criou um inquérito',
  'inquerito.guardar': 'Guardou um inquérito',
  'inquerito.publicar': 'Publicou um inquérito',
  'inquerito.exportar': 'Exportou respostas de um inquérito',
  'inquerito.link_criar': 'Criou uma ligação de inquérito',
  'inquerito.link_revogar': 'Revogou uma ligação de inquérito',
  'news.criar_artigo': 'Criou um artigo',
  'news.guardar_artigo': 'Guardou um artigo',
  'news.publicar_artigo': 'Publicou um artigo',
  'news.arquivar_artigo': 'Arquivou um artigo',
  'news.criar_anuncio': 'Criou um anúncio',
  'news.guardar_anuncio': 'Guardou um anúncio',
  'news.activar_anuncio': 'Activou ou pausou um anúncio',
  'perfil.criar': 'Criou um perfil',
  'perfil.definir_papel': 'Mudou o papel de alguém',
  'perfil.definir_activo': 'Activou ou desactivou alguém',
  'sessao.entrar': 'Entrou no admin',
};

export const ENTIDADE: Readonly<Record<string, string>> = {
  deal: 'Oportunidade',
  diagnostic: 'Diagnóstico',
  questionnaire: 'Inquérito',
  survey_link: 'Ligação de inquérito',
  news_artigo: 'Artigo',
  news_anuncio: 'Anúncio',
  profile: 'Perfil',
  crm_lista: 'Lista do CRM',
};

export const ENTIDADES = Object.keys(ENTIDADE);

export function rotuloAccao(accao: string): string {
  return ACCAO[accao] ?? accao;
}

/** Para onde leva cada objecto; `null` quando não há ecrã (ou o id não é de confiança). */
export function ligacaoDe(entidade: string, id: string): string | null {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  switch (entidade) {
    case 'deal':
      return uuid ? `/admin/oportunidades/${id}` : null;
    case 'diagnostic':
      return uuid ? `/admin/diagnosticos/${id}` : null;
    case 'questionnaire':
      return uuid ? `/admin/inqueritos/${id}` : null;
    case 'news_artigo':
      return uuid ? `/admin/news/${id}` : null;
    case 'profile':
      return '/admin/equipa';
    default:
      return null;
  }
}

function curto(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 80 ? `${s.slice(0, 79)}…` : s;
}

/** Só os campos que mudaram, «campo: antes → depois»; o que só existe depois aparece como novo. */
export function mudancas(antes: unknown, depois: unknown): { campo: string; antes: string; depois: string }[] {
  const a = antes && typeof antes === 'object' && !Array.isArray(antes) ? (antes as Record<string, unknown>) : {};
  const d = depois && typeof depois === 'object' && !Array.isArray(depois) ? (depois as Record<string, unknown>) : {};
  const campos = [...new Set([...Object.keys(a), ...Object.keys(d)])];
  return campos
    .filter((c) => JSON.stringify(a[c]) !== JSON.stringify(d[c]))
    .slice(0, 12)
    .map((c) => ({ campo: c, antes: curto(a[c]), depois: curto(d[c]) }));
}

export interface FiltrosAuditoria {
  readonly entidade?: string;
  readonly pessoa?: string;
  readonly desde?: string;
  readonly ate?: string;
  readonly id?: string;
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function lerFiltrosAuditoria(p: Record<string, string | undefined>): FiltrosAuditoria {
  return {
    entidade: p.entidade && ENTIDADES.includes(p.entidade) ? p.entidade : undefined,
    pessoa: p.pessoa && UUID.test(p.pessoa) ? p.pessoa : undefined,
    desde: p.desde && DATA.test(p.desde) ? p.desde : undefined,
    ate: p.ate && DATA.test(p.ate) ? p.ate : undefined,
    id: p.id && /^[\w-]{1,120}$/.test(p.id) ? p.id : undefined,
  };
}

export interface LinhaAuditoria {
  readonly id: number;
  readonly actor_id: string | null;
  readonly actor_type: string;
  readonly action: string;
  readonly entity_type: string;
  readonly entity_id: string;
  readonly before: unknown;
  readonly after: unknown;
  readonly occurred_at: string;
}

/** Quem agiu, por nome: uma pessoa da equipa, o sistema ou a IA — nunca um UUID. */
export function quemAgiu(l: Pick<LinhaAuditoria, 'actor_id' | 'actor_type'>, nomes: ReadonlyMap<string, string>): string {
  if (l.actor_type === 'system') return 'Sistema';
  if (l.actor_type === 'ai') return 'IA';
  return l.actor_id ? (nomes.get(l.actor_id) ?? '(perfil removido)') : '—';
}
