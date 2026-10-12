import { Feedback } from '@/components/admin/Feedback';
import { HojeVista } from '@/components/admin/crm/HojeVista';
import { TEXTOS_OK_CRM } from '@/components/admin/crm/partes';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { crmOperacional } from '@/lib/crm/activacao';
import { resumoHoje, triagem } from '@/lib/crm/hoje';
import { lerOportunidades, lerPorRever, lerProximasReunioes } from '@/lib/crm/leitura';
import { filaDeHoje } from '@/lib/crm/modelo';

export const metadata = { title: 'Hoje' };

/** Fora do componente: o compilador do React recusa ler a hora durante a renderização. */
async function agora(): Promise<Date> {
  return new Date(Date.now());
}

/**
 * O ecrã de entrada do admin: o trabalho de quem entrou, por urgência, e o
 * que é de toda a equipa. O painel analítico está em `/admin/painel`.
 *
 * Acções que falham antes de saber o destino (pedido inválido) voltam aqui
 * com `?erro=`.
 */
export default async function HojePage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { erro, ok } = await searchParams;
  const sessao = await requireStaff();
  const supabase = await createSessionClient();
  const instante = await agora();
  const activo = (await crmOperacional(supabase)) === true;

  const [lido, porRever, reunioes] = await Promise.all([
    lerOportunidades(supabase, { soAbertas: true }, activo),
    lerPorRever(supabase),
    lerProximasReunioes(supabase, instante),
  ]);

  const abertas = lido?.itens ?? [];
  const fila = filaDeHoje(abertas, sessao.userId, instante);

  return (
    <>
      <Feedback erro={erro} ok={ok} textos={TEXTOS_OK_CRM} />
      <HojeVista
        nome={sessao.nome}
        agora={instante}
        eu={sessao.userId}
        escreve={podeEscrever(sessao.papel)}
        activo={activo}
        fila={fila}
        triagem={triagem(fila.semDono)}
        porRever={porRever}
        reunioes={reunioes}
        resumo={resumoHoje(fila, porRever?.total ?? 0, reunioes.length)}
        falhou={lido === null}
      />
    </>
  );
}
