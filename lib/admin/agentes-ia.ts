import { comRecuo429, MENSAGEM_429 } from '@/lib/ia/kimi-429';
import { log } from '@/lib/log/logger';
import {
  TIPOS_ACCAO,
  propostasValidas,
  respostaAgenteSchema,
  type AgenteZ,
  type Proposta,
} from './agentes';

/**
 * Um agente ZABATAINA responde a uma pergunta sobre um item do Mapa AEOS,
 * pelo Kimi, só com o contexto de leitura que lhe passamos. Pode propor até
 * três acções; a classe (e por isso a aprovação) decide-se depois, no
 * servidor e na base, pelo tipo. Nunca se regista o corpo da resposta do
 * fornecedor, que pode trazer o pedido.
 */

export function mensagensAgente(agente: AgenteZ, contexto: string, pergunta: string) {
  const sistema = [
    `És o agente ${agente.id} — ${agente.papel} — do ZABATAINA 3000, a trabalhar no AEOS da AGORAMOZ.`,
    `Objectivo: ${agente.objectivo}. Módulos: ${agente.modulos.join(', ')}.`,
    `Proibido: ${agente.proibidas.join('; ')}.`,
    'Regras da constituição (§9, §10): usa só o CONTEXTO dado; não inventes números, nomes, fontes nem resultados;',
    'quando o contexto não chega, diz exactamente o que falta. Responde em português de Portugal, curto e concreto.',
    'Podes propor no máximo 3 acções. Tipos permitidos: ' + TIPOS_ACCAO.join(', ') + '.',
    'Acções externas, financeiras, de publicação ou irreversíveis ficam à espera de aprovação humana: propõe, não executes.',
    'Responde SÓ com JSON: {"resposta": string, "propostas": [{"tipo": string, "titulo": string, "descricao": string}]}.',
  ].join('\n');
  const texto = pergunta.replace(/<<<|>>>/g, '');
  return [
    { role: 'system' as const, content: sistema },
    { role: 'user' as const, content: `CONTEXTO (só leitura):\n${contexto}\n\nPERGUNTA:\n<<<\n${texto}\n>>>` },
  ];
}

export type ResultadoAgente =
  | { readonly ok: true; readonly resposta: string; readonly propostas: Proposta[]; readonly retiradas: number }
  | { readonly ok: false; readonly erro: string };

export function lerRespostaAgente(conteudo: unknown): ResultadoAgente {
  if (typeof conteudo !== 'string' || !conteudo.trim()) return { ok: false, erro: 'O agente respondeu vazio.' };
  let bruto: unknown;
  try {
    bruto = JSON.parse(conteudo.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  } catch {
    return { ok: false, erro: 'O agente respondeu sem JSON válido.' };
  }
  const r = respostaAgenteSchema.safeParse(bruto);
  if (!r.success) return { ok: false, erro: 'O agente respondeu fora do formato.' };
  const { propostas, retiradas } = propostasValidas(r.data.propostas);
  return { ok: true, resposta: r.data.resposta, propostas, retiradas };
}

export async function perguntarAoKimi(
  opcoes: { chave: string; modelo: string; baseUrl: string; fetch?: typeof fetch; dormir?: (ms: number) => Promise<void> },
  agente: AgenteZ,
  contexto: string,
  pergunta: string,
): Promise<ResultadoAgente> {
  const f = opcoes.fetch ?? fetch;
  const prazo = AbortSignal.timeout(45_000);
  const corpo = JSON.stringify({
    model: opcoes.modelo,
    messages: mensagensAgente(agente, contexto, pergunta),
    response_format: { type: 'json_object' },
    thinking: { type: 'disabled' },
    max_tokens: 2_000,
  });
  try {
    const feito = await comRecuo429(
      () =>
        f(`${opcoes.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${opcoes.chave}` },
          body: corpo,
          redirect: 'error',
          signal: prazo,
          cache: 'no-store',
        }),
      { ...(opcoes.dormir ? { dormir: opcoes.dormir } : {}) },
    );
    if ('sem' in feito) return { ok: false, erro: MENSAGEM_429[feito.sem] };
    const res = feito.res;
    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      log.warn('aeos.agente', { outcome: 'failed', reason: `http_${res.status}` });
      return { ok: false, erro: 'O motor dos agentes está indisponível neste momento.' };
    }
    const dados = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    return lerRespostaAgente(dados.choices?.[0]?.message?.content);
  } catch (e) {
    const nome = (e as { name?: string } | null)?.name;
    log.warn('aeos.agente', { outcome: 'failed', reason: nome === 'TimeoutError' || nome === 'AbortError' ? 'timeout' : 'rede' });
    return { ok: false, erro: 'O agente demorou demasiado ou a rede falhou. Tente de novo.' };
  }
}
