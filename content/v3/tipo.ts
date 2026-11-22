/**
 * O texto da página inicial v3 (2026), numa só forma para as seis línguas.
 * Cada língua é um ficheiro que exporta um `V3`: o compilador recusa uma
 * língua a que falte uma chave. O português e o inglês reutilizam, palavra
 * por palavra, o que o site já publica; fr/es/de/ar são traduções.
 */
export type V3 = {
  meta: { titulo: string; descricao: string };
  nav: {
    solucoes: string;
    como: string;
    projetos: string;
    news: string;
    contactos: string;
    diagnostico: string;
    menu: string;
    fechar: string;
    lingua: string;
    saltar: string;
  };
  hero: {
    etiqueta: string;
    titulo: string;
    texto: string;
    cta: string;
    secundario: string;
    garantias: [string, string, string];
    local: string;
    rolar: string;
  };
  problema: {
    etiqueta: string;
    manifesto: string;
    itens: { titulo: string; texto: string }[];
    caminho: string;
  };
  caminhos: {
    etiqueta: string;
    titulo: string;
    lead: string;
    itens: { nome: string; frase: string; resolve: string }[];
    capacidades: Record<
      | 'websites-avancados'
      | 'software-empresarial'
      | 'automacao-de-processos'
      | 'agentes-ia'
      | 'integracao-de-sistemas'
      | 'infraestrutura-digital'
      | 'estabilizacao-e-evolucao',
      string
    >;
    resolveRotulo: string;
    caminhoRotulo: string;
  };
  sistema: { etiqueta: string; titulo: string; lead: string; passos: { titulo: string; texto: string }[] };
  oferta: {
    etiqueta: string;
    nome: string;
    titulo: string;
    promessa: string;
    recebe: string;
    escrito: string;
    pontos: [string, string, string, string];
    honestidade: string;
  };
  prova: {
    etiqueta: string;
    titulo: string;
    lead: string;
    produtos: { nome: string; prova: string }[];
    /** Cartões do carrossel (WarpCarousel): título em 2 linhas (\n), número real, unidade e rodapé. */
    cartoes: { titulo: string; valor: string; unidade?: string; rodape: string }[];
    carrossel: string;
    dica: string;
    demo: string;
    abrir: string;
    nota: string;
  };
  fases: {
    etiqueta: string;
    titulo: string;
    lead: string;
    entregavel: string;
    decisao: string;
    pode: string;
    itens: { titulo: string; pergunta: string; entrega: string; decisao: string }[];
  };
  onde: {
    etiqueta: string;
    titulo: string;
    lead: string;
    mercados: { nome: string; texto: string }[];
    explorar: string;
  };
  equipa: { etiqueta: string; titulo: string; pessoas: { papel: string; texto: string }[]; perfil: string };
  ideias: { etiqueta: string; titulo: string; ler: string; vazio: string };
  faq: { etiqueta: string; titulo: string; itens: { q: string; a: string }[] };
  final: { titulo: string; texto: string; cta: string; micro: string };
  rodape: { direitos: string; privacidade: string; seguranca: string; topo: string; lingua: string; nota: string };
};
