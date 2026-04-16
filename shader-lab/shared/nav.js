// Shader Lab — persistent sidebar navigation.
// Auto-injects a collapsible lesson list into any page that loads this script.
// Collapse state persisted via localStorage.

const ARCS = [
  { label: 'Arc 1 · Mental Model', lessons: [
    { n: 1,  file: '01-what-is-a-shader', title: 'What a shader is' },
    { n: 2,  file: '02-three-layers',     title: 'The three layers' },
    { n: 3,  file: '03-primitives',        title: 'The primitives tour' },
  ]},
  { label: 'Arc 2 · 2D Screen-Space', lessons: [
    { n: 4,  file: '04-vignette',              title: 'Vignette' },
    { n: 5,  file: '05-pixelation',             title: 'Pixelation' },
    { n: 6,  file: '06-uv-warp',                title: 'UV warp' },
    { n: 7,  file: '07-chromatic-aberration',    title: 'Chromatic aberration' },
    { n: 8,  file: '08-perlin-noise',            title: 'Perlin noise' },
    { n: 9,  file: '09-fbm',                     title: 'FBM' },
    { n: 10, file: '10-domain-warping',          title: 'Domain warping' },
    { n: 11, file: '11-dithering',               title: 'Dithering (Bayer)' },
    { n: 12, file: '12-crt',                     title: 'CRT (composite)' },
  ]},
  { label: 'Arc 3 · Procedural Patterns', lessons: [
    { n: 13, file: '13-marble',    title: 'Marble' },
    { n: 14, file: '14-wood',      title: 'Wood' },
    { n: 15, file: '15-voronoi',   title: 'Voronoi cells' },
    { n: 16, file: '16-truchet',   title: 'Truchet tiles' },
  ]},
  { label: 'Arc 4 · 3D Lighting', lessons: [
    { n: 17, file: '17-lambert',        title: 'Lambert' },
    { n: 18, file: '18-blinn-phong',    title: 'Blinn-Phong' },
    { n: 19, file: '19-fresnel',        title: 'Fresnel / rim' },
    { n: 20, file: '20-toon',           title: 'Toon / cel' },
    { n: 21, file: '21-pbr',            title: 'PBR' },
    { n: 22, file: '22-normal-mapping', title: 'Normal mapping' },
    { n: 23, file: '23-triplanar',      title: 'Triplanar' },
  ]},
  { label: 'Arc 5 · 3D Geometry', lessons: [
    { n: 24, file: '24-vertex-displacement', title: 'Vertex displacement' },
    { n: 25, file: '25-gerstner-waves',      title: 'Gerstner waves' },
    { n: 26, file: '26-pom',                 title: 'POM' },
    { n: 27, file: '27-raymarching',         title: 'Raymarching SDFs' },
  ]},
  { label: 'Arc 6 · Simulations', lessons: [
    { n: 28, file: '28-fluid',              title: 'Fluid (Stam)' },
    { n: 29, file: '29-reaction-diffusion',  title: 'Reaction-diffusion' },
    { n: 30, file: '30-curl-particles',      title: 'Curl particles' },
    { n: 31, file: '31-fire',                title: 'Fire' },
  ]},
  { label: 'Arc 7 · Post-Pipeline', lessons: [
    { n: 32, file: '32-bloom',  title: 'Bloom' },
    { n: 33, file: '33-aces',   title: 'ACES tone mapping' },
    { n: 34, file: '34-lut',    title: 'LUT grading' },
    { n: 35, file: '35-ssao',   title: 'SSAO' },
  ]},
];

const LS_KEY = 'shaderlab-sidebar';
const LS_COLLAPSED_ARCS_KEY = 'shaderlab-collapsed-arcs';

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
  const isIndex = current === '' || current === 'index' || current === 'shader-lab';

  // Create sidebar
  const aside = document.createElement('aside');
  aside.id = 'sl-sidebar';
  aside.className = collapsed ? 'collapsed' : '';

  // Toggle button
  const toggle = document.createElement('button');
  toggle.className = 'sl-sidebar-toggle';
  toggle.setAttribute('aria-label', 'Toggle navigation');
  toggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4.5h12M3 9h12M3 13.5h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  toggle.addEventListener('click', () => {
    const isCollapsed = aside.classList.toggle('collapsed');
    document.body.classList.toggle('sl-sidebar-collapsed', isCollapsed);
    document.body.classList.toggle('sl-sidebar-open', !isCollapsed);
    saveState({ collapsed: isCollapsed });
  });
  aside.appendChild(toggle);

  // Brand
  const brand = document.createElement('a');
  brand.href = 'index.html';
  brand.className = 'sl-sidebar-brand';
  brand.textContent = 'Shader Lab';
  aside.appendChild(brand);

  // Lesson list
  const nav = document.createElement('nav');
  nav.className = 'sl-sidebar-nav';

  ARCS.forEach((arc, arcIdx) => {
    const arcDiv = document.createElement('div');
    arcDiv.className = 'sl-arc-group';

    const arcHeader = document.createElement('button');
    arcHeader.className = 'sl-arc-header';
    const arcCollapsed = !!collapsedArcs[arcIdx];
    arcHeader.setAttribute('aria-expanded', !arcCollapsed);
    arcHeader.innerHTML = `<span class="sl-arc-arrow">${arcCollapsed ? '▸' : '▾'}</span> ${arc.label}`;
    arcHeader.addEventListener('click', () => {
      const ca = getCollapsedArcs();
      ca[arcIdx] = !ca[arcIdx];
      saveCollapsedArcs(ca);
      const nowCollapsed = ca[arcIdx];
      arcHeader.setAttribute('aria-expanded', !nowCollapsed);
      arcHeader.querySelector('.sl-arc-arrow').textContent = nowCollapsed ? '▸' : '▾';
      list.style.display = nowCollapsed ? 'none' : '';
    });
    arcDiv.appendChild(arcHeader);

    const list = document.createElement('div');
    list.className = 'sl-lesson-list';
    list.style.display = arcCollapsed ? 'none' : '';

    arc.lessons.forEach(lesson => {
      const a = document.createElement('a');
      a.href = lesson.file + '.html';
      a.className = 'sl-lesson-link';
      if (current === lesson.file) a.classList.add('active');
      a.innerHTML = `<span class="sl-lesson-num">${String(lesson.n).padStart(2, '0')}</span>${lesson.title}`;
      list.appendChild(a);
    });

    arcDiv.appendChild(list);
    nav.appendChild(arcDiv);
  });

  aside.appendChild(nav);

  // Home link at top of index
  if (isIndex) {
    const homeLink = aside.querySelector('.sl-sidebar-brand');
    if (homeLink) homeLink.classList.add('active');
  }

  // Insert sidebar
  document.body.insertBefore(aside, document.body.firstChild);

  // Add body classes for layout
  document.body.classList.add('sl-has-sidebar');
  document.body.classList.toggle('sl-sidebar-collapsed', collapsed);
  document.body.classList.toggle('sl-sidebar-open', !collapsed);

  // Scroll active lesson into view
  requestAnimationFrame(() => {
    const active = aside.querySelector('.sl-lesson-link.active');
    if (active) active.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', build);
} else {
  build();
}
