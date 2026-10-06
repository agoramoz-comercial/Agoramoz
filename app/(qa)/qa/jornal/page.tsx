import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Jornal } from "@/components/news/jornal/Jornal";
import {
  caminhoDoArtigo,
  caminhoDoJornal,
} from "@/components/news/jornal/ligacoes";
import { PaginaArtigo } from "@/components/news/jornal/PaginaArtigo";
import type { AnuncioPublico } from "@/lib/news/anuncios";
import {
  SECCOES_JORNAL,
  type ArtigoCompleto,
  type ArtigoDaLista,
} from "@/lib/news/artigo";
import { normalizar } from "@/lib/news/esquema";
import { EXEMPLO_LOVABLE } from "@/lib/news/exemplo";

/**
 * Pré-visualização do jornal para o QA visual (Playwright + axe), sem base.
 * Só existe com `ADMIN_PREVIEW=on` e nunca na produção da Vercel.
 *
 * Tudo aqui é EXEMPLO de QA, marcado como tal: títulos, contagens e anúncios.
 * `?vista=artigo` mostra a página de um artigo; `?vista=vazio` o jornal sem
 * artigos; `?vista=erro` a leitura falhada; `?idioma=en` a edição inglesa.
 * Gostos, partilhas, impressões e cliques vão para as rotas reais — o script
 * de QA intercepta-os.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pré-visualização do jornal",
  robots: { index: false, follow: false, nocache: true },
};

const ANALISE = normalizar(EXEMPLO_LOVABLE.analysis)!;

function artigos(idioma: "pt" | "en"): ArtigoDaLista[] {
  const pt = idioma === "pt";
  return Array.from({ length: 9 }, (_, i) => ({
    id: `00000000-0000-4000-8000-00000000000${i + 1}`,
    slug: `exemplo-qa-${i + 1}`,
    idioma,
    titulo: pt
      ? `Exemplo de QA ${i + 1}: título de jornal com o comprimento de uma manchete real`
      : `QA example ${i + 1}: a newspaper headline as long as a real one`,
    entrada:
      i % 3 === 2
        ? null
        : pt
          ? "Entrada de exemplo: a frase por baixo do título, escrita pela redacção depois de rever a análise."
          : "Example dek: the line under the headline, written by the desk after reviewing the analysis.",
    seccao: SECCOES_JORNAL[i % SECCOES_JORNAL.length]!,
    prioridade: (["critical", "high", "medium", "monitor"] as const)[i % 4]!,
    publicado_em: `2026-10-0${5 - Math.min(i, 4)}T0${i}:00:00+00:00`,
    actualizado_em: `2026-10-05T0${i}:00:00+00:00`,
    gostos: [12, 3, 0, 7, 1, 0, 25, 2, 0][i]!,
    partilhas: i,
  }));
}

const ANUNCIOS: AnuncioPublico[] = [
  {
    id: "00000000-0000-4000-8000-0000000000a1",
    slug: "qa-agentes-ia",
    titulo: "Agentes de IA que trabalham 24/7",
    mensagem: "Exemplo de QA: anúncio da casa com destino interno.",
    ticker: "AGORAMOZ · AGENTES DE IA · AUTOMAÇÃO · EXEMPLO DE QA",
    cta: "Ver a solução",
    tema: "sinal",
    peso: 3,
  },
  {
    id: "00000000-0000-4000-8000-0000000000a2",
    slug: "qa-energia",
    titulo: "Dados operacionais para energia e mineração",
    mensagem: null,
    ticker: null,
    cta: "Falar connosco",
    tema: "energia",
    peso: 1,
  },
];

export default async function PreviaJornalPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; idioma?: string }>;
}) {
  if (
    process.env.ADMIN_PREVIEW !== "on" ||
    process.env.VERCEL_ENV === "production"
  )
    notFound();
  const { vista, idioma: pedido } = await searchParams;
  const idioma = pedido === "en" ? "en" : "pt";
  const lista = artigos(idioma);

  if (vista === "artigo") {
    const artigo: ArtigoCompleto = {
      ...lista[0]!,
      analise: ANALISE,
      nota_editorial:
        idioma === "en"
          ? "QA example editor’s note."
          : "Nota da redacção de exemplo (QA).",
      fonte_nome: "Fonte de exemplo",
      fonte_url: "https://example.com/noticia",
    };
    return (
      <PaginaArtigo
        artigo={artigo}
        idioma={idioma}
        anuncios={ANUNCIOS}
        relacionados={lista.slice(1, 4)}
        trilho={
          <Breadcrumbs
            idioma={idioma}
            items={[
              {
                name: idioma === "en" ? "Home" : "Início",
                path: idioma === "en" ? "/en" : "/",
              },
              { name: "AGORAMOZ News", path: caminhoDoJornal(idioma) },
              {
                name: artigo.titulo,
                path: caminhoDoArtigo(artigo.slug, idioma),
              },
            ]}
          />
        }
      />
    );
  }

  return (
    <Jornal
      idioma={idioma}
      artigos={vista === "erro" ? null : vista === "vazio" ? [] : lista}
      anuncios={ANUNCIOS}
      seccao={null}
      hoje={
        idioma === "en"
          ? "Tuesday, 6 October 2026"
          : "terça-feira, 6 de outubro de 2026"
      }
    />
  );
}
