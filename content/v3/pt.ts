import { FOUNDERS, HOME_FAQ, HOME_PROBLEMS, PROCESS, PROOF_SECTION, RISK_REDUCTION, SITE, SYSTEM_FLOW } from '@/content/site';
import type { V3 } from './tipo';

/** Português: o texto que o site já publica, reorganizado pela ordem do benchmark. */
export const PT: V3 = {
  meta: { titulo: `AGORAMOZ — ${SITE.tagline}`, descricao: SITE.description },
  nav: {
    solucoes: 'Soluções',
    como: 'Como trabalhamos',
    projetos: 'Projetos',
    news: 'Moz News',
    contactos: 'Contactos',
    diagnostico: 'Diagnóstico',
    menu: 'Menu',
    fechar: 'Fechar',
    lingua: 'Língua',
    saltar: 'Saltar para o conteúdo',
  },
  hero: {
    etiqueta: 'Infraestrutura operacional digital',
    titulo: 'Organizamos os processos, dados e sistemas que a sua empresa precisa para crescer com mais controlo.',
    texto:
      'Começamos por diagnosticar um processo crítico, definimos a arquitetura e implementamos por fases. Websites, software, automação, integrações e agentes de IA entram quando são adequados ao problema — não antes.',
    cta: 'Avaliar um processo crítico',
    secundario: 'Fazer o diagnóstico (cerca de 2 min)',
    garantias: ['Diagnóstico antes de proposta', 'Se não houver adequação, dizemo-lo', 'Aprovação em cada fase'],
    local: 'Maputo · Lisboa · São Paulo',
    rolar: 'Rolar',
  },
  problema: {
    etiqueta: 'O problema',
    manifesto:
      'O problema raramente é falta de ferramentas. É falta de ligação entre pessoas, processos e tecnologia.',
    itens: HOME_PROBLEMS.map((p) => ({ titulo: p.title, texto: p.body })),
    caminho: 'Caminho',
  },
  caminhos: {
    etiqueta: 'Soluções',
    titulo: 'Três caminhos, sete capacidades.',
    lead: 'Cada uma resolve um bloqueio diferente. O diagnóstico determina por qual começar — nem todas são igualmente importantes para a sua empresa.',
    itens: [
      {
        nome: 'Captar e qualificar oportunidades',
        frase: 'Cada pedido entra por um caminho definido, com os dados necessários para ser tratado.',
        resolve: 'Oportunidades perdidas',
      },
      {
        nome: 'Ligar e automatizar a operação',
        frase: 'A informação avança entre aplicações sem ninguém a copiar.',
        resolve: 'Operações manuais · Sistemas desconectados',
      },
      {
        nome: 'Medir, proteger e evoluir',
        frase: 'Vendas, operações e bloqueios ficam visíveis em dados simples e atualizados.',
        resolve: 'Decisões sem visibilidade',
      },
    ],
    capacidades: {
      'websites-avancados': 'Websites avançados',
      'software-empresarial': 'Software empresarial',
      'automacao-de-processos': 'Automação de processos',
      'agentes-ia': 'Agentes de IA',
      'integracao-de-sistemas': 'Integração de sistemas',
      'infraestrutura-digital': 'Infraestrutura digital',
      'estabilizacao-e-evolucao': 'Estabilização e evolução',
    },
    resolveRotulo: 'Resolve',
    caminhoRotulo: 'Caminho',
  },
  sistema: {
    etiqueta: SYSTEM_FLOW.eyebrow,
    titulo: SYSTEM_FLOW.title,
    lead: SYSTEM_FLOW.lead,
    passos: SYSTEM_FLOW.steps.map((s) => ({ titulo: s.title, texto: s.body })),
  },
  oferta: {
    etiqueta: 'Oferta de entrada',
    nome: 'Diagnóstico Operacional Digital',
    titulo: 'Saiba onde intervir antes de comprar tecnologia.',
    promessa:
      'O diagnóstico transforma um problema pouco definido numa decisão executiva com processo, prioridades, riscos, opções e próximos passos claros.',
    recebe: 'O que recebe',
    escrito: 'O que fica escrito antes de começar',
    pontos: [...RISK_REDUCTION.points] as V3['oferta']['pontos'],
    honestidade: 'Se o diagnóstico concluir que não há adequação, dizemo-lo — e não há proposta.',
  },
  prova: {
    etiqueta: PROOF_SECTION.eyebrow,
    titulo: 'Produtos AGORAMOZ a funcionar',
    lead: PROOF_SECTION.lead,
    produtos: [
      { nome: 'Moz News', prova: 'Análise de notícias com IA, publicada pela equipa.' },
      { nome: 'AGORAMOZ Cívico', prova: 'Consulta à lei artigo a artigo: mais de 1 000 páginas.' },
      { nome: 'Cursos AGORAMOZ', prova: 'Conteúdo gerado das fontes, com cada afirmação verificada.' },
      { nome: 'TerraBuild', prova: 'Gémeo digital de uma fazenda, identificado como demonstração.' },
    ],
    demo: 'Demonstração',
    abrir: 'Abrir',
    nota: 'Cada um abre uma página pública. Nenhum é apresentado como resultado de cliente.',
  },
  fases: {
    etiqueta: PROCESS.eyebrow,
    titulo: PROCESS.title,
    lead: PROCESS.lead,
    entregavel: 'Entregável',
    decisao: 'Decisão',
    pode: 'Pode parar aqui',
    itens: PROCESS.steps.map((s) => ({ titulo: s.title, pergunta: s.body, entrega: s.entrega, decisao: s.gate })),
  },
  onde: {
    etiqueta: 'Mercados',
    titulo: 'Estratégia global. Execução adaptada a cada mercado.',
    lead: 'O mesmo método, com linguagem, prioridades e requisitos legais próprios de cada país. Não traduzimos a mesma página três vezes.',
    mercados: [
      {
        nome: 'Moçambique',
        texto:
          'Trabalhamos com empresas que já têm procura e precisam de estrutura: organizar pedidos, clientes, fornecedores e operações num único sistema, sem substituir tudo o que já funciona.',
      },
      {
        nome: 'Portugal',
        texto:
          'Não propomos substituir o que já funciona. Ligamos os sistemas existentes, automatizamos o trabalho entre eles e ajudamos a libertar horas de equipa qualificada para trabalho qualificado.',
      },
      {
        nome: 'Brasil',
        texto:
          'Desenhamos para operações de maior volume e times distribuídos, onde um minuto de trabalho manual se multiplica por cada transação.',
      },
      {
        nome: 'Global',
        texto:
          'Dez mercados de expansão, da Suíça a Singapura, com a mesma disciplina: diagnóstico primeiro, preço por fase quando o âmbito é conhecido e aprovação humana nas decisões críticas.',
      },
    ],
    explorar: 'Explorar',
  },
  equipa: {
    etiqueta: FOUNDERS.eyebrow,
    titulo: FOUNDERS.title,
    pessoas: FOUNDERS.people.map((p) => ({ papel: p.role, texto: p.body })),
    perfil: 'Perfil no LinkedIn',
  },
  ideias: {
    etiqueta: 'Moz News',
    titulo: 'O que estamos a ver.',
    ler: 'Ler o Moz News',
    vazio: 'As análises mais recentes estão no Moz News.',
  },
  faq: {
    etiqueta: 'Perguntas frequentes',
    titulo: 'O que nos perguntam antes de avançar.',
    itens: HOME_FAQ.map((f) => ({ q: f.q, a: f.a })),
  },
  final: {
    titulo: 'Antes de comprar mais tecnologia, perceba onde intervir primeiro.',
    texto:
      'Partilhe o processo que pretende melhorar. A AGORAMOZ analisará o problema, a viabilidade e o próximo passo recomendado.',
    cta: 'Avaliar um processo crítico',
    micro: 'Sem pressão comercial · Diagnóstico antes de proposta',
  },
  rodape: {
    direitos: 'Todos os direitos reservados.',
    privacidade: 'Privacidade',
    seguranca: 'Segurança e qualidade',
    topo: 'Voltar ao topo',
    lingua: 'Língua',
    nota: 'As restantes páginas do site estão em português e inglês.',
  },
};
