import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EstadoInquerito, type EstadoMostrado } from '@/components/inqueritos/EstadoInquerito';
import { CascaInquerito, PaginaInquerito } from '@/components/inqueritos/PaginaInquerito';
import { specInquerito, type SpecInquerito } from '@/lib/inqueritos/spec';

/**
 * Pré-visualização da página de quem responde, para o QA visual (Playwright
 * + axe), sem base. Só existe com `ADMIN_PREVIEW=on`, que não está definido
 * na Vercel: em produção é 404.
 *
 * O inquérito aqui é UM EXEMPLO, com um tipo de pergunta de cada. O envio vai
 * para `/api/inqueritos` como na página real — o script de QA intercepta-o.
 * `?idioma=en` mostra a versão inglesa; `?estado=fechado|expirado|indisponivel`
 * os ecrãs sem formulário.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pré-visualização do inquérito',
  robots: { index: false, follow: false, nocache: true },
};

const TOKEN_EXEMPLO = 'QAqaQAqaQAqaQAqaQAqaQAqaQAqaQAqaQAqaQAqa_-0';
const ID_EXEMPLO = '00000000-0000-4000-8000-000000000001';

function exemplo(idioma: 'pt' | 'en'): SpecInquerito {
  const pt = idioma === 'pt';
  return specInquerito.parse({
    schemaVersion: 'survey.v1',
    idioma,
    boasVindas: {
      titulo: pt ? 'Como trabalha a sua equipa hoje' : 'How your team works today',
      corpo: pt
        ? 'Exemplo de QA. Sete perguntas curtas sobre processos e ferramentas.'
        : 'QA example. Seven short questions about processes and tools.',
    },
    agradecimento: {
      titulo: pt ? 'Resposta registada. Obrigado.' : 'Response recorded. Thank you.',
      corpo: pt ? 'A equipa lê todas as respostas.' : 'The team reads every response.',
    },
    perguntas: [
      {
        tipo: 'escolha_unica',
        chave: 'usa_erp',
        titulo: pt ? 'A empresa usa um ERP?' : 'Does the company use an ERP?',
        obrigatoria: true,
        opcoes: [
          { chave: 'sim', rotulo: pt ? 'Sim' : 'Yes' },
          { chave: 'nao', rotulo: pt ? 'Não' : 'No' },
          { chave: 'nao_sei', rotulo: pt ? 'Não sei' : "I don't know" },
        ],
      },
      {
        tipo: 'texto_curto',
        chave: 'qual_erp',
        titulo: pt ? 'Qual?' : 'Which one?',
        obrigatoria: true,
        max: 80,
        mostrarSe: { pergunta: 'usa_erp', op: 'igual', valor: 'sim' },
      },
      { tipo: 'seccao', chave: 'equipa', titulo: pt ? 'Sobre a equipa' : 'About the team' },
      {
        tipo: 'escolha_multipla',
        chave: 'areas',
        titulo: pt
          ? 'Que áreas gastam mais tempo em tarefas repetidas?'
          : 'Which areas spend most time on repetitive work?',
        ajuda: pt ? 'Escolha as que se aplicam.' : 'Choose all that apply.',
        max: 3,
        opcoes: [
          { chave: 'financas', rotulo: pt ? 'Finanças' : 'Finance' },
          { chave: 'vendas', rotulo: pt ? 'Vendas' : 'Sales' },
          { chave: 'rh', rotulo: pt ? 'Recursos humanos' : 'People' },
          { chave: 'operacoes', rotulo: pt ? 'Operações' : 'Operations' },
        ],
      },
      {
        tipo: 'numero',
        chave: 'pessoas',
        titulo: pt
          ? 'Quantas pessoas trabalham na empresa?'
          : 'How many people work at the company?',
        min: 1,
        max: 100000,
        inteiro: true,
      },
      {
        tipo: 'avaliacao',
        chave: 'satisfacao',
        titulo: pt ? 'Satisfação com as ferramentas actuais' : 'Satisfaction with current tools',
      },
      {
        tipo: 'nps',
        chave: 'nps',
        titulo: pt
          ? 'Recomendaria a AGORAMOZ a um colega?'
          : 'Would you recommend AGORAMOZ to a colleague?',
      },
      {
        tipo: 'data',
        chave: 'prazo',
        titulo: pt ? 'Até quando quer ter isto resolvido?' : 'By when do you want this solved?',
      },
      {
        tipo: 'texto_longo',
        chave: 'comentario',
        titulo: pt ? 'Mais alguma coisa?' : 'Anything else?',
        max: 1000,
      },
    ],
    contacto: {
      campos: ['nome', 'email', 'organizacao'],
      textoConsentimento: pt
        ? 'Aceito que a AGORAMOZ use estes dados para me contactar sobre esta resposta. (Texto de exemplo.)'
        : 'I agree that AGORAMOZ may use these details to contact me about this response. (Example text.)',
    },
  });
}

const ESTADOS: readonly EstadoMostrado[] = ['fechado', 'expirado', 'indisponivel'];

export default async function PreviaInqueritoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Na Vercel de produção, nunca — mesmo com ADMIN_PREVIEW=on lá por engano.
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV === 'production') notFound();
  const q = await searchParams;
  const idioma = q.idioma === 'en' ? 'en' : 'pt';
  const estado = ESTADOS.find((e) => e === q.estado);

  return (
    <CascaInquerito>
      {estado ? (
        <EstadoInquerito estado={estado} idioma={idioma} />
      ) : (
        <PaginaInquerito spec={exemplo(idioma)} inqueritoId={ID_EXEMPLO} token={TOKEN_EXEMPLO} />
      )}
    </CascaInquerito>
  );
}
