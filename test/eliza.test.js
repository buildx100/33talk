import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SCRIPT, DOCTOR, parseScript } from '../web/js/eliza-rules.js';
import { createDoctor } from '../web/js/eliza.js';

const archive = readFileSync(
  fileURLToPath(new URL('../docs/eliza-original/DOCTOR-1966-CACM.txt', import.meta.url)),
  'utf8'
);

/* ---- fidelity ------------------------------------------------------ *
   This is the test the whole design exists for. The script is not
   transcribed into JS, it is embedded verbatim, so "are the rules faithful"
   stops being a question of proofreading and becomes a byte comparison. */

test('the embedded script is byte-identical to the archived original', () => {
  // The only difference permitted is the newline that opens the template
  // literal, which is punctuation of the JS file, not of the script.
  assert.equal(SCRIPT.replace(/^\n/, ''), archive);
});

test('the 1966 typo is preserved', () => {
  // Printed exactly this way in the CACM appendix. Correcting it would mean
  // the file no longer reproduces the paper it claims to.
  assert.match(SCRIPT, /PLEASE DON'T APOLIGIZE/);
  assert.doesNotMatch(SCRIPT, /PLEASE DON'T APOLOGIZE/);
});

/* ---- the parts most reimplementations drop ------------------------- */

test('keywords carry rank, and rank is not uniform', () => {
  assert.equal(DOCTOR.keywords.get('COMPUTER').rank, 50);
  assert.equal(DOCTOR.keywords.get('NAME').rank, 15);
  assert.equal(DOCTOR.keywords.get('ALIKE').rank, 10);
  assert.equal(DOCTOR.keywords.get('WAS').rank, 2);
  assert.equal(DOCTOR.keywords.get('SORRY').rank, 0);
});

test('rank decides, not word order', () => {
  const d = createDoctor();
  // WAS is rank 2, COMPUTER is rank 50. COMPUTER wins although it is last.
  const reply = d.respond('I was wondering about your computer');
  assert.match(reply, /COMPUTER|MACHINE/);
});

test('equivalence reaches another keyword rules, keeping its own rank', () => {
  const machine = DOCTOR.keywords.get('MACHINE');
  assert.equal(machine.equiv, 'COMPUTER');
  assert.equal(machine.rank, 50);
  assert.equal(machine.rules.length, 0);
});

test('substitutions rewrite the text before any rule sees it', () => {
  assert.equal(DOCTOR.substitutions.get('I'), 'YOU');
  assert.equal(DOCTOR.substitutions.get('MY'), 'YOUR');
  assert.equal(DOCTOR.substitutions.get('DONT'), "DON'T");
  const d = createDoctor();
  assert.match(d.respond('you dont argue with me'), /DON'T ARGUE WITH YOU/);
});

test('reassemblies cycle, they do not repeat and are not random', () => {
  const d = createDoctor();
  const seen = [];
  for (let i = 0; i < 4; i++) seen.push(d.respond('I am sorry'));
  assert.equal(new Set(seen).size, 4, 'four SORRY replies should all differ: ' + seen);
  // The fifth wraps back to the first: a pointer, not a shuffle.
  assert.equal(d.respond('I am sorry'), seen[0]);
});

test('cycling is deterministic across instances', () => {
  // No Math.random anywhere in the engine: the same inputs give the same
  // conversation. That is what the original did.
  const a = createDoctor(), b = createDoctor();
  for (const line of ['hello', 'I am sad', 'my mother', 'why not']) {
    assert.equal(a.respond(line), b.respond(line));
  }
});

test('MEMORY stores MY-statements and resurfaces them when nothing matches', () => {
  const d = createDoctor();
  d.respond('my boyfriend made me come here');
  // No keyword in this at all -- without memory it would fall to NONE.
  const reply = d.respond('bullfrogs and telephone poles');
  assert.match(reply, /BOYFRIEND/);
  assert.doesNotMatch(reply, /I AM NOT SURE I UNDERSTAND YOU FULLY/);
});

test('with nothing remembered, an unmatched input falls to NONE', () => {
  const d = createDoctor();
  const none = DOCTOR.none.rules[0].reassemblies.map(r => r.text.join(' '));
  assert.ok(none.includes(d.respond('bullfrogs and telephone poles')));
});

test('tags let a rule match a class of words, not a list', () => {
  assert.deepEqual(DOCTOR.tags.get('MOTHER'), ['NOUN', 'FAMILY']);
  assert.deepEqual(DOCTOR.tags.get('SISTER'), ['FAMILY']);
  const d = createDoctor();
  // /FAMILY is matched via the tag, and MOTHER is never named in the rule.
  assert.match(d.respond('perhaps I could get along with my mother'), /FAMILY/);
});

test('reset clears both the cycling pointers and the memory', () => {
  const d = createDoctor();
  const first = d.respond('I am sorry');
  d.respond('my boyfriend made me come here');
  d.reset();
  assert.equal(d.respond('I am sorry'), first, 'pointers should be back to the start');
  assert.doesNotMatch(d.respond('bullfrogs and telephone poles'), /BOYFRIEND/);
});

/* ---- the published transcript -------------------------------------- */

test('reproduces the conversation printed in the 1966 paper', () => {
  // Weizenbaum's own example, CACM January 1966, page 36-37.
  const d = createDoctor();
  const exchanges = [
    ['Men are all alike.',                              'IN WHAT WAY'],
    ["They're always bugging us about something or other.",
                                                        'CAN YOU THINK OF A SPECIFIC EXAMPLE'],
    ['Well, my boyfriend made me come here.',           'YOUR BOYFRIEND MADE YOU COME HERE'],
    ["He says I'm depressed much of the time.",         'I AM SORRY TO HEAR YOU ARE DEPRESSED'],
    ["It's true. I am unhappy.",   'DO YOU THINK COMING HERE WILL HELP YOU NOT TO BE UNHAPPY'],
    ['I need some help, that much seems certain.',
                                   'WHAT WOULD IT MEAN TO YOU IF YOU GOT SOME HELP'],
    ['Perhaps I could learn to get along with my mother.',
                                                        'TELL ME MORE ABOUT YOUR FAMILY'],
    ['My mother takes care of me.',       'WHO ELSE IN YOUR FAMILY TAKES CARE OF YOU'],
    ['My father.',                                      'YOUR FATHER'],
    ['You are like my father in some ways.',            'WHAT RESEMBLANCE DO YOU SEE']
  ];
  for (const [said, expected] of exchanges) {
    assert.equal(d.respond(said), expected, 'input: ' + said);
  }
});

/* ---- robustness ---------------------------------------------------- */

test('survives the input a blind test will actually throw at it', () => {
  const d = createDoctor();
  for (const junk of ['', '   ', '...', '!!!', '@#$%^&', '1234567890',
                      'A'.repeat(500), 'why '.repeat(200), '\n\n\t']) {
    assert.equal(typeof d.respond(junk), 'string');
  }
});

test('the script parses to the same thing every time', () => {
  const a = parseScript(SCRIPT), b = parseScript(SCRIPT);
  assert.equal(a.keywords.size, b.keywords.size);
  assert.equal(a.greeting, b.greeting);
});
