'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Elemento, Projeto, Retangulo } from '@/content/projetos/tipos';
import { cantos } from '@/lib/terrabuild/geometria';
import { INCLINACAO } from '@/lib/terrabuild/quantidades';
import { interferencias } from '@/lib/terrabuild/interferencia';
import { estadoNaFase, type EstadoElemento } from '@/lib/terrabuild/obra';
import { direcaoSol, posicaoSol } from '@/lib/terrabuild/sol';
import { abaixo, detectarNivel, lerSinais, minimo, NOME_NIVEL, ORCAMENTO, type Nivel, type Orcamento } from '@/lib/terrabuild/qualidade';
import { altura, COTA_CHEIA, distanciaAoDreno } from '@/lib/terrabuild/terreno';
import { Ceu, ElementoModelo, Entorno, Instancias, LimiteRecursos, TILE, useRecursos, volume, type Recursos } from './CenaRealista';
import { useGemeo, type Base, type EstadoGemeo } from './estado';
import { aMundo, cota } from './mundo';

/**
 * A vista 3D do gémeo, feita no browser a partir dos mesmos dados da planta.
 * Por nível de qualidade (lib/terrabuild/qualidade): Leve é toda procedimental
 * e não descarrega nada; Normal e Alta juntam os modelos, a vegetação e as
 * texturas do Blender (CenaRealista), do próprio site, nunca de fora.
 * `frameloop="demand"`: só desenha quando algo muda; parada, não gasta bateria.
 * Eixos e cotas: ver ./mundo.
 */

const COR = {
  giz: '#ededeb',
  tinta: '#141417',
  agua: '#3987e5',
  eletrica: '#d95926',
  talhoes: '#199e70',
  sinal: '#ff3b10',
} as const;

const DIA_DO_ANO = 172; // inverno austral: sombras mais compridas, mais legíveis

export function Cena3D({
  selecionado,
  onSelecionar,
  onFalha,
}: {
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
  onFalha: () => void;
}) {
  const { projeto: p, estado } = useGemeo();
  const [sinais] = useState(lerSinais);
  // Se a cena engasgar (só no modo automático), desce um degrau e diz porquê.
  const [teto, setTeto] = useState<Nivel>('alta');
  const automatico = estado.qualidade === 'auto';
  const nivel = automatico ? minimo(detectarNivel(sinais), teto) : estado.qualidade;
  const orc = ORCAMENTO[nivel];
  const caixa = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={caixa}
      className="relative aspect-[424/324] w-full"
      data-qualidade={nivel}
      role="group"
      aria-roledescription="vista 3D"
      aria-label={`Vista 3D do terreno fictício na fase «${p.fases[estado.fase]!.nome}». Arraste para rodar; roda do rato ou dois dedos para aproximar. Sem arrastar, a Planta 2D e a lista «Elementos do terreno» dão a mesma informação.`}
      data-testid="cena-3d"
    >
      {/* Mudar de nível recria o contexto: o dpr e as sombras só se escolhem ao criar. */}
      <Canvas
        key={nivel}
        frameloop="demand"
        dpr={[orc.dpr[0], orc.dpr[1]]}
        shadows={orc.sombras ? SOMBRAS : false}
        camera={{ position: [210, 190, 260], fov: 38, near: 1, far: 3000 }}
        gl={GL}
        onPointerMissed={() => onSelecionar(null)}
      >
        <color attach="background" args={[COR.tinta]} />
        <Conteudo p={p} estado={estado} orc={orc} selecionado={selecionado} onSelecionar={onSelecionar} onFalha={onFalha} />
        <OrbitControls makeDefault target={[0, 8, 0]} maxPolarAngle={Math.PI / 2.15} minDistance={60} maxDistance={700} enableDamping={false} />
        {automatico && nivel !== 'leve' ? <MonitorFluidez onLento={() => setTeto(abaixo(nivel))} /> : null}
        <Medidor caixa={caixa} />
      </Canvas>
      <p role="status" className="pointer-events-none absolute right-3 bottom-3 max-w-[60%] bg-[color:var(--color-ink-950)]/70 px-2 text-right text-xs text-white empty:bg-transparent empty:p-0">
        {automatico && teto !== 'alta' ? `Qualidade 3D: ${NOME_NIVEL[nivel]}, para manter a fluidez neste dispositivo.` : ''}
      </p>
    </div>
  );
}

