'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ErroLocal } from '@/components/v3/ErroLocal';
import { ecraTactil, observarVisivel, temWebGL, useMovimentoReduzido, usePerto } from './cena';

export interface Barra3D {
  readonly rotulo: string;
  /** Já formatado (ex.: «12,5 %»): o texto que aparece por cima da barra. */
  readonly texto: string;
  readonly valor: number;
}

/**
 * Infografia 3D de barras (three.js) para a série principal da notícia: os
 * valores são os do documento, as alturas são proporcionais, e a cena roda
 * devagar com o rato. Só para valores ≥ 0. Sem WebGL, com movimento reduzido
 * ou se falhar, fica `alternativa` (o gráfico 2D com os mesmos números).
 */
export function Barras3D({
  barras,
  rotulo,
  alternativa,
}: {
  barras: readonly Barra3D[];
  rotulo: string;
  alternativa: ReactNode;
}) {
  const palco = useRef<HTMLDivElement>(null);
  const perto = usePerto(palco);
  const reduzido = useMovimentoReduzido();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => queueMicrotask(() => setWebgl(temWebGL())), []);
  if (reduzido === true || webgl === false) return <>{alternativa}</>;
  return (
    <div ref={palco} className="relative aspect-[16/10] w-full">
      {perto && reduzido === false && webgl && (
        <ErroLocal alternativa={alternativa}>
          <Cena barras={barras} rotulo={rotulo} />
        </ErroLocal>
      )}
    </div>
  );
}

function rotuloEmTextura(texto: string, cor: string, negrito: boolean) {
  const c = document.createElement('canvas');
  const px = 64;
  const fam = getComputedStyle(document.body).fontFamily || 'sans-serif';
  const ctx = c.getContext('2d')!;
  ctx.font = `${negrito ? 700 : 500} ${px}px ${fam}`;
  const w = Math.ceil(ctx.measureText(texto).width) + 24;
  c.width = w;
  c.height = px + 24;
  const g = c.getContext('2d')!;
  g.font = `${negrito ? 700 : 500} ${px}px ${fam}`;
  g.fillStyle = cor;
  g.textBaseline = 'middle';
  g.fillText(texto, 12, c.height / 2);
  return c;
}

