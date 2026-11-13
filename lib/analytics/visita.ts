/**
 * A visita, sem identificar ninguém e sem guardar nada no dispositivo.
 *
 * Para saber por onde uma visita entrou, por onde andou e onde parou, é
 * preciso juntar as páginas da mesma visita. O browser não envia nenhum
 * identificador (nem cookie, nem `localStorage`): o servidor calcula, a cada
 * pedido, um resumo criptográfico de
 *
 *     segredo do servidor + dia (UTC) + endereço IP + navegador (User-Agent)
 *
 * e guarda só os primeiros 16 caracteres. O IP e o User-Agent nunca são
 * guardados. O segredo nunca sai do servidor e o dia muda à meia-noite: o
 * mesmo visitante tem outro resumo amanhã, e ninguém — nem nós — consegue
 * voltar do resumo ao endereço. É o desenho do Plausible e do Fathom.
 *
 * Limites, ditos em vez de escondidos:
 * - pessoas atrás do mesmo IP com o mesmo navegador (CGNAT das operadoras
 *   móveis, um escritório) contam como uma visita;
 * - quem volta noutro dia conta como visitante novo.
 */

export function diaUtc(agora: Date): string {
  return agora.toISOString().slice(0, 10);
}

export async function resumoDaVisita(origem: string, navegador: string, dia: string, segredo: string): Promise<string> {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  // O rótulo separa este uso de qualquer outro uso do mesmo segredo.
  const assinatura = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(`agoramoz:visitas:${dia}:${origem}:${navegador}`));
  return Array.from(new Uint8Array(assinatura).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Robôs, pré-visualizações e ferramentas: não são visitas. */
const ROBO =
  /bot\b|bot\/|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|linkedinbot|embedly|preview|headless|phantom|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl\/|wget|python-|axios|node-fetch|undici|go-http|java\/|okhttp|postman|insomnia|vercel-/i;

export function eRobo(navegador: string | null): boolean {
  return !navegador || navegador.length < 20 || ROBO.test(navegador);
}

/** O país do pedido, como a Vercel o põe no cabeçalho (`x-vercel-ip-country`). Só o país; nunca a cidade. */
export function paisDoPedido(cabecalho: string | null): string | null {
  return cabecalho && /^[A-Z]{2}$/.test(cabecalho) ? cabecalho : null;
}
