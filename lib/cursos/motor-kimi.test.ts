import { describe, expect, it, vi } from 'vitest';
import { criarMotorKimi, ErroMotor } from './motor';

const base = { chave: 'k'.repeat(32), modelo: 'kimi-k2.6', baseUrl: 'https://api.moonshot.ai/v1' };
const resposta = (content: unknown, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });

describe('motor dos cursos sobre o Kimi', () => {
  it('manda o esquema e devolve o JSON', async () => {
    const f = vi.fn(async () => resposta('```json\n{"tema":"x"}\n```'));
    const m = criarMotorKimi({ ...base, fetch: f as unknown as typeof fetch });
    await expect(m({ tarefa: 'sugerir_tema', prompt: 'p', schema: { type: 'object' } })).resolves.toEqual({ tema: 'x' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.moonshot.ai/v1/chat/completions');
    const corpo = JSON.parse(String(init.body));
    expect(corpo.response_format).toEqual({ type: 'json_object' });
    expect(corpo.messages[0].content).toContain('{"type":"object"}');
    expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${base.chave}`);
  });

  it('pesquisa de fontes nunca vem marcada como feita na internet', async () => {
    const f = vi.fn(async () => resposta('{"fontes":[]}'));
    const m = criarMotorKimi({ ...base, fetch: f as unknown as typeof fetch });
    const r = (await m({ tarefa: 'pesquisar_fontes', prompt: 'p', schema: {} })) as Record<string, unknown>;
    expect(r.internet).toBeUndefined();
  });

  it('401 é recusado; 500 indisponível; texto sem JSON inválido', async () => {
    const mk = (r: Response) => criarMotorKimi({ ...base, fetch: (async () => r) as unknown as typeof fetch });
    await expect(mk(new Response('', { status: 401 }))({ tarefa: 'planear', prompt: '', schema: {} })).rejects.toMatchObject({ codigo: 'recusado' });
    await expect(mk(new Response('', { status: 500 }))({ tarefa: 'planear', prompt: '', schema: {} })).rejects.toMatchObject({ codigo: 'indisponivel' });
    await expect(mk(resposta('olá'))({ tarefa: 'planear', prompt: '', schema: {} })).rejects.toBeInstanceOf(ErroMotor);
  });
});

describe('motor dos cursos sobre o Kimi: 429 (IA-429-01)', () => {
  const dormir = async () => undefined;
  it('sem saldo → sem_saldo, com a mensagem de carregar a conta', async () => {
    const f = async () => new Response(JSON.stringify({ error: { type: 'exceeded_current_quota_error' } }), { status: 429 });
    const m = criarMotorKimi({ ...base, fetch: f as unknown as typeof fetch, dormir });
    await expect(m({ tarefa: 'planear', prompt: '', schema: {} })).rejects.toMatchObject({ codigo: 'sem_saldo' });
  });
  it('limite que passa à segunda → resposta normal', async () => {
    let n = 0;
    const f = async () =>
      ++n === 1 ? new Response(JSON.stringify({ error: { type: 'rate_limit_reached_error' } }), { status: 429 }) : resposta('{"ok":1}');
    const m = criarMotorKimi({ ...base, fetch: f as unknown as typeof fetch, dormir });
    await expect(m({ tarefa: 'planear', prompt: '', schema: {} })).resolves.toEqual({ ok: 1 });
  });
});
