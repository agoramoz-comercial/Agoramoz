'use client';

import { useState, useTransition } from 'react';
import { Analisador, type RelatorioPronto } from '@/components/news/Analisador';
import { Button } from '@/components/ui/Button';
import type { ResultadoRascunho } from '@/lib/admin/news-actions';

type Criar = (entrada: { analise: unknown; idioma: string }) => Promise<ResultadoRascunho>;

/**
 * A redacção: o analisador de sempre e, por baixo de cada relatório, o passo
 * que o transforma em RASCUNHO de artigo. Publicar continua a ser outro passo,
 * no editor, por uma pessoa.
 */
export function RedaccaoNews({ criar }: { criar: Criar }) {
  return (
    <Analisador
      idioma="pt"
      depoisDoRelatorio={(r) => <CriarRascunho key={r.analise.titulo.titulo} relatorio={r} criar={criar} />}
    />
  );
}

function CriarRascunho({ relatorio, criar }: { relatorio: RelatorioPronto; criar: Criar }) {
  const [aCriar, comecar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <section
      aria-labelledby="redaccao-rascunho"
      className="mt-10 border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-6 print:hidden"
    >
      <h2 id="redaccao-rascunho" className="text-[length:var(--text-h3)] tracking-[-0.02em]">
        Levar ao jornal
      </h2>
      <p className="mt-2 max-w-[60ch] text-sm text-[color:var(--muted)]">
        Cria um <strong>rascunho</strong> com este relatório: título, entrada e secção propostos a
        partir da análise. Nada fica público até alguém rever e carregar em «Publicar».
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
              const r = await criar({ analise: relatorio.analise, idioma: relatorio.idioma });
              // No sucesso a acção abre o editor; só um erro volta aqui.
              if (r && !r.ok) setErro(r.motivo);
            });
          }}
        >
          {aCriar ? 'A criar o rascunho…' : 'Criar rascunho de artigo'}
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
