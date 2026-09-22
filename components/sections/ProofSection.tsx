import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Reveal } from '@/components/motion/Reveal';
import type { ProofItem } from '@/content/types';

/**
 * O disclaimer de uma demonstração conceptual é renderizado fora de qualquer
 * âmbito de animação e nunca é atrasado nem escondido. É uma obrigação de
 * integridade, não um elemento de design.
 */
export function ProofSection({ items }: { items: ProofItem[] }) {
  return (
    <Reveal className="mt-12 grid gap-5 md:grid-cols-2">
      {items.map((item) => (
        <Card key={item.title} data-animate className="flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-display text-[length:var(--text-h3)]">{item.title}</h3>
            <Badge variant={item.kind === 'conceptual-demo' ? 'conceptual' : 'neutral'}>
              {item.kind === 'conceptual-demo'
                ? 'Demonstração'
                : item.kind === 'methodology'
                  ? 'Método'
                  : item.kind === 'capability'
                    ? 'Capacidade'
                    : 'Referência'}
            </Badge>
          </div>

          <p className="mt-3 flex-1 text-[color:var(--muted)]">{item.body}</p>

          {item.kind === 'conceptual-demo' && (
            <p className="mt-5 border-t border-[color:var(--border)] pt-4 text-[length:var(--text-micro)] text-[color:var(--muted)]">
              {item.disclaimer}
            </p>
          )}
          {item.kind === 'capability' && (
            <p className="mt-5 border-t border-[color:var(--border)] pt-4 text-[length:var(--text-micro)] text-[color:var(--muted)]">
              {item.evidence}
            </p>
          )}
          {item.kind === 'public-reference' && (
            <a
              href={item.sourceUrl}
              rel="noopener noreferrer"
              target="_blank"
              className="mt-5 border-t border-[color:var(--border)] pt-4 text-[length:var(--text-micro)] text-[color:var(--accent)] underline underline-offset-4"
            >
              Fonte
            </a>
          )}
        </Card>
      ))}
    </Reveal>
  );
}
