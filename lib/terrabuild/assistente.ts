import type { FaseId, Projeto } from '@/content/projetos/tipos';
import { balancoAgua, DIAS_BOMBAGEM, fracaoCheiaTalhao, riscoClimatico, simularCultura } from './agro';
import { avaliarCenarios } from './cenarios';
import { CLASSE, orcamento, type Classe } from './custos';
import { milhoes, mzn, num, percentagem } from './formato';
import { interferencias } from './interferencia';
import { resumoCapital } from './obra';
import type { CasaConfig } from './quantidades';
import { fracaoCheia, grelha } from './terreno';
import { compararVersoes } from './variacao';

/**
 * O assistente de projeto da demo. NÃO chama nenhum modelo: reconhece a
 * intenção por palavras e responde com números calculados a partir do estado
 * atual da página — a mesma casa, a mesma fase, a mesma cultura que a pessoa
 * está a ver. Por isso não pode inventar, e diz o que não sabe.
 *
 * Numa versão real, um modelo de linguagem leria estes mesmos cálculos como
 * ferramentas, com o registo de cada resposta (o documento pede auditoria de
 * tudo o que a IA faz).
 */

export const INTENCOES = [
  'variacao',
  'quantidades',
  'cenarios',
  'comparar',
  'planta',
  'terreno',
  'agua',
  'riscos',
  'marcos',
  'progresso',
  'privacidade',
  'ficticio',
] as const;
export type Intencao = (typeof INTENCOES)[number];

export const SUGESTOES: readonly { intencao: Intencao; pergunta: string }[] = [
  { intencao: 'terreno', pergunta: 'Explica-me o terreno.' },
  { intencao: 'planta', pergunta: 'Mostra-me a casa principal.' },
  { intencao: 'quantidades', pergunta: 'Que materiais são precisos?' },
  { intencao: 'variacao', pergunta: 'Porque mudou o custo?' },
  { intencao: 'cenarios', pergunta: 'Compara os cenários A, B e C.' },
  { intencao: 'agua', pergunta: 'Há água suficiente?' },
  { intencao: 'riscos', pergunta: 'Quais são os riscos?' },
  { intencao: 'marcos', pergunta: 'Como funciona o financiamento por marcos?' },
  { intencao: 'ficticio', pergunta: 'O que é fictício nesta demonstração?' },
];

const PALAVRAS: Readonly<Record<Intencao, readonly string[]>> = {
  variacao: ['porque', 'subiu', 'desceu', 'variac', 'aument', 'mudou', 'diferenc', 'encareceu'],
  quantidades: ['quantidad', 'materia', 'cimento', 'areia', 'brita', 'aco', 'bloco', 'chapa', 'telha', 'orcament'],
  comparar: ['compar', 'alternativ', 'lado a lado', 'versao'],
  planta: ['planta', 'casa', 'divis', 'dimens', 'implant', 'quarto', 'janela', 'porta'],
  terreno: ['terreno', 'relevo', 'declive', 'drenag', 'solo', 'acesso', 'topograf'],
  agua: ['agua', 'rega', 'furo', 'reservat', 'irriga'],
  riscos: ['risco', 'perigo', 'problema', 'interferenc', 'conflito', 'cheia', 'seca'],
  cenarios: ['cenario', 'essencial', 'recomendad', 'avancad', 'retorno', 'payback', 'opcao'],
  marcos: ['marco', 'financ', 'desembols', 'pagament', 'investi', 'apoiar', 'desembolso'],
  progresso: ['progress', 'fase', 'obra', 'andamento', 'estado', 'cronograma'],
  privacidade: ['privac', 'publico', 'confidenc', 'coordenad', 'quem ve', 'camada'],
  ficticio: ['fictic', '=real', '=reais', 'verdade', 'demo', 'inventad', 'simulad'],
};

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/**
 * A intenção com mais palavras reconhecidas; em empate, a primeira de `INTENCOES`.
 * Cada chave casa com o INÍCIO de uma palavra («materia» apanha «materiais»);
 * com `=` à frente tem de ser a palavra inteira; com espaço, a expressão.
 */
export function classificar(texto: string): Intencao | null {
  const t = normalizar(texto);
  const palavras = t.split(/[^a-z0-9]+/).filter(Boolean);
  const casa = (k: string) =>
    k.startsWith('=') ? palavras.includes(k.slice(1)) : k.includes(' ') ? t.includes(k) : palavras.some((w) => w.startsWith(k));
  let melhor: Intencao | null = null;
  let pontos = 0;
  for (const i of INTENCOES) {
    const n = PALAVRAS[i].filter(casa).length;
    if (n > pontos) {
      melhor = i;
      pontos = n;
    }
  }
  return melhor;
}

