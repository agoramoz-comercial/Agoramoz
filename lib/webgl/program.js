/**
 * Compilação de programas WebGL 2 sem bloquear a thread principal.
 *
 * Portado de `assets/gl-helpers.js` da skill `webgl-graphics-engineer`, com o
 * detalhe que mais custa a descobrir sozinho: consultar `LINK_STATUS` antes de
 * a compilação estar completa BLOQUEIA, e anula o ganho da compilação paralela.
 * Por isso o `check()` espera primeiro por `COMPLETION_STATUS_KHR`.
 */

export function createProgramAsync(gl, vsSource, fsSource, { ext = null, attribs = null } = {}) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);

  // Locations fixas evitam depender da ordem que o driver escolher.
  if (attribs) {
    for (const [name, loc] of Object.entries(attribs)) gl.bindAttribLocation(prog, loc, name);
  }

  gl.linkProgram(prog);

  return new Promise((resolve, reject) => {
    function cleanup() {
      gl.detachShader(prog, vs);
      gl.detachShader(prog, fs);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    }
    function check() {
      if (ext && !gl.getProgramParameter(prog, ext.COMPLETION_STATUS_KHR)) {
        requestAnimationFrame(check);
        return;
      }
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(prog);
        cleanup();
        reject(new Error('Link falhou:\n' + log));
        return;
      }
      cleanup();
      resolve(prog);
    }
    check();
  });
}

function compileShader(gl, type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  // Não consultar COMPILE_STATUS aqui: bloquearia e desfaria a compilação
  // paralela. Os erros de compilação aparecem no log do link.
  return sh;
}

/** Mapa nome → location de todos os uniforms ativos. */
export function getUniforms(gl, prog) {
  const out = {};
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i += 1) {
    const info = gl.getActiveUniform(prog, i);
    const name = info.name.replace(/\[0\]$/, ''); // arrays vêm como "nome[0]"
    out[name] = gl.getUniformLocation(prog, name);
  }
  return out;
}
