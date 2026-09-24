import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COUNTRY_CODES, RESERVED_TOP_LEVEL_SLUGS } from '@/content/registry';

/**
 * `RESERVED_TOP_LEVEL_SLUGS` diz de si próprio, em comentário: «Verificado em
 * teste.» Não estava. O teste não existia em lado nenhum do repositório.
 *
 * Um comentário que afirma uma verificação inexistente é pior do que nenhum
 * comentário: quem o lê deixa de procurar o problema. O problema real é
 * concreto — se um código de país alguma vez colidir com um segmento estático,
 * o Next serve o estático e a rota de país desaparece sem erro nenhum, em build
 * ou em runtime. É uma página de mercado inteira a evaporar-se em silêncio.
 */

function segmentosDeTopo(): string[] {
  const raiz = 'app/(site)';
  return readdirSync(raiz)
    .filter((nome) => statSync(join(raiz, nome)).isDirectory())
    // `[pais]` é a rota dinâmica que estes segmentos podem sombrear; não é um
    // segmento estático e não se compara consigo própria.
    .filter((nome) => !nome.startsWith('[') && !nome.startsWith('('));
}

describe('segmentos estáticos de topo', () => {
  it('nenhum código de país colide com um segmento reservado', () => {
    const reservados = new Set<string>(RESERVED_TOP_LEVEL_SLUGS);
    const colisoes = COUNTRY_CODES.filter((c) => reservados.has(c));

    expect(colisoes).toEqual([]);
  });

  it('todo o directório estático de (site) está declarado como reservado', () => {
    // Este é o lado que faltava. A lista podia estar correcta e alguém criar
    // `app/(site)/notas/` sem a actualizar — e a colisão voltava a ser possível
    // sem nada a assinalá-la.
    const reservados = new Set<string>(RESERVED_TOP_LEVEL_SLUGS);
    const naoDeclarados = segmentosDeTopo().filter((s) => !reservados.has(s));

    expect(naoDeclarados).toEqual([]);
  });

  it('a verificação vê de facto os directórios', () => {
    // Sem isto, um erro no filtro fazia o teste acima passar por não ter nada
    // que comparar.
    expect(segmentosDeTopo().length).toBeGreaterThanOrEqual(6);
  });
});
