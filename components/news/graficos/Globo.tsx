'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ErroLocal } from '@/components/v3/ErroLocal';
import { ecraTactil, observarVisivel, temWebGL, useMovimentoReduzido, usePerto } from './cena';

export interface PontoGlobo {
  readonly codigo: string;
  /** ISO numérico do world-atlas (para pintar o país). */
  readonly iso: string;
  readonly lon: number;
  readonly lat: number;
  /** Número REAL de notícias publicadas sobre o país. */
  readonly n: number;
}

/**
 * Globo 3D (three.js) com os países cobertos a brilhar: colunas com a altura
 * do número de notícias e arcos a partir de Maputo, onde está a redacção.
 * O mapa-mundo da textura vem de `/news/mundo.json` (Natural Earth, no
 * próprio site). Arrasta-se para rodar. Sem WebGL, com movimento reduzido ou
 * se algo falhar, fica `alternativa` (o mapa plano em SVG).
 */
export function Globo({
  pontos,
  rotulo,
  alternativa,
}: {
  pontos: readonly PontoGlobo[];
  rotulo: string;
  alternativa: ReactNode;
}) {
  const palco = useRef<HTMLDivElement>(null);
  const perto = usePerto(palco);
  const reduzido = useMovimentoReduzido();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => queueMicrotask(() => setWebgl(temWebGL())), []);
  const estatico = reduzido === true || webgl === false;

  return (
    <div ref={palco} className="relative aspect-square w-full">
      {estatico ? (
        <div className="flex h-full items-center">{alternativa}</div>
      ) : (
        perto &&
        reduzido === false &&
        webgl && (
          <ErroLocal alternativa={<div className="flex h-full items-center">{alternativa}</div>}>
            <Cena pontos={pontos} rotulo={rotulo} />
          </ErroLocal>
        )
      )}
    </div>
  );
}

