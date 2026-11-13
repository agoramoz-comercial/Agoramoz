/**
 * AEOS — AGORAMOZ Enterprise Operating System, no admin.
 *
 * O texto (blocos, missões, painéis, cadência, fases e gates) é o do
 * documento do fundador «AGZ-ORG-001 Estrutura Corporativa AGORAMOZ», em
 * estado «Draft para validação». Não se acrescenta nada que lá não esteja.
 *
 * O que é NOSSO aqui é só o mapeamento para o admin: que ecrã que já existe
 * serve que bloco e que painel. A regra é a de toda a consola — nada aparece
 * «feito» sem um ecrã por trás, e nada aparece a quem não o pode abrir:
 *
 * - uma ligação a um espaço privado (Gabinete, CEnO) só aparece a quem tem
 *   o módulo — para os outros, nem a menção, que diria que o espaço existe;
 * - um painel sem nenhum ecrã visível é «por construir», nunca um zero;
 * - nenhum painel é «completo»: os que têm ecrãs são «parcial», porque cobrem
 *   parte dos indicadores do documento e não todos.
 *
 * Sem dados: a página do mapa não lê a base. Os números vivem nos ecrãs para
 * onde as ligações levam.
 */

export type Regra = 'inqueritos' | 'news' | 'energia' | 'direcao' | 'admin';
export type Permissoes = Readonly<Record<Regra, boolean>>;

export interface Ligacao {
  readonly href: string;
  readonly texto: string;
  readonly so?: Regra;
}

export interface Bloco {
  readonly n: number;
  readonly nome: string;
  readonly missao: string;
  /** As áreas do bloco, como o documento as nomeia. */
  readonly areas: readonly string[];
  readonly noAdmin: readonly Ligacao[];
  /** O que o documento pede e a consola ainda não tem. */
  readonly porConstruir: readonly string[];
}

export interface Painel {
  readonly n: number;
  readonly nome: string;
  readonly indicadores: readonly string[];
  readonly noAdmin: readonly Ligacao[];
}

const L = {
  hoje: { href: '/admin', texto: 'Hoje' },
  painel: { href: '/admin/painel', texto: 'Painel' },
  trafego: { href: '/admin/trafego', texto: 'Tráfego' },
  aquisicao: { href: '/admin/aquisicao', texto: 'Aquisição' },
  pipeline: { href: '/admin/oportunidades', texto: 'Pipeline' },
  diagnosticos: { href: '/admin/diagnosticos', texto: 'Diagnósticos' },
  propostas: { href: '/admin/propostas', texto: 'Propostas' },
  contactos: { href: '/admin/contactos', texto: 'Contactos' },
  organizacoes: { href: '/admin/organizacoes', texto: 'Organizações' },
  inqueritos: {
    href: '/admin/inqueritos',
    texto: 'Inquéritos',
    so: 'inqueritos',
  },
  news: { href: '/admin/news', texto: 'News', so: 'news' },
  ceno: { href: '/admin/energia', texto: 'Espaço CEnO', so: 'energia' },
  ceo: {
    href: '/admin/gabinete',
    texto: 'Gabinete · Painel CEO',
    so: 'direcao',
  },
  cto: {
    href: '/admin/gabinete/cto',
    texto: 'Gabinete · Painel CTO',
    so: 'direcao',
  },
  prioridades: {
    href: '/admin/gabinete/prioridades',
    texto: 'Gabinete · Prioridades',
    so: 'direcao',
  },
  decisoes: {
    href: '/admin/gabinete/decisoes',
    texto: 'Gabinete · Decisões',
    so: 'direcao',
  },
  projetos: {
    href: '/admin/gabinete/projetos',
    texto: 'Gabinete · Projectos',
    so: 'direcao',
  },
  tesouraria: {
    href: '/admin/gabinete/tesouraria',
    texto: 'Gabinete · Tesouraria',
    so: 'direcao',
  },
  capacidade: {
    href: '/admin/gabinete/capacidade',
    texto: 'Gabinete · Capacidade',
    so: 'direcao',
  },
  fila: { href: '/admin/fila', texto: 'Fila de envio', so: 'admin' },
  equipa: { href: '/admin/equipa', texto: 'Equipa', so: 'admin' },
  auditoria: { href: '/admin/auditoria', texto: 'Auditoria', so: 'admin' },
} as const satisfies Record<string, Ligacao>;

