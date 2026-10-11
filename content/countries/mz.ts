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
  // Sem linha local. Não é ausência de WhatsApp: a UI cai para o número da
  // empresa em SITE.whatsapp. Este campo só se preenche quando existir mesmo
  // uma linha própria neste país.
  whatsapp: null,
  privacyRegime: 'MZ',
  consent: {
    text: {
      pt: 'Autorizo a AGORAMOZ a tratar os dados deste formulário para responder ao meu pedido e preparar o diagnóstico. Posso pedir a correção ou eliminação dos meus dados a qualquer momento.',
      en: 'I authorise AGORAMOZ to process the data in this form to answer my request and prepare the diagnostic. I may request the correction or erasure of my data at any time.',
    },
    policyHref: '/privacidade',
  },
  investmentBands: [
    { id: 'mz-1', label: { pt: 'Até 250 000 MZN', en: 'Up to MZN 250,000' }, scoreWeight: 6 },
    { id: 'mz-2', label: { pt: '250 000 – 750 000 MZN', en: 'MZN 250,000 – 750,000' }, scoreWeight: 14 },
    { id: 'mz-3', label: { pt: '750 000 – 2 000 000 MZN', en: 'MZN 750,000 – 2,000,000' }, scoreWeight: 20 },
    { id: 'mz-4', label: { pt: 'Acima de 2 000 000 MZN', en: 'Over MZN 2,000,000' }, scoreWeight: 25 },
    { id: 'mz-0', label: { pt: 'Ainda a definir', en: 'Not yet defined' }, scoreWeight: 4 },
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
    eyebrow: 'Infraestrutura operacional digital em Moçambique',
    headline: 'Organize o crescimento antes que a operação perca o controlo.',
    lead: 'Quando pedidos, dados e tarefas estão divididos entre WhatsApp, email, folhas de cálculo e sistemas que não comunicam, a empresa perde tempo, visibilidade e oportunidades. A AGORAMOZ diagnostica o processo, liga o que já existe e implementa o sistema necessário, por fases controladas.',
  },
  positioning:
    'Não substituímos automaticamente tudo o que já funciona. Avaliamos o que deve ser mantido, integrado, automatizado ou substituído — e a arquitetura considera conectividade, energia, moeda, fornecedores, talento disponível e capacidade de adoção.',
  problemsHeading: 'O problema não é utilizar WhatsApp ou folhas de cálculo.',
  problemsLead:
    'É depender deles para controlar toda a operação. À medida que a empresa cresce, os processos acumulam exceções, ficheiros, mensagens e decisões informais.',
  problems: [
    {
      title: 'Pedidos chegam por vários canais',
      body: 'Pedidos, cotações e confirmações passam por conversas individuais. Quando alguém sai de férias, a informação sai com a pessoa.',
    },
    {
      title: 'A mesma informação em vários locais',
      body: 'Vários ficheiros, várias versões, ninguém sabe qual é a atual. O erro só aparece quando já custou dinheiro.',
    },
    {
      title: 'O conhecimento está em poucas pessoas',
      body: 'Um ou dois colaboradores sabem como tudo funciona. As aprovações ficam paradas à espera deles — isso é um risco operacional, não uma vantagem.',
    },
    {
      title: 'Relatórios que chegam tarde',
      body: 'A gestão não vê o bloqueio atual. As decisões são tomadas com dados incompletos e é difícil responsabilizar equipas.',
    },
  ],
  seo: {
    title: 'Software empresarial e automação em Moçambique',
    description:
      'Organizamos processos, dados e sistemas: diagnóstico, software, automação, integrações, IA e infraestrutura adaptados à operação em Moçambique.',
  },
  updatedAt: '2026-10-11',
};
