import type { SolutionPage } from '../../types';

/** Systems integration — the English page. Same scope and the same refusals as the Portuguese one. */
export const integracaoDeSistemasEn: SolutionPage = {
  slug: 'integracao-de-sistemas',
  label: 'Systems integration',
  short: 'Information moves between applications without anyone copying it.',

  hero: {
    eyebrow: 'Solution',
    h1: 'Move information forward without making teams copy it.',
    lead: 'Integrations connect applications, data and events. They must be designed with ownership, security, monitoring, failure handling and recovery — not just connected and forgotten.',
  },

  result:
    'Information is captured once and reaches where it is needed, with an owner for the integration, alerts when it fails and a way to reprocess what fell behind.',

  problems: [
    { title: 'CRM and operations do not talk', body: 'The sale closes in one system and delivery starts in another. In between, someone copies, checks and resends — and the client waits.' },
    { title: 'The website delivers incomplete requests', body: 'The request arrives without the data the team needs to handle it, and the first reply is always a question.' },
    { title: 'Invoicing depends on manual exports', body: 'The data to invoice exists, but it leaves one system as a file and enters another by hand. Every hand-off is a chance for error and delay.' },
    { title: 'Data that diverges between applications', body: 'Each team keeps its own parallel file. When the numbers do not match, nobody knows which is right — and one process waits for another to update.' },
  ],

  useCases: [
    'Create the client in operations when the opportunity is won in the CRM',
    'Take the website request to the right system, with complete data',
    'Go from delivery to invoicing without exporting files',
    'Keep a master record of clients, products or assets across applications',
    'Update the status of one process when another finishes',
    'Reprocess what failed automatically, with a record of what happened',
  ],

  components: [
    { title: 'Systems and flow map', body: 'Which application owns which data, which events move the process and where people do manual work between them today.' },
    { title: 'Data contracts and APIs', body: 'The format, required fields and validation rules of each exchange, written before building.' },
    { title: 'Sync and duplicate rules', body: 'What happens when the same record changes on both sides, and how to avoid creating the same client twice.' },
    { title: 'Logs, alerts and reprocessing', body: 'Every failure is logged, someone is alerted and there is a safe way to rerun what fell behind.' },
    { title: 'Access and secrets', body: 'Least privilege for each connection and credentials kept outside the code, with defined rotation.' },
    { title: 'Tests, documentation, owner and runbook', body: 'The integration has an owner, tests and an operating guide — so it does not depend on whoever built it.' },
  ],

  integrations: [
    'CRM and sales tools',
    'ERP, invoicing and accounting, where they expose an API',
    'Website forms and client portals',
    'Existing databases and spreadsheets',
    'File storage and e-signature',
    'Messages and notifications in the team’s channels',
  ],

  process: [
    { title: 'Map systems and flows', body: 'What exists, who owns each piece of data and where the team bridges applications by hand today.' },
    { title: 'Validate feasibility', body: 'APIs, permissions, documentation and security requirements. An integration that is not technically viable, secure and economically defensible does not go ahead.' },
    { title: 'Design contracts and rules', body: 'Fields, validation, sync, duplicates and failure handling, written and accepted before the build.' },
    { title: 'Build, test and monitor', body: 'The integration runs with alerts and reprocessing from day one, and is tested with real cases and failure cases.' },
    { title: 'Hand over with owner and runbook', body: 'It is settled who responds, how an error is diagnosed and how the flow is restored.' },
  ],

  security: [
    'Each connection runs with the minimum permissions it needs',
    'Credentials and keys managed outside the code, with defined rotation',
    'Failures raise an alert and are logged — they never go unnoticed',
    'Personal data exchanged only as far as the purpose requires',
    'Controlled reprocessing, without duplicating records',
  ],

  faq: [
    { q: 'Do you work with the systems we already have?', a: 'Yes, when the integration is technically viable, secure and economically defensible. Feasibility — APIs, permissions, documentation — is validated before the final proposal, not after the contract.' },
    { q: 'What if one of the systems has no API?', a: 'There are alternatives — file export and import, database access or, as a last resort, interface automation — but each is more fragile than an API. We say so up front, with the associated risk.' },
    { q: 'How is an integration measured?', a: 'By successful updates, latency, errors, duplicates, manual interventions, incidents, availability and recovery time.' },
  ],

  seo: {
    title: 'Systems integration for businesses in Mozambique',
    description:
      'Systems integration for businesses: CRM, operations, invoicing and website exchanging data with security, monitoring and reprocessing. Diagnostic first.',
  },

  updatedAt: '2026-10-11',
};
