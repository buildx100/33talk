/* THE metronome. One timer steps every registered machine.
   This lives in its own file on purpose: it is one of the four things that
   hold the blind test together (see the README). Two machines driven by two
   timers can drift apart, and drift is a tell. There is exactly one timer
   here and no way to ask for a second. */

let cps = 10;          // characters per second
let ms = 100;          // milliseconds per character
let ticking = false;

const machines = [];

export function register(machine) {
  machines.push(machine);
}

// Machines read this per action rather than capturing it, so a speed change
// takes effect on the next character instead of the next line.
export function charMs() { return ms; }
export function currentCps() { return cps; }

export function setCps(value) {
  cps = value;
  ms = 1000 / value;
}

export function kick() {
  if (ticking) return;
  ticking = true;
  setTimeout(tick, 0);
}

function tick() {
  machines.forEach(m => m.step());
  if (machines.some(m => m.busy())) setTimeout(tick, ms);
  else ticking = false;
}
