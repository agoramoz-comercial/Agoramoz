# Website Final 2026 (Lote Y)

O documento mestre «AGORAMOZ — Website Completo Final 2026» (v1.0, 11/10/2026,
parecer «APROVAR COM CONDIÇÕES») passou para o site **sem mudar o design**:
mudou o conteúdo, as páginas novas reutilizam templates que já existiam, e não
entrou CSS novo. Decisões em D-38 (`docs/DECISIONS.md`).

## Do documento ao código

| Secções | Onde vive |
|---|---|
| 2–3 Posicionamento, mensagem-mãe, tagline | `content/site.ts` (`SITE`, `PITCH`), `content/i18n/inicio.ts` |
| 5–8 Homepages MZ, PT, BR, Global | `content/countries/{mz,pt,br}.ts`, `app/(en)/en/global/*` |
| 9 Como trabalhamos (6 fases, entregável, decisão) | `PROCESS` e `CLIENT_RESPONSIBILITIES` em `content/site.ts`; `ProcessTimeline` |
| 10 Diagnóstico Operacional Digital | `OFFER` em `content/site.ts`; `OfferSection`; `components/paginas/Diagnostico.tsx` |
| 11–17 Soluções (5 revistas + integração + estabilização/evolução) | `content/solutions/*`, `content/en/solutions/*` |
| 18 Setores | `/setores` (`SETORES_2026`) |
| 19 Sobre | `/sobre` (`SOBRE_2026`) |
| 21 Segurança, privacidade e qualidade | `/seguranca-qualidade` (`SEGURANCA_2026`) |
| 22 FAQ comercial | `/faq` (`FAQ_2026`), com JSON-LD `FAQPage` |
| 23 Formulário | `lib/forms/lead-schema.ts`, `components/form/DiagnosticForm.tsx`, `content/i18n/formulario.ts` |
| 25 CTAs | `CTA_PRIMARY`, `CTA_SECONDARY`, `CTA_PRIMARY_EN` em `content/types.ts` |

Os URLs que já estavam indexados ficaram iguais (`/solucoes/<slug>`); as
soluções novas seguem o mesmo padrão.

## Formulário: «juntar os dois»

O carrossel de 9 cartões e a pontuação ficaram (o CRM e o painel dependem
deles). O cartão do problema passou a ter:
- o título do documento, «Conte-nos onde a operação está bloqueada»;
- as **consequências** (7, escolha múltipla);
- os **sistemas actuais** e a **decisão pretendida** (texto curto, até 300 caracteres);
- o **aviso de segurança**.

O botão diz «Enviar para avaliação» e a confirmação diz «Recebemos o seu pedido.».

Regras dos campos novos:
- são **opcionais e informativos**: não mudam a pontuação nem o tier;
- ficam guardados nas respostas normalizadas e aparecem no admin;
- não entram no rascunho do browser (lista de permissão) nem nos logs;
- `QUESTIONNAIRE_VERSION` passou a `diagnostico-v2`. Como as respostas canónicas
  ganharam campos, a impressão digital de um pedido muda entre versões: um
  rascunho preenchido antes do deploy e enviado depois conta como pedido novo.

## KPIs — critérios internos de teste

Os limiares são **critérios internos de teste, não benchmarks de mercado**
(nota do próprio documento). Nenhum foi medido ainda.

| Hipótese | Métrica | Limiar | Decisão | Fonte no sistema |
|---|---|---|---|---|
| A proposta é compreendida | Resposta correcta em teste de 5 segundos | ≥ 70% | Manter ou simplificar o hero | Fora do sistema: teste com pessoas |
| O CTA gera contexto útil | Pedidos com processo, consequência e papel | ≥ 60% | Manter ou rever o formulário | `responses` (normalizado): `processToImprove`, `problemConsequences` não vazio, `decisionRole` |
| O diagnóstico é comprável | Diagnósticos aceites / propostos | ≥ 20% | Escalar ou rever a oferta | CRM (`deals.stage`), quando as fases forem registadas |
| O piloto reduz risco | Pilotos que avançam com decisão explícita | ≥ 40% | Padronizar ou rever o gate | Gabinete (`gab_projetos.fase`) |
| A evolução tem valor | Clientes que contratam continuidade | ≥ 30% | Investir ou reposicionar | Gabinete (`gab_projetos`, fase `evolucao`) |

