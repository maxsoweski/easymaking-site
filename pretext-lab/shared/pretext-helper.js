// Pretext Lab — helpers for lesson demos.
// Provides: dynamic import of @chenglou/pretext, slider binding, AFR stamp,
// FPS counter, width caliper, baseline grid, per-line widths, ghost ruler,
// code toggle, arrow-key nav.

// ═══════════════════════════════════════════════════════════════
// Pretext import (lazy, with CDN fallback)
// ═══════════════════════════════════════════════════════════════
let _pretextPromise = null;
export function importPretext() {
  if (!_pretextPromise) {
    _pretextPromise = import('https://esm.sh/@chenglou/pretext')
      .catch(() => import('https://cdn.jsdelivr.net/npm/@chenglou/pretext/+esm'));
  }
  return _pretextPromise;
}

// ═══════════════════════════════════════════════════════════════
// Slider binding
// ═══════════════════════════════════════════════════════════════
export function bindSlider(inputEl, valueEl, callback, mapFn) {
  const update = () => {
    const raw = parseFloat(inputEl.value);
    const val = mapFn ? mapFn(raw) : raw;
    callback(val);
    if (valueEl) {
      if (Array.isArray(val)) {
        valueEl.textContent = val.map(n => (Number.isInteger(n) ? n : n.toFixed(2))).join(', ');
      } else if (Number.isInteger(val)) {
        valueEl.textContent = val;
      } else {
        valueEl.textContent = Math.abs(val) >= 10 ? val.toFixed(1) : val.toFixed(2);
      }
    }
  };
  inputEl.addEventListener('input', update);
  update();
  return update;
}

// ═══════════════════════════════════════════════════════════════
// Analyze · Fit · Render stamp
//   Usage: createStamp(container, ['analyze', 'fit'])
// ═══════════════════════════════════════════════════════════════
export function createStamp(container, active = []) {
  const stamp = document.createElement('div');
  stamp.className = 'afr-stamp';
  ['analyze', 'fit', 'render'].forEach(layer => {
    const pill = document.createElement('span');
    pill.className = 'afr-pill afr-pill--' + layer;
    if (active.includes(layer)) pill.classList.add('afr-pill--active');
    pill.textContent = layer;
    stamp.appendChild(pill);
  });
  container.appendChild(stamp);
  return stamp;
}

// ═══════════════════════════════════════════════════════════════
// FPS counter
//   const fps = fpsCounter(displayEl);
//   inside a raf loop: fps.tick();
// ═══════════════════════════════════════════════════════════════
export function fpsCounter(displayEl) {
  let frames = 0;
  let lastUpdate = performance.now();
  let current = 0;
  return {
    tick() {
      frames++;
      const now = performance.now();
      if (now - lastUpdate >= 400) {
        current = Math.round((frames * 1000) / (now - lastUpdate));
        if (displayEl) {
          displayEl.textContent = current + ' fps';
          displayEl.classList.toggle('warn', current < 40);
          displayEl.classList.toggle('ok', current >= 55);
        }
        frames = 0;
        lastUpdate = now;
      }
    },
    get fps() { return current; },
    reset() { frames = 0; lastUpdate = performance.now(); current = 0; },
  };
}