function Cena({ barras, rotulo }: { barras: readonly Barra3D[]; rotulo: string }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const [falhou, setFalhou] = useState<Error | null>(null);
  if (falhou) throw falhou;

  useEffect(() => {
    const canvas = tela.current;
    if (!canvas) return;
    let vivo = true;
    let limpar = () => {};
    (async () => {
      const THREE = await import('three');
      if (!vivo) return;
      const tactil = ecraTactil();
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: !tactil, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tactil ? 1.25 : 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const cena = new THREE.Scene();
      const camara = new THREE.PerspectiveCamera(30, 1.6, 0.1, 60);
      cena.add(new THREE.HemisphereLight(0xfff8ee, 0x8a7f6e, 1.7));
      const sol = new THREE.DirectionalLight(0xffffff, 1.6);
      sol.position.set(4, 7, 5);
      cena.add(sol);

      const n = barras.length;
      const passo = 1.1;
      const largura = (n - 1) * passo;
      const max = Math.max(...barras.map((b) => b.valor), 1e-9);
      const ALT = 2.4;
      const descartaveis: { dispose(): void }[] = [];
      const grupo = new THREE.Group();
      cena.add(grupo);

      // Chão: papel com filetes.
      const gChao = new THREE.PlaneGeometry(largura + 2.2, 2.6);
      const mChao = new THREE.MeshStandardMaterial({ color: 0xe6dfd0, roughness: 1 });
      const chao = new THREE.Mesh(gChao, mChao);
      chao.rotation.x = -Math.PI / 2;
      grupo.add(chao);
      descartaveis.push(gChao, mChao);
      const grelha = new THREE.GridHelper(Math.max(largura + 2.2, 2.6), Math.round(largura + 4), 0x121110, 0xb9ae99);
      (grelha.material as { opacity: number; transparent: boolean }).opacity = 0.25;
      (grelha.material as { transparent: boolean }).transparent = true;
      grelha.position.y = 0.002;
      grupo.add(grelha);
      descartaveis.push(grelha.geometry, grelha.material as { dispose(): void });

      const mTinta = new THREE.MeshStandardMaterial({ color: 0x121110, roughness: 0.55, metalness: 0.1 });
      const mFerr = new THREE.MeshStandardMaterial({ color: 0xa8521a, roughness: 0.45, metalness: 0.1 });
      descartaveis.push(mTinta, mFerr);
      const imax = barras.reduce((m, b, i) => (b.valor > barras[m]!.valor ? i : m), 0);
      const colunas: InstanceType<typeof THREE.Mesh>[] = [];
      barras.forEach((b, i) => {
        const h = Math.max(0.02, (b.valor / max) * ALT);
        const g = new THREE.BoxGeometry(0.62, h, 0.62);
        g.translate(0, h / 2, 0);
        descartaveis.push(g);
        const m = new THREE.Mesh(g, i === imax ? mFerr : mTinta);
        m.position.set(i * passo - largura / 2, 0, 0);
        m.scale.y = 0.001;
        grupo.add(m);
        colunas.push(m);
        for (const [texto, y, z, cor, neg, esc] of [
          [b.texto, h + 0.28, 0, '#121110', true, 0.34],
          [b.rotulo.length > 16 ? `${b.rotulo.slice(0, 15)}…` : b.rotulo, 0.01, 0.62, '#4f483e', false, 0.26],
        ] as const) {
          const c = rotuloEmTextura(texto, cor, neg);
          const t = new THREE.CanvasTexture(c);
          t.colorSpace = THREE.SRGBColorSpace;
          const mat = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false });
          const s = new THREE.Sprite(mat);
          s.scale.set((esc * c.width) / c.height, esc, 1);
          s.position.set(i * passo - largura / 2, y, z);
          if (y < 0.1) s.center.set(0.5, 1);
          grupo.add(s);
          descartaveis.push(t, mat);
        }
      });

      const medir = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camara.aspect = w / h;
        const dist = Math.max(5.2, (largura + 2.4) / (2 * Math.tan((15 * Math.PI) / 180) * camara.aspect) * 0.95);
        camara.position.set(0, dist * 0.42, dist);
        camara.lookAt(0, ALT * 0.38, 0);
        camara.updateProjectionMatrix();
      };
      medir();
      const ro = new ResizeObserver(medir);
      ro.observe(canvas);

      let alvo = 0;
      const mover = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        alvo = ((e.clientX - r.left) / r.width - 0.5) * 0.7;
      };
      canvas.addEventListener('pointermove', mover);

      let raf = 0;
      let visivel = true;
      const t0 = performance.now();
      const desenhar = () => {
        raf = 0;
        if (!visivel) return;
        const t = (performance.now() - t0) / 1000;
        colunas.forEach((c, i) => {
          const k = Math.min(1, Math.max(0, (t - i * 0.08) / 0.9));
          c.scale.y = 0.001 + (1 - (1 - k) ** 3) * 0.999;
        });
        const balanco = tactil ? Math.sin(t * 0.35) * 0.22 : alvo + Math.sin(t * 0.3) * 0.08;
        grupo.rotation.y += (balanco - grupo.rotation.y) * 0.05;
        renderer.render(cena, camara);
        raf = requestAnimationFrame(desenhar);
      };
      const pararVisivel = observarVisivel(canvas, (v) => {
        visivel = v;
        if (v && !raf) raf = requestAnimationFrame(desenhar);
      });
      raf = requestAnimationFrame(desenhar);

      limpar = () => {
        cancelAnimationFrame(raf);
        pararVisivel();
        ro.disconnect();
        canvas.removeEventListener('pointermove', mover);
        descartaveis.forEach((d) => d.dispose());
        renderer.dispose();
        renderer.forceContextLoss();
      };
      if (!vivo) limpar();
    })().catch((e: unknown) => {
      if (vivo) setFalhou(e instanceof Error ? e : new Error('barras3d'));
    });
    return () => {
      vivo = false;
      limpar();
    };
  }, [barras]);

  return <canvas ref={tela} role="img" aria-label={rotulo} className="h-full w-full" />;
}
