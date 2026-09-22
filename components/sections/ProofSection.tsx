import { Badge } from '@/components/ui/Badge';
import { Reveal } from '@/components/motion/Reveal';
import type { ProofItem } from '@/content/types';

const KIND_LABEL = {
  'conceptual-demo': 'Demonstração',
  methodology: 'Método',
  capability: 'Capacidade',
  'public-reference': 'Referência',
} as const;

/**
 * O disclaimer de uma demonstração conceptual é renderizado fora de qualquer
 * âmbito de animação e nunca é atrasado nem escondido. É uma obrigação de
 * integridade, não um elemento de design.
 */
export function ProofSection({ items }: { items: ProofItem[] }) {
  return (
    <Reveal className="mt-16">
      <ul className="grid md:grid-cols-2">
        {items.map((item, i) => (
          <li
            key={item.title}
            data-animate
            className="flex flex-col border-t border-[color:var(--hairline)] py-9 md:odd:pr-10 md:even:border-l md:even:border-l-[color:var(--hairline)] md:even:pl-10"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="rule-label text-[color:var(--muted)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <Badge variant={item.kind === 'conceptual-demo' ? 'conceptual' : 'neutral'}>
                {KIND_LABEL[item.kind]}
              </Badge>
            </div>

            <h3 className="mt-6 font-display text-[length:var(--text-h3)] font-semibold">
              {item.title}
            </h3>
            <p className="mt-3 flex-1 max-w-[44ch] text-[color:var(--muted)]">{item.body}</p>

            {item.kind === 'conceptual-demo' && (
              <p className="rule mt-6 pt-4 text-[length:var(--text-micro)] leading-relaxed text-[color:var(--muted)]">
                {item.disclaimer}
              </p>
            )}
            {item.kind === 'capability' && (
              <p className="rule mt-6 pt-4 text-[length:var(--text-micro)] leading-relaxed text-[color:var(--muted)]">
                {item.evidence}
              </p>
            )}
            {item.kind === 'public-reference' && (
              <a
                href={item.sourceUrl}
                rel="noopener noreferrer"
                target="_blank"
                className="rule-label rule mt-6 pt-4 text-[color:var(--accent)]"
              >
                Fonte →
              </a>
            )}
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
