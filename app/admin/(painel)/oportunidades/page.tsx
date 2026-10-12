import { MemoriaLista } from '@/components/admin/MemoriaLista';
import { Feedback } from '@/components/admin/Feedback';
import { AdminHeading } from '@/components/admin/primitives';
import { PipelineVista } from '@/components/admin/crm/PipelineVista';
import { TEXTOS_OK_CRM } from '@/components/admin/crm/partes';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';
import { crmOperacional } from '@/lib/crm/activacao';
import { lerEquipa, lerOportunidades } from '@/lib/crm/leitura';
import { aplicarVista, lerFiltros, ordenar, VISTAS, type Vista } from '@/lib/crm/pipeline';

export const metadata = { title: 'Pipeline' };

export default async function OportunidadesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const filtros = lerFiltros(p);
  const sessao = await requireStaff();
  const supabase = await createSessionClient();

  // `null` (leitura falhou por outra razão) trata-se como não activo: mostra
  // o essencial em vez de partir, e o aviso diz o que falta.
  const activo = (await crmOperacional(supabase)) === true;
  const [lido, equipa] = await Promise.all([
    lerOportunidades(supabase, { fase: filtros.fase, canal: filtros.canal, campanha: filtros.campanha }, activo),
    lerEquipa(supabase),
  ]);

  const agora = new Date();
  const todas = lido?.itens ?? [];
  const contagens = Object.fromEntries(
    VISTAS.map((v) => [v, aplicarVista(todas, v, sessao.userId, agora).length]),
  ) as Record<Vista, number>;
  const itens = ordenar(aplicarVista(todas, filtros.vista, sessao.userId, agora), filtros.ordem, filtros.sentido);

  return (
    <>
      <MemoriaLista chave="oportunidades" />
      <AdminHeading
        titulo="Pipeline"
        descricao="Cada oportunidade com a sua fase, o seu dono e o próximo passo. As vistas e a ordem ficam no endereço: pode partilhá-lo."
      />
      <Feedback erro={p.erro} ok={p.ok} textos={TEXTOS_OK_CRM} />
      {lido === null ? (
        <p role="alert" className="mb-6 border border-[color:var(--color-signal-700)] px-4 py-3 text-sm">
          Não foi possível ler as oportunidades. Recarregue a página; se persistir, veja o estado da base.
        </p>
      ) : null}
      <PipelineVista
        filtros={filtros}
        itens={itens}
        contagens={contagens}
        truncado={lido?.truncado ?? false}
        activo={activo}
        escreve={podeEscrever(sessao.papel)}
        eu={sessao.userId}
        nomes={new Map((equipa ?? []).map((e) => [e.id, e.nome]))}
        agora={agora}
      />
    </>
  );
}
