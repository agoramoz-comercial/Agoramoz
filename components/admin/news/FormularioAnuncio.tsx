import { inputClass } from '@/components/form/Field';
import { BotaoEnviar } from '@/components/admin/BotaoEnviar';
import { paraCampoDeMaputo, TEMAS_ANUNCIO, type TemaAnuncio } from '@/lib/news/anuncios';

/**
 * Criar ou editar um anúncio do outdoor. Formulário de servidor (funciona sem
 * JavaScript); a validação forte está na acção e na própria tabela (0015).
 */

export interface ValoresAnuncio {
  readonly id: string | null;
  readonly revisao: number | null;
  readonly slug: string;
  readonly titulo: string;
  readonly mensagem: string | null;
  readonly ticker: string | null;
  readonly cta: string;
  readonly destino: string;
  readonly tema: TemaAnuncio;
  readonly inicio: string | null;
  readonly fim: string | null;
  readonly peso: number;
}

export const ANUNCIO_VAZIO: ValoresAnuncio = {
  id: null,
  revisao: null,
  slug: '',
  titulo: '',
  mensagem: null,
  ticker: null,
  cta: 'Saber mais',
  destino: '/diagnostico',
  tema: 'tinta',
  inicio: null,
  fim: null,
  peso: 1,
};

const NOME_DO_TEMA: Record<TemaAnuncio, string> = {
  tinta: 'Tinta — painel negro, faixa amarela',
  sinal: 'Sinal — vermelho AGORAMOZ',
  crescimento: 'Crescimento — verde',
  energia: 'Energia — amarelo',
};

const ROTULO = 'text-sm font-medium';
const NOTA = 'font-normal text-[color:var(--muted)]';

export function FormularioAnuncio({
  valores,
  accao,
  textoBotao,
}: {
  valores: ValoresAnuncio;
  accao: (formData: FormData) => Promise<void>;
  textoBotao: string;
}) {
  const v = valores;
  const prefixo = v.id ? `anuncio-${v.id.slice(0, 8)}` : 'anuncio-novo';
  return (
    <form action={accao} className="grid gap-5 border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
      <input type="hidden" name="id" value={v.id ?? ''} />
      {v.revisao !== null && <input type="hidden" name="revisao" value={v.revisao} />}
      <div className="grid gap-2">
        <label htmlFor={`${prefixo}-titulo`} className={ROTULO}>
          Título <span className={NOTA}>(grande, em maiúsculas no painel — até 80)</span>
        </label>
        <input id={`${prefixo}-titulo`} name="titulo" required minLength={3} maxLength={80} defaultValue={v.titulo} className={inputClass} />
      </div>
      <div className="grid gap-2">
        <label htmlFor={`${prefixo}-mensagem`} className={ROTULO}>
          Mensagem <span className={NOTA}>(uma frase de apoio — até 160)</span>
        </label>
        <textarea id={`${prefixo}-mensagem`} name="mensagem" maxLength={160} rows={2} defaultValue={v.mensagem ?? ''} className={inputClass} />
      </div>
      <div className="grid gap-2">
        <label htmlFor={`${prefixo}-ticker`} className={ROTULO}>
          Faixa a correr <span className={NOTA}>(ex.: «AGRM ▲ AGENTES DE IA · DISPONÍVEL HOJE» — até 160)</span>
        </label>
        <input id={`${prefixo}-ticker`} name="ticker" maxLength={160} defaultValue={v.ticker ?? ''} className={inputClass} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor={`${prefixo}-cta`} className={ROTULO}>
            Botão <span className={NOTA}>(até 28)</span>
          </label>
          <input id={`${prefixo}-cta`} name="cta" required minLength={2} maxLength={28} defaultValue={v.cta} className={inputClass} />
        </div>
        <div className="grid gap-2">
          <label htmlFor={`${prefixo}-tema`} className={ROTULO}>
            Tema
          </label>
          <select id={`${prefixo}-tema`} name="tema" defaultValue={v.tema} className={inputClass}>
            {TEMAS_ANUNCIO.map((t) => (
              <option key={t} value={t}>
                {NOME_DO_TEMA[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <label htmlFor={`${prefixo}-destino`} className={ROTULO}>
          Destino do clique
        </label>
        <input
          id={`${prefixo}-destino`}
          name="destino"
          required
          maxLength={300}
          defaultValue={v.destino}
          aria-describedby={`${prefixo}-destino-nota`}
          className={inputClass}
        />
        <p id={`${prefixo}-destino-nota`} className="text-xs text-[color:var(--muted)]">
          Uma página do site (ex.: <code>/solucoes/agentes-ia</code>, <code>/diagnostico</code>) ou um
          endereço <code>https://</code>. A campanha (UTM) é acrescentada sozinha.
        </p>
      </div>
      <div className="grid gap-2">
        <label htmlFor={`${prefixo}-slug`} className={ROTULO}>
          Nome da campanha
        </label>
        <input
          id={`${prefixo}-slug`}
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          minLength={3}
          maxLength={64}
          defaultValue={v.slug}
          aria-describedby={`${prefixo}-slug-nota`}
          className={inputClass}
        />
        <p id={`${prefixo}-slug-nota`} className="text-xs text-[color:var(--muted)]">
          Liga o anúncio aos diagnósticos e oportunidades que gerar (<code>utm_campaign</code>). Só
          minúsculas, números e hífenes.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="grid gap-2">
          <label htmlFor={`${prefixo}-inicio`} className={ROTULO}>
            Início <span className={NOTA}>(Maputo)</span>
          </label>
          <input id={`${prefixo}-inicio`} name="inicio" type="datetime-local" defaultValue={paraCampoDeMaputo(v.inicio)} className={inputClass} />
        </div>
        <div className="grid gap-2">
          <label htmlFor={`${prefixo}-fim`} className={ROTULO}>
            Fim <span className={NOTA}>(Maputo)</span>
          </label>
          <input id={`${prefixo}-fim`} name="fim" type="datetime-local" defaultValue={paraCampoDeMaputo(v.fim)} className={inputClass} />
        </div>
        <div className="grid gap-2">
          <label htmlFor={`${prefixo}-peso`} className={ROTULO}>
            Peso <span className={NOTA}>(1–10)</span>
          </label>
          <input id={`${prefixo}-peso`} name="peso" type="number" min={1} max={10} required defaultValue={v.peso} className={inputClass} />
        </div>
      </div>
      <div>
        <BotaoEnviar size="sm" aEnviar="A gravar…">
          {textoBotao}
        </BotaoEnviar>
      </div>
    </form>
  );
}