/**
 * PCF (o «soft» foi retirado do three r186) e sem actualização automática: o
 * mapa de sombras só se refaz quando a luz ou os objectos mudam, não a cada
 * quadro de rotação da câmara. Fundo opaco: o compositor não mistura alfa.
 */
const SOMBRAS = { type: THREE.PCFShadowMap, autoUpdate: false } as const;
const GL = { antialias: true, alpha: false, powerPreference: 'default' } as const;

/**
 * Desce um nível se a cena engasgar enquanto se mexe: 45 quadros seguidos
 * abaixo de 24 fps. Com frameloop="demand" há pausas entre quadros; essas
 * não contam (o PerformanceMonitor do drei contava-as como lentidão e
 * acabava por rebaixar máquinas rápidas).
 */
function MonitorFluidez({ onLento }: { onLento: () => void }) {
  const lentos = useRef(0);
  useFrame((_, dt) => {
    if (dt > 0.25) {
      lentos.current = 0;
      return;
    }
    lentos.current = dt > 1 / 24 ? lentos.current + 1 : 0;
    if (lentos.current >= 45) {
      lentos.current = 0;
      onLento();
    }
  });
  return null;
}

/** Triângulos do último quadro, no contentor: a QA confirma o orçamento do nível. */
function Medidor({ caixa }: { caixa: React.RefObject<HTMLDivElement | null> }) {
  const obter = useThree((s) => s.get);
  useEffect(() => {
    const { scene } = obter();
    scene.onAfterRender = (r) => {
      if (caixa.current) caixa.current.dataset.triangulos = String(r.info.render.triangles);
    };
    return () => {
      scene.onAfterRender = () => {};
    };
  }, [obter, caixa]);
  return null;
}

function Conteudo({
  p,
  estado,
  orc,
  selecionado,
  onSelecionar,
  onFalha,
}: {
  p: Projeto;
  estado: EstadoGemeo;
  orc: Orcamento;
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
  onFalha: () => void;
}) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const obter = useThree((s) => s.get);

  // Perder o contexto (GPU reiniciada, separador em segundo plano num
  // telemóvel) devolve a pessoa à planta 2D em vez de deixar um quadro preto.
  useEffect(() => {
    const el = gl.domElement;
    const perdido = (e: Event) => {
      e.preventDefault();
      onFalha();
    };
    el.addEventListener('webglcontextlost', perdido);
    return () => el.removeEventListener('webglcontextlost', perdido);
  }, [gl, onFalha]);

  // Só o que a cena desenha pede um quadro novo (e sombras novas); a cultura,
  // os hectares ou a classe da estimativa não mexem no 3D.
  useEffect(() => {
    obter().gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [estado.casa, estado.fase, estado.hora, estado.base, estado.camadas, estado.cultura, selecionado, obter, invalidate]);

  // Construções em obra mostram-se cortadas a meia altura (plano de corte local).
  useEffect(() => {
    obter().gl.localClippingEnabled = true;
  }, [obter]);

  const hora = estado.hora;
  const luz = useMemo<[number, number, number]>(() => {
    const sol = direcaoSol(posicaoSol(hora, DIA_DO_ANO));
    return [sol[0] * 400, Math.max(sol[2], 0.08) * 400, -sol[1] * 400];
  }, [hora]);
  const mundo = (r: Recursos | null) => (
    <Mundo p={p} estado={estado} selecionado={selecionado} onSelecionar={onSelecionar} recursos={r} ambiente={0.55} />
  );

  return (
    <>
      <directionalLight
        position={luz}
        intensity={2.1}
        castShadow={orc.sombras > 0}
        shadow-mapSize={[orc.sombras || 1024, orc.sombras || 1024]}
        shadow-camera-left={-230}
        shadow-camera-right={230}
        shadow-camera-top={180}
        shadow-camera-bottom={-180}
        shadow-camera-near={10}
        shadow-camera-far={1200}
        shadow-bias={-0.0006}
      />
      {orc.modelos ? (
        // Enquanto os modelos descarregam (ou se falharem), fica a cena procedimental.
        <LimiteRecursos alternativa={mundo(null)}>
          <Suspense fallback={mundo(null)}>
            <MundoRealista p={p} estado={estado} orc={orc} sol={luz} selecionado={selecionado} onSelecionar={onSelecionar} />
          </Suspense>
        </LimiteRecursos>
      ) : (
        mundo(null)
      )}
    </>
  );
}

