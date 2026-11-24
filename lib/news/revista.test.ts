import { readFileSync, writeFileSync } from 'node:fs';
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import type { AnuncioPublico } from './anuncios';
import type { ArtigoCompleto } from './artigo';
import { normalizar } from './esquema';
import { EXEMPLO_LOVABLE } from './exemplo';
import { EXEMPLO_PROFUNDA } from './exemplo-profunda';
import { gerarRevista, urlAnuncio } from './revista';

const ANALISE = normalizar(EXEMPLO_LOVABLE.analysis)!;

function artigo(i: number, extra: Partial<ArtigoCompleto> = {}): ArtigoCompleto {
  return {
    id: `00000000-0000-4000-8000-00000000000${i}`,
    slug: `exemplo-qa-${i}`,
    idioma: 'pt',
    titulo: `Exemplo de QA ${i}: acentuação — São Tomé, Moçambique, coração, «aspas»`,
    entrada: 'Entrada de exemplo: a frase por baixo do título, escrita pela redacção.',
    seccao: 'economia',
    prioridade: 'high',
    publicado_em: '2026-11-20T10:00:00+00:00',
    actualizado_em: '2026-11-20T10:00:00+00:00',
    gostos: 0,
    partilhas: 0,
    pais: 'mz',
    imagem_caminho: null,
    imagem_alt: null,
    analise: ANALISE,
    nota_editorial: null,
    fonte_nome: 'Fonte de exemplo',
    fonte_url: null,
    imagem_credito: null,
    profunda: null,
    ...extra,
  };
}

const ANUNCIOS: AnuncioPublico[] = [
  { id: '00000000-0000-4000-8000-0000000000a1', slug: 'a', titulo: 'Agentes de IA que trabalham 24/7', mensagem: 'Exemplo de QA.', ticker: null, cta: 'Ver a solução', tema: 'sinal', peso: 3 },
  { id: '00000000-0000-4000-8000-0000000000a2', slug: 'b', titulo: 'Dados para energia', mensagem: null, ticker: null, cta: 'Falar connosco', tema: 'energia', peso: 1 },
];

/** Uma fotografia JPEG real do repositório (convertida pelo QA) ou nenhuma. */
function foto(): Uint8Array | null {
  try {
    return new Uint8Array(readFileSync('.qa/news/foto-exemplo.jpg'));
  } catch {
    return null;
  }
}

async function ligacoes(bytes: Uint8Array): Promise<string[]> {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().flatMap((p) => {
    const annots = p.node.lookup(PDFName.of('Annots'));
    if (!(annots instanceof PDFArray)) return [];
    return annots.asArray().flatMap((ref) => {
      const a = pdf.context.lookup(ref) as PDFDict;
      const accao = a.lookup(PDFName.of('A')) as PDFDict | undefined;
      const uri = accao?.lookup(PDFName.of('URI'));
      return uri instanceof PDFString ? [uri.decodeText()] : [];
    });
  });
}

