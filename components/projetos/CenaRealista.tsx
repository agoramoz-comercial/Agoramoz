'use client';

import { Environment, Sky, useGLTF, useTexture } from '@react-three/drei';
import { Component, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { Elemento, Projeto, Retangulo } from '@/content/projetos/tipos';
import { cantos } from '@/lib/terrabuild/geometria';
import { estadoNaFase, type EstadoElemento } from '@/lib/terrabuild/obra';
import { aMundo, cota } from './mundo';

/**
 * A camada realista da vista 3D (níveis Normal e Alta): os modelos, a
 * vegetação e as texturas feitos em Blender a partir dos MESMOS dados do site
 * (.qa/blender), servidos de public/terrabuild. Sem descodificadores (a CSP
 * não permite WebAssembly): KHR_mesh_quantization e WebP, que o three lê
 * sozinho. O nível Leve nunca chega a montar nada daqui, e não descarrega nada.
 */

export const ATIVOS = {
  fazenda: '/terrabuild/fazenda-001.glb',
  instancias: '/terrabuild/instancias.glb',
  texturas: ['savana', 'solo', 'solo-normal', 'gravilha'].map((n) => `/terrabuild/tex/${n}.webp`),
};

/** Metros por repetição das texturas do chão (os UV vêm em metros). */
export const TILE = { chao: 14, solo: 16, gravilha: 4 } as const;

const SINAL = '#ff3b10';
const EIXO_Y = new THREE.Vector3(0, 1, 0);

export interface Recursos {
  readonly nos: Readonly<Record<string, THREE.Object3D>>;
  readonly materiais: Readonly<Record<string, THREE.Material>>;
  readonly instancias: Readonly<Record<string, THREE.Object3D>>;
  readonly terreno: THREE.MeshStandardMaterial;
  readonly solo: THREE.MeshStandardMaterial;
  readonly soloCultura: THREE.MeshStandardMaterial;
  readonly estrada: THREE.MeshStandardMaterial;
  readonly entorno: THREE.MeshStandardMaterial;
}

/** Suspende até os GLB e as texturas chegarem (a cena procedimental fica entretanto). */
export function useRecursos(): Recursos {
  const fazenda = useGLTF(ATIVOS.fazenda, false, false);
  const inst = useGLTF(ATIVOS.instancias, false, false);
  const [savana, solo, soloNormal, gravilha] = useTexture(ATIVOS.texturas) as THREE.Texture[];
  const proprios = useMemo(() => {
    const repetir = (t: THREE.Texture, cor: boolean) => {
      const c = t.clone();
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.colorSpace = cor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      c.anisotropy = 4;
      c.needsUpdate = true;
      return c;
    };
    const chao = repetir(savana!, true);
    const lavrado = repetir(solo!, true);
    const relevo = repetir(soloNormal!, false);
    const pedra = repetir(gravilha!, true);
    // As faixas assentes (talhões, estradas) são desenhadas viradas para baixo: dupla face.
    const assente = { roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
    return {
      texturas: [chao, lavrado, relevo, pedra],
      terreno: new THREE.MeshStandardMaterial({ map: chao, vertexColors: true, roughness: 0.95 }),
      solo: new THREE.MeshStandardMaterial({ map: lavrado, normalMap: relevo, ...assente }),
      // Com cultura, ao longe lê-se a copa verde em linhas, não o solo.
      soloCultura: new THREE.MeshStandardMaterial({ color: '#5d7a2e', normalMap: relevo, ...assente }),
      estrada: new THREE.MeshStandardMaterial({ map: pedra, ...assente }),
      entorno: new THREE.MeshStandardMaterial({ map: chao, color: '#e4d8bb', roughness: 1 }),
    };
  }, [savana, solo, soloNormal, gravilha]);
  useEffect(
    () => () => {
      for (const t of proprios.texturas) t.dispose();
      for (const m of [proprios.terreno, proprios.solo, proprios.soloCultura, proprios.estrada, proprios.entorno]) m.dispose();
    },
    [proprios],
  );
  return useMemo(
    () => ({
      nos: fazenda.nodes,
      materiais: fazenda.materials,
      instancias: inst.nodes,
      terreno: proprios.terreno,
      solo: proprios.solo,
      soloCultura: proprios.soloCultura,
      estrada: proprios.estrada,
      entorno: proprios.entorno,
    }),
    [fazenda, inst, proprios],
  );
}

/** Se um activo falhar (rede, ficheiro), fica a cena procedimental, sem quadro preto. */
export class LimiteRecursos extends Component<{ alternativa: ReactNode; children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false };
  static getDerivedStateFromError() {
    return { falhou: true };
  }
  render() {
    return this.state.falhou ? this.props.alternativa : this.props.children;
  }
}

/* --------------------------------------------------------------- céu e luz */

/**
 * Céu físico (Preetham, no shader do three) com o sol da hora escolhida, e o
 * mesmo céu como luz ambiente e reflexos: uma só renderização para um cubo
 * pequeno, refeita só quando a hora muda. Nada é descarregado.
 */
export function Ceu({ sol, ambiente }: { sol: [number, number, number]; ambiente: boolean }) {
  return (
    <>
      <Sky distance={1500} sunPosition={sol} turbidity={3} rayleigh={0.9} mieCoefficient={0.003} mieDirectionalG={0.8} />
      {ambiente ? (
        <Environment key={sol.join(',')} frames={1} resolution={64} environmentIntensity={0.55}>
          <Sky distance={1500} sunPosition={sol} turbidity={3} rayleigh={0.9} mieCoefficient={0.003} mieDirectionalG={0.8} />
        </Environment>
      ) : null}
      <fog attach="fog" args={['#b7c6d3', 650, 2200]} />
    </>
  );
}

/**
 * O mato à volta da propriedade, até à neblina do horizonte: sem ele, o
 * terreno flutuava num vazio. Um só quadrado, um pouco abaixo da cota mínima.
 */
export function Entorno({ p, material }: { p: Projeto; material: THREE.Material }) {
  const geo = useMemo(() => {
    let minimo = Infinity;
    for (let x = 0; x <= p.terreno.largura; x += 20)
      for (let y = 0; y <= p.terreno.profundidade; y += 20) minimo = Math.min(minimo, cota(p.terreno, x, y));
    const lado = 4000;
    const g = new THREE.PlaneGeometry(lado, lado);
    g.rotateX(-Math.PI / 2);
    g.translate(0, minimo - 0.4, 0);
    const uv = g.attributes.uv!;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * lado) / TILE.chao, (uv.getY(i) * lado) / TILE.chao);
    return g;
  }, [p]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={material} receiveShadow dispose={null} />;
}

