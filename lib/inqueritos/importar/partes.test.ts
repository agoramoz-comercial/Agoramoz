import { describe, expect, it } from 'vitest';
import { SEM_RESERVADAS } from '../construtor';
import { FalhaImportadorIA, type ImportadorIA } from '../ia';
import { specInicial } from '../spec';
import type { RascunhoImportado } from './esquema';
import { criarImportadorKimi } from './kimi';
import { analisarTexto, partirTexto } from './local';
import { importarTexto, juntarPartes } from './servidor';

/**
 * Inquéritos longos (o primeiro teste real tinha 16 741 caracteres e 48
 * perguntas): partidos entre blocos, pedidos ao Kimi em paralelo, e cada parte
 * que falhe lida pelo analisador local. Nada aqui fala com a Moonshot.
 */

/** Um inquérito sintético ao estilo do real: 4 secções × 11 perguntas (48 blocos, abaixo dos 50). */
function inqueritoLongo(): string {
  const linhas = [
    'Inquérito de Avaliação Operacional 2026',
    'Este inquérito ajuda-nos a perceber como a sua organização trabalha hoje.',
    '',
  ];
  let n = 0;
  for (let s = 1; s <= 4; s += 1) {
    linhas.push(`Secção ${s}: Área ${s} da operação`);
    linhas.push(`Texto de enquadramento da área ${s}, com o contexto necessário para responder.`);
    for (let q = 1; q <= 11; q += 1) {
      n += 1;
      if (q % 4 === 1) {
        linhas.push(`${n}. A área ${s} usa um sistema dedicado para o processo ${q}? *`);
        linhas.push('a) Sim', 'b) Não', 'c) Em implementação', 'd) Não sei');
      } else if (q % 4 === 2) {
        linhas.push(`${n}. Se sim, qual é o sistema usado e há quanto tempo está em produção?`);
      } else if (q % 4 === 3) {
        linhas.push(
          `${n}. Numa escala de 1 a 5, como avalia a maturidade do processo ${q} na área ${s}?`,
        );
        linhas.push('(1 = muito baixa, 5 = muito alta)');
      } else {
        linhas.push(
          `${n}. Descreva os principais problemas que a equipa enfrenta hoje no processo ${q}, com exemplos concretos.`,
        );
      }
    }
    linhas.push('');
  }
  linhas.push('Obrigado', 'A equipa lê todas as respostas.');
  return linhas.join('\n');
}

const naoVazias = (t: string) =>
  t
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

describe('partirTexto', () => {
  const texto = inqueritoLongo();
  const partes = partirTexto(texto, { max: 3_000 });

  it('um texto curto fica numa só parte', () => {
    expect(partirTexto('1. Usa um ERP? (Sim/Não)\n2. Se sim, qual?')).toHaveLength(1);
  });

  it('um inquérito longo parte-se em várias, sem perder nem trocar linhas', () => {
    expect(partes.length).toBeGreaterThan(2);
    expect(partes.flatMap(naoVazias)).toEqual(naoVazias(texto));
  });

  it('cada parte começa num bloco e respeita o limite (com folga para a condicional)', () => {
    for (const [i, p] of partes.entries()) {
      expect(p.length).toBeLessThanOrEqual(3_000 * 1.5);
      if (i > 0) expect(p).toMatch(/^(?:Secção \d|\d+\. |Obrigado)/);
    }
  });

  it('uma pergunta nunca fica separada das opções, nem «Se sim» da anterior', () => {
    for (const p of partes.slice(1)) {
      expect(p).not.toMatch(/^[a-d]\) /);
      expect(p).not.toMatch(/^\d+\. Se sim/);
    }
  });

  it('o cabeçalho fica na primeira parte e o «Obrigado» na última', () => {
    expect(partes[0]).toMatch(/^Inquérito de Avaliação Operacional 2026/);
    expect(partes.at(-1)).toMatch(/Obrigado\nA equipa lê todas as respostas\.$/);
  });

  it('cada parte lida pelo analisador local dá, no total, as 44 perguntas', () => {
    const lidas = partes.map((p, i) => analisarTexto(p, { cabecalho: i === 0 }));
    const perguntas = lidas.flatMap((r) => r.blocos).filter((b) => b.bloco === 'pergunta');
    expect(perguntas).toHaveLength(44);
    expect(lidas[0]!.titulo).toBe('Inquérito de Avaliação Operacional 2026');
    expect(lidas.slice(1).every((r) => r.titulo === undefined)).toBe(true);
  });
});