export interface ContextoAssistente {
  readonly projeto: Projeto;
  readonly referencia: CasaConfig;
  readonly casa: CasaConfig;
  readonly classe: Classe;
  readonly fase: FaseId;
  readonly cultura: string;
  readonly hectares: number;
  /** Versão guardada para comparar, se houver. */
  readonly alternativa?: CasaConfig | null;
}

export interface Resposta {
  readonly intencao: Intencao | null;
  readonly texto: string;
  /** Secção da página que mostra os mesmos números. */
  readonly ancora?: string;
}

const NOMES_COBERTURA = { 'chapa-zinco': 'chapa de zinco', 'telha-ceramica': 'telha cerâmica', 'painel-sanduiche': 'painel sanduíche' } as const;

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function responder(intencao: Intencao | null, ctx: ContextoAssistente): Resposta {
  const p = ctx.projeto;
  switch (intencao) {
    case 'terreno': {
      const g = grelha(p.terreno, 10);
      return {
        intencao,
        ancora: '#gemeo',
        texto:
          `O terreno tem ${num(p.areaHa)} ha (${p.terreno.largura} × ${p.terreno.profundidade} m) e desce de noroeste para sudeste, ` +
          `de cerca de ${num(g.max, 1)} m para ${num(g.min, 1)} m de cota relativa. Uma linha de drenagem no canto sudeste deixa ` +
          `${percentagem(fracaoCheia(g) * 100)} do terreno abaixo da cota de cheia, sobretudo junto ao talhão 4. A entrada é pelo sul, ` +
          'pelo posto de controlo. O relevo desta demonstração é gerado por fórmula; num projeto real vem de levantamento.',
      };
    }
    case 'planta': {
      const c = ctx.casa;
      return {
        intencao,
        ancora: '#construtor',
        texto:
          `A casa principal tem ${num(c.comprimento * c.largura)} m² (${num(c.comprimento, 1)} × ${num(c.largura, 1)} m), ` +
          `pé-direito de ${num(c.peDireito, 1)} m, ${c.divisoes} divisões, ${c.portas} portas e ${c.janelas} janelas, ` +
          `com cobertura de ${NOMES_COBERTURA[c.cobertura]}. Está implantada em E ${num(c.x)} m, N ${num(c.y)} m da grelha local` +
          (c.rotacao ? `, rodada ${num(c.rotacao)}°.` : '.'),
      };
    }
    case 'quantidades': {
      const o = orcamento(ctx.casa, ctx.classe);
      const q = (id: string) => o.linhas.find((l) => l.id === id);
      const alv = q('alvenaria');
      return {
        intencao,
        ancora: '#construtor',
        texto:
          `Para esta versão: ${num(q('cimento')?.quantidade ?? 0)} sacos de cimento, ${num(q('areia')?.quantidade ?? 0, 1)} m³ de areia, ` +
          `${num(q('brita')?.quantidade ?? 0, 1)} m³ de brita, ${num(q('aco')?.quantidade ?? 0)} kg de aço e ` +
          `${num(alv?.quantidade ?? 0)} unidades de ${minuscula(alv?.material ?? 'alvenaria')}. Custo preliminar ${mzn(o.total)}, ` +
          `classe ${minuscula(CLASSE[ctx.classe].nome)}: entre ${mzn(o.faixa[0])} e ${mzn(o.faixa[1])}. ` +
          'São regras demonstrativas e preços fictícios.',
      };
    }
    case 'variacao':
    case 'comparar': {
      const base = intencao === 'comparar' && ctx.alternativa ? ctx.alternativa : ctx.referencia;
      const v = compararVersoes(base, ctx.casa, ctx.classe);
      const origem = base === ctx.referencia ? 'Em relação ao projeto de referência: ' : 'Em relação à alternativa guardada: ';
      return { intencao, ancora: '#construtor', texto: origem + minuscula(v.frase) };
    }
    case 'agua': {
      const cultura = p.culturas.find((c) => c.id === ctx.cultura) ?? p.culturas[0]!;
      const r = simularCultura(cultura, ctx.hectares);
      const b = balancoAgua(p, r.aguaM3);
      return {
        intencao,
        ancora: '#agricultura',
        texto:
          `Com ${num(ctx.hectares, 1)} ha de ${minuscula(cultura.nome)}, a necessidade é de cerca de ${num(b.necessidade)} m³ por ano. ` +
          `O furo dá ${num(b.oferta)} m³ (${p.agua.furoM3Dia} m³/dia em ${DIAS_BOMBAGEM} dias), ou seja ${percentagem(b.cobertura)} do que a cultura pede. ` +
          `O reservatório de ${num(p.agua.reservatorioM3)} m³ guarda cerca de ${num(Math.min(b.autonomiaDias, 999))} dias de rega sem bombagem.`,
      };
    }
    case 'riscos': {
      const conflitos = interferencias(p, ctx.casa);
      const cultura = p.culturas.find((c) => c.id === ctx.cultura) ?? p.culturas[0]!;
      const b = balancoAgua(p, simularCultura(cultura, ctx.hectares).aguaM3);
      const rc = riscoClimatico(cultura, b.cobertura, fracaoCheiaTalhao(p, 't4'));
      const k = CLASSE[ctx.classe];
      const partes = [
        `Implantação: ${conflitos.length === 0 ? 'sem interferências na posição atual da casa' : `${conflitos.length} interferência(s) — ${minuscula(conflitos[0]!.mensagem)}`}`,
        `Clima: risco ${rc.nivel} para ${minuscula(cultura.nome)} no talhão mais baixo.`,
        `Custo: a estimativa é ${minuscula(k.nome)}, com faixa de −${Math.round(k.menos * 100)} % a +${Math.round(k.mais * 100)} %.`,
        'Financeiro: nesta demonstração não há captação; numa versão real exige instrumento jurídico definido e KYC/AML.',
      ];
      return { intencao, ancora: '#riscos', texto: partes.map((s) => (s.endsWith('.') ? s : `${s}.`)).join(' ') };
    }
    case 'cenarios': {
      const r = avaliarCenarios(p, ctx.casa);
      return {
        intencao,
        ancora: '#cenarios',
        texto:
          r
            .map(
              (c) =>
                `${c.id} ${c.nome}: ${milhoes(c.investimento)} de investimento, ${c.empregos} empregos, ` +
                (c.retornoAnos === null ? 'sem retorno com estes pressupostos' : `retorno simples em cerca de ${num(c.retornoAnos, 1)} anos`),
            )
            .join('. ') + '. Valores fictícios, sem desconto nem inflação.',
      };
    }
    case 'marcos': {
      const r = resumoCapital(p);
      return {
        intencao,
        ancora: '#marcos',
        texto:
          `O projeto está dividido em ${p.componentes.length} componentes financiáveis: ${r.concluidos} concluídos, ${r.emCurso} em curso e ` +
          `${r.porIniciar} por iniciar; ${milhoes(r.libertado)} libertados de ${milhoes(r.orcamento)}. O dinheiro de cada marco só se ` +
          'liberta depois de evidência georreferenciada e validação técnica. Nesta demonstração nada é reservado nem cobrado.',
      };
    }
    case 'progresso': {
      const r = resumoCapital(p);
      const f = p.fases[ctx.fase]!;
      return {
        intencao,
        ancora: '#gemeo',
        texto: `Está a ver a fase ${ctx.fase + 1} de ${p.fases.length}, ${minuscula(f.nome)}: ${minuscula(f.resumo)} O progresso físico ponderado pelo orçamento é de ${percentagem(r.progresso)} (fictício).`,
      };
    }
    case 'privacidade':
      return {
        intencao,
        ancora: '#acesso',
        texto:
          'Há três camadas. A pública mostra o conceito, a localização aproximada, imagens, progresso e impacto. A do investidor registado ' +
          'acrescenta orçamento, projeções, contratos e evidências. A técnica, só com permissão, tem coordenadas exatas, plantas e cotações. ' +
          'Nesta demonstração até a camada técnica usa uma grelha local em metros, sem coordenadas reais.',
      };
    case 'ficticio':
      return {
        intencao,
        ancora: '#acesso',
        texto:
          'Tudo: o terreno, a província do pino, os preços, os fornecedores, as datas, o progresso e os cenários. As regras de cálculo são ' +
          'reais no mecanismo e demonstrativas nos coeficientes. Nada do que faz nesta página é guardado, enviado ou cobrado.',
      };
    default:
      return {
        intencao: null,
        texto:
          'Nesta demonstração respondo sobre o terreno, a casa, os materiais, a variação do custo, a água, os riscos, os cenários, ' +
          'os marcos de financiamento, o progresso e o que é fictício. Experimente uma das perguntas sugeridas.',
      };
  }
}
