// Approaching Vividness — interactive helpers
// Custom elements: <av-timer>, <av-speak>, <av-reflect>, <av-video>
// Plus window.AVJournal for journal storage.

// ─── Bell sound (synthesized, no asset needed) ─────────────────────────
function playBell() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ctx.currentTime;
    [528, 792].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.18 / (i + 1), t0 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 4.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 4.5);
    });
  } catch (e) { /* silent */ }
}

// ─── Journal storage ───────────────────────────────────────────────────
// Single JSON object at localStorage["av-journal"], keyed by entry id.
// Each entry: { id, lesson, lessonTitle, arc, prompt, text, updatedAt }
window.AVJournal = {
  KEY: 'av-journal',

  read() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); }
    catch (e) { return {}; }
  },

  write(obj) {
    localStorage.setItem(this.KEY, JSON.stringify(obj));
  },

  set(id, entry) {
    const journal = this.read();
    journal[id] = { ...journal[id], ...entry, id, updatedAt: new Date().toISOString() };
    this.write(journal);
  },

  get(id) {
    return this.read()[id];
  },

  count() {
    return Object.keys(this.read()).filter(k => (this.read()[k].text || '').trim().length > 0).length;
  },

  // Look up lesson context from window.AV_ARCS (set by nav.js)
  lookupLesson(file) {
    if (!window.AV_ARCS) return { lesson: '', lessonTitle: '', arc: '' };
    for (const arc of window.AV_ARCS) {
      for (const l of arc.lessons) {
        if (l.file === file) {
          return {
            lesson: String(l.n).padStart(2, '0'),
            lessonTitle: l.title,
            arc: arc.label,
          };
        }
      }
    }
    return { lesson: '', lessonTitle: document.title || '', arc: '' };
  },

  // One-time migration: pull pre-journal localStorage entries into the journal.
  // Old AVReflect saved at custom keys (e.g. "01-sitting-reflection", "welcome-warmup")
  // and at fallback keys ("av-reflect-<path>-<promptStart>"). Migrate any with content.
  migrate() {
    const migrated = localStorage.getItem('av-journal-migrated');
    if (migrated === 'v1') return;
    const journal = this.read();
    const known = ['welcome-warmup', '01-sitting-reflection']; // legacy keys we shipped
    for (const k of known) {
      const v = localStorage.getItem(k);
      if (v && !journal[k]) {
        journal[k] = {
          id: k,
          text: v,
          prompt: '(migrated from earlier version)',
          lesson: '', lessonTitle: '', arc: '',
          updatedAt: new Date().toISOString(),
        };
      }
    }
    // av-reflect-* fallback keys
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('av-reflect-')) {
        const v = localStorage.getItem(k);
        if (v && !journal[k]) {
          journal[k] = {
            id: k, text: v, prompt: '(migrated)',
            lesson: '', lessonTitle: '', arc: '',
            updatedAt: new Date().toISOString(),
          };
        }
      }
    }
    this.write(journal);
    localStorage.setItem('av-journal-migrated', 'v1');
  },
};

window.AVJournal.migrate();

// Update the nav badge with current entry count whenever the journal changes
window.addEventListener('storage', () => updateJournalBadge());
function updateJournalBadge() {
  const badge = document.querySelector('.av-nav .journal-badge');
  if (!badge) return;
  const n = window.AVJournal.count();
  badge.textContent = n > 0 ? n : '';
  badge.style.display = n > 0 ? 'inline-block' : 'none';
}
window.updateJournalBadge = updateJournalBadge;

