import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AdminHeading,
  DataHora,
  DataTable,
  EmptyState,
  Pagination,
  StateBadge,
} from '@/components/admin/primitives';
import { buttonVariants } from '@/components/ui/Button';
import { ESTADO_INQUERITO, estadoDoInquerito } from '@/lib/admin/labels';
import { fatiar, intervalo } from '@/lib/admin/paginacao';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';

export const metadata = { title: 'Inquéritos' };

interface Linha {
  id: string;
  name: string;
  active: boolean;
  updated_at: string;
  questionnaire_versions: {
    version: number;
    published_at: string | null;
    retired_at: string | null;
  }[];
}

export default async function InqueritosPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  if (serverEnv().SURVEYS !== 'on') notFound();
  const sessao = await requireStaff();
  const { pagina: paginaBruta } = await searchParams;
  const { pagina, de, ate } = intervalo(paginaBruta);

  const supabase = await createSessionClient();
  // Só `kind = 'survey'`: o questionário do diagnóstico nunca aparece aqui.
  const { data, error } = await supabase
    .from('questionnaires')
    .select(
      'id, name, active, updated_at, questionnaire_versions(version, published_at, retired_at)',
    )
    .eq('kind', 'survey')
    .order('updated_at', { ascending: false })
    .range(de, ate);
  const { linhas, haMais } = fatiar(data as unknown as Linha[] | null);

  return (
    <>
      <AdminHeading
        titulo="Inquéritos"
        descricao="Questionários partilhados por link. As respostas são anónimas, a menos que a pessoa deixe contacto e aceite o consentimento."
        accao={
          podeEscrever(sessao.papel) ? (
            <Link href="/admin/inqueritos/novo" className={buttonVariants({ size: 'sm' })}>
              Novo inquérito
            </Link>
          ) : undefined
        }
      />

      {error ? (
        <p
          role="alert"
          className="mb-6 border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]"
        >
          Não foi possível ler os inquéritos agora.
        </p>
      ) : (
        <DataTable
          legenda="Inquéritos"
          linhas={linhas}
          chaveDe={(l) => l.id}
          colunas={[
            {
              chave: 'nome',
              cabecalho: 'Nome',
              render: (l) => (
                <Link href={`/admin/inqueritos/${l.id}`} className="font-medium underline">
                  {l.name}
                </Link>
              ),
            },
            {
              chave: 'estado',
              cabecalho: 'Estado',
              render: (l) => (
                <StateBadge
                  rotulo={ESTADO_INQUERITO[estadoDoInquerito(l.active, l.questionnaire_versions)]}
                />
              ),
            },
            {
              chave: 'versao',
              cabecalho: 'Versão em vigor',
              numerico: true,
              render: (l) =>
                l.questionnaire_versions.find((v) => v.published_at && !v.retired_at)?.version ??
                '—',
            },
            {
              chave: 'rascunho',
              cabecalho: 'Por publicar',
              render: (l) => (l.questionnaire_versions.some((v) => !v.published_at) ? 'Sim' : '—'),
            },
            {
              chave: 'actualizado',
              cabecalho: 'Actualizado',
              render: (l) => <DataHora valor={l.updated_at} />,
            },
          ]}
          vazio={
            <EmptyState
              titulo="Ainda não há inquéritos."
              descricao={
                podeEscrever(sessao.papel)
                  ? 'Crie o primeiro: escreva as perguntas, publique e partilhe o link.'
                  : undefined
              }
            />
          }
        />
      )}

      <Pagination base="/admin/inqueritos" pagina={pagina} haMais={haMais} />
    </>
  );
}
