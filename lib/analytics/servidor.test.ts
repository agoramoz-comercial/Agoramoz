import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registarEventoServidor } from './servidor';

function clienteSimulado(resposta: { error: { code?: string } | null } | Error) {
  const insert = vi.fn(async () => {
    if (resposta instanceof Error) throw resposta;
    return resposta;
  });
  const from = vi.fn(() => ({ insert }));
  return { cliente: { from } as unknown as SupabaseClient, from, insert };
}

afterEach(() => vi.restoreAllMocks());

describe('registarEventoServidor', () => {
  it('grava com origem servidor, canal desconhecido e só os escalares recebidos', async () => {
    const { cliente, from, insert } = clienteSimulado({ error: null });
    await registarEventoServidor(
      'news_analisada',
      { prioridade: 'alta', faltas: 0 },
      { persistencia: 'on', cliente, path: '/news' },
    );
    expect(from).toHaveBeenCalledWith('analytics_events');
    expect(insert).toHaveBeenCalledWith({
      name: 'news_analisada',
      channel: 'desconhecido',
      path: '/news',
      props: { prioridade: 'alta', faltas: 0 },
      origin: 'servidor',
    });
  });

  it('com a persistência desligada não toca na base', async () => {
    const { cliente, from } = clienteSimulado({ error: null });
    await registarEventoServidor('news_falhou', {}, { persistencia: 'off', cliente });
    expect(from).not.toHaveBeenCalled();
  });

  it('sem cliente não faz nada e não lança', async () => {
    await expect(registarEventoServidor('news_falhou', {}, { persistencia: 'on', cliente: null })).resolves.toBeUndefined();
  });

  it('um erro da base fica no log e não sobe', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { cliente } = clienteSimulado({ error: { code: '42501' } });
    await expect(registarEventoServidor('news_falhou', {}, { persistencia: 'on', cliente })).resolves.toBeUndefined();
    expect(erro.mock.calls.flat().join(' ')).toContain('analytics.insert_failed');
  });

  it('uma excepção do cliente também não sobe', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { cliente } = clienteSimulado(new Error('rede'));
    await expect(registarEventoServidor('news_falhou', {}, { persistencia: 'on', cliente })).resolves.toBeUndefined();
  });
});
