import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Nenhuma variável de CSS é usada sem estar definida.
 *
 * Porque este teste existe: `components/ui/SkipLink.tsx` usava
 * `var(--color-navy-950)` e `DiagnosticForm.tsx` usava `var(--color-navy-800)`.
 * Nenhum dos dois tokens existe em `app/globals.css`. O efeito do primeiro era
 * a ligação «saltar para o conteúdo» — que só quem navega por teclado vê —
 * renderizar texto branco sobre fundo transparente, ou seja, invisível.
 *
 * Um token que não existe **não parte nada**: o CSS ignora a declaração em
 * silêncio, o build passa, o typecheck passa, o lint passa, e o defeito só
 * aparece a quem usa a funcionalidade que ele afecta. Foi preciso ler o HTML
 * servido em produção para dar por ele. Este teste torna isso impossível.
 */

const RAIZES = ['app', 'components', 'lib'];
const EXTENSOES = ['.ts', '.tsx', '.css'];

function ficheiros(dir: string, acc: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    if (entrada === 'node_modules' || entrada.startsWith('.')) continue;
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) ficheiros(caminho, acc);
    else if (EXTENSOES.some((e) => caminho.endsWith(e))) acc.push(caminho);
  }
  return acc;
}

/**
 * Todos os nomes declarados, nas três formas em que este repositório os
 * declara:
 *
 * - `--nome: valor` em CSS;
 * - `{ '--nome': valor }` num `style` inline de React;
 * - `variable: '--nome'` numa fonte do `next/font`, que gera a declaração em
 *   tempo de build e por isso não aparece em CSS nenhum do repositório.
 *
 * A terceira é a que torna este extractor honesto: sem ela, as três fontes
 * apareciam como usadas e nunca declaradas, e o teste passava a acusar um
 * problema que não existe — que é a maneira mais rápida de alguém o desligar.
 */
function declarados(): Set<string> {
  const nomes = new Set<string>();
  for (const raiz of RAIZES) {
    for (const f of ficheiros(raiz)) {
      const texto = readFileSync(f, 'utf-8');
      for (const m of texto.matchAll(/(--[a-z0-9-]+)['"]?\s*:/gi)) nomes.add(m[1]!);
      for (const m of texto.matchAll(/variable:\s*['"](--[a-z0-9-]+)['"]/gi)) nomes.add(m[1]!);
    }
  }
  return nomes;
}

/** Todos os usos: `var(--nome)`. */
function usados(): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  for (const raiz of RAIZES) {
    for (const f of ficheiros(raiz)) {
      if (f.endsWith('.test.ts') || f.endsWith('.test.tsx')) continue;
      const texto = readFileSync(f, 'utf-8');
      for (const m of texto.matchAll(/var\((--[a-z0-9-]+)/gi)) {
        const nome = m[1]!;
        mapa.set(nome, [...(mapa.get(nome) ?? []), f]);
      }
    }
  }
  return mapa;
}

describe('tokens de CSS', () => {
  it('toda a variável usada com var(--…) está declarada', () => {
    const definidos = declarados();
    const emFalta: string[] = [];

    for (const [nome, onde] of usados()) {
      if (!definidos.has(nome)) emFalta.push(`${nome} — usado em ${[...new Set(onde)].join(', ')}`);
    }

    expect(emFalta, `variáveis usadas e nunca declaradas:\n${emFalta.join('\n')}`).toEqual([]);
  });

  it('o próprio extractor funciona', () => {
    // Guarda contra o teste passar por não ter encontrado nada.
    const definidos = declarados();
    expect(definidos.size).toBeGreaterThan(50);
    expect(definidos.has('--surface')).toBe(true);
    expect(usados().size).toBeGreaterThan(20);
  });
});
