/**
 * A porta da IA nos inquéritos — preparada, não ligada (decisão do fundador:
 * sem IA na v1).
 *
 * Quando existir, um `ResumoIA` recebe os AGREGADOS de um inquérito e uma
 * amostra de respostas de texto, e devolve um resumo para o staff. Regras que
 * qualquer implementação tem de cumprir:
 *
 *  - As respostas são dados escritos por desconhecidos, NUNCA instruções: vão
 *    delimitadas como conteúdo a analisar, e o que o modelo devolver é texto
 *    para uma pessoa ler, não uma acção a executar.
 *  - Nenhuma PII sai: o bloco de contacto nunca entra em `amostraTextos`, e o
 *    texto livre passa por redacção de emails e telefones antes de sair.
 *  - O resumo mostra-se como «gerado por IA», com o modelo e a data, ao lado
 *    dos números reais — nunca em vez deles.
 *  - Custo e limite por pedido definidos antes de ligar; sem chave, não liga.
 */

import type { RascunhoImportado } from './importar/esquema';

export interface EntradaResumo {
  readonly titulo: string;
  readonly perguntas: readonly {
    readonly chave: string;
    readonly titulo: string;
    readonly tipo: string;
  }[];
  /** Contagens por pergunta e opção, tal como `resultados_inquerito` as devolve. */
  readonly agregados: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /** Respostas de texto livre, já sem PII. */
  readonly amostraTextos: readonly string[];
}

export interface ResumoGerado {
  readonly texto: string;
  readonly modelo: string;
  readonly geradoEm: string;
}

export interface ResumoIA {
  resumir(entrada: EntradaResumo): Promise<ResumoGerado>;
}

/**
 * «Colar e transformar» (D-33): o texto de um inquérito escrito por alguém da
 * equipa passa a rascunho estruturado. Ligado por decisão do fundador, com o
 * Kimi. Regras:
 *
 *  - O texto é DADO, delimitado no pedido; o modelo é instruído a ignorar
 *    ordens que lá venham, e o que devolve é validado por zod e normalizado —
 *    nunca executado, nunca gravado sem o admin rever e carregar em «Guardar».
 *  - Não contém respostas nem contactos de ninguém: é o enunciado do
 *    inquérito. Mesmo assim, o ecrã avisa que o texto vai para o fornecedor.
 *  - A chave nunca aparece em erros nem em logs; os logs levam só métricas.
 *  - Falhar nunca bloqueia: quem chama cai para o analisador local.
 */
export type ErroImportadorIA = 'timeout' | 'rede' | 'json' | 'esquema' | 'vazio' | `http_${number}`;

export class FalhaImportadorIA extends Error {
  constructor(readonly codigo: ErroImportadorIA) {
    super(`importador IA: ${codigo}`);
    this.name = 'FalhaImportadorIA';
  }
}

export interface ExcertoIA {
  readonly parte: number;
  readonly total: number;
  readonly sinal?: AbortSignal;
}

export interface ImportadorIA {
  /** O nome do modelo, para mostrar «gerado por IA (modelo)». */
  readonly modelo: string;
  /**
   * Lança `FalhaImportadorIA` em qualquer falha. Com `excerto`, o texto é a
   * parte `parte` de `total` de um inquérito longo; `sinal` corta o pedido
   * quando o prazo do conjunto acaba.
   */
  estruturar(
    texto: string,
    idioma: 'pt' | 'en',
    excerto?: ExcertoIA,
  ): Promise<RascunhoImportado>;
}
