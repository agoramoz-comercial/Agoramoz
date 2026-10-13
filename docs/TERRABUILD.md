# TerraBuild — demonstração em `/projetos` (D-41)

Demonstração da ideia «AGORAMOZ TerraBuild» descrita pelo fundador
(documento de conceito de 12/10/2026): terra, arquitectura, agricultura,
engenharia, capital e execução verificável num único gémeo digital.

**É uma demonstração com dados fictícios.** Não há terreno real, cliente,
orçamento, oferta de investimento nem pagamento. O que a pessoa escreve ou
escolhe não sai do browser; só a analítica anónima de primeira parte conta
que partes são usadas (`project_demo_interaction` com `projectId` e `action`,
sem texto nem valores; como todo o evento do site, leva também o caminho e o
canal de origem saneados). As páginas têm `noindex` e estão fora do sitemap.

Decisões do fundador (AskUserQuestion, 12/10/2026): motor 3D próprio com
Three.js; entrada no menu com selo «Demo»; demonstração completa; assistente
com respostas guiadas locais (sem modelo de IA).

## Ecrãs

| Ecrã | Caminho | O que mostra |
|---|---|---|
| **Hub** | `/projetos` | Mapa de Moçambique por província, filtros (província, sector, estado, capital), três cartões fictícios (só a 001 tem gémeo), «Submeter um terreno» simulado |
| **Fazenda Inteligente 001** | `/projetos/fazenda-inteligente-001` | As secções abaixo, com um só estado partilhado |

Secções da ficha (âncoras):

| # | Âncora | Conteúdo |
|---|---|---|
| 01 | `#gemeo` (`#gemeo-3d` abre o 3D) | Planta 2D em SVG; vista 3D a pedido; base (satélite simulado, mapa, terreno); 6 camadas; linha temporal de 10 fases; lista de elementos |
| 02 | `#construtor` | Medidas, materiais e implantação da casa; quantidades com fórmula; custo por classe de estimativa com faixa; interferências; explicação da variação; alternativa A |
| 03 | `#agricultura` | Cultura e área; produção, receita, custos, margem, preço de equilíbrio, água e risco climático; três cenários de mercado |
| 04 | `#cenarios` | Cenários A/B/C (essencial, recomendado, avançado) lado a lado |
| 05 | `#marcos` | 10 componentes financiáveis com orçamento, responsável, evidências e versões; simulação do percurso do dinheiro em 8 passos |
| 06 | `#acesso` | Camadas pública, investidor registado e técnica (separadores ARIA) |
| 07 | `#assistente` | Perguntas sugeridas e campo livre; respostas locais com os números da página |
| 08 | `#riscos` | Selo de maturidade (conceito → em validação → aprovado → as built) e os 5 riscos do documento com a resposta |

## Código

- **Dados fictícios:** `content/projetos/`
  - `fazenda-inteligente-001.ts`: fases, 28 elementos, 10 componentes, 5 culturas, 3 cenários;
  - `portfolio.ts`: os três cartões;
  - `mapa-mz.ts`: províncias, gerado por `.qa/gerar-mapa-mz.mjs` a partir do Natural Earth admin-1 10m (domínio público);
  - `tipos.ts`.
- **Motores puros** (`lib/terrabuild/`, testados em `terrabuild.test.ts`):

  | Ficheiro | Responsabilidade |
  |---|---|
  | `quantidades.ts` | `quantidades(casa)`: cimento, areia, brita, aço, alvenaria, cobertura, pavimento, tinta, portas, janelas, cabos, tubagem, mão-de-obra; cada linha com a fórmula escrita |
  | `custos.ts` | `orcamento(casa, classe)`: base de preços fictícia `demo-2026-10` (MZN sem IVA), transporte 6 %, contingência e faixa por classe |
  | `variacao.ts` | `compararVersoes(a, b, classe)`: delta, percentagem, os 3 maiores factores e uma frase |
  | `interferencia.ts` | Sobreposição (SAT), afastamento de 3 m, margem de 5 m ao limite, área futura |
  | `terreno.ts` | Relevo por ruído determinístico (semente), linha de drenagem, curvas de nível (marching squares), cota de cheia |
  | `obra.ts` | Estado de cada elemento por fase, capital, progresso ponderado pelo orçamento |
  | `agro.ts`, `cenarios.ts` | Produção, receita, custos, água (furo de 160 m³/dia, 300 dias de bombagem; cobertura por cenário), energia (1600 kWh/kWp/ano) e CO₂ evitado (0,7 kg/kWh de gasóleo) — todos parâmetros de demonstração. A classe da estimativa escolhida no construtor chega ao custo da casa no terreno e aos cenários |
  | `marcos.ts` | Máquina de estados da simulação de desembolso |
  | `assistente.ts` | Classificador por palavras e respostas com os números do estado actual |
  | `sol.ts` | Posição do sol para as sombras do 3D (latitude −19°) |

