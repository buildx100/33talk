import { COLS, MAXWINLINES, PAPER_RATIO } from './config.js';
import { Audio } from './audio.js';
import { Machine } from './machine.js';
import * as clock from './clock.js';
import * as kbd from './keyboard.js';
import * as i18n from './i18n.js';
import * as game from './game.js';
import { ask, reset as resetHosts } from './hosts.js';
import { buildPrintout } from './print.js';

/* Boot and wiring only. If logic starts accumulating here, it belongs in
   one of the modules above. */

const root = document.documentElement;

/* ---------- The two machines --------------------------------------- */

const pair = document.getElementById('pair');
// A pans left, B pans right. The motor frequencies are 0.4Hz apart so the
// two hums beat against each other.
const A = Machine('A', -0.6, 60);
const B = Machine('B',  0.6, 60.4);
pair.appendChild(A.el); pair.appendChild(B.el);
const machines = [A, B];
machines.forEach(m => clock.register(m));

/* ---------- Assignment, cheat panel, guess ------------------------- */

const revealBtn = document.getElementById('reveal-btn');
const cheatBtn  = document.getElementById('cheat-btn');

function refreshCheatLabels() {
  const d = i18n.dict();
  machines.forEach((m, i) => {
    m.barLb.textContent = d.hostRx;
    m.barHost.textContent = game.state.guessed ? game.hostIdFor(i) : d.unknown;
  });
}

// One guess per round. Only a reshuffle re-arms it.
function armReveal() {
  revealBtn.disabled = game.state.guessed;
}

function newRound() {
  resetHosts();
  game.shuffle();
  machines.forEach((m, i) => { m.host = game.hostFor(i); });
  armReveal();
  refreshCheatLabels();
}

function toggleCheat(force) {
  const show = (force === undefined) ? !A.bar.classList.contains('show') : force;
  machines.forEach(m => m.bar.classList.toggle('show', show));
  cheatBtn.classList.toggle('on', show);
}

const guessBackdrop = document.getElementById('guess-backdrop');
const guessResult   = document.getElementById('guess-result');
const guessChoices  = document.getElementById('guess-choices');
const guessPrompt   = document.getElementById('guess-prompt');

function openGuess() {
  if (game.state.guessed) return;
  guessResult.classList.remove('show');
  guessChoices.style.display = 'flex';
  guessPrompt.style.display = '';
  guessBackdrop.classList.add('show');
}

function renderVerdict() {
  const d = i18n.dict();
  const v = document.getElementById('guess-verdict');
  v.textContent = game.state.lastRight ? d.verdictRight : d.verdictWrong;
  v.className = game.state.lastRight ? 'right' : 'wrong';
  document.getElementById('guess-actual').textContent =
    d.actual.replace('{a}', game.hostIdFor(0)).replace('{b}', game.hostIdFor(1));
}

function renderScore() {
  document.getElementById('score-ok').textContent  = game.score.ok;
  document.getElementById('score-bad').textContent = game.score.bad;
}

function makeGuess(choice) {
  game.guess(choice);
  renderScore();
  armReveal();
  refreshCheatLabels();
  toggleCheat(true);
  guessChoices.style.display = 'none';
  guessPrompt.style.display = 'none';
  renderVerdict();
  guessResult.classList.add('show');
}

document.querySelectorAll('[data-guess]').forEach(b => {
  b.addEventListener('click', () => makeGuess(+b.dataset.guess));
});
document.getElementById('guess-close').addEventListener('click',
  () => guessBackdrop.classList.remove('show'));
guessBackdrop.addEventListener('click', e => {
  if (e.target === guessBackdrop) guessBackdrop.classList.remove('show');
});

/* ---------- Print -------------------------------------------------- */

const printout = document.getElementById('printout');
function rebuildPrintout() {
  buildPrintout(printout, machines, {
    guessed: game.state.guessed,
    hostIdFor: game.hostIdFor,
    score: game.score
  });
}
window.addEventListener('beforeprint', rebuildPrintout);
document.getElementById('print-btn').addEventListener('click', () => {
  rebuildPrintout();
  window.print();
});

/* ---------- One keyboard, two machines ----------------------------- */

let buffer = '', echo = true, mode = 'cmd';