describe('juntarPartes', () => {
  it('desvia as condições pelas perguntas das partes anteriores e junta os ecrãs', () => {
    const a: RascunhoImportado = {
      titulo: 'T',
      introducao: 'I',
      blocos: [
        { bloco: 'pergunta', titulo: 'Um?', opcoes: ['Sim', 'Não'], tipo: 'escolha_unica' },
        { bloco: 'pergunta', titulo: 'Dois?' },
      ],
    };
    const b: RascunhoImportado = {
      titulo: 'Ignorado',
      agradecimento: 'Obrigado',
      blocos: [
        { bloco: 'seccao', titulo: 'S2' },
        { bloco: 'pergunta', titulo: 'Três?', opcoes: ['Sim', 'Não'], tipo: 'escolha_unica' },
        { bloco: 'pergunta', titulo: 'Quatro?', condicao: { pergunta: 1, valor: 'Sim' } },
      ],
    };
    const r = juntarPartes([a, b]);
    expect(r).toMatchObject({ titulo: 'T', introducao: 'I', agradecimento: 'Obrigado' });
    expect(r.blocos).toHaveLength(5);
    const quatro = r.blocos[4]!;
    expect(quatro.bloco === 'pergunta' && quatro.condicao).toEqual({ pergunta: 3, valor: 'Sim' });
  });
});

