'use client';

import { Link2, Share2 } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { ligacaoDePartilha, type CanalComLigacao, type CanalPartilha } from '@/lib/news/partilha';

/**
 * Partilhar um artigo. Sem scripts de terceiros: ligações públicas de cada
 * rede, a partilha nativa do telemóvel quando existe, e «copiar ligação».
 * Cada partilha conta por canal (sem saber quem partilhou).
 */

const REDES: { canal: CanalComLigacao; nome: string }[] = [
  { canal: 'linkedin', nome: 'LinkedIn' },
  { canal: 'whatsapp', nome: 'WhatsApp' },
  { canal: 'x', nome: 'X' },
  { canal: 'facebook', nome: 'Facebook' },
  { canal: 'email', nome: 'Email' },
];

function contar(slug: string, canal: CanalPartilha) {
  try {
    const corpo = JSON.stringify({ slug, canal });
    const blob = new Blob([corpo], { type: 'application/json' });
    if (!navigator.sendBeacon?.('/api/news/partilha', blob)) {
      void fetch('/api/news/partilha', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: corpo,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Contar é acessório; a partilha já aconteceu.
  }
}

const semSubscricao = () => () => {};
const temPartilhaNativa = () => typeof navigator.share === 'function';

export function Partilhar({
  slug,
  url,
  titulo,
  idioma,
}: {
  slug: string;
  url: string;
  titulo: string;
  idioma: 'pt' | 'en';
}) {
  // A partilha nativa só existe no browser (e sobretudo no telemóvel).
  const nativo = useSyncExternalStore(semSubscricao, temPartilhaNativa, () => false);
  const [copiado, setCopiado] = useState<'sim' | 'erro' | null>(null);

  const base =
    'inline-flex min-h-11 items-center gap-2 border border-[color:var(--border)] px-3 text-sm font-medium hover:border-[color:var(--on-surface)]';

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={idioma === 'en' ? 'Share' : 'Partilhar'}>
      {nativo && (
        <button
          type="button"
          className={base}
          onClick={async () => {
            try {
              await navigator.share({ title: titulo, url });
              contar(slug, 'nativo');
            } catch {
              // A pessoa cancelou: nada a contar.
            }
          }}
        >
          <Share2 className="size-4" aria-hidden="true" />
          {idioma === 'en' ? 'Share' : 'Partilhar'}
        </button>
      )}
      {REDES.map((r) => (
        <a
          key={r.canal}
          href={ligacaoDePartilha(r.canal, url, titulo)}
          target={r.canal === 'email' ? undefined : '_blank'}
          rel="noopener noreferrer"
          onClick={() => contar(slug, r.canal)}
          className={base}
        >
          {r.nome}
          {r.canal !== 'email' && <span className="sr-only">{idioma === 'en' ? '(opens in a new tab)' : '(abre noutro separador)'}</span>}
        </a>
      ))}
      <button
        type="button"
        className={base}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopiado('sim');
            contar(slug, 'copiar');
          } catch {
            setCopiado('erro');
          }
        }}
      >
        <Link2 className="size-4" aria-hidden="true" />
        {idioma === 'en' ? 'Copy link' : 'Copiar ligação'}
      </button>
      <span role="status" className="text-sm text-[color:var(--muted)]">
        {copiado === 'sim'
          ? idioma === 'en'
            ? 'Link copied.'
            : 'Ligação copiada.'
          : copiado === 'erro'
            ? url
            : ''}
      </span>
    </div>
  );
}
