import type { SolutionPage } from '../types';

/**
 * Altitude: acesso à informação e atendimento repetitivo.
 *
 * É a página com maior risco de sobre-promessa do site. A copy trata
 * explicitamente das perguntas que um decisor faz e que a maioria dos
 * fornecedores evita: de onde vêm as respostas, o que acontece quando o
 * agente não sabe, quem decide, e o que acontece aos dados.
 */
export const agentesIa: SolutionPage = {
  slug: 'agentes-ia',
  label: 'Agentes de IA',
  short: 'Assistentes com objetivo, fontes, permissões e supervisão.',

  hero: {
    eyebrow: 'Solução',
    h1: 'Agentes de IA com objetivo, fontes, permissões e supervisão.',
    lead: 'Um agente não deve receber autonomia apenas porque consegue gerar uma resposta. Deve operar dentro de um processo definido, com informação autorizada, limites, registos e responsabilidade humana. Quando não sabe, diz que não sabe e passa a uma pessoa.',
  },

  result:
    'Menos tempo a procurar informação e a preparar respostas — com fontes autorizadas, limites, registos e aprovação humana nas decisões que a exigem.',

  problems: [
    {
      title: 'A mesma pergunta, todos os dias',
      body: 'Grande parte do atendimento interno e externo são as mesmas questões em palavras diferentes, respondidas manualmente uma a uma por quem tinha trabalho mais qualificado para fazer.',
    },
    {
      title: 'A informação existe, mas ninguém a encontra',
      body: 'A resposta está num procedimento, num contrato ou num email de há dois anos. Quem precisa dela não sabe que existe, e pergunta a alguém que também vai procurar.',
    },
    {
      title: 'Receio justificado de respostas inventadas',
      body: 'Um assistente genérico responde sempre, mesmo quando não tem base. Numa proposta, num prazo contratual ou num requisito técnico, uma resposta plausível e errada custa mais do que nenhuma resposta.',
    },
    {
      title: 'Ferramentas sem âmbito nem controlo',
      body: 'Ninguém definiu a que dados o assistente acede, que ações pode executar, quem o supervisiona nem o que acontece quando falha. Sem isso, não é possível avaliar o risco.',
    },
  ],

  useCases: [
    'Pesquisa em documentação',
    'Triagem de pedidos',
    'Preparação de respostas',
    'Resumo, classificação e extração',
    'Apoio a equipas',
    'Preparação de documentos',
    'Recomendação sujeita a aprovação',
  ],

  components: [
    { title: 'Âmbito declarado', body: 'O que o agente faz, o que não faz e para quem. Escrito antes de existir, e visível para quem o usa — um agente sem fronteira definida não é avaliável.' },
    { title: 'Fontes controladas pela empresa', body: 'As respostas são ancoradas nos seus documentos e dados, não na memória do modelo. É o que separa uma resposta verificável de uma resposta plausível.' },
    { title: 'Citação da origem', body: 'Cada resposta indica em que documento se baseou, para que quem a recebe possa confirmar em vez de confiar.' },
    { title: 'Permissões e ações limitadas', body: 'O agente acede ao que o perfil de quem pergunta permite, e só executa ações que lhe foram explicitamente atribuídas.' },
    { title: 'Supervisão humana', body: 'Decisões com impacto financeiro, contratual, laboral ou de conformidade passam sempre por aprovação de uma pessoa identificada.' },
    { title: 'Monitorização e avaliação', body: 'Registo das interações, deteção de respostas fora de âmbito e um conjunto de casos de teste que se volta a correr sempre que algo muda.' },
  ],

  integrations: [
    'Repositórios de documentos e procedimentos internos',
    'Email e canais de mensagem, incluindo WhatsApp',
    'CRM e sistemas de atendimento',
    'Bases de dados e sistemas internos, com acesso só de leitura por defeito',
    'Ferramentas de conhecimento e intranets existentes',
    'Motores de automação, para as ações que o agente desencadeia',
  ],

  process: [
    { title: 'Escolher uma tarefa estreita', body: 'Começamos por uma tarefa frequente, verificável e de baixo risco. Um agente que tenta fazer tudo não é avaliável nem corrigível.' },
    { title: 'Preparar as fontes', body: 'A qualidade da resposta é limitada pela qualidade do que o agente lê. Documentação desatualizada ou contraditória produz respostas erradas com aparência correta — e isso trata-se antes, não depois.' },
    { title: 'Definir guardrails e escalonamento', body: 'O que o agente recusa responder, quando passa a uma pessoa e o que diz quando não sabe. É a parte que determina se é seguro pô-lo à frente de um cliente.' },
    { title: 'Avaliar com casos reais', body: 'Um conjunto de perguntas com resposta conhecida, corrido antes de ativar e sempre que as fontes ou o modelo mudam. Sem medição, "parece bom" é tudo o que se tem.' },
    { title: 'Ativar com acompanhamento', body: 'Início com supervisão próxima e revisão das interações, alargando o âmbito à medida que o comportamento se confirma.' },
  ],

  security: [
    'O agente acede apenas às fontes e aos dados definidos no âmbito, com permissões por perfil',
    'Decisões críticas mantêm aprovação humana — não é configurável para menos',
    'Dados sensíveis identificados à partida, com regras explícitas sobre o que nunca é enviado a um modelo externo',
    'Registo das interações para auditoria, com retenção definida consigo',
    'Comportamento definido em caso de falha: o agente para e escala, em vez de improvisar',
  ],

  faq: [
    {
      q: 'A IA vai substituir a minha equipa?',
      a: 'Não é esse o objetivo com que trabalhamos, e não é honesto prometer-lhe nem o contrário. O que fazemos é retirar tarefas repetitivas e melhorar o acesso à informação. O que a empresa faz com o tempo libertado é uma decisão de gestão sua — não uma consequência técnica que possamos garantir em qualquer direção.',
    },
    {
      q: 'Como é que sabemos que não está a inventar respostas?',
      a: 'Por três vias, e nenhuma delas é confiança. As respostas são ancoradas nas suas fontes e citam o documento de origem, para poder verificar. O agente é instruído a recusar o que está fora do âmbito e a escalar em vez de adivinhar. E existe um conjunto de casos de teste com resposta conhecida que é corrido sempre que algo muda. Reduzimos o risco e tornamo-lo verificável; não o eliminamos, e quem disser que elimina está a vender-lhe outra coisa.',
    },
    {
      q: 'Os nossos dados vão treinar o modelo de outra empresa?',
      a: 'Essa é uma decisão de arquitetura que tomamos consigo antes de escolher a tecnologia, em função da sensibilidade dos dados. Existem opções com contrato de não-utilização para treino e opções de alojamento próprio, com custos e capacidades diferentes. Apresentamos as alternativas com o que cada uma implica em vez de escolher por si.',
    },
    {
      q: 'Podemos pôr o agente a falar diretamente com clientes?',
      a: 'Depende do âmbito e do risco. Para informação factual sobre estados e procedimentos documentados, frequentemente sim. Para preços, prazos contratuais, reclamações ou qualquer compromisso vinculativo, recomendamos rascunho com revisão humana. Se o risco de uma resposta errada for alto, dizemo-lo em vez de ativar e esperar.',
    },
    {
      q: 'Que condições mínimas exigem?',
      a: 'Objetivo específico e owner; fontes identificadas e autorizadas; qualidade mínima da informação; utilizadores e permissões definidos; critérios de qualidade; tratamento de erros e escalamento; aprovação humana e monitorização.',
    },
    {
      q: 'Quando não recomendam IA?',
      a: 'Quando o processo não está definido, não existe fonte confiável, o resultado não pode ser revisto, o risco de erro é inaceitável, uma regra simples resolve, o benefício não paga a complexidade, ou direitos e obrigações não foram avaliados.',
    },
    {
      q: 'Como se mede um agente?',
      a: 'Por utilização, tempo poupado, conclusão, qualidade, correções humanas, falhas, escalamentos, custo por tarefa, satisfação e incidentes.',
    },
  ],

  seo: {
    title: 'Agentes de IA para empresas em Moçambique',
    description:
      'Agentes de IA para empresas, ancorados nas fontes da sua organização: citam a origem, escalam quando não sabem e mantêm aprovação humana nas decisões críticas.',
  },

  updatedAt: '2026-10-11',
};
