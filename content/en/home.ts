import { DEMO_DISCLAIMER_EN } from '../types';
import type { FaqItem, Problem, ProofItem } from '../types';

/**
 * A página inicial em inglês: as mesmas secções de `content/site.ts`, com a
 * mesma forma e o mesmo número de itens (verificado em teste). Nenhuma
 * promessa que o português não faça — em particular, a secção de prova diz o
 * mesmo: empresa recente, sem resultados de clientes para mostrar.
 */

export const SYSTEM_FLOW_EN = {
  eyebrow: 'The system',
  title: 'We build the system between the problem and the result.',
  lead: 'Instead of delivering isolated tools, we design an infrastructure in which website, software, automation, data and artificial intelligence work as a single system.',
  steps: [
    { key: 'atrair', title: 'Attract', body: 'A digital presence that reaches the right company, with the message of the problem it recognises.' },
    { key: 'captar', title: 'Capture', body: 'Every request comes in through a defined path, with the data needed to handle it.' },
    { key: 'qualificar', title: 'Qualify', body: 'The system separates what is urgent, what is a good fit and what should wait.' },
    { key: 'acompanhar', title: 'Follow up', body: 'No opportunity sits waiting for someone to remember it.' },
    { key: 'entregar', title: 'Deliver', body: 'Operations receive structured information, not messages scattered across several channels.' },
    { key: 'medir', title: 'Measure', body: 'Sales, operations and bottlenecks become visible in simple, up-to-date data.' },
    { key: 'melhorar', title: 'Improve', body: 'Measurement feeds the next priority. The system evolves with real use.' },
  ],
} as const;

export const PROCESS_EN = {
  eyebrow: 'How we work',
  title: 'Technology after the diagnostic.',
  lead: 'The tool is a technical decision, not the product. First we understand the process, the volume, the delay and the likely cost of the inefficiency.',
  steps: [
    { title: 'Diagnostic', body: 'We map the process, the volumes, the delays, the errors and the likely cost of the inefficiency.' },
    { title: 'Architecture', body: 'We define the flow, the data, the integrations, the responsibilities and the acceptance criteria.' },
    { title: 'Prototype', body: 'We demonstrate the experience and validate the logic before the full implementation.' },
    { title: 'Implementation', body: 'We develop, integrate, test and document.' },
    { title: 'Activation', body: 'We train the team, follow the usage and fix technical blockers.' },
    { title: 'Evolution', body: 'We improve the system based on usage, data and economic priority.' },
  ],
} as const;

export const HOME_PROBLEMS_EN: Problem[] = [
  {
    title: 'Lost opportunities',
    body: 'Requests arrive through several channels, but nobody knows exactly who should reply or follow up.',
  },
  {
    title: 'Manual operations',
    body: 'The team copies data, updates spreadsheets, prepares documents and answers the same questions over and over.',
  },
  {
    title: 'Disconnected systems',
    body: 'Website, WhatsApp, email, CRM and internal tools all work separately.',
  },
  {
    title: 'Decisions without visibility',
    body: 'Management has no simple, up-to-date data on sales, operations, customers and bottlenecks.',
  },
];

export const RISK_REDUCTION_EN = {
  eyebrow: 'Risk reduction',
  title: 'Clear scope, responsibilities and criteria before we start.',
  body: 'Every project defines deliverables, dependencies, access, acceptance criteria, data protection, support and exclusions. We do not promise commercial results outside our control. We commit to the quality and working order of the agreed components.',
  points: [
    'Deliverables and exclusions written down before the start',
    'Acceptance criteria defined with the client',
    'Dependencies and access identified up front',
    'Data protection and human supervision on critical decisions',
  ],
} as const;

export const PROOF_EN: ProofItem[] = [
  {
    kind: 'methodology',
    title: 'The diagnostic comes before the proposal',
    body: 'We do not present an architecture without having mapped the current process. If the diagnostic concludes there is no fit, we say so — and there is no proposal.',
  },
  {
    kind: 'capability',
    title: 'Integration with what already exists',
    body: 'We work on top of the systems the company already uses, where there are APIs, permissions and documentation. Feasibility is validated before the final proposal, not after the contract.',
    evidence: 'Feasibility validation is a phase of the diagnostic, with a written result.',
  },
  {
    kind: 'conceptual-demo',
    title: 'Logistics operations portal',
    body: 'Orders, statuses, customer notifications and an operations dashboard in a single flow — built to show the logic before implementing it.',
    disclaimer: DEMO_DISCLAIMER_EN,
  },
  {
    kind: 'conceptual-demo',
    title: 'Automated sales qualification',
    body: 'A request comes in, is classified by fit and urgency, and is routed with the context needed by whoever has to reply.',
    disclaimer: DEMO_DISCLAIMER_EN,
  },
];

export const PROOF_SECTION_EN = {
  eyebrow: 'Proof',
  title: 'See how we design solutions before implementing them.',
  lead: 'AGORAMOZ is a young company. Instead of presenting results we do not yet have, we show the reasoning, the method and demonstrations labelled as such.',
} as const;

/** Só o texto: nomes, cargos, retratos e ligações vêm de `FOUNDERS`. */
export const FOUNDERS_EN = {
  eyebrow: 'Who leads',
  title: 'Strategy, technology and opportunity development.',
  body: {
    gerson: 'Responsible for digital strategy, growth systems, automation and artificial intelligence.',
    sheinaz: 'Responsible for strategic partnerships, opportunities, investment and development in the energy sector.',
  },
} as const;

export const HOME_FAQ_EN: FaqItem[] = [
  {
    q: 'Does AGORAMOZ only work with large companies?',
    a: 'No. We work with companies that have an economically relevant problem, an internal owner and the capacity to implement the solution.',
  },
  {
    q: 'Which technologies do you use?',
    a: 'We choose the architecture based on the problem, security, integration, maintenance and total cost. The tool is a technical decision, not the product.',
  },
  {
    q: 'Can you integrate with the systems we already use?',
    a: 'It depends on whether there are APIs, permissions, documentation and security requirements. Feasibility is validated before the final proposal.',
  },
  {
    q: 'Does artificial intelligence replace employees?',
    a: 'The main goal is to support people, reduce repetitive tasks and improve access to information. Critical decisions must keep human control and supervision.',
  },
  {
    q: 'Do you guarantee higher sales?',
    a: 'No. We do not guarantee results that depend on demand, the offer, pricing, the sales team or the client’s execution. We guarantee the technical and operational commitments defined in the contract.',
  },
  {
    q: 'How much does it cost?',
    a: 'The investment depends on the process, the integrations, the risk and the scope. The diagnostic determines whether a simple solution, a sprint or a custom system is needed.',
  },
];
