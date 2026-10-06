import { PainelEnergia } from '@/components/admin/energia/Painel';
import { ErroLeitura } from '@/components/admin/energia/partes';
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

  // Uma só falha já tornaria os indicadores falsos (0 % de decisores, sem conversões): nada de meio painel.
  if (ops.error || ligacoes.error || mudancas.error) return <ErroLeitura />;

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
