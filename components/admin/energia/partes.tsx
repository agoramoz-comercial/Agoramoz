import Link from 'next/link';
import { inputClass } from '@/components/form/Field';
import type { Oportunidade, Stakeholder } from '@/lib/energia/leitura';
import {
  FONTES,
  MOEDAS,
  RELACOES,
  SECTORES,
  TIPOS_STAKEHOLDER,
  URGENCIAS,
} from '@/lib/energia/modelo';
import { cn } from '@/lib/utils/cn';

/**
 * Peças comuns do Espaço CEnO. Componentes de servidor: o espaço funciona sem
 * JavaScript, e os formulários são formulários (POST para Server Actions).
 */

export const ROTULO = 'text-sm font-medium';
export const AJUDA = 'text-sm text-[color:var(--muted)]';
export const CAIXA = 'grid gap-5 border border-[color:var(--border)] bg-[color:var(--surface)] p-5';
export const H2 = 'text-[length:var(--text-h3)] tracking-[-0.02em]';
export const AREA = `${inputClass} min-h-24`;

const SECCOES = [
  { href: '/admin/energia', texto: 'Painel', chave: 'painel' },
  { href: '/admin/energia/oportunidades', texto: 'Oportunidades', chave: 'oportunidades' },
  { href: '/admin/energia/stakeholders', texto: 'Stakeholders', chave: 'stakeholders' },
  { href: '/admin/energia/manual', texto: 'Manual', chave: 'manual' },
] as const;

export type SeccaoEnergia = (typeof SECCOES)[number]['chave'];

/** As quatro secções do espaço, com a actual marcada. */
export function EnergiaNav({ activo }: { activo: SeccaoEnergia }) {
  return (
    <nav aria-label="Secções do Espaço CEnO" className="mb-8 flex flex-wrap gap-2">
      {SECCOES.map((s) => (
        <Link
          key={s.chave}
          href={s.href}
          aria-current={s.chave === activo ? 'page' : undefined}
          className={cn(
            'inline-flex min-h-11 items-center rounded-[--radius-xs] border px-4 text-sm',
            s.chave === activo
              ? 'border-[color:var(--on-surface)] bg-[color:var(--on-surface)] font-medium text-[color:var(--surface)]'
              : 'border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--on-surface)]',
          )}
        >
          {s.texto}
        </Link>
      ))}
    </nav>
  );
}

/** O resultado da última acção: erro (alerta) ou sucesso (estado). */
export function Mensagens({
  erro,
  ok,
  textos,
}: {
  erro?: string;
  ok?: string;
  textos: Readonly<Record<string, string>>;
}) {
  return (
    <>
      {erro && (
        <p
          role="alert"
          className="mb-6 border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]"
        >
          {erro}
        </p>
      )}
      {ok && textos[ok] && (
        <p role="status" className="mb-6 border border-[color:var(--border)] px-4 py-3 text-sm">
          {textos[ok]}
        </p>
      )}
    </>
  );
}

