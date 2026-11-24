'use client';

import { useRef, useState, useTransition } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { inputClass } from '@/components/form/Field';
import { Button } from '@/components/ui/Button';

type Accao = (formData: FormData) => Promise<void>;

/** Lado maior até 1600 px: chega para a manchete em ecrãs grandes e para o PDF. */
const LADO_MAX = 1600;

async function reduzir(ficheiro: File): Promise<{ webp: Blob; jpg: Blob; largura: number; altura: number }> {
  const imagem = await createImageBitmap(ficheiro);
  const escala = Math.min(1, LADO_MAX / Math.max(imagem.width, imagem.height));
  const largura = Math.round(imagem.width * escala);
  const altura = Math.round(imagem.height * escala);
  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  const ctx = tela.getContext('2d');
  if (!ctx) throw new Error('canvas');
  // Fundo branco: um PNG com transparência não fica preto no JPEG da revista.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(imagem, 0, 0, largura, altura);
  imagem.close();
  const blob = (tipo: string, q: number) =>
    new Promise<Blob>((ok, falha) => tela.toBlob((b) => (b ? ok(b) : falha(new Error(tipo))), tipo, q));
  const [webp, jpg] = await Promise.all([blob('image/webp', 0.82), blob('image/jpeg', 0.82)]);
  if (webp.type !== 'image/webp') throw new Error('webp');
  return { webp, jpg, largura, altura };
}

/**
 * Fotografia do artigo: escolhida aqui, reduzida NO BROWSER a ≤ 1600 px (WebP
 * para o site, JPEG para a revista em PDF) e só depois enviada. Texto
 * alternativo obrigatório; crédito opcional.
 */
export function FotoArtigo({
  id,
  revisao,
  slug,
  actual,
  guardar,
  remover,
}: {
  id: string;
  revisao: number;
  slug: string;
  actual: { url: string; alt: string; credito: string | null } | null;
  guardar: Accao;
  remover: Accao;
}) {
  const ficheiro = useRef<HTMLInputElement>(null);
  const [aEnviar, comecar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);

  return (
    <div className="grid gap-5 border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
      <h2 className="text-[length:var(--text-h3)] tracking-[-0.02em]">Fotografia</h2>
      {actual && !previa && (
        <figure className="grid gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização no admin */}
          <img src={actual.url} alt={actual.alt} className="aspect-[3/2] w-full object-cover" />
          <figcaption className="text-xs text-[color:var(--muted)]">
            {actual.alt}
            {actual.credito ? ` · Foto: ${actual.credito}` : ''}
          </figcaption>
        </figure>
      )}
      {previa && (
        // eslint-disable-next-line @next/next/no-img-element -- pré-visualização local (blob:)
        <img src={previa} alt="" className="aspect-[3/2] w-full object-cover" />
      )}
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (aEnviar) return;
          const form = e.currentTarget;
          const f = ficheiro.current?.files?.[0];
          if (!f) return setErro('Escolha uma imagem.');
          if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setErro('Use JPEG, PNG ou WebP.');
          if (f.size > 25 * 1024 * 1024) return setErro('A imagem original tem mais de 25 MB.');
          setErro(null);
          comecar(async () => {
            try {
              const r = await reduzir(f);
              const dados = new FormData(form);
              dados.delete('ficheiro');
              dados.set('webp', new File([r.webp], 'foto.webp', { type: 'image/webp' }));
              dados.set('jpg', new File([r.jpg], 'foto.jpg', { type: 'image/jpeg' }));
              await guardar(dados);
            } catch (x) {
              unstable_rethrow(x);
              setErro('Não foi possível preparar ou enviar a fotografia. Tente outra imagem.');
            }
          });
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revisao" value={revisao} />
        <input type="hidden" name="slug" value={slug} />
        <div className="grid gap-2">
          <label htmlFor="foto-ficheiro" className="text-sm font-medium">
            Imagem <span className="font-normal text-[color:var(--muted)]">(JPEG, PNG ou WebP; reduzida a 1600 px aqui)</span>
          </label>
          <input
            ref={ficheiro}
            id="foto-ficheiro"
            name="ficheiro"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPrevia((p) => {
                if (p) URL.revokeObjectURL(p);
                return f ? URL.createObjectURL(f) : null;
              });
            }}
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="foto-alt" className="text-sm font-medium">
            Texto alternativo <span className="font-normal text-[color:var(--muted)]">(o que se vê na fotografia)</span>
          </label>
          <input id="foto-alt" name="alt" required minLength={3} maxLength={300} defaultValue={actual?.alt ?? ''} className={inputClass} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="foto-credito" className="text-sm font-medium">
            Crédito <span className="font-normal text-[color:var(--muted)]">(autor ou agência, opcional)</span>
          </label>
          <input id="foto-credito" name="credito" maxLength={160} defaultValue={actual?.credito ?? ''} className={inputClass} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" variant="outline" aria-disabled={aEnviar}>
            {aEnviar ? 'A reduzir e enviar…' : actual ? 'Substituir fotografia' : 'Guardar fotografia'}
          </Button>
          {erro && (
            <p role="alert" className="text-sm text-[color:var(--color-signal-700)]">
              {erro}
            </p>
          )}
        </div>
      </form>
      {actual && (
        <form action={remover}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="revisao" value={revisao} />
          <input type="hidden" name="slug" value={slug} />
          <button type="submit" className="text-sm underline underline-offset-4">
            Retirar a fotografia
          </button>
        </form>
      )}
    </div>
  );
}