// ═══════════════════════════════════════════════════════════════
// Width caliper  ⊢ 247px ⊣
//   createWidthCaliper(container).setWidth(w)
// ═══════════════════════════════════════════════════════════════
export function createWidthCaliper(container) {
  const wrap = document.createElement('div');
  wrap.className = 'width-caliper';
  wrap.innerHTML = `
    <span class="caliper-left">⊢</span>
    <span class="caliper-bar"></span>
    <span class="caliper-readout">0px</span>
    <span class="caliper-bar"></span>
    <span class="caliper-right">⊣</span>
  `;
  container.appendChild(wrap);
  const readout = wrap.querySelector('.caliper-readout');
  return {
    el: wrap,
    setWidth(px) {
      wrap.style.width = px + 'px';
      readout.textContent = Math.round(px) + 'px';
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Baseline grid — SVG overlay inside a text region
//   Renders faint dashed horizontal lines at each line's baseline.
//   createBaselineGrid(textRegionEl, { lineCount, lineHeight, ascentRatio? })
// ═══════════════════════════════════════════════════════════════
export function createBaselineGrid(container, { lineCount, lineHeight, ascentRatio = 0.78 }) {
  let svg = container.querySelector('.baseline-grid');
  if (svg) svg.remove();
  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'baseline-grid');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', String(lineCount * lineHeight + 4));
  svg.style.position = 'absolute';
  svg.style.left = '0';
  svg.style.top = '0';
  svg.style.pointerEvents = 'none';

  for (let i = 0; i < lineCount; i++) {
    const baselineY = i * lineHeight + lineHeight * ascentRatio;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', String(baselineY));
    line.setAttribute('x2', '100%');
    line.setAttribute('y2', String(baselineY));
    line.setAttribute('stroke', 'rgba(77, 91, 126, 0.22)');
    line.setAttribute('stroke-dasharray', '2 4');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
  }
  // Prepend so it sits under the text
  container.insertBefore(svg, container.firstChild);
  return svg;
}

// ═══════════════════════════════════════════════════════════════
// Per-line widths — mono readout column in the right margin
//   renderLineWidths(containerEl, [247.3, 251.8, 232.1, ...])
// ═══════════════════════════════════════════════════════════════
export function renderLineWidths(container, widths) {
  let col = container.querySelector('.line-widths');
  if (!col) {
    col = document.createElement('div');
    col.className = 'line-widths';
    container.appendChild(col);
  }
  col.innerHTML = widths.map(w => `<span>${w.toFixed(1)}</span>`).join('');
  return col;
}

// ═══════════════════════════════════════════════════════════════
// Ghost ruler toggle — reveals per-segment underlines
// ═══════════════════════════════════════════════════════════════
export function setupGhostRulerToggle(buttonEl, targetEl) {
  let active = false;
  buttonEl.addEventListener('click', () => {
    active = !active;
    targetEl.classList.toggle('show-ghost-ruler', active);
    buttonEl.textContent = active ? 'hide ghost ruler' : 'show ghost ruler';
    buttonEl.setAttribute('data-active', String(active));
  });
}

// ═══════════════════════════════════════════════════════════════
// Code toggle
// ═══════════════════════════════════════════════════════════════
export function setupCodeToggle(buttonEl, preEl) {
  let visible = false;
  buttonEl.addEventListener('click', () => {
    visible = !visible;
    preEl.classList.toggle('visible', visible);
    buttonEl.textContent = visible ? 'hide code' : 'show code';
  });
}

// ═══════════════════════════════════════════════════════════════
// JS syntax highlight
// ═══════════════════════════════════════════════════════════════
export function highlightJS(codeEl) {
  const keywords = ['const', 'let', 'var', 'function', 'import', 'from', 'export', 'return', 'if', 'else', 'for', 'while', 'async', 'await', 'new', 'class', 'extends'];
  let src = codeEl.textContent;
  src = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  src = src.replace(/(\/\/[^\n]*)/g, '<span class="js-comment">$1</span>');
  src = src.replace(/('[^'\n]*'|"[^"\n]*"|`[^`\n]*`)/g, '<span class="js-str">$1</span>');
  src = src.replace(/\b(\d+\.?\d*)\b/g, '<span class="js-num">$1</span>');
  const kwRe = new RegExp('\\b(' + keywords.join('|') + ')\\b', 'g');
  src = src.replace(kwRe, '<span class="js-kw">$1</span>');
  codeEl.innerHTML = src;
}

// ═══════════════════════════════════════════════════════════════
// Arrow-key lesson nav
// ═══════════════════════════════════════════════════════════════
export function setupArrowNav(prevUrl, nextUrl) {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowLeft' && prevUrl) window.location.href = prevUrl;
    else if (e.key === 'ArrowRight' && nextUrl) window.location.href = nextUrl;
  });
}

// ═══════════════════════════════════════════════════════════════
// DOM-measurement helper — used by L1 to show the slow path
//   Takes a text + width and returns measured height by letting
//   the browser reflow a hidden element.
// ═══════════════════════════════════════════════════════════════
export function domMeasureHeight(text, width, font = '20px EB Garamond, serif', lineHeight = 1.55) {
  const probe = document.createElement('div');
  probe.style.cssText = `
    position: absolute;
    visibility: hidden;
    width: ${width}px;
    font: ${font};
    line-height: ${lineHeight};
    white-space: normal;
    word-wrap: break-word;
  `;
  probe.textContent = text;
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  document.body.removeChild(probe);
  return h;
}
