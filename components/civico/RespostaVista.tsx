import { Badge } from '@/components/ui/Badge';
import { CIVICO } from '@/content/civico';
import type { Bloco, Fonte, Resposta, Trecho } from '@/lib/civico/resposta';
import type { AlertaVigencia, Vigencia } from '@/lib/civico/vigencia';
import { cn } from '@/lib/utils/cn';

/**
 * A resposta desenhada: os avisos de vigência, o corpo, as ligações numeradas
 * e os diplomas citados.
 *
 * Só lê os modelos de `lib/civico/` — não há Markdown nem HTML do motor a
 * chegar aqui. Cada ligação do texto leva o número da sua fonte, e a lista no
 * fim escreve o domínio por extenso: quem lê vê para onde vai antes de clicar.
 *
 * Sem cor decorativa: a hierarquia vem do tipo de letra e do traço, como no
 * resto do site. O sinal (vermelho) aparece numa só coisa — o aviso de lei
 * revogada — porque é um estado de erro, não um enfeite.
 */

const LIGACAO =
  'underline decoration-[color:var(--muted)] underline-offset-4 hover:decoration-[color:var(--on-surface)]';

function Trechos({ trechos }: { trechos: readonly Trecho[] }) {
  return (
    <>
      {trechos.map((x, i) => {
        const chave = `${i}-${x.t}`;
        if (x.t === 'forte') return <strong key={chave}>{x.v}</strong>;
        if (x.t === 'enfase') return <em key={chave}>{x.v}</em>;
        if (x.t === 'ligacao') {
          return (
            <a key={chave} href={x.href} target="_blank" rel="noopener noreferrer" className={LIGACAO}>
              {x.v}
              <sup className="font-techno ml-0.5 text-[0.6875rem] tabular-nums text-[color:var(--muted)]">[{x.n}]</sup>
              <span className="sr-only"> {CIVICO.abreNoutroSeparador}</span>
            </a>
          );
        }
        return <span key={chave}>{x.v}</span>;
      })}
    </>
  );
}

const CORPO = 'text-[1.0625rem] leading-[1.7] text-pretty';

