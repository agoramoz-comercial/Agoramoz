/**
 * Leitor do fluxo de resposta do motor cívico.
 *
 * O contrato foi lido no bundle público do portal (`/api/consulta`): o cliente
 * deles usa o transporte de chat do AI SDK, que recebe eventos
 * `text/event-stream`, um JSON por linha `data:` —
 *
 *   data: {"type":"text-start","id":"t1"}
 *   data: {"type":"text-delta","id":"t1","delta":"Segundo a "}
 *   data: {"type":"text-end","id":"t1"}
 *   data: {"type":"error","errorText":"…"}
 *   data: [DONE]
 *
 * Aqui só interessa o texto. Tudo o resto (início, passos, ferramentas,
 * metadados) é ignorado; um tipo novo que o motor passe a enviar não parte
 * nada. Função pura, para se testar sem rede.
 */

export type ResultadoFluxo =
  | { readonly ok: true; readonly texto: string }
  | { readonly ok: false; readonly motivo: 'motor' | 'grande' | 'vazio' };

interface Evento {
  readonly type?: unknown;
  readonly delta?: unknown;
}

/** O texto de uma linha `data:`, ou `null` se a linha não for de dados. */
function dadosDaLinha(linha: string): string | null {
  if (!linha.startsWith('data:')) return null;
  // A especificação SSE tira UM espaço depois dos dois pontos, se existir.
  return linha.slice(linha[5] === ' ' ? 6 : 5);
}

export function lerFluxo(corpo: string, maxTexto: number): ResultadoFluxo {
  let texto = '';
  let houveEvento = false;

  for (const linha of corpo.split(/\r\n|\n|\r/)) {
    const dados = dadosDaLinha(linha);
    if (dados === null || dados === '' || dados === '[DONE]') continue;

    let evento: Evento;
    try {
      evento = JSON.parse(dados) as Evento;
    } catch {
      // Uma linha partida não invalida as outras: o que conta é o texto que chegou.
      continue;
    }
    if (typeof evento !== 'object' || evento === null) continue;
    houveEvento = true;

    // A mensagem de erro do motor não sai daqui: pode trazer detalhe interno dele.
    if (evento.type === 'error') return { ok: false, motivo: 'motor' };

    if (evento.type === 'text-delta' && typeof evento.delta === 'string') {
      texto += evento.delta;
      if (texto.length > maxTexto) return { ok: false, motivo: 'grande' };
    }
  }

  const limpo = texto.trim();
  if (!houveEvento || !limpo) return { ok: false, motivo: 'vazio' };
  return { ok: true, texto: limpo };
}