- **Interface** (`components/projetos/`):
  - `estado.tsx`: `GemeoProvider`, um redutor em memória;
  - `Visualizador`, `Planta2D` e `Cena3D`;
  - `Construtor`, `PainelAgricola`, `Cenarios`, `Marcos`, `CamadasAcesso`, `Assistente`;
  - `Portfolio` e `SubmeterTerreno`;
  - `rastreio.ts`: um evento por acção por visita.

### Classes de estimativa

| Classe | Faixa | Contingência |
|---|---|---|
| Conceptual | −30 % / +50 % | 15 % |
| Preliminar | −20 % / +30 % | 12 % |
| Em validação | −15 % / +20 % | 10 % |
| Aprovado | −10 % / +15 % | 7 % |
| Contratual | −5 % / +10 % | 5 % |

**Natureza destes valores:** são critérios de demonstração. Não são uma norma nem uma cotação. Na versão real, a base de preços e as classes são definidas e aprovadas por um medidor-orçamentista ou engenheiro qualificado.

## Escolhas técnicas e open source

- **three 0.186.1, @react-three/fiber 9.8.1, @react-three/drei 10.7.9** (licença MIT):
  - versões exactas fixadas;
  - do drei usam-se só `OrbitControls`, `Line` e `Html`, porque `Environment`, `Text` e os loaders vão buscar ficheiros a CDNs que a CSP do site bloqueia.
- **Carregamento:** o 3D entra por `next/dynamic` com `ssr: false`, só ao clicar em «Vista 3D» ou com `#gemeo-3d`. O chunk tem cerca de 257 KB gzip e nada disto está no carregamento inicial.
- **Desempenho:** `frameloop="demand"`, `dpr [1, 1.5]`.
- **Recurso 2D:** sem WebGL, ou se o contexto se perder, a vista volta à planta 2D, que tem a mesma informação.
- **Porque não Cesium, Google Photorealistic 3D Tiles ou Mapbox na demo:**
  - pedem chaves e são pagos por utilização;
  - abririam a CSP a terceiros;
  - não há terreno real para mostrar.
  - Ficam para a versão real (abaixo).
- **Cores das camadas:** água `#3987e5`, eléctrica `#d95926`, talhões `#199e70`.
  - Excepção à regra monocromática, registada em D-41.
  - Validadas para daltonismo com o validador do skill dataviz.
  - O risco de cheia é textura e as obras em curso são contorno tracejado, nunca só cor.
- **Coordenadas:** grelha local em metros (x para este, y para norte), nunca latitude/longitude. No mapa, o pino fica no centro da província: a regra da camada pública é «localização aproximada».

## Versão real — arquitectura proposta (do documento do fundador, a validar)

Cada fornecedor está **a validar**: licença, custo, cobertura em Moçambique e termos de utilização.

| Camada | Proposta |
|---|---|
| Visualização | Next.js (já existe); CesiumJS para o globo e 3D Tiles; modo de baixo consumo de dados |
| Geoespacial | PostGIS; GeoServer; Google Map Tiles / Photorealistic 3D Tiles onde houver cobertura; levantamento próprio com drone (fotogrametria, ex. OpenDroneMap); modelos de elevação |
| BIM | IFC como formato neutro (ex. That Open Engine / web-ifc para ver IFC no browser); versionamento de modelos; biblioteca local de elementos |
| Agricultura | Dados de satélite e clima (ex. Google Earth Engine, «quando economicamente justificado», segundo o documento) |
| Pagamentos | Só através de instituição de pagamento autorizada; M-Pesa, e-Mola e mKesh por agregador autorizado; KYC/AML antes de captar fundos; instrumento jurídico definido antes de chamar «investimento» a uma transacção |
| Dados e segurança | Perfis e permissões, RLS, auditoria, separação pública/investidor/técnica, consentimento do proprietário, protecção da localização exacta, registo de tudo o que a IA altera |

