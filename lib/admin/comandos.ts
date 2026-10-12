import type { GrupoNav } from '@/components/admin/AdminNav';

/**
 * Os comandos da paleta (⌘K) e os atalhos de teclado do admin, em funções
 * puras. Os comandos nascem da navegação já filtrada por papel e módulo —
 * a paleta nunca oferece um destino que daria 404 a quem a abre.
 */

export interface Comando {
  readonly id: string;
  readonly texto: string;
  readonly href: string;
  readonly grupo: string;
  readonly atalho?: string;
}

/** Vistas guardadas que valem um comando próprio, se a secção existir para quem pede. */
const VISTAS: readonly { base: string; texto: string; href: string }[] = [
  { base: '/admin/oportunidades', texto: 'Pipeline · As minhas', href: '/admin/oportunidades?vista=minhas' },
  { base: '/admin/oportunidades', texto: 'Pipeline · Atrasadas', href: '/admin/oportunidades?vista=atrasadas' },
  { base: '/admin/oportunidades', texto: 'Pipeline · Sem dono', href: '/admin/oportunidades?vista=sem-dono' },
  { base: '/admin/oportunidades', texto: 'Pipeline · Quadro por fase', href: '/admin/oportunidades?modo=quadro' },
  { base: '/admin/diagnosticos', texto: 'Diagnósticos por rever', href: '/admin/diagnosticos?estado=por-rever' },
  { base: '/admin/painel', texto: 'Painel · últimos 7 dias', href: '/admin/painel?periodo=7' },
  { base: '/admin/painel', texto: 'Painel · últimos 90 dias', href: '/admin/painel?periodo=90' },
];

/** `g` + tecla: ir directamente para uma secção. */
export const SEQUENCIAS: Readonly<Record<string, { href: string; texto: string }>> = {
  h: { href: '/admin', texto: 'Hoje' },
  d: { href: '/admin/painel', texto: 'Painel' },
  p: { href: '/admin/oportunidades', texto: 'Pipeline' },
  r: { href: '/admin/diagnosticos?estado=por-rever', texto: 'Diagnósticos por rever' },
  c: { href: '/admin/contactos', texto: 'Contactos' },
  o: { href: '/admin/organizacoes', texto: 'Organizações' },
};

/** Para a ajuda (`?`): o que cada atalho faz, pela ordem em que se aprende. */
export const ATALHOS: readonly { teclas: string; faz: string }[] = [
  { teclas: '⌘ K · Ctrl K', faz: 'Abrir a pesquisa e os comandos' },
  { teclas: '/', faz: 'Abrir a pesquisa' },
  { teclas: '?', faz: 'Mostrar estes atalhos' },
  ...Object.entries(SEQUENCIAS).map(([t, s]) => ({ teclas: `g ${t}`, faz: `Ir para ${s.texto}` })),
  { teclas: 'j · k', faz: 'Descer e subir nas listas (Enter abre)' },
  { teclas: 'Esc', faz: 'Fechar' },
];

const atalhoDe = (href: string) => Object.entries(SEQUENCIAS).find(([, s]) => s.href === href)?.[0];

export function comandosDe(grupos: readonly GrupoNav[]): Comando[] {
  const entradas = grupos.flatMap((g) => g.entradas.map((e) => ({ ...e, grupo: g.titulo })));
  const existe = new Set(entradas.map((e) => e.href));
  const ir: Comando[] = entradas.map((e) => {
    const t = atalhoDe(e.href);
    return { id: `ir:${e.href}`, texto: e.texto, href: e.href, grupo: 'Ir para', ...(t ? { atalho: `g ${t}` } : {}) };
  });
  const vistas: Comando[] = VISTAS.filter((v) => existe.has(v.base)).map((v) => {
    const t = atalhoDe(v.href);
    return { id: `vista:${v.href}`, texto: v.texto, href: v.href, grupo: 'Vistas', ...(t ? { atalho: `g ${t}` } : {}) };
  });
  return [...ir, ...vistas];
}

/** Minúsculas e sem acentos: «organizacoes» encontra «Organizações». */
export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Todos os termos têm de aparecer; os que começam pelo termo vêm primeiro. Sem termo, todos. */
export function filtrarComandos(comandos: readonly Comando[], q: string): Comando[] {
  const termos = normalizar(q).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return [...comandos];
  const comPeso = comandos.flatMap((c) => {
    const t = normalizar(`${c.texto} ${c.grupo}`);
    if (!termos.every((x) => t.includes(x))) return [];
    return [{ c, peso: normalizar(c.texto).startsWith(termos[0]!) ? 0 : 1 }];
  });
  return comPeso.sort((a, b) => a.peso - b.peso).map((x) => x.c);
}

export type Accao =
  | { tipo: 'nada' }
  | { tipo: 'pendente' }
  | { tipo: 'paleta' }
  | { tipo: 'ajuda' }
  | { tipo: 'ir'; href: string }
  | { tipo: 'mover'; passo: 1 | -1 };

/**
 * Uma tecla (sem modificadores) traduzida em acção, sabendo se a anterior foi
 * um `g` à espera da segunda. ⌘K/Ctrl+K trata-se à parte, porque funciona até
 * dentro de campos.
 */
export function interpretar(tecla: string, gPendente: boolean): Accao {
  if (gPendente) {
    const s = SEQUENCIAS[tecla];
    return s ? { tipo: 'ir', href: s.href } : { tipo: 'nada' };
  }
  switch (tecla) {
    case 'g':
      return { tipo: 'pendente' };
    case '/':
      return { tipo: 'paleta' };
    case '?':
      return { tipo: 'ajuda' };
    case 'j':
      return { tipo: 'mover', passo: 1 };
    case 'k':
      return { tipo: 'mover', passo: -1 };
    default:
      return { tipo: 'nada' };
  }
}

/** Num campo de texto, as letras são texto — nenhum atalho de uma tecla dispara. */
export function emCampo(alvo: { tagName?: string; isContentEditable?: boolean } | null): boolean {
  if (!alvo) return false;
  return alvo.isContentEditable === true || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName ?? '');
}
