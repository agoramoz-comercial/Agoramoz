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

/**
 * Leitor incremental: recebe o corpo aos pedaços, tal como chega da rede, e
 * devolve o texto novo de cada pedaço. Um pedaço pode acabar a meio de uma
 * linha — o resto fica guardado até chegar o fim dela.
 */
export function criarLeitorDeFluxo(maxTexto: number) {
  let pendente = '';
  let texto = '';
  let houveEvento = false;
  let falha: 'motor' | 'grande' | null = null;

  function linha(l: string): string | null {
    const dados = dadosDaLinha(l);
    if (dados === null || dados === '' || dados === '[DONE]') return null;

    let evento: Evento;
    try {
      evento = JSON.parse(dados) as Evento;
    } catch {
      // Uma linha partida não invalida as outras: o que conta é o texto que chegou.
      return null;
    }
    if (typeof evento !== 'object' || evento === null) return null;
    houveEvento = true;

    // A mensagem de erro do motor não sai daqui: pode trazer detalhe interno dele.
    if (evento.type === 'error') {
      falha = 'motor';
      return null;
    }
    if (evento.type === 'text-delta' && typeof evento.delta === 'string') {
      texto += evento.delta;
      if (texto.length > maxTexto) {
        falha = 'grande';
        return null;
      }
      return evento.delta;
    }
    return null;
  }

  function linhas(lista: readonly string[]): string[] {
    const novos: string[] = [];
    for (const l of lista) {
      if (falha) break;
      const delta = linha(l);
      if (delta) novos.push(delta);
    }
    return novos;
  }

  return {
    /** Os pedaços de texto que este bocado do corpo completou. Depois de uma falha, nenhum. */
    receber(pedaco: string): string[] {
      if (falha) return [];
      const partes = (pendente + pedaco).split(/\r?\n/);
      pendente = partes.pop() ?? '';
      return linhas(partes);
    },
    /** O corpo acabou: lê o que sobrou e diz como correu. */
    fechar(): { resultado: ResultadoFluxo; novos: string[] } {
      const novos = falha ? [] : linhas(pendente.split(/\r\n|\n|\r/));
      pendente = '';
      if (falha) return { resultado: { ok: false, motivo: falha }, novos: [] };
      const limpo = texto.trim();
      if (!houveEvento || !limpo) return { resultado: { ok: false, motivo: 'vazio' }, novos };
      return { resultado: { ok: true, texto: limpo }, novos };
    },
  };
}

/** O corpo inteiro de uma vez. É o leitor incremental com um só pedaço. */
export function lerFluxo(corpo: string, maxTexto: number): ResultadoFluxo {
  const leitor = criarLeitorDeFluxo(maxTexto);
  leitor.receber(corpo);
  return leitor.fechar().resultado;
}
