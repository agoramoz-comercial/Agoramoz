import { AdminHeading, DataHora, StateBadge } from '@/components/admin/primitives';
import { SurveyRenderer } from '@/components/inqueritos/SurveyRenderer';
import { Button } from '@/components/ui/Button';
import { ESTADO_INQUERITO, type EstadoInquerito } from '@/lib/admin/labels';
import type { SpecInquerito } from '@/lib/inqueritos/spec';
import { Construtor } from './Construtor';

/**
 * O ecrã de um inquérito: cabeçalho, estado, abrir/fechar e o construtor.
 * Recebe os dados e as acções por propriedade — a página real lê a base e
 * passa as Server Actions; a pré-visualização de QA passa exemplos.
 *
 * Quem tem o papel `leitura` vê a pré-visualização e nenhum controlo: o ecrã
 * decide o que mostrar, as funções da 0013 decidem o que acontece.
 */

const OK: Record<string, string> = {
  criado: 'Inquérito criado. Escreva as perguntas e publique quando estiver pronto.',
  guardado: 'Rascunho guardado. Quem responde só vê as alterações depois de publicar.',
  publicado: 'Publicado. Os links activos passam a mostrar esta versão.',
  link: 'Link criado. Copie-o ou descarregue o código QR na secção «Partilhar».',
  revogado: 'Link revogado: deixa de aceitar respostas.',
  '1': 'Registado.',
};

export interface DadosEditor {
  readonly id: string;
  readonly nome: string;
  readonly estado: EstadoInquerito;
  readonly emVigor: { readonly versao: number; readonly publicadaEm: string } | null;
  readonly temRascunho: boolean;
  /** O rascunho, se houver; senão a versão em vigor. */
  readonly spec: SpecInquerito;
}

export function EditorInquerito({
  dados,
  escreve,
  erro,
  ok,
  guardar,
  definirActivo,
  children,
}: {
  dados: DadosEditor;
  escreve: boolean;
  erro?: string;
  ok?: string;
  guardar: (formData: FormData) => Promise<void>;
  definirActivo: (formData: FormData) => Promise<void>;
  /** Secções antes do construtor (partilha e resultados). */
  children?: React.ReactNode;
}) {
  const { id, nome, estado, emVigor, temRascunho, spec } = dados;
  return (
    <>
      <AdminHeading
        titulo={nome}
        descricao={ESTADO_INQUERITO[estado].nota}
        accao={
          <div className="flex flex-wrap items-center gap-3">
            <StateBadge rotulo={ESTADO_INQUERITO[estado]} />
            {escreve && estado !== 'rascunho' && (
              <form action={definirActivo}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="activo" value={estado === 'aberto' ? 'nao' : 'sim'} />
                <Button type="submit" variant="outline" size="sm">
                  {estado === 'aberto' ? 'Fechar o inquérito' : 'Reabrir o inquérito'}
                </Button>
              </form>
            )}
          </div>
        }
      />

      {erro ? (
        <p
          role="alert"
          className="mb-6 border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]"
        >
          {erro}
        </p>
      ) : null}
      {ok && OK[ok] ? (
        <p role="status" className="mb-6 border border-[color:var(--border)] px-4 py-3 text-sm">
          {OK[ok]}
        </p>
      ) : null}

      <p className="mb-6 text-sm text-[color:var(--muted)]">
        {emVigor ? (
          <>
            Versão {emVigor.versao} em vigor desde <DataHora valor={emVigor.publicadaEm} />.
          </>
        ) : (
          'Ainda sem versão publicada.'
        )}
        {temRascunho ? ' Há alterações guardadas por publicar.' : ''}
      </p>

      {children}

      {escreve ? (
        <Construtor
          id={id}
          nomeInicial={nome}
          specInicial={spec}
          temRascunho={temRascunho}
          guardar={guardar}
        />
      ) : (
        <section aria-labelledby="previa-leitura" className="max-w-2xl">
          <h2 id="previa-leitura" className="mb-2 text-sm font-medium">
            Pré-visualização
          </h2>
          <p className="mb-4 text-sm text-[color:var(--muted)]">
            O seu papel permite ver, não editar.
          </p>
          <div
            data-surface="deep"
            className="bg-[color:var(--surface)] p-4 text-[color:var(--on-surface)]"
          >
            <p className="mb-4 text-[length:var(--text-lead)] font-bold text-balance">
              {spec.boasVindas.titulo}
            </p>
            <SurveyRenderer modo="previa" spec={spec} />
          </div>
        </section>
      )}
    </>
  );
}
