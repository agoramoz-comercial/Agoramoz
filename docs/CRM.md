# CRM operacional (Lote AA)

O admin passou de um back-office de formulários a uma consola de trabalho:
primeiro a acção (o que tenho de fazer agora), depois a análise, com cada número
a levar à lista que o explica. As decisões estão em D-40 (`docs/DECISIONS.md`).

## Ecrãs

| Ecrã | Caminho | Para quê |
|---|---|---|
| **Hoje** | `/admin` | A fila de cada pessoa por urgência: atrasadas, hoje, esta semana e paradas. Da equipa: sem dono (em triagem), diagnósticos por rever e reuniões dos próximos 7 dias |
| **Painel** | `/admin/painel` | Análise do período (7, 30 ou 90 dias). As barras de fase e o bloco «Por responsável» levam ao pipeline filtrado |
| **Pipeline** | `/admin/oportunidades` | Vistas (Abertas, As minhas, Atrasadas, Sem dono, Paradas, Todas), lista ordenável, quadro por fase, filtros por fase, canal, campanha e `dono`, e exportação CSV |
| **Oportunidade** | `/admin/oportunidades/[id]` | Próximo passo em destaque; propriedades editáveis uma a uma; compositor de actividade; cronologia em frases; histórico de alterações; ligações ao contacto, à organização, ao diagnóstico e às reuniões |
| **Contacto 360 / Organização 360** | `/admin/contactos/[id]`, `/admin/organizacoes/[id]` | Resumo, oportunidades com dono e próximo passo, estado do consentimento (só no contacto) e uma linha temporal unificada |
| **Auditoria** | `/admin/auditoria` (só admin) | Quem, o quê, quando e o que mudou, com filtros por objecto, pessoa e período |
| **Pesquisa** | `⌘K` / `Ctrl K` / `/`, ou `/admin/pesquisa?q=` | Contactos, organizações, oportunidades e comandos |

## Atalhos
- `g h` Hoje · `g d` Painel · `g p` Pipeline · `g r` Diagnósticos por rever · `g c` Contactos · `g o` Organizações.
- `j`/`k` descem e sobem nas listas; Enter abre.
- `?` mostra a ajuda, onde os atalhos de uma tecla **se desligam** (WCAG 2.1.4).
- `⌘K`/`Ctrl K` funciona sempre.

## Regras de negócio (decididas pelo fundador)
- **Valor:** cada oportunidade tem valor e moeda (MZN, EUR, BRL ou USD). Não há câmbio: somas e ordenação por moeda.
- **Sem probabilidade e sem previsão ponderada.**
- **Perder exige motivo:** preço, timing, concorrente, sem orçamento, sem decisor, não qualificado ou outro (este com nota). Só `marcar_perdida` põe uma oportunidade em «perdido».
- **Dono manual,** com «Atribuir a mim». Os leads entram sem dono e aparecem em «Sem dono» no Hoje.
- **Diagnóstico → oportunidade, automático:** aprovar passa-a a `qualificacao`; rejeitar passa-a a `perdido` (`nao_qualificado`). Só se ela estiver em `novo`.
- **Parada** = aberta e sem actividade há mais de 14 dias (`PARADA_DIAS` em `lib/crm/modelo.ts`, o mesmo critério do CEnO).
- **Datas:** dias civis de Maputo (UTC+2 todo o ano).

## Dados e código
- **Migração `0019_crm_operacional`** (aplicada pelo fundador em três partes):
  - colunas novas em `deals`, com CHECK;
  - o gatilho `fase_desde`;
  - a vista `crm_oportunidades` (`security_invoker`);
  - as funções `definir_proxima_accao`, `guardar_oportunidade_crm`, `marcar_perdida`, `pesquisar_global` (security invoker) e `registar_exportacao_crm`;
  - redefinições, com a mesma assinatura, de `mudar_fase_oportunidade`, `registar_actividade`, `aprovar/rejeitar_diagnostico`, `registar_reuniao` e `atribuir_oportunidade`.
  - Tudo escreve no `audit_log`. A linha 31 de `supabase/verificar-estado.sql` diz «ok».
- **Lógica pura e testada** em `lib/crm/*`: `modelo`, `pipeline`, `hoje`, `cronologia`, `ficha360`, `responsaveis`, `csv`, `pesquisa-modelo`, `formularios`. A auditoria legível está em `lib/admin/auditoria.ts`, e os comandos e atalhos em `lib/admin/comandos.ts`.
- **Leituras** pela sessão (RLS) em `lib/crm/leitura.ts` e `leitura360.ts`. **Escritas** só por Server Actions (`lib/admin/crm-actions.ts`), validadas com zod, a chamar RPCs com `exigir_papel`.
- **Sem a 0019:** `crmOperacional()` devolve `false` e os ecrãs mostram «por activar», com o passo que falta. O resto funciona (dono, sem dono, por rever, pesquisa por nome e email). Nunca há zeros inventados.

## Exportação CSV
- Pipeline (a vista do ecrã) e contactos (a procura do ecrã).
- Só para admin e comercial, a partir do próprio admin (`Sec-Fetch-Site`), no máximo 1 a cada 10 s e 20 por hora por pessoa.
- Separador `;`, BOM, e células protegidas contra fórmulas.
- **Fica registada na auditoria antes de sair.** Se o registo falhar, o ficheiro não sai.
- A auditoria é **de detecção**, não de prevenção: a equipa lê as mesmas tabelas pela RLS por outras vias. Impedir isso é uma decisão de RLS.

## QA
- **Pré-visualização** com dados de exemplo em `/qa/crm?ecra=…` (`pipeline`, `ficha`, `perdida`, `por-activar`, `hoje`, `hoje-vazio`, `hoje-por-activar`, `contacto`, `organizacao`, `auditoria`, `responsaveis`). Só existe com `ADMIN_PREVIEW=on` e fora da Vercel.
- **`BASE=… node .qa/crm-admin.mjs`:** 390, 768 e 1440 px, axe, teclado (paleta, `g p`, `j`, `?`, desligar atalhos), contagens, ordenação, drill-downs e ausência de scroll horizontal.
- **`.qa/crm-comportamento.sql`:** 16 cenários num Postgres 16 local, com a 0019 aplicada duas vezes.

## Revisões ECC
Acessibilidade (paleta), segurança (exportações, auditoria, fichas), código e React. As correcções estão nos commits AA5b, AA6b e AA7b.

## Excepções conhecidas

| Ponto | Porquê | Quem decide |
|---|---|---|
| O papel `leitura` lê contactos e oportunidades pela RLS | A auditoria só regista as exportações feitas pelo admin | Fundador (RLS) |
| O drill-down do painel não filtra por período | O pipeline mostra o estado actual; filtrar por datas pede uma vista própria | Próximo lote |
| O bloco «Por responsável» lê até 500 oportunidades | Equipa pequena; acima disso, o ecrã avisa | Revisitar com volume |