### Gates (do documento do fundador)
| Gate | Nome | Critério de passagem |
|---|---|---|
| G0 | Oportunidade | Problema real e utilizadores dispostos a testar. **Esta demonstração serve o G0** |
| G1 | Discovery | Terreno, titularidade ou autorização, dados mínimos e enquadramento jurídico dos pagamentos confirmados |
| G2 | Solução e business case | Arquitectura, protótipo UX, TCO, receitas, política de risco |
| G3 | Mobilização | Contratos, equipa, contas cloud, chaves, protecção de dados, RACI |
| G4 | Design | Modelo 3D, modelo agrícola, base de preços, regras de quantidades, critérios de aceitação |
| G5 | Implementação | Portal, visualizador, simulador, orçamento, pagamentos em sandbox, testes |
| G6 | Estabilização | Monitorização, incidentes, formação, controlo de custos de cloud e APIs |
| G7 | Benefícios | Adopção, projectos, investidores, capital, precisão das estimativas |

### Investimento indicativo da plataforma (estimativa do documento do fundador)

O documento usa a taxa de referência de 63,91 MZN/USD (Banco de Moçambique, 12/10/2026) e declara confiança baixa a média.

| Opção | Faixa (MZN) | Âmbito |
|---|---|---|
| Mínima: demonstração visual funcional | 2,6–5,1 M | Página de projectos, um projecto demo, mapa 2D/3D, orçamento demonstrativo, painel sem fundos reais |
| Recomendada: produto piloto | 7,7–16,0 M | Configurador 3D limitado, BIM, quantidades dinâmicas, base de preços, cenários agrícolas, contas, pagamentos em sandbox ou produção controlada |
| Ambiciosa: plataforma comercial | 19,2–44,7 M | Motor paramétrico, IA multimodal, drones, IoT, contratação digital, financiamento por marcos, múltiplos projectos |

- **Exclusões:** os valores não incluem a obra física nem os custos recorrentes (cloud, mapas, IA, armazenamento, drones, licenças).
- **Onde está esta demonstração:** cobre o âmbito da opção mínima, sem terreno nem modelo profissional reais.

### Receitas, riscos e KPIs

- **Receitas:** estão no documento do fundador, secção 11 (preparação, tecnologia, verificação, gestão e operação; comissão de pagamentos só no enquadramento legal permitido).
- **Riscos:** os cinco do documento aparecem na própria página, em `#riscos`.
- **KPIs:** produto, engenharia, investimento, agricultura e impacto, no documento, secção 13.
- **O que a demo já mede:** `project_demo_interaction` dá o equivalente de «abre o modo 3D» (`3d_open`), do uso do configurador, dos cenários, da simulação de marcos, do assistente e de «submeter terreno».

## QA

- **Testes unitários:** `pnpm vitest run lib/terrabuild`.
- **QA de browser:** `pnpm start -p 3100` e depois `BASE=http://127.0.0.1:3100 node .qa/terrabuild.mjs`.
  - Corre a 390, 768 e 1440 px, sem WebGL e na navegação.
  - Verifica:
    - um só H1, o selo, `noindex` e os termos bloqueados;
    - axe, scroll lateral, consola e pedidos externos;
    - filtros, camadas e linha temporal;
    - construtor: 90 → 110 m² e interferência a N=155;
    - cenários e marcos;
    - separadores e assistente;
    - a submissão simulada: só o evento anónimo sai;
    - o 3D a pedido e o recurso à planta 2D.
- **CSP:** `.qa/csp.mjs` inclui as duas rotas.

## Para passar a real
1. **G1:**
   - um terreno real com autorização do proprietário;
   - a cobertura cartográfica validada, ou um voo de drone;
   - o parecer jurídico sobre o instrumento financeiro e a instituição de pagamento.
2. **Substituir os dados fictícios:**
   - base de preços aprovada por profissional;
   - modelo IFC da casa e das infraestruturas;
   - culturas com dados agronómicos locais.
3. **Só depois:** contas, camada de investidor com KYC e pagamentos em sandbox.
