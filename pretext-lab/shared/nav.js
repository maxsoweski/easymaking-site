// Pretext Lab — persistent sidebar navigation.
// Auto-injects a collapsible lesson list into any page that loads this script.
// Collapse state persisted via localStorage.

const ARCS = [
  { label: 'Arc 1 · Mental Model', lessons: [
    { n: 1,  file: '01-invisible-cost',   title: 'The invisible cost' },
    { n: 2,  file: '02-two-phase',        title: 'The two-phase dance' },
  ]},
  { label: 'Arc 2 · Basic Measurement', lessons: [
    { n: 3,  file: '03-height-from-width', title: 'Height from width' },
    { n: 4,  file: '04-font-as-string',    title: 'Font as a string' },
    { n: 5,  file: '05-reusable-handle',   title: 'Reusable handle' },
  ]},
  { label: 'Arc 3 · Whitespace & Breaks', lessons: [
    { n: 6,  file: '06-normal-vs-prewrap', title: 'Normal vs pre-wrap' },
    { n: 7,  file: '07-word-break',        title: 'Word-break keep-all' },
    { n: 8,  file: '08-soft-hyphens',      title: 'Soft hyphens' },
    { n: 9,  file: '09-tabs',              title: 'Tabs' },
  ]},
  { label: 'Arc 4 · Multilingual', lessons: [
    { n: 10, file: '10-rtl',                title: 'RTL bidi' },
    { n: 11, file: '11-cjk',                title: 'CJK keep-all' },
    { n: 12, file: '12-emoji-graphemes',    title: 'Emoji + graphemes' },
  ]},
  { label: 'Arc 5 · Rich Inline', lessons: [
    { n: 13, file: '13-atomic-chips',       title: 'Atomic chips' },
    { n: 14, file: '14-mixed-fonts',        title: 'Mixed fonts + sizes' },
    { n: 15, file: '15-streaming-chat',     title: 'Streaming chat' },
  ]},
  { label: 'Arc 6 · Manual Layout', lessons: [
    { n: 16, file: '16-variable-width',     title: 'Variable-width wrap' },
    { n: 17, file: '17-line-stats',         title: 'Line stats' },
    { n: 18, file: '18-walkers',            title: 'Walkers' },
  ]},
  { label: 'Arc 7 · Rendering Targets', lessons: [
    { n: 19, file: '19-dom-target',         title: 'DOM target' },
    { n: 20, file: '20-canvas-target',      title: 'Canvas target' },
    { n: 21, file: '21-svg-target',         title: 'SVG target' },
  ]},
  { label: 'Arc 8 · Production Patterns', lessons: [
    { n: 22, file: '22-virtual-scroll',     title: 'Virtual scroll' },
    { n: 23, file: '23-chat-bubble',        title: 'Chat bubble pre-sizing' },
    { n: 24, file: '24-perf-bench',         title: 'Perf bench' },
  ]},
];

const LS_KEY = 'pretextlab-sidebar';
const LS_COLLAPSED_ARCS_KEY = 'pretextlab-collapsed-arcs';

function getState() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
}
function saveState(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}
function getCollapsedArcs() {
  try { return JSON.parse(localStorage.getItem(LS_COLLAPSED_ARCS_KEY)) || {}; } catch { return {}; }
}
function saveCollapsedArcs(s) {
  try { localStorage.setItem(LS_COLLAPSED_ARCS_KEY, JSON.stringify(s)); } catch {}
}

function currentFile() {
  const path = window.location.pathname;
  const parts = path.split('/');
  const last = parts[parts.length - 1] || parts[parts.length - 2] || '';
  return last.replace(/\.html$/, '');
}

function build() {
  const state = getState();
  const collapsed = state.collapsed || false;
  const collapsedArcs = getCollapsedArcs();
  const current = currentFile();
  const isIndex = current === '' || current === 'index' || current === 'pretext-lab';

  const aside = document.createElement('aside');
  aside.id = 'pl-sidebar';
  aside.className = collapsed ? 'collapsed' : '';

  const toggle = document.createElement('button');
  toggle.className = 'pl-sidebar-toggle';
  toggle.setAttribute('aria-label', 'Toggle navigation');
  toggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4.5h12M3 9h12M3 13.5h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  toggle.addEventListener('click', () => {
    const isCollapsed = aside.classList.toggle('collapsed');
    document.body.classList.toggle('pl-sidebar-collapsed', isCollapsed);
    document.body.classList.toggle('pl-sidebar-open', !isCollapsed);
    saveState({ collapsed: isCollapsed });
  });
  aside.appendChild(toggle);

  const brand = document.createElement('a');
  brand.href = 'index.html';
  brand.className = 'pl-sidebar-brand';
  brand.textContent = 'Pretext Lab';
  aside.appendChild(brand);

  const nav = document.createElement('nav');
  nav.className = 'pl-sidebar-nav';

  ARCS.forEach((arc, arcIdx) => {
    const arcDiv = document.createElement('div');
    arcDiv.className = 'pl-arc-group';

    const arcHeader = document.createElement('button');
    arcHeader.className = 'pl-arc-header';
    const arcCollapsed = !!collapsedArcs[arcIdx];
    arcHeader.setAttribute('aria-expanded', !arcCollapsed);
    arcHeader.innerHTML = `<span class="pl-arc-arrow">${arcCollapsed ? '▸' : '▾'}</span> ${arc.label}`;
    arcHeader.addEventListener('click', () => {
      const ca = getCollapsedArcs();
      ca[arcIdx] = !ca[arcIdx];
      saveCollapsedArcs(ca);
      const nowCollapsed = ca[arcIdx];
      arcHeader.setAttribute('aria-expanded', !nowCollapsed);
      arcHeader.querySelector('.pl-arc-arrow').textContent = nowCollapsed ? '▸' : '▾';
      list.style.display = nowCollapsed ? 'none' : '';
    });
    arcDiv.appendChild(arcHeader);

    const list = document.createElement('div');
    list.className = 'pl-lesson-list';
    list.style.display = arcCollapsed ? 'none' : '';

    arc.lessons.forEach(lesson => {
      const a = document.createElement('a');
      a.href = lesson.file + '.html';
      a.className = 'pl-lesson-link';
      if (current === lesson.file) a.classList.add('active');
      a.innerHTML = `<span class="pl-lesson-num">${String(lesson.n).padStart(2, '0')}</span>${lesson.title}`;
      list.appendChild(a);
    });

    arcDiv.appendChild(list);
    nav.appendChild(arcDiv);
  });

  aside.appendChild(nav);

  if (isIndex) {
    const homeLink = aside.querySelector('.pl-sidebar-brand');
    if (homeLink) homeLink.classList.add('active');
  }

  const contentWrap = document.createElement('div');
  contentWrap.className = 'pl-content';
  while (document.body.firstChild) {
    contentWrap.appendChild(document.body.firstChild);
  }
  document.body.appendChild(aside);
  document.body.appendChild(contentWrap);

  document.body.classList.add('pl-has-sidebar');
  document.body.classList.toggle('pl-sidebar-collapsed', collapsed);
  document.body.classList.toggle('pl-sidebar-open', !collapsed);

  requestAnimationFrame(() => {
    const active = aside.querySelector('.pl-lesson-link.active');
    if (active) active.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', build);
} else {
  build();
}
