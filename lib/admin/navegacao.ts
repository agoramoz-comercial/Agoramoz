import type { Entrada, GrupoNav } from '@/components/admin/AdminNav';

/**
 * Secções agrupadas pelo trabalho que servem, como numa consola: primeiro o
 * trabalho do dia, depois o comercial, o crescimento, os espaços privados e,
 * só para administradores, o sistema. Cada grupo é filtrado por flag, módulo
 * e papel — uma entrada que daria 404 ou que o papel não usa não aparece.
 */
interface EntradaComRegra extends Entrada {
  readonly so?: 'inqueritos' | 'news' | 'energia' | 'direcao' | 'admin';
}

const GRUPOS: readonly { titulo: string; entradas: readonly EntradaComRegra[] }[] = [
  {
    titulo: 'Trabalho',
    entradas: [{ href: '/admin', texto: 'Painel', icone: 'painel' }],
  },
  {
    titulo: 'Comercial',
    entradas: [
      { href: '/admin/oportunidades', texto: 'Pipeline', icone: 'oportunidades' },
      { href: '/admin/diagnosticos', texto: 'Diagnósticos', icone: 'diagnosticos' },
      { href: '/admin/contactos', texto: 'Contactos', icone: 'contactos' },
      { href: '/admin/organizacoes', texto: 'Organizações', icone: 'organizacoes' },
    ],
  },
  {
    titulo: 'Crescimento',
    entradas: [
      { href: '/admin/aquisicao', texto: 'Aquisição', icone: 'aquisicao' },
      { href: '/admin/inqueritos', texto: 'Inquéritos', icone: 'inqueritos', so: 'inqueritos' },
      { href: '/admin/news', texto: 'News', icone: 'news', so: 'news' },
    ],
  },
  {
    titulo: 'Espaços',
    entradas: [
      { href: '/admin/gabinete', texto: 'Gabinete', icone: 'gabinete', so: 'direcao' },
      { href: '/admin/energia', texto: 'Espaço CEnO', icone: 'energia', so: 'energia' },
    ],
  },
  {
    titulo: 'Sistema',
    entradas: [
      { href: '/admin/fila', texto: 'Fila de envio', icone: 'fila', so: 'admin' },
      { href: '/admin/equipa', texto: 'Equipa', icone: 'equipa', so: 'admin' },
    ],
  },
];

export type Permissoes = Readonly<Record<NonNullable<EntradaComRegra['so']>, boolean>>;

export function gruposVisiveis(permite: Permissoes): GrupoNav[] {
  return GRUPOS.map((g) => ({
    titulo: g.titulo,
    entradas: g.entradas
      .filter((e) => !e.so || permite[e.so])
      .map(({ href, texto, icone }) => ({ href, texto, icone })),
  })).filter((g) => g.entradas.length > 0);
}

/**
 * O endereço guardado para «voltar à lista» só é aceite se for da própria
 * lista indicada — nunca um destino arbitrário vindo do armazenamento.
 */
export function destinoSeguro(guardado: string | null, lista: string): string {
  if (!guardado) return lista;
  const [caminho] = guardado.split('?');
  if (caminho !== lista) return lista;
  if (!/^[\w\-/?=&%.+]*$/.test(guardado)) return lista;
  return guardado;
}
