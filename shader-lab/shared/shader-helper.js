// Shader Lab — minimal WebGL helper for fullscreen-quad fragment shader demos.
// Usage:
//   const app = createShaderApp(canvas, fragmentSrc, {
//     u_myUniform: { type: '1f', value: 0.5 }
//   });
//   app.setUniform('u_myUniform', 0.8);

const VERTEX_SRC = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(s));
    console.error('Source:', src);
    return null;
  }
  return s;
}

function createProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

export function createShaderApp(canvas, fragmentSrc, uniformDefs = {}) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false });
  if (!gl) {
    canvas.parentElement.innerHTML = '<div style="color:white;padding:40px;text-align:center;font-family:sans-serif">WebGL is not available in this browser.</div>';
    return null;
  }

  // Prepend standard header to fragment
  const fullFragSrc = `precision highp float;\n` + fragmentSrc;
  const program = createProgram(gl, VERTEX_SRC, fullFragSrc);
  if (!program) return null;

  // Fullscreen quad (two triangles covering clip space)
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );
  const aPos = gl.getAttribLocation(program, 'a_position');

  // Collect uniform locations
  const uniforms = {};
  // Always-available uniforms
  const defaultUniforms = {
    u_resolution: { type: '2f', value: [canvas.width, canvas.height] },
    u_time: { type: '1f', value: 0 },
    u_mouse: { type: '2f', value: [0.5, 0.5] },
  };
  const allDefs = { ...defaultUniforms, ...uniformDefs };
  for (const name in allDefs) {
    uniforms[name] = {
      loc: gl.getUniformLocation(program, name),
      type: allDefs[name].type,
      value: allDefs[name].value,
    };
  }

  function setUniformValue(name, value) {
    if (uniforms[name]) uniforms[name].value = value;
  }

  function uploadUniform(u) {
    if (u.loc === null || u.loc === undefined) return;
    const v = u.value;
    switch (u.type) {
      case '1f': gl.uniform1f(u.loc, v); break;
      case '2f': gl.uniform2f(u.loc, v[0], v[1]); break;
      case '3f': gl.uniform3f(u.loc, v[0], v[1], v[2]); break;
      case '4f': gl.uniform4f(u.loc, v[0], v[1], v[2], v[3]); break;
      case '1i': gl.uniform1i(u.loc, v); break;
    }
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    uniforms.u_resolution.value = [canvas.width, canvas.height];
  }

  let rafId = null;
  let paused = false;
  let startTime = performance.now();
  let pausedAt = 0;
  let lastRenderTime = 0;

  function render() {
    resizeCanvas();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    if (!paused) {
      uniforms.u_time.value = (performance.now() - startTime) / 1000;
      lastRenderTime = uniforms.u_time.value;
    } else {
      uniforms.u_time.value = pausedAt;
    }

    for (const name in uniforms) uploadUniform(uniforms[name]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    rafId = requestAnimationFrame(render);
  }

  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    uniforms.u_mouse.value = [
      (e.clientX - rect.left) / rect.width,
      1 - (e.clientY - rect.top) / rect.height,
    ];
  });

  return {
    setUniform: setUniformValue,
    start: () => { if (!rafId) { startTime = performance.now() - lastRenderTime * 1000; render(); } },
    stop: () => { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } },
    pause: () => { paused = true; pausedAt = uniforms.u_time.value; },
    resume: () => { paused = false; startTime = performance.now() - pausedAt * 1000; },
    isPaused: () => paused,
    getTime: () => uniforms.u_time.value,
    setTime: (t) => { pausedAt = t; startTime = performance.now() - t * 1000; uniforms.u_time.value = t; },
  };
}

// Binds a range input to a uniform on a shader app.
// sliderEl: <input type="range">
// valueEl: optional element to display numeric value
// app: shader app
// uniformName: name of the uniform to update
// mapFn: optional (sliderValue) => uniformValue transformation
export function bindSlider(sliderEl, valueEl, app, uniformName, mapFn) {
  const update = () => {
    const raw = parseFloat(sliderEl.value);
    const val = mapFn ? mapFn(raw) : raw;
    app.setUniform(uniformName, val);
    if (valueEl) {
      if (Array.isArray(val)) valueEl.textContent = val.map(n => n.toFixed(2)).join(', ');
      else valueEl.textContent = Number.isInteger(val) ? val : val.toFixed(2);
    }
  };
  sliderEl.addEventListener('input', update);
  update();
}

// Simple syntax-highlight for GLSL code blocks (keywords, types, numbers, comments)
export function highlightGLSL(codeEl) {
  const keywords = ['void', 'if', 'else', 'for', 'while', 'return', 'uniform', 'varying', 'attribute', 'const', 'in', 'out'];
  const types = ['float', 'int', 'bool', 'vec2', 'vec3', 'vec4', 'mat2', 'mat3', 'mat4', 'sampler2D'];
  let src = codeEl.textContent;
  // Escape HTML
  src = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Comments (//)
  src = src.replace(/(\/\/[^\n]*)/g, '<span class="glsl-comment">$1</span>');
  // Numbers
  src = src.replace(/\b(\d+\.?\d*|\.\d+)\b/g, '<span class="glsl-num">$1</span>');
  // Keywords + types (simple word-boundary replace)
  const kwRe = new RegExp('\\b(' + keywords.join('|') + ')\\b', 'g');
  src = src.replace(kwRe, '<span class="glsl-kw">$1</span>');
  const tyRe = new RegExp('\\b(' + types.join('|') + ')\\b', 'g');
  src = src.replace(tyRe, '<span class="glsl-type">$1</span>');
  codeEl.innerHTML = src;
}

// Wires up the show-code toggle button
export function setupCodeToggle(buttonEl, preEl) {
  let visible = false;
  buttonEl.addEventListener('click', () => {
    visible = !visible;
    preEl.classList.toggle('visible', visible);
    buttonEl.textContent = visible ? 'hide code' : 'show code';
  });
}

// Arrow-key lesson navigation (← / →)
export function setupArrowNav(prevUrl, nextUrl) {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowLeft' && prevUrl) window.location.href = prevUrl;
    else if (e.key === 'ArrowRight' && nextUrl) window.location.href = nextUrl;
  });
}
