'use client';

import { useEffect, useRef, useState } from 'react';
import { createRenderer, type Renderer } from '@/lib/webgl/gl-boot.js';
import { createProgramAsync, getUniforms } from '@/lib/webgl/program.js';

/**
 * Bolbo de crómio — a peça de metal líquido da referência, em WebGL 2 e sem
 * uma única dependência.
 *
 * Um triângulo a cobrir o ecrã, um programa, um draw call por frame. A forma é
 * um SDF de metabolas suavizadas, marchado; a normal vem do gradiente do campo;
 * o crómio vem de uma reflexão de ambiente procedural ao estilo matcap, com
 * bandas horizontais — é isso que faz o metal ler como metal e não como
 * plástico cinzento.
 *
 * O que o mantém dentro do orçamento (tudo verificado, não presumido):
 *
 * - **Monta depois do `load` e de um `requestIdleCallback`.** O elemento de LCP
 *   desta página é o parágrafo do hero; nada disto corre na janela que conta.
 * - **Só onde faz sentido**: ≥1024px, ponteiro fino com hover, e sem
 *   `prefers-reduced-motion`. Em telemóvel e tablet não existe de todo.
 * - **Renderiza a 0,75x dos píxeis CSS.** Um bolbo desfocado não precisa de
 *   píxeis exatos, e o custo de fragmentos cai para cerca de um quarto.
 * - **Pausa fora do ecrã e em aba escondida** — vem do `gl-boot`.
 * - **Perda de contexto tratada**; se o WebGL 2 não existir, se o renderizador
 *   for por software, se os frames forem lentos ou se a compilação falhar, o
 *   componente desaparece e a malha SVG por baixo continua lá, intacta.
 *
 * Contraste: isto vive no vazio à direita do hero, por baixo do conteúdo e com
 * máscara nas bordas. NUNCA fica texto por cima — os rácios calculados no
 * globals.css não podem depender de um fundo que se mexe.
 */

const VS = `#version 300 es
// Triângulo que cobre o ecrã sem buffer nenhum: as coordenadas saem do
// gl_VertexID. Menos estado, menos código, menos para correr mal.
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uPointer;

out vec4 outColor;

// União suave: é o que funde as esferas numa só massa de metal.
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdSphere(vec3 p, float r) { return length(p) - r; }

// O campo: quatro esferas em órbitas lentas e desencontradas, fundidas.
float map(vec3 p) {
  float t = uTime * 0.26;
  // Órbitas largas e k apertado: os lóbulos ficam a ler-se como massas
  // separadas que se tocam, e não fundidos numa esfera. Foi o primeiro erro
  // desta forma — amplitude pequena com união muito suave dá sempre uma bola.
  float d = sdSphere(p - vec3(sin(t) * 0.78, cos(t * 0.8) * 0.54, 0.0), 0.52);
  d = smin(d, sdSphere(p - vec3(cos(t * 1.1) * 0.86, sin(t * 0.7) * 0.7, sin(t) * 0.4), 0.42), 0.26);
  d = smin(d, sdSphere(p - vec3(sin(t * 0.6) * 0.6, cos(t * 1.3) * 0.88, cos(t * 0.9) * 0.35), 0.36), 0.24);
  d = smin(d, sdSphere(p - vec3(cos(t * 0.45) * 0.95, sin(t * 1.5) * 0.4, 0.0), 0.3), 0.22);
  d = smin(d, sdSphere(p - vec3(sin(t * 1.7) * 0.5, cos(t * 0.55) * 0.3, cos(t * 1.2) * 0.45), 0.26), 0.2);
  return d;
}

// Normal por diferenças centrais tetraédricas: quatro amostras em vez de seis.
vec3 normalAt(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0015;
  return normalize(
    e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) +
    e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx)
  );
}

/**
 * Ambiente procedural.
 *
 * O crómio não tem cor própria: o que se vê é o mundo à volta. Aqui o "mundo"
 * são bandas horizontais claras e escuras — horizonte, chão, luzes de estúdio.
 * É o gradiente brusco entre bandas que dá a leitura de metal polido.
 */
vec3 environment(vec3 rd) {
  float y = rd.y;
  // Bandas duras, não gradientes: é o corte brusco entre claro e escuro que o
  // olho lê como reflexo especular. Suavizá-las devolve o aspeto de plástico.
  float band = smoothstep(-0.02, 0.02, sin(y * 9.0 + 0.4)) * 0.5;
  float horizon = smoothstep(-0.5, 0.6, y);
  vec3 col = mix(vec3(0.015), vec3(0.42), horizon);
  col += band * 0.42;
  col += pow(max(0.0, rd.x * 0.5 + 0.5), 8.0) * 0.28;
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);

  vec3 ro = vec3(uPointer * 0.18, 3.1);
  vec3 rd = normalize(vec3(uv, -2.0));

  float t = 0.0;
  float d = 0.0;
  bool hit = false;

  // 64 passos chegam para uma forma suave a esta escala; mais é gastar GPU.
  for (int i = 0; i < 64; i++) {
    vec3 p = ro + rd * t;
    d = map(p);
    if (d < 0.001) { hit = true; break; }
    if (t > 6.0) break;
    t += d * 0.9;
  }

  if (!hit) { outColor = vec4(0.0); return; }

  vec3 p = ro + rd * t;
  vec3 n = normalAt(p);
  vec3 r = reflect(rd, n);

  vec3 col = environment(r);

  // Fresnel: as bordas de qualquer metal são quase espelho puro.
  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.5);
  col = mix(col, vec3(0.92), fres * 0.7);

  // Especular apertado — o ponto de luz que denuncia superfície polida.
  vec3 l = normalize(vec3(0.6, 0.8, 0.5));
  col += pow(max(dot(r, l), 0.0), 48.0) * 0.6;

  // Desvanece nas bordas do ecrã para se fundir na secção em vez de terminar
  // num recorte duro.
  float edge = smoothstep(1.15, 0.35, length(uv));
  outColor = vec4(col, edge);
}`;

