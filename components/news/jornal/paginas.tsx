import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Idioma } from '@/content/types';
import { SECCOES_JORNAL, type SeccaoJornal } from '@/lib/news/artigo';
import { anunciosNoAr, listarPublicados, obterPublicado } from '@/lib/news/jornal-servidor';
import { EdicaoEmNumeros } from '@/components/news/graficos/EmNumeros';
import { Jornal } from './Jornal';
import { PaginaArtigo } from './PaginaArtigo';

/**
 * O que as rotas `/news` e `/news/[slug]` (PT e EN) renderizam quando o jornal
 * está ligado. A leitura do relógio fica numa função assíncrona — ler a hora
 * no corpo de um componente é o que a regra de pureza do React recusa.
 */

async function hojePorExtenso(idioma: Idioma): Promise<string> {
  return new Intl.DateTimeFormat(idioma === 'en' ? 'en-GB' : 'pt-PT', {
    timeZone: 'Africa/Maputo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.now()));
}

export function seccaoDe(valor: string | string[] | undefined): SeccaoJornal | null {
  return typeof valor === 'string' && (SECCOES_JORNAL as readonly string[]).includes(valor)
    ? (valor as SeccaoJornal)
    : null;
}

export async function PrimeiraPagina({ idioma, seccao }: { idioma: Idioma; seccao: SeccaoJornal | null }) {
  const [artigos, anuncios, hoje, todos] = await Promise.all([
    listarPublicados(idioma, seccao, 40),
    anunciosNoAr(),
    hojePorExtenso(idioma),
    // Para os gráficos: as 100 mais recentes de todas as secções (o máximo da função).
    listarPublicados(idioma, null, 100),
  ]);
  return (
    <Jornal
      idioma={idioma}
      artigos={artigos}
      anuncios={anuncios}
      seccao={seccao}
      hoje={hoje}
      numeros={todos && todos.length > 0 ? <EdicaoEmNumeros lista={todos} idioma={idioma} /> : null}
    />
  );
}

export async function Artigo({ idioma, slug, trilho }: { idioma: Idioma; slug: string; trilho: ReactNode }) {
  const artigo = await obterPublicado(slug);
  // Um artigo da outra edição não se mostra aqui (o endereço certo é o dele).
  if (!artigo || artigo.idioma !== idioma) notFound();
  const [anuncios, mesmaSeccao] = await Promise.all([
    anunciosNoAr(),
    listarPublicados(idioma, artigo.seccao, 4),
  ]);
  const relacionados = (mesmaSeccao ?? []).filter((r) => r.id !== artigo.id).slice(0, 3);
  return <PaginaArtigo artigo={artigo} idioma={idioma} anuncios={anuncios} relacionados={relacionados} trilho={trilho} />;
}
