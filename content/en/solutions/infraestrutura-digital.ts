import type { SolutionPage } from '../../types';

/**
 * Digital infrastructure — the English page. Same promises and the same
 * refusals as the Portuguese one: no guarantee that nothing fails, only that
 * the failure is detected, reported and recoverable.
 */
export const infraestruturaDigitalEn: SolutionPage = {
  slug: 'infraestrutura-digital',
  label: 'Digital infrastructure',
  short: 'Integration, security, monitoring and continuity.',

  hero: {
    eyebrow: 'Solution',
    h1: 'The question is not whether something will fail. It is whether anyone notices before the customer does.',
    lead: 'Architecture, integrations, security, monitoring and documentation: the layer that decides whether the systems you already have keep working, stay maintainable and remain yours.',
  },

  result:
    'Move from a set of tools that work out of habit to an infrastructure that is documented, observable and recoverable — where a failure is detected, diagnosed and fixed instead of discovered by a customer.',

  problems: [
    {
      title: 'Integrations nobody watches',
      body: 'The link between two systems has worked for months. When it stops, nobody will be told — the symptom will appear days later, as missing data that someone finds odd.',
    },
    {
      title: 'Nothing is documented',
      body: 'How it is set up, why it was decided that way and what depends on what lives in the head of whoever built it. If that person leaves, the company loses the ability to change its own system.',
    },
    {
      title: 'Credentials everywhere',
      body: 'API keys in configuration files, passwords shared by message, access for people who have already left. Nobody knows for sure who has access to what.',
    },
    {
      title: 'No plan for the bad day',
      body: 'Backups exist. They have never been tested. A backup that has never been restored is an assumption, not a recovery plan.',
    },
  ],

  useCases: [
    'Know an integration has failed the moment it fails, not when data goes missing',
    'Reconstruct what happened in an incident, with enough logging to fix the cause',
    'Remove the access of someone leaving the company in one place, with effect across every system',
    'Test restoring a backup and know how long it actually takes',
    'Hand a system over to another team without losing the ability to maintain it',
    'Assess the real running cost before scaling, instead of finding out on the invoice',
  ],

  components: [
    { title: 'Architecture and written decisions', body: 'How it is set up and why, including the alternatives that were ruled out. It is what lets whoever comes next make changes without breaking things.' },
    { title: 'Integration layer', body: 'The links between systems with error handling, controlled retries and defined behaviour when the other side does not respond.' },
    { title: 'Monitoring and alerts', body: 'Failure detection that notifies a named owner. An alert nobody receives is the same as no alert at all.' },
    { title: 'Access and secrets management', body: 'Credentials kept out of the code, access by profile, defined rotation and revocation from a single point.' },
    { title: 'Backup and recovery', body: 'Frequency, retention and — the part that is usually missing — periodic restore tests with the time measured.' },
    { title: 'Documentation and handover', body: 'Runbooks for the likely failures, and the knowledge written down so the company does not depend on us to operate.' },
  ],

  integrations: [
    'Existing hosting and runtime platforms',
    'Identity providers and access management',
    'Databases and storage systems',
    'ERP, CRM and business systems, by API or by file',
    'Monitoring, logging and alerting tools',
    'Notification channels your team already uses',
  ],

  process: [
    { title: 'Map what exists', body: 'Which systems there are, how they connect, who has access and what has already failed. It is often the first time this ends up in a single document.' },
    { title: 'Find the single points of failure', body: 'What happens if each piece stops, and which of those outages the company cannot absorb. We prioritise by consequence, not by age.' },
    { title: 'Fix in order of risk', body: 'We start with what has the highest impact and the lowest effort. Rebuilding everything before reducing risk is the most expensive and slowest route.' },
    { title: 'Instrument', body: 'Enough monitoring, alerting and logging to diagnose without guessing — built into the system, not just around it.' },
    { title: 'Document and hand over', body: 'Runbooks, architecture decisions and team training. The handover is only complete when the company can operate without us.' },
  ],

  security: [
    'Credentials and keys managed outside the code, with defined rotation and revocation',
    'Access by profile on the principle of least privilege, reviewed periodically',
    'Encrypted communications, with sensitive data identified and handled separately',
    'Enough logging of access and changes to investigate an incident',
    'A recovery plan with a written procedure and a tested restore, not an assumed one',
  ],

  faq: [
    {
      q: 'Isn’t this the IT department’s job?',
      a: 'It is, when there is one with the time and remit to do it. In many companies IT keeps what already exists running and has no slack for architecture, observability and documentation. We work as reinforcement for that team, not as a replacement — and where the in-house team can take it on, our role is to leave them able to.',
    },
    {
      q: 'Can you guarantee the system will never fail?',
      a: 'No, and be wary of anyone who does. No infrastructure has absolute availability. What we guarantee is what is within our control: that the failure is detected, that someone is told, that there is a log to diagnose it and that there is a tested path to recovery.',
    },
    {
      q: 'Will we end up dependent on you?',
      a: 'That is exactly what this capability exists to prevent. Documentation, runbooks and training are part of the delivery, and we use mainstream technologies rather than a proprietary platform. If the company decides to change partner, it should be able to do so without rebuilding.',
    },
    {
      q: 'How much does it cost to keep this running after handover?',
      a: 'We estimate the running cost — hosting, licences, services — during the diagnostic and present it before the proposal, not after the invoice. An architecture that is cheap to build and expensive to run is a bad decision that only comes to light in the third month.',
    },
  ],

  seo: {
    title: 'Systems integration and security in Mozambique',
    description:
      'Systems integration, access management, monitoring and recovery, documented so that your company’s systems keep working and stay maintainable.',
  },

  updatedAt: '2026-09-29',
};
