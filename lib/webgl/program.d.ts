export function createProgramAsync(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string,
  options?: {
    ext?: { COMPLETION_STATUS_KHR: number } | null;
    attribs?: Record<string, number> | null;
  },
): Promise<WebGLProgram>;

export function getUniforms(
  gl: WebGL2RenderingContext,
  prog: WebGLProgram,
): Record<string, WebGLUniformLocation | null>;
