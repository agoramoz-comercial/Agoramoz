import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { CIVICO } from '@/content/civico';
import { NAV } from '@/content/site';
import { RESERVED_TOP_LEVEL_SLUGS } from '@/content/registry';
import { PERGUNTA_MAX, PERGUNTA_MIN, dadoPessoalEm, limparPergunta } from './limites';

/**
 * O texto de `/civico` cumpre as regras que ele próprio anuncia, e a página
 * está onde o resto do site a procura.
 */

const MARCA = ' | AGORAMOZ';

describe('conteúdo do Cívico', () => {
  it('título com a marca cabe em 60 caracteres e não a repete', () => {
    expect((CIVICO.metaTitulo + MARCA).length).toBeLessThanOrEqual(60);
    expect(CIVICO.metaTitulo).not.toContain('AGORAMOZ');
  });

  it('descrição entre 120 e 160 caracteres', () => {
    expect(CIVICO.metaDescricao.length).toBeGreaterThanOrEqual(120);
    expect(CIVICO.metaDescricao.length).toBeLessThanOrEqual(160);
  });

  it('cada pergunta de exemplo passa as guardas do próprio campo', () => {
    const perguntas = CIVICO.temas.flatMap((t) => t.perguntas);
    expect(perguntas.length).toBeGreaterThanOrEqual(12);
    expect(new Set(perguntas).size).toBe(perguntas.length);
    for (const p of perguntas) {
      expect(limparPergunta(p), p).toBe(p);
      expect(p.length, p).toBeGreaterThanOrEqual(PERGUNTA_MIN);
      expect(p.length, p).toBeLessThanOrEqual(PERGUNTA_MAX);
      expect(dadoPessoalEm(p), p).toBeNull();
      expect(p.endsWith('?'), p).toBe(true);
    }
  });

  /**
   * O portal de origem anunciava «9.500+ documentos», «10 segundos» e «5.000 MZN
   * poupados» sem fonte para nenhum. Aqui, o que apresenta o serviço não leva
   * algarismos: uma quantidade só entra com fonte (`SourcedStat`).
   */
  it('a apresentação não promete números', () => {
    const apresentacao = [
      CIVICO.titulo,
      CIVICO.promessa,
      CIVICO.metaDescricao,
      CIVICO.temasTitulo,
      CIVICO.passosTitulo,
      ...CIVICO.ficha.flatMap((f) => [f.rotulo, f.valor]),
      ...CIVICO.passos.flatMap((p) => [p.titulo, p.corpo]),
      ...CIVICO.e,
      ...CIVICO.naoE,
      ...CIVICO.privacidade,
      CIVICO.orgTitulo,
      CIVICO.orgCorpo,
    ];
    for (const texto of apresentacao) expect(texto, texto).not.toMatch(/\d/);
  });

  it('diz que não é parecer jurídico onde a pessoa lê a resposta', () => {
    expect(CIVICO.avisoResposta).toMatch(/advogado/);
    expect(CIVICO.avisoResposta).toMatch(/inteligência artificial/);
    expect(CIVICO.semFonte).toMatch(/não traz ligação/);
  });
});

describe('a página no site', () => {
  it('o segmento está reservado e a rota está no sitemap e na navegação', async () => {
    expect(RESERVED_TOP_LEVEL_SLUGS).toContain('civico');
    const urls = (await sitemap()).map((e) => new URL(e.url).pathname);
    expect(urls).toContain('/civico');
    // Só em português: não há par inglês a apontar para um 404.
    expect(urls).not.toContain('/en/civico');
    expect(NAV.primary.map((i) => i.href)).toContain('/civico');
  });
});
