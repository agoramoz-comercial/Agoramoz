import type { Country } from '../types';

/**
 * Portugal — o ângulo é produtividade e integração. Mercado com maturidade
 * digital superior e exigência de conformidade: RGPD é mencionado porque é
 * inequivocamente aplicável.
 */
export const pt: Country = {
  code: 'pt',
  name: 'Portugal',
  demonym: 'portuguesas',
  locale: 'pt-PT',
  currency: 'EUR',
  dialCode: '+351',
  whatsapp: null,
  privacyRegime: 'RGPD',
  consent: {
    text: 'Autorizo o tratamento dos meus dados pela AGORAMOZ para resposta a este pedido, nos termos do RGPD. Posso exercer os direitos de acesso, retificação, oposição e eliminação a qualquer momento.',
    policyHref: '/privacidade',
  },
  investmentBands: [
    { id: 'pt-1', label: 'Até 5 000 €', scoreWeight: 6 },
    { id: 'pt-2', label: '5 000 – 15 000 €', scoreWeight: 14 },
    { id: 'pt-3', label: '15 000 – 50 000 €', scoreWeight: 20 },
    { id: 'pt-4', label: 'Acima de 50 000 €', scoreWeight: 25 },
    { id: 'pt-0', label: 'Ainda a definir', scoreWeight: 4 },
  ],
  sectors: [
    'turismo-hotelaria',
    'industria',
    'construcao-imobiliario',
    'servicos-profissionais',
    'logistica-comercio',
  ],
  voice: {
    emphasis: ['produtividade', 'integração com sistemas existentes', 'RGPD', 'eficiência operacional'],
    proofLanguage:
      'Em Portugal a objeção habitual não é o preço — é se a solução integra com o ERP e quem fica responsável pela manutenção.',
  },
  hero: {
    eyebrow: 'AGORAMOZ Portugal',
    headline: 'A ferramenta já existe. O que falta é ligá-la ao resto da operação.',
    lead: 'A maioria das empresas portuguesas já investiu em ERP, CRM e plataformas próprias. O custo escondido está no trabalho manual entre elas: exportar, reintroduzir, conferir, reenviar. Construímos a camada que falta.',
  },
  positioning:
    'Não propomos substituir o que já funciona. Ligamos os sistemas existentes, automatizamos o trabalho entre eles e devolvemos horas de equipa qualificada a trabalho qualificado.',
  problems: [
    {
      title: 'Trabalho entre sistemas',
      body: 'Os dados existem em três plataformas e alguém passa a manhã a copiá-los de uma para a outra, com o risco de erro que isso traz.',
    },
    {
      title: 'Propostas demoradas',
      body: 'Preparar uma proposta técnica exige reunir informação dispersa por pastas, emails e pessoas. O cliente espera dias por algo que devia demorar horas.',
    },
    {
      title: 'Conformidade tratada no fim',
      body: 'RGPD, controlo de acessos e registo de tratamento são resolvidos depois da ferramenta estar escolhida — quando já é caro mudar.',
    },
    {
      title: 'Produtividade limitada pelo processo',
      body: 'A equipa é competente e o sistema obriga-a a tarefas que não exigem competência nenhuma.',
    },
  ],
  seo: {
    title: 'Automação, integração e IA para empresas em Portugal',
    description:
      'A AGORAMOZ liga os sistemas que a sua empresa já usa, automatiza o trabalho manual entre eles e reduz tarefas administrativas. Diagnóstico antes da proposta.',
  },
  updatedAt: '2026-09-22',
};
