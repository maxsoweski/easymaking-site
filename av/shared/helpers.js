// Approaching Vividness — interactive helpers
// Custom elements: <av-timer>, <av-speak>, <av-reflect>, <av-video>

// ─── Bell sound (synthesized, no asset needed) ─────────────────────────
function playBell() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ctx.currentTime;
    // Two harmonic tones decay together — soft singing-bowl-ish bell
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
  } catch (e) { /* silent fail — bell is non-essential */ }
}

// ─── <av-timer minutes="2" seconds="0" bell="true"> ─────────────────────
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
      if (running) {
        stop();
        return;
      }
      if (remaining === 0) {
        remaining = totalSec;
        wrap.classList.remove('done');
      }
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

// ─── <av-speak voice="auto">text content</av-speak> ─────────────────────
// Web Speech API placeholder. Falls back gracefully if unsupported.
// Future: load /audio/<lesson>/<id>.mp3 if attribute `audio` is set.
class AVSpeak extends HTMLElement {
  connectedCallback() {
    const text = this.textContent.trim();
    const audioFile = this.getAttribute('audio'); // future: real recording
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

      // If real audio file provided, prefer it
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
      // Pick a calm voice if available
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

// Trigger voices to load (some browsers populate async)
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {};
  window.speechSynthesis.getVoices();
}

// ─── <av-reflect prompt="..." key="lesson1-q1"> ─────────────────────────
class AVReflect extends HTMLElement {
  connectedCallback() {
    const prompt = this.getAttribute('prompt') || 'Reflect…';
    const key = this.getAttribute('key') || `av-reflect-${location.pathname}-${prompt.slice(0,30)}`;
    const stored = localStorage.getItem(key) || '';

    this.innerHTML = `
      <div class="widget av-reflect">
        <div class="widget-label">Reflection · saved on this device</div>
        <div class="prompt">${prompt}</div>
        <textarea placeholder="Write what you noticed…">${stored}</textarea>
        <div class="saved"></div>
      </div>
    `;

    const ta = this.querySelector('textarea');
    const saved = this.querySelector('.saved');
    let timeout = null;
    if (stored) saved.textContent = 'Saved.';

    ta.addEventListener('input', () => {
      clearTimeout(timeout);
      saved.textContent = '…';
      timeout = setTimeout(() => {
        localStorage.setItem(key, ta.value);
        saved.textContent = 'Saved.';
      }, 500);
    });
  }
}

// ─── <av-video id="YouTubeID" start="55" end="172" caption="…"> ─────────
class AVVideo extends HTMLElement {
  connectedCallback() {
    const id = this.getAttribute('id');
    const start = this.getAttribute('start') || '0';
    const end = this.getAttribute('end');
    const caption = this.getAttribute('caption') || '';
    const params = new URLSearchParams({
      start,
      rel: '0',
      modestbranding: '1',
    });
    if (end) params.set('end', end);

    this.innerHTML = `
      <div class="av-video">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${id}?${params}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>
      ${caption ? `<div class="av-video-caption">${caption}</div>` : ''}
    `;
  }
}

customElements.define('av-timer', AVTimer);
customElements.define('av-speak', AVSpeak);
customElements.define('av-reflect', AVReflect);
customElements.define('av-video', AVVideo);
