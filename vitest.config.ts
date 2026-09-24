import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Testes de lógica pura, em Node. Não há ambiente de DOM aqui de propósito:
 * o que esta configuração cobre — schema, scoring, regras de diagnóstico — não
 * toca no browser, e um `jsdom` a arrancar por ficheiro custa tempo sem
 * comprar nada. Quando houver componentes a testar, entra um projeto separado
 * com o seu próprio `environment`, em vez de se abrandar estes.
 *
 * O alias repete o `paths` do tsconfig (`@/*` → raiz). O Vitest não lê o
 * tsconfig, pelo que sem isto qualquer `@/content/...` falha a resolver.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
    /**
     * `.qa/` são scripts de operação manual contra um servidor a correr, não
     * testes. Se entrassem aqui, o `pnpm test` passava a exigir um `next start`.
     */
    exclude: ['node_modules/**', '.next/**', '.qa/**'],
  },
});
