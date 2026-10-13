/**
 * Modelo da demo TerraBuild. Tudo o que estes tipos descrevem é FICTÍCIO:
 * o terreno, os valores, os fornecedores e o progresso existem para mostrar a
 * ideia, não para a provar. Por isso `demo: true` é um tipo literal — um
 * projeto real não cabe aqui sem mudar o tipo, e essa mudança obriga a rever
 * cada sítio que mostra números.
 *
 * Coordenadas: grelha LOCAL em metros, x para este e y para norte, com a
 * origem no canto sudoeste do terreno. Nunca latitude e longitude — a
 * localização exacta de uma propriedade é dado sensível (camada técnica).
 */

export type FaseId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Fase {
  readonly id: FaseId;
  readonly nome: string;
  readonly resumo: string;
}

/** Retângulo orientado: centro, largura (este-oeste), profundidade (norte-sul), rotação em graus. */
export interface Retangulo {
  readonly cx: number;
  readonly cy: number;
  readonly w: number;
  readonly d: number;
  readonly rot?: number;
}

export type CamadaDados = 'infraestruturas' | 'agua' | 'eletrica' | 'talhoes';

export type FormaElemento =
  | { readonly tipo: 'caixa'; readonly r: Retangulo; readonly altura: number; readonly telhado?: 'duas-aguas' | 'plano' | 'arco' }
  | { readonly tipo: 'cilindro'; readonly cx: number; readonly cy: number; readonly raio: number; readonly altura: number }
  | { readonly tipo: 'area'; readonly r: Retangulo }
  | { readonly tipo: 'painel'; readonly r: Retangulo; readonly filas: number }
  | { readonly tipo: 'linha'; readonly pontos: readonly (readonly [number, number])[]; readonly largura: number };

export interface Elemento {
  readonly id: string;
  readonly nome: string;
  readonly camada: CamadaDados;
  readonly forma: FormaElemento;
  /** Fase em que a obra começa e fase em que fica concluída (inclusive). */
  readonly fases: readonly [FaseId, FaseId];
  /** Custo fictício em MZN. `null` quando vem do configurador (a casa principal). */
  readonly custo: number | null;
  /** Componente financiável a que pertence (marcos). */
  readonly componente?: string;
  /** Área futura: aparece tracejada e nunca é construída nesta demo. */
  readonly futuro?: boolean;
  readonly nota?: string;
}

export type EstadoMarco = 'concluido' | 'em-curso' | 'por-iniciar';

export interface Evidencia {
  readonly descricao: string;
  /** Grelha local, em metros. */
  readonly e: number;
  readonly n: number;
  readonly data: string;
}

export interface VersaoMarco {
  readonly versao: number;
  readonly data: string;
  readonly nota: string;
  /** Impressão digital fictícia, para mostrar a ideia de histórico imutável. */
  readonly hash: string;
}

export interface Componente {
  readonly id: string;
  readonly nome: string;
  readonly orcamento: number;
  readonly responsavel: string;
  readonly fornecedor: string;
  readonly percentagem: number;
  readonly estado: EstadoMarco;
  readonly certificacao: 'validado' | 'em-validacao' | 'pendente';
  readonly libertado: number;
  /** Desvio entre orçamento e custo previsto, em %. Positivo = acima. */
  readonly desvio: number;
  readonly evidencias: readonly Evidencia[];
  readonly versoes: readonly VersaoMarco[];
}

export interface Cultura {
  readonly id: string;
  readonly nome: string;
  /** t/ha por ciclo. */
  readonly rendimento: number;
  /** MZN por kg à porta da fazenda. */
  readonly preco: number;
  readonly cicloMeses: number;
  readonly ciclosAno: number;
  /** m³ por ha por ciclo. */
  readonly agua: number;
  /** MZN por ha, uma vez. */
  readonly instalacao: number;
  /** MZN por ha por ciclo. */
  readonly opex: number;
  /** 0 (baixo) a 1 (alto). */
  readonly sensibilidadeSeca: number;
  readonly sensibilidadeCheia: number;
  /** Só pode ocupar estes talhões (ex.: tomate só na estufa). */
  readonly talhoes: readonly string[];
}

export type CenarioId = 'A' | 'B' | 'C';

export interface Cenario {
  readonly id: CenarioId;
  readonly nome: string;
  readonly resumo: string;
  readonly inclui: readonly string[];
  /** Elementos do terreno que entram. */
  readonly elementos: readonly string[];
  /** Extras fora do terreno (sensores, drones…), em MZN. */
  readonly extras: readonly { readonly nome: string; readonly custo: number }[];
  /** Operação da fazenda por ano (pessoas, energia, manutenção), fora das culturas. */
  readonly opexAnual: number;
  readonly culturas: readonly { readonly cultura: string; readonly hectares: number }[];
  /** Multiplica o rendimento das culturas: sem rega distribuída produz-se menos. */
  readonly fatorRendimento: number;
  /** Receita anual que não vem das culturas em bruto (processamento, conservação…). */
  readonly receitaExtraAnual: number;
  readonly receitaExtraNota: string;
  readonly empregos: number;
  readonly solarKwp: number;
  readonly risco: 'baixo' | 'medio' | 'alto';
  readonly riscoNota: string;
  readonly expansibilidade: string;
}

export interface Projeto {
  readonly demo: true;
  readonly slug: string;
  readonly nome: string;
  readonly provincia: string;
  readonly setor: string;
  readonly areaHa: number;
  readonly culturaPrincipal: string;
  readonly estado: 'planeado' | 'em-execucao' | 'concluido';
  readonly risco: 'baixo' | 'medio' | 'alto';
  readonly maturidade: 'conceito' | 'em-validacao' | 'aprovado' | 'as-built';
  readonly terreno: { readonly largura: number; readonly profundidade: number; readonly semente: number };
  readonly faseAtual: FaseId;
  readonly fases: readonly Fase[];
  readonly elementos: readonly Elemento[];
  readonly componentes: readonly Componente[];
  readonly culturas: readonly Cultura[];
  readonly cenarios: readonly Cenario[];
  /** Reservatório e furo, para o balanço de água. */
  readonly agua: { readonly reservatorioM3: number; readonly furoM3Dia: number };
}