describe('revista em PDF', () => {
  it('capa, um artigo por folha, análise profunda, página dos anunciantes com ligações e contracapa', async () => {
    const img = foto();
    const artigos = [artigo(1, { profunda: EXEMPLO_PROFUNDA, imagem_credito: 'Exemplo de QA' }), artigo(2, { pais: 'za' }), artigo(3, { pais: null })];
    const bytes = await gerarRevista({
      idioma: 'pt',
      data: new Date('2026-11-23T10:00:00Z'),
      artigos,
      anuncios: ANUNCIOS,
      imagens: img ? new Map([[artigos[0]!.id, img]]) : new Map(),
      site: 'https://agoramoz.com',
    });
    if (process.env.REVISTA_AMOSTRA) writeFileSync(process.env.REVISTA_AMOSTRA, bytes);
    const pdf = await PDFDocument.load(bytes);
    // capa + 3 artigos (+ continuações) + 1 folha profunda + anunciantes + contracapa
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(7);
    expect(pdf.getTitle()).toContain('AGORAMOZ News');
    const urls = await ligacoes(bytes);
    for (const a of ANUNCIOS) expect(urls).toContain(urlAnuncio('https://agoramoz.com', a.id));
    expect(urls).toContain('https://agoramoz.com/news/exemplo-qa-1');
  });

  it('sem anúncios, não há página estratégica (nem ligações de anúncio)', async () => {
    const com = await gerarRevista({ idioma: 'en', data: new Date(), artigos: [artigo(1, { idioma: 'en' })], anuncios: ANUNCIOS, imagens: new Map(), site: 'https://agoramoz.com' });
    const sem = await gerarRevista({ idioma: 'en', data: new Date(), artigos: [artigo(1, { idioma: 'en' })], anuncios: [], imagens: new Map(), site: 'https://agoramoz.com' });
    const [pc, ps] = await Promise.all([PDFDocument.load(com), PDFDocument.load(sem)]);
    expect(pc.getPageCount() - ps.getPageCount()).toBe(1);
    expect((await ligacoes(sem)).some((u) => u.includes('/api/news/anuncio/'))).toBe(false);
    expect(await ligacoes(sem)).toContain('https://agoramoz.com/en/news/exemplo-qa-1');
  });

  it('sem artigos, sai uma revista curta e válida (nunca um erro)', async () => {
    const bytes = await gerarRevista({ idioma: 'pt', data: new Date(), artigos: [], anuncios: [], imagens: new Map(), site: 'https://agoramoz.com' });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  });

  it('uma fotografia corrompida não parte a revista', async () => {
    const a = artigo(1);
    const bytes = await gerarRevista({ idioma: 'pt', data: new Date(), artigos: [a], anuncios: [], imagens: new Map([[a.id, new Uint8Array([1, 2, 3])]]), site: 'https://agoramoz.com' });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThanOrEqual(3);
  });
});

describe('revista em PDF — vidro e gráficos', () => {
  const FONTE_SERIE = { titulo: 'Exemplo de QA: carga', unidade: 'Mt', fonte: 'Documento de exemplo' } as const;

  it('glassmorphism: cada anúncio e a capa levam um painel de vidro (PNG com transparência)', async () => {
    const bytes = await gerarRevista({
      idioma: 'pt',
      data: new Date('2026-11-23T10:00:00Z'),
      artigos: [artigo(1)],
      anuncios: ANUNCIOS,
      imagens: new Map(),
      site: 'https://agoramoz.com',
    });
    const pdf = await PDFDocument.load(bytes);
    // PNG com canal alfa (SMask) = os painéis de vidro.
    const vidros = pdf.context
      .enumerateIndirectObjects()
      .filter(([, o]) => o instanceof Object && 'dict' in o && (o as { dict: PDFDict }).dict.get(PDFName.of('SMask')));
    expect(vidros.length).toBeGreaterThanOrEqual(1 + ANUNCIOS.length);
    // Os anúncios continuam clicáveis e contados.
    expect(await ligacoes(bytes)).toEqual(expect.arrayContaining(ANUNCIOS.map((a) => urlAnuncio('https://agoramoz.com', a.id))));
  });

  it('a notícia em números entra quando há país ou séries; as séries não acrescentam números', async () => {
    const profunda = {
      ...EXEMPLO_PROFUNDA,
      dados: [{ ...FONTE_SERIE, tipo: 'linha' as const, pontos: [{ rotulo: '2024', valor: 27 }, { rotulo: '2025', valor: 31 }] }],
    };
    const com = await gerarRevista({
      idioma: 'pt',
      data: new Date('2026-11-23T10:00:00Z'),
      artigos: [artigo(1, { profunda })],
      anuncios: [],
      imagens: new Map(),
      site: 'https://agoramoz.com',
    });
    const sem = await gerarRevista({
      idioma: 'pt',
      data: new Date('2026-11-23T10:00:00Z'),
      artigos: [artigo(1, { pais: null })],
      anuncios: [],
      imagens: new Map(),
      site: 'https://agoramoz.com',
    });
    const paginas = async (b: Uint8Array) => (await PDFDocument.load(b)).getPageCount();
    // capa + edição em números + artigo + análise + notícia em números + contracapa
    expect(await paginas(com)).toBeGreaterThanOrEqual(6);
    // sem país, sem análise profunda: nenhuma página «em números» do artigo
    expect(await paginas(sem)).toBeLessThan(await paginas(com));
  });
});