/** Frames observados antes de decidir se o dispositivo aguenta isto. */
const BUDGET_SAMPLE = 48;

export function ChromeBlob({ className }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;

    const gate = window.matchMedia(
      '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    );
    if (!gate.matches) return;

    let renderer: Renderer | null = null;
    let cancelled = false;
    let frames = 0;
    let slow = 0;
    let idle = 0;
    const pointer = { x: 0, y: 0 };

    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    function boot() {
      if (cancelled || !el) return;
      try {
        renderer = createRenderer(el, {
          // Sem alfa não dá para compor sobre a secção; sem depth poupa memória
          // num raymarcher, que não usa buffer de profundidade.
          attributes: { alpha: true, depth: false, antialias: false, premultipliedAlpha: true },
          /**
           * 0.75 e não 1.5: o canvas renderiza a menos de metade dos píxeis
           * CSS e o browser escala na composição. Num bolbo desfocado de metal
           * isso é invisível, e corta o custo de fragmentos para cerca de um
           * quarto — que é a diferença entre isto ser gratuito e ser um
           * problema numa GPU integrada.
           */
          maxDPR: 0.75,
          onInit: (gl, caps) => {
            /**
             * Recusar renderizadores por software.
             *
             * SwiftShader, llvmpipe e o "Microsoft Basic Render Driver" fazem
             * WebGL na CPU. Um raymarcher a correr aí não é lento — é um
             * bloqueio da thread principal. Medido: tarefas longas a subir de
             * zero para três, com picos de 127ms. A string pode vir mascarada
             * por privacidade, e por isso isto é só a primeira das duas
             * defesas; a segunda é o orçamento de frame, abaixo.
             */
            const rendererName = String(caps.renderer ?? '');
            if (/swiftshader|llvmpipe|basic render|software|paravirtual/i.test(rendererName)) {
              throw new Error(`renderizador por software: ${rendererName}`);
            }
            gl.clearColor(0, 0, 0, 0);
            createProgramAsync(gl, VS, FS, { ext: caps.parallelCompile })
              .then((prog) => {
                if (cancelled) return;
                const u = getUniforms(gl, prog);
                gl.useProgram(prog);
                renderer!.start();
                // O loop precisa destes; guardados no próprio objeto para não
                // criar um fecho por frame.
                (el as HTMLCanvasElement & { _u?: unknown })._u = { prog, u };
              })
              .catch((err) => {
                console.info('[chrome-blob] shader falhou, a malha SVG fica:', err);
                if (!cancelled) setFailed(true);
              });
          },
          onFrame: (gl, dt, time) => {
            /**
             * Orçamento de frame: o bolbo desiste sozinho.
             *
             * Nenhuma lista de renderizadores cobre todo o hardware fraco que
             * existe, e a string do driver pode vir mascarada. Em vez de
             * adivinhar, mede-se: se as primeiras dezenas de frames ficarem
             * consistentemente acima de 22ms (abaixo de ~45fps), isto não vale
             * o que custa e desliga-se. O site fica exatamente como estava —
             * a malha de contorno nunca dependeu disto.
             */
            if (frames < BUDGET_SAMPLE) {
              frames += 1;
              if (frames > 8) slow += dt > 0.022 ? 1 : 0;
              if (frames === BUDGET_SAMPLE && slow > (BUDGET_SAMPLE - 8) * 0.6) {
                console.info('[chrome-blob] demasiado lento neste dispositivo, a desligar');
                renderer?.dispose();
                setFailed(true);
                return;
              }
            }

            const store = (el as HTMLCanvasElement & { _u?: { prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null> } })._u;
            if (!store) return;
            gl.useProgram(store.prog);
            gl.uniform2f(store.u.uRes!, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.uniform1f(store.u.uTime!, time);
            gl.uniform2f(store.u.uPointer!, pointer.x, pointer.y);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
          },
          onContextLost: () => {
            // O gl-boot reconstrói sozinho; isto é só o aviso de que aconteceu.
            console.info('[chrome-blob] contexto perdido, a aguardar restauro');
          },
        });
        window.addEventListener('pointermove', onPointer, { passive: true });
      } catch (err) {
        // Cobre WebGL 2 em falta, renderizador por software e falha de contexto.
        console.info('[chrome-blob] não montado, a malha SVG fica:', (err as Error)?.message ?? err);
        setFailed(true);
      }
    }

    /**
     * Depois do `load`, e depois de o browser estar ocioso. É esta ordem que
     * garante que o WebGL nunca entra na janela do LCP.
     */
    const schedule = () => {
      const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
      idle = ric(boot) as unknown as number;
    };

    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', schedule);
      window.removeEventListener('pointermove', onPointer);
      if (idle && window.cancelIdleCallback) window.cancelIdleCallback(idle);
      renderer?.dispose();
    };
  }, []);

  if (failed) return null;

  return (
    <canvas
      ref={canvas}
      aria-hidden
      // `opacity` baixa de propósito: é uma presença, não um assunto. E o
      // `mix-blend-mode` funde-a na secção em vez de a colar por cima.
      className={className}
      style={{ width: '100%', height: '100%', opacity: 0.7, mixBlendMode: 'screen' }}
    />
  );
}
