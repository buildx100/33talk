import { toPaper } from './format.js';
import { eliza } from './eliza.js';
import { llm } from './llm.js';

/* The registry and the sync gate.

   Index 0 is always ELIZA and index 1 is always the LLM. Which MACHINE gets
   which is game.js's business, not this file's. */
export const HOSTS = [eliza, llm];

/* A new round is a new conversation. ELIZA carries reassembly pointers and
   a memory stack between turns, so without this the second round would
   start mid-thought -- and, worse, would answer differently from the first
   for reasons the player cannot see.

   Called by RESHUFFLE only. TEAR OFF gives you fresh paper, not a fresh
   patient. */
export function reset(hosts = HOSTS) {
  hosts.forEach(h => h.reset && h.reset());
}

/* Same words on both sides when something goes wrong. A host identifiable by
   its excuse is as much of a leak as one identifiable by its latency. */
const HOST_ERROR = 'THE LINE TO THE COMPUTER DROPPED.  TRY AGAIN.';
const TIMEOUT_MS = 30000;

function settle(promise) {
  return new Promise(resolve => {
    let done = false;
    const finish = value => { if (!done) { done = true; resolve(value); } };
    setTimeout(() => finish(HOST_ERROR), TIMEOUT_MS);
    Promise.resolve(promise).then(finish, () => finish(HOST_ERROR));
  });
}

/* THE sync gate.

   Both replies are resolved before EITHER is queued, so both machines start
   printing on the same frame. ELIZA answers in 0ms and the LLM in 1-3
   seconds; without this, response time alone gives it away instantly.

   This is also the only path from a host to the paper, which is what keeps
   the README's blind-test promise honest: every reply goes through
   toPaper, and no host formats its own output. */
export function ask(hosts, line) {
  return Promise
    .all(hosts.map(h => settle(Promise.resolve().then(() => h.respond(line)))))
    .then(texts => texts.map(text => toPaper(text)));
}
