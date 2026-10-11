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
  // Sem linha local. Não é ausência de WhatsApp: a UI cai para o número da
  // empresa em SITE.whatsapp. Este campo só se preenche quando existir mesmo
  // uma linha própria neste país.
  whatsapp: null,
  privacyRegime: 'RGPD',
  consent: {
    text: {
      pt: 'Autorizo o tratamento dos meus dados pela AGORAMOZ para resposta a este pedido, nos termos do RGPD. Posso exercer os direitos de acesso, retificação, oposição e eliminação a qualquer momento.',
      en: 'I authorise AGORAMOZ to process my data to answer this request, under the GDPR. I may exercise my rights of access, rectification, objection and erasure at any time.',
    },
    policyHref: '/privacidade',
  },
  investmentBands: [
    { id: 'pt-1', label: { pt: 'Até 5 000 €', en: 'Up to €5,000' }, scoreWeight: 6 },
    { id: 'pt-2', label: { pt: '5 000 – 15 000 €', en: '€5,000 – 15,000' }, scoreWeight: 14 },
    { id: 'pt-3', label: { pt: '15 000 – 50 000 €', en: '€15,000 – 50,000' }, scoreWeight: 20 },
    { id: 'pt-4', label: { pt: 'Acima de 50 000 €', en: 'Over €50,000' }, scoreWeight: 25 },
    { id: 'pt-0', label: { pt: 'Ainda a definir', en: 'Not yet defined' }, scoreWeight: 4 },
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
    eyebrow: 'Produtividade operacional e integração',
    headline: 'Devolva trabalho qualificado às pessoas qualificadas.',
    lead: 'Quando as equipas copiam informação, reconciliam ficheiros e acompanham manualmente processos entre sistemas, a empresa utiliza talento especializado em trabalho evitável. A AGORAMOZ diagnostica os bloqueios, integra os sistemas existentes e automatiza o fluxo entre eles, com segurança, documentação e adoção.',
  },
  positioning:
    'Menos trabalho entre sistemas e mais controlo sobre o processo: informação captada uma vez, regras que encaminham trabalho, exceções visíveis, decisões responsáveis e indicadores produzidos pela operação.',
  problemsHeading: 'A empresa já tem ferramentas. O trabalho continua fragmentado.',
  problems: [
    {
      title: 'O CRM não comunica com a operação',
      body: 'Os dados existem em três plataformas e alguém passa a manhã a copiá-los de uma para a outra, com o risco de erro que isso traz.',
    },
    {
      title: 'Aprovações que dependem de email',
      body: 'O pedido fica numa caixa de correio até alguém se lembrar dele. Não há prazo, responsável visível nem registo da decisão.',
    },
    {
      title: 'Folhas paralelas e relatórios manuais',
      body: 'As equipas mantêm folhas ao lado das ferramentas e os relatórios exigem consolidação manual antes de cada reunião.',
    },
    {
      title: 'Privacidade tratada no fim',
      body: 'Finalidade, minimização, acessos e retenção são decididos depois de a ferramenta estar escolhida — quando já é caro mudar. Incorporamo-los no desenho; a validação jurídica pertence às partes competentes.',
    },
  ],
  seo: {
    title: 'Automação empresarial e integração em Portugal',
    description:
      'Reduza trabalho manual e ligue processos, dados e sistemas. Diagnóstico, automação, integrações, software e IA para operações empresariais em Portugal.',
  },
  updatedAt: '2026-10-11',
};
