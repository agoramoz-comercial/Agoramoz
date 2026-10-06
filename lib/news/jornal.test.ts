import { describe, expect, it } from 'vitest';
import {
  comUtm,
  destinoSeguro,
  formularioAnuncio,
  lerAnuncios,
  primeiroDoLugar,
  rotacao,
  taxa,
  type AnuncioPublico,
} from './anuncios';
import {
  formularioArtigo,
  lerArtigo,
  lerLista,
  rascunhoDeAnalise,
  seccaoDosSectores,
  slugDeArtigo,
  tempoDeLeitura,
} from './artigo';
import { normalizar } from './esquema';
import { EXEMPLO_LOVABLE } from './exemplo';
import { CHAVE_GOSTOS, CHAVE_TOKEN, gostosGuardados, guardarGosto, tokenDoLeitor } from './leitor';
import { ligacaoDePartilha } from './partilha';


const ANALISE = normalizar(EXEMPLO_LOVABLE.analysis)!;

describe('artigo — da análise ao rascunho', () => {
  it('o exemplo do motor dá uma análise', () => {
    expect(ANALISE).not.toBeNull();
  });

  it('o rascunho propõe título, entrada, secção e prioridade a partir da análise', () => {
    const r = rascunhoDeAnalise(ANALISE);
    expect(r.titulo.length).toBeGreaterThan(3);
    expect(ANALISE.titulo.titulo.startsWith(r.titulo.replace(/…$/, ''))).toBe(true);
    expect(r.entrada?.replace(/…$/, '')).toBe(
      ANALISE.resumo[0]!.slice(0, r.entrada!.replace(/…$/, '').length),
    );
    expect(r.prioridade).toBe(ANALISE.prioridade);
  });

  it.each([
    [['Oil & Gas', 'Logistics'], 'energia'],
    [['Energia renovável'], 'energia'],
    [['Fintech', 'Banking'], 'tecnologia'],
    [['Banca', 'Seguros'], 'mercados'],
    [['Política fiscal'], 'politica'],
    [['Retalho'], 'negocios'],
    [['Outra coisa'], 'economia'],
    [[], 'economia'],
  ] as const)('sectores %j → %s', (sectores, seccao) => {
    expect(seccaoDosSectores(sectores)).toBe(seccao);
  });

  it('o endereço é legível, sem acentos, e leva o sufixo', () => {
    expect(slugDeArtigo('Petróleo sobe: Moçambique ganha?', 'A1b2')).toBe(
      'petroleo-sobe-mocambique-ganha-a1b2',
    );
    expect(slugDeArtigo('!!!', 'x9')).toBe('artigo-x9');
    expect(slugDeArtigo('a'.repeat(200), 'z').length).toBeLessThanOrEqual(90);
  });

  it('o tempo de leitura vem do texto real, nunca abaixo de 1 minuto', () => {
    expect(tempoDeLeitura(ANALISE)).toBeGreaterThanOrEqual(1);
  });

  it('o formulário do editor recusa fonte http, IP privado e endereço com maiúsculas', () => {
    const base = {
      slug: 'petroleo-sobe-a1',
      titulo: 'Petróleo sobe',
      entrada: '',
      seccao: 'energia',
      nota: '',
      fonteNome: '',
      fonteUrl: '',
    };
    const ok = formularioArtigo.safeParse(base);
    expect(ok.success && ok.data.entrada).toBeNull();
    expect(formularioArtigo.safeParse({ ...base, fonteUrl: 'http://x.test/a' }).success).toBe(false);
    expect(formularioArtigo.safeParse({ ...base, fonteUrl: 'https://127.0.0.1/a' }).success).toBe(
      false,
    );
    expect(formularioArtigo.safeParse({ ...base, slug: 'Petroleo' }).success).toBe(false);
  });

  it('um artigo com análise estragada não se mostra; linhas estragadas saem da lista', () => {
    const linha = {
      id: '00000000-0000-4000-8000-000000000001',
      slug: 'petroleo-sobe-a1',
      idioma: 'pt',
      titulo: 'T',
      entrada: null,
      seccao: 'energia',
      prioridade: 'high',
      publicado_em: '2026-10-05T10:00:00+00:00',
      actualizado_em: '2026-10-05T10:00:00+00:00',
      gostos: 3,
      partilhas: 1,
    };
    const completo = {
      ...linha,
      analise: ANALISE,
      nota_editorial: null,
      fonte_nome: null,
      fonte_url: null,
    };
    expect(lerArtigo(completo)?.analise.titulo.titulo).toBe(ANALISE.titulo.titulo);
    expect(lerArtigo({ ...completo, analise: { titulo: 'x' } })).toBeNull();
    expect(lerLista([linha, { ...linha, seccao: 'desporto' }, null])).toHaveLength(1);
  });
});