/* ------------------------------------------------------------- construções */

interface Volume {
  readonly cx: number;
  readonly cy: number;
  readonly w: number;
  readonly d: number;
  readonly h: number;
  readonly rot: number;
}

/** Onde e quanto ocupa uma construção modelada (null se não é construção). */
export function volume(e: Elemento): Volume | null {
  const f = e.forma;
  if (f.tipo === 'caixa') return { cx: f.r.cx, cy: f.r.cy, w: f.r.w, d: f.r.d, h: f.altura, rot: f.r.rot ?? 0 };
  if (f.tipo === 'cilindro') return { cx: f.cx, cy: f.cy, w: 2 * f.raio, d: 2 * f.raio, h: f.altura, rot: 0 };
  if (f.tipo === 'painel') return { cx: f.r.cx, cy: f.r.cy, w: f.r.w, d: f.r.d, h: 2, rot: f.r.rot ?? 0 };
  return null;
}

/**
 * Uma construção do Blender no seu lugar. Concluída: o modelo. Em obra: o
 * modelo cortado a meia altura, dentro do volume final. Planeada ou futura:
 * só o volume, a tracejado de luz. Selecionada: o volume a sinal.
 */
export function ElementoModelo({
  p,
  e,
  no,
  estado,
  progresso,
  selecionado,
  onSelecionar,
}: {
  p: Projeto;
  e: Elemento;
  no: THREE.Object3D;
  estado: EstadoElemento;
  progresso: boolean;
  selecionado: boolean;
  onSelecionar: (id: string) => void;
}) {
  const v = volume(e)!;
  const [X, Z] = aMundo(p, v.cx, v.cy);
  const y = cota(p.terreno, v.cx, v.cy);
  const fantasma = estado === 'ausente' || estado === 'futuro';
  const emObra = estado === 'em-obra';
  const corte = useMemo(() => (emObra ? new THREE.Plane(new THREE.Vector3(0, -1, 0), y + v.h * 0.55) : null), [emObra, y, v.h]);
  if (estado === 'ausente' && !progresso) return null;
  return (
    <group
      position={[X, y, Z]}
      rotation={[0, (v.rot * Math.PI) / 180, 0]}
      onClick={(ev) => {
        ev.stopPropagation();
        onSelecionar(e.id);
      }}
    >
      {!fantasma ? <Clone no={no} corte={corte} /> : null}
      {fantasma || emObra || selecionado ? (
        <Arestas w={v.w} d={v.d} h={v.h} cor={selecionado ? SINAL : '#ededeb'} opacidade={fantasma ? 0.35 : 0.95} />
      ) : null}
    </group>
  );
}

