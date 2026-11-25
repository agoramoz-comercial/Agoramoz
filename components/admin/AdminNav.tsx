'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Briefcase,
  Building2,
  ClipboardCheck,
  FileText,
  History,
  Inbox,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Network,
  Newspaper,
  Radar,
  Receipt,
  GraduationCap,
  Sun,
  UserCog,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * A navegação é um componente de cliente porque `aria-current` precisa de
 * saber onde estamos (um layout de servidor não sabe o caminho).
 *
 * O ícone viaja como chave e não como componente: uma função não atravessa a
 * fronteira servidor → cliente.
 */

const ICONES = {
  hoje: Sun,
  painel: LayoutDashboard,
  aeos: Network,
  propostas: FileText,
  facturacao: Receipt,
  cursos: GraduationCap,
  diagnosticos: ClipboardCheck,
  oportunidades: Briefcase,
  contactos: Users,
  organizacoes: Building2,
  trafego: Activity,
  aquisicao: Radar,
  inqueritos: ListChecks,
  news: Newspaper,
  fila: Inbox,
  equipa: UserCog,
  auditoria: History,
  energia: Zap,
  gabinete: Landmark,
  conta: KeyRound,
} satisfies Record<string, LucideIcon>;

export interface Entrada {
  readonly href: string;
  readonly texto: string;
  readonly icone: keyof typeof ICONES;
}

export interface GrupoNav {
  readonly titulo: string;
  readonly entradas: readonly Entrada[];
}

/** `/admin` só é a página activa quando é exactamente ela; as outras contam os filhos. */
export function estaActiva(href: string, caminho: string): boolean {
  if (href === '/admin') return caminho === '/admin';
  return caminho === href || caminho.startsWith(`${href}/`);
}

/** O grupo da página actual: o que contém a entrada activa (ou o primeiro). */
export function grupoActivo(grupos: readonly GrupoNav[], caminho: string): GrupoNav | undefined {
  // A entrada mais específica ganha: `/admin` só conta quando é exactamente ela.
  return grupos.find((g) => g.entradas.some((e) => estaActiva(e.href, caminho)));
}

/**
 * NAV-TAR-01 — Navegação por tarefa: uma pílula escura com os seis grupos
 * (o activo em âmbar) e, por baixo, as secções do grupo activo em pílulas.
 * No telemóvel a pílula desliza na horizontal: são seis palavras curtas.
 */
export function AdminNav({ grupos }: { grupos: readonly GrupoNav[] }) {
  const caminho = usePathname();
  const activo = grupoActivo(grupos, caminho);

  return (
    <nav aria-label="Secções da administração" className="grid min-w-0 gap-3">
      <ul
        role="list"
        className="admin-pilula flex min-w-0 items-center gap-1 overflow-x-auto rounded-full bg-[#0b0a09] p-1 [scrollbar-width:none]"
      >
        {grupos.map((g) => {
          const eActivo = g === activo;
          const destino = g.entradas[0]!.href;
          return (
            <li key={g.titulo} className="shrink-0">
              <Link
                href={destino}
                aria-current={eActivo ? 'true' : undefined}
                className={cn(
                  'flex min-h-10 items-center rounded-full px-4 text-sm whitespace-nowrap transition-colors',
                  eActivo ? 'bg-[#e9a35c] font-medium text-[#0b0a09]' : 'text-[#efe8da] hover:bg-white/10',
                )}
              >
                {g.titulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** As secções do grupo activo, em pílulas claras (só quando o grupo tem mais de uma). */
export function AdminSubNav({ grupos }: { grupos: readonly GrupoNav[] }) {
  const caminho = usePathname();
  const activo = grupoActivo(grupos, caminho);
  if (!activo || activo.entradas.length < 2) return null;
  return (
    <nav aria-label={`Secções de ${activo.titulo}`}>
      <ul role="list" className="flex flex-wrap gap-2">
        {activo.entradas.map((e) => {
          const eActiva = estaActiva(e.href, caminho);
          const Icone = ICONES[e.icone];
          return (
            <li key={e.href}>
              <Link
                href={e.href}
                aria-current={eActiva ? 'page' : undefined}
                className={cn(
                  'flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm whitespace-nowrap',
                  eActiva
                    ? 'border-[#0b0a09] bg-[#0b0a09] font-medium text-[#efe8da]'
                    : 'border-[color:var(--border)] bg-[color:var(--surface-raised)] text-[color:var(--on-surface)] hover:border-[#0b0a09]/40',
                )}
              >
                <Icone aria-hidden className="size-4 shrink-0" />
                {e.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
