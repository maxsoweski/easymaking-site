// Approaching Vividness — sidebar navigation
// Exposes window.AV_ARCS for journal lookups.

const ARCS = [
  { label: 'Welcome', lessons: [
    { n: 0, file: '00-welcome', title: 'How to use this course' },
  ]},
  { label: 'Arc 1 · Liberated Perception', lessons: [
    { n: 1, file: '01-vividness-and-unseeing',     title: 'Vividness & unseeing' },
    { n: 2, file: '02-vividness-in-the-ordinary',  title: 'Vividness in the ordinary' },
    { n: 3, file: '03-conceptual-overlays',         title: 'Conceptual overlays' },
    { n: 4, file: '04-art-and-perceptual-flinch',   title: 'Art & perceptual flinch' },
  ]},
  { label: 'Arc 2 · Liberated Space', lessons: [
    { n: 5, file: '05-wonder-as-portal',            title: 'Wonder as a portal' },
    { n: 6, file: '06-distasteful-spaciousness',    title: 'Distasteful spaciousness' },
    { n: 7, file: '07-opening-awareness',           title: 'Opening Awareness' },
    { n: 8, file: '08-spaciousness-in-daily-life',  title: 'Spaciousness in daily life' },
  ]},
  { label: 'Arc 3 · Liberated Form', lessons: [
    { n: 9,  file: '09-what-appreciation-means',     title: 'What appreciation means' },
    { n: 10, file: '10-appreciating-the-senses',     title: 'Appreciating the senses' },
    { n: 11, file: '11-appreciating-when-not-obvious', title: 'Appreciating when not obvious' },
    { n: 12, file: '12-moving-awareness',             title: 'Moving Awareness' },
  ]},
  { label: 'Arc 4 · Liberating Passion', lessons: [
    { n: 13, file: '13-what-is-energy',              title: 'What is energy?' },
    { n: 14, file: '14-constrained-energy',          title: 'Constrained energy' },
    { n: 15, file: '15-spaciousness-in-energy',      title: 'Spaciousness in energy' },
    { n: 16, file: '16-appreciating-energy',         title: 'Appreciating energy' },
    { n: 17, file: '17-power-in-energy',             title: 'Power in energy' },
  ]},
];
window.AV_ARCS = ARCS;

(function buildNav() {
  if (document.body.classList.contains('toc-page')) return;
  document.body.classList.add('has-nav');

  const collapsed = localStorage.getItem('av-nav-collapsed') === 'true';
  if (collapsed) document.body.classList.add('nav-collapsed');

  const currentFile = location.pathname.split('/').pop().replace('.html', '');

  const nav = document.createElement('nav');
  nav.className = 'av-nav';
  nav.innerHTML = `
    <button class="nav-toggle" aria-label="Toggle nav">${collapsed ? '☰' : '×'}</button>
    <div class="nav-inner">
      <a href="index.html" class="nav-home">Approaching Vividness</a>
      <div class="nav-sub">An invitation, in four parts</div>
      ${ARCS.map((arc, i) => `
        <div class="arc${getArcCollapsed(i) ? ' collapsed' : ''}" data-arc="${i}">
          <div class="arc-head"><span class="chev">▼</span>${arc.label}</div>
          <ul>
            ${arc.lessons.map(l => `
              <li><a href="${l.file}.html"${l.file === currentFile ? ' class="active"' : ''}>${l.title}</a></li>
            `).join('')}
          </ul>
        </div>
      `).join('')}
      <div class="nav-journal">
        <a href="journal.html"${currentFile === 'journal' ? ' class="active"' : ''}>
          <span class="journal-icon">✒</span>
          <span class="journal-label">Your Journal</span>
          <span class="journal-badge"></span>
        </a>
      </div>
    </div>
  `;
  document.body.insertBefore(nav, document.body.firstChild);

  // Wrap existing content
  const main = document.querySelector('main') || document.body.children[1];
  if (main && !main.parentElement.classList.contains('av-content')) {
    const wrap = document.createElement('div');
    wrap.className = 'av-content';
    main.parentElement.insertBefore(wrap, main);
    wrap.appendChild(main);
  }

  nav.querySelector('.nav-toggle').addEventListener('click', () => {
    document.body.classList.toggle('nav-collapsed');
    const isCollapsed = document.body.classList.contains('nav-collapsed');
    localStorage.setItem('av-nav-collapsed', isCollapsed);
    nav.querySelector('.nav-toggle').textContent = isCollapsed ? '☰' : '×';
  });

  nav.querySelectorAll('.arc-head').forEach(head => {
    head.addEventListener('click', () => {
      const arc = head.parentElement;
      arc.classList.toggle('collapsed');
      const idx = arc.dataset.arc;
      const collapsedArcs = JSON.parse(localStorage.getItem('av-nav-arcs') || '{}');
      collapsedArcs[idx] = arc.classList.contains('collapsed');
      localStorage.setItem('av-nav-arcs', JSON.stringify(collapsedArcs));
    });
  });

  function getArcCollapsed(i) {
    const stored = JSON.parse(localStorage.getItem('av-nav-arcs') || '{}');
    return stored[i] === true;
  }
})();
