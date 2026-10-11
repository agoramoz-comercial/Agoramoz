import type { Country } from '../types';

/**
 * Brasil — o ângulo é escala e volume. Português brasileiro (você, gerenciar,
 * time), operações maiores, times distribuídos, mercado competitivo. LGPD.
 */
export const br: Country = {
  code: 'br',
  name: 'Brasil',
  demonym: 'brasileiras',
  locale: 'pt-BR',
  currency: 'BRL',
  dialCode: '+55',
  // Sem linha local. Não é ausência de WhatsApp: a UI cai para o número da
  // empresa em SITE.whatsapp. Este campo só se preenche quando existir mesmo
  // uma linha própria neste país.
  whatsapp: null,
  privacyRegime: 'LGPD',
  consent: {
    text: {
      pt: 'Autorizo o tratamento dos meus dados pela AGORAMOZ para responder a esta solicitação, nos termos da LGPD. Posso solicitar acesso, correção ou exclusão dos meus dados a qualquer momento.',
      en: 'I authorise AGORAMOZ to process my data to answer this request, under the LGPD. I may request access to, correction of or deletion of my data at any time.',
    },
    policyHref: '/privacidade',
  },
  investmentBands: [
    { id: 'br-1', label: { pt: 'Até R$ 30 mil', en: 'Up to R$30,000' }, scoreWeight: 6 },
    { id: 'br-2', label: { pt: 'R$ 30 mil – R$ 80 mil', en: 'R$30,000 – 80,000' }, scoreWeight: 14 },
    { id: 'br-3', label: { pt: 'R$ 80 mil – R$ 250 mil', en: 'R$80,000 – 250,000' }, scoreWeight: 20 },
    { id: 'br-4', label: { pt: 'Acima de R$ 250 mil', en: 'Over R$250,000' }, scoreWeight: 25 },
    { id: 'br-0', label: { pt: 'Ainda a definir', en: 'Not yet defined' }, scoreWeight: 4 },
  ],
  sectors: [
    'agronegocio',
    'financas-seguros',
    'tecnologia-saas',
    'logistica',
    'industria-energia-construcao',
  ],
  voice: {
    emphasis: ['escala', 'volume de operação', 'times distribuídos', 'eficiência por transação'],
    proofLanguage:
      'No Brasil a pergunta é se aguenta volume: quantas transações por dia, com qual latência e qual custo por operação.',
  },
  hero: {
    eyebrow: 'Operações digitais para escala',
    headline: 'Quando o volume cresce, cada ineficiência também cresce.',
    lead: 'Uma tarefa manual de poucos minutos, multiplicada por milhares de pedidos, clientes, documentos ou interações, transforma-se em custo, atraso e risco operacional. A AGORAMOZ conecta processos, dados e sistemas para que operações de maior volume cresçam com mais controle.',
  },
  positioning:
    'Um fluxo preparado para volume, exceções e melhoria, ligando entrada, qualificação, distribuição, execução, documentos, integrações, indicadores e suporte.',
  problemsHeading: 'Escala sem integração multiplica o retrabalho.',
  problems: [
    {
      title: 'Leads entram por vários canais',
      body: 'Cada canal tem a sua fila e a sua planilha. Ninguém vê o funil inteiro, e parte da demanda fica sem resposta.',
    },
    {
      title: 'Cada time com controles próprios',
      body: 'Filiais, home office e parceiros trabalham com versões diferentes da mesma informação.',
    },
    {
      title: 'Dados copiados entre plataformas',
      body: 'Um passo do processo depende de uma pessoa conferir e repassar. Esse passo define a capacidade máxima da operação inteira.',
    },
    {
      title: 'Exceções e indicadores atrasados',
      body: 'Aprovações dependem de mensagens, exceções exigem intervenção constante e a gestão recebe os indicadores quando já é tarde para agir.',
    },
  ],
  seo: {
    title: 'Automação, sistemas empresariais e IA no Brasil',
    description:
      'Integre processos, dados e times distribuídos. Diagnóstico, software, automação, IA e infraestrutura para operações empresariais de maior volume.',
  },
  updatedAt: '2026-10-11',
};
