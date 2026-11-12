import { createServer } from 'node:http';

/**
 * Motor cívico simulado, só para QA local. Fala o mesmo protocolo do
 * `/api/consulta` do portal (fluxo de eventos do AI SDK) e devolve uma
 * resposta SINTÉTICA — nunca é apontado em produção, e o texto não é
 * informação jurídica: serve para ver o ecrã com títulos, listas, tabela,
 * citação e fontes.
 *
 *   node .qa/civico-motor-simulado.mjs
 *   CIVICO_ENGINE=lovable \
 *   LOVABLE_CIVICO_URL=http://127.0.0.1:4020/api/consulta \
 *   pnpm start
 *
 * Na pergunta: «sem fonte» devolve uma resposta sem ligações, «revogada» uma
 * que cita a Lei n.º 23/2007 (para ver o aviso de vigência), «falha» faz o
 * motor responder 500, «bloqueio» 403 e «erro» um evento de erro no fluxo.
 *
 * A resposta sai aos pedaços, com `PAUSA` ms entre eles, como no motor real:
 * é o que deixa ver a página a escrever. A pergunta é procurada em TODAS as
 * mensagens do utilizador — a última, na nossa rota, é só o tema.
 */
const PORTA = Number(process.env.PORTA ?? 4020);
const ATRASO = Number(process.env.ATRASO ?? 500);
const PAUSA = Number(process.env.PAUSA ?? 25);

const COM_FONTES = `## Resposta de demonstração

Este texto é **sintético**: vem do motor simulado de QA e *não* é informação jurídica. Serve para ver como a página mostra uma resposta com [uma fonte do Estado](https://www.mitess.gov.mz/legislacao) e [uma fonte externa](https://www.exemplo.co.mz/documento).

### O que a página tem de mostrar

- um parágrafo com **negrito**, *ênfase* e ligações numeradas;
- uma lista como esta, com a segunda citação da [mesma fonte do Estado](https://www.mitess.gov.mz/legislacao#artigo);
- um endereço solto: https://www.portaldogoverno.gov.mz/por/Governo/Legislacao.

1. Primeiro passo de exemplo.
2. Segundo passo de exemplo.

| Situação | Prazo de exemplo |
| --- | --- |
| Caso A | 15 dias |
| Caso B | 30 dias |

> Uma citação de exemplo, para ver o bloco de citação.

Uma ligação insegura fica só em texto: [não é ligação](http://127.0.0.1/admin) e <script>alert(1)</script> lê-se como texto.`;

const REVOGADA = `### 1. Resposta directa
Resposta de demonstração que cita lei revogada.

### 2. O que diz a lei
Segundo a **Lei n.º 23/2007**, art. 130, o aviso prévio é de 30 dias. Ver também a Lei n.º 4/2007.

### 6. Fonte legal
1. **Lei n.º 23/2007, de 1 de Agosto** — Lei do Trabalho. https://www.portaldogoverno.gov.mz`;

const SEM_FONTES = `Esta resposta de demonstração **não cita nenhuma fonte**. A página tem de o dizer com o aviso próprio, em vez de a apresentar como as outras.`;

function eventos(texto) {
  const id = 't1';
  const pedacos = texto.match(/[\s\S]{1,28}/g) ?? [];
  return [
    { type: 'start' },
    { type: 'start-step' },
    { type: 'text-start', id },
    ...pedacos.map((delta) => ({ type: 'text-delta', id, delta })),
    { type: 'text-end', id },
    { type: 'finish-step' },
    { type: 'finish' },
  ];
}

createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/api/consulta') {
    res.writeHead(404).end();
    return;
  }
  let corpo = '';
  req.on('data', (c) => (corpo += c));
  req.on('end', () => {
    const pedido = JSON.parse(corpo || '{}');
    const mensagens = Array.isArray(pedido.messages) ? pedido.messages : [];
    const doUtilizador = mensagens.filter((m) => m.role === 'user').map((m) => m.parts?.[0]?.text ?? '');
    // A pergunta é a última mensagem do utilizador que não é a linha de tema.
    const ultima = doUtilizador.filter((t) => !t.startsWith('Tema: ')).at(-1) ?? '';
    // Só a forma do pedido vai para o terminal — e a ÚLTIMA mensagem, que é o
    // que o portal real publica: tem de ser o tema, nunca a pergunta.
    console.log(`[motor] mensagens=${mensagens.length} idioma=${req.headers['x-idioma']} ultima=${JSON.stringify(doUtilizador.at(-1)?.slice(0, 40))}`);
    setTimeout(() => {
      if (/\bfalha\b/i.test(ultima)) return res.writeHead(500).end('erro');
      if (/\bbloqueio\b/i.test(ultima)) return res.writeHead(403).end('bloqueado');
      res.writeHead(200, { 'content-type': 'text/event-stream', 'x-request-id': 'qa-1' });
      const lista = /\berro\b/i.test(ultima)
        ? [{ type: 'start' }, { type: 'error', errorText: 'detalhe interno do motor' }]
        : eventos(/sem fonte/i.test(ultima) ? SEM_FONTES : /revogada/i.test(ultima) ? REVOGADA : COM_FONTES);
      let i = 0;
      const seguinte = () => {
        if (i >= lista.length) return res.end('data: [DONE]\n\n');
        res.write(`data: ${JSON.stringify(lista[i])}\n\n`);
        i += 1;
        setTimeout(seguinte, PAUSA);
      };
      seguinte();
    }, ATRASO);
  });
}).listen(PORTA, '127.0.0.1', () => console.log(`[motor] cívico simulado em http://127.0.0.1:${PORTA}`));
