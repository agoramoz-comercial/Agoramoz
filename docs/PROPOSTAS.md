# Propostas — operação

`/admin/propostas` cria propostas comerciais no estilo editorial A4 da
AGORAMOZ (a skill «agoramoz-editorial-proposal»), a partir de um texto colado
ou campo a campo, e descarrega-as em PDF. Decisões: D-44 e D-45.

## Estado

| Peça | Estado |
|---|---|
| Editor + folhas A4 + PDF pelo browser | Feito (D-44) |
| Colar o texto de uma proposta → desenho editorial (`lib/propostas/texto.ts`) | Feito, 39 testes |
| Guardar na base, com versões, ligadas ao Pipeline (migração 0020) | **Por aplicar pelo fundador** — ver abaixo |

Até a 0020 ser aplicada, a página mostra o editor a funcionar só no separador
(com «Exportar rascunho» em `.json`) e diz o passo que falta. Nada é simulado.

## Activar o guardar (fundador, SQL Editor)

1. Abrir `supabase/aplicar-0020.sql` no GitHub → «Copy raw file».
2. Supabase → SQL Editor → consulta nova e vazia → colar → Run. Esperado: «Success».
3. Correr `supabase/verificar-estado.sql`: a **linha 32** tem de dizer `ok`.

É repetível: pode correr as vezes que quiser. Pressupõe a 0019 (linha 31 em `ok`).

A 0020 foi provada num Postgres 16 limpo, com 0001–0020 aplicadas por ordem
e `.qa/propostas-comportamento.sql` (8 blocos: versões, total calculado na
base, revisão, conteúdo inválido, estados, sem escrita directa, `leitura` só
lê, `anon` sem nada). A linha 32 foi provada nas três respostas (em falta,
protecção mexida, ok).

## Como funciona

- **Guardar** grava sempre uma versão nova e imutável (`propostas_versoes`):
  o conteúdo, o texto colado de onde veio (se veio) e uma nota. Gravar sem
  mudanças não cria versão. Abrir uma versão antiga e guardar repõe-na como
  versão nova.
- **O total é calculado na base** a partir das fases; o que a lista e o
  Pipeline mostram não depende da aplicação.
- **Estados**: rascunho → enviada → aceite / recusada; arquivada a qualquer
  altura; «voltar a rascunho» reabre. Aceite, recusada ou arquivada não
  aceitam versões novas.
- **Ligada a uma oportunidade**, cada versão e cada mudança de estado ficam
  na cronologia da oportunidade («Proposta guardada (versão 2)»).
- **Quem**: toda a equipa lê; `admin` e `comercial` gravam; `leitura` só lê.
- **Auditoria** (`audit_log`, `entity_type = 'proposta'`): id, versão, total,
  moeda e estado — nunca o texto da proposta.
- **PDF**: «Descarregar PDF» abre o diálogo de impressão do browser; em
  «Destino», «Guardar como PDF». A4, uma folha por página. O custo e a margem
  de cada fase nunca vão para o papel.

## Colar o texto

O leitor é **determinístico, sem IA**: não reescreve nada, só arruma o texto
colado nas secções do desenho, e diz o que reconheceu, o que cortou e o que
não soube onde pôr (fica listado para copiar à mão). Um teste confirma que
cada palavra das folhas veio do texto colado.

Reconhece, com ou sem numeração, `#` ou negrito:

| Secção | Títulos (sem acentos nem maiúsculas) |
|---|---|
| Capa | linhas `Cliente:`, `Projecto:`, `Título:`, `Para:`, `Assunto:`, `Data:`, `Validade: N dias`, `Moeda:`, `Preparada por:` antes da primeira secção; a primeira linha curta («Proposta comercial — X») dá o título |
| Carta | Carta, Apresentação, Introdução, Sumário executivo… (o fecho «Com os melhores cumprimentos» e a assinatura são os do modelo) |
| Decisão recomendada | Decisão recomendada, Recomendação |
| Contexto | Contexto, Enquadramento, Situação actual, Desafio(s), Problema, Diagnóstico… |
| Objectivos | Objectivos, Metas, Resultados esperados, Benefícios |
| Solução | Solução (proposta), Abordagem, Metodologia, Âmbito, Escopo, Serviços, Módulos, Entregáveis |
| Fases e investimento | Fases, Plano (de trabalho), Cronograma, Etapas, Investimento, Orçamento, Preços, Proposta financeira… — em tabela (Word/Excel com tabulações, ou Markdown com `|`) ou em linhas «Fase — 2–3 semanas — 285 000 MZN» |
| Opções | Opções, Alternativas, Pacotes, Planos, Cenários — «(recomendada)» marca a recomendada |
| Condições comerciais | Condições (comerciais, de pagamento), Termos, Pagamento, Pressupostos, Exclusões |
| Riscos | Riscos (e mitigação) — «Risco. Mitigação: …» ou tabela |
| Próximos passos | Próximos passos, Passos seguintes, Como avançar |
| Contactos | ignorados: as folhas usam sempre comercial@agoramoz.com e +258 82 478 0097 |

- **Valores**: com moeda (MZN, MT, meticais, USD, EUR, €) ou com «mil» /
  «milhões»; `1 735 000`, `1.735.000,00`. Um número solto não é dinheiro.
- **Durações**: semanas; meses (1 mês = 4 semanas) e dias (5 úteis = 1
  semana) são convertidos e a conversão é dita.
- **Total escrito**: se o texto disser um total que não bate com a soma das
  fases, o relatório diz os dois valores; as folhas usam a soma.
- **Limites** (o que cabe numa página A4): o excesso de itens fica listado,
  o texto longo é cortado numa palavra, e ambos são ditos.

## Código

| Peça | Ficheiro |
|---|---|
| Modelo, contas, verificações | `lib/propostas/modelo.ts` |
| Leitor do texto colado | `lib/propostas/texto.ts` |
| Leituras (lista, versões, oportunidades) | `lib/propostas/leitura.ts` |
| Acções (guardar, estado) | `lib/admin/propostas-actions.ts` |
| Migração e ficheiro de aplicar | `supabase/migrations/0020_propostas.sql`, `supabase/aplicar-0020.sql` |
| Ecrãs | `app/admin/(painel)/propostas/**`, `components/admin/propostas/**` |
| QA | `.qa/propostas.mjs` (browser, `ADMIN_PREVIEW=on`), `.qa/propostas-comportamento.sql` (Postgres) |
