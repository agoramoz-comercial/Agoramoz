import type { Idioma } from '@/content/types';
import type { Contagem } from '@/lib/news/estatisticas';
import { ISO_DO_PAIS, mapaDoPais, mapaMundo } from '@/lib/news/mapa';
import { NOME_DO_PAIS, type PaisNews } from '@/lib/news/paises';
import { COR } from './Graficos';

const l = (x: { pt: string; en: string }, i: Idioma) => (i === 'en' ? x.en : x.pt);

/**
 * O país da notícia na sua região (Natural Earth 1:50m, desenhado no
 * servidor: nenhum pedido a servidores de mapas). Os vizinhos em papel
 * escuro, o país a tinta, o marcador a ferrugem.
 */
export function MapaPais({ pais, idioma, className = '' }: { pais: PaisNews; idioma: Idioma; className?: string }) {
  const m = mapaDoPais(pais, 640, 400);
  const nome = l(NOME_DO_PAIS[pais], idioma);
  const [mx, my] = m.marcador;
  return (
    <svg
      viewBox={`0 0 ${m.largura} ${m.altura}`}
      role="img"
      aria-label={idioma === 'en' ? `Map: ${nome} in its region` : `Mapa: ${nome} na sua região`}
      className={`h-auto w-full ${className}`}
    >
      <rect width={m.largura} height={m.altura} fill="#e6dfd0" />
      <path d={m.grelha} fill="none" stroke={COR.tinta} strokeOpacity="0.08" strokeWidth="0.6" />
      {m.paises.map((p) => (
        <path key={p.id} d={p.d} fill="#d3cab8" stroke={COR.papel} strokeWidth="0.8" />
      ))}
      <path d={m.destaque} fill={COR.tinta} stroke={COR.papel} strokeWidth="1" />
      <circle cx={mx} cy={my} r="22" fill="none" stroke={COR.ferrugem} strokeWidth="3" />
      <circle cx={mx} cy={my} r="8" fill={COR.ferrugem} stroke={COR.papel} strokeWidth="2" />
      <g className="font-sans" fontSize="28" fontWeight="700">
        <rect x={Math.min(mx + 30, m.largura - nome.length * 16 - 24)} y={my - 22} width={nome.length * 16 + 20} height="44" fill={COR.papel} />
        <text x={Math.min(mx + 40, m.largura - nome.length * 16 - 14)} y={my + 9} fill={COR.tinta}>
          {nome}
        </text>
      </g>
    </svg>
  );
}

/**
 * O mundo com os países que as notícias cobrem, cada um com um círculo do
 * tamanho do número REAL de notícias publicadas sobre ele. É também a
 * alternativa estática do globo 3D (movimento reduzido, sem WebGL).
 */
export function MapaCobertura({
  contagens,
  idioma,
  escuro = false,
}: {
  contagens: readonly Contagem<PaisNews>[];
  idioma: Idioma;
  escuro?: boolean;
}) {
  const m = mapaMundo();
  const cobertos = new Map(contagens.map((c) => [ISO_DO_PAIS[c.chave], c.n]));
  const max = Math.max(1, ...contagens.map((c) => c.n));
  const terra = escuro ? '#2a2622' : '#d3cab8';
  const marca = escuro ? '#e9a35c' : COR.ferrugem;
  const fundo = escuro ? '#0b0a09' : COR.papel;
  const texto = escuro ? '#f3efe6' : COR.tinta;
  const resumo = contagens.map((c) => `${l(NOME_DO_PAIS[c.chave], idioma)}: ${c.n}`).join('; ');
  return (
    <svg
      viewBox={`0 0 ${m.largura} ${m.altura}`}
      role="img"
      aria-label={(idioma === 'en' ? 'Coverage map. ' : 'Mapa de cobertura. ') + resumo}
      className="h-auto w-full"
    >
      <path d={m.contorno} fill={escuro ? '#121110' : '#e6dfd0'} />
      {m.paises.map((p) => (
        <path key={p.id} d={p.d} fill={cobertos.has(p.id) ? (escuro ? '#6b4a26' : '#b9a27f') : terra} stroke={fundo} strokeWidth="0.5" />
      ))}
      {contagens.map((c) => {
        const [x, y] = m.pontos[c.chave];
        const r = 11 + 13 * Math.sqrt(c.n / max);
        return (
          <g key={c.chave}>
            <circle cx={x} cy={y} r={r} fill={marca} fillOpacity="0.85" stroke={fundo} strokeWidth="1.5" />
            <text x={x} y={y + 4.5} textAnchor="middle" fontSize="13" fontWeight="700" fill={escuro ? '#0b0a09' : COR.papel} className="font-sans">
              {c.n}
            </text>
            <text x={x} y={y + r + 14} textAnchor="middle" fontSize="12" fill={texto} className="font-sans">
              {c.chave.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
