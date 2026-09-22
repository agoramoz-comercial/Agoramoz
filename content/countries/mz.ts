import type { Country } from '../types';

/**
 * Moçambique — mercado de origem. O ângulo é proximidade e execução no
 * terreno: WhatsApp e telefone em destaque, possibilidade de reunião
 * presencial em Maputo, linguagem direta.
 *
 * Nota de conformidade: o texto de consentimento é deliberadamente genérico.
 * Não citamos um diploma específico sem confirmar aplicabilidade — citar
 * regulação errada é pior do que não citar nenhuma.
 */
export const mz: Country = {
  code: 'mz',
  name: 'Moçambique',
  demonym: 'moçambicanas',
  locale: 'pt-MZ',
  currency: 'MZN',
  dialCode: '+258',
  // POR PREENCHER: número real. Fica `null` até ser fornecido — a UI
  // esconde o botão de WhatsApp em vez de mostrar um número inventado.
  whatsapp: null,
  privacyRegime: 'MZ',
  consent: {
    text: 'Autorizo a AGORAMOZ a tratar os dados deste formulário para responder ao meu pedido e preparar o diagnóstico. Posso pedir a correção ou eliminação dos meus dados a qualquer momento.',
    policyHref: '/privacidade',
  },
  investmentBands: [
    { id: 'mz-1', label: 'Até 250 000 MZN', scoreWeight: 6 },
    { id: 'mz-2', label: '250 000 – 750 000 MZN', scoreWeight: 14 },
    { id: 'mz-3', label: '750 000 – 2 000 000 MZN', scoreWeight: 20 },
    { id: 'mz-4', label: 'Acima de 2 000 000 MZN', scoreWeight: 25 },
    { id: 'mz-0', label: 'Ainda a definir', scoreWeight: 4 },
  ],
  sectors: [
    'agronegocio',
    'energia-mineracao',
    'logistica',
    'construcao-imobiliario',
    'comercio-servicos',
  ],
  voice: {
    emphasis: ['proximidade', 'WhatsApp e telefone', 'execução no terreno', 'organizar o crescimento'],
    proofLanguage:
      'Em Moçambique a prova que conta é conseguir mostrar o sistema a funcionar, não uma apresentação.',
  },
  hero: {
    eyebrow: 'AGORAMOZ Moçambique',
    headline: 'Organize o crescimento antes que ele desorganize a operação.',
    lead: 'Muitas empresas moçambicanas crescem mais depressa do que os processos que as sustentam. Pedidos chegam por WhatsApp, dados vivem em folhas de cálculo e a informação depende de quem está presente nesse dia. Construímos o sistema que segura esse crescimento.',
  },
  positioning:
    'Trabalhamos com empresas que já têm procura e precisam de estrutura: organizar pedidos, clientes, fornecedores e operações num único sistema, sem substituir tudo o que já funciona.',
  problems: [
    {
      title: 'O negócio vive no WhatsApp',
      body: 'Pedidos, cotações e confirmações passam por conversas individuais. Quando alguém sai de férias, a informação sai com a pessoa.',
    },
    {
      title: 'Folhas de cálculo como sistema',
      body: 'Vários ficheiros, várias versões, ninguém sabe qual é a atual. O erro só aparece quando já custou dinheiro.',
    },
    {
      title: 'Crescimento sem visibilidade',
      body: 'A empresa está a faturar mais, mas a gestão não consegue dizer com confiança onde está a margem nem onde está o atraso.',
    },
    {
      title: 'Dependência de pessoas-chave',
      body: 'Um ou dois colaboradores sabem como tudo funciona. Isso é um risco operacional, não uma vantagem.',
    },
  ],
  seo: {
    title: 'Software, automação e IA para empresas em Moçambique',
    description:
      'A AGORAMOZ constrói websites, software e automações para empresas moçambicanas organizarem pedidos, clientes e operações num único sistema. Comece por um diagnóstico.',
  },
  updatedAt: '2026-09-22',
};