function BlocoVista({ bloco }: { bloco: Bloco }) {
  switch (bloco.tipo) {
    case 'titulo':
      return (
        <h3 className="mt-9 text-[length:var(--text-h3)] font-bold tracking-[var(--tracking-heading)] first:mt-0">
          {bloco.texto}
        </h3>
      );
    case 'paragrafo':
      return (
        <p className={`${CORPO} mt-4 first:mt-0`}>
          <Trechos trechos={bloco.trechos} />
        </p>
      );
    case 'citacao':
      return (
        <blockquote className={`${CORPO} mt-5 border-l-2 border-[color:var(--on-surface)] pl-5 text-[color:var(--muted)] first:mt-0`}>
          <Trechos trechos={bloco.trechos} />
        </blockquote>
      );
    case 'lista': {
      const Lista = bloco.ordenada ? 'ol' : 'ul';
      return (
        <Lista className={`${CORPO} mt-4 grid gap-2.5 first:mt-0`} role="list">
          {bloco.itens.map((item, i) => (
            <li key={i} className="flex gap-3.5">
              {bloco.ordenada ? (
                <span aria-hidden className="font-techno mt-[0.35em] w-6 shrink-0 text-sm tabular-nums text-[color:var(--muted)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
              ) : (
                <span aria-hidden className="mt-[0.72em] size-1.5 shrink-0 bg-[color:var(--on-surface)]" />
              )}
              <span className="min-w-0">
                {bloco.ordenada && <span className="sr-only">{i + 1}. </span>}
                <Trechos trechos={item} />
              </span>
            </li>
          ))}
        </Lista>
      );
    }
    case 'tabela':
      return (
        // `tabIndex`: uma tabela larga num telemóvel desliza, e quem usa teclado tem de a alcançar.
        <div
          className="mt-5 overflow-x-auto border border-[color:var(--border)] first:mt-0"
          tabIndex={0}
          role="group"
          aria-label={CIVICO.tabelaAria}
        >
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {bloco.cabecalho.map((c, i) => (
                  <th key={i} scope="col" className="rule-label border-b border-[color:var(--border)] px-4 py-3 text-[color:var(--muted)]">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloco.linhas.map((linha, i) => (
                <tr key={i} className="border-b border-[color:var(--border)] last:border-b-0">
                  {linha.map((c, j) => (
                    <td key={j} className="px-4 py-3 align-top">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function FonteVista({ fonte }: { fonte: Fonte }) {
  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-baseline gap-x-3 border-t border-dashed border-[color:var(--hairline)] py-3.5">
      <span aria-hidden className="font-techno text-sm tabular-nums text-[color:var(--muted)]">
        {String(fonte.n).padStart(2, '0')}
      </span>
      <span className="min-w-0">
        <a href={fonte.href} target="_blank" rel="noopener noreferrer" className={cn(LIGACAO, 'font-medium [overflow-wrap:anywhere]')}>
          {fonte.titulo}
          <span className="sr-only"> {CIVICO.abreNoutroSeparador}</span>
        </a>
        <span className="mt-1.5 flex flex-wrap items-center gap-2.5">
          {/* Um endereço solto tem o domínio por título: não se escreve duas vezes. */}
          {fonte.titulo !== fonte.dominio && (
            <span className="font-techno text-[length:var(--text-micro)] tracking-[0.08em] text-[color:var(--muted)] [overflow-wrap:anywhere]">
              {fonte.dominio}
            </span>
          )}
          {fonte.estado && (
            <Badge>
              <span aria-hidden>{CIVICO.fonteEstado}</span>
              <span className="sr-only">{CIVICO.fonteEstadoAria}</span>
            </Badge>
          )}
        </span>
      </span>
    </li>
  );
}

/* ---------------------------------------------------------------- vigência */

const dataPt = (iso: string) => iso.split('-').reverse().join('/');

/**
 * O aviso de lei revogada. Vem ANTES da resposta, e nunca é escondido,
 * atrasado nem animado: quem vai ler uma regra que pode já não valer tem de o
 * saber antes de a ler.
 */
function Alerta({ alerta }: { alerta: AlertaVigencia }) {
  const grave = alerta.tipo === 'revogado';
  return (
    <div
      role={grave ? 'alert' : 'note'}
      className={cn(
        'border p-5 sm:p-6',
        grave ? 'border-2 border-[color:var(--signal)]' : 'border-dashed border-[color:var(--on-surface)]',
      )}
    >
      <p className={cn('font-display text-lg font-bold tracking-[var(--tracking-heading)]', grave && 'text-[color:var(--signal)]')}>
        {grave ? CIVICO.vigenciaRevogadoTitulo : CIVICO.vigenciaMencionadoTitulo}
      </p>
      <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
        <dt className="rule-label pt-0.5 text-[color:var(--muted)]">{CIVICO.vigenciaCitado}</dt>
        <dd className={cn('font-medium', grave && 'line-through decoration-[color:var(--signal)] decoration-2')}>
          {alerta.revogado}
        </dd>
        <dt className="rule-label pt-0.5 text-[color:var(--muted)]">{CIVICO.vigenciaSubstituto}</dt>
        <dd className="font-medium">
          {alerta.substituto}
          {alerta.nota && <span className="mt-1 block font-normal text-[color:var(--muted)]">{alerta.nota}</span>}
        </dd>
      </dl>
      <p className="mt-4 text-sm">{grave ? CIVICO.vigenciaRevogadoCorpo : CIVICO.vigenciaMencionadoCorpo}</p>
      <p className="mt-3 text-sm">
        <a href={alerta.fonte.href} target="_blank" rel="noopener noreferrer" className={cn(LIGACAO, 'font-medium')}>
          {CIVICO.vigenciaVer}
          <span aria-hidden> ↗</span>
          <span className="sr-only"> {CIVICO.abreNoutroSeparador}</span>
        </a>
      </p>
    </div>
  );
}

function Diplomas({ vigencia }: { vigencia: Vigencia }) {
  if (vigencia.diplomas.length === 0) return null;
  return (
    <section aria-labelledby="civico-diplomas" className="mt-10">
      <h3 id="civico-diplomas" className="rule-label text-[color:var(--muted)]">
        {CIVICO.diplomasTitulo}
      </h3>
      <ul className="mt-3 border-b border-dashed border-[color:var(--hairline)]" role="list">
        {vigencia.diplomas.map((d) => (
          <li
            key={d.nome}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-dashed border-[color:var(--hairline)] py-3"
          >
            <span className={cn('font-medium', d.estado === 'revogado' && 'line-through decoration-[color:var(--signal)] decoration-2')}>
              {d.nome}
            </span>
            <span
              className={cn(
                'rule-label inline-flex items-center px-2.5 py-1',
                d.estado === 'revogado' && 'border-2 border-[color:var(--signal)] text-[color:var(--signal)]',
                d.estado === 'substituto' && 'bg-[color:var(--on-surface)] text-[color:var(--surface)]',
                d.estado === 'por-verificar' && 'border border-dashed border-[color:var(--border)] text-[color:var(--muted)]',
              )}
            >
              {CIVICO.diplomaEstado[d.estado]}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 max-w-[70ch] text-[length:var(--text-micro)] leading-relaxed text-[color:var(--muted)]">
        {CIVICO.diplomasNota.replace('{data}', dataPt(vigencia.verificadoEm))}
      </p>
    </section>
  );
}

export function RespostaVista({
  resposta,
  vigencia,
  aEscrever = false,
}: {
  resposta: Resposta;
  /** Só existe na resposta final: é calculada no servidor sobre o texto inteiro. */
  vigencia?: Vigencia | null;
  /** O motor ainda está a escrever: só o corpo, com o cursor. */
  aEscrever?: boolean;
}) {
  return (
    <>
      {vigencia && vigencia.alertas.length > 0 && (
        <div className="mb-8 grid gap-4">
          {vigencia.alertas.map((a) => (
            <Alerta key={a.id} alerta={a} />
          ))}
        </div>
      )}

      <div className="max-w-[70ch]">
        {resposta.blocos.map((b, i) => (
          <BlocoVista key={i} bloco={b} />
        ))}
        {aEscrever && <span aria-hidden className="civico-cursor" />}
      </div>

      {!aEscrever &&
        (resposta.fontes.length > 0 ? (
          <section aria-labelledby="civico-fontes" className="mt-10">
            <h3 id="civico-fontes" className="rule-label text-[color:var(--muted)]">
              {CIVICO.fontesTitulo}
            </h3>
            <ol className="mt-3 border-b border-dashed border-[color:var(--hairline)]" role="list">
              {resposta.fontes.map((f) => (
                <FonteVista key={f.n} fonte={f} />
              ))}
            </ol>
          </section>
        ) : (
          // Nunca escondido nem atrasado: é uma obrigação de integridade, não decoração.
          <p className="mt-10 border border-dashed border-[color:var(--on-surface)] p-4 text-sm font-medium">
            {CIVICO.semFonte}
          </p>
        ))}

      {!aEscrever && vigencia && <Diplomas vigencia={vigencia} />}
    </>
  );
}