// ─── <av-timer minutes seconds bell label> ─────────────────────────────
class AVTimer extends HTMLElement {
  connectedCallback() {
    const minutes = parseInt(this.getAttribute('minutes') || '0');
    const seconds = parseInt(this.getAttribute('seconds') || '0');
    const totalSec = minutes * 60 + seconds;
    const useBell = this.getAttribute('bell') !== 'false';
    const label = this.getAttribute('label') || '';

    let remaining = totalSec;
    let intervalId = null;
    let running = false;

    this.innerHTML = `
      <div class="widget av-timer">
        ${label ? `<div class="widget-label">${label}</div>` : ''}
        <div class="display"></div>
        <div class="controls">
          <button class="primary start">Begin</button>
          <button class="reset">Reset</button>
        </div>
      </div>
    `;

    const display = this.querySelector('.display');
    const startBtn = this.querySelector('.start');
    const resetBtn = this.querySelector('.reset');
    const wrap = this.querySelector('.av-timer');

    const render = () => {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      display.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    };
    render();

    const stop = () => {
      clearInterval(intervalId);
      running = false;
      wrap.classList.remove('running');
      startBtn.textContent = remaining === 0 ? 'Done' : 'Resume';
      startBtn.classList.toggle('primary', remaining > 0);
    };

    startBtn.addEventListener('click', () => {
      if (running) { stop(); return; }
      if (remaining === 0) { remaining = totalSec; wrap.classList.remove('done'); }
      running = true;
      wrap.classList.add('running');
      startBtn.textContent = 'Pause';
      intervalId = setInterval(() => {
        remaining--;
        render();
        if (remaining <= 0) {
          stop();
          wrap.classList.add('done');
          if (useBell) playBell();
          startBtn.textContent = 'Done';
        }
      }, 1000);
    });

    resetBtn.addEventListener('click', () => {
      stop();
      remaining = totalSec;
      wrap.classList.remove('done');
      render();
      startBtn.textContent = 'Begin';
      startBtn.classList.add('primary');
    });
  }
}

// ─── <av-speak audio="...">text content</av-speak> ─────────────────────
class AVSpeak extends HTMLElement {
  connectedCallback() {
    const text = this.textContent.trim();
    let audioFile = this.getAttribute('audio');
    this.innerHTML = `
      <div class="av-speak">
        <button class="play" aria-label="Play narration">▶</button>
        <div class="text">${text}</div>
      </div>
    `;
    const btn = this.querySelector('button.play');
    let utter = null;
    let audio = null;
    let playing = false;

    const stop = () => {
      if (utter) { window.speechSynthesis.cancel(); utter = null; }
      if (audio) { audio.pause(); audio.currentTime = 0; }
      btn.classList.remove('playing');
      btn.textContent = '▶';
      playing = false;
    };

    btn.addEventListener('click', () => {
      if (playing) { stop(); return; }
      playing = true;
      btn.classList.add('playing');
      btn.textContent = '⏸';
      if (audioFile) {
        audio = new Audio(audioFile);
        audio.onended = stop;
        audio.onerror = () => { audioFile = null; speakWebAPI(); };
        audio.play().catch(() => speakWebAPI());
        return;
      }
      speakWebAPI();
    });

    function speakWebAPI() {
      if (!('speechSynthesis' in window)) {
        btn.textContent = 'N/A';
        playing = false;
        return;
      }
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        /aria|jenny|samantha|allison|moira|karen|tessa|fiona/i.test(v.name)
      ) || voices.find(v => v.lang.startsWith('en'));
      utter = new SpeechSynthesisUtterance(text);
      if (preferred) utter.voice = preferred;
      utter.rate = 0.92;
      utter.pitch = 1.0;
      utter.onend = stop;
      window.speechSynthesis.speak(utter);
    }
  }
}
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {};
  window.speechSynthesis.getVoices();
}

// ─── <av-reflect prompt key> — writes through to AVJournal ─────────────
class AVReflect extends HTMLElement {
  connectedCallback() {
    const prompt = this.getAttribute('prompt') || 'Reflect…';
    const file = location.pathname.split('/').pop().replace('.html', '');
    const id = this.getAttribute('key') || `${file}-${prompt.slice(0, 40).replace(/[^\w]+/g, '-')}`;
    const ctx = window.AVJournal.lookupLesson(file);
    const existing = window.AVJournal.get(id);

    this.innerHTML = `
      <div class="widget av-reflect">
        <div class="widget-label">
          Reflection · saved to your journal
          <a class="journal-link" href="journal.html">your journal →</a>
        </div>
        <div class="prompt">${prompt}</div>
        <textarea placeholder="Write what you noticed…">${existing ? existing.text : ''}</textarea>
        <div class="saved"></div>
      </div>
    `;

    const ta = this.querySelector('textarea');
    const saved = this.querySelector('.saved');
    let timeout = null;
    if (existing && existing.text) saved.textContent = 'Saved.';

    // Ensure journal entry has metadata even if user hasn't typed yet
    if (!existing && (ctx.lesson || ctx.lessonTitle)) {
      window.AVJournal.set(id, {
        ...ctx, prompt, text: '',
      });
    }

    ta.addEventListener('input', () => {
      clearTimeout(timeout);
      saved.textContent = '…';
      timeout = setTimeout(() => {
        window.AVJournal.set(id, { ...ctx, prompt, text: ta.value });
        saved.textContent = 'Saved.';
        updateJournalBadge();
      }, 500);
    });
  }
}