/**
 * Cópia leve do nó (partilha geometria e materiais com o GLB). O quantize põe
 * escala e translação no próprio nó: por isso a cópia vai dentro de um grupo
 * posicionado, sem se lhe mexer. `dispose={null}`: desmontar não pode apagar
 * a geometria partilhada.
 */
function Clone({ no, corte }: { no: THREE.Object3D; corte: THREE.Plane | null }) {
  const { objeto, criados } = useMemo(() => {
    const c = no.clone(true);
    const criados: THREE.Material[] = [];
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      if (corte) {
        const novo = (m.material as THREE.Material).clone();
        novo.clippingPlanes = [corte];
        novo.clipShadows = true;
        novo.side = THREE.DoubleSide;
        m.material = novo;
        criados.push(novo);
      }
    });
    return { objeto: c, criados };
  }, [no, corte]);
  useEffect(() => () => criados.forEach((m) => m.dispose()), [criados]);
  return <primitive object={objeto} dispose={null} />;
}

function Arestas({ w, d, h, cor, opacidade }: { w: number; d: number; h: number; cor: string; opacidade: number }) {
  const geo = useMemo(() => {
    const caixa = new THREE.BoxGeometry(w, h + 1, d);
    const a = new THREE.EdgesGeometry(caixa);
    caixa.dispose();
    a.translate(0, (h + 1) / 2 - 1, 0);
    return a;
  }, [w, d, h]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={cor} transparent opacity={opacidade} />
    </lineSegments>
  );
}

/* ------------------------------------------------- vegetação e adereços */

const VEG_DA_CULTURA: Readonly<Record<string, string>> = {
  milho: 'veg-milho',
  feijao: 'veg-feijao',
  horticolas: 'veg-horticolas',
  banana: 'veg-bananeira',
};

/** Densidade máxima visível, plantas por m² (o orçamento de triângulos pode baixar). */
const DENSIDADE: Readonly<Record<string, number>> = { 'veg-bananeira': 1 / 9, default: 1 / 4 };

/** Pseudo-aleatório com semente: a mesma fazenda em cada visita, sem saltos ao re-desenhar. */
function aleatorio(semente: number) {
  let s = semente >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function colocar(p: Projeto, x: number, y: number, rot: number, escala: number): THREE.Matrix4 {
  const [X, Z] = aMundo(p, x, y);
  return new THREE.Matrix4().compose(
    new THREE.Vector3(X, cota(p.terreno, x, y), Z),
    new THREE.Quaternion().setFromAxisAngle(EIXO_Y, rot),
    new THREE.Vector3(escala, escala, escala),
  );
}

function distanciaASegmento(x: number, y: number, a: readonly [number, number], b: readonly [number, number]): number {
  const [ax, ay] = a;
  const [bx, by] = b;
  const l2 = (bx - ax) ** 2 + (by - ay) ** 2;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / l2));
  return Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay)));
}

function perto(x: number, y: number, pontos: readonly (readonly [number, number])[], m: number): boolean {
  for (let i = 0; i < pontos.length - 1; i++) if (distanciaASegmento(x, y, pontos[i]!, pontos[i + 1]!) < m) return true;
  return false;
}

function estradas(p: Projeto) {
  return p.elementos.flatMap((e) => (e.forma.tipo === 'linha' && e.forma.largura > 1 ? [e.forma.pontos] : []));
}

