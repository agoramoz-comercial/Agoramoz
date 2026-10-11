import type { SolutionPage } from '../../types';

export const automacaoDeProcessosEn: SolutionPage = {
  slug: 'automacao-de-processos',
  label: 'Process automation',
  short: 'Less repetitive work, fewer errors, fewer delays.',

  hero: {
    eyebrow: 'Solution',
    h1: 'Automate the repetitive work, not the confusion.',
    lead: 'Automation creates value when the process has a clear objective, usable data, understood rules and owners for the exceptions. First we make the process visible; then we connect tasks, data and platforms so repetitive work stops depending on someone remembering it.',
  },

  result:
    'Fewer manual steps, errors and waits — with exceptions visible and an owner for each one.',

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
    'Data capture and validation',
    'Task assignment',
    'Document generation',
    'Notifications and approvals',
    'Updates between systems',
    'Qualification, alerts and reporting',
    'Exception routing',
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
    {
      q: 'When do you advise against automating?',
      a: 'When there is no owner, when the rule keeps changing, when the data lacks minimum quality, when the flow is not understood, when the decision is high-impact with no supervision, or when the cost exceeds the benefit. In those cases we say so — and the right next step is a different one.',
    },
    {
      q: 'How is the result measured?',
      a: 'By cycle time, manual steps, errors, exceptions, volume, capacity freed, usage, cost per transaction and incidents — measured against the diagnostic baseline, not against an estimate.',
    },
  ],

  seo: {
    title: 'Business process automation in Mozambique',
    description:
      'Business process automation: we connect tasks, data and platforms to cut repetitive work, delays and manual errors. A diagnostic of the process comes first.',
  },

  updatedAt: '2026-10-11',
};