// ─── <av-video id start end caption sensitive> ─────────────────────────
// If `sensitive` is set, the iframe is replaced with a click-to-load overlay
// so the YouTube thumbnail (which may itself be the trigger) doesn't appear
// until the user opts in.
class AVVideo extends HTMLElement {
  connectedCallback() {
    const id = this.getAttribute('id');
    const start = this.getAttribute('start') || '0';
    const end = this.getAttribute('end');
    const caption = this.getAttribute('caption') || '';
    const sensitive = this.hasAttribute('sensitive');
    const params = new URLSearchParams({ start, rel: '0', modestbranding: '1' });
    if (end) params.set('end', end);
    const iframeHtml = `
      <iframe
        src="https://www.youtube-nocookie.com/embed/${id}?${params}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy"
      ></iframe>`;

    if (sensitive) {
      this.innerHTML = `
        <div class="av-video sensitive">
          <button class="sensitive-load">
            <span class="sensitive-icon">⊕</span>
            <span class="sensitive-label">Click to load video</span>
            <span class="sensitive-hint">${caption || ''}</span>
          </button>
        </div>
        ${caption ? `<div class="av-video-caption">${caption}</div>` : ''}
      `;
      const btn = this.querySelector('.sensitive-load');
      const wrap = this.querySelector('.av-video');
      btn.addEventListener('click', () => {
        wrap.classList.remove('sensitive');
        wrap.innerHTML = iframeHtml;
      });
    } else {
      this.innerHTML = `
        <div class="av-video">${iframeHtml}</div>
        ${caption ? `<div class="av-video-caption">${caption}</div>` : ''}
      `;
    }
  }
}

// ─── <av-guided-video video-id start end> ─────────────────────────────
// Looping YouTube embed + sequenced narration (TTS or audio file).
// Children: <step seconds="N" audio="path">instruction text</step>
class AVGuidedVideo extends HTMLElement {
  connectedCallback() {
    const id = this.getAttribute('video-id');
    const start = this.getAttribute('video-start') || '0';
    const end = this.getAttribute('video-end');
    const caption = this.getAttribute('caption') || '';
    const stepEls = Array.from(this.querySelectorAll('step'));
    const steps = stepEls.map(el => ({
      seconds: parseInt(el.getAttribute('seconds') || '30'),
      audio: el.getAttribute('audio') || null,
      text: el.textContent.trim(),
    }));

    // YouTube loop trick: ?loop=1&playlist=ID makes the embed loop the segment.
    // mute=1 + autoplay=1 enables autoplay; controls=0 hides chrome.
    // cc_load_policy=1 forces captions on (load-bearing for the Muir Woods exercise).
    const params = new URLSearchParams({
      autoplay: '1', mute: '1', loop: '1', playlist: id,
      controls: '0', rel: '0', modestbranding: '1', start,
      cc_load_policy: '1', cc_lang_pref: 'en',
    });
    if (end) params.set('end', end);

    this.innerHTML = `
      <div class="widget av-guided-video">
        <div class="gv-frame">
          <iframe
            src="https://www.youtube-nocookie.com/embed/${id}?${params}"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen></iframe>
        </div>
        ${caption ? `<div class="av-video-caption">${caption}</div>` : ''}
        <div class="gv-control">
          <button class="btn primary gv-begin">Begin guided sequence</button>
          <div class="gv-progress" style="display:none;">
            <span class="gv-step-num"></span> of ${steps.length}
            <span class="gv-step-text"></span>
            <button class="btn gv-stop">Stop</button>
          </div>
        </div>
      </div>
    `;

    const beginBtn = this.querySelector('.gv-begin');
    const progress = this.querySelector('.gv-progress');
    const stepNum = this.querySelector('.gv-step-num');
    const stepText = this.querySelector('.gv-step-text');
    const stopBtn = this.querySelector('.gv-stop');

    let currentStep = 0;
    let stepTimer = null;
    let utter = null;
    let audio = null;
    let running = false;

    const stop = () => {
      running = false;
      clearTimeout(stepTimer);
      if (utter) { window.speechSynthesis.cancel(); utter = null; }
      if (audio) { audio.pause(); audio = null; }
      progress.style.display = 'none';
      beginBtn.style.display = '';
      beginBtn.textContent = 'Begin again';
      currentStep = 0;
    };

    const speakStep = (s, onDone) => {
      // Try audio file first; fall back to Web Speech API
      if (s.audio) {
        audio = new Audio(s.audio);
        audio.onended = onDone;
        audio.onerror = () => { audio = null; speakAPI(); };
        audio.play().catch(() => speakAPI());
        return;
      }
      speakAPI();

      function speakAPI() {
        if (!('speechSynthesis' in window)) { onDone(); return; }
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v =>
          /aria|jenny|samantha|allison|moira|karen|tessa|fiona/i.test(v.name)
        ) || voices.find(v => v.lang.startsWith('en'));
        utter = new SpeechSynthesisUtterance(s.text);
        if (preferred) utter.voice = preferred;
        utter.rate = 0.9;
        utter.pitch = 1.0;
        utter.onend = onDone;
        window.speechSynthesis.speak(utter);
      }
    };

