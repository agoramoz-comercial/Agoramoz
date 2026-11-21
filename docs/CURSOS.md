# Cursos AGORAMOZ (D-49)

Cursos escritos **só a partir das fontes que a AGORAMOZ carrega**, com cada afirmação verificada contra essas fontes, descarregáveis em PDF A4 e publicados em `/cursos`.

| Peça | Onde |
| --- | --- |
| Modelo, passagens, verificador, ciclo, pedidos | `lib/cursos/{modelo,fontes,verificar,ciclo,prompts}.ts` |
| Adaptador do motor (ZabaEdu) | `lib/cursos/motor.ts` |
| Criador no admin | `/admin/cursos/novo` (`components/admin/cursos/CriadorCurso.tsx`) |
| Curso guardado, publicar | `/admin/cursos/[id]` |
| Páginas públicas | `/cursos`, `/cursos/[slug]` («o que vai aprender»), `/cursos/[slug]/documento` (PDF) |
| Documento A4 | `components/cursos/DocumentoCurso.tsx` + `curso.module.css` |
| Base | `supabase/migrations/0022_cursos.sql` (`aplicar-0022.sql`, linha 34 do `verificar-estado`) |

## Como funciona

1. **Fontes.** Ficheiros (.docx, .pdf com texto, .txt, .md) lidos no browser, ou texto colado. Cada fonte é partida em passagens de até ~1 200 caracteres, numeradas `F<fonte>.<passagem>`.
2. **Título e tema.** A equipa escreve o **título**, que fica tal e qual no curso (e dá o endereço). A IA escreve o **tema** a partir do título e do índice das fontes: 2 a 4 frases sobre o que o curso trata para cumprir o título, só com o que as fontes cobrem («Gerar o tema com IA», ou automático ao gerar o curso se o campo estiver vazio). O tema pode ser revisto, não é publicado e passa pelo ciclo: um número que não esteja nas fontes é recusado e pedido outra vez.
3. **Plano.** O motor recebe o título (fixo), o tema e o índice das passagens e devolve resultados de aprendizagem, módulos e aulas, cada aula com as passagens que lhe cabem. O pedido manda deixar de fora o que as fontes têm e não serve o título; se o motor devolver outro título, fica o da equipa.
4. **Aulas.** Uma de cada vez, com o título e o tema no pedido, só com as suas passagens: blocos (explicação, exemplo, passos, citação) e perguntas de escolha múltipla, tudo com `fontes`.
5. **Verificação** (`verificar.ts`), em cada peça:
   - as passagens citadas existem e foram dadas àquela aula;
   - uma citação aparece palavra a palavra numa passagem (sem contar acentos, maiúsculas e pontuação);
   - cada número escrito está nas passagens citadas (inteiros 0–10 sem `%` contam como estrutura);
   - ≥ 50 % das palavras-chave (radicais) do texto estão nas passagens citadas (40 % nos resultados).
6. **Ciclo** (`ciclo.ts`): o que falha volta ao motor com a razão exacta, até 3 tentativas; fica a melhor; o que nunca passa é retirado e contado no relatório.
7. **Documento e publicação.** O curso montado descarrega-se em PDF; guardado (0022), publica-se em `/cursos/<endereço>`.

O que a verificação **prova**: que o curso vem das fontes. O que **não prova**: que as fontes estão certas, ou que uma frase com as mesmas palavras não inverteu o sentido. Quem publica revê o documento.

## Ligar o motor (ZabaEdu / Base44)

Precisa do plano Builder no Base44 (funções de backend).

1. **Gerar um segredo** (no seu computador): `openssl rand -hex 24`. É o mesmo valor nos dois lados e nunca vai para o chat nem para o Git.
2. **Base44 → app ZabaEdu → Settings → Secrets**: criar `AGORAMOZ_CHAVE` com o segredo.
3. **Base44 → Code → Functions → nova função `agoramoz_llm`** com exactamente isto:

```ts
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Motor dos cursos AGORAMOZ: confere o segredo partilhado e reencaminha o
// pedido para a IA da app. Não decide nada — o agoramoz.com verifica tudo.
Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const esperado = Deno.env.get('AGORAMOZ_CHAVE');
  if (!esperado || req.headers.get('x-agoramoz-chave') !== esperado) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { prompt, schema } = await req.json();
  if (typeof prompt !== 'string' || !prompt || prompt.length > 200000 || typeof schema !== 'object') {
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }
  const base44 = createClientFromRequest(req);
  const resultado = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
  return Response.json(resultado);
});
```

4. Publicar a função. O endereço fica `https://zaba.base44.app/functions/agoramoz_llm`.
5. **Vercel → projecto agoramoz → Settings → Environment Variables (Production)**:

   | Variável | Valor |
   | --- | --- |
   | `CURSOS_ENGINE` | `zabaedu` |
   | `ZABAEDU_FUNCTION_URL` | `https://zaba.base44.app/functions/agoramoz_llm` |
   | `ZABAEDU_CHAVE` | o segredo do passo 1 |

6. Redeploy. Em `/admin/cursos`, «Motor (ZabaEdu)» passa a «Ligado».
7. Aplicar `supabase/aplicar-0022.sql` no SQL Editor; a linha 34 do `verificar-estado.sql` deve dizer «ok».

Para desligar: `CURSOS_ENGINE=off` e redeploy.

## QA local

```bash
node --experimental-strip-types .qa/cursos-motor-simulado.mjs
```

```bash
CURSOS_ENGINE=zabaedu ZABAEDU_FUNCTION_URL=http://127.0.0.1:4030/functions/agoramoz_llm ZABAEDU_CHAVE=qa-chave-local-com-mais-de-vinte-e-quatro ADMIN_PREVIEW=on pnpm start -p 3111
```

```bash
node .qa/cursos.mjs http://127.0.0.1:3111
```

O motor simulado (`lib/cursos/simulado.ts`) copia frases das passagens e erra de propósito na 1.ª tentativa de cada peça (número inventado, citação adulterada, passagem inexistente, frase sem apoio); o QA confirma que o ciclo apanha e corrige tudo e que nada disso chega ao documento. O comportamento da 0022 foi provado num Postgres 16 por `.qa/cursos-comportamento.sql`.

## Cursos escritos no repositório

Um curso também pode ser escrito em `content/cursos/<nome>/` e publicado sem a base de dados. É o caso do primeiro curso, **IA para Transporte e Logística em Moçambique**:

- **Fontes:** `fontes.ts`, 9 documentos públicos. Cada passagem tem o excerto original e a tradução da AGORAMOZ. O curso é verificado contra a tradução. Um teste confirma que cada número da tradução existe no original.
- **Conteúdo:** `curso.ts`, com 5 módulos, 13 aulas, 13 exercícios, gráficos e esquemas.
- **Montagem:** `lib/cursos/estaticos.ts` passa tudo pelo mesmo verificador e regista quantas rondas de correcção foram precisas. O teste `lib/cursos/curso-ia-transporte.test.ts` exige zero falhas.

`lib/cursos/leitura.ts` junta estes cursos aos da base de dados (0022). Se um curso da base tiver o mesmo endereço, prevalece o do repositório.

### O que o verificador confere a mais (gráficos e exercícios)

- **Gráficos (`grafico`):** cada valor e cada ano nos rótulos têm de estar nas passagens citadas.
- **Esquemas (`esquema`):** desenhados a partir dos passos, com o rótulo «Ilustrativo». Os passos são verificados como texto.
- **Exercícios — dados:** vêm das fontes, e cada número é conferido, ou são «de treino», inventados para praticar, e o exercício di-lo.
- **Exercícios — contas:** cada linha de `contas` (por exemplo, `32,0 - 30,9 = 1,1`) é recalculada. Os termos só podem vir:
  - das fontes;
  - dos dados;
  - de contas anteriores;
  - ou ser 100, para converter em percentagem.

  Os números do enunciado e da solução seguem a mesma regra. Um ano-alvo («prever 2026») é tolerado.

O documento para descarregar fica em `app/(documento)/cursos/[slug]/documento`, fora do layout do site. Dentro do layout, o Chrome acrescentava uma folha em branco no fim do PDF.