function MundoRealista({
  p,
  estado,
  orc,
  sol,
  selecionado,
  onSelecionar,
}: {
  p: Projeto;
  estado: EstadoGemeo;
  orc: Orcamento;
  sol: [number, number, number];
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
}) {
  const r = useRecursos();
  const obter = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);
  // Os modelos chegaram: um quadro novo, com sombras.
  useEffect(() => {
    obter().gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [r, obter, invalidate]);
  const ceu = estado.base === 'ortofoto';
  return (
    <>
      {ceu ? (
        <>
          <Ceu sol={sol} ambiente={orc.ambiente} />
          <Entorno p={p} material={r.entorno} />
        </>
      ) : null}
      <Mundo
        p={p}
        estado={estado}
        selecionado={selecionado}
        onSelecionar={onSelecionar}
        recursos={r}
        ambiente={ceu && orc.ambiente ? 0.2 : 0.55}
      />
      <Instancias p={p} r={r} fase={estado.fase} cultura={estado.cultura} camadas={estado.camadas} orcamentoCulturas={orc.triangulosCulturas} />
    </>
  );
}

interface Materiais {
  readonly talhao: THREE.Material | null;
  readonly estrada: THREE.Material | null;
}

/** O terreno e tudo o que nele assenta; com `recursos`, nas versões do Blender. */
function Mundo({
  p,
  estado,
  selecionado,
  onSelecionar,
  recursos,
  ambiente,
}: {
  p: Projeto;
  estado: EstadoGemeo;
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
  recursos: Recursos | null;
  ambiente: number;
}) {
  const ver = (c: string) => (estado.camadas as readonly string[]).includes(c);
  const satelite = recursos !== null && estado.base === 'ortofoto';
  const mats: Materiais = {
    talhao: satelite ? (estado.fase >= 8 ? recursos.soloCultura : recursos.solo) : null,
    estrada: satelite ? recursos.estrada : null,
  };
  return (
    <>
      <hemisphereLight args={['#d8d8dc', '#1a1a1d', ambiente]} />
      <TerrenoMalha p={p} base={estado.base} material={satelite ? recursos.terreno : null} />
      {ver('risco') ? <Cheia p={p} /> : null}
      {p.elementos
        .filter((e) => e.id !== 'casa-principal' && ver(e.camada))
        .map((e) => (
          <ElementoMalha
            key={e.id}
            p={p}
            e={e}
            estado={estadoNaFase(e, estado.fase)}
            progresso={ver('progresso')}
            selecionado={selecionado === e.id}
            onSelecionar={onSelecionar}
            recursos={recursos}
            mats={mats}
          />
        ))}
      {ver('infraestruturas') ? (
        <Casa p={p} estado={estado} selecionado={selecionado === 'casa-principal'} onSelecionar={onSelecionar} recursos={recursos} />
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ terreno */

function TerrenoMalha({ p, base, material }: { p: Projeto; base: Base; material: THREE.Material | null }) {
  const texturado = material !== null;
  const geo = useMemo(() => {
    const L = p.terreno.largura;
    const H = p.terreno.profundidade;
    const g = new THREE.PlaneGeometry(L, H, 100, 75);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position!;
    const cores = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const terra = new THREE.Color('#5d5444');
    const oliva = new THREE.Color('#4b5341');
    const baixo = new THREE.Color('#1e1e22');
    const alto = new THREE.Color('#74747c');
    const mapa = new THREE.Color('#2b2b30');
    // Com a textura de savana, a cor de vértice só tinge (clara), não pinta.
    const seco = new THREE.Color('#f3e7cf');
    const verde = new THREE.Color('#c4d3a2');
    const uv = g.attributes.uv!;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + L / 2;
      const y = -pos.getZ(i) + H / 2;
      const h = altura(p.terreno, x, y);
      pos.setY(i, cota(p.terreno, x, y));
      uv.setXY(i, x / TILE.chao, y / TILE.chao);
      if (base === 'mapa') c.copy(mapa);
      else if (base === 'relevo') c.copy(baixo).lerp(alto, Math.min(1, h / 16));
      else {
        // «Satélite» simulado: terra e mato pela ondulação, mais verde no vale.
        const k = (Math.sin(x * 0.11) * Math.cos(y * 0.13) + Math.sin(x * 0.031 + y * 0.027)) * 0.25 + 0.5;
        const t = Math.min(1, k + Math.exp(-((distanciaAoDreno(x, y) / 35) ** 2)) * 0.6);
        if (texturado) c.copy(seco).lerp(verde, t);
        else c.copy(terra).lerp(oliva, t);
      }
      cores[i * 3] = c.r;
      cores[i * 3 + 1] = c.g;
      cores[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cores, 3));
    g.computeVertexNormals();
    return g;
  }, [p, base, texturado]);
  useEffect(() => () => geo.dispose(), [geo]);
  if (material) return <mesh geometry={geo} material={material} receiveShadow dispose={null} />;
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
    </mesh>
  );
}

/** Textura de riscas feita num canvas: o risco é padrão, não só cor. */
function useRiscas() {
  const tex = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 32;
    const ctx = cv.getContext('2d')!;
    ctx.strokeStyle = 'rgba(237,237,235,0.75)';
    ctx.lineWidth = 3;
    for (let k = -32; k < 64; k += 10) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k + 32, 32);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function Cheia({ p }: { p: Projeto }) {
  const riscas = useRiscas();
  const geo = useMemo(() => {
    const passo = 5;
    const pos: number[] = [];
    const uv: number[] = [];
    for (let x = 0; x < p.terreno.largura; x += passo)
      for (let y = 0; y < p.terreno.profundidade; y += passo) {
        if (altura(p.terreno, x + passo / 2, y + passo / 2) >= COTA_CHEIA) continue;
        for (const [dx, dy] of [[0, 0], [passo, 0], [passo, passo], [0, 0], [passo, passo], [0, passo]] as const) {
          const [X, Z] = aMundo(p, x + dx, y + dy);
          pos.push(X, cota(p.terreno, x + dx, y + dy) + 0.25, Z);
          uv.push((x + dx) / 8, (y + dy) / 8);
        }
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }, [p]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial map={riscas} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ---------------------------------------------------------------- elementos */

const corDe = (e: Elemento) =>
  e.camada === 'agua' ? COR.agua : e.camada === 'eletrica' ? COR.eletrica : e.camada === 'talhoes' ? COR.talhoes : COR.giz;

type Clique = { stopPropagation: () => void };

function ElementoMalha({
  p,
  e,
  estado,
  progresso,
  selecionado,
  onSelecionar,
  recursos,
  mats,
}: {
  p: Projeto;
  e: Elemento;
  estado: EstadoElemento;
  progresso: boolean;
  selecionado: boolean;
  onSelecionar: (id: string) => void;
  recursos: Recursos | null;
  mats: Materiais;
}) {
  // Construção com modelo do Blender: o modelo, no lugar da caixa.
  const no = recursos && volume(e) ? recursos.nos[`el-${e.id}`] : undefined;
  if (no) {
    return (
      <ElementoModelo p={p} e={e} no={no} estado={estado} progresso={progresso} selecionado={selecionado} onSelecionar={onSelecionar} />
    );
  }
  if (estado === 'ausente' && !progresso) return null;
  const fantasma = estado === 'ausente' || estado === 'futuro';
  const emObra = estado === 'em-obra';
  const cor = corDe(e);
  const clicar = (ev: Clique) => {
    ev.stopPropagation();
    onSelecionar(e.id);
  };
  const f = e.forma;

  if (f.tipo === 'linha') {
    const pontos = linhaAmostrada(p, f.pontos, f.largura > 1 ? 0.35 : 0.9);
    if (f.largura > 1) return <Estrada pontos={pontos} largura={f.largura} fantasma={fantasma} material={fantasma ? null : mats.estrada} />;
    return (
      <Line
        points={pontos}
        color={selecionado ? COR.sinal : cor}
        lineWidth={selecionado ? 4 : 2.2}
        dashed={e.camada === 'eletrica' || fantasma || emObra}
        dashSize={3}
        gapSize={2}
        transparent
        opacity={fantasma ? 0.4 : 1}
        onClick={clicar}
      />
    );
  }

  if (f.tipo === 'area') {
    return (
      <AreaAssente
        p={p}
        r={f.r}
        cor={cor}
        opacidade={fantasma ? 0.12 : e.camada === 'talhoes' ? 0.5 : 0.25}
        corContorno={selecionado ? COR.sinal : cor}
        tracejado={fantasma || emObra}
        material={e.camada === 'talhoes' && !fantasma ? mats.talhao : null}
        onClick={clicar}
      />
    );
  }

  if (f.tipo === 'cilindro') {
    const [X, Z] = aMundo(p, f.cx, f.cy);
    const y = cota(p.terreno, f.cx, f.cy);
    const h = emObra ? f.altura * 0.6 : f.altura;
    const r = Math.max(f.raio, 1.2);
    return (
      <mesh position={[X, y + h / 2, Z]} onClick={clicar} castShadow={!fantasma} receiveShadow>
        <cylinderGeometry args={[r, r, h, 32, 1, emObra]} />
        <meshStandardMaterial
          color={selecionado ? COR.sinal : cor}
          transparent={fantasma || emObra}
          opacity={fantasma ? 0.25 : emObra ? 0.55 : 1}
          wireframe={fantasma}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }

  if (f.tipo === 'painel') {
    const [X, Z] = aMundo(p, f.r.cx, f.r.cy);
    const y = cota(p.terreno, f.r.cx, f.r.cy);
    const fila = f.r.d / f.filas;
    return (
      <group position={[X, y, Z]} onClick={clicar}>
        {Array.from({ length: f.filas }, (_, i) => (
          // Hemisfério sul: os painéis viram-se a norte (−Z), inclinados 20°.
          <mesh
            key={i}
            position={[0, 1.4, -f.r.d / 2 + fila * (i + 0.5)]}
            rotation={[(-20 * Math.PI) / 180, 0, 0]}
            castShadow={!fantasma}
            visible={!(emObra && i % 2 === 1)}
          >
            <boxGeometry args={[f.r.w, 0.12, fila * 0.75]} />
            <meshStandardMaterial
              color={selecionado ? COR.sinal : '#2a3140'}
              metalness={0.4}
              roughness={0.35}
              transparent={fantasma}
              opacity={fantasma ? 0.25 : 1}
            />
          </mesh>
        ))}
        <Contorno w={f.r.w} d={f.r.d} cor={COR.eletrica} tracejado={fantasma || emObra} y={0.3} />
      </group>
    );
  }

  // Caixa: construção com telhado.
  const [X, Z] = aMundo(p, f.r.cx, f.r.cy);
  const y = cota(p.terreno, f.r.cx, f.r.cy);
  return (
    <Construcao
      posicao={[X, y, Z]}
      rot={f.r.rot ?? 0}
      w={f.r.w}
      d={f.r.d}
      h={f.altura}
      telhado={f.telhado ?? 'plano'}
      inclinacao={15}
      cor={selecionado ? COR.sinal : e.id === 'estufa' ? '#cfe3dc' : cor}
      estado={estado}
      translucido={e.id === 'estufa' || e.id === 'viveiro'}
      onClick={clicar}
    />
  );
}

function Casa({
  p,
  estado,
  selecionado,
  onSelecionar,
  recursos,
}: {
  p: Projeto;
  estado: EstadoGemeo;
  selecionado: boolean;
  onSelecionar: (id: string) => void;
  recursos: Recursos | null;
}) {
  const el = p.elementos.find((e) => e.id === 'casa-principal')!;
  const s = estadoNaFase(el, estado.fase);
  const conflito = useMemo(() => interferencias(p, estado.casa).length > 0, [p, estado.casa]);
  const pele = usePele(recursos, estado.casa.cobertura);
  if (s === 'ausente') return null;
  const c = estado.casa;
  const [X, Z] = aMundo(p, c.x, c.y);
  const y = cota(p.terreno, c.x, c.y);
  return (
    <group>
      <Construcao
        posicao={[X, y, Z]}
        rot={c.rotacao}
        w={c.comprimento}
        d={c.largura}
        h={c.peDireito}
        telhado="duas-aguas"
        inclinacao={INCLINACAO[c.cobertura]}
        cor={conflito || selecionado ? COR.sinal : COR.giz}
        pele={conflito || selecionado ? null : pele}
        estado={s}
        onClick={(ev) => {
          ev.stopPropagation();
          onSelecionar('casa-principal');
        }}
      />
      {conflito ? (
        <Html position={[X, y + c.peDireito + 6, Z]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="rule-label whitespace-nowrap bg-[color:var(--color-signal-600)] px-2 py-1 text-white">Interferência</span>
        </Html>
      ) : null}
    </group>
  );
}

function Construcao({
  posicao,
  rot,
  w,
  d,
  h,
  telhado,
  inclinacao,
  cor,
  pele = null,
  estado,
  translucido = false,
  onClick,
}: {
  posicao: [number, number, number];
  rot: number;
  w: number;
  d: number;
  h: number;
  telhado: 'duas-aguas' | 'plano' | 'arco';
  inclinacao: number;
  cor: string;
  pele?: Pele | null;
  estado: EstadoElemento;
  translucido?: boolean;
  onClick: (ev: Clique) => void;
}) {
  const tileTelhado = pele?.tileTelhado ?? 0;
  const tileParedes = pele?.tileParedes ?? 0;
  const fantasma = estado === 'ausente' || estado === 'futuro';
  const emObra = estado === 'em-obra';
  const telhadoGeo = useMemo(() => {
    if (telhado !== 'duas-aguas') return null;
    const rh = (d / 2) * Math.tan((inclinacao * Math.PI) / 180) + 0.15;
    const forma = new THREE.Shape([new THREE.Vector2(-d / 2 - 0.5, 0), new THREE.Vector2(d / 2 + 0.5, 0), new THREE.Vector2(0, rh)]);
    const g = new THREE.ExtrudeGeometry(forma, { depth: w + 1, bevelEnabled: false });
    g.rotateY(Math.PI / 2);
    g.translate(-(w + 1) / 2, 0, 0);
    if (tileTelhado) uvMetricos(g, tileTelhado);
    return g;
  }, [telhado, w, d, inclinacao, tileTelhado]);
  const paredes = useMemo(() => {
    const g = new THREE.BoxGeometry(w, h + 1, d);
    if (tileParedes) uvMetricos(g, tileParedes);
    return g;
  }, [w, h, d, tileParedes]);
  const arestas = useMemo(() => new THREE.EdgesGeometry(paredes), [paredes]);
  useEffect(() => () => telhadoGeo?.dispose(), [telhadoGeo]);
  useEffect(
    () => () => {
      paredes.dispose();
      arestas.dispose();
    },
    [paredes, arestas],
  );

  return (
    <group position={posicao} rotation={[0, (rot * Math.PI) / 180, 0]} onClick={onClick}>
      {/* +1 m enterrado: assenta em terreno inclinado sem flutuar. */}
      <group position={[0, (h + 1) / 2 - 1, 0]}>
        {fantasma || emObra ? (
          <lineSegments geometry={arestas}>
            <lineBasicMaterial color={cor} transparent opacity={fantasma ? 0.35 : 0.95} />
          </lineSegments>
        ) : null}
        {pele && estado === 'concluido' ? (
          <mesh geometry={paredes} material={pele.paredes} castShadow receiveShadow />
        ) : !fantasma ? (
          <mesh geometry={paredes} castShadow receiveShadow>
            <meshStandardMaterial color={cor} roughness={0.8} transparent={translucido || emObra} opacity={translucido ? 0.4 : emObra ? 0.35 : 1} />
          </mesh>
        ) : null}
      </group>
      {telhadoGeo && estado === 'concluido' ? (
        pele ? (
          <mesh geometry={telhadoGeo} material={pele.telhado} position={[0, h, 0]} castShadow receiveShadow />
        ) : (
          <mesh geometry={telhadoGeo} position={[0, h, 0]} castShadow>
            <meshStandardMaterial color="#9a9aa2" roughness={0.6} metalness={0.2} />
          </mesh>
        )
      ) : null}
    </group>
  );
}

/** Materiais do Blender para a casa paramétrica (reboco e a cobertura escolhida). */
interface Pele {
  readonly paredes: THREE.Material;
  readonly telhado: THREE.Material;
  readonly tileParedes: number;
  readonly tileTelhado: number;
}

/**
 * Os materiais vêm do GLB, partilhados por nome; aqui clonam-se sem cor de
 * vértice (a caixa da casa não a tem) e com a escala de UV do Blender.
 */
function usePele(r: Recursos | null, cobertura: string): Pele | null {
  const pele = useMemo(() => {
    if (!r?.materiais.reboco) return null;
    const semCor = (nome: string) => {
      const m = (r.materiais[nome] ?? r.materiais.reboco!).clone() as THREE.MeshStandardMaterial;
      m.vertexColors = false;
      return m;
    };
    const telha = cobertura === 'telha-ceramica';
    return { paredes: semCor('reboco'), telhado: semCor(telha ? 'telha' : 'zinco'), tileParedes: 3, tileTelhado: telha ? 2.4 : 2 };
  }, [r, cobertura]);
  useEffect(
    () => () => {
      pele?.paredes.dispose();
      pele?.telhado.dispose();
    },
    [pele],
  );
  return pele;
}

/** UV em metros por projecção na face dominante (como o Blender faz nos modelos). */
function uvMetricos(g: THREE.BufferGeometry, tile: number) {
  const pos = g.attributes.position!;
  const nor = g.attributes.normal!;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [pos.getX(i), pos.getZ(i)] : ax >= az ? [pos.getZ(i), pos.getY(i)] : [pos.getX(i), pos.getY(i)];
    uv[i * 2] = u / tile;
    uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/**
 * Uma área (talhão, compostagem…) assente no relevo: a malha segue a cota em
 * cada vértice, em vez de um plano à altura do centro que ficava enterrado
 * num lado e a flutuar no outro. Os cantos vêm de `cantos()`, a mesma
 * geometria da planta 2D e das interferências.
 */
function AreaAssente({
  p,
  r,
  cor,
  opacidade,
  corContorno,
  tracejado,
  material = null,
  onClick,
}: {
  p: Projeto;
  r: Retangulo;
  cor: string;
  opacidade: number;
  corContorno: string;
  tracejado: boolean;
  /** Solo lavrado (nível Normal/Alta, base satélite); sem ele, cor translúcida. */
  material?: THREE.Material | null;
  onClick: (ev: Clique) => void;
}) {
  const geo = useMemo(() => {
    const [k0, k1, k2, k3] = cantos(r) as readonly (readonly [number, number])[];
    const nu = Math.max(1, Math.ceil(r.w / 4));
    const nv = Math.max(1, Math.ceil(r.d / 4));
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        const v = j / nv;
        const [ax, ay] = [k0![0] + (k1![0] - k0![0]) * u, k0![1] + (k1![1] - k0![1]) * u];
        const [bx, by] = [k3![0] + (k2![0] - k3![0]) * u, k3![1] + (k2![1] - k3![1]) * u];
        const [x, y] = [ax + (bx - ax) * v, ay + (by - ay) * v];
        const [X, Z] = aMundo(p, x, y);
        pos.push(X, cota(p.terreno, x, y) + 0.3, Z);
        uv.push(u * (r.w / TILE.solo), v * (r.d / TILE.solo));
      }
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i;
        const c = a + nu + 1;
        idx.push(a, c, a + 1, a + 1, c, c + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [p, r]);
  useEffect(() => () => geo.dispose(), [geo]);
  const contorno = useMemo(() => {
    const k = cantos(r) as readonly (readonly [number, number])[];
    return amostrarLinha(p, [...k, k[0]!], 0.45);
  }, [p, r]);
  return (
    <group>
      {material ? (
        <mesh geometry={geo} material={material} onClick={onClick} receiveShadow dispose={null} />
      ) : (
        <mesh geometry={geo} onClick={onClick} receiveShadow>
          <meshStandardMaterial color={cor} transparent opacity={opacidade} roughness={1} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      <Line points={contorno} color={corContorno} lineWidth={1.4} dashed={tracejado} dashSize={2} gapSize={1.5} />
    </group>
  );
}

function Contorno({ w, d, cor, tracejado, y = 0.05 }: { w: number; d: number; cor: string; tracejado: boolean; y?: number }) {
  // Pontos estáveis: o <Line> do drei refaz a geometria (e o shader) quando o array muda.
  const pts = useMemo<[number, number, number][]>(
    () => [
      [-w / 2, y, -d / 2],
      [w / 2, y, -d / 2],
      [w / 2, y, d / 2],
      [-w / 2, y, d / 2],
      [-w / 2, y, -d / 2],
    ],
    [w, d, y],
  );
  return <Line points={pts} color={cor} lineWidth={1.4} dashed={tracejado} dashSize={2} gapSize={1.5} />;
}

function Estrada({
  pontos,
  largura,
  fantasma,
  material,
}: {
  pontos: [number, number, number][];
  largura: number;
  fantasma: boolean;
  material: THREE.Material | null;
}) {
  const geo = useMemo(() => {
    const pos: number[] = [];
    const uv: number[] = [];
    let percorrido = 0;
    const u = largura / 2 / TILE.gravilha;
    for (let i = 0; i < pontos.length - 1; i++) {
      const a = new THREE.Vector3(...pontos[i]!);
      const b = new THREE.Vector3(...pontos[i + 1]!);
      const dir = b.clone().sub(a).setY(0).normalize();
      const n = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(largura / 2);
      const [a1, a2, b1, b2] = [a.clone().add(n), a.clone().sub(n), b.clone().add(n), b.clone().sub(n)];
      for (const v of [a1, a2, b1, b1, a2, b2]) pos.push(v.x, v.y, v.z);
      const v0 = percorrido / TILE.gravilha;
      percorrido += a.distanceTo(b);
      const v1 = percorrido / TILE.gravilha;
      uv.push(u, v0, -u, v0, u, v1, u, v1, -u, v0, -u, v1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }, [pontos, largura]);
  useEffect(() => () => geo.dispose(), [geo]);
  if (material) return <mesh geometry={geo} material={material} receiveShadow dispose={null} />;
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color="#a39d90" roughness={1} transparent={fantasma} opacity={fantasma ? 0.3 : 1} side={THREE.DoubleSide} />
    </mesh>
  );
}

/**
 * Os dados são estáticos: cada linha amostra-se uma vez e o mesmo array é
 * devolvido sempre — o <Line> e a <Estrada> não refazem geometria a cada
 * mudança de estado.
 */
const LINHAS = new WeakMap<object, Map<number, [number, number, number][]>>();
function linhaAmostrada(p: Projeto, pontos: readonly (readonly [number, number])[], acima: number): [number, number, number][] {
  let porAltura = LINHAS.get(pontos);
  if (!porAltura) {
    porAltura = new Map();
    LINHAS.set(pontos, porAltura);
  }
  let r = porAltura.get(acima);
  if (!r) {
    r = amostrarLinha(p, pontos, acima);
    porAltura.set(acima, r);
  }
  return r;
}

/** Pontos de uma linha a cada ~4 m, colados ao terreno. */
function amostrarLinha(p: Projeto, pontos: readonly (readonly [number, number])[], acima: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < pontos.length - 1; i++) {
    const [ax, ay] = pontos[i]!;
    const [bx, by] = pontos[i + 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 4));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t;
      const [X, Z] = aMundo(p, x, y);
      out.push([X, cota(p.terreno, x, y) + acima, Z]);
    }
  }
  const [lx, ly] = pontos[pontos.length - 1]!;
  const [X, Z] = aMundo(p, lx, ly);
  out.push([X, cota(p.terreno, lx, ly) + acima, Z]);
  return out;
}
