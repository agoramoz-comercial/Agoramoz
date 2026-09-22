import { DEMO_DISCLAIMER, type SectorPage } from '../../types';

/**
 * A primeira landing setorial, conforme a recomendação explícita do documento
 * estratégico para as primeiras 24 horas: energia e serviços industriais em
 * Moçambique. É também o setor com adequação à atividade da Co-founder.
 */
export const mzEnergiaMineracao: SectorPage = {
  country: 'mz',
  sector: 'energia-mineracao',
  label: 'Energia, mineração e serviços industriais',

  formula: {
    audience: 'empresas de energia, mineração e serviços industriais',
    result: 'qualificar fornecedores, organizar documentação e acompanhar oportunidades sem perder prazos',
    mechanism: 'uma infraestrutura digital integrada de portal, CRM e automação documental',
    obstacle: 'substituir os sistemas e procedimentos que já estão aprovados',
  },

  hero: {
    headline: 'Qualifique fornecedores e organize documentação sem voltar a perder um prazo.',
    lead: 'Neste setor, o custo de um documento em falta não é administrativo. É uma pré-qualificação perdida, uma paragem em obra ou uma não-conformidade num processo de procurement.',
  },

  problems: [
    {
      title: 'Qualificação de fornecedores em papel e email',
      body: 'Certificados, seguros, alvarás e declarações chegam por email, ficam em pastas partilhadas e expiram sem que ninguém seja avisado. A verificação é refeita do zero a cada concurso.',
    },
    {
      title: 'Documentação de projeto dispersa',
      body: 'Desenhos, relatórios, atas e aprovações vivem em locais diferentes por equipa. Encontrar a versão aprovada demora mais do que produzir uma nova.',
    },
    {
      title: 'Oportunidades acompanhadas de memória',
      body: 'Concursos, consultas de mercado e conversas com operadores dependem de quem se lembra de fazer o seguimento. Não existe um registo único do estado de cada oportunidade.',
    },
    {
      title: 'Procurement sem rasto auditável',
      body: 'Pedidos de cotação, comparações e adjudicações passam por email. Reconstituir a decisão meses depois, para auditoria, é um trabalho manual de dias.',
    },
    {
      title: 'Reporting operacional feito à mão',
      body: 'O relatório mensal para a direção ou para o parceiro é montado manualmente a partir de várias folhas. Quando fica pronto, os dados já envelheceram.',
    },
  ],

  costOfInaction: {
    intro:
      'Não vamos apresentar uma estimativa em meticais sem conhecer os seus volumes — seria inventar um número. Estas são as formas em que o custo aparece, e o diagnóstico quantifica-as com os seus dados:',
    items: [
      'Horas de equipa técnica qualificada gastas a procurar e reconstituir documentos',
      'Pré-qualificações falhadas por documento expirado ou em falta',
      'Oportunidades que avançam sem seguimento porque ninguém era o responsável',
      'Retrabalho causado por decisões tomadas sobre a versão errada de um documento',
      'Tempo de preparação de auditorias e de resposta a pedidos de conformidade',
    ],
    caveat:
      'Estes efeitos são observáveis e mensuráveis na sua operação. Não são uma promessa de poupança — são o que o diagnóstico vai medir.',
  },

  system: {
    name: 'AGORA Industrial Growth Infrastructure',
    promise:
      'Um sistema único para fornecedores, documentos, oportunidades e reporting — construído sobre os procedimentos que a sua empresa já tem aprovados.',
    steps: [
      {
        title: 'Registo único de fornecedores',
        body: 'Cada fornecedor tem um perfil com documentos, validades e estado de qualificação. As validades são verificadas automaticamente e avisam antes de expirar, não depois.',
      },
      {
        title: 'Documentação com versão e aprovação',
        body: 'Cada documento tem dono, versão e estado. Quem consulta vê sempre a versão em vigor; o histórico fica disponível para auditoria.',
      },
      {
        title: 'Pipeline de oportunidades',
        body: 'Concursos e consultas ficam registados com prazo, responsável e próximo passo. O que está parado é visível antes do prazo terminar.',
      },
      {
        title: 'Procurement com rasto',
        body: 'Pedidos de cotação, respostas e comparações passam pelo sistema. A decisão fica documentada no momento em que é tomada.',
      },
      {
        title: 'Reporting gerado, não montado',
        body: 'Os indicadores que a direção e os parceiros pedem são produzidos a partir dos dados operacionais, na data em que são pedidos.',
      },
    ],
  },

  components: [
    { title: 'Portal de fornecedores', body: 'Área onde o fornecedor submete e mantém a sua própria documentação, reduzindo o trabalho de cobrança da sua equipa.' },
    { title: 'Gestão documental com validades', body: 'Controlo de versões, aprovações, prazos e alertas automáticos antes da expiração.' },
    { title: 'CRM de oportunidades', body: 'Concursos, consultas e contactos com estado, responsável, prazo e histórico.' },
    { title: 'Automação de procurement', body: 'Pedidos de cotação, recolha de respostas e mapa comparativo gerados a partir do mesmo registo.' },
    { title: 'Dashboard operacional', body: 'Indicadores de qualificação, oportunidades, prazos e bloqueios, atualizados a partir da operação.' },
    { title: 'Registo de auditoria', body: 'Quem fez o quê e quando, em todos os processos sensíveis, sem trabalho adicional para a equipa.' },
  ],

  useCases: [
    'Preparar uma pré-qualificação sabendo, à partida, que documentação está válida',
    'Responder a um pedido de conformidade sem reconstituir meses de email',
    'Saber que oportunidades estão sem seguimento há mais de duas semanas',
    'Comparar cotações de fornecedores com o histórico de desempenho de cada um',
    'Entregar o relatório mensal sem montar folhas de cálculo à mão',
    'Integrar novos colaboradores sem depender da memória de quem já cá está',
  ],

  integrations: [
    'Email corporativo e calendário',
    'Armazenamento de ficheiros já em uso',
    'ERP ou sistema de contabilidade, quando existir API',
    'Assinatura digital de documentos',
    'Excel e CSV, para entrada e saída de dados',
    'Ferramentas de BI, quando já existirem',
  ],

  security: [
    'Permissões por perfil: cada pessoa vê o que o seu papel exige',
    'Registo de acessos e alterações em processos sensíveis',
    'Documentos confidenciais segregados por projeto ou por cliente',
    'Cópias de segurança e plano de recuperação definidos no projeto',
    'Decisões de qualificação e adjudicação mantêm sempre aprovação humana',
  ],

  proof: [
    {
      kind: 'methodology',
      title: 'Começamos pelo procedimento que já está aprovado',
      body: 'Em energia e mineração, o procedimento existe e muitas vezes está auditado. O sistema digitaliza-o e torna-o verificável — não o substitui por um fluxo novo que a organização teria de voltar a aprovar.',
    },
    {
      kind: 'conceptual-demo',
      title: 'Portal de qualificação de fornecedores',
      body: 'Submissão de documentos pelo fornecedor, verificação de validades, alertas antes da expiração e estado de qualificação visível para a equipa de procurement.',
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      kind: 'capability',
      title: 'Competência no setor dentro da própria empresa',
      body: 'A área de energia é acompanhada internamente pela Co-founder e Chief Energy Officer, responsável por parcerias estratégicas e desenvolvimento de oportunidades no setor.',
      evidence: 'Sheinaz de Sousa Amisse, Co-founder & Chief Energy Officer da AGORAMOZ.',
    },
  ],

  faq: [
    {
      q: 'Temos procedimentos aprovados e auditados. Isto obriga a mudá-los?',
      a: 'Não. O ponto de partida do diagnóstico é o procedimento que já está aprovado. O sistema torna-o executável e auditável; se a implementação exigisse alterar o procedimento, isso seria identificado e decidido por si antes de qualquer desenvolvimento.',
    },
    {
      q: 'Conseguem integrar com o ERP que já usamos?',
      a: 'Depende da existência de API, de permissões e de documentação. Essa verificação faz parte do diagnóstico e o resultado é escrito antes da proposta final. Quando não há API, trabalhamos por importação e exportação de ficheiros, e dizemo-lo à partida.',
    },
    {
      q: 'Os dados de fornecedores e de projeto são sensíveis. Onde ficam alojados?',
      a: 'O alojamento, a segregação de dados e os controlos de acesso são definidos no projeto, em função dos seus requisitos e dos dos seus parceiros. É uma decisão sua, documentada nos critérios de aceitação, não uma imposição nossa.',
    },
    {
      q: 'Quanto tempo demora até termos algo a funcionar?',
      a: 'O diagnóstico dá-lhe um plano por fases com a primeira entrega útil identificada. Não indicamos prazos antes de conhecer os volumes, as integrações e os requisitos de conformidade — um prazo dado sem isso não é um prazo, é uma suposição.',
    },
    {
      q: 'A inteligência artificial vai decidir qualificações de fornecedores?',
      a: 'Não. Decisões de qualificação e de adjudicação mantêm aprovação humana. A IA é usada para organizar informação, extrair dados de documentos e assinalar o que precisa de atenção — não para decidir.',
    },
  ],

  seo: {
    title: 'Sistemas digitais para energia, mineração e serviços industriais em Moçambique',
    description:
      'Qualificação de fornecedores, gestão documental, pipeline de oportunidades e reporting para empresas industriais moçambicanas. Diagnóstico antes da proposta.',
  },

  updatedAt: '2026-09-22',
};
