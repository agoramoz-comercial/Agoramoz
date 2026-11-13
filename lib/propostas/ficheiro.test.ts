import { readFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { ErroFicheiro, docxParaTexto, documentoParaTexto, lerZip, linhasDoPdf, textoDoFicheiro, type PedacoPdf } from './ficheiro';
import { lerTexto } from './texto';

/**
 * Os documentos de teste são gerados por `.qa/propostas-fixtures.py` (TUDO DE
 * EXEMPLO): um .docx com os estilos de título do Word, listas, uma tabela e
 * um cabeçalho de página, e o PDF desse documento exportado pelo LibreOffice.
 */
const DOCX = readFileSync('lib/propostas/__fixtures__/proposta-exemplo.docx');
const PDF = readFileSync('lib/propostas/__fixtures__/proposta-exemplo.pdf');
const buf = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

/** Um ZIP mínimo (deflate), para os casos que o Word não produz. */
function zip(entradas: Record<string, Buffer>): ArrayBuffer {
  const locais: Buffer[] = [];
  const centrais: Buffer[] = [];
  let offset = 0;
  for (const [nome, dados] of Object.entries(entradas)) {
    const comp = deflateRawSync(dados);
    const n = Buffer.from(nome);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(n.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(comp.length, 20);
    central.writeUInt32LE(dados.length, 24);
    central.writeUInt16LE(n.length, 28);
    central.writeUInt32LE(offset, 42);
    locais.push(local, n, comp);
    centrais.push(central, n);
    offset += 30 + n.length + comp.length;
  }
  const dir = Buffer.concat(centrais);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(Object.keys(entradas).length, 8);
  fim.writeUInt16LE(Object.keys(entradas).length, 10);
  fim.writeUInt32LE(dir.length, 12);
  fim.writeUInt32LE(offset, 16);
  return buf(Buffer.concat([...locais, dir, fim]));
}

describe('.docx', () => {
  it('títulos do Word como «#», listas como «-», tabela com tabulações', async () => {
    const { texto, avisos } = await docxParaTexto(buf(DOCX));
    expect(texto).toContain('# Proposta comercial — Portal de pedidos');
    expect(texto).toContain('# Contexto');
    expect(texto).toContain('- Pedidos por telefone: os revendedores de exemplo fazem pedidos por telefone.');
    expect(texto).toContain('Diagnóstico\tLevantamento de processos\t2–3 semanas\t285 000 MZN');
    expect(texto).toContain('**Próximos passos**');
    expect(texto).not.toContain('Cabeçalho de exemplo');
    expect(avisos.some((a) => /Cabeçalhos e rodapés/.test(a))).toBe(true);
  });

  it('do .docx às folhas: capa, secções e fases com entregáveis', async () => {
    const { proposta: p } = lerTexto((await docxParaTexto(buf(DOCX))).texto, '2026-01-01');
    expect([p.titulo, p.cliente, p.data, p.validadeDias]).toEqual(['Portal de pedidos', 'Cliente de Exemplo, Lda.', '2026-11-12', 45]);
    expect(p.contexto).toHaveLength(2);
    expect(p.fases.map((f) => [f.nome, f.entregaveis, f.semanasMin, f.semanasMax, f.valor])).toEqual([
      ['Diagnóstico', 'Levantamento de processos', 2, 3, 285_000],
      ['Implementação', 'Portal em produção', 6, 6, 1_450_000],
    ]);
    expect(p.passos).toEqual(['Aprovar a proposta de exemplo.']);
  });

  it('entidades, tabulações, texto apagado com controlo de alterações', () => {
    const xml =
      '<w:body><w:p><w:r><w:t>A &amp; B &lt;ok&gt;</w:t></w:r><w:r><w:tab/><w:t>C</w:t></w:r><w:del><w:r><w:delText>apagado</w:delText><w:t>apagado</w:t></w:r></w:del></w:p></w:body>';
    expect(documentoParaTexto(xml)).toBe('A & B <ok>\tC');
  });

  it('um ficheiro que não é ZIP, ou um ZIP sem documento, é recusado com mensagem', async () => {
    await expect(lerZip(buf(Buffer.from('isto não é um zip')), ['word/document.xml'])).rejects.toBeInstanceOf(ErroFicheiro);
    await expect(docxParaTexto(zip({ 'outro.xml': Buffer.from('<x/>') }))).rejects.toThrow(/não é um \.docx válido/);
  });

  it('um ZIP-bomba é travado antes de encher a memória', async () => {
    const bomba = zip({ 'word/document.xml': Buffer.alloc(25 * 1024 * 1024, 0x41) });
    expect(bomba.byteLength).toBeLessThan(100_000);
    await expect(docxParaTexto(bomba)).rejects.toThrow(/grande de mais/);
  });
});

describe('.pdf', () => {
  /** Os pedaços de texto do PDF, como o pdf.js os dá (o mesmo que `pdf.ts` faz no browser). */
  async function pedacos(): Promise<PedacoPdf[]> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(PDF), disableFontFace: true }).promise;
    const conteudo = await (await doc.getPage(1)).getTextContent();
    const r: PedacoPdf[] = [];
    for (const i of conteudo.items) {
      if (!('str' in i)) continue;
      const t = i.transform as number[];
      r.push({ str: i.str, x: t[4]!, y: t[5]!, largura: i.width, altura: Math.abs(i.height || t[3]!) });
    }
    await doc.destroy();
    return r;
  }

  it('refaz títulos, listas (glifo do Word → «-») e a tabela, com a célula partida em duas linhas junta', async () => {
    const linhas = linhasDoPdf(await pedacos());
    expect(linhas).toContain('# Proposta comercial — Portal de pedidos');
    expect(linhas).toContain('# Contexto');
    expect(linhas).toContain('- Pedidos por telefone: os revendedores de exemplo fazem pedidos por telefone.');
    expect(linhas).toContain('Fase\tEntregáveis\tDuração\tValor');
    expect(linhas).toContain('Diagnóstico\tLevantamento de processos\t2–3 semanas\t285 000 MZN');
    expect(linhas).toContain('Implementação\tPortal em produção\t6 semanas\t1 450 000 MZN');
  });

  it('do PDF às folhas: o mesmo que do .docx (o cabeçalho de página fica à vista, não vira título)', async () => {
    const { proposta: p, relatorio } = lerTexto(linhasDoPdf(await pedacos()).join('\n'), '2026-01-01');
    expect(p.titulo).toBe('Portal de pedidos');
    expect(p.fases.map((f) => [f.nome, f.entregaveis, f.valor])).toEqual([
      ['Diagnóstico', 'Levantamento de processos', 285_000],
      ['Implementação', 'Portal em produção', 1_450_000],
    ]);
    expect(relatorio.naoReconhecido.map((x) => x.texto)).toContain('Cabeçalho de exemplo');
  });
});

describe('textoDoFicheiro', () => {
  it('.txt e .md passam como estão; .doc antigo e outros formatos são recusados com o que fazer', async () => {
    expect((await textoDoFicheiro(new File(['Contexto\n- a'], 'p.md', { type: 'text/markdown' }))).texto).toBe('Contexto\n- a');
    await expect(textoDoFicheiro(new File(['x'], 'p.doc'))).rejects.toThrow(/guarde como \.docx/);
    await expect(textoDoFicheiro(new File(['x'], 'p.xlsx'))).rejects.toThrow(/Formato não suportado/);
  });

  it('acima de 10 MB, recusa sem ler', async () => {
    const grande = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'p.docx');
    await expect(textoDoFicheiro(grande)).rejects.toThrow(/10 MB/);
  });

  it('o .docx real pela entrada completa', async () => {
    const f = new File([DOCX], 'proposta.docx');
    expect((await textoDoFicheiro(f)).texto).toContain('# Investimento');
  });
});
