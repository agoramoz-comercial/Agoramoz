import { describe, expect, it } from 'vitest';
import { MAX_BLOCOS, MAX_FONTES, dominioDoEstado, normalizar, validarResposta, type Bloco } from './resposta';

const blocos = (md: string) => normalizar(md)!.blocos;
const tipos = (md: string) => blocos(md).map((b) => b.tipo);
const paragrafo = (md: string) => blocos(md)[0] as Extract<Bloco, { tipo: 'paragrafo' }>;

describe('normalizar: blocos', () => {
  it('lê títulos, parágrafos, listas, citação e tabela', () => {
    const md = [
      '## Resposta',
      '',
      'Um parágrafo',
      'em duas linhas.',
      '',
      '- um',
      '- dois',
      '',
      '1. primeiro',
      '2) segundo',
      '',
      '> uma citação',
      '> em duas linhas',
      '',
      '| Situação | Prazo |',
      '| --- | --- |',
      '| A | 15 dias |',
      '| B |',
      '',
      '---',
      'Fim.',
    ].join('\n');
    expect(tipos(md)).toEqual(['titulo', 'paragrafo', 'lista', 'lista', 'citacao', 'tabela', 'paragrafo']);

    const b = blocos(md);
    expect(b[0]).toEqual({ tipo: 'titulo', texto: 'Resposta' });
    expect(b[1]).toEqual({ tipo: 'paragrafo', trechos: [{ t: 'texto', v: 'Um parágrafo em duas linhas.' }] });
    expect(b[2]).toMatchObject({ ordenada: false, itens: [[{ v: 'um' }], [{ v: 'dois' }]] });
    expect(b[3]).toMatchObject({ ordenada: true, itens: [[{ v: 'primeiro' }], [{ v: 'segundo' }]] });
    expect(b[4]).toMatchObject({ trechos: [{ v: 'uma citação em duas linhas' }] });
    // Uma linha com células a menos é completada: a tabela nunca desalinha.
    expect(b[5]).toEqual({
      tipo: 'tabela',
      cabecalho: ['Situação', 'Prazo'],
      linhas: [
        ['A', '15 dias'],
        ['B', ''],
      ],
    });
  });

  it('negrito, ênfase e código em linha', () => {
    expect(paragrafo('Tem **30 dias** e *não* 15, pelo `art. 5`.').trechos).toEqual([
      { t: 'texto', v: 'Tem ' },
      { t: 'forte', v: '30 dias' },
      { t: 'texto', v: ' e ' },
      { t: 'enfase', v: 'não' },
      { t: 'texto', v: ' 15, pelo ' },
      { t: 'texto', v: 'art. 5' },
      { t: 'texto', v: '.' },
    ]);
  });

  it('um asterisco solto ou um sublinhado dentro de palavra não é ênfase', () => {
    expect(paragrafo('2 * 3 = 6 e nome_do_ficheiro_v2').trechos).toEqual([
      { t: 'texto', v: '2 * 3 = 6 e nome_do_ficheiro_v2' },
    ]);
  });

  it('a continuação indentada pertence ao item da lista', () => {
    const b = blocos('- primeiro item\n  que continua aqui\n- segundo')[0] as Extract<Bloco, { tipo: 'lista' }>;
    expect(b.itens.map((i) => i.map((x) => x.v).join(''))).toEqual(['primeiro item que continua aqui', 'segundo']);
  });

  it('um bloco de código lê-se como parágrafo, sem as vedações', () => {
    expect(blocos('```\nModelo 10\nAnexo B\n```')).toEqual([
      { tipo: 'paragrafo', trechos: [{ t: 'texto', v: 'Modelo 10 Anexo B' }] },
    ]);
  });

  it('HTML do motor é texto, nunca marcação', () => {
    const r = normalizar('<script>alert(1)</script> e <img src=x onerror=alert(1)>')!;
    expect(r.blocos).toEqual([
      { tipo: 'paragrafo', trechos: [{ t: 'texto', v: '<script>alert(1)</script> e <img src=x onerror=alert(1)>' }] },
    ]);
  });

  it('sem conteúdo devolve null', () => {
    expect(normalizar('')).toBeNull();
    expect(normalizar('  \n\n---\n')).toBeNull();
    expect(normalizar('##   ')).toBeNull();
  });

  it('corta no tecto de blocos', () => {
    const md = Array.from({ length: MAX_BLOCOS + 30 }, (_, i) => `Parágrafo ${i}.`).join('\n\n');
    expect(blocos(md)).toHaveLength(MAX_BLOCOS);
  });
});

