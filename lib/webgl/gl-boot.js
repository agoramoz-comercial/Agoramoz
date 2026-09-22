/**
 * gl-boot.js — arranque de um contexto WebGL 2 com o que quase todos os
 * projetos precisam e quase nenhum faz: dimensionamento por devicePixelRatio,
 * tratamento de perda de contexto, sonda de capacidades, e pausa quando o
 * canvas não está visível.
 *
 * Uso:
 *   import { createRenderer } from './gl-boot.js';
 *
 *   const r = createRenderer(canvas, {
 *     onInit:   (gl, caps) => buildResources(gl, caps),
 *     onResize: (gl, w, h) => updateProjection(w, h),
 *     onFrame:  (gl, dt, t) => draw(gl, dt),
 *   });
 *   r.start();
 */

const DEFAULT_ATTRS = {
  alpha: false,                  // canvas opaco: evita composição alfa com a página
  depth: true,
  stencil: false,                // só ativar se for mesmo usado; ocupa memória sempre
  antialias: true,               // NÃO se aplica a framebuffers próprios
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,  // true custa desempenho; só para screenshots
  powerPreference: 'high-performance',
  failIfMajorPerformanceCaveat: false,
  desynchronized: false,
};

/** Sonda de capacidades. Decidir o pipeline a partir disto, não de suposições. */
export function probeCapabilities(gl) {
  const ext = (n) => gl.getExtension(n);

  const caps = {
    maxTextureSize:   gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxTextureUnits:  gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
    maxDrawBuffers:   gl.getParameter(gl.MAX_DRAW_BUFFERS),
    maxSamples:       gl.getParameter(gl.MAX_SAMPLES),
    maxUBOSize:       gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE),
    maxVaryings:      gl.getParameter(gl.MAX_VARYING_COMPONENTS),
    maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),

    // extensões: guardar o OBJETO, não um booleano — as constantes vivem nele
    colorBufferFloat:     ext('EXT_color_buffer_float'),
    colorBufferHalfFloat: ext('EXT_color_buffer_half_float'),
    floatLinear:          ext('OES_texture_float_linear'),
    anisotropic:          ext('EXT_texture_filter_anisotropic'),
    parallelCompile:      ext('KHR_parallel_shader_compile'),
    timerQuery:           ext('EXT_disjoint_timer_query_webgl2'),
    multiDraw:            ext('WEBGL_multi_draw'),
    loseContext:          ext('WEBGL_lose_context'),
    debugRenderer:        ext('WEBGL_debug_renderer_info'),

    // compressão: nenhuma é universal — KTX2/Basis transcodifica para a que existir
    astc: ext('WEBGL_compressed_texture_astc'),
    s3tc: ext('WEBGL_compressed_texture_s3tc'),
    bptc: ext('EXT_texture_compression_bptc'),
    etc:  ext('WEBGL_compressed_texture_etc'),
  };

  caps.maxAnisotropy = caps.anisotropic
    ? gl.getParameter(caps.anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
    : 1;

  if (caps.debugRenderer) {
    // pode vir mascarado por privacidade — nunca depender disto para lógica
    caps.vendor   = gl.getParameter(caps.debugRenderer.UNMASKED_VENDOR_WEBGL);
    caps.renderer = gl.getParameter(caps.debugRenderer.UNMASKED_RENDERER_WEBGL);
  }

  // formato HDR disponível, degradando em vez de falhar
  if (caps.colorBufferFloat || caps.colorBufferHalfFloat) {
    caps.hdrFormat = { internal: gl.RGBA16F, type: gl.HALF_FLOAT, hdr: true };
  } else {
    caps.hdrFormat = { internal: gl.RGBA8, type: gl.UNSIGNED_BYTE, hdr: false };
  }

  return caps;
}

