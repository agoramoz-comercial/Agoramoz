import type { SolutionPage } from '../types';

export const automacaoDeProcessos: SolutionPage = {
  slug: 'automacao-de-processos',
  label: 'Automação de processos',
  short: 'Menos trabalho repetitivo, menos erros, menos atrasos.',

  hero: {
    eyebrow: 'Solução',
    h1: 'O trabalho que a sua equipa repete todos os dias não precisa de uma pessoa a fazê-lo.',
    lead: 'Copiar dados entre sistemas, preparar o mesmo documento, enviar a mesma atualização, conferir o que já foi conferido. Ligamos tarefas, dados e plataformas para que esse trabalho aconteça sozinho — e para que a equipa volte a fazer o que exige competência.',
  },

  result:
    'Reduzir o tempo gasto em tarefas repetitivas, eliminar a introdução manual de dados entre sistemas e garantir que nada fica por fazer porque alguém se esqueceu.',

  problems: [
    {
      title: 'Reintrodução manual de dados',
      body: 'A mesma informação é escrita duas ou três vezes, em sistemas diferentes. Cada repetição é uma oportunidade de erro que só se descobre mais tarde.',
    },
    {
      title: 'Seguimento dependente de memória',
      body: 'O passo seguinte do processo acontece quando alguém se lembra. Se essa pessoa estiver ocupada ou ausente, o processo para sem que ninguém dê por isso.',
    },
    {
      title: 'Documentos preparados à mão',
      body: 'Propostas, guias, relatórios e confirmações são montados manualmente a partir de informação que já está guardada noutro sítio.',
    },
    {
      title: 'Respostas repetidas',
      body: 'Uma parte significativa do atendimento são as mesmas perguntas, respondidas uma a uma, com o mesmo conteúdo.',
    },
  ],

  useCases: [
    'Criar o registo no CRM a partir do formulário do website, já classificado e atribuído',
    'Gerar e enviar a proposta a partir dos dados do pedido, sem copiar nada',
    'Avisar o cliente da mudança de estado do processo, sem alguém ter de escrever a mensagem',
    'Consolidar dados de várias fontes num relatório, na periodicidade definida',
    'Verificar prazos e validades e alertar antes de expirarem',
    'Encaminhar pedidos para a pessoa certa com base em regras, não em disponibilidade',
  ],

  components: [
    { title: 'Mapa do processo atual', body: 'Antes de automatizar, tornamos o processo visível — incluindo os passos que não estavam documentados. Automatizar um processo mal compreendido multiplica o problema.' },
    { title: 'Motor de automação', body: 'Os fluxos que executam as tarefas, com condições, exceções e tentativas em caso de falha.' },
    { title: 'Integrações', body: 'As ligações aos sistemas que já usa, por API quando existe e por importação de ficheiros quando não existe.' },
    { title: 'Regras de negócio', body: 'As condições que decidem o que acontece, escritas de forma legível e alteráveis sem desenvolvimento.' },
    { title: 'Monitorização e alertas', body: 'Quando uma automação falha, alguém é avisado. Uma automação silenciosa que falha é pior do que trabalho manual.' },
    { title: 'Documentação e formação', body: 'A equipa tem de saber o que está automatizado, o que fazer quando algo corre mal e a quem recorrer.' },
  ],

  integrations: [
    'Email e calendário corporativos',
    'CRM e ferramentas comerciais',
    'ERP e sistemas de contabilidade, quando expõem API',
    'Armazenamento de ficheiros e assinatura digital',
    'Folhas de cálculo e bases de dados existentes',
    'Mensagens e notificações nos canais que a equipa já usa',
  ],

  process: [
    { title: 'Observar o processo real', body: 'Não o processo documentado — o que a equipa faz de facto, incluindo as exceções que ninguém registou.' },
    { title: 'Escolher o que automatizar', body: 'Nem tudo deve ser automatizado. Priorizamos por frequência, custo do erro e esforço de implementação.' },
    { title: 'Construir e testar em paralelo', body: 'A automação corre ao lado do processo manual até provar que faz o mesmo, ou melhor.' },
    { title: 'Ativar com acompanhamento', body: 'A passagem é acompanhada, com monitorização ativa nas primeiras semanas.' },
    { title: 'Medir e alargar', body: 'Com o primeiro fluxo estável e medido, decide-se qual é o seguinte com melhor relação impacto/esforço.' },
  ],

  security: [
    'Cada automação corre com as permissões mínimas necessárias',
    'Ações sobre dados sensíveis ficam registadas e são auditáveis',
    'Falhas geram alerta — nunca passam despercebidas',
    'Passos com impacto financeiro ou contratual mantêm confirmação humana',
    'Credenciais e chaves geridas fora do código, com rotação definida',
  ],

  faq: [
    {
      q: 'Automatizar significa despedir pessoas?',
      a: 'O objetivo com que trabalhamos é libertar tempo de tarefas repetitivas para trabalho que exige julgamento. O que a empresa faz com esse tempo é uma decisão sua, não uma consequência técnica — e não é algo que possamos ou devamos prometer em qualquer direção.',
    },
    {
      q: 'E se a automação falhar sem ninguém dar por isso?',
      a: 'É o risco principal deste tipo de projeto e por isso a monitorização não é opcional. Cada fluxo tem deteção de falha e alerta para um responsável identificado. Uma automação silenciosa que falha é pior do que não a ter.',
    },
    {
      q: 'Os nossos sistemas são antigos e não têm API. Dá para fazer alguma coisa?',
      a: 'Frequentemente sim, por importação e exportação de ficheiros, base de dados ou, em último caso, automação de interface. Mas cada uma destas vias é mais frágil do que uma API, e dizemos isso à partida, com o risco associado, em vez de o descobrir a meio.',
    },
    {
      q: 'Quanto tempo até ver resultado?',
      a: 'Depende do processo. O diagnóstico identifica o primeiro fluxo com melhor relação entre impacto e esforço — habitualmente o que é mais frequente e mais simples, não o mais visível. Não indicamos prazos antes de conhecer o processo.',
    },
  ],

  seo: {
    title: 'Automação de processos empresariais | AGORAMOZ',
    description:
      'Ligamos tarefas, dados e plataformas para reduzir trabalho repetitivo, atrasos e erros de introdução manual. Diagnóstico do processo antes de qualquer automação.',
  },

  updatedAt: '2026-09-22',
};