function Cena({ pontos, rotulo }: { pontos: readonly PontoGlobo[]; rotulo: string }) {
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
      const res = await fetch('/news/mundo.json', { cache: 'force-cache' });
      if (!res.ok) throw new Error('mundo.json');
      const mundo = (await res.json()) as { id: string; d: string }[];
      if (!vivo) return;

      const tactil = ecraTactil();
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !tactil,
        alpha: true,
        powerPreference: 'low-power',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tactil ? 1.25 : 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      // ── Textura: o mundo desenhado com Path2D (países cobertos a âmbar).
      const W = tactil ? 1024 : 2048;
      const tex = document.createElement('canvas');
      tex.width = W;
      tex.height = W / 2;
      const ctx = tex.getContext('2d')!;
      ctx.fillStyle = '#0e0c0a';
      ctx.fillRect(0, 0, W, W / 2);
      ctx.save();
      ctx.scale(W / 360, W / 2 / 180);
      ctx.strokeStyle = 'rgba(243,239,230,0.07)';
      ctx.lineWidth = 0.12;
      for (let x = 0; x <= 360; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 180);
        ctx.stroke();
      }
      for (let y = 0; y <= 180; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(360, y);
        ctx.stroke();
      }
      const max = Math.max(1, ...pontos.map((p) => p.n));
      const brilho = new Map(pontos.map((p) => [p.iso, 0.55 + 0.45 * (p.n / max)]));
      ctx.lineWidth = 0.12;
      for (const c of mundo) {
        const p = new Path2D(c.d);
        const b = brilho.get(c.id);
        ctx.fillStyle = b ? `rgba(233,163,92,${b})` : '#2c2823';
        ctx.fill(p);
        ctx.strokeStyle = b ? 'rgba(255,214,160,0.9)' : 'rgba(14,12,10,0.9)';
        ctx.stroke(p);
      }
      ctx.restore();
      const textura = new THREE.CanvasTexture(tex);
      textura.colorSpace = THREE.SRGBColorSpace;
      textura.anisotropy = tactil ? 1 : 4;

      const cena = new THREE.Scene();
      const camara = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camara.position.set(0, 0, 5.1);
      cena.add(new THREE.AmbientLight(0xffffff, 1.6));
      const sol = new THREE.DirectionalLight(0xfff1dc, 1.4);
      sol.position.set(-3, 2, 4);
      cena.add(sol);

      const globo = new THREE.Group();
      globo.rotation.set(0.32, -((25 + 90) * Math.PI) / 180, 0);
      cena.add(globo);

      const geoEsfera = new THREE.SphereGeometry(1, tactil ? 48 : 72, tactil ? 32 : 48);
      const matEsfera = new THREE.MeshStandardMaterial({ map: textura, roughness: 0.85, metalness: 0.05 });
      globo.add(new THREE.Mesh(geoEsfera, matEsfera));

      // Atmosfera: um halo em fresnel, por trás.
      const geoHalo = new THREE.SphereGeometry(1.12, 48, 32);
      const matHalo = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexShader:
          'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(0.91,0.64,0.36,1.0) * i; }',
      });
      cena.add(new THREE.Mesh(geoHalo, matHalo));

      const vec = (lon: number, lat: number, r = 1) => {
        const phi = ((90 - lat) * Math.PI) / 180;
        const theta = ((lon + 180) * Math.PI) / 180;
        return new THREE.Vector3(-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).multiplyScalar(r);
      };

      // Colunas: altura proporcional ao número de notícias.
      const geos: { dispose(): void }[] = [geoEsfera, geoHalo];
      const mats: { dispose(): void }[] = [matEsfera, matHalo];
      const matColuna = new THREE.MeshStandardMaterial({ color: 0xe9a35c, emissive: 0x7a3d0a, roughness: 0.4 });
      const matTopo = new THREE.MeshBasicMaterial({ color: 0xfff2dc });
      mats.push(matColuna, matTopo);
      const cima = new THREE.Vector3(0, 1, 0);
      for (const p of pontos) {
        const h = 0.05 + 0.2 * (p.n / max);
        const g = new THREE.CylinderGeometry(0.016, 0.022, h, 12);
        g.translate(0, h / 2, 0);
        geos.push(g);
        const col = new THREE.Mesh(g, matColuna);
        const normal = vec(p.lon, p.lat).normalize();
        col.position.copy(normal);
        col.quaternion.setFromUnitVectors(cima, normal);
        globo.add(col);
        const gt = new THREE.SphereGeometry(0.026, 12, 8);
        geos.push(gt);
        const topo = new THREE.Mesh(gt, matTopo);
        topo.position.copy(normal.clone().multiplyScalar(1 + h));
        globo.add(topo);
      }

      // Arcos a partir de Maputo, onde está a redacção, com um pulso a correr.
      const origem = vec(32.6, -25.97, 1.003);
      const matArco = new THREE.MeshBasicMaterial({ color: 0xe9a35c, transparent: true, opacity: 0.75 });
      const matPulso = new THREE.MeshBasicMaterial({ color: 0xffffff });
      mats.push(matArco, matPulso);
      const pulsos: { curva: InstanceType<typeof THREE.QuadraticBezierCurve3>; malha: InstanceType<typeof THREE.Mesh>; fase: number }[] = [];
      pontos
        .filter((p) => p.codigo !== 'mz')
        .forEach((p, i) => {
          const fim = vec(p.lon, p.lat, 1.003);
          const meio = origem.clone().add(fim).multiplyScalar(0.5);
          meio.normalize().multiplyScalar(1 + 0.08 + origem.distanceTo(fim) * 0.2);
          const curva = new THREE.QuadraticBezierCurve3(origem, meio, fim);
          const g = new THREE.TubeGeometry(curva, 48, 0.0045, 6, false);
          geos.push(g);
          globo.add(new THREE.Mesh(g, matArco));
          const gp = new THREE.SphereGeometry(0.014, 8, 6);
          geos.push(gp);
          const malha = new THREE.Mesh(gp, matPulso);
          globo.add(malha);
          pulsos.push({ curva, malha, fase: i * 0.17 });
        });

      // ── Tamanho, arrasto e ciclo de desenho (parado fora do ecrã).
      const medir = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camara.aspect = w / h;
        camara.updateProjectionMatrix();
      };
      medir();
      const ro = new ResizeObserver(medir);
      ro.observe(canvas);

      let arrasto: { x: number; y: number } | null = null;
      let velocidade = 0.0016;
      const baixo = (e: PointerEvent) => {
        arrasto = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
      };
      const mover = (e: PointerEvent) => {
        if (!arrasto) return;
        const dx = e.clientX - arrasto.x;
        const dy = e.clientY - arrasto.y;
        arrasto = { x: e.clientX, y: e.clientY };
        globo.rotation.y += dx * 0.006;
        globo.rotation.x = Math.max(-0.9, Math.min(0.9, globo.rotation.x + dy * 0.004));
        velocidade = dx * 0.0004 || velocidade;
      };
      const cimaP = () => {
        arrasto = null;
        velocidade = Math.sign(velocidade || 1) * 0.0016;
      };
      canvas.addEventListener('pointerdown', baixo);
      canvas.addEventListener('pointermove', mover);
      canvas.addEventListener('pointerup', cimaP);
      canvas.addEventListener('pointercancel', cimaP);

      let raf = 0;
      let visivel = true;
      const t0 = performance.now();
      const desenhar = () => {
        raf = 0;
        if (!visivel) return;
        if (!arrasto) globo.rotation.y += velocidade;
        const t = (performance.now() - t0) / 1000;
        for (const p of pulsos) p.malha.position.copy(p.curva.getPoint((t * 0.28 + p.fase) % 1));
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
        canvas.removeEventListener('pointerdown', baixo);
        canvas.removeEventListener('pointermove', mover);
        canvas.removeEventListener('pointerup', cimaP);
        canvas.removeEventListener('pointercancel', cimaP);
        geos.forEach((g) => g.dispose());
        mats.forEach((m) => m.dispose());
        textura.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
      };
      if (!vivo) limpar();
    })().catch((e: unknown) => {
      if (vivo) setFalhou(e instanceof Error ? e : new Error('globo'));
    });

    return () => {
      vivo = false;
      limpar();
    };
  }, [pontos]);

  return (
    <canvas
      ref={tela}
      role="img"
      aria-label={rotulo}
      className="h-full w-full cursor-grab touch-pan-y active:cursor-grabbing"
    />
  );
}
