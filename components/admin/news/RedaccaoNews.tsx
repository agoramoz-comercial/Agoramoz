'use client';

import { useId, useState, useTransition } from 'react';
import { Analisador, type RelatorioPronto } from '@/components/news/Analisador';
import { inputClass } from '@/components/form/Field';
import { Button } from '@/components/ui/Button';
import type { ResultadoRascunho } from '@/lib/admin/news-actions';
import { NOME_DO_PAIS, PAISES_NEWS, ePaisNews, type PaisNews } from '@/lib/news/paises';
import { unstable_rethrow } from 'next/navigation';

type Criar = (entrada: {
  analise: unknown;
  idioma: string;
  pais: string;
  fonte?: string;
}) => Promise<ResultadoRascunho>;

/**
 * A redacção, pela ordem da decisão:
 * 1. o país que a notícia afecta directamente (obrigatório);
 * 2. o documento (colado) ou o link → «Analisar» (motor base);
 * 3. rever o relatório e «Criar rascunho» — com a análise profunda ZABATAINA
 *    3000 para esse país, se estiver ligada e houver documento colado;
 * 4. no editor: rever, fotografia, publicar (caixa «Revi…»).
 */
export function RedaccaoNews({ criar, profundaLigada }: { criar: Criar; profundaLigada: boolean }) {
  const [pais, setPais] = useState<PaisNews | ''>('');
  const id = useId();

  return (
    <div className="grid gap-8">
      <div className="grid max-w-md gap-2">
        <label htmlFor={`${id}-pais`} className="text-sm font-medium">
          1. País que esta notícia afecta directamente
        </label>
        <select
          id={`${id}-pais`}
          required
          value={pais}
          onChange={(e) => setPais(ePaisNews(e.target.value) ? e.target.value : '')}
          className={inputClass}
          aria-describedby={`${id}-pais-nota`}
        >
          <option value="" disabled>
            Escolha o país…
          </option>
          {PAISES_NEWS.map((p) => (
            <option key={p} value={p}>
              {NOME_DO_PAIS[p].pt}
            </option>
          ))}
        </select>
        <p id={`${id}-pais-nota`} className="text-xs text-[color:var(--muted)]">
          {profundaLigada
            ? 'A análise profunda ZABATAINA 3000 é feita para este país. Cole o documento (modo «Texto») para ela correr: os números são verificados contra ele.'
            : 'A análise profunda está desligada (NEWS_ANALISE_PROFUNDA=off): o artigo sai com a análise base.'}
        </p>
      </div>

      {pais ? (
        <Analisador
          idioma="pt"
          depoisDoRelatorio={(r) => (
            <CriarRascunho
              key={r.analise.titulo.titulo}
              relatorio={r}
              pais={pais}
              profundaLigada={profundaLigada}
              criar={criar}
            />
          )}
        />
      ) : (
        <p className="border border-dashed border-[color:var(--border)] px-4 py-6 text-sm text-[color:var(--muted)]">
          Escolha primeiro o país: só depois aparece o campo para colar o documento.
        </p>
      )}
    </div>
  );
}

function CriarRascunho({
  relatorio,
  pais,
  profundaLigada,
  criar,
}: {
  relatorio: RelatorioPronto;
  pais: PaisNews;
  profundaLigada: boolean;
  criar: Criar;
}) {
  const [aCriar, comecar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const comProfunda = profundaLigada && !!relatorio.fonte;

  return (
    <section
      aria-labelledby="redaccao-rascunho"
      className="mt-10 border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-6 print:hidden"
    >
      <h2 id="redaccao-rascunho" className="text-[length:var(--text-h3)] tracking-[-0.02em]">
        Levar ao jornal
      </h2>
      <p className="mt-2 max-w-[60ch] text-sm text-[color:var(--muted)]">
        Cria um <strong>rascunho</strong> para <strong>{NOME_DO_PAIS[pais].pt}</strong> com este relatório: título,
        entrada e secção propostos a partir da análise.{' '}
        {comProfunda
          ? 'Junta a análise profunda ZABATAINA 3000 (até 1 minuto).'
          : profundaLigada
            ? 'Analisou por link: a análise profunda pode ser gerada no editor, colando o documento.'
            : ''}{' '}
        Nada fica público até alguém rever e carregar em «Publicar».
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          aria-disabled={aCriar}
          onClick={() => {
            if (aCriar) return;
            setErro(null);
            comecar(async () => {
              try {
                const r = await criar({
                  analise: relatorio.analise,
                  idioma: relatorio.idioma,
                  pais,
                  ...(comProfunda ? { fonte: relatorio.fonte } : {}),
                });
                if (r && !r.ok) setErro(r.motivo);
              } catch (e) {
                unstable_rethrow(e);
                setErro('Não foi possível criar o rascunho agora. Tente de novo.');
              }
            });
          }}
        >
          {aCriar ? (comProfunda ? 'A criar e a analisar a fundo…' : 'A criar o rascunho…') : 'Criar rascunho de artigo'}
        </Button>
        {erro && (
          <p role="alert" className="text-sm text-[color:var(--color-signal-700)]">
            {erro}
          </p>
        )}
      </div>
    </section>
  );
}
