import type { SolutionPage } from '../../types';

/** Stabilisation and evolution — the English page. Contracted with defined scope and service levels, never implied. */
export const estabilizacaoEEvolucaoEn: SolutionPage = {
  slug: 'estabilizacao-e-evolucao',
  label: 'Stabilisation and evolution',
  short: 'After go-live: adoption, support and improvement.',

  hero: {
    eyebrow: 'Service',
    h1: 'Going live starts usage. It does not end our responsibility.',
    lead: 'Stabilisation resolves real blockers, follows adoption and confirms the system supports the operation. Evolution prioritises improvements by usage, risk and value.',
  },

  result:
    'A system the operation uses consistently, with incidents handled, benefits measured and an improvement backlog prioritised by the value it creates.',

  problems: [
    { title: 'The system goes live and is left alone', body: 'The team hits the first real blockers the following week, and nobody has the time or the mandate to fix them.' },
    { title: 'Adoption that does not happen', body: 'The system exists, but teams go back to spreadsheets and messages because nobody followed the usage.' },
    { title: 'Integrations that fail silently', body: 'A connection stops syncing and it is only noticed when a client complains or a report does not add up.' },
    { title: 'Improvements without priority', body: 'Requests pile up with no criterion. What gets done is what was asked for most insistently, not what creates most value.' },
  ],

  useCases: [
    'Incident triage and resolution',
    'Agreed fixes and adjustments',
    'Usage follow-up and support for key users',
    'Integration monitoring',
    'First benefit measurement and documentation close-out',
    'Improvement backlog, new automations and integrations',
    'Performance and cost optimisation, security review',
    'Analytics, data quality, releases and communication',
  ],

  components: [
    { title: 'Stabilisation block', body: 'After go-live, with defined scope and duration.' },
    { title: 'Retainer agreement', body: 'For a recurring backlog and reserved capacity.' },
    { title: 'Managed service', body: 'Operation, monitoring and agreed service levels.' },
    { title: 'Capped time and materials', body: 'For high uncertainty, shifting priorities and budget control.' },
    { title: 'Measurement and backlog', body: 'Each improvement comes with the problem, the expected value and the metric that will say whether it worked.' },
    { title: 'Releases and communication', body: 'What changes, when it changes and who needs to know — before it changes.' },
  ],

  integrations: [
    'The systems implemented in the project',
    'Support and incident tools',
    'Existing monitoring, logs and alerts',
    'Code and documentation repositories',
  ],

  process: [
    { title: 'Define the post-go-live period', body: 'Scope, duration, contacts and what counts as an incident — written before go-live.' },
    { title: 'Stabilise', body: 'Resolve real blockers, follow adoption and confirm the system supports the operation.' },
    { title: 'Measure', body: 'Compare against the diagnostic baseline: usage, benefits and incidents.' },
    { title: 'Prioritise evolution', body: 'Each backlog item is executed, postponed or dropped by usage, risk and value.' },
    { title: 'Review service levels', body: 'Fit the model — block, retainer, managed service — to what the operation actually needs.' },
  ],

  security: [
    'Periodic review of access and credentials',
    'Security updates under change management',
    'Backups verified by restoring, not just by existing',
    'Incidents logged, escalated and closed with an identified cause',
  ],

  faq: [
    { q: 'Do you provide support after launch?', a: 'Stabilisation, support and evolution can be contracted with defined scope and service levels. It is not implied: it is agreed before go-live.' },
    { q: 'Which commercial model makes sense?', a: 'A stabilisation block right after go-live; a retainer when there is a recurring backlog; a managed service when operation and monitoring stay with us under service levels; capped time and materials when uncertainty is high and the budget must be controlled.' },
  ],

  seo: {
    title: 'Support and evolution of systems in Mozambique',
    description:
      'Stabilisation, support and evolution of business systems: incidents, adoption, monitoring and improvements prioritised by value, under defined service levels.',
  },

  updatedAt: '2026-10-11',
};
