/**
 * A porta do ERP — preparada, não ligada.
 *
 * Decisão do fundador: o CRM é o interno; o ERP fica preparado. Isto é o que
 * «preparado» quer dizer aqui, sem inventar nada:
 *
 *  - `ErpAdaptador` é o contrato que qualquer ERP terá de cumprir para
 *    receber o que o CRM decide (hoje: uma oportunidade ganha);
 *  - `estadoErp` diz ao painel, a partir da configuração, em que ponto está;
 *  - NÃO existe adaptador. Qual ERP, que API, que campos, que regras de
 *    faturação — nada disso me foi dado, e simular uma integração seria
 *    mostrar no painel números que não vieram de lado nenhum. Ver docs/ERP.md.
 */

/** O que o CRM tem para entregar quando uma oportunidade é ganha. Sem PII. */
export interface OportunidadeGanha {
  readonly id: string;
  readonly ganhaEm: string;
  readonly organizacaoId: string | null;
}

export type Resultado<T> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly motivo: string };

export interface ErpAdaptador {
  /** Nome legível do sistema, para o painel e para o log. */
  readonly nome: string;
  /** Liga ao ERP e confirma as credenciais, sem escrever nada. */
  verificar(): Promise<Resultado<null>>;
  /** Regista a oportunidade ganha no ERP; devolve a referência do lado de lá. */
  registarGanho(
    oportunidade: OportunidadeGanha,
  ): Promise<Resultado<{ readonly referenciaErp: string }>>;
}

export type EstadoErp =
  | { readonly estado: 'por-ligar' }
  | { readonly estado: 'configurado-sem-adaptador'; readonly fornecedor: 'http' };

export interface ConfigErp {
  readonly ERP_PROVIDER: 'off' | 'http';
  readonly ERP_URL?: string;
  readonly ERP_API_KEY?: string;
}

export function estadoErp(env: ConfigErp): EstadoErp {
  if (env.ERP_PROVIDER === 'off') return { estado: 'por-ligar' };
  return { estado: 'configurado-sem-adaptador', fornecedor: env.ERP_PROVIDER };
}
