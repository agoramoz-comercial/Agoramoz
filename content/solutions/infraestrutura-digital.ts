import type { SolutionPage } from '../types';

/**
 * Altitude: a base que sustenta as outras quatro capacidades. Não é um
 * produto que se compra sozinho — é o que decide se o resto continua de pé
 * quando ninguém está a olhar.
 */
export const infraestruturaDigital: SolutionPage = {
  slug: 'infraestrutura-digital',
  label: 'Infraestrutura digital',
  short: 'Integração, segurança, monitorização e continuidade.',

  hero: {
    eyebrow: 'Solução',
    h1: 'A pergunta não é se alguma coisa vai falhar. É se alguém dá por isso antes do cliente.',
    lead: 'Arquitetura, integrações, segurança, monitorização e documentação: a camada que decide se os sistemas que já tem continuam a funcionar, continuam a ser manteníveis e continuam a ser seus.',
  },

  result:
    'Passar de um conjunto de ferramentas que funcionam por hábito para uma infraestrutura documentada, observável e recuperável — onde uma falha é detetada, diagnosticada e corrigida em vez de descoberta por um cliente.',

  problems: [
    {
      title: 'Integrações que ninguém vigia',
      body: 'A ligação entre dois sistemas funciona há meses. Quando deixar de funcionar, ninguém será avisado — o sintoma aparecerá dias depois, como dados em falta que alguém estranha.',
    },
    {
      title: 'Nada está documentado',
      body: 'Como está montado, porque foi decidido assim e o que depende de quê vive na cabeça de quem construiu. Se essa pessoa sair, a empresa perde a capacidade de alterar o próprio sistema.',
    },
    {
      title: 'Credenciais espalhadas',
      body: 'Chaves de API em ficheiros de configuração, palavras-passe partilhadas por mensagem, acessos de pessoas que já saíram. Ninguém sabe ao certo quem tem acesso a quê.',
    },
    {
      title: 'Nenhum plano para o dia mau',
      body: 'Existem cópias de segurança. Nunca foram testadas. Uma cópia que nunca foi restaurada é uma suposição, não um plano de recuperação.',
    },
  ],

  useCases: [
    'Saber que uma integração falhou no momento em que falha, e não quando faltam dados',
    'Reconstituir o que aconteceu num incidente, com registo suficiente para corrigir a causa',
    'Retirar o acesso de quem sai da empresa num único sítio, com efeito em todos os sistemas',
    'Testar a restauração de uma cópia de segurança e saber quanto tempo demora de facto',
    'Passar um sistema para outra equipa sem perder a capacidade de o manter',
    'Avaliar o custo real de operação antes de escalar, em vez de descobrir na fatura',
  ],

  components: [
    { title: 'Arquitetura e decisões escritas', body: 'Como está montado e porquê, incluindo as alternativas descartadas. É o que permite a quem vier a seguir alterar sem partir.' },
    { title: 'Camada de integração', body: 'As ligações entre sistemas com tratamento de erro, repetição controlada e comportamento definido quando o outro lado não responde.' },
    { title: 'Monitorização e alertas', body: 'Deteção de falha com aviso a um responsável identificado. Um alerta que ninguém recebe é o mesmo que não existir.' },
    { title: 'Gestão de acessos e segredos', body: 'Credenciais fora do código, acessos por perfil, rotação definida e revogação num só ponto.' },
    { title: 'Cópias de segurança e recuperação', body: 'Frequência, retenção e — a parte que costuma faltar — teste periódico de restauração com tempo medido.' },
    { title: 'Documentação e transferência', body: 'Runbooks para as falhas prováveis, e o conhecimento escrito de forma a que a empresa não dependa de nós para operar.' },
  ],

  integrations: [
    'Alojamento e plataformas de execução existentes',
    'Fornecedores de identidade e gestão de acessos',
    'Bases de dados e sistemas de armazenamento',
    'ERP, CRM e sistemas de negócio, por API ou por ficheiro',
    'Ferramentas de monitorização, registo e alerta',
    'Canais de notificação que a equipa já usa',
  ],

  process: [
    { title: 'Levantar o que existe', body: 'Que sistemas há, como se ligam, quem tem acesso e o que já falhou. Frequentemente é a primeira vez que isto fica num único documento.' },
    { title: 'Identificar os pontos únicos de falha', body: 'O que acontece se cada peça parar, e quais dessas paragens a empresa não consegue absorver. Prioriza-se por consequência, não por antiguidade.' },
    { title: 'Corrigir por ordem de risco', body: 'Começamos pelo que tem maior impacto e menor esforço. Reconstruir tudo antes de reduzir risco é a via mais cara e mais lenta.' },
    { title: 'Instrumentar', body: 'Monitorização, alertas e registo suficientes para diagnosticar sem adivinhar — acrescentados ao sistema, não apenas à volta dele.' },
    { title: 'Documentar e transferir', body: 'Runbooks, decisões de arquitetura e formação da equipa. A entrega só está completa quando a empresa consegue operar sem nós.' },
  ],

  security: [
    'Credenciais e chaves geridas fora do código, com rotação e revogação definidas',
    'Acesso por perfil segundo o princípio do privilégio mínimo, revisto periodicamente',
    'Comunicações cifradas e dados sensíveis identificados e tratados à parte',
    'Registo de acessos e alterações suficiente para investigar um incidente',
    'Plano de recuperação com procedimento escrito e restauração testada, não presumida',
  ],

  faq: [
    {
      q: 'Isto não é trabalho de um departamento de TI?',
      a: 'É, quando existe um com tempo e âmbito para o fazer. Em muitas empresas a TI mantém o que já existe e não tem folga para arquitetura, observabilidade e documentação. Trabalhamos como reforço dessa equipa, não em substituição — e onde a equipa interna consegue assumir, o nosso papel é deixá-la capaz disso.',
    },
    {
      q: 'Podem garantir que o sistema nunca vai falhar?',
      a: 'Não, e desconfie de quem garanta. Nenhuma infraestrutura tem disponibilidade absoluta. O que garantimos é o que está no nosso controlo: que a falha é detetada, que alguém é avisado, que há registo para diagnosticar e que existe um caminho de recuperação testado.',
    },
    {
      q: 'Vamos ficar dependentes de vocês?',
      a: 'É precisamente o que esta capacidade existe para evitar. A documentação, os runbooks e a formação fazem parte da entrega, e usamos tecnologias correntes em vez de uma plataforma proprietária. Se a empresa decidir mudar de parceiro, deve conseguir fazê-lo sem reconstruir.',
    },
    {
      q: 'Quanto custa manter isto a funcionar depois de entregue?',
      a: 'Estimamos o custo de operação — alojamento, licenças, serviços — durante o diagnóstico e apresentamo-lo antes da proposta, não depois da fatura. Uma arquitetura barata de construir e cara de operar é uma decisão má que só se descobre ao terceiro mês.',
    },
  ],

  seo: {
    title: 'Infraestrutura digital: integração, segurança e monitorização',
    description:
      'Arquitetura, integrações, gestão de acessos, monitorização, recuperação e documentação para que os seus sistemas continuem a funcionar e a ser manteníveis.',
  },

  updatedAt: '2026-09-22',
};
