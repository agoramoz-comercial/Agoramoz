import { createServer } from 'node:http';

/**
 * A função `agoramoz_llm` do ZabaEdu, SIMULADA, só para QA local. Responde
 * com `lib/cursos/simulado.ts` (que copia frases das passagens e erra de
 * propósito na primeira tentativa) — nunca é apontada em produção.
 *
 *   node --experimental-strip-types .qa/cursos-motor-simulado.mjs
 *   CURSOS_ENGINE=zabaedu \
 *   ZABAEDU_FUNCTION_URL=http://127.0.0.1:4030/functions/agoramoz_llm \
 *   ZABAEDU_CHAVE=qa-chave-local-com-mais-de-vinte-e-quatro \
 *   ADMIN_PREVIEW=on pnpm start -p 3111
 */
const { responderSimulado } = await import('../lib/cursos/simulado.ts');
const PORTA = Number(process.env.PORTA ?? 4030);
const ATRASO = Number(process.env.ATRASO ?? 300);
const CHAVE = process.env.ZABAEDU_CHAVE ?? 'qa-chave-local-com-mais-de-vinte-e-quatro';

createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/functions/agoramoz_llm') return res.writeHead(404).end();
  let corpo = '';
  req.on('data', (c) => (corpo += c));
  req.on('end', () => {
    if (req.headers['x-agoramoz-chave'] !== CHAVE) return res.writeHead(401).end('{"error":"Unauthorized"}');
    const pedido = JSON.parse(corpo || '{}');
    // SEM_INTERNET=1 imita a função antiga do ZabaEdu: responde sem a marca de pesquisa.
    if (process.env.SEM_INTERNET === '1' && pedido.tarefa === 'pesquisar_fontes') {
      const r = responderSimulado(pedido);
      return res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(r.resultado));
    }
    console.log(`[motor] ${pedido.tarefa} ${pedido.prompt.includes('REJEITADA') ? '(correcção)' : ''}`);
    setTimeout(() => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(responderSimulado(pedido))), ATRASO);
  });
}).listen(PORTA, '127.0.0.1', () => console.log(`[motor] simulado em http://127.0.0.1:${PORTA}`));
