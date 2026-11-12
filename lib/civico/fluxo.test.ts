import { describe, expect, it } from 'vitest';
import { lerFluxo } from './fluxo';

/** O fluxo tal como o transporte de chat do AI SDK o escreve: um JSON por linha `data:`. */
const sse = (...eventos: unknown[]) =>
  [...eventos.map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}`), 'data: [DONE]', ''].join('\n\n');

const delta = (d: string) => ({ type: 'text-delta', id: 't1', delta: d });

describe('lerFluxo', () => {
  it('junta os pedaços de texto pela ordem e ignora o resto', () => {
    const corpo = sse(
      { type: 'start', messageId: 'm1' },
      { type: 'start-step' },
      { type: 'text-start', id: 't1' },
      delta('Segundo a '),
      delta('**Lei do Trabalho**'),
      { type: 'tool-input-start', toolCallId: 'x' },
      delta(', o prazo é de 30 dias.'),
      { type: 'text-end', id: 't1' },
      { type: 'finish' },
    );
    expect(lerFluxo(corpo, 1000)).toEqual({ ok: true, texto: 'Segundo a **Lei do Trabalho**, o prazo é de 30 dias.' });
  });

  it('aceita `data:` sem espaço e fins de linha CRLF', () => {
    const corpo = `data:${JSON.stringify(delta('Olá'))}\r\n\r\ndata:${JSON.stringify(delta(' mundo'))}\r\n\r\n`;
    expect(lerFluxo(corpo, 1000)).toEqual({ ok: true, texto: 'Olá mundo' });
  });

  it('preserva as quebras de linha dentro do texto (são o Markdown)', () => {
    const r = lerFluxo(sse(delta('## Título\n\n- um\n'), delta('- dois')), 1000);
    expect(r).toEqual({ ok: true, texto: '## Título\n\n- um\n- dois' });
  });

  it('um evento de erro é falha do motor, e a mensagem dele não sai', () => {
    const r = lerFluxo(sse(delta('Começo'), { type: 'error', errorText: 'chave sk-123 inválida' }), 1000);
    expect(r).toEqual({ ok: false, motivo: 'motor' });
    expect(JSON.stringify(r)).not.toContain('sk-123');
  });

  it('pára quando o texto passa do tecto', () => {
    expect(lerFluxo(sse(delta('a'.repeat(60)), delta('b'.repeat(60))), 100)).toEqual({ ok: false, motivo: 'grande' });
  });

  it('uma linha partida não invalida as outras', () => {
    const corpo = ['data: {"type":"text-delta","id":"t1","del', `data: ${JSON.stringify(delta('Resposta.'))}`, ''].join('\n\n');
    expect(lerFluxo(corpo, 1000)).toEqual({ ok: true, texto: 'Resposta.' });
  });

  it.each([
    ['corpo vazio', ''],
    ['só o fim', 'data: [DONE]\n\n'],
    ['uma página HTML', '<!doctype html><html><body>Bloqueado</body></html>'],
    ['eventos sem texto', sse({ type: 'start' }, { type: 'finish' })],
    ['texto só de espaços', sse(delta('   \n '))],
    ['delta que não é texto', sse({ type: 'text-delta', id: 't1', delta: { x: 1 } })],
  ])('%s é vazio', (_nome, corpo) => {
    expect(lerFluxo(corpo, 1000)).toEqual({ ok: false, motivo: 'vazio' });
  });
});
