// Approaching Vividness — pretext text effects
//
// Three tiers (text gets the live effect ONLY in these places):
//   1. [data-pretext]              — titles, taglines, h1 (full muted-default treatment)
//   2. <a> inside <main>           — links (next/prev, journal, in-text)
//   3. words matching VIVID_RE     — vividness synonyms anywhere in body text
//
// Body prose outside these tiers stays as plain text (no per-char split).
//
// Inspired by chenglou.me/pretext (text as physical, reactive material).

(function pretextInit() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const RADIUS = 110;
  const MAX_SCALE_TITLE = 0.28;
  const MAX_SCALE_LINK  = 0.16;
  const MAX_SCALE_VIVID = 0.14;
  const MAX_LIFT_TITLE  = 4;
  const MAX_LIFT_LINK   = 2.5;
  const MAX_LIFT_VIVID  = 2;
  const ACTIVE_RADIUS   = 180;

  const VIVID_RE = /\b(vivid(?:ly|ness)?|aliveness|alive|vibran(?:t|cy|tly)|radian(?:t|ce|tly)|luminous|luminosity|bright(?:ness|ly)?|fresh(?:ness|ly)?)\b/gi;

  const EXEMPT_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'BUTTON', 'IFRAME', 'OPTION', 'SELECT', 'CODE', 'PRE']);
  const EXEMPT_CLASSES = ['no-pretext', 'display', 'dial-value', 'dial-tiles', 'tile', 'saved'];

  let chars = [];
  let lines = [];
  let positions = [];
  let linePositions = [];
  let mouseX = -9999, mouseY = -9999;
  let needsUpdate = false;

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

  // Split a single text node into per-char spans.
  // tier: 'title' | 'link' | 'vivid-only' (vivid-only only wraps vivid words; other chars stay as text)
  function splitTextNode(node, tier) {
    const text = node.textContent;
    if (!text || text.trim().length === 0) return;

    const rainbowAt = new Array(text.length).fill(-1);
    VIVID_RE.lastIndex = 0;
    let m;
    while ((m = VIVID_RE.exec(text)) !== null) {
      for (let i = 0; i < m[0].length; i++) rainbowAt[m.index + i] = i;
    }

    const frag = document.createDocumentFragment();

    if (tier === 'vivid-only') {
      // Walk the text, emitting plain TextNodes for non-vivid spans and per-char spans for vivid words.
      let i = 0;
      while (i < text.length) {
        if (rainbowAt[i] >= 0) {
          // Find end of this vivid word
          const wordSpan = document.createElement('span');
          wordSpan.className = 'vivid-word';
          let j = i;
          while (j < text.length && rainbowAt[j] >= 0) {
            const ch = text[j];
            const c = document.createElement('span');
            c.className = 'pretext-char pretext-vivid pretext-rainbow';
            c.dataset.rainbow = rainbowAt[j];
            c.textContent = ch === ' ' ? '\u00a0' : ch;
            wordSpan.appendChild(c);
            j++;
          }
          frag.appendChild(wordSpan);
          i = j;
        } else {
          // Find end of plain run
          let j = i;
          while (j < text.length && rainbowAt[j] < 0) j++;
          frag.appendChild(document.createTextNode(text.slice(i, j)));
          i = j;
        }
      }
    } else {
      // 'title' or 'link' — split every char
      const tierClass = tier === 'title' ? 'pretext-title' : 'pretext-link';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const span = document.createElement('span');
        span.className = `pretext-char ${tierClass}`;
        span.textContent = ch === ' ' ? '\u00a0' : ch;
        if (rainbowAt[i] >= 0) {
          span.dataset.rainbow = rainbowAt[i];
          span.classList.add('pretext-rainbow');
        }
        frag.appendChild(span);
      }
    }

    if (node.parentNode) node.parentNode.replaceChild(frag, node);
  }

  function processElement(root, tier) {
    if (!root) return;
    if (root.dataset && root.dataset.pretextSplit === '1') return;
    if (root.dataset) root.dataset.pretextSplit = '1';

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) { return isExempt(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) splitTextNode(n, tier);
  }

  function setup() {
    // Tier 1 — titles
    document.querySelectorAll('[data-pretext]').forEach(el => {
      processElement(el, 'title');
      el.classList.add('pretext-line');
      lines.push(el);
    });

    const main = document.querySelector('main');
    if (main) {
      // Tier 2 — links (skip ones already inside data-pretext)
      main.querySelectorAll('a').forEach(el => {
        let inPretext = false;
        let p = el.parentElement;
        while (p && p !== main) {
          if (p.dataset && p.dataset.pretextSplit === '1') { inPretext = true; break; }
          p = p.parentElement;
        }
        if (inPretext) return;
        processElement(el, 'link');
        el.classList.add('pretext-line');
        lines.push(el);
      });

      // Tier 3 — vivid words anywhere in main (skip subtrees we already processed)
      processElement(main, 'vivid-only');
    }

    chars = Array.from(document.querySelectorAll('.pretext-char'));
    // Add vivid-word containers as lines so they activate too
    document.querySelectorAll('.vivid-word').forEach(w => {
      w.classList.add('pretext-line');
      lines.push(w);
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
        let maxScale, maxLift;
        if (c.classList.contains('pretext-title'))      { maxScale = MAX_SCALE_TITLE; maxLift = MAX_LIFT_TITLE; }
        else if (c.classList.contains('pretext-link'))   { maxScale = MAX_SCALE_LINK;  maxLift = MAX_LIFT_LINK;  }
        else                                              { maxScale = MAX_SCALE_VIVID; maxLift = MAX_LIFT_VIVID; }
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
