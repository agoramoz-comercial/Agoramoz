import type { Entrada, GrupoNav } from '@/components/admin/AdminNav';
import type { Permissoes, Regra } from './aeos';

/**
 * Secções agrupadas pelos blocos do AEOS (`lib/admin/aeos.ts`), como numa
 * consola: a direcção e o trabalho do dia, a receita, o marketing, os
 * espaços privados e, só para administradores, o controlo. Cada grupo é
 * filtrado por flag, módulo e papel — uma entrada que daria 404 ou que o
 * papel não usa não aparece.
 *
 * Os Inquéritos e o News continuam aqui, no Marketing (bloco 2): mudam de
 * grupo, não de endereço nem de regra.
 */
interface EntradaComRegra extends Entrada {
  readonly so?: Regra;
}

const GRUPOS: readonly { titulo: string; entradas: readonly EntradaComRegra[] }[] = [
  {
    titulo: 'Direcção',
    entradas: [
      { href: '/admin', texto: 'Hoje', icone: 'hoje' },
      { href: '/admin/painel', texto: 'Painel', icone: 'painel' },
      { href: '/admin/aeos', texto: 'Mapa AEOS', icone: 'aeos' },
    ],
  },
  {
    titulo: 'Receita',
    entradas: [
      { href: '/admin/oportunidades', texto: 'Pipeline', icone: 'oportunidades' },
      { href: '/admin/diagnosticos', texto: 'Diagnósticos', icone: 'diagnosticos' },
      { href: '/admin/propostas', texto: 'Propostas', icone: 'propostas' },
      { href: '/admin/facturacao', texto: 'Facturação', icone: 'facturacao' },
      { href: '/admin/contactos', texto: 'Contactos', icone: 'contactos' },
      { href: '/admin/organizacoes', texto: 'Organizações', icone: 'organizacoes' },
    ],
  },
  {
    titulo: 'Marketing',
    entradas: [
      { href: '/admin/trafego', texto: 'Tráfego', icone: 'trafego' },
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
    titulo: 'Controlo',
    entradas: [
      { href: '/admin/fila', texto: 'Fila de envio', icone: 'fila', so: 'admin' },
      { href: '/admin/equipa', texto: 'Equipa', icone: 'equipa', so: 'admin' },
      { href: '/admin/auditoria', texto: 'Auditoria', icone: 'auditoria', so: 'admin' },
    ],
  },
];

export type { Permissoes };

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