export const BLOCOS: readonly Bloco[] = [
  {
    n: 1,
    nome: 'Gabinete Executivo e Governança',
    missao:
      'Definir a direção da empresa, distribuir recursos, supervisionar riscos e garantir que a execução produz resultados mensuráveis.',
    areas: ['Gabinete do CEO', 'Secretaria corporativa', 'Comité Executivo', 'Gestão de desempenho', 'Gestão de decisões'],
    noAdmin: [L.hoje, L.painel, L.ceo, L.decisoes, L.auditoria],
    porConstruir: [
      'Comités e as suas decisões (Executivo, Receita, Projetos, Financeiro, Risco e Tecnologia, Estratégia)',
      'Gestão de desempenho',
    ],
  },
  {
    n: 2,
    nome: 'Growth, Marketing e Receita',
    missao: 'Reúne Marketing, Vendas e operações de receita. A separação completa só ocorre quando o volume justificar.',
    areas: [
      'Inteligência de Mercado',
      'Marca e Comunicação',
      'Marketing de Conteúdo',
      'Performance e Aquisição',
      'Vendas Consultivas',
      'Parcerias e Canais',
      'Revenue Operations',
      'Gestão de Propostas',
    ],
    noAdmin: [L.trafego, L.aquisicao, L.pipeline, L.diagnosticos, L.propostas, L.contactos, L.organizacoes, L.inqueritos, L.news, L.ceno],
    porConstruir: ['Parcerias e Canais', 'Renovação e expansão no funil (depois da venda)'],
  },
  {
    n: 3,
    nome: 'Produtos e Soluções',
    missao: 'Transformar problemas dos clientes em ofertas repetíveis, lucrativas e diferenciadas.',
    areas: [
      'Unidade A: Transformação empresarial',
      'Unidade B: Produtos digitais',
      'Unidade C: IA e automação',
      'Unidade D: Dados e inteligência',
      'Unidade E: Academia e capacitação',
    ],
    noAdmin: [],
    porConstruir: ['Catálogo do portefólio com a regra de admissão de produtos', 'Pricing e packaging'],
  },
  {
    n: 4,
    nome: 'Delivery e Sucesso do Cliente',
    missao: 'Converter contratos em resultados, dentro do prazo, orçamento, qualidade e risco aceitável.',
    areas: ['Project Management Office', 'Implementação', 'Quality Assurance', 'Customer Success', 'Suporte', 'Gestão do Conhecimento'],
    noAdmin: [L.projetos, L.capacidade],
    porConstruir: [
      'PMO partilhado pela equipa',
      'Customer Success: onboarding, saúde do cliente, renovação',
      'Suporte e tempo de resolução',
    ],
  },
  {
    n: 5,
    nome: 'Finanças e Administração',
    missao: 'Orçamento, forecast, caixa, faturação, cobrança, margem por projeto e relatórios à direção.',
    areas: ['Planeamento e Análise Financeira', 'Contabilidade', 'Tesouraria', 'Contas a Receber', 'Contas a Pagar', 'Procurement'],
    noAdmin: [L.tesouraria],
    porConstruir: ['Orçamento e forecast', 'Faturação e cobrança', 'Margem por projeto e rentabilidade por cliente'],
  },
  {
    n: 6,
    nome: 'Tecnologia, Dados e Inteligência Artificial',
    missao:
      'Tecnologia como infraestrutura interna, capacidade de entrega, produto comercial e ativo de dados — com um Escritório de IA que mede confabulação, custos e aprovação humana.',
    areas: [
      'Engenharia de Software',
      'Cloud e Infraestrutura',
      'Data Engineering',
      'Analytics e BI',
      'Artificial Intelligence',
      'DevSecOps',
    ],
    noAdmin: [L.cto, L.fila],
    porConstruir: ['Escritório de IA: qualidade das respostas, custos e intervenções humanas num só ecrã'],
  },
  {
    n: 7,
    nome: 'Pessoas e Organização',
    missao: 'Cada função com missão, resultados esperados, autoridade, competências, indicadores e substituto.',
    areas: ['Workforce Planning', 'Recrutamento', 'Onboarding', 'Desenvolvimento', 'Desempenho', 'People Analytics'],
    noAdmin: [L.equipa, L.capacidade],
    porConstruir: ['Descrições de funções', 'Recrutamento e onboarding', 'Gestão do desempenho'],
  },
  {
    n: 8,
    nome: 'Risco, Jurídico, Privacidade e Segurança',
    missao: 'Modelo das três linhas: cada departamento controla os seus riscos; risco e compliance supervisionam; auditoria avalia.',
    areas: [
      'Jurídico e Contratos',
      'Compliance',
      'Gestão de Riscos',
      'Privacidade e Proteção de Dados',
      'Cibersegurança',
      'Gestão de Incidentes',
    ],
    noAdmin: [L.auditoria],
    porConstruir: ['Registos obrigatórios: contratos, fornecedores, riscos, incidentes, modelos de IA, exceções aprovadas'],
  },
  {
    n: 9,
    nome: 'Estratégia, Inovação e Transformação',
    missao: 'Formular estratégia, avaliar novos negócios, acompanhar iniciativas e abandonar projetos sem justificação económica.',
    areas: ['Estratégia Corporativa', 'Inteligência Competitiva', 'Inovação', 'Transformation Office', 'Parcerias Estratégicas'],
    noAdmin: [L.prioridades],
    porConstruir: ['Portefólio estratégico com regras de continuar, adaptar e encerrar'],
  },
];