export function createRenderer(canvas, {
  attributes = {},
  maxDPR = 2,
  onInit = () => {},
  onResize = () => {},
  onFrame = () => {},
  onContextLost = () => {},
} = {}) {
  const attrs = { ...DEFAULT_ATTRS, ...attributes };

  let gl = null;
  let caps = null;
  let rafId = 0;
  let running = false;
  let visible = true;
  let last = 0;
  let elapsed = 0;
  let pendingW = 0;
  let pendingH = 0;

  // ------------------------------------------------------------- contexto

  function acquire() {
    gl = canvas.getContext('webgl2', attrs);
    if (!gl) throw new Error('WebGL 2 indisponível neste dispositivo');
    caps = probeCapabilities(gl);
    onInit(gl, caps);
    applySize(true);
  }

  // Sem preventDefault() NÃO há restauro. Acontece em produção: suspensão,
  // troca de GPU, timeout do driver.
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(rafId);
    rafId = 0;
    onContextLost();
  }, false);

  // Nenhum handle GL sobrevive: buffers, texturas, programas, FBOs — tudo recriado.
  canvas.addEventListener('webglcontextrestored', () => {
    acquire();
    if (running) loop(performance.now());
  }, false);

  // -------------------------------------------------------------- tamanho

  function applySize(force = false) {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDPR);
    const rect = canvas.getBoundingClientRect();
    const w = pendingW || Math.max(1, Math.round(rect.width * dpr));
    const h = pendingH || Math.max(1, Math.round(rect.height * dpr));

    if (force || canvas.width !== w || canvas.height !== h) {
      canvas.width = w;                  // redimensionar DESTRÓI o conteúdo: só quando muda
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      onResize(gl, w, h);
    }
  }

  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.devicePixelContentBoxSize) {
        /**
         * PATCH em relação ao original da skill.
         *
         * `devicePixelContentBoxSize` já vem em píxeis de dispositivo, pelo que
         * usá-lo tal e qual IGNORA o `maxDPR` — o canvas renderizava sempre a
         * resolução completa, e a razão de existir o parâmetro desaparecia.
         * Medido aqui: com maxDPR 0.75 o buffer continuava a 576px em vez de
         * 432. Escala-se pela razão entre o DPR limitado e o real.
         */
        const dpr = window.devicePixelRatio || 1;
        const scale = Math.min(dpr, maxDPR) / dpr;
        pendingW = Math.max(1, Math.round(entry.devicePixelContentBoxSize[0].inlineSize * scale));
        pendingH = Math.max(1, Math.round(entry.devicePixelContentBoxSize[0].blockSize * scale));
      } else {
        const dpr = Math.min(window.devicePixelRatio || 1, maxDPR);
        pendingW = Math.round(entry.contentBoxSize[0].inlineSize * dpr);
        pendingH = Math.round(entry.contentBoxSize[0].blockSize * dpr);
      }
    }
  });

  // 'device-pixel-content-box' lança onde não é suportado
  try { ro.observe(canvas, { box: 'device-pixel-content-box' }); }
  catch { ro.observe(canvas); }

  // ----------------------------------------------------------------- loop

  function loop(now) {
    if (!running || !visible) return;
    rafId = requestAnimationFrame(loop);

    // limitar dt evita um passo de integração enorme ao voltar de um separador pausado
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    elapsed += dt;

    applySize();
    onFrame(gl, dt, elapsed);
  }

  // não desenhar o que ninguém vê — a otimização mais barata que existe
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && running && !rafId) { last = performance.now(); loop(last); }
    else if (!visible) { cancelAnimationFrame(rafId); rafId = 0; }
  });
  io.observe(canvas);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(rafId); rafId = 0; }
    else if (running && visible) { last = performance.now(); loop(last); }
  });

  // ------------------------------------------------------------------ API

  acquire();

  return {
    get gl() { return gl; },
    get caps() { return caps; },

    start() {
      if (running) return;
      running = true;
      last = performance.now();
      loop(last);
    },

    stop() {
      running = false;
      cancelAnimationFrame(rafId);
      rafId = 0;
    },

    dispose() {
      this.stop();
      ro.disconnect();
      io.disconnect();
    },

    /** Testar o caminho de restauro. Fazer isto ANTES de entregar. */
    simulateContextLoss() {
      if (!caps.loseContext) { console.warn('WEBGL_lose_context indisponível'); return; }
      caps.loseContext.loseContext();
      setTimeout(() => caps.loseContext.restoreContext(), 1000);
    },
  };
}
