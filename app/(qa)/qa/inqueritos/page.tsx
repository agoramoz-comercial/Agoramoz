import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { CascaAdmin } from '@/components/admin/CascaAdmin';
import { EditorInquerito } from '@/components/admin/inqueritos/EditorInquerito';
import { Partilha } from '@/components/admin/inqueritos/Partilha';
import { Resultados } from '@/components/admin/inqueritos/Resultados';
import type { EntradaImportar } from '@/components/admin/inqueritos/ImportarTexto';
import type { ResultadoAccaoImportar } from '@/lib/admin/importar-inquerito';
import { SEM_RESERVADAS } from '@/lib/inqueritos/construtor';
import { importarTexto } from '@/lib/inqueritos/importar/servidor';
import { qrDe } from '@/lib/inqueritos/qr';
import { specInquerito } from '@/lib/inqueritos/spec';

/**
 * Pré-visualização do construtor de inquéritos para o QA visual, sem sessão
 * nem base. Só com `ADMIN_PREVIEW=on` e nunca na produção da Vercel.
 *
 * O inquérito é UM EXEMPLO. As acções não escrevem nada: voltam a esta
 * página. `?papel=leitura` mostra a vista sem edição; `?vista=resultados`, os
 * resultados com números de exemplo. Os links e o QR são de exemplo: o
 * token não foi derivado de segredo nenhum e não abre nada.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pré-visualização do construtor',
  robots: { index: false, follow: false, nocache: true },
};

async function semEfeito(): Promise<void> {
  'use server';
  redirect('/qa/inqueritos?ok=guardado');
}

/**
 * «Colar e transformar» de QA: SÓ o analisador local (`kimi: null` — sem
 * chave, sem rede, sem base). Pedir o Kimi aqui cai para o local e mostra o
 * aviso, que é o comportamento real sem chave configurada. A guarda repete-se
 * dentro da acção: o id de uma Server Action existe no bundle mesmo quando a
 * página responde 404.
 */
async function importarQa(entrada: EntradaImportar): Promise<ResultadoAccaoImportar> {
  'use server';
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV === 'production')
    return { ok: false, motivo: 'Indisponível.' };
  const base = specInquerito.safeParse(entrada?.base);
  const texto = typeof entrada?.texto === 'string' ? entrada.texto.slice(0, 20_000) : '';
  if (!base.success || !texto.trim()) return { ok: false, motivo: 'Pedido inválido.' };
  return importarTexto(
    {
      texto,
      motor: entrada.motor === 'kimi' ? 'kimi' : 'local',
      modo: entrada.modo === 'acrescentar' ? 'acrescentar' : 'substituir',
      base: base.data,
      reservadas: SEM_RESERVADAS,
    },
    { kimi: null },
  );
}

const ID = '00000000-0000-4000-8000-000000000001';

const EXEMPLO = specInquerito.parse({
  schemaVersion: 'survey.v1',
  idioma: 'pt',
  boasVindas: {
    titulo: 'Como trabalha a sua equipa hoje',
    corpo: 'Exemplo de QA. Três perguntas.',
  },
  agradecimento: { titulo: 'Resposta registada. Obrigado.' },
  perguntas: [
    {
      tipo: 'escolha_unica',
      chave: 'p1',
      titulo: 'A empresa usa um ERP?',
      obrigatoria: true,
      opcoes: [
        { chave: 'o1', rotulo: 'Sim' },
        { chave: 'o2', rotulo: 'Não' },
      ],
    },
    {
      tipo: 'texto_curto',
      chave: 'p2',
      titulo: 'Qual?',
      obrigatoria: true,
      mostrarSe: { pergunta: 'p1', op: 'igual', valor: 'o1' },
    },
    { tipo: 'nps', chave: 'p3', titulo: 'Recomendaria a AGORAMOZ a um colega?' },
  ],
});

export default async function PreviaConstrutorPage({
  searchParams,
}: {
  searchParams: Promise<{ papel?: string; ok?: string; vista?: string; ia?: string }>;
}) {
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV === 'production') notFound();
  const { papel, ok, vista, ia } = await searchParams;
  const leitura = papel === 'leitura';
  const urlExemplo = 'https://agoramoz.com/i/EXEMPLOexemploEXEMPLOexemploEXEMPLOexempl_-';

  return (
    <div
      data-surface="light"
      className="min-h-screen bg-[color:var(--surface)] text-[color:var(--on-surface)]"
    >
      <p
        role="note"
        className="bg-[color:var(--on-surface)] px-4 py-2 text-center text-xs text-[color:var(--surface)]"
      >
        Pré-visualização de QA — inquérito de exemplo, nada é guardado.
      </p>
      <CascaAdmin
        sessao={{
          nome: 'Pré-visualização',
          email: 'qa@exemplo.test',
          papel: leitura ? 'leitura' : 'comercial',
        }}
        inqueritos
      >
        {vista === 'resultados' ? (
          <Resultados
            id={ID}
            nome="Levantamento de processos (exemplo)"
            versao={2}
            spec={EXEMPLO}
            resultados={{
              total: 42,
              porPergunta: {
                p1: { respondidas: 42, valores: { o1: 25, o2: 17 }, media: null },
                p2: { respondidas: 25, valores: {}, media: null },
                p3: {
                  respondidas: 38,
                  valores: { '10': 12, '9': 9, '8': 7, '7': 4, '6': 3, '3': 2, '0': 1 },
                  media: 8.05,
                },
              },
            }}
            desistencia={{ estado: 'ok', iniciados: 61, porPasso: [58, 33, 47] }}
            escreve={!leitura}
          />
        ) : (
          <EditorInquerito
            dados={{
              id: ID,
              nome: 'Levantamento de processos (exemplo)',
              estado: 'aberto',
              emVigor: { versao: 2, publicadaEm: '2026-10-01T09:00:00.000Z' },
              temRascunho: false,
              spec: EXEMPLO,
            }}
            escreve={!leitura}
            ok={ok}
            guardar={semEfeito}
            definirActivo={semEfeito}
            importar={importarQa}
            iaDisponivel={ia === '1'}
            modeloIA={ia === '1' ? 'kimi-k2.6' : undefined}
          >
            <Partilha
              inqueritoId={ID}
              estadoInquerito="aberto"
              totalRespostas={42}
              escreve={!leitura}
              semSegredo={false}
              criarLink={semEfeito}
              revogarLink={semEfeito}
              links={[
                {
                  id: '00000000-0000-4000-8000-0000000000a1',
                  rotulo: 'Clientes · Outubro (exemplo)',
                  criadoEm: '2026-10-01T09:30:00.000Z',
                  expiraEm: '2026-10-31T21:59:59.000Z',
                  max: 200,
                  respostas: 37,
                  estado: 'activo',
                  url: urlExemplo,
                  qr: qrDe(urlExemplo),
                },
                {
                  id: '00000000-0000-4000-8000-0000000000a2',
                  rotulo: 'Evento de Setembro (exemplo)',
                  criadoEm: '2026-09-10T09:30:00.000Z',
                  expiraEm: null,
                  max: 5,
                  respostas: 5,
                  estado: 'esgotado',
                  url: null,
                  qr: null,
                },
                {
                  id: '00000000-0000-4000-8000-0000000000a3',
                  rotulo: null,
                  criadoEm: '2026-09-01T09:30:00.000Z',
                  expiraEm: null,
                  max: null,
                  respostas: 0,
                  estado: 'revogado',
                  url: null,
                  qr: null,
                },
              ]}
            />
          </EditorInquerito>
        )}
      </CascaAdmin>
    </div>
  );
}
