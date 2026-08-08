import test from 'node:test';
import assert from 'node:assert/strict';
import { ask } from '../web/js/hosts.js';
import { PROMPT } from '../web/js/format.js';

/* The sync gate and the failure path. Both exist for the same reason: the
   two machines must be indistinguishable by anything other than the words
   they print. */

const fast = { id: 'FAST', respond: () => 'I SEE' };
const slow = { id: 'SLOW', respond: () => new Promise(r => setTimeout(() => r('LET ME THINK'), 60)) };
const broken = { id: 'BROKEN', respond: () => { throw new Error('rate limited'); } };
const brokenAsync = { id: 'BROKEN', respond: () => Promise.reject(new Error('HTTP 429')) };

test('both replies are released together, not as they arrive', async () => {
  const [a, b] = await ask([fast, slow], 'HELLO');
  assert.deepEqual(a, ['', 'I SEE', PROMPT]);
  assert.deepEqual(b, ['', 'LET ME THINK', PROMPT]);
});

test('one host failing makes BOTH print the failure', async () => {
  // ELIZA runs in the browser and cannot fail; the LLM crosses a network
  // and can be rate-limited or time out. A round where exactly one machine
  // apologises names the LLM outright, however carefully the wording is
  // matched -- the tell is which roll it appears on.
  for (const bad of [broken, brokenAsync]) {
    const [a, b] = await ask([fast, bad], 'HELLO');
    assert.deepEqual(a, b, 'a working host must not answer while the other fails');
    assert.match(a.join(' '), /DROPPED/);
  }
});

test('the failure is symmetric whichever side breaks', async () => {
  const [a1, b1] = await ask([broken, fast], 'HELLO');
  const [a2, b2] = await ask([fast, broken], 'HELLO');
  assert.deepEqual(a1, b1);
  assert.deepEqual(a2, b2);
  assert.deepEqual(a1, a2, 'the paper must look the same no matter which host broke');
});

test('all hosts failing still produces a normal-shaped reply', async () => {
  const [a, b] = await ask([broken, brokenAsync], 'HELLO');
  assert.deepEqual(a, b);
  assert.equal(a[0], '');
  assert.equal(a[a.length - 1], PROMPT);
});
