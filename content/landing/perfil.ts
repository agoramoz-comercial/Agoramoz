import type { FaqItem } from '../types';

/**
 * A página de destino do perfil de empresa no Google.
 *
 * Só existe conteúdo próprio onde a pergunta é própria. Tudo o resto — oferta,
 * processo, prova, redução de risco, soluções — é reutilizado do site, porque
 * duplicar texto cria duas versões que divergem à primeira edição, e porque
 * duas páginas com o mesmo conteúdo competem uma com a outra na pesquisa.
 *
 * A pergunta que esta página responde e mais nenhuma responde é: «encontrei-vos
 * no Google, quem são e o que acontece se vos contactar».
 *
 * REGRA DE FACTOS. Nada aqui afirma o que não está verificado. Em particular:
 * não há cidade, não há morada, não há horário, não há presença física e não
 * há cliente nomeado. A AGORAMOZ é uma empresa de área de serviço, e o que se
 * diz sobre onde trabalha é exactamente o que os três ficheiros de país já
 * dizem — Moçambique, Portugal e Brasil.
 */

export const PERFIL = {
  hero: {
    eyebrow: 'Encontrou-nos no Google',
    h1: 'Somos a equipa que organiza o que a sua empresa já faz — e o que ainda perde.',
    lead: 'A AGORAMOZ desenha e constrói sistemas digitais que ligam website, software, automação e inteligência artificial ao processo real da sua empresa. Começamos sempre por perceber onde está a perda, antes de propor seja o que for.',
  },

  /**
   * O que a página promete sobre si própria. É uma descrição de processo — a
   * única classe de promessa que está inteiramente sob o nosso controlo.
   */
  promessa: {
    eyebrow: 'O que acontece a seguir',
    title: 'Um diagnóstico primeiro. Proposta só se houver adequação.',
    lead: 'Não há apresentação comercial antes de haver problema definido. Se concluirmos que o que precisa não é o que fazemos, dizemo-lo — e não há proposta.',
    passos: [
      'Preenche o diagnóstico: cinco passos, sobre o processo que quer melhorar.',
      'Lemos e classificamos internamente, com regras versionadas e sem adivinhar números.',
      'Respondemos com o problema como o percebemos, a viabilidade e o próximo passo recomendado.',
      'Se houver adequação, segue-se proposta com escopo, exclusões e critérios de aceitação escritos.',
    ],
  },

  /**
   * Conteúdo local, construído só com o que existe: os mercados publicados, a
   * moeda nativa de cada um, o regime de privacidade aplicável e o canal que o
   * mercado moçambicano de facto usa.
   */
  local: {
    eyebrow: 'Onde trabalhamos',
    title: 'Três mercados, com posicionamento próprio em cada um.',
    lead: 'Não traduzimos a mesma página três vezes. Cada mercado tem a sua linguagem de prova, as suas faixas de investimento na moeda local e o seu regime de proteção de dados.',
  },

  faq: [
    {
      q: 'Em que países trabalham?',
      a: 'Moçambique, Portugal e Brasil. Cada mercado tem página própria, com faixas de investimento na moeda local e o regime de proteção de dados aplicável.',
    },
    {
      q: 'Trabalham à distância?',
      a: 'Sim. O trabalho é feito à distância, pelos canais que a sua equipa já usa — WhatsApp, chamada e correio eletrónico. Quando um projeto exige presença, isso fica definido no escopo antes de começar.',
    },
    {
      q: 'O que recebo se preencher o diagnóstico?',
      a: 'Uma leitura do problema como o percebemos, a indicação de viabilidade e o próximo passo recomendado. Não é uma apresentação comercial, e não implica compromisso nenhum.',
    },
    {
      q: 'Quanto tempo demora a resposta?',
      a: 'O diagnóstico é classificado assim que é submetido, mas a resposta é escrita por uma pessoa e revista antes de sair. Não usamos resposta automática para dizer o que ainda não analisámos.',
    },
    {
      q: 'Quanto custa?',
      a: 'O investimento depende do processo, das integrações, do risco e do escopo. O diagnóstico determina se é necessária uma solução simples, um sprint ou um sistema personalizado.',
    },
    {
      q: 'Garantem aumento de vendas?',
      a: 'Não. Não garantimos resultados que dependem da procura, da oferta, do preço, da equipa comercial ou da execução do cliente. Garantimos os compromissos técnicos e operacionais definidos contratualmente.',
    },
    {
      q: 'Conseguem integrar com os sistemas que já usamos?',
      a: 'Depende da existência de APIs, permissões, documentação e requisitos de segurança. A viabilidade é validada antes da proposta final.',
    },
  ] satisfies FaqItem[],

  seo: {
    title: 'Sistemas digitais para empresas em Moçambique, Portugal e Brasil',
    description:
      'Websites, software, automação e agentes de IA ligados ao processo real da sua empresa. Diagnóstico antes da proposta — e proposta só quando houver adequação.',
  },

  updatedAt: '2026-09-24',
} as const;
