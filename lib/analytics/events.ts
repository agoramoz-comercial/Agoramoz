import type { CountryCode, SectorSlug, SolutionSlug } from '@/content/types';
import type { Canal } from '@/lib/attribution/types';

/**
 * Os eventos, como união discriminada: um evento inválido não compila.
 *
 * O vocabulário pedido e o que existia não coincidiam. As escolhas, e porquê:
 *
 * | Pedido                    | Aqui                      | Decisão |
 * |---------------------------|---------------------------|---------|
 * | `diagnostic_started`      | `diagnostic_started`       | renomeado de `form_started` |
 * | `diagnostic_submitted`    | `diagnostic_submitted`     | renomeado de `form_completed` |
 * | `gbp_landing_view`        | `gbp_landing_view`         | novo |
 * | `meeting_requested`       | `meeting_requested`        | já existia; passa a ser disparado |
 * | `document_confirmed_view` | `document_confirmed_view`  | novo, do servidor |
 * | `deal_created`            | `deal_created`             | novo, do servidor |
 * | `deal_won`                | `deal_won`                 | substitui `sale_closed` |
 *
 * Renomear não custou nada porque **nada consumia estes eventos**: o `track()`
 * escrevia em `window.dataLayer` e não havia nem GTM nem outro consumidor. Não
 * há histórico a preservar, e um nome que descreve o negócio vale mais do que
 * um que descreve o widget.
 *
 * Aliases teriam sido a alternativa preguiçosa, e seriam uma segunda fonte de
 * verdade com sintaxe de conveniência: dois nomes para a mesma coisa acabam
 * sempre com relatórios a contar metade de cada.
 */
export type AnalyticsEvent =
  | { name: 'country_selected'; country: CountryCode; surface: string }
  | { name: 'sector_selected'; country: CountryCode; sector: SectorSlug; surface: string }
  | { name: 'service_viewed'; solution: SolutionSlug }
  | { name: 'gbp_landing_view'; landing: string }
  | { name: 'diagnostic_started'; formId: 'diagnostic'; entryPath: string }
  | { name: 'form_step_completed'; step: number; stepId: string }
  /**
   * Sem `tier`: a classificação do lead é interna e não pode chegar ao
   * browser nem a uma tag de analytics. Fica no servidor. Ver D-15.
   */
  | { name: 'diagnostic_submitted' }
  /**
   * NÃO é disparado, e é deliberado.
   *
   * Este site não tem superfície de marcação de reunião: o caminho para falar
   * connosco é o diagnóstico, e `diagnostic_submitted` já o mede. Disparar
   * isto no clique de WhatsApp produziria um número com aparência de procura
   * que na verdade duplicava `whatsapp_clicked`.
   *
   * Fica no vocabulário porque o dia em que existir uma marcação real — uma
   * agenda, um formulário de reunião — o nome já está definido e o schema já
   * o aceita. Registado em docs/GAPS.md.
   */
  | { name: 'meeting_requested'; surface: string }
  /** `country` é nulo fora das páginas de país — inventá-lo falsearia o relatório. */
  | { name: 'whatsapp_clicked'; country: CountryCode | null; surface: string }
  /**
   * Do SERVIDOR, não do browser.
   *
   * Ficam no tipo para o vocabulário ser um só de ponta a ponta, mas nascem na
   * base — `deal_created` dentro da própria transação de ingestão, `deal_won`
   * e `document_confirmed_view` em gatilhos. Nascer no servidor é o que os
   * torna impossíveis de forjar: um evento de negócio fechado que qualquer
   * browser pudesse enviar não serviria para medir nada.
   */
  | { name: 'deal_created'; dealId: string; channel: Canal }
  | { name: 'deal_won'; dealId: string; channel: Canal }
  | { name: 'document_confirmed_view'; documentId: string };

export type AnalyticsEventName = AnalyticsEvent['name'];

/** Os que o browser pode enviar. O resto é do servidor e é recusado na rota. */
export const EVENTOS_DE_BROWSER = [
  'country_selected',
  'sector_selected',
  'service_viewed',
  'gbp_landing_view',
  'diagnostic_started',
  'form_step_completed',
  'diagnostic_submitted',
  'meeting_requested',
  'whatsapp_clicked',
] as const satisfies readonly AnalyticsEventName[];

export const EVENTOS_DE_SERVIDOR = [
  'deal_created',
  'deal_won',
  'document_confirmed_view',
] as const satisfies readonly AnalyticsEventName[];
