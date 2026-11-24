import { describe, expect, it } from 'vitest';
import type { Motor } from './ciclo';
import { criarFonte } from './fontes';
import { confirmarLigacao, escreverTextoBase, pesquisarFontes, urlPublico, type Confirmar } from './fontes-ia';
import { gerarFontesPesquisa, gerarFonteTextoBase } from './gerar';
import { semPassagens, temFonteIA } from './modelo';
import { promptPesquisa, promptTextoBase } from './prompts';
import { responderSimulado } from './simulado';

const pedido = { titulo: 'Gestão de stock no armazém', tema: '', publico: '', nivel: 'iniciacao' as const };
const texto = 'O inventário periódico conta todos os artigos do armazém no fim de cada mês. '.repeat(8);
const todos: Confirmar = async () => true;

describe('links das fontes pesquisadas', () => {
  it('só https públicos', () => {
    expect(urlPublico('https://www.ine.gov.mz/pagina')).not.toBeNull();
    for (const u of [
      'http://www.ine.gov.mz/',
      'https://localhost/x',
      'https://127.0.0.1/x',
      'https://[::1]/x',
      'https://servidor/x',
      'https://wiki.corp/x',
      'https://site.org:8443/x',
      'https://user:senha@site.org/',
      'nao é url',
    ])
      expect(urlPublico(u), u).toBeNull();
  });

  it('confirma pela resposta: 404 e falha de rede não; 403 e redireccionamento sim', async () => {
    const com = (status: number) => confirmarLigacao((async () => new Response(null, { status })) as typeof fetch);
    expect(await com(200)('https://site.org/a')).toBe(true);
    expect(await com(301)('https://site.org/a')).toBe(true);
    expect(await com(403)('https://site.org/a')).toBe(true);
    expect(await com(404)('https://site.org/a')).toBe(false);
    expect(await com(410)('https://site.org/a')).toBe(false);
    const rede = confirmarLigacao((async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch);
    expect(await rede('https://site.org/a')).toBe(false);
    let chamado = false;
    const espiao = confirmarLigacao((async () => {
      chamado = true;
      return new Response(null);
    }) as typeof fetch);
    expect(await espiao('https://127.0.0.1/x')).toBe(false);
    expect(chamado).toBe(false);
  });
});

describe('pesquisar fontes', () => {
  it('recusa respostas sem a marca de pesquisa na internet (os links podiam ser inventados)', async () => {
    const semMarca: Motor = async () => ({ fontes: [{ titulo: 'x', url: 'https://site.org/a', texto }] });
    await expect(pesquisarFontes(semMarca, pedido, todos)).rejects.toMatchObject({ codigo: 'sem_internet' });
  });

  it('fica só com links públicos, confirmados, sem repetidos e com texto', async () => {
    const motor: Motor = async () => ({
      internet: true,
      resultado: {
        fontes: [
          { titulo: 'Boa', url: 'https://site.org/a', texto },
          { titulo: 'Repetida', url: 'https://site.org/a', texto },
          { titulo: 'Curta', url: 'https://site.org/b', texto: 'pouco' },
          { titulo: 'Interna', url: 'https://localhost/c', texto },
          { titulo: 'Não abre', url: 'https://site.org/404', texto },
        ],
      },
    });
    const r = await pesquisarFontes(motor, pedido, async (u) => !u.endsWith('404'));
    expect(r.fontes).toEqual([{ titulo: 'Boa', url: 'https://site.org/a', texto: texto.trim(), origem: 'ia-pesquisa' }]);
    expect(r.recusadas.join(' ')).toMatch(/Curta.*curto/);
    expect(r.recusadas.join(' ')).toMatch(/Interna.*não público/);
    expect(r.recusadas.join(' ')).toMatch(/Não abre.*não abre/);
  });

  it('nenhuma fonte confirmada é um erro claro', async () => {
    const motor: Motor = async () => ({ internet: true, resultado: { fontes: [{ titulo: 'x', url: 'https://site.org/a', texto }] } });
    await expect(pesquisarFontes(motor, pedido, async () => false)).rejects.toMatchObject({ codigo: 'sem_resultados' });
  });

  it('o pedido proíbe links de memória', () => {
    expect(promptPesquisa(pedido)).toMatch(/Nunca escrevas um endereço de memória/);
    expect(promptPesquisa(pedido)).toContain(`- Título do curso: ${pedido.titulo}`);
  });

  it('gerarFontesPesquisa: sem título não chama o motor; erro do motor vira mensagem', async () => {
    let chamado = false;
    const r = await gerarFontesPesquisa(
      async () => {
        chamado = true;
        return {};
      },
      { ...pedido, titulo: 'x' },
      todos,
    );
    expect(r).toMatchObject({ ok: false });
    expect(chamado).toBe(false);
    const s = await gerarFontesPesquisa(async () => ({}), pedido, todos);
    expect(s.ok === false && s.erro).toMatch(/não pesquisa na internet/);
  });
});

describe('texto-base escrito pela IA', () => {
  it('fica marcado como da IA e tenta outra vez se vier curto', async () => {
    let n = 0;
    const motor: Motor = async () => (++n === 1 ? { titulo: 'T', texto: 'curto' } : { titulo: 'Texto sobre stock', texto: texto.repeat(3) });
    const f = await escreverTextoBase(motor, pedido);
    expect(n).toBe(2);
    expect(f).toMatchObject({ titulo: 'Texto sobre stock', origem: 'ia-texto' });
    expect(f.url).toBeUndefined();
  });

  it('desiste com erro claro', async () => {
    const r = await gerarFonteTextoBase(async () => ({ titulo: 'T', texto: 'curto' }), pedido);
    expect(r.ok === false && r.erro).toMatch(/curto de mais/);
  });

  it('o pedido proíbe números e factos inventados', () => {
    expect(promptTextoBase(pedido)).toMatch(/NÃO inventes números/);
  });
});

describe('a origem chega ao curso publicado', () => {
  it('criarFonte e semPassagens guardam a origem e o link', () => {
    const f = criarFonte(1, 'Página', 'web', texto, { url: 'https://site.org/a', origem: 'ia-pesquisa' });
    expect(semPassagens(f)).toEqual({ id: 'F1', titulo: 'Página', tipo: 'web', url: 'https://site.org/a', origem: 'ia-pesquisa' });
    expect(semPassagens(criarFonte(2, 'Manual', 'pdf', texto))).not.toHaveProperty('origem');
  });

  it('o aviso só aparece com texto escrito pela IA', () => {
    expect(temFonteIA([{}, { origem: 'ia-pesquisa' }])).toBe(false);
    expect(temFonteIA([{}, { origem: 'ia-texto' }])).toBe(true);
  });
});

describe('motor simulado', () => {
  it('pesquisa marcada como feita na internet, com um link que não abre', async () => {
    const motor: Motor = async (p) => responderSimulado(p);
    const r = await pesquisarFontes(motor, pedido, async (u) => !u.includes('nao-existe'));
    expect(r.fontes).toHaveLength(2);
    expect(r.recusadas).toHaveLength(1);
    const t = await escreverTextoBase(motor, pedido);
    expect(t.origem).toBe('ia-texto');
  });
});

it('pesquisa: o resultado pode vir como texto JSON', async () => {
  const motor: Motor = async () => ({
    internet: true,
    resultado: JSON.stringify({ fontes: [{ titulo: 'Boa', url: 'https://site.org/a', texto }] }),
  });
  expect((await pesquisarFontes(motor, pedido, todos)).fontes).toHaveLength(1);
});
