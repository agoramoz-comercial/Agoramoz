import type { CountryCode, SectorSlug, SolutionSlug } from '@/content/types';

/** Os 12 eventos do documento, como união discriminada: um evento inválido não compila. */
export type AnalyticsEvent =
  | { name: 'country_selected'; country: CountryCode; surface: string }
  | { name: 'sector_selected'; country: CountryCode; sector: SectorSlug; surface: string }
  | { name: 'service_viewed'; solution: SolutionSlug }
  | { name: 'case_study_viewed'; caseId: string }
  | { name: 'demo_started'; demoId: string }
  | { name: 'form_started'; formId: 'diagnostic'; entryPath: string }
  | { name: 'form_step_completed'; step: number; stepId: string }
  | { name: 'form_completed'; tier: string }
  | { name: 'meeting_requested'; surface: string }
  | { name: 'whatsapp_clicked'; country: CountryCode; surface: string }
  /* Os três seguintes não são eventos de browser. Ficam no tipo para o
     esquema ser consistente ponta a ponta, mas o website não os dispara —
     nascem no CRM ou no fluxo comercial. */
  | { name: 'qualified_lead'; tier: 'A' | 'B' }
  | { name: 'proposal_sent'; leadId: string }
  | { name: 'sale_closed'; leadId: string };

export type AnalyticsEventName = AnalyticsEvent['name'];