/** Árvores na bordadura, por dentro da vedação, fora de construções e estradas. */
function arvoresDeBordadura(p: Projeto): THREE.Matrix4[] {
  const L = p.terreno.largura;
  const H = p.terreno.profundidade;
  const recuo = 6;
  const passo = 22;
  const rnd = aleatorio(7);
  const ocupado = p.elementos.flatMap((e) => {
    const f = e.forma;
    if (f.tipo === 'cilindro') return [{ cx: f.cx, cy: f.cy, w: 2 * f.raio, d: 2 * f.raio }];
    return 'r' in f ? [f.r] : [];
  });
  const vias = estradas(p);
  const lados: [number, number, number, number][] = [
    [recuo, recuo, L - recuo, recuo],
    [L - recuo, recuo, L - recuo, H - recuo],
    [L - recuo, H - recuo, recuo, H - recuo],
    [recuo, H - recuo, recuo, recuo],
  ];
  const out: THREE.Matrix4[] = [];
  for (const [x0, y0, x1, y1] of lados) {
    const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / passo);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5 + (rnd() - 0.5) * 0.4) / n;
      const x = x0 + (x1 - x0) * t + (rnd() - 0.5) * 4;
      const y = y0 + (y1 - y0) * t + (rnd() - 0.5) * 4;
      if (ocupado.some((q) => Math.abs(x - q.cx) < q.w / 2 + 6 && Math.abs(y - q.cy) < q.d / 2 + 6)) continue;
      if (vias.some((v) => perto(x, y, v, 8))) continue;
      out.push(colocar(p, x, y, rnd() * Math.PI * 2, 0.8 + rnd() * 0.45));
    }
  }
  return out;
}

/** Plantas em linhas dentro de um talhão, com um pouco de desalinho. */
function plantasNoTalhao(p: Projeto, r: Retangulo, n: number, semente: number): THREE.Matrix4[] {
  if (n <= 0) return [];
  const s = Math.sqrt((r.w * r.d) / n);
  const nu = Math.max(1, Math.round(r.w / s));
  const nv = Math.max(1, Math.round(r.d / s));
  const [k0, k1, k2, k3] = cantos(r) as readonly (readonly [number, number])[];
  const rnd = aleatorio(semente);
  const out: THREE.Matrix4[] = [];
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const u = (i + 0.5 + (rnd() - 0.5) * 0.5) / nu;
      const v = (j + 0.5 + (rnd() - 0.5) * 0.3) / nv;
      const ax = k0![0] + (k1![0] - k0![0]) * u;
      const ay = k0![1] + (k1![1] - k0![1]) * u;
      const bx = k3![0] + (k2![0] - k3![0]) * u;
      const by = k3![1] + (k2![1] - k3![1]) * u;
      out.push(colocar(p, ax + (bx - ax) * v, ay + (by - ay) * v, rnd() * Math.PI * 2, 0.85 + rnd() * 0.3));
    }
  return out;
}

/** Postes ao longo de uma linha, com a travessa perpendicular à linha. */
function aoLongo(p: Projeto, pontos: readonly (readonly [number, number])[], passo: number, longe: (x: number, y: number) => boolean) {
  const out: THREE.Matrix4[] = [];
  for (let i = 0; i < pontos.length - 1; i++) {
    const [ax, ay] = pontos[i]!;
    const [bx, by] = pontos[i + 1]!;
    const comp = Math.hypot(bx - ax, by - ay);
    // No mundo: X = x, Z = −y. A travessa (eixo X do modelo) fica perpendicular.
    const rot = Math.atan2(-(bx - ax), by - ay);
    for (let d = i === 0 ? 0 : passo; d < comp; d += passo) {
      const x = ax + ((bx - ax) * d) / comp;
      const y = ay + ((by - ay) * d) / comp;
      if (longe(x, y)) out.push(colocar(p, x, y, rot, 1));
    }
  }
  return out;
}

function triangulosDe(modelo: THREE.Object3D): number {
  let t = 0;
  modelo.traverse((o) => {
    const g = (o as THREE.Mesh).geometry;
    if (g) t += (g.index ? g.index.count : g.attributes.position!.count) / 3;
  });
  return Math.max(1, t);
}

