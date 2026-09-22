/**
 * Tipos para o boot de WebGL 2 portado da skill `webgl-graphics-engineer`.
 * O JavaScript fica como veio — é código testado e não vale a pena reescrevê-lo
 * em TypeScript só para lhe mudar a sintaxe. A superfície pública é esta.
 */

export interface GlCaps {
  maxTextureSize: number;
  parallelCompile: { COMPLETION_STATUS_KHR: number } | null;
  loseContext: { loseContext(): void; restoreContext(): void } | null;
  [key: string]: unknown;
}

export interface Renderer {
  readonly gl: WebGL2RenderingContext;
  readonly caps: GlCaps;
  start(): void;
  stop(): void;
  dispose(): void;
  simulateContextLoss(): void;
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  options?: {
    attributes?: WebGLContextAttributes;
    maxDPR?: number;
    onInit?: (gl: WebGL2RenderingContext, caps: GlCaps) => void;
    onResize?: (gl: WebGL2RenderingContext, w: number, h: number) => void;
    onFrame?: (gl: WebGL2RenderingContext, dt: number, t: number) => void;
    onContextLost?: () => void;
  },
): Renderer;

export function probeCapabilities(gl: WebGL2RenderingContext): GlCaps;