const ad = (id: string, peso: number): AnuncioPublico => ({
  id,
  slug: `ad-${id}`,
  titulo: 'T',
  mensagem: null,
  ticker: null,
  cta: 'Ver',
  tema: 'tinta',
  peso,
});

describe('anúncios — destino, campanha e rotação', () => {
  it.each([
    ['/solucoes/agentes-ia', true],
    ['/diagnostico', true],
    ['https://agoramoz.com/solucoes', true],
    ['https://parceiro.co.mz', true],
    ['//evil.test', false],
    ['http://inseguro.test', false],
    ['javascript:alert(1)', false],
    ['https://user:pass@x.test', false],
    ['https://x.test/?a=1', false],
    ['/Solucoes', false],
  ])('destino %s → %s', (destino, ok) => {
    expect(destinoSeguro(destino)).toBe(ok);
  });

  it('o clique leva a campanha do anúncio e o lugar', () => {
    expect(comUtm('/solucoes/agentes-ia', 'agentes-ia', 'topo')).toBe(
      '/solucoes/agentes-ia?utm_source=agoramoz_news&utm_medium=outdoor&utm_campaign=agentes-ia&utm_content=topo',
    );
    expect(comUtm('https://parceiro.co.mz/x', 'parceiro', null)).toBe(
      'https://parceiro.co.mz/x?utm_source=agoramoz_news&utm_medium=outdoor&utm_campaign=parceiro',
    );
  });

  it('sem impressões não há taxa; com elas, percentagem com uma casa', () => {
    expect(taxa(0, 0)).toBeNull();
    expect(taxa(3, 200)).toBe(1.5);
    expect(taxa(1, 3)).toBe(33.3);
  });

  it('a rotação repete pelo peso e nunca põe o mesmo anúncio duas vezes seguidas', () => {
    const ordem = rotacao([ad('a', 3), ad('b', 1), ad('c', 2)]).map((x) => x.id);
    expect(ordem).toHaveLength(6);
    expect(ordem.filter((x) => x === 'a')).toHaveLength(3);
    for (let i = 1; i < ordem.length; i++) expect(ordem[i]).not.toBe(ordem[i - 1]);
    expect(rotacao([])).toEqual([]);
  });

  it('lugares diferentes começam em anúncios diferentes quando há escolha', () => {
    const ordem = rotacao([ad('a', 2), ad('b', 2), ad('c', 2)]);
    expect(primeiroDoLugar(ordem, 'topo')).not.toBe(primeiroDoLugar(ordem, 'feed'));
    expect(primeiroDoLugar([], 'topo')).toBe(0);
    // Com dois anúncios de pesos diferentes, topo e meio da lista abrem em anúncios diferentes.
    const dois = rotacao([ad('a', 3), ad('b', 1)]);
    expect(dois[primeiroDoLugar(dois, 'topo')]!.id).not.toBe(dois[primeiroDoLugar(dois, 'feed')]!.id);
    expect(dois[primeiroDoLugar(dois, 'artigo')]!.id).not.toBe(dois[primeiroDoLugar(dois, 'fim')]!.id);
  });

  it('lê da base só anúncios com forma certa', () => {
    expect(lerAnuncios([ad('00000000-0000-4000-8000-000000000001', 1), { id: 'x' }])).toHaveLength(1);
    expect(lerAnuncios(null)).toEqual([]);
  });

  it('as datas do formulário são lidas na hora de Maputo (UTC+2)', async () => {
    const { horaDeMaputo, paraCampoDeMaputo } = await import('./anuncios');
    expect(new Date(horaDeMaputo('2026-10-10T09:00')).toISOString()).toBe('2026-10-10T07:00:00.000Z');
    expect(paraCampoDeMaputo('2026-10-10T07:00:00.000Z')).toBe('2026-10-10T09:00');
    expect(paraCampoDeMaputo(null)).toBe('');
  });

  it('o formulário do anúncio recusa destino perigoso e fim antes do início', () => {
    const base = {
      slug: 'agentes-ia',
      titulo: 'Agentes de IA',
      mensagem: '',
      ticker: '',
      cta: 'Ver solução',
      destino: '/solucoes/agentes-ia',
      tema: 'sinal',
      inicio: '',
      fim: '',
      peso: '5',
    };
    expect(formularioAnuncio.safeParse(base).success).toBe(true);
    expect(formularioAnuncio.safeParse({ ...base, destino: 'javascript:x' }).success).toBe(false);
    expect(
      formularioAnuncio.safeParse({ ...base, inicio: '2026-10-10', fim: '2026-10-01' }).success,
    ).toBe(false);
  });
});

