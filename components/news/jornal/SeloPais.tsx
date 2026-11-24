import type { Idioma } from '@/content/types';
import { NOME_DO_PAIS, type PaisNews } from '@/lib/news/paises';

/** O selo do país que a notícia afecta: código em caixa e nome por extenso. */
export function SeloPais({ pais, idioma, escuro = false }: { pais: PaisNews; idioma: Idioma; escuro?: boolean }) {
  const nome = NOME_DO_PAIS[pais][idioma === 'en' ? 'en' : 'pt'];
  return (
    <span className="inline-flex items-stretch border border-current font-sans text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
      <span className={`px-1.5 py-0.5 ${escuro ? 'bg-[#f3efe6] text-[#0b0a09]' : 'bg-[#121110] text-[#f3efe6]'}`}>
        {pais.toUpperCase()}
      </span>
      <span className="px-1.5 py-0.5">{nome}</span>
    </span>
  );
}
