import type { SolutionPage } from '../types';

/**
 * Altitude: o processo próprio da empresa. O que a distingue não existe em
 * prateleira — e é por isso que acaba em folhas de cálculo.
 */
export const softwareEmpresarial: SolutionPage = {
  slug: 'software-empresarial',
  label: 'Software empresarial',
  short: 'Sistemas construídos à volta do processo que o distingue.',

  hero: {
    eyebrow: 'Solução',
    h1: 'O processo que torna a sua empresa diferente é o que nenhum software de prateleira sabe fazer.',
    lead: 'É também, quase sempre, o que acabou numa folha de cálculo partilhada e na memória de duas pessoas. Construímos o sistema em falta: portais, operações e painéis desenhados à volta de como a empresa trabalha de facto.',
  },

  result:
    'Tirar o processo crítico das folhas de cálculo e da memória de quem cá está há mais tempo, passando-o para um sistema com regras, permissões, histórico e visibilidade.',

  problems: [
    {
      title: 'Folhas de cálculo a fazer de sistema',
      body: 'Vários ficheiros, várias versões, sem saber qual é a atual. Funcionou até ao dia em que duas pessoas editaram a mesma linha e a divergência só apareceu no fecho do mês.',
    },
    {
      title: 'Ferramenta de prateleira que não encaixa',
      body: 'Comprou-se uma solução genérica e a equipa passou a trabalhar à volta dela — campos usados para o que não foram feitos, exceções registadas em observações. O software passou a ser mais um processo a gerir.',
    },
    {
      title: 'Conhecimento concentrado em pessoas',
      body: 'Uma ou duas pessoas sabem a ordem correta dos passos e o que fazer nas exceções. Não está escrito em lado nenhum. Isso é risco operacional, não senioridade.',
    },
    {
      title: 'Sem rasto do que foi decidido',
      body: 'Quem aprovou, quando e com que informação. Reconstituir uma decisão de há seis meses, para um cliente ou uma auditoria, é trabalho manual de dias.',
    },
  ],

  useCases: [
    'Dar ao cliente um portal onde consulta o estado sem ter de telefonar a perguntar',
    'Registar pedidos com os campos, as regras e as validações do processo real',
    'Gerir fornecedores, documentos e validades num único registo com histórico',
    'Aprovar por etapas, com quem aprova e com que informação registado automaticamente',
    'Dar à gestão um painel com o estado da operação, gerado dos dados e não montado à mão',
    'Integrar quem entra de novo sem depender da memória de quem já cá está',
  ],

  components: [
    { title: 'Modelo do processo', body: 'O fluxo real, incluindo as exceções que ninguém documentou. Construir sobre um processo mal compreendido produz software que a equipa contorna.' },
    { title: 'Portais de cliente ou fornecedor', body: 'Área externa onde a outra parte submete, consulta e acompanha — reduzindo o trabalho de cobrança e de resposta da sua equipa.' },
    { title: 'Sistema interno de operações', body: 'Pedidos, estados, responsáveis, prazos e regras de negócio, com as validações que impedem o erro em vez de o assinalar depois.' },
    { title: 'Gestão documental', body: 'Versões, aprovações, validades e alertas, com o documento ligado ao registo a que pertence.' },
    { title: 'Painéis de decisão', body: 'Os indicadores que a gestão pede, produzidos a partir da operação, na data em que são pedidos.' },
    { title: 'Permissões e auditoria', body: 'Cada perfil vê e faz o que o seu papel exige. Ações sensíveis ficam registadas sem trabalho adicional para quem as executa.' },
  ],

  integrations: [
    'ERP e sistemas de contabilidade, quando expõem API',
    'Email e calendário corporativos',
    'Armazenamento de ficheiros e assinatura digital',
    'Ferramentas comerciais e de CRM',
    'Importação e exportação por Excel e CSV, para o que não tem API',
    'Ferramentas de BI, quando já existirem',
  ],

  process: [
    { title: 'Observar o processo real', body: 'Acompanhar quem o executa, não apenas ler o manual. A diferença entre os dois é onde estão os problemas.' },
    { title: 'Definir o âmbito mínimo útil', body: 'Que parte do processo, sozinha, já produz valor. Construir tudo de uma vez adia o benefício e aumenta o risco.' },
    { title: 'Protótipo antes de desenvolver', body: 'A equipa que vai usar experimenta a lógica e a interface antes de existir código definitivo. Corrigir aqui custa horas; corrigir depois custa semanas.' },
    { title: 'Desenvolver, integrar e testar', body: 'Construção por fases, com critérios de aceitação escritos e validados por si, não por nós.' },
    { title: 'Ativar e acompanhar', body: 'Formação, migração dos dados existentes e acompanhamento próximo nas primeiras semanas, quando aparecem as exceções que ninguém referiu.' },
  ],

  security: [
    'Permissões por perfil, com o princípio do acesso mínimo necessário',
    'Registo de quem fez o quê e quando, nos processos sensíveis',
    'Dados segregados por cliente, projeto ou unidade, quando o negócio o exigir',
    'Cópias de segurança e plano de recuperação definidos no projeto, não presumidos',
    'Passos com impacto financeiro ou contratual mantêm aprovação humana explícita',
  ],

  faq: [
    {
      q: 'Software à medida não é sempre mais caro do que comprar?',
      a: 'Em licenças, quase sempre. No custo total, nem sempre: uma ferramenta genérica que obriga dez pessoas a trabalho manual diário tem um custo recorrente que não aparece na fatura. O diagnóstico compara as duas vias com os seus números — e já recomendámos comprar em vez de construir.',
    },
    {
      q: 'E se vos contratarmos e depois quisermos mudar de fornecedor?',
      a: 'O código, os dados e a documentação são seus e ficam escritos no contrato. Usamos tecnologias correntes e documentadas, não uma plataforma proprietária que só nós saibamos manter. Prender um cliente por dependência técnica é um modelo de negócio que não praticamos.',
    },
    {
      q: 'Quanto tempo até termos algo a funcionar?',
      a: 'Não indicamos prazos antes de conhecer o processo, os volumes e as integrações — um prazo dado sem isso é uma suposição. O diagnóstico entrega um plano por fases com a primeira entrega útil identificada e o que a condiciona.',
    },
    {
      q: 'A nossa equipa não é técnica. Vai conseguir usar?',
      a: 'É um requisito, não uma esperança. Por isso o protótipo é testado com quem vai usar antes de se desenvolver, e a formação e a documentação fazem parte da entrega. Um sistema que a equipa contorna não resolveu nada.',
    },
  ],

  seo: {
    title: 'Software empresarial à medida: portais, operações e painéis',
    description:
      'Sistemas desenhados à volta do processo que distingue a sua empresa: portais de cliente, gestão de operações, documentação e painéis de decisão. Diagnóstico antes da proposta.',
  },

  updatedAt: '2026-09-22',
};
