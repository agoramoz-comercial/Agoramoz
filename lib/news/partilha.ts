/**
 * Partilhar um artigo: o endereço público de cada rede, sem scripts de
 * terceiros (a CSP fica fechada e ninguém segue o leitor). A contagem é nossa,
 * por canal, em `/api/news/partilha`.
 */

export const CANAIS_PARTILHA = [
  'linkedin',
  'whatsapp',
  'x',
  'facebook',
  'email',
  'copiar',
  'nativo',
] as const;
export type CanalPartilha = (typeof CANAIS_PARTILHA)[number];

export type CanalComLigacao = Exclude<CanalPartilha, 'copiar' | 'nativo'>;

export function ligacaoDePartilha(canal: CanalComLigacao, url: string, titulo: string): string {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(titulo);
  switch (canal) {
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(`${titulo} ${url}`)}`;
    case 'x':
      return `https://x.com/intent/post?url=${u}&text=${t}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case 'email':
      return `mailto:?subject=${t}&body=${u}`;
  }
}
