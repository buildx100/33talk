import { HOSTS } from './hosts.js';
import { STORAGE_SCORE } from './config.js';
import * as storage from './storage.js';

/* Assignment, guessing, score. No DOM: main.js does the rendering. */

export const state = {
  assign: [0, 1],       // assign[machineIndex] -> index into HOSTS
  guessed: false,       // one guess per round
  lastRight: false
};

export const score = loadScore();

function loadScore() {
  try {
    const o = JSON.parse(storage.get(STORAGE_SCORE) || 'null');
    if (o && typeof o.ok === 'number' && typeof o.bad === 'number') return o;
  } catch (e) { /* corrupt or unreadable: start fresh */ }
  return { ok: 0, bad: 0 };
}

/* New round. Re-arms the guess, which is why TEAR OFF must NOT call this:
   tearing gives you fresh paper, not a fresh bet. */
export function shuffle() {
  state.assign = Math.random() < 0.5 ? [0, 1] : [1, 0];
  state.guessed = false;
  state.lastRight = false;
  return state.assign;
}

export function hostFor(machineIndex) {
  return HOSTS[state.assign[machineIndex]];
}

export function hostIdFor(machineIndex) {
  return HOSTS[state.assign[machineIndex]].id;
}

/* One guess per round. The caller disables REVEAL on the way out; only
   shuffle() re-enables it. Otherwise you could click until you were right. */
export function guess(choice) {
  if (state.guessed) return state.lastRight;
  state.lastRight = (choice === state.assign[0]);
  score[state.lastRight ? 'ok' : 'bad']++;
  storage.set(STORAGE_SCORE, JSON.stringify(score));
  state.guessed = true;
  return state.lastRight;
}
