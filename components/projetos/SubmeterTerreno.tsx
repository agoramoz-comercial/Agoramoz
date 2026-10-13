'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { PROVINCIAS_MZ } from '@/content/projetos/mapa-mz';
import { num } from '@/lib/terrabuild/formato';
import { Button } from '@/components/ui/Button';
import { useRastreio } from './rastreio';

/**
 * «Submeter um terreno» — SIMULADO. Não pede nome, contacto nem coordenadas,
 * não envia nada e não guarda nada: mostra que perguntas a plataforma faria e
 * o que aconteceria a seguir. Para um terreno real, a ligação final leva ao
 * diagnóstico, que é o canal verdadeiro.
 */

const USOS = ['Agricultura', 'Agroindústria', 'Habitação e serviços', 'Energia e água'] as const;
const TITULO = ['Tenho título ou DUAT', 'Está em processo', 'Ainda não sei'] as const;

export function SubmeterTerreno({ className }: { className?: string }) {
  const rastrear = useRastreio('fazenda-inteligente-001');
  const [aberto, setAberto] = useState(false);
  const [feito, setFeito] = useState<null | { provincia: string; area: number; uso: string; titulo: string }>(null);
  const ids = { p: useId(), a: useId(), u: useId(), t: useId() };

  return (
    <Dialog.Root
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (!v) setFeito(null);
      }}
    >
      <Dialog.Trigger asChild>
        <Button variant="outline" size="lg" className={className}>
          Submeter um terreno
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60" />
        <Dialog.Content
          data-surface="light"
          className="fixed top-1/2 left-1/2 z-[61] max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-[color:var(--surface)] p-6 text-[color:var(--on-surface)]"
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-[length:var(--text-h3)] font-semibold">Submeter um terreno</Dialog.Title>
            <Dialog.Close className="inline-flex size-11 items-center justify-center" aria-label="Fechar">
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm text-[color:var(--muted)]">
            Simulação: estas são as primeiras perguntas que a plataforma faria. As respostas não são enviadas nem guardadas, e não pedimos dados pessoais.
          </Dialog.Description>

          {feito ? (
            <div className="mt-6 flex flex-col gap-4" role="status">
              <p className="font-semibold">Simulação concluída. As respostas não foram enviadas nem guardadas.</p>
              <p className="text-sm">
                Numa versão real, um terreno de {num(feito.area, 1)} ha em {feito.provincia}, para {feito.uso.toLowerCase()}, seguiria para
                validação: titularidade ({feito.titulo.toLowerCase()}), levantamento com drone ou topografia, avaliação de água e acessos — e só
                depois teria gémeo digital.
              </p>
              <Button asChild>
                <Link href="/diagnostico?pais=mz&setor=agronegocio">Avaliar um processo crítico</Link>
              </Button>
              <p className="text-xs text-[color:var(--muted)]">
                O diagnóstico é o canal real da AGORAMOZ: aí sim, os dados são enviados, com o seu consentimento.
              </p>
            </div>
          ) : (
            <form
              className="mt-6 flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                rastrear('submit_land');
                setFeito({
                  provincia: PROVINCIAS_MZ.find((p) => p.id === f.get('provincia'))?.nome ?? '—',
                  area: Number(f.get('area')) || 0,
                  uso: String(f.get('uso')),
                  titulo: String(f.get('titulo')),
                });
              }}
            >
              <Campo id={ids.p} rotulo="Província">
                <select id={ids.p} name="provincia" defaultValue="manica" className={CAMPO}>
                  {PROVINCIAS_MZ.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo id={ids.a} rotulo="Área aproximada (ha)">
                <input id={ids.a} name="area" type="number" min={0.5} max={10000} step={0.5} defaultValue={10} required className={CAMPO} />
              </Campo>
              <Campo id={ids.u} rotulo="Uso pretendido">
                <select id={ids.u} name="uso" defaultValue={USOS[0]} className={CAMPO}>
                  {USOS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Campo>
              <Campo id={ids.t} rotulo="Situação da terra">
                <select id={ids.t} name="titulo" defaultValue={TITULO[2]} className={CAMPO}>
                  {TITULO.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Campo>
              <Button type="submit">Simular a submissão</Button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const CAMPO = 'min-h-11 w-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm';

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm">
        {rotulo}
      </label>
      {children}
    </div>
  );
}
