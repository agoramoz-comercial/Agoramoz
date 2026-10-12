'use server';

import { normalizar } from '@/lib/admin/comandos';
import { limparTermo, normalizarResultado, VAZIO, type ResultadoPesquisa } from '@/lib/crm/pesquisa-modelo';

/**
 * A pesquisa da paleta na pré-visualização de QA: dados de exemplo, sem base.
 * Fora do `next start` local com `ADMIN_PREVIEW=on` responde sempre vazio —
 * uma Server Action é invocável por qualquer browser, e esta nunca toca na base.
 */

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const EXEMPLO = {
  contactos: [
    { id: id(103), nome: 'Exemplo Carla Nhantumbo', email: 'carla@exemplo.test' },
    { id: id(105), nome: 'Exemplo Sofia Macuácua', email: 'sofia@exemplo.test' },
  ],
  organizacoes: [
    { id: id(203), nome: 'Exemplo Banco Comercial', dominio: 'banco.exemplo.test' },
    { id: id(205), nome: 'Exemplo Mineração Centro', dominio: null },
  ],
  oportunidades: [
    { id: id(3), fase: 'qualificacao', contacto: 'Exemplo Carla Nhantumbo', organizacao: 'Exemplo Banco Comercial' },
    { id: id(5), fase: 'proposta', contacto: 'Exemplo Sofia Macuácua', organizacao: 'Exemplo Mineração Centro' },
  ],
};

export async function pesquisaExemplo(q: string): Promise<{ resultado: ResultadoPesquisa; falhou: boolean }> {
  if (process.env.ADMIN_PREVIEW !== 'on' || process.env.VERCEL_ENV !== undefined) return { resultado: VAZIO, falhou: true };
  const termo = limparTermo(q);
  if (!termo) return { resultado: VAZIO, falhou: false };
  const t = normalizar(termo);
  const tem = (...xs: (string | null)[]) => xs.some((x) => x !== null && normalizar(x).includes(t));
  return {
    resultado: normalizarResultado({
      contactos: EXEMPLO.contactos.filter((c) => tem(c.nome, c.email)),
      organizacoes: EXEMPLO.organizacoes.filter((o) => tem(o.nome, o.dominio)),
      oportunidades: EXEMPLO.oportunidades.filter((o) => tem(o.contacto, o.organizacao)),
    }),
    falhou: false,
  };
}
