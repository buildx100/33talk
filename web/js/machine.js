import { COLS, BELL_COL, MAXLINES, INK_MIN, INK_RANGE, JITTER_X, JITTER_Y } from './config.js';
import { charMs } from './clock.js';
import { Audio } from './audio.js';

/* One Model 33.

   The paper grows UP from the platen and the print position is fixed at the
   bottom line -- that bottom line IS the platen. Nothing here scrolls: the
   roll is translated down by one line height and animated back to zero, so
   the new line appears to be pulled through the machine. */
export function Machine(tag, pan, motorHz) {
  const el = document.createElement('div');
  el.className = 'machine';
  el.innerHTML =
    '<div class="cheatbar"><span class="lb"></span>' +
      '<span class="buf"></span><span class="hostid"></span></div>' +
    '<div class="tearbar"></div>' +
    '<div class="pwin"><div class="roll"><div class="paper"></div></div><div class="head"></div></div>' +
    '<div class="platen"><div class="knurl"></div><span class="tag">TERMINAL ' + tag + '</span>' +
    '<span class="col">COL 00</span><span class="lamp"></span></div>';

  const m = {
    el, tag,
    win:  el.querySelector('.pwin'),
    roll: el.querySelector('.roll'),
    paper: el.querySelector('.paper'),
    head: el.querySelector('.head'),
    colEl: el.querySelector('.col'),
    lamp: el.querySelector('.lamp'),
    knurl: el.querySelector('.knurl'),
    bar:     el.querySelector('.cheatbar'),
    barLb:   el.querySelector('.cheatbar .lb'),
    barBuf:  el.querySelector('.cheatbar .buf'),
    barHost: el.querySelector('.cheatbar .hostid'),
    voice: Audio.makeVoice(pan, motorHz),
    host: null,
    lines: [], curLine: null, curEl: null,
    carriage: 0, lineH: 21, knurlPos: 0,
    q: [], wait: 0
  };

  m.newLine = function (first) {
    m.curLine = new Array(COLS).fill('');
    m.lines.push(m.curLine);
    m.curEl = document.createElement('div');
    m.curEl.className = 'line';
    m.paper.appendChild(m.curEl);
    if (m.lines.length > MAXLINES) { m.lines.shift(); m.paper.removeChild(m.paper.firstChild); }
    if (!first) {
      // FLIP: jump the roll down a line with no transition, then animate it
      // back to rest. The eye reads that as paper being fed through.
      m.roll.style.transition = 'none';
      m.roll.style.transform = 'translateY(' + m.lineH + 'px)';
      void m.roll.offsetHeight;
      m.roll.style.transition = 'transform ' + Math.min(charMs() * 0.85, 100) + 'ms cubic-bezier(.4,.75,.35,1)';
      m.roll.style.transform = 'translateY(0)';
      m.knurlPos = (m.knurlPos + 3) % 5;
      m.knurl.style.backgroundPosition = m.knurlPos + 'px 0';
    }
  };

  // Each cell can hold several overstruck characters, which is what the real
  // machine does when you keep printing past the end of the line.
  // Two things vary from strike to strike: how much ink the worn ribbon
  // leaves, and the small amount of play in the mechanism.
  m.renderCell = function (i) {
    for (let k = m.curEl.children.length; k <= i; k++) {
      const s = document.createElement('span');
      s.className = 'cell'; s.style.left = k + 'ch';
      m.curEl.appendChild(s);
    }
    const cell = m.curEl.children[i]; cell.textContent = '';
    for (const c of m.curLine[i]) {
      const g = document.createElement('span');
      g.textContent = c; g.style.position = 'absolute'; g.style.left = '0';
      g.style.opacity = (INK_MIN + Math.random() * INK_RANGE).toFixed(2);
      g.style.transform = 'translate(' + (Math.random() * JITTER_X * 2 - JITTER_X).toFixed(2) + 'px,'
                                       + (Math.random() * JITTER_Y * 2 - JITTER_Y).toFixed(2) + 'px)';
      cell.appendChild(g);
    }
  };

  m.stamp = function (ch) {
    // Not an off-by-one: there is no auto-wrap. Once the carriage is at the
    // last column it stays there and every further character strikes on top
    // of the last one. Wrapping is the HOST's job, not the machine's.
    if (m.carriage >= COLS) m.carriage = COLS - 1;
    m.curLine[m.carriage] += ch;
    m.renderCell(m.carriage);
    m.voice.strike(ch === ' ');
    m.carriage++;
    if (m.carriage === BELL_COL) m.ding();
    m.updateHead();
  };

  m.updateHead = function () {
    m.head.style.left = 'calc(14px + ' + m.carriage + 'ch)';
    m.colEl.textContent = 'COL ' + String(m.carriage).padStart(2, '0');
  };

  m.ding = function () {
    // The lamp stands in for the bell, so it must not ring when the bell is
    // muted -- otherwise muting the sound leaves a visual tell behind.
    if (Audio.bellAudible()) {
      m.lamp.classList.add('on');
      setTimeout(() => m.lamp.classList.remove('on'), 140);
    }
    m.voice.bell();
  };

  m.push     = function (type, ch) { m.q.push({ type, ch }); };
  m.pushFn   = function (fn) { m.q.push({ type: 'fn', fn }); };
  m.pushText = function (s) { for (const c of s) m.push('char', c); };
  m.pushLine = function (s) { m.pushText(s); m.push('cr'); m.push('lf'); };

  m.step = function () {
    if (m.wait > 0) { m.wait--; return; }
    const a = m.q.shift();
    if (!a) return;
    if (a.type === 'char') { m.stamp(a.ch); }
    else if (a.type === 'cr') {
      // A carriage return takes real time, proportional to how far the head
      // has to travel. This is why real hosts padded with NULs after CR: the
      // head was still moving and anything sent meanwhile was lost.
      const ms = charMs() + Math.min(m.carriage, COLS) * charMs() * 0.06;
      m.head.style.setProperty('--crtime', ms + 'ms');
      m.head.classList.add('returning');
      m.voice.carriage(ms);
      m.carriage = 0; m.updateHead();
      setTimeout(() => m.head.classList.remove('returning'), ms);
      m.wait = Math.max(0, Math.round(ms / charMs()) - 1);
    }
    // CR and LF are two separate mechanical actions, which is why they are
    // two separate characters, and why Windows still writes both.
    else if (a.type === 'lf') { m.newLine(false); m.voice.feed(); }
    else if (a.type === 'bel') { m.ding(); }
    else if (a.type === 'fn') { a.fn(); return m.step(); }
  };

  m.busy = function () { return m.q.length > 0 || m.wait > 0; };

  m.reset = function () {
    m.q.length = 0; m.wait = 0;
    m.paper.innerHTML = '';
    m.roll.style.transition = 'none'; m.roll.style.transform = 'translateY(0)';
    m.lines = []; m.carriage = 0;
    m.newLine(true); m.updateHead();
  };

  m.measure = function () {
    const fs = parseFloat(getComputedStyle(m.win).fontSize) || 14;
    m.lineH = Math.round(fs * 1.5);
  };

  return m;
}
