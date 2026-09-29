import type { SolutionPage } from '../../types';

/**
 * Business software — the English page. Same promises as the Portuguese one:
 * no timelines before the process is known, and the code, data and
 * documentation belong to the client.
 */
export const softwareEmpresarialEn: SolutionPage = {
  slug: 'software-empresarial',
  label: 'Business software',
  short: 'Systems built around the process that sets you apart.',

  hero: {
    eyebrow: 'Solution',
    h1: 'The process that makes your company different is the one no off-the-shelf software knows how to run.',
    lead: 'It is also, almost always, the one that ended up in a shared spreadsheet and in the memory of two people. We build the missing system: portals, operations and dashboards designed around how the company actually works.',
  },

  result:
    'Take the critical process out of spreadsheets and out of the memory of whoever has been here longest, and move it into a system with rules, permissions, history and visibility.',

  problems: [
    {
      title: 'Spreadsheets doing a system’s job',
      body: 'Several files, several versions, and no way of knowing which is current. It worked until the day two people edited the same row and the discrepancy only surfaced at month-end close.',
    },
    {
      title: 'Off-the-shelf tools that do not fit',
      body: 'A generic solution was bought and the team started working around it — fields used for what they were not made for, exceptions recorded in the notes. The software became one more process to manage.',
    },
    {
      title: 'Knowledge held by people',
      body: 'One or two people know the right order of the steps and what to do with the exceptions. It is not written down anywhere. That is operational risk, not seniority.',
    },
    {
      title: 'No trail of what was decided',
      body: 'Who approved, when and with what information. Reconstructing a decision from six months ago, for a customer or an audit, is days of manual work.',
    },
  ],

  useCases: [
    'Give customers a portal where they check the status without having to phone and ask',
    'Record requests with the fields, rules and validations of the real process',
    'Manage suppliers, documents and expiry dates in a single record with history',
    'Approve in stages, with who approved and on what information recorded automatically',
    'Give management a dashboard of the operation’s status, generated from the data rather than assembled by hand',
    'Onboard newcomers without depending on the memory of those already here',
  ],

  components: [
    { title: 'Process model', body: 'The real flow, including the exceptions nobody documented. Building on a misunderstood process produces software the team works around.' },
    { title: 'Customer or supplier portals', body: 'An external area where the other party submits, checks and follows up — reducing the chasing and answering your team has to do.' },
    { title: 'Internal operations system', body: 'Requests, statuses, owners, deadlines and business rules, with validations that prevent the error instead of flagging it afterwards.' },
    { title: 'Document management', body: 'Versions, approvals, expiry dates and alerts, with each document linked to the record it belongs to.' },
    { title: 'Decision dashboards', body: 'The indicators management asks for, produced from the operation, on the date they are asked for.' },
    { title: 'Permissions and audit', body: 'Each profile sees and does what its role requires. Sensitive actions are logged with no extra work for the person carrying them out.' },
  ],

  integrations: [
    'ERP and accounting systems, when they expose an API',
    'Corporate email and calendar',
    'File storage and e-signature',
    'Sales and CRM tools',
    'Excel and CSV import and export, for what has no API',
    'BI tools, where they already exist',
  ],

  process: [
    { title: 'Observe the real process', body: 'Follow the people who carry it out, not just read the manual. The gap between the two is where the problems are.' },
    { title: 'Define the smallest useful scope', body: 'Which part of the process already produces value on its own. Building everything at once delays the benefit and increases the risk.' },
    { title: 'Prototype before developing', body: 'The team who will use it tries the logic and the interface before any final code exists. Fixing it here costs hours; fixing it later costs weeks.' },
    { title: 'Develop, integrate and test', body: 'Built in phases, with acceptance criteria written down and validated by you, not by us.' },
    { title: 'Go live and follow up', body: 'Training, migration of existing data and close follow-up in the first weeks, when the exceptions nobody mentioned turn up.' },
  ],

  security: [
    'Permissions by profile, on the principle of minimum necessary access',
    'A log of who did what and when, in sensitive processes',
    'Data segregated by customer, project or unit, when the business requires it',
    'Backups and a recovery plan defined in the project, not assumed',
    'Steps with financial or contractual impact keep explicit human approval',
  ],

  faq: [
    {
      q: 'Isn’t custom software always more expensive than buying?',
      a: 'In licences, almost always. In total cost, not always: a generic tool that forces ten people into daily manual work has a recurring cost that does not show on the invoice. The diagnostic compares both routes with your numbers — and we have recommended buying rather than building before.',
    },
    {
      q: 'What if we hire you and later want to change supplier?',
      a: 'The code, the data and the documentation are yours, and that is written into the contract. We use mainstream, documented technologies, not a proprietary platform only we know how to maintain. Locking a client in through technical dependency is a business model we do not practise.',
    },
    {
      q: 'How long until we have something working?',
      a: 'We do not give timelines before we know the process, the volumes and the integrations — a timeline given without that is a guess. The diagnostic delivers a phased plan with the first useful delivery identified and what it depends on.',
    },
    {
      q: 'Our team is not technical. Will they be able to use it?',
      a: 'That is a requirement, not a hope. That is why the prototype is tested with the people who will use it before development starts, and training and documentation are part of the delivery. A system the team works around has solved nothing.',
    },
  ],

  seo: {
    title: 'Custom business software: portals, operations and dashboards',
    description:
      'Systems designed around the process that sets your company apart: customer portals, operations management, documentation and decision dashboards. A diagnostic comes before the proposal.',
  },

  updatedAt: '2026-09-29',
};