/** Um número do scorecard: rótulo, valor, e a definição por baixo. */
export function Kpi({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="h-full rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-5">
      <p className="text-sm text-[color:var(--muted)]">{rotulo}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-[1.75rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">
        {valor}
      </p>
      {nota && <p className="mt-2 text-xs text-[color:var(--muted)]">{nota}</p>}
    </div>
  );
}

export function Opcoes({ valores }: { valores: Readonly<Record<string, string>> }) {
  return (
    <>
      {Object.entries(valores).map(([v, t]) => (
        <option key={v} value={v}>
          {t}
        </option>
      ))}
    </>
  );
}

function Campo({
  id,
  rotulo,
  ajuda,
  children,
}: {
  id: string;
  rotulo: string;
  ajuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className={ROTULO}>
        {rotulo}
      </label>
      {children}
      {ajuda && (
        <p id={`${id}-ajuda`} className={AJUDA}>
          {ajuda}
        </p>
      )}
    </div>
  );
}

/** Os campos de base de uma oportunidade (criar e editar usam os mesmos). */
export function CamposOportunidade({ v }: { v?: Oportunidade }) {
  return (
    <>
      <Campo id="op-titulo" rotulo="Título">
        <input id="op-titulo" name="titulo" required minLength={3} maxLength={160} defaultValue={v?.titulo} className={inputClass} />
      </Campo>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="op-organizacao" rotulo="Empresa ou projecto">
          <input id="op-organizacao" name="organizacao" maxLength={160} defaultValue={v?.organizacao ?? ''} className={inputClass} />
        </Campo>
        <Campo id="op-sector" rotulo="Sector">
          <select id="op-sector" name="sector" required defaultValue={v?.sector ?? 'solar'} className={inputClass}>
            <Opcoes valores={SECTORES} />
          </select>
        </Campo>
      </div>
      <Campo id="op-problema" rotulo="Problema económico" ajuda="Ineficiência, necessidade de capital, expansão, digitalização…">
        <textarea id="op-problema" name="problema" maxLength={2000} defaultValue={v?.problema ?? ''} aria-describedby="op-problema-ajuda" className={AREA} />
      </Campo>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="op-fonte" rotulo="Fonte">
          <select id="op-fonte" name="fonte" defaultValue={v?.fonte ?? ''} className={inputClass}>
            <option value="">— não indicada —</option>
            <Opcoes valores={FONTES} />
          </select>
        </Campo>
        <Campo id="op-urgencia" rotulo="Urgência">
          <select id="op-urgencia" name="urgencia" defaultValue={v?.urgencia ?? 'media'} className={inputClass}>
            <Opcoes valores={URGENCIAS} />
          </select>
        </Campo>
      </div>
      <fieldset className="grid gap-4">
        <legend className={ROTULO}>Valor potencial (intervalo)</legend>
        <p className={AJUDA}>Só com evidência. Sem evidência, deixe em branco: um valor sem fonte é pipeline inflacionado.</p>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_8rem]">
          <Campo id="op-valor-min" rotulo="Mínimo">
            <input id="op-valor-min" name="valorMin" inputMode="decimal" defaultValue={v?.valor_min ?? ''} className={inputClass} />
          </Campo>
          <Campo id="op-valor-max" rotulo="Máximo">
            <input id="op-valor-max" name="valorMax" inputMode="decimal" defaultValue={v?.valor_max ?? ''} className={inputClass} />
          </Campo>
          <Campo id="op-moeda" rotulo="Moeda">
            <select id="op-moeda" name="moeda" defaultValue={v?.moeda ?? 'USD'} className={inputClass}>
              {MOEDAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo id="op-evidencia" rotulo="Evidência do valor">
          <input id="op-evidencia" name="valorEvidencia" maxLength={500} defaultValue={v?.valor_evidencia ?? ''} className={inputClass} />
        </Campo>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <Campo id="op-accao" rotulo="Próxima acção" ajuda="Concreta. «Manter contacto» não é uma acção.">
          <input id="op-accao" name="proximaAccao" required maxLength={300} defaultValue={v?.proxima_accao ?? ''} aria-describedby="op-accao-ajuda" className={inputClass} />
        </Campo>
        <Campo id="op-data" rotulo="Data">
          <input id="op-data" name="proximaData" type="date" required defaultValue={v?.proxima_data ?? ''} className={inputClass} />
        </Campo>
      </div>
      <Campo id="op-responsavel" rotulo="Responsável" ajuda="Uma única pessoa.">
        <input id="op-responsavel" name="responsavel" maxLength={120} defaultValue={v?.responsavel ?? ''} aria-describedby="op-responsavel-ajuda" className={inputClass} />
      </Campo>
    </>
  );
}

/** Os campos de um stakeholder (criar e editar usam os mesmos). */
export function CamposStakeholder({ v }: { v?: Stakeholder }) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="st-organizacao" rotulo="Organização">
          <input id="st-organizacao" name="organizacao" required maxLength={160} defaultValue={v?.organizacao} className={inputClass} />
        </Campo>
        <Campo id="st-tipo" rotulo="Tipo">
          <select id="st-tipo" name="tipo" required defaultValue={v?.tipo ?? 'empresa_alvo'} className={inputClass}>
            <Opcoes valores={TIPOS_STAKEHOLDER} />
          </select>
        </Campo>
        <Campo id="st-pessoa" rotulo="Pessoa">
          <input id="st-pessoa" name="pessoa" maxLength={120} defaultValue={v?.pessoa ?? ''} className={inputClass} />
        </Campo>
        <Campo id="st-cargo" rotulo="Cargo">
          <input id="st-cargo" name="cargo" maxLength={120} defaultValue={v?.cargo ?? ''} className={inputClass} />
        </Campo>
        <Campo id="st-pais" rotulo="País">
          <input id="st-pais" name="pais" maxLength={60} defaultValue={v?.pais ?? ''} className={inputClass} />
        </Campo>
        <Campo id="st-sector" rotulo="Sector">
          <input id="st-sector" name="sector" maxLength={80} defaultValue={v?.sector ?? ''} className={inputClass} />
        </Campo>
      </div>
      <Campo id="st-interesse" rotulo="Interesse estratégico">
        <textarea id="st-interesse" name="interesse" maxLength={1000} defaultValue={v?.interesse ?? ''} className={AREA} />
      </Campo>
      <div className="grid gap-5 sm:grid-cols-3">
        <Campo id="st-poder" rotulo="Poder de decisão">
          <select id="st-poder" name="poder" defaultValue={v?.poder_decisao ?? ''} className={inputClass}>
            <option value="">— por avaliar —</option>
            <option value="1">1 · nenhum</option>
            <option value="2">2 · influencia</option>
            <option value="3">3 · recomenda</option>
            <option value="4">4 · co-decide</option>
            <option value="5">5 · decide</option>
          </select>
        </Campo>
        <Campo id="st-relacao" rotulo="Relação com a AGORAMOZ">
          <select id="st-relacao" name="relacao" defaultValue={v?.relacao ?? 'nova'} className={inputClass}>
            <Opcoes valores={RELACOES} />
          </select>
        </Campo>
        <Campo id="st-ultima" rotulo="Última interacção">
          <input id="st-ultima" name="ultima" type="date" defaultValue={v?.ultima_interacao ?? ''} className={inputClass} />
        </Campo>
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <Campo id="st-accao" rotulo="Próxima acção" ajuda="Obrigatória enquanto o contacto estiver activo.">
          <input id="st-accao" name="proximaAccao" maxLength={300} defaultValue={v?.proxima_accao ?? ''} aria-describedby="st-accao-ajuda" className={inputClass} />
        </Campo>
        <Campo id="st-data" rotulo="Data">
          <input id="st-data" name="proximaData" type="date" defaultValue={v?.proxima_data ?? ''} className={inputClass} />
        </Campo>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="st-origem" rotulo="Origem dos dados" ajuda="Onde e como obteve este contacto.">
          <input id="st-origem" name="origem" maxLength={300} defaultValue={v?.origem_dados ?? ''} aria-describedby="st-origem-ajuda" className={inputClass} />
        </Campo>
        <Campo id="st-responsavel" rotulo="Responsável interno">
          <input id="st-responsavel" name="responsavel" maxLength={120} defaultValue={v?.responsavel ?? ''} className={inputClass} />
        </Campo>
      </div>
      <div className="grid gap-3">
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="consentimento" defaultChecked={v?.consentimento ?? false} className="size-5" />
          A pessoa consentiu que guardássemos estes dados
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="activo" defaultChecked={v?.activo ?? true} className="size-5" />
          Contacto activo (com próxima acção)
        </label>
      </div>
    </>
  );
}
