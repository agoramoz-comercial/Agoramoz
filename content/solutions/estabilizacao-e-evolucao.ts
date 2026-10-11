import type { SolutionPage } from '../types';

/**
 * Estabilização e evolução — Website Final 2026, §17. É a responsabilidade
 * depois da entrada em produção, contratada com âmbito e níveis de serviço
 * definidos — nunca prometida por omissão.
 */
export const estabilizacaoEEvolucao: SolutionPage = {
  slug: 'estabilizacao-e-evolucao',
  label: 'Estabilização e evolução',
  short: 'Depois da entrada em produção: adoção, suporte e melhoria.',

  hero: {
    eyebrow: 'Serviço',
    h1: 'A entrada em produção inicia a utilização. Não termina a responsabilidade.',
    lead: 'A fase de estabilização resolve bloqueios reais, acompanha a adoção e confirma se o sistema suporta a operação. A evolução prioriza melhorias com base em utilização, risco e valor.',
  },

  result:
    'Um sistema que a operação usa de forma consistente, com incidentes tratados, benefícios medidos e um backlog de melhorias priorizado pelo valor que cria.',

  problems: [
    {
      title: 'O sistema entra em produção e fica sozinho',
      body: 'A equipa encontra os primeiros bloqueios reais na semana seguinte, e ninguém tem tempo nem mandato para os resolver.',
    },
    {
      title: 'Adoção que não acontece',
      body: 'O sistema existe, mas as equipas voltam às folhas e às mensagens porque ninguém acompanhou a utilização.',
    },
    {
      title: 'Integrações que falham sem aviso',
      body: 'Uma ligação deixa de sincronizar e só se descobre quando um cliente reclama ou um relatório não bate certo.',
    },
    {
      title: 'Melhorias sem prioridade',
      body: 'Os pedidos acumulam-se sem critério. O que é feito é o que foi pedido com mais insistência, não o que cria mais valor.',
    },
  ],

  useCases: [
    'Triagem e resolução de incidentes',
    'Correções e ajustes acordados',
    'Acompanhamento de utilização e apoio a utilizadores-chave',
    'Monitorização de integrações',
    'Medição inicial de benefícios e fecho de documentação',
    'Backlog de melhorias, novas automações e integrações',
    'Otimização de desempenho e custo, revisão de segurança',
    'Analítica, qualidade de dados, releases e comunicação',
  ],

  components: [
    { title: 'Bloco de estabilização', body: 'Após a entrada em produção, com âmbito e duração definidos.' },
    { title: 'Retainer', body: 'Para backlog recorrente e capacidade reservada.' },
    { title: 'Serviço gerido', body: 'Operação, monitorização e níveis de serviço acordados.' },
    { title: 'Time and materials com limite máximo', body: 'Para incerteza alta, prioridades mutáveis e controlo de orçamento.' },
    { title: 'Medição e backlog', body: 'Cada melhoria entra com o problema, o valor esperado e a métrica que dirá se resultou.' },
    { title: 'Releases e comunicação', body: 'O que muda, quando muda e quem precisa de saber — antes de mudar.' },
  ],

  integrations: [
    'Os sistemas implementados no projeto',
    'Ferramentas de suporte e registo de incidentes',
    'Monitorização, logs e alertas existentes',
    'Repositórios de código e documentação',
  ],

  process: [
    { title: 'Definir o período pós-entrada em produção', body: 'Âmbito, duração, contactos e o que conta como incidente — escritos antes da entrada em produção.' },
    { title: 'Estabilizar', body: 'Resolver bloqueios reais, acompanhar a adoção e confirmar que o sistema suporta a operação.' },
    { title: 'Medir', body: 'Comparar com a baseline do diagnóstico: utilização, benefícios e incidentes.' },
    { title: 'Priorizar a evolução', body: 'Cada item do backlog é executado, adiado ou abandonado com base em utilização, risco e valor.' },
    { title: 'Rever os níveis de serviço', body: 'Ajustar o modelo — bloco, retainer, serviço gerido — ao que a operação realmente precisa.' },
  ],

  security: [
    'Revisão periódica de acessos e credenciais',
    'Atualizações de segurança com gestão de alterações',
    'Backups verificados por reposição, não apenas por existência',
    'Incidentes registados, escalados e fechados com causa identificada',
  ],

  faq: [
    {
      q: 'Prestam suporte após o lançamento?',
      a: 'Pode ser contratada estabilização, suporte e evolução com âmbito e níveis de serviço definidos. Não fica implícito: é acordado antes da entrada em produção.',
    },
    {
      q: 'Que modelo comercial faz sentido?',
      a: 'Bloco de estabilização logo após a entrada em produção; retainer quando há backlog recorrente; serviço gerido quando a operação e a monitorização ficam connosco com níveis de serviço; time and materials com limite máximo quando a incerteza é alta e o orçamento tem de ser controlado.',
    },
  ],

  seo: {
    title: 'Suporte e evolução de sistemas em Moçambique',
    description:
      'Estabilização, suporte e evolução de sistemas: incidentes, adoção, monitorização e melhorias priorizadas por valor, com níveis de serviço definidos.',
  },

  updatedAt: '2026-10-11',
};