export const PAINEIS: readonly Painel[] = [
  {
    n: 1,
    nome: 'CEO Command Center',
    indicadores: [
      'receita',
      'margem',
      'caixa',
      'pipeline',
      'previsão',
      'entregas críticas',
      'clientes em risco',
      'capacidade',
      'decisões pendentes',
      'riscos',
      'objetivos estratégicos',
    ],
    noAdmin: [L.painel, L.ceo],
  },
  {
    n: 2,
    nome: 'Growth & Revenue',
    indicadores: [
      'sessões',
      'visitantes',
      'canais',
      'leads',
      'lead score',
      'reuniões',
      'propostas',
      'taxa de fecho',
      'ciclo',
      'CAC',
      'pipeline',
      'receita atribuída',
    ],
    noAdmin: [L.painel, L.trafego, L.aquisicao, L.pipeline],
  },
  {
    n: 3,
    nome: 'Product Portfolio',
    indicadores: [
      'receita por produto',
      'margem',
      'procura',
      'win rate',
      'tempo de entrega',
      'satisfação',
      'roadmap',
      'dívida técnica',
      'produtos candidatos a encerrar',
    ],
    noAdmin: [],
  },
  {
    n: 4,
    nome: 'Delivery',
    indicadores: [
      'projetos ativos',
      'prazo',
      'orçamento',
      'margem',
      'utilização',
      'bloqueios',
      'defeitos',
      'alterações de escopo',
      'aceitação do cliente',
    ],
    noAdmin: [L.projetos],
  },
  {
    n: 5,
    nome: 'Finance',
    indicadores: [
      'fluxo de caixa',
      'contas a receber',
      'contas a pagar',
      'despesas',
      'forecast',
      'runway',
      'margem',
      'rentabilidade por cliente',
      'concentração',
    ],
    noAdmin: [L.tesouraria],
  },
  {
    n: 6,
    nome: 'People',
    indicadores: [
      'capacidade',
      'competências',
      'produtividade',
      'carga',
      'ausências',
      'turnover',
      'formação',
      'posições críticas',
      'dependência de pessoas-chave',
    ],
    noAdmin: [L.capacidade, L.equipa],
  },
  {
    n: 7,
    nome: 'Risk & AI',
    indicadores: [
      'riscos críticos',
      'incidentes',
      'vulnerabilidades',
      'acessos',
      'fornecedores',
      'violações de políticas',
      'modelos de IA',
      'erros',
      'intervenções humanas',
      'dados sensíveis processados',
    ],
    noAdmin: [L.auditoria, L.cto],
  },
];

