/**
 * Um payload SINTÉTICO com a forma exacta que o motor `analyze-news` do
 * Lovable devolve — os nomes dos campos foram lidos no bundle público da
 * página `agoramoz.lovable.app/news`, os valores foram escritos aqui.
 *
 * Serve os testes e o motor simulado de QA (`.qa/news-motor-simulado.mjs`).
 * Não é notícia, não é análise real, e nunca é mostrado a um visitante como
 * se fosse.
 */
export const EXEMPLO_LOVABLE = {
  analysis: {
    headline: {
      title: 'Exemplo sintético: nova tarifa portuária no corredor de Maputo',
      source: 'Fonte de exemplo',
      timestamp: '2026-09-30',
      region_tag: 'Moçambique',
    },
    priority_level: 'high',
    sector_tags: ['Logística', 'Retalho', 'Energia'],
    executive_summary: [
      'A tarifa sobe o custo de importação no corredor.',
      'Retalhistas com stock importado sentem a pressão primeiro.',
      'Há espaço para quem optimizar rotas e armazenagem.',
    ],
    core_interpretation: {
      what_is_happening: 'Uma alteração tarifária no porto muda o custo por contentor.',
      why_it_matters: 'O custo passa para o preço final em poucas semanas.',
      hidden_signals: ['Pressão sobre a margem de distribuidores', 'Possível desvio de carga para outros portos'],
    },
    impact_matrix: {
      economic: { direction: 'down', explanation: 'Mais custo de importação.' },
      financial: { direction: 'down', explanation: 'Margens comprimidas no curto prazo.' },
      governmental: { direction: 'up', explanation: 'Mais receita fiscal portuária.' },
      business: { direction: 'neutral', explanation: 'Efeito depende da exposição à importação.' },
      social: { direction: 'down', explanation: 'Preços ao consumidor sobem.' },
    },
    risks: [
      { title: 'Subida de preços', description: 'Repasse ao consumidor.', severity: 'high' },
      { title: 'Ruptura de stock', description: 'Encomendas adiadas.', severity: 'medium' },
      { title: 'Desvio de carga', description: 'Operadores mudam de porto.', severity: 'critical' },
    ],
    opportunities: [
      { title: 'Optimização de rotas', description: 'Consolidar cargas.', actionability: 'Imediata' },
      { title: 'Armazenagem local', description: 'Stock tampão perto do cliente.', actionability: 'Médio prazo' },
    ],
    forward_outlook: {
      short_term: 'Preços sobem nas categorias importadas.',
      mid_term: 'O mercado ajusta rotas e fornecedores.',
      most_likely_scenario: 'Repasse parcial com consolidação de cargas.',
    },
    recommendations: {
      immediate_actions: ['Rever o custo por contentor nas próximas encomendas'],
      monitor_closely: ['Anúncios do operador portuário'],
      strategic_adjustments: ['Diversificar fornecedores regionais'],
    },
    signal_chains: [
      { chain: 'Tarifa ↑ → Custo ↑ → Preço ↑ → Procura ↓', impact: 'risk' },
      { chain: 'Custo ↑ → Consolidação → Eficiência ↑', impact: 'growth' },
    ],
    macro_analysis: {
      macroeconomic: 'Pressão inflacionista importada.',
      mesoeconomic: 'Logística e retalho mais expostos.',
      microeconomic: 'Empresas com stock importado perdem margem.',
    },
    growth_strategies: {
      red_ocean: 'Competir no preço absorvendo o custo.',
      blue_ocean: 'Serviço de consolidação partilhada entre retalhistas.',
      historical_parallels: 'Ajustes tarifários anteriores levaram a consolidação de cargas.',
    },
    ultra_questions: [
      {
        industry: 'Logística',
        question: 'Que parte do custo por contentor é negociável?',
        strategic_insight: 'Contratos de volume reduzem a exposição.',
      },
    ],
    chart_data: {
      impact_scores: [
        { dimension: 'Económico', score: -45 },
        { dimension: 'Financeiro', score: -30 },
        { dimension: 'Governamental', score: 25 },
        { dimension: 'Empresarial', score: 0 },
        { dimension: 'Social', score: -35 },
      ],
      risk_distribution: [
        { name: 'critical', value: 1 },
        { name: 'high', value: 1 },
        { name: 'medium', value: 1 },
      ],
    },
  },
} as const;