function armazem(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size;
    },
  };
}

describe('leitor anónimo', () => {
  it('o token é criado uma vez e reutilizado; sem armazenamento, nenhum', () => {
    const a = armazem();
    const t = tokenDoLeitor(a);
    expect(t).toMatch(/^[0-9a-f]{32}$/);
    expect(tokenDoLeitor(a)).toBe(t);
    expect(a.getItem(CHAVE_TOKEN)).toBe(t);
    expect(tokenDoLeitor(null)).toBeNull();
    const partido = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {},
    };
    expect(tokenDoLeitor(partido)).toBeNull();
  });

  it('os gostos ficam lembrados no browser', () => {
    const a = armazem();
    guardarGosto(a, 'artigo-a');
    guardarGosto(a, 'artigo-a');
    expect([...gostosGuardados(a)]).toEqual(['artigo-a']);
    a.setItem(CHAVE_GOSTOS, '{lixo');
    expect(gostosGuardados(a).size).toBe(0);
  });

  it('a chave do servidor depende do artigo: o mesmo leitor não é seguível entre artigos', async () => {
    const { chaveDoLeitor } = await import('./leitor-servidor');
    const t = 'a'.repeat(32);
    const k1 = chaveDoLeitor(t, 'artigo-1');
    expect(k1).toMatch(/^[0-9a-f]{64}$/);
    expect(chaveDoLeitor(t, 'artigo-2')).not.toBe(k1);
    expect(chaveDoLeitor('curto', 'artigo-1')).toBeNull();
    expect(chaveDoLeitor(42, 'artigo-1')).toBeNull();
  });
});

describe('partilha', () => {
  it('cada rede recebe o URL codificado; nada de scripts', () => {
    const url = 'https://agoramoz.com/news/petroleo-sobe-a1';
    expect(ligacaoDePartilha('linkedin', url, 'T')).toBe(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    );
    expect(ligacaoDePartilha('whatsapp', url, 'Petróleo & gás')).toContain('wa.me/?text=');
    expect(ligacaoDePartilha('x', url, 'T')).toContain('x.com/intent/post');
    expect(ligacaoDePartilha('email', url, 'T')).toMatch(/^mailto:\?subject=/);
  });
});