function updateCheat() {
  const txt = mode === 'password' ? buffer.replace(/./g, '·') : buffer;
  machines.forEach(m => { m.barBuf.textContent = txt; });
}

/* Remote echo: characters do not come from the keyboard, they come back
   from the host. That is what makes the PASSWORD demo possible -- the host
   simply stops echoing and the paper stays blank. */
function fromKeyboard(ch) {
  if (ch === '#') { buffer = buffer.slice(0, -1); if (echo) machines.forEach(m => m.push('char', '#')); }
  else if (ch === '@') { buffer = ''; if (echo) machines.forEach(m => m.push('char', '@')); }
  else { buffer += ch; if (echo) machines.forEach(m => m.push('char', ch)); }
  // # and @ both PRINT. The paper keeps an honest record of the mistake.
  updateCheat(); clock.kick();
}

const HELP = [
  '',
  'TWO MACHINES, ONE KEYBOARD.  EVERY KEY YOU PRESS GOES TO',
  'BOTH COMPUTERS.  BOTH OF THEM PRINT IT BACK.',
  '',
  'WHICH SIDE IS WHICH IS DECIDED AT RANDOM.  THE PAPER ONLY',
  'SAYS A AND B.  THEY START AT THE SAME MOMENT AND RUN AT',
  'THE SAME TEN CHARACTERS PER SECOND, SO SPEED TELLS YOU',
  'NOTHING.  ONLY THE WORDS DO.',
  '',
  'READY'
];

function submit() {
  const line = buffer.trim(); buffer = ''; updateCheat();
  machines.forEach(m => { m.push('cr'); m.push('lf'); });
  clock.kick();

  if (mode === 'password') {
    mode = 'cmd'; echo = true; updateCheat();
    machines.forEach(m => {
      m.pushLine('PASSWORD RECEIVED.  THE PAPER NEVER SAW IT.');
      m.pushLine('READY');
    });
    clock.kick(); return;
  }
  if (line === '') return;

  if (line === 'PASSWORD') {
    machines.forEach(m => m.pushText('PASSWORD: '));
    machines.forEach(m => m.pushFn(() => { mode = 'password'; echo = false; updateCheat(); }));
    clock.kick(); return;
  }
  if (line === 'HELP') { machines.forEach(m => HELP.forEach(s => m.pushLine(s))); clock.kick(); return; }

  // hosts.ask() is the sync gate AND the shared formatter. Nothing else may
  // put a host reply on the paper.
  ask(machines.map(m => m.host), line).then(replies => {
    machines.forEach((m, i) => replies[i].forEach(s => m.pushLine(s)));
    clock.kick();
  });
}

/* ---------- Input -------------------------------------------------- */

// The 64-character set, as a guard on what the keyboard may emit.
const OK = /^[A-Z0-9 !"#$%&'()*+,\-./:;<=>?@[\\\]^_]$/;
const backdrop = document.getElementById('backdrop');

function anyDialogOpen() {
  return backdrop.classList.contains('show') || guessBackdrop.classList.contains('show');
}

// Audio needs a user gesture before a context can be created.
function wake() { Audio.init(); Audio.resume(); }
window.addEventListener('pointerdown', wake);
window.addEventListener('keydown', wake);

let flashT = null;
function flash() {
  machines.forEach(m => m.win.style.filter = 'brightness(.85)');
  clearTimeout(flashT);
  flashT = setTimeout(() => machines.forEach(m => m.win.style.filter = ''), 90);
}

window.addEventListener('keydown', function (e) {
  if (anyDialogOpen()) {
    if (e.key === 'Escape') {
      backdrop.classList.remove('show');
      guessBackdrop.classList.remove('show');
    }
    return;
  }
  // Any modifier passes straight through, so Ctrl+P still opens the browser
  // print dialog.
  if (e.metaKey || e.altKey || e.ctrlKey) return;
  if (e.key === 'Enter') { e.preventDefault(); kbd.press('\n'); Audio.keyclick(); submit(); return; }
  // There is no backspace key on this machine. The window flinches and
  // nothing else happens.
  if (e.key === 'Backspace') { e.preventDefault(); kbd.press('\b'); Audio.keyclick(); flash(); return; }
  if (e.key.length !== 1) return;
  const ch = e.key.toUpperCase();
  if (!OK.test(ch)) return;
  e.preventDefault();
  kbd.press(kbd.SHIFTED[e.key] ? e.key : ch);
  Audio.keyclick();
  fromKeyboard(ch);
});

/* ---------- Controls ----------------------------------------------- */

document.querySelectorAll('[data-cps]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-cps]').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    clock.setCps(+b.dataset.cps);
  });
});

