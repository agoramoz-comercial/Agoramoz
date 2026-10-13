'use client';

import { useId, useState } from 'react';
import { CASA_REFERENCIA } from '@/content/projetos/fazenda-inteligente-001';
import { classificar, responder, SUGESTOES, type Intencao, type Resposta } from '@/lib/terrabuild/assistente';
import { useGemeo } from './estado';
import { useRastreio } from './rastreio';
import { ROTULO } from './ui';

/**
 * O assistente de projeto: perguntas sugeridas ou escritas, respostas
 * calculadas com o estado atual da página. Não chama nenhum modelo e nada sai
 * do navegador — e diz isso.
 */

interface Troca {
  readonly id: number;
  readonly pergunta: string;
  readonly resposta: Resposta;
}

const BOAS_VINDAS =
  'Esta é a demonstração do assistente de projeto da AGORAMOZ. Não é um modelo de IA: reconhece palavras-chave e responde com os números que está a ver nesta página — o terreno, a casa, os materiais, a variação do custo, a água, os riscos, os cenários e os marcos.';

export function Assistente() {
  const { projeto: p, estado } = useGemeo();
  const rastrear = useRastreio(p.slug);
  const [conversa, setConversa] = useState<readonly Troca[]>([]);
  const [texto, setTexto] = useState('');
  const idCampo = useId();

  const perguntar = (pergunta: string, intencao?: Intencao | null) => {
    const q = pergunta.trim().slice(0, 200);
    if (!q) return;
    rastrear('assistant');
    const i = intencao === undefined ? classificar(q) : intencao;
    const resposta = responder(i, {
      projeto: p,
      referencia: CASA_REFERENCIA,
      casa: estado.casa,
      classe: estado.classe,
      fase: estado.fase,
      cultura: estado.cultura,
      hectares: estado.hectares,
      alternativa: estado.alternativa,
    });
    setConversa((c) => [...c.slice(-7), { id: (c.at(-1)?.id ?? 0) + 1, pergunta: q, resposta }]);
    setTexto('');
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="flex flex-col gap-3 lg:col-span-4">
        <p className={ROTULO}>Perguntas sugeridas</p>
        <ul className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
          {SUGESTOES.map((s) => (
            <li key={s.intencao}>
              <button
                type="button"
                onClick={() => perguntar(s.pergunta, s.intencao)}
                className="min-h-11 border border-[color:var(--border)] px-3 text-left text-sm hover:border-[color:var(--on-surface)]"
              >
                {s.pergunta}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-4 lg:col-span-8">
        {/* O papel «log» fica no contentor: numa <ol> apagava a semântica de lista dos <li>. */}
        <div role="log" aria-live="polite" aria-label="Conversa com o assistente" data-testid="assistente-conversa">
          <ol className="flex flex-col gap-4">
            <li className="max-w-[60ch] border-l-2 border-[color:var(--on-surface)] pl-4 text-sm">{BOAS_VINDAS}</li>
            {conversa.map((t) => (
              <li key={t.id} className="flex flex-col gap-2">
                <p className="max-w-[50ch] self-end bg-[color:var(--surface-raised)] px-3 py-2 text-sm">{t.pergunta}</p>
                <div className="max-w-[60ch] border-l-2 border-[color:var(--on-surface)] pl-4 text-sm">
                  <p>{t.resposta.texto}</p>
                  {t.resposta.ancora ? (
                    <a href={t.resposta.ancora} className="mt-1 inline-flex min-h-11 items-center text-xs underline">
                      Ver na página
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            perguntar(texto);
          }}
        >
          <label htmlFor={idCampo} className="sr-only">
            Pergunta ao assistente
          </label>
          <input
            id={idCampo}
            type="text"
            value={texto}
            maxLength={200}
            autoComplete="off"
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Por exemplo: porque mudou o custo?"
            className="min-h-11 flex-1 border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm"
          />
          <button
            type="submit"
            className="min-h-11 bg-[color:var(--color-signal-600)] px-5 text-sm font-semibold text-white hover:bg-[color:var(--color-signal-700)]"
          >
            Perguntar
          </button>
        </form>
        <p className="text-xs text-[color:var(--muted)]">
          Respostas calculadas no seu navegador a partir desta demonstração; nenhuma pergunta é enviada ou guardada. Numa versão real, um
          modelo de IA usaria estes mesmos cálculos como ferramentas, com registo de cada resposta e validação humana.
        </p>
      </div>
    </div>
  );
}