describe('normalizar: fontes', () => {
  it('cada ligação entra numerada, com o domínio e a marca de domínio do Estado', () => {
    const r = normalizar(
      'Veja a [Lei do Trabalho](https://www.mitess.gov.mz/lei-13-2023) e o [comentário](https://www.exemplo.co.mz/artigo).',
    )!;
    expect(r.fontes).toEqual([
      { n: 1, titulo: 'Lei do Trabalho', href: 'https://www.mitess.gov.mz/lei-13-2023', dominio: 'mitess.gov.mz', estado: true },
      { n: 2, titulo: 'comentário', href: 'https://www.exemplo.co.mz/artigo', dominio: 'exemplo.co.mz', estado: false },
    ]);
    expect(paragrafo('Veja a [Lei](https://www.mitess.gov.mz/lei).').trechos[1]).toEqual({
      t: 'ligacao',
      v: 'Lei',
      href: 'https://www.mitess.gov.mz/lei',
      n: 1,
    });
  });

  it('a mesma página citada duas vezes é uma fonte só, mesmo com âncoras diferentes', () => {
    const r = normalizar('[A](https://www.inss.gov.mz/guia#um) e depois [B](https://www.inss.gov.mz/guia#dois).')!;
    expect(r.fontes).toHaveLength(1);
    expect(r.fontes[0]).toMatchObject({ n: 1, titulo: 'A', href: 'https://www.inss.gov.mz/guia' });
    const numeros = (r.blocos[0] as Extract<Bloco, { tipo: 'paragrafo' }>).trechos.flatMap((x) => (x.t === 'ligacao' ? [x.n] : []));
    expect(numeros).toEqual([1, 1]);
  });

  it('um endereço solto vira ligação com o domínio por rótulo, sem a pontuação do fim', () => {
    const r = normalizar('Consulte https://www.at.gov.mz/irps. Ou <https://www.portaldogoverno.gov.mz/leis>.')!;
    expect(r.fontes.map((f) => [f.href, f.titulo])).toEqual([
      ['https://www.at.gov.mz/irps', 'at.gov.mz'],
      ['https://www.portaldogoverno.gov.mz/leis', 'portaldogoverno.gov.mz'],
    ]);
    expect(r.texto).toBe('Consulte at.gov.mz. Ou portaldogoverno.gov.mz.');
  });

  it.each([
    ['javascript', '[clique](javascript:alert(1))'],
    ['http', '[lei](http://www.exemplo.gov.mz/lei)'],
    ['IP privado', '[painel](https://192.168.1.1/admin)'],
    ['loopback', '[local](https://localhost/x)'],
    ['credenciais', '[x](https://user:pass@exemplo.gov.mz/)'],
    ['dados', '[x](data:text/html;base64,PHNjcmlwdD4=)'],
  ])('ligação %s perde a ligação e fica o rótulo', (_nome, md) => {
    const r = normalizar(`Antes ${md} depois.`)!;
    expect(r.fontes).toEqual([]);
    expect(r.blocos.flatMap((b) => ('trechos' in b ? b.trechos : [])).some((x) => x.t === 'ligacao')).toBe(false);
  });

  it('as ligações de listas e citações também contam', () => {
    const r = normalizar('- [um](https://a.gov.mz/1)\n- [dois](https://b.co.mz/2)\n\n> [três](https://c.gov.mz/3)')!;
    expect(r.fontes.map((f) => f.n)).toEqual([1, 2, 3]);
  });

  it('pára no tecto de fontes; as que não cabem ficam em texto', () => {
    const md = Array.from({ length: MAX_FONTES + 5 }, (_, i) => `[f${i}](https://www.exemplo.gov.mz/doc/${i})`).join(' ');
    const r = normalizar(md)!;
    expect(r.fontes).toHaveLength(MAX_FONTES);
    expect(r.texto).toContain(`f${MAX_FONTES + 4}`);
  });

  it('o texto corrido não tem marcas de Markdown', () => {
    const r = normalizar('## Prazo\n\nTem **30 dias**, ver [a lei](https://www.mitess.gov.mz/lei).\n\n1. Um\n2. Dois')!;
    expect(r.texto).toBe('Prazo\n\nTem 30 dias, ver a lei.\n\n1. Um\n2. Dois');
  });
});

describe('dominioDoEstado', () => {
  it('só gov.mz e os seus subdomínios', () => {
    expect(dominioDoEstado('gov.mz')).toBe(true);
    expect(dominioDoEstado('inss.gov.mz')).toBe(true);
    expect(dominioDoEstado('xgov.mz')).toBe(false);
    expect(dominioDoEstado('gov.mz.exemplo.com')).toBe(false);
    expect(dominioDoEstado('parlamento.mz')).toBe(false);
  });
});

describe('validarResposta', () => {
  const boa = normalizar('## T\n\nTexto com [fonte](https://www.inss.gov.mz/x).\n\n- a\n\n| A | B |\n|---|---|\n| 1 | 2 |')!;

  it('aceita o que o normalizador produz', () => {
    expect(validarResposta(boa)).toBe(true);
    // E sobrevive à viagem por JSON, que é como chega ao browser.
    expect(validarResposta(JSON.parse(JSON.stringify(boa)))).toBe(true);
  });

  it.each([
    ['nulo', null],
    ['sem blocos', { ...boa, blocos: [] }],
    ['bloco desconhecido', { ...boa, blocos: [{ tipo: 'html', html: '<b>x</b>' }] }],
    ['trecho desconhecido', { ...boa, blocos: [{ tipo: 'paragrafo', trechos: [{ t: 'html', v: '<b>' }] }] }],
    [
      'ligação que não é https pública',
      { ...boa, blocos: [{ tipo: 'paragrafo', trechos: [{ t: 'ligacao', v: 'x', href: 'javascript:alert(1)', n: 1 }] }] },
    ],
    ['fonte com endereço inseguro', { ...boa, fontes: [{ n: 1, titulo: 'x', dominio: 'x', estado: false, href: 'http://x.mz' }] }],
    ['texto que não é texto', { ...boa, texto: 3 }],
  ])('recusa %s', (_nome, valor) => {
    expect(validarResposta(valor)).toBe(false);
  });
});
