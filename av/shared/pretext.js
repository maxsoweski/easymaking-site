// Approaching Vividness — pretext text effects
//
// Two-tier system:
//   1. [data-pretext] elements (titles, taglines): muted-by-default;
//      cursor proximity restores ink color + per-char scale/lift.
//   2. ALL other text inside <main>: keeps natural color but each char
//      still scales/lifts gently when cursor is near.
//   In both: words in the "vividness" family rainbow under proximity.
//
// Inspired by chenglou.me/pretext (text as physical, reactive material).
// Performance: walks text nodes once on load, skips dynamic elements
// (timer display, dial value, form controls, etc.).

(function pretextInit() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const RADIUS = 110;
  const MAX_SCALE_TITLE = 0.28;
  const MAX_SCALE_BODY  = 0.10;
  const MAX_LIFT_TITLE  = 4;
  const MAX_LIFT_BODY   = 1.5;
  const ACTIVE_RADIUS   = 180;

  // Words in the "vividness" semantic family — rainbow under cursor proximity.
  const VIVID_RE = /\b(vivid(?:ly|ness)?|aliveness|alive|vibran(?:t|cy|tly)|radian(?:t|ce|tly)|luminous|luminosity|bright(?:ness|ly)?|fresh(?:ness|ly)?)\b/gi;

  // Tags whose text should never be split
  const EXEMPT_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'BUTTON', 'IFRAME', 'OPTION', 'SELECT', 'CODE', 'PRE']);
  // Class/selector ancestors whose text is dynamic — don't waste cycles
  const EXEMPT_CLASSES = ['no-pretext', 'display', 'dial-value', 'dial-tiles', 'tile', 'saved'];
  // av-timer display updates every second; the .display class is on the timer's countdown
  // .saved is the "Saved." indicator on av-reflect
  // .dial-value is the dial's numeric readout

  let chars = [];          // all .pretext-char in DOM (recomputed after split)
  let lines = [];          // .pretext-line containers (titles + vivid-word wrappers)
  let positions = [];
  let linePositions = [];
  let mouseX = -9999, mouseY = -9999;
  let needsUpdate = false;

  // ─── Walker that respects exemptions ────────────────────────────────
  function isExempt(node) {
    let p = node.parentElement;
    while (p) {
      if (EXEMPT_TAGS.has(p.tagName)) return true;
      if (p.dataset && p.dataset.pretextSplit === '1') return true;
      for (const cls of EXEMPT_CLASSES) {
        if (p.classList.contains(cls)) return true;
      }
      p = p.parentElement;
    }
    return false;
  }

  // Replace a text node with per-char spans; mark vivid chars for rainbow.
  function splitTextNode(node, asTitle) {
    const text = node.textContent;
    if (!text || text.trim().length === 0) return;

    const rainbowAt = new Array(text.length).fill(-1);
    VIVID_RE.lastIndex = 0;
    let m;
    while ((m = VIVID_RE.exec(text)) !== null) {
      for (let i = 0; i < m[0].length; i++) rainbowAt[m.index + i] = i;
    }

    const frag = document.createDocumentFragment();
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const span = document.createElement('span');
      span.className = asTitle ? 'pretext-char pretext-title' : 'pretext-char pretext-body';
      span.textContent = ch === ' ' ? '\u00a0' : ch;
      if (rainbowAt[i] >= 0) {
        span.dataset.rainbow = rainbowAt[i];
        span.classList.add('pretext-rainbow');
      }
      frag.appendChild(span);
    }
    if (node.parentNode) node.parentNode.replaceChild(frag, node);
  }

  function processElement(root, asTitle) {
    if (!root) return;
    if (root.dataset && root.dataset.pretextSplit === '1') return;
    if (root.dataset) root.dataset.pretextSplit = '1';

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) { return isExempt(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) splitTextNode(n, asTitle);
  }

  function setup() {
    // Title-tier: explicit data-pretext elements get muted-default treatment
    document.querySelectorAll('[data-pretext]').forEach(el => processElement(el, true));

    // Body-tier: everything else inside <main> (auto-applied)
    const main = document.querySelector('main');
    if (main) {
      // Walk all elements in main; for each direct text-bearing element NOT
      // already processed and NOT exempt, run processElement in body mode.
      // Simpler: just call processElement on main itself; the walker handles
      // skipping nested data-pretext and exempt subtrees.
      processElement(main, false);
    }

    chars = Array.from(document.querySelectorAll('.pretext-char'));
    // "Lines" for the active-class behavior: every [data-pretext] container
    document.querySelectorAll('[data-pretext]').forEach(el => {
      el.classList.add('pretext-line');
      lines.push(el);
    });
    measure();
  }

  function measure() {
    positions = chars.map(c => {
      const r = c.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    linePositions = lines.map(l => {
      const r = l.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    });
  }

  // ─── update loop ────────────────────────────────────────────────────
  function update() {
    needsUpdate = false;
    const now = performance.now();
    let activeRainbow = false;

    for (let i = 0; i < chars.length; i++) {
      const p = positions[i];
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const distSq = dx * dx + dy * dy;
      const c = chars[i];
      const isRainbow = c.dataset.rainbow !== undefined;

      if (distSq > RADIUS * RADIUS) {
        if (c.style.transform) c.style.transform = '';
        if (isRainbow && c.style.color) c.style.color = '';
        continue;
      }
      const dist = Math.sqrt(distSq);
      const t = 1 - dist / RADIUS;

      if (!reduceMotion) {
        const isTitle = c.classList.contains('pretext-title');
        const maxScale = isTitle ? MAX_SCALE_TITLE : MAX_SCALE_BODY;
        const maxLift  = isTitle ? MAX_LIFT_TITLE  : MAX_LIFT_BODY;
        const scale = 1 + maxScale * t * t;
        const lift = -maxLift * t;
        c.style.transform = `translateY(${lift.toFixed(2)}px) scale(${scale.toFixed(3)})`;
      }

      if (isRainbow) {
        const wordIdx = parseInt(c.dataset.rainbow);
        const hue = (wordIdx * 36 + now * 0.04) % 360;
        const sat = 60 + 25 * t;
        const light = 52 - 8 * t;
        c.style.color = `hsl(${hue.toFixed(1)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%)`;
        activeRainbow = true;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const lp = linePositions[i];
      const cx = Math.max(lp.left, Math.min(mouseX, lp.right));
      const cy = Math.max(lp.top, Math.min(mouseY, lp.bottom));
      const d = Math.hypot(mouseX - cx, mouseY - cy);
      lines[i].classList.toggle('active', d < ACTIVE_RADIUS);
    }

    if (activeRainbow) {
      needsUpdate = true;
      requestAnimationFrame(update);
    }
  }

  function onMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!needsUpdate) {
      needsUpdate = true;
      requestAnimationFrame(update);
    }
  }
  function onLeave() {
    mouseX = -9999;
    mouseY = -9999;
    if (!needsUpdate) {
      needsUpdate = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseleave', onLeave);
  window.addEventListener('resize', () => requestAnimationFrame(measure));
  window.addEventListener('scroll', () => requestAnimationFrame(measure), { passive: true });

  function ready() {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setup);
    else setup();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
