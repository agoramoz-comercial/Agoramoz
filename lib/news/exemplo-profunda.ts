import type { AnaliseProfunda } from './profunda';

/**
 * EXEMPLO SINTÉTICO de análise profunda, só para QA (pré-visualização do
 * jornal, testes e a revista de amostra). Acompanha o exemplo sintético de
 * lib/news/exemplo.ts (tarifa portuária no corredor de Maputo). Sem números:
 * nada aqui finge ser um dado real.
 */
export const EXEMPLO_PROFUNDA: AnaliseProfunda = {
  versao: 1,
  pais: 'mz',
  modelo: 'exemplo-qa',
  geradaEm: '2026-11-23T10:00:00.000Z',
  impacto: {
    resumo:
      'Exemplo de QA: uma tarifa portuária mais alta no corredor de Maputo encarece a importação de bens intermédios e pressiona as margens de quem depende do porto, sobretudo retalho e indústria ligeira.',
    nivel: 'alto',
    evidencia: 'E2',
    tipo: 'hypothesis',
  },
  sectores: [
    {
      nome: 'Retalho alimentar',
      efeito: 'negativo',
      explicacao: 'Exemplo de QA: custo de importação repassado ao preço de prateleira, com procura sensível ao preço.',
      evidencia: 'E3',
      tipo: 'forecast',
    },
    {
      nome: 'Logística e armazenagem',
      efeito: 'misto',
      explicacao: 'Exemplo de QA: mais procura por consolidação de carga e armazéns perto do cliente final.',
      evidencia: 'E3',
      tipo: 'hypothesis',
    },
    {
      nome: 'Mineração',
      efeito: 'incerto',
      explicacao: 'Exemplo de QA: depende de as exportações a granel ficarem ou não abrangidas pela nova tarifa.',
      evidencia: 'E4',
      tipo: 'unknown',
    },
  ],
  riscos: [
    {
      titulo: 'Desvio de carga para portos vizinhos',
      descricao: 'Exemplo de QA: operadores regionais podem preferir rotas alternativas se o custo total subir.',
      probabilidade: 'media',
      evidencia: 'E3',
      tipo: 'forecast',
    },
    {
      titulo: 'Ruptura de stock no retalho',
      descricao: 'Exemplo de QA: encomendas adiadas à espera de clareza sobre a tarifa.',
      probabilidade: 'alta',
      evidencia: 'E3',
      tipo: 'hypothesis',
    },
  ],
  oportunidades: [
    {
      titulo: 'Consolidação de cargas',
      descricao: 'Exemplo de QA: partilhar contentores entre importadores reduz o custo por unidade.',
      evidencia: 'E3',
      tipo: 'estimate',
    },
    {
      titulo: 'Produção local de substitutos',
      descricao: 'Exemplo de QA: bens hoje importados ganham espaço para fornecedores nacionais.',
      evidencia: 'E4',
      tipo: 'hypothesis',
    },
  ],
  cenarios: {
    base: {
      descricao: 'Exemplo de QA: a tarifa entra como anunciada e as empresas ajustam preços de forma gradual.',
      gatilhos: ['Publicação do regulamento', 'Primeiras facturas com a nova tarifa'],
    },
    optimista: {
      descricao: 'Exemplo de QA: a tarifa é faseada e acompanhada de ganhos de eficiência no porto.',
      gatilhos: ['Anúncio de faseamento', 'Tempos de espera a descer'],
    },
    pessimista: {
      descricao: 'Exemplo de QA (Red Team): a tarifa soma-se a atrasos e parte da carga regional muda de porto.',
      gatilhos: ['Filas de camiões a crescer', 'Operadores a anunciar rotas alternativas'],
    },
  },
  indicadores: [
    { nome: 'Tempo médio de desalfandegamento', porque: 'Exemplo de QA: mostra se o custo extra vem com mais ou menos atraso.' },
    { nome: 'Preço de prateleira de bens importados', porque: 'Exemplo de QA: mede o repasse ao consumidor.' },
    { nome: 'Volume mensal de carga no porto', porque: 'Exemplo de QA: sinal precoce de desvio para outras rotas.' },
  ],
  accoes: [
    { accao: 'Rever contratos de frete e cláusulas de repasse de custos.', prazo: 'imediato', paraQuem: 'Importadores' },
    { accao: 'Simular o impacto na margem por linha de produto.', prazo: '30-dias', paraQuem: 'Direcção financeira' },
    { accao: 'Avaliar armazenagem partilhada perto dos clientes.', prazo: '90-dias', paraQuem: 'Operações' },
  ],
  dados: [],
  retirados: 0,
  leituraIndicadores: [
    {
      indicador: 'FP.CPI.TOTL.ZG',
      texto: 'Exemplo de QA: com a inflação acima do registo anterior, uma tarifa portuária mais alta passa mais depressa para o preço final.',
      evidencia: 'E1',
      tipo: 'hypothesis',
    },
  ],
  indicadoresUsados: [],
  geografia: { regioes: ['Maputo', 'Gaza'], parceiros: ['za', 'cn'] },
};