export const CADENCIA: readonly {
  quando: string;
  duracao: string;
  foco: string;
}[] = [
  {
    quando: 'Diária',
    duracao: '15 minutos',
    foco: 'O que foi concluído, o que será feito, qual o bloqueio, qual decisão é necessária.',
  },
  {
    quando: 'Segunda-feira',
    duracao: '60–90 minutos',
    foco: 'Operação: metas da semana, capacidade, prioridades, projetos, riscos.',
  },
  {
    quando: 'Quarta-feira',
    duracao: '60–90 minutos',
    foco: 'Receita: campanhas, leads, pipeline, propostas, fechos, cobranças comerciais.',
  },
  {
    quando: 'Sexta-feira',
    duracao: '60–90 minutos',
    foco: 'Execução: entregáveis, qualidade, aprendizagem, decisões, compromissos da semana seguinte.',
  },
  {
    quando: 'Mensal',
    duracao: 'Business Review',
    foco: 'Financeiro, comercial, clientes, produtos, pessoas, tecnologia, riscos, estratégia.',
  },
  {
    quando: 'Trimestral',
    duracao: 'Revisão estratégica',
    foco: 'Alocação de recursos, portefólio, cenários, talentos críticos, cancelar ou acelerar iniciativas.',
  },
];

export const FASES: readonly { nome: string; prazo: string; gate: string }[] = [
  {
    nome: 'Fundamentos',
    prazo: '0–30 dias',
    gate: 'Toda atividade crítica tem proprietário e indicador.',
  },
  {
    nome: 'Receita e execução',
    prazo: '31–60 dias',
    gate: 'Um contacto pode ser acompanhado do primeiro acesso até à receita.',
  },
  {
    nome: 'Finanças, dados e controlo',
    prazo: '61–90 dias',
    gate: 'Direção consegue relacionar receita, custo, projeto, cliente e responsável.',
  },
  {
    nome: 'IA e automação',
    prazo: '91–180 dias',
    gate: 'Automação produz ganho mensurável sem ultrapassar limites de segurança.',
  },
];

export const RED_TEAM: readonly { falha: string; sinal: string }[] = [
  {
    falha: 'Criar títulos antes de existir trabalho suficiente',
    sinal: 'Diretores sem equipas, métricas ou autoridade.',
  },
  {
    falha: 'Copiar multinacionais literalmente',
    sinal: 'Burocracia superior ao volume de faturação.',
  },
  {
    falha: 'Concentrar todas as decisões no CEO',
    sinal: 'Propostas, pagamentos e projetos aguardam constantemente aprovação.',
  },
  {
    falha: 'Usar IA antes de corrigir os processos',
    sinal: 'Automação acelera dados errados e comunicação inconsistente.',
  },
  {
    falha: 'Separar Vendas da entrega',
    sinal: 'Contratos fechados com prazo, preço ou escopo inexequível.',
  },
];

/** O estado do documento, como o próprio documento o regista. */
export const REGISTO = {
  projeto: 'AGZ-ORG-001 Estrutura Corporativa AGORAMOZ',
  estado: 'Draft para validação',
  baseline: 'NÃO DISPONÍVEL',
  proximoGate: 'Inventário de pessoas, processos, receita e decisões',
} as const;

/* ----------------------------------------------------------------- filtro */

export type EstadoPainel = 'parcial' | 'por-construir';

export interface BlocoVisivel extends Omit<Bloco, 'noAdmin'> {
  readonly noAdmin: readonly Ligacao[];
}
export interface PainelVisivel extends Omit<Painel, 'noAdmin'> {
  readonly noAdmin: readonly Ligacao[];
  readonly estado: EstadoPainel;
}

const visiveis = (ls: readonly Ligacao[], permite: Permissoes): Ligacao[] =>
  ls.filter((l) => !l.so || permite[l.so]).map(({ href, texto }) => ({ href, texto }));

/** O mapa como quem o abre o pode ver: sem ligações que dariam 404, sem menção a espaços que não são seus. */
export function aeosVisivel(permite: Permissoes): {
  blocos: BlocoVisivel[];
  paineis: PainelVisivel[];
} {
  return {
    blocos: BLOCOS.map((b) => ({
      ...b,
      noAdmin: visiveis(b.noAdmin, permite),
    })),
    paineis: PAINEIS.map((p) => {
      const noAdmin = visiveis(p.noAdmin, permite);
      return {
        ...p,
        noAdmin,
        estado: noAdmin.length > 0 ? 'parcial' : 'por-construir',
      };
    }),
  };
}