describe('importarTexto — partes em paralelo', () => {
  const texto = inqueritoLongo();
  const pedido = {
    texto,
    motor: 'kimi' as const,
    modo: 'substituir' as const,
    base: specInicial('pt'),
    reservadas: SEM_RESERVADAS,
  };
  const total = partirTexto(texto, { max: 3_000 }).length;

  /** Um Kimi falso que estrutura com o analisador local e conta os pedidos em voo. */
  function kimiFalso(falhar: (parte: number) => boolean = () => false) {
    let emVoo = 0;
    let maximo = 0;
    const partes: number[] = [];
    const kimi: ImportadorIA = {
      modelo: 'kimi-k2.6',
      async estruturar(t, _idioma, excerto) {
        emVoo += 1;
        maximo = Math.max(maximo, emVoo);
        partes.push(excerto?.parte ?? 1);
        await new Promise((r) => setTimeout(r, 5));
        emVoo -= 1;
        if (falhar(excerto?.parte ?? 1)) throw new FalhaImportadorIA('timeout');
        return analisarTexto(t, { cabecalho: (excerto?.parte ?? 1) === 1 });
      },
    };
    return { kimi, maximo: () => maximo, partes };
  }

  it('todas as partes pelo Kimi, no máximo 4 em simultâneo, 44 perguntas', async () => {
    const f = kimiFalso();
    const r = await importarTexto(pedido, { kimi: f.kimi });
    expect(r).toMatchObject({
      ok: true,
      motor: 'kimi',
      partes: { total, kimi: total, local: 0 },
    });
    if (r.ok) expect(r.resumo.perguntas).toBe(44);
    expect(f.maximo()).toBeLessThanOrEqual(4);
    expect([...f.partes].sort((x, y) => x - y)).toEqual(
      Array.from({ length: total }, (_, i) => i + 1),
    );
  });

  it('uma parte com timeout cai sozinha para o local; as outras ficam do Kimi', async () => {
    const r = await importarTexto(pedido, { kimi: kimiFalso((parte) => parte === 2).kimi });
    expect(r).toMatchObject({
      ok: true,
      motor: 'kimi',
      partes: { total, kimi: total - 1, local: 1, motivo: 'timeout' },
    });
    if (r.ok) expect(r.resumo.perguntas).toBe(44);
    expect(r.caiuParaLocal).toBeUndefined();
  });

  it('todas as partes falham: local inteiro, com o motivo', async () => {
    const r = await importarTexto(pedido, { kimi: kimiFalso(() => true).kimi });
    expect(r).toMatchObject({ ok: true, motor: 'local', caiuParaLocal: 'timeout' });
    if (r.ok) expect(r.resumo.perguntas).toBe(44);
  });

  it('conta Kimi de nível baixo (1 pedido de cada vez): as recusadas com 429 vão uma a uma', async () => {
    let emVoo = 0;
    const kimi: ImportadorIA = {
      modelo: 'kimi-k2.6',
      async estruturar(t, _idioma, excerto) {
        if (emVoo > 0) throw new FalhaImportadorIA('http_429');
        emVoo += 1;
        await new Promise((r) => setTimeout(r, 5));
        emVoo -= 1;
        return analisarTexto(t, { cabecalho: (excerto?.parte ?? 1) === 1 });
      },
    };
    const esperas: number[] = [];
    const r = await importarTexto(pedido, {
      kimi,
      esperar: async (ms) => void esperas.push(ms),
    });
    expect(r).toMatchObject({ ok: true, motor: 'kimi', partes: { total, kimi: total, local: 0 } });
    expect(esperas).toEqual([]);
  });

  it('um segundo 429 espera pela janela do minuto antes da parte seguinte', async () => {
    const kimi: ImportadorIA = {
      modelo: 'kimi-k2.6',
      async estruturar(t, _idioma, excerto) {
        if ((excerto?.parte ?? 1) > 1) throw new FalhaImportadorIA('http_429');
        return analisarTexto(t);
      },
    };
    const esperas: number[] = [];
    const r = await importarTexto(pedido, {
      kimi,
      esperar: async (ms) => void esperas.push(ms),
    });
    expect(r).toMatchObject({
      ok: true,
      motor: 'kimi',
      partes: { total, kimi: 1, local: total - 1, motivo: 'http_429' },
    });
    expect(esperas.length).toBe(total - 2);
    expect(esperas.every((ms) => ms === 20_000)).toBe(true);
  });

  it('um texto curto vai num só pedido, sem «excerto»', async () => {
    const vistos: unknown[] = [];
    const kimi: ImportadorIA = {
      modelo: 'kimi-k2.6',
      async estruturar(t, _i, excerto) {
        vistos.push(excerto);
        return analisarTexto(t);
      },
    };
    const r = await importarTexto(
      { ...pedido, texto: '1. Usa um ERP? (Sim/Não)\n2. Se sim, qual?' },
      { kimi },
    );
    expect(vistos).toEqual([undefined]);
    expect(r.ok && r.partes).toBeFalsy();
  });
});

describe('pedido ao Kimi', () => {
  async function corpoDe(excerto?: { parte: number; total: number }) {
    let corpo: Record<string, unknown> = {};
    const f = (async (_url: string, init: RequestInit) => {
      corpo = JSON.parse(String(init.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          choices: [
            { message: { content: JSON.stringify({ blocos: [{ bloco: 'pergunta', titulo: 'A?' }] }) } },
          ],
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    await criarImportadorKimi({
      chave: 'sk-teste-nunca-real-0123456789abcdef',
      modelo: 'kimi-k2.6',
      baseUrl: 'https://api.moonshot.ai/v1',
      fetch: f,
    }).estruturar('1. A?', 'pt', excerto);
    return corpo as { thinking: unknown; max_tokens: number; messages: { content: string }[] };
  }

  it('desliga o «thinking» do kimi-k2.6 (era o que levava o pedido aos 45 s)', async () => {
    expect((await corpoDe()).thinking).toEqual({ type: 'disabled' });
  });

  it('numa parte, o prompt diz qual é e como contar as condições; menos tokens', async () => {
    const c = await corpoDe({ parte: 2, total: 5 });
    expect(c.messages[0]!.content).toContain('parte 2 de 5');
    expect(c.messages[0]!.content).toContain('conta só as perguntas DESTE excerto');
    expect(c.max_tokens).toBe(6_000);
    expect((await corpoDe()).messages[0]!.content).not.toContain('EXCERTO');
  });
});