document.querySelectorAll('[data-lang]').forEach(b => {
  b.addEventListener('click', () => i18n.apply(b.dataset.lang, true));
});

const sndBtn   = document.getElementById('snd-btn');
const motorBtn = document.getElementById('motor-btn');
const bellBtn  = document.getElementById('bell-btn');
const volEl    = document.getElementById('vol');

function syncSoundUI() {
  const on = sndBtn.classList.contains('on');
  [motorBtn, bellBtn].forEach(b => { b.disabled = !on; });
  volEl.disabled = !on;
  volEl.style.opacity = on ? 1 : .34;
}
sndBtn.addEventListener('click', function () {
  const v = !this.classList.contains('on');
  this.classList.toggle('on', v); Audio.setOn(v); syncSoundUI();
});
motorBtn.addEventListener('click', function () {
  if (this.disabled) return;
  const v = !this.classList.contains('on');
  this.classList.toggle('on', v); Audio.setMotor(v);
});
bellBtn.addEventListener('click', function () {
  if (this.disabled) return;
  const v = !this.classList.contains('on');
  this.classList.toggle('on', v); Audio.setBell(v);
});
volEl.addEventListener('input', function () { Audio.setVol(this.value / 100); });

cheatBtn.addEventListener('click', () => toggleCheat());
revealBtn.addEventListener('click', openGuess);

function freshPaper() {
  machines.forEach(m => { m.reset(); m.pushLine('READY'); });
  buffer = ''; echo = true; mode = 'cmd';
  updateCheat(); clock.kick();
}

document.getElementById('shuffle-btn').addEventListener('click', () => {
  newRound();
  freshPaper();
});
// Tearing off gives you new paper, NOT a new bet. It must not reshuffle.
document.getElementById('tear-btn').addEventListener('click', freshPaper);

document.getElementById('help-btn').addEventListener('click',
  () => backdrop.classList.add('show'));
document.getElementById('modal-close').addEventListener('click',
  () => backdrop.classList.remove('show'));
backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('show'); });

/* ---------- Sizing -------------------------------------------------- */

const probe = document.createElement('canvas').getContext('2d');
function fit() {
  const deckW = document.getElementById('deck').offsetWidth;
  const avail = document.getElementById('app').clientWidth - 40;
  const paperW = Math.floor(Math.min(deckW * PAPER_RATIO, (avail - 14) / 2));
  machines.forEach(m => m.el.style.width = paperW + 'px');

  // Measure the actual advance width rather than assuming one, then pick the
  // font size that makes 72 columns fill the paper exactly.
  probe.font = "100px 'Courier New', Courier, monospace";
  const ratio = probe.measureText('0').width / 100;
  const fs = Math.max(8, Math.floor((paperW - 28) / (COLS * ratio) * 100) / 100);
  const lh = Math.round(fs * 1.5);
  root.style.setProperty('--pfs', fs + 'px');
  root.style.setProperty('--lh',  lh + 'px');

  const bottomH = document.getElementById('bottom').offsetHeight;
  const availH = window.innerHeight - bottomH - 24 - 14 - 26 - 10;
  root.style.setProperty('--winlines',
    Math.max(4, Math.min(MAXWINLINES, Math.floor(availH / lh))));
  machines.forEach(m => m.measure());
}

/* ---------- Boot ---------------------------------------------------- */

kbd.build(document.getElementById('kb'));

i18n.onChange(() => {
  refreshCheatLabels();
  if (game.state.guessed) renderVerdict();
});

machines.forEach(m => { m.newLine(true); m.updateHead(); });
newRound();
renderScore();
i18n.apply(i18n.detect(), false);
syncSoundUI();
fit();
window.addEventListener('resize', fit);
updateCheat();
machines.forEach(m => m.pushLine('MODEL 33 ASR READY.  TYPE SOMETHING.'));
clock.kick();