**Governance mensal** (do documento):
- rever a qualidade dos leads, a conversão, os motivos de perda e a margem;
- rever as páginas por intenção, não só por tráfego;
- eliminar os claims sem prova;
- actualizar os casos e os perfis;
- priorizar os testes;
- aprovar as alterações por um owner definido.

## Checklist de publicação — estado

| Ponto | Estado |
|---|---|
| A mensagem começa pelo cliente e pelo problema | Feito |
| O posicionamento distingue de uma agência de websites | Feito |
| Oferta, delivery e valor ligados | Feito (`/como-trabalhamos`, `/diagnostico`) |
| O diagnóstico é comprável e independente | Feito no texto; o preço e as modalidades são decisão comercial do fundador |
| Claims com prova ou removidos | Feito; revisto pelo `marketing-agent` e por `.qa/website-2026.mjs` |
| Casos e logótipos com autorização | Não há casos publicados (D-38) |
| Privacidade e contratos revistos por mercado | **Pendente**: revisão jurídica. O site não declara conformidade |
| Formulários sem dados desnecessários | Feito; os campos novos são opcionais |
| CTAs correspondem à intenção | Feito |
| Páginas setoriais completas | Só energia-mineração tem página; os outros setores passam pelo diagnóstico (D-38) |
| Responsabilidades pós-go-live definidas | Feito no texto (`CLIENT_RESPONSIBILITIES`) |
| A equipa comercial consegue usar a mensagem | **Pendente**: validação do fundador |
| Analytics mede métricas económicas | Parcial: funil e leads sim; aceites, pilotos e continuidade dependem de registo no CRM e no Gabinete |
| Rollback e owner do lançamento | Rollback por deploy anterior na Vercel; o owner é o fundador |
| Nenhuma página vazia ou «em preparação» | Feito; verificado por `.qa/website-2026.mjs` e por teste |

## Verificação

- `pnpm -s vitest run`, `pnpm -s tsc --noEmit -p .`, `pnpm lint`, `pnpm build`.
- `BASE=… node .qa/website-2026.mjs`: todas as URLs do sitemap. Confirma 200, um H1, o
  CTA principal, nenhum «em preparação» e nenhuma ligação interna em 404. Lista
  os termos bloqueados com contexto.
- `BASE=… node .qa/diagnostico.mjs` (390/768/1440, axe no cartão novo) e
  `BASE=… node .qa/confirmacao.mjs` (PT e `IDIOMA=en`).

## Revisões ECC (Lote Y) e excepções conhecidas

Correram quatro revisões: código, acessibilidade, claims e SEO. As correcções
estão nos commits Y7b a Y7f. Ficou fora, de propósito:

| Achado | Porquê fica | Quem decide |
|---|---|---|
| Contorno dos campos de formulário com contraste 1,3:1 (WCAG 1.4.11) | Corrigir muda o token visual `--border`, e o pedido foi não mudar o design | Fundador (design) |
| Dica do chip marcado a 80% de opacidade (≈3,4:1) e rótulos de 11 px | Mesma razão | Fundador (design) |
| Animações de entrada com `visibility:hidden` até ao scroll | Mexe no sistema de movimento de todo o site; pede um lote próprio, testado com leitor de ecrã | Próximo lote de acessibilidade |
| Camada partilhada em PT-PT vista pelo mercado BR (equipa/equipe, ficheiro/arquivo) | Exige uma variante `pt-BR` das soluções, do formulário e do FAQ; só `/br` está localizado | Fundador (prioridade do mercado BR) |
| Telefone, email, redes e cargos não constam do documento mestre | Já estavam publicados; confirmar autorização | Fundador |
| Privacidade: responsável pelo tratamento (firma e NUIT) e menção ao Moz News | Texto legal; não se inventa | Revisão jurídica |
| `questionnaire_versions` continua na versão 1 na base | Só auditoria; corrigir pede uma migração nova aplicada pelo fundador | Fundador |