export function Instancias({
  p,
  r,
  fase,
  cultura,
  camadas,
  orcamentoCulturas,
}: {
  p: Projeto;
  r: Recursos;
  fase: number;
  cultura: string;
  camadas: readonly string[];
  orcamentoCulturas: number;
}) {
  const arvores = useMemo(() => arvoresDeBordadura(p), [p]);

  const linhas = useMemo(() => {
    const vias = estradas(p);
    const foraDasVias = (x: number, y: number) => !vias.some((v) => perto(x, y, v, 4));
    return p.elementos.flatMap((e) => {
      const f = e.forma;
      if (f.tipo !== 'linha' || f.largura > 1) return [];
      if (e.id === 'vedacao') return [{ e, modelo: 'adr-estaca', m: aoLongo(p, f.pontos, 5, foraDasVias) }];
      if (e.camada === 'eletrica') return [{ e, modelo: 'adr-poste', m: aoLongo(p, f.pontos, 40, () => true) }];
      return [];
    });
  }, [p]);

  // Culturas só depois de semeadas (fase 8), e só dentro do orçamento do nível.
  const verTalhoes = camadas.includes('talhoes');
  const plantas = useMemo(() => {
    if (fase < 8 || !verTalhoes) return [];
    const doTalhao = (id: string) => {
      const escolhida = p.culturas.find((c) => c.id === cultura && c.talhoes.includes(id) && VEG_DA_CULTURA[c.id]);
      return (escolhida ?? p.culturas.find((c) => c.talhoes.includes(id) && VEG_DA_CULTURA[c.id]))?.id;
    };
    const talhoes = p.elementos.flatMap((e) => {
      if (e.forma.tipo !== 'area' || e.camada !== 'talhoes') return [];
      const c = doTalhao(e.id);
      return c ? [{ r: e.forma.r, veg: VEG_DA_CULTURA[c]! }] : [];
    });
    const areaTotal = talhoes.reduce((s, t) => s + t.r.w * t.r.d, 0);
    const porVeg = new Map<string, THREE.Matrix4[]>();
    talhoes.forEach((t, i) => {
      const area = t.r.w * t.r.d;
      const pelaDensidade = area * (DENSIDADE[t.veg] ?? DENSIDADE.default!);
      const peloOrcamento = (orcamentoCulturas * (area / areaTotal)) / triangulosDe(r.instancias[t.veg]!);
      const m = plantasNoTalhao(p, t.r, Math.floor(Math.min(pelaDensidade, peloOrcamento)), 101 + i);
      porVeg.set(t.veg, [...(porVeg.get(t.veg) ?? []), ...m]);
    });
    return [...porVeg.entries()];
  }, [p, r, fase, cultura, verTalhoes, orcamentoCulturas]);

  const visivel = (e: Elemento) => {
    const s = estadoNaFase(e, fase as Parameters<typeof estadoNaFase>[1]);
    return (s === 'concluido' || s === 'em-obra') && camadas.includes(e.camada);
  };

  return (
    <>
      <Instanciado modelo={r.instancias['veg-arvore']!} matrizes={arvores} sombra />
      {linhas.map((l) => (visivel(l.e) ? <Instanciado key={l.e.id} modelo={r.instancias[l.modelo]!} matrizes={l.m} sombra /> : null))}
      {plantas.map(([veg, m]) => (
        <Instanciado key={veg} modelo={r.instancias[veg]!} matrizes={m} sombra={false} />
      ))}
    </>
  );
}

/** Um modelo (com uma ou mais malhas) repetido com instâncias: uma chamada de desenho por malha. */
function Instanciado({ modelo, matrizes, sombra }: { modelo: THREE.Object3D; matrizes: readonly THREE.Matrix4[]; sombra: boolean }) {
  // A matriz de cada malha relativa à raiz do modelo (inclui a do quantize).
  const partes = useMemo(() => {
    const out: { geo: THREE.BufferGeometry; mat: THREE.Material; local: THREE.Matrix4 }[] = [];
    const visitar = (o: THREE.Object3D, acima: THREE.Matrix4) => {
      const m = acima.clone().multiply(o.matrix);
      const malha = o as THREE.Mesh;
      if (malha.isMesh) out.push({ geo: malha.geometry, mat: malha.material as THREE.Material, local: m });
      for (const f of o.children) visitar(f, m);
    };
    visitar(modelo, new THREE.Matrix4());
    return out;
  }, [modelo]);
  if (matrizes.length === 0) return null;
  return (
    <>
      {partes.map((pt, i) => (
        <MalhaInstanciada key={i} geo={pt.geo} mat={pt.mat} local={pt.local} matrizes={matrizes} sombra={sombra} />
      ))}
    </>
  );
}

function MalhaInstanciada({
  geo,
  mat,
  local,
  matrizes,
  sombra,
}: {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  local: THREE.Matrix4;
  matrizes: readonly THREE.Matrix4[];
  sombra: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const im = ref.current;
    if (!im) return;
    const m = new THREE.Matrix4();
    matrizes.forEach((mt, i) => im.setMatrixAt(i, m.multiplyMatrices(mt, local)));
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
  }, [matrizes, local]);
  return <instancedMesh ref={ref} args={[geo, mat, matrizes.length]} castShadow={sombra} receiveShadow dispose={null} />;
}