    const runStep = () => {
      if (!running) return;
      if (currentStep >= steps.length) {
        stepNum.textContent = '';
        stepText.textContent = 'Now let it go.';
        playBell();
        setTimeout(stop, 4000);
        return;
      }
      const s = steps[currentStep];
      stepNum.textContent = `Step ${currentStep + 1}`;
      stepText.textContent = s.text;
      // Speak, then start the silence timer (after speech ends)
      speakStep(s, () => {
        if (!running) return;
        stepTimer = setTimeout(() => {
          if (!running) return;
          playBell();
          currentStep++;
          setTimeout(runStep, 1200);
        }, s.seconds * 1000);
      });
    };

    beginBtn.addEventListener('click', () => {
      running = true;
      currentStep = 0;
      beginBtn.style.display = 'none';
      progress.style.display = '';
      runStep();
    });
    stopBtn.addEventListener('click', stop);
  }
}

// ─── <av-dial label> — vividness dial (1-10 slider with chromatic tiles) ──
class AVDial extends HTMLElement {
  connectedCallback() {
    const label = this.getAttribute('label') || 'How vivid is this moment?';
    const initial = parseInt(this.getAttribute('default') || '5');
    this.innerHTML = `
      <div class="widget av-dial">
        <div class="widget-label">${label}</div>
        <div class="dial-row">
          <input type="range" min="1" max="10" value="${initial}" class="dial-slider">
          <span class="dial-value">${initial}</span>
        </div>
        <div class="dial-tiles">
          ${Array.from({length: 10}, (_, i) => `<div class="tile" data-i="${i+1}"></div>`).join('')}
        </div>
        <div class="dial-hint">Move the dial as you look around the room. Notice what lets it move up, and what holds it back.</div>
      </div>
    `;
    const slider = this.querySelector('.dial-slider');
    const valEl = this.querySelector('.dial-value');
    const tiles = this.querySelectorAll('.tile');

    const render = (v) => {
      valEl.textContent = v;
      tiles.forEach((t, i) => {
        const idx = i + 1;
        const active = idx <= v;
        const hue = (i / 10) * 300;
        const sat = active ? 70 : 0;
        const light = active ? 55 : 88;
        t.style.background = `hsl(${hue}, ${sat}%, ${light}%)`;
        t.classList.toggle('active', active);
      });
    };
    render(initial);
    slider.addEventListener('input', () => render(parseInt(slider.value)));
  }
}

customElements.define('av-timer', AVTimer);
customElements.define('av-speak', AVSpeak);
customElements.define('av-reflect', AVReflect);
customElements.define('av-video', AVVideo);
customElements.define('av-dial', AVDial);
customElements.define('av-guided-video', AVGuidedVideo);

// Update nav badge once everything is ready
document.addEventListener('DOMContentLoaded', updateJournalBadge);
