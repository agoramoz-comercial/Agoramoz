import { describe, expect, it } from 'vitest';
import { criarLeitorDeFluxo, lerFluxo } from './fluxo';

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

describe('criarLeitorDeFluxo', () => {
  const corpo = sse({ type: 'start' }, delta('Segundo a lei, '), delta('são **30 dias**.'), { type: 'finish' });

  it('dá o mesmo texto seja qual for o sítio onde o corpo é cortado', () => {
    for (const tamanho of [1, 2, 3, 7, 16, 64, 1000]) {
      const leitor = criarLeitorDeFluxo(1000);
      const recebidos: string[] = [];
      for (let i = 0; i < corpo.length; i += tamanho) recebidos.push(...leitor.receber(corpo.slice(i, i + tamanho)));
      const { resultado, novos } = leitor.fechar();
      recebidos.push(...novos);
      expect(resultado, `tamanho ${tamanho}`).toEqual({ ok: true, texto: 'Segundo a lei, são **30 dias**.' });
      expect(recebidos.join(''), `tamanho ${tamanho}`).toBe('Segundo a lei, são **30 dias**.');
    }
  });

  it('entrega cada pedaço assim que a linha dele se completa', () => {
    const leitor = criarLeitorDeFluxo(1000);
    const linha = `data: ${JSON.stringify(delta('Olá'))}`;
    expect(leitor.receber(linha.slice(0, 10))).toEqual([]);
    expect(leitor.receber(linha.slice(10))).toEqual([]);
    expect(leitor.receber('\n')).toEqual(['Olá']);
  });

  it('a última linha sem fim de linha é lida ao fechar', () => {
    const leitor = criarLeitorDeFluxo(1000);
    leitor.receber(`data: ${JSON.stringify(delta('Fim'))}`);
    expect(leitor.fechar()).toEqual({ resultado: { ok: true, texto: 'Fim' }, novos: ['Fim'] });
  });

  it('depois de um erro do motor não entrega mais nada', () => {
    const leitor = criarLeitorDeFluxo(1000);
    expect(leitor.receber(sse(delta('Começo'), { type: 'error', errorText: 'x' }, delta('resto')))).toEqual(['Começo']);
    expect(leitor.receber(sse(delta('mais')))).toEqual([]);
    expect(leitor.fechar().resultado).toEqual({ ok: false, motivo: 'motor' });
  });

  it('pára no tecto e não entrega o pedaço que o passa', () => {
    const leitor = criarLeitorDeFluxo(10);
    expect(leitor.receber(sse(delta('12345'), delta('678901')))).toEqual(['12345']);
    expect(leitor.fechar().resultado).toEqual({ ok: false, motivo: 'grande' });
  });
});
