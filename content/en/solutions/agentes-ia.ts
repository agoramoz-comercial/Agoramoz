import type { SolutionPage } from '../../types';

/**
 * AI agents — the English page. Same promises as the Portuguese one, and the
 * same refusals: where the answers come from, what happens when the agent does
 * not know, who decides, and what happens to the data.
 */
export const agentesIaEn: SolutionPage = {
  slug: 'agentes-ia',
  label: 'AI agents',
  short: 'Assistants with a goal, sources, permissions and supervision.',

  hero: {
    eyebrow: 'Solution',
    h1: 'An assistant that answers confidently about what it does not know is worse than no assistant at all.',
    lead: 'We build agents with a declared scope, grounded in sources your company controls, with explicit permissions and human supervision on the decisions that need it. When they do not know, they say so and hand over to a person.',
  },

  result:
    'Cut the time spent answering the same questions and hunting for scattered information — without handing to a model decisions that must stay human.',

  problems: [
    {
      title: 'The same question, every day',
      body: 'Much of internal and external support is the same questions in different words, answered by hand, one by one, by people who had more skilled work to do.',
    },
    {
      title: 'The information exists, but nobody finds it',
      body: 'The answer is in a procedure, a contract or an email from two years ago. Whoever needs it does not know it exists, and asks someone who will also have to search.',
    },
    {
      title: 'A justified fear of invented answers',
      body: 'A generic assistant always answers, even without grounds. In a proposal, a contractual deadline or a technical requirement, a plausible wrong answer costs more than no answer.',
    },
    {
      title: 'Tools with no scope and no control',
      body: 'Nobody defined what data the assistant can reach, what actions it can take, who supervises it or what happens when it fails. Without that, the risk cannot be assessed.',
    },
  ],

  useCases: [
    'Answer frequent questions while citing the internal document the answer is based on',
    'Help the team find information in procedures, contracts and history',
    'Prepare a draft reply or proposal for a person to review and approve',
    'Extract structured data from incoming documents and flag what needs checking',
    'Triage requests by subject and urgency, routing them with context',
    'Gather the history of a customer or case before a meeting',
  ],

  components: [
    { title: 'Declared scope', body: 'What the agent does, what it does not do and for whom. Written before it exists and visible to the people who use it — an agent without a defined boundary cannot be assessed.' },
    { title: 'Sources your company controls', body: 'Answers are grounded in your documents and data, not in the model’s memory. That is what separates a verifiable answer from a plausible one.' },
    { title: 'Source citation', body: 'Every answer states the document it relied on, so the person receiving it can check rather than trust.' },
    { title: 'Limited permissions and actions', body: 'The agent reaches only what the asker’s profile allows, and only takes actions it has been explicitly given.' },
    { title: 'Human supervision', body: 'Decisions with financial, contractual, employment or compliance impact always go through the approval of a named person.' },
    { title: 'Monitoring and evaluation', body: 'A log of interactions, detection of out-of-scope answers and a set of test cases that is run again whenever something changes.' },
  ],

  integrations: [
    'Document repositories and internal procedures',
    'Email and messaging channels, including WhatsApp',
    'CRM and customer-service systems',
    'Databases and internal systems, read-only by default',
    'Existing knowledge tools and intranets',
    'Automation engines, for the actions the agent triggers',
  ],

  process: [
    { title: 'Pick one narrow task', body: 'We start with a frequent, verifiable, low-risk task. An agent that tries to do everything can be neither assessed nor corrected.' },
    { title: 'Prepare the sources', body: 'Answer quality is capped by the quality of what the agent reads. Outdated or contradictory documents produce wrong answers that look right — and that is fixed before, not after.' },
    { title: 'Set guardrails and escalation', body: 'What the agent refuses to answer, when it hands over to a person and what it says when it does not know. This is what decides whether it is safe to put it in front of a customer.' },
    { title: 'Evaluate with real cases', body: 'A set of questions with known answers, run before go-live and whenever the sources or the model change. Without measurement, “looks good” is all you have.' },
    { title: 'Go live with close follow-up', body: 'It starts under close supervision with interaction reviews, and the scope widens as the behaviour is confirmed.' },
  ],

  security: [
    'The agent reaches only the sources and data defined in its scope, with permissions by profile',
    'Critical decisions keep human approval — this cannot be configured down',
    'Sensitive data identified up front, with explicit rules on what is never sent to an external model',
    'Interaction log for audit, with retention agreed with you',
    'Defined behaviour on failure: the agent stops and escalates instead of improvising',
  ],

  faq: [
    {
      q: 'Will AI replace my team?',
      a: 'That is not the goal we work to, and it would not be honest to promise you either way. What we do is remove repetitive tasks and improve access to information. What the company does with the time freed up is a management decision for you — not a technical outcome we can guarantee in either direction.',
    },
    {
      q: 'How do we know it is not making answers up?',
      a: 'Three ways, and none of them is trust. Answers are grounded in your sources and cite the original document, so you can check. The agent is instructed to refuse what is out of scope and to escalate rather than guess. And there is a set of test cases with known answers that is run whenever something changes. We reduce the risk and make it verifiable; we do not eliminate it, and anyone who says they do is selling you something else.',
    },
    {
      q: 'Will our data train another company’s model?',
      a: 'That is an architecture decision we make with you before choosing the technology, based on how sensitive the data is. There are options with a contractual no-training commitment and self-hosted options, with different costs and capabilities. We set out the alternatives and what each one implies, rather than choosing for you.',
    },
    {
      q: 'Can we let the agent talk to customers directly?',
      a: 'It depends on the scope and the risk. For factual information about documented statuses and procedures, often yes. For prices, contractual deadlines, complaints or any binding commitment, we recommend a draft with human review. If the risk of a wrong answer is high, we say so rather than switch it on and hope.',
    },
  ],

  seo: {
    title: 'AI agents with sources, permissions and human supervision',
    description:
      'Assistants with a declared scope, grounded in your company’s sources, that cite where answers come from and escalate when they do not know. Critical decisions keep human approval.',
  },

  updatedAt: '2026-09-29',
};
