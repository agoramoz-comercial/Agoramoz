import { createServer } from 'node:http';

/**
 * Motor `analyze-news` simulado, só para QA local. Devolve o payload
 * SINTÉTICO de `lib/news/exemplo.ts` — nunca é apontado em produção.
 *
 *   node --experimental-strip-types .qa/news-motor-simulado.mjs
 *   NEWS_ENGINE=lovable \
 *   LOVABLE_NEWS_FUNCTION_URL=http://127.0.0.1:4010/functions/v1/analyze-news \
 *   LOVABLE_NEWS_API_KEY=qa-chave-local-com-mais-de-vinte \
 *   pnpm start
 *
 * `?falha=1` no URL analisado faz o motor responder 500, para ver o erro.
 */
const { EXEMPLO_LOVABLE } = await import('../lib/news/exemplo.ts');
const PORTA = Number(process.env.PORTA ?? 4010);
const ATRASO = Number(process.env.ATRASO ?? 800);

createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/functions/v1/analyze-news') {
    res.writeHead(404).end();
    return;
  }
  let corpo = '';
  req.on('data', (c) => (corpo += c));
  req.on('end', () => {
    const pedido = JSON.parse(corpo || '{}');
    const autenticado = req.headers.authorization?.startsWith('Bearer ') && req.headers.apikey;
    console.log(`[motor] ${pedido.url ? 'url' : 'texto'} lang=${pedido.lang} auth=${Boolean(autenticado)}`);
    setTimeout(() => {
      if (!autenticado) return res.writeHead(401).end('{"error":"sem chave"}');
      if (String(pedido.url ?? '').includes('falha=1')) return res.writeHead(500).end('{"error":"x"}');
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(EXEMPLO_LOVABLE));
    }, ATRASO);
  });
}).listen(PORTA, '127.0.0.1', () => console.log(`[motor] simulado em http://127.0.0.1:${PORTA}`));
