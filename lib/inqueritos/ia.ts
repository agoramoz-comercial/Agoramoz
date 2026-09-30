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
