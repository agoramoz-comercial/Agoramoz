import type { SolutionPage } from '../types';

/**
 * Integração de sistemas — Website Final 2026, §16. Separada da
 * infraestrutura porque é comprada por outra situação: dois sistemas que não
 * conversam e uma equipa a fazer de ponte entre eles.
 */
export const integracaoDeSistemas: SolutionPage = {
  slug: 'integracao-de-sistemas',
  label: 'Integração de sistemas',
  short: 'A informação avança entre aplicações sem ninguém a copiar.',

  hero: {
    eyebrow: 'Solução',
    h1: 'Faça a informação avançar sem obrigar as equipas a copiá-la.',
    lead: 'Integrações ligam aplicações, dados e eventos. Devem ser desenhadas com ownership, segurança, monitorização, tratamento de falhas e recuperação — não apenas ligadas e esquecidas.',
  },

  result:
    'A informação é captada uma vez e chega onde é precisa, com um responsável pela integração, alertas quando falha e um caminho para reprocessar o que ficou para trás.',

  problems: [
    {
      title: 'O CRM e a operação não comunicam',
      body: 'A venda fecha num sistema e a entrega começa noutro. Entre os dois, alguém copia, confirma e reenvia — e o cliente espera.',
    },
    {
      title: 'O website entrega pedidos incompletos',
      body: 'O pedido chega sem os dados que a equipa precisa para o tratar, e a primeira resposta é sempre uma pergunta.',
    },
    {
      title: 'A faturação depende de exportações manuais',
      body: 'Os dados para faturar existem, mas saem de um sistema por ficheiro e entram noutro à mão. Cada passagem é uma oportunidade de erro e de atraso.',
    },
    {
      title: 'Dados que divergem entre aplicações',
      body: 'Cada equipa mantém o seu ficheiro paralelo. Quando os números não batem, ninguém sabe qual é o certo — e um processo fica à espera da atualização de outro.',
    },
  ],

  useCases: [
    'Criar o cliente na operação quando a oportunidade é ganha no CRM',
    'Levar o pedido do website para o sistema certo, com os dados completos',
    'Passar da entrega à faturação sem exportar ficheiros',
    'Manter um registo mestre de clientes, produtos ou ativos entre aplicações',
    'Atualizar o estado de um processo quando outro termina',
    'Reprocessar automaticamente o que falhou, com registo do que aconteceu',
  ],

  components: [
    { title: 'Mapa de sistemas e fluxos', body: 'Que aplicação é dona de que dado, que eventos movem o processo e onde hoje há trabalho manual entre elas.' },
    { title: 'Contratos de dados e APIs', body: 'O formato, os campos obrigatórios e as regras de validação de cada troca, escritos antes de construir.' },
    { title: 'Regras de sincronização e duplicados', body: 'O que acontece quando o mesmo registo muda dos dois lados, e como se evita criar o mesmo cliente duas vezes.' },
    { title: 'Logs, alertas e reprocessamento', body: 'Cada falha fica registada, alguém é avisado e existe uma forma segura de voltar a correr o que ficou para trás.' },
    { title: 'Acessos e segredos', body: 'Permissões mínimas para cada ligação e credenciais guardadas fora do código, com rotação definida.' },
    { title: 'Testes, documentação, owner e runbook', body: 'A integração tem dono, testes e um guia de operação — para não depender de quem a construiu.' },
  ],

  integrations: [
    'CRM e ferramentas comerciais',
    'ERP, faturação e contabilidade, quando expõem API',
    'Formulários do website e portais de cliente',
    'Bases de dados e folhas de cálculo existentes',
    'Armazenamento de ficheiros e assinatura digital',
    'Mensagens e notificações nos canais da equipa',
  ],

  process: [
    { title: 'Mapear sistemas e fluxos', body: 'O que existe, quem é dono de cada dado e onde a equipa faz hoje de ponte entre aplicações.' },
    { title: 'Validar a viabilidade', body: 'APIs, permissões, documentação e requisitos de segurança. Uma integração que não é tecnicamente viável, segura e economicamente defensável não avança.' },
    { title: 'Desenhar contratos e regras', body: 'Campos, validações, sincronização, duplicados e tratamento de falhas, escritos e aceites antes da construção.' },
    { title: 'Construir, testar e monitorizar', body: 'A integração corre com alertas e reprocessamento desde o primeiro dia, e é testada com casos reais e casos de falha.' },
    { title: 'Entregar com owner e runbook', body: 'Fica definido quem responde, como se diagnostica um erro e como se repõe o fluxo.' },
  ],

  security: [
    'Cada ligação corre com as permissões mínimas necessárias',
    'Credenciais e chaves geridas fora do código, com rotação definida',
    'Falhas geram alerta e ficam registadas, para não passarem despercebidas',
    'Dados pessoais trocados só na medida do necessário para a finalidade',
    'Reprocessamento controlado, sem duplicar registos',
  ],

  faq: [
    {
      q: 'Trabalham com os sistemas que já temos?',
      a: 'Sim, quando a integração é tecnicamente viável, segura e economicamente defensável. A viabilidade — APIs, permissões, documentação — é validada antes da proposta final, não depois do contrato.',
    },
    {
      q: 'E se um dos sistemas não tiver API?',
      a: 'Há alternativas — exportação e importação de ficheiros, acesso à base de dados ou, em último caso, automação de interface — mas cada uma é mais frágil do que uma API. Dizemo-lo à partida, com o risco associado.',
    },
    {
      q: 'Como se mede uma integração?',
      a: 'Por atualizações bem-sucedidas, latência, erros, duplicados, intervenções manuais, incidentes, disponibilidade e tempo de recuperação.',
    },
  ],

  seo: {
    title: 'Integração de sistemas empresariais em Moçambique',
    description:
      'Integração de sistemas: CRM, operação, faturação e website a trocar dados com segurança, monitorização e reprocessamento. Diagnóstico primeiro.',
  },

  updatedAt: '2026-10-11',
};
