import type { SolutionPage } from '../types';

/**
 * Altitude: aquisição. Esta página é sobre transformar procura existente em
 * pedidos qualificados e acompanhados — não sobre estética.
 */
export const websitesAvancados: SolutionPage = {
  slug: 'websites-avancados',
  label: 'Websites avançados',
  short: 'Captar, qualificar e encaminhar oportunidades.',

  hero: {
    eyebrow: 'Solução',
    h1: 'Um website bonito que não gera pedidos é uma despesa, não um ativo.',
    lead: 'Construímos websites que fazem trabalho comercial: identificam quem é o visitante, recolhem o contexto necessário e entregam a oportunidade à pessoa certa com o que ela precisa para responder.',
  },

  result:
    'Aumentar a proporção de visitantes que se tornam pedidos qualificados, com contexto suficiente para a equipa comercial responder sem ter de descobrir o assunto numa reunião.',

  problems: [
    {
      title: 'Montra em vez de máquina',
      body: 'O website descreve a empresa mas não pergunta nada, não classifica ninguém e não encaminha para lado nenhum. Quem entra e sai não deixa rasto.',
    },
    {
      title: 'Formulários que não qualificam',
      body: 'Um campo de nome, um de email e uma caixa de mensagem. O que chega é insuficiente para saber se vale a pena responder — e a resposta demora porque é preciso perguntar tudo outra vez.',
    },
    {
      title: 'Lento onde os clientes estão',
      body: 'A página demora a abrir em telemóvel e em ligação fraca. O visitante desiste antes de ver a proposta de valor. O problema não é o conteúdo, é nunca ter chegado a ele.',
    },
    {
      title: 'Nenhuma leitura do que funciona',
      body: 'Não há dados sobre que páginas geram pedidos, onde as pessoas abandonam ou que mensagem é compreendida. Cada alteração é uma opinião, não uma decisão.',
    },
  ],

  useCases: [
    'Segmentar o visitante por mercado, setor ou problema logo na primeira interação',
    'Recolher, por etapas, o contexto que a equipa comercial precisa para responder com substância',
    'Encaminhar cada pedido para a pessoa certa com base em regras, não em disponibilidade',
    'Publicar páginas por setor ou por problema sem depender de desenvolvimento a cada uma',
    'Ver que caminhos geram pedidos e quais são percorridos sem nunca converter',
    'Testar duas versões de uma mensagem e decidir com dados em vez de preferência',
  ],

  components: [
    { title: 'Estratégia e arquitetura de informação', body: 'Quem é o público, que problema reconhece e por que caminho deve entrar. Definido antes de existir uma única página.' },
    { title: 'Copy de resposta direta', body: 'Texto escrito para o problema económico do leitor, não para descrever a empresa. É o componente que mais influencia a conversão e o mais frequentemente tratado em último.' },
    { title: 'Desenho e desenvolvimento', body: 'Interface rápida, legível em telemóvel e acessível, construída a partir de componentes reutilizáveis em vez de páginas soltas.' },
    { title: 'Formulários com qualificação', body: 'Poucos campos por etapa, lógica condicional, adaptação por país e pontuação interna do pedido.' },
    { title: 'Ligação ao CRM e automações', body: 'O pedido entra no sistema comercial já classificado e atribuído, com notificação a quem tem de responder.' },
    { title: 'SEO técnico e medição', body: 'Estrutura, metadados, dados estruturados, sitemap e eventos de conversão definidos à partida, não acrescentados depois.' },
  ],

  integrations: [
    'CRM e ferramentas comerciais',
    'Email e calendário corporativos',
    'WhatsApp e canais de mensagem',
    'Plataformas de analytics e medição',
    'Gestão de conteúdos, quando a equipa precisa de publicar sozinha',
    'Motores de automação para o seguimento do pedido',
  ],

  process: [
    { title: 'Perceber quem decide', body: 'Que papel tem quem compra, que objeção traz e que linguagem usa para descrever o problema. Sem isto, o texto é sobre nós.' },
    { title: 'Definir a intenção de cada página', body: 'Uma página, uma ação principal. Páginas com três objetivos não cumprem nenhum.' },
    { title: 'Escrever antes de desenhar', body: 'O desenho serve a mensagem. Desenhar primeiro obriga a encaixar o argumento no espaço que sobrou.' },
    { title: 'Construir e ligar', body: 'Desenvolvimento, formulários, CRM, automações e medição — a página só está pronta quando o pedido chega ao fim do percurso.' },
    { title: 'Medir e corrigir', body: 'Com tráfego real, ver onde as pessoas param e corrigir a mensagem antes de acrescentar páginas novas.' },
  ],

  security: [
    'Dados do formulário transmitidos por ligação cifrada',
    'Consentimento explícito e adaptado ao regime de cada mercado',
    'Recolha limitada ao necessário para responder ao pedido',
    'Proteção contra submissões automatizadas sem penalizar quem usa teclado ou leitor de ecrã',
    'Acesso à área de gestão por perfil, com registo de alterações',
  ],

  faq: [
    {
      q: 'Já temos website. Vale a pena refazer ou basta melhorar?',
      a: 'Depende de onde está o bloqueio. Se a estrutura e a velocidade forem sãs e o problema for a mensagem e a qualificação, melhorar é mais rápido e mais barato. O diagnóstico responde a isto antes de existir proposta — e já concluímos que bastava mudar o formulário.',
    },
    {
      q: 'Conseguem garantir que vamos receber mais pedidos?',
      a: 'Não. O número de pedidos depende da procura, do preço, da notoriedade e do que a concorrência faz — variáveis fora do nosso controlo. Comprometemo-nos com o que controlamos: velocidade, clareza, qualificação, encaminhamento e medição.',
    },
    {
      q: 'A equipa vai conseguir atualizar o conteúdo sem nos chamar?',
      a: 'Sim, quando isso fizer parte do escopo. Definimos que blocos são editáveis e por quem, e formamos a equipa. Onde a edição livre puser em risco a estrutura ou o SEO, dizemos isso e propomos um limite em vez de o descobrir mais tarde.',
    },
    {
      q: 'E as animações? Não tornam o site mais lento?',
      a: 'Podem, e é por isso que têm orçamento definido. Movimento que atrase a leitura do título ou o clique no botão principal é um defeito, não uma escolha estética. Tudo respeita a preferência de movimento reduzido do sistema.',
    },
  ],

  seo: {
    title: 'Websites avançados orientados à conversão',
    description:
      'Websites que captam, qualificam e encaminham oportunidades: estratégia, copy, formulários condicionais, ligação ao CRM, SEO técnico e medição. Diagnóstico antes da proposta.',
  },

  updatedAt: '2026-09-22',
};
