import { PainelEnergia } from '@/components/admin/energia/Painel';
import { requireModulo } from '@/lib/auth/modulos';
import { createSessionClient } from '@/lib/auth/client';
import { COLUNAS_OPORTUNIDADE, oportunidadeDe } from '@/lib/energia/leitura';

export const metadata = { title: 'Espaço CEnO' };

/**
 * O painel do Espaço CEnO. Só quem tem o módulo `energia` chega aqui (404
 * para todos os outros); a RLS só devolve as linhas da própria pessoa.
 */
export default async function EnergiaPage() {
  await requireModulo('energia');
  const supabase = await createSessionClient();
  const [ops, ligacoes, mudancas] = await Promise.all([
    supabase.from('ceno_oportunidades').select(COLUNAS_OPORTUNIDADE).order('updated_at', { ascending: false }).limit(500),
    supabase.from('ceno_oportunidade_stakeholders').select('oportunidade_id, papel').in('papel', ['decisor', 'sponsor']),
    supabase.from('ceno_registos').select('oportunidade_id, metadata').eq('tipo', 'fase').limit(5000),
  ]);

  if (ops.error) {
    return (
      <p role="alert" className="border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]">
        Não foi possível ler o Espaço CEnO agora. Recarregue dentro de instantes.
      </p>
    );
  }

  return (
    <PainelEnergia
      ops={(ops.data ?? []).map((r) => oportunidadeDe(r as unknown as Record<string, unknown>))}
      comDecisor={(ligacoes.data ?? []).map((l) => String(l.oportunidade_id))}
      mudancas={(mudancas.data ?? []).map((m) => ({
        oportunidade_id: String(m.oportunidade_id),
        para: String((m.metadata as Record<string, unknown> | null)?.para ?? ''),
      }))}
      agora={new Date().toISOString()}
    />
  );
}
