import type { SolutionPage } from '../../types';

export const automacaoDeProcessosEn: SolutionPage = {
  slug: 'automacao-de-processos',
  label: 'Process automation',
  short: 'Less repetitive work, fewer errors, fewer delays.',

  hero: {
    eyebrow: 'Solution',
    h1: 'The work your team repeats every day does not need a person to do it.',
    lead: 'Copying data between systems, preparing the same document, sending the same update, checking what has already been checked. We connect tasks, data and platforms so that this work happens on its own — and your team goes back to work that needs their skills.',
  },

  result:
    'Cut the time spent on repetitive tasks, end the manual re-entry of data between systems, and make sure nothing is left undone because someone forgot.',

  problems: [
    {
      title: 'Manual data re-entry',
      body: 'The same information is typed two or three times, into different systems. Every repetition is a chance for an error that only surfaces later.',
    },
    {
      title: 'Follow-up that depends on memory',
      body: 'The next step in the process happens when someone remembers. If that person is busy or away, the process stops and nobody notices.',
    },
    {
      title: 'Documents assembled by hand',
      body: 'Proposals, delivery notes, reports and confirmations are put together manually from information that is already stored somewhere else.',
    },
    {
      title: 'The same replies, over and over',
      body: 'A significant share of customer service is the same questions, answered one by one, with the same content.',
    },
  ],

  useCases: [
    'Create the CRM record from the website form, already classified and assigned',
    'Generate and send the proposal from the request data, without copying anything',
    'Tell the customer when their case changes status, without anyone writing the message',
    'Consolidate data from several sources into a report, on the agreed schedule',
    'Check deadlines and expiry dates and send alerts before they lapse',
    'Route requests to the right person by rules, not by who happens to be free',
  ],

  components: [
    { title: 'Map of the current process', body: 'Before automating, we make the process visible — including the steps nobody documented. Automating a misunderstood process multiplies the problem.' },
    { title: 'Automation engine', body: 'The flows that carry out the tasks, with conditions, exceptions and retries when something fails.' },
    { title: 'Integrations', body: 'Connections to the systems you already use — by API where there is one, by file import where there is not.' },
    { title: 'Business rules', body: 'The conditions that decide what happens, written legibly and changeable without development work.' },
    { title: 'Monitoring and alerts', body: 'When an automation fails, someone is told. A silent automation that fails is worse than manual work.' },
    { title: 'Documentation and training', body: 'The team has to know what is automated, what to do when something goes wrong and who to turn to.' },
  ],

  integrations: [
    'Corporate email and calendar',
    'CRM and sales tools',
    'ERP and accounting systems, when they expose an API',
    'File storage and e-signature',
    'Existing spreadsheets and databases',
    'Messages and notifications in the channels your team already uses',
  ],

  process: [
    { title: 'Observe the real process', body: 'Not the documented process — what the team actually does, including the exceptions nobody recorded.' },
    { title: 'Choose what to automate', body: 'Not everything should be automated. We prioritise by frequency, cost of error and implementation effort.' },
    { title: 'Build and test in parallel', body: 'The automation runs alongside the manual process until it proves it does the same, or better.' },
    { title: 'Go live with follow-up', body: 'The handover is supervised, with active monitoring in the first weeks.' },
    { title: 'Measure and extend', body: 'With the first flow stable and measured, we decide which one comes next with the best impact-to-effort ratio.' },
  ],

  security: [
    'Each automation runs with the minimum permissions it needs',
    'Actions on sensitive data are logged and auditable',
    'Failures raise an alert — they never go unnoticed',
    'Steps with financial or contractual impact keep human confirmation',
    'Credentials and keys managed outside the code, with a defined rotation',
  ],

  faq: [
    {
      q: 'Does automation mean letting people go?',
      a: 'The goal we work to is freeing time from repetitive tasks for work that needs judgement. What the company does with that time is your decision, not a technical outcome — and not something we can or should promise in either direction.',
    },
    {
      q: 'What if the automation fails and nobody notices?',
      a: 'That is the main risk in this kind of project, which is why monitoring is not optional. Every flow has failure detection and alerts a named owner. A silent automation that fails is worse than not having it.',
    },
    {
      q: 'Our systems are old and have no API. Can anything be done?',
      a: 'Often yes, through file import and export, the database or, as a last resort, interface automation. But each of these routes is more fragile than an API, and we tell you so at the start, with the associated risk, instead of discovering it halfway through.',
    },
    {
      q: 'How long until we see results?',
      a: 'It depends on the process. The diagnostic identifies the first flow with the best balance of impact and effort — usually the most frequent and simplest, not the most visible. We do not give timelines before we know the process.',
    },
  ],

  seo: {
    title: 'Business process automation',
    description:
      'We connect tasks, data and platforms to cut repetitive work, delays and manual data-entry errors. A diagnostic of the process comes before any automation.',
  },

  updatedAt: '2026-09-29',
};
