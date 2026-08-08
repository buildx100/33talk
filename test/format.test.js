import test from 'node:test';
import assert from 'node:assert/strict';
import { downgrade, houseStyle, wrap, toPaper, PROMPT } from '../web/js/format.js';
import { COLS, MAX_REPLY_LINES, MAX_REPLY_WORDS } from '../web/js/config.js';

/* format.js is the only thing standing between a chatty 2026 model and a
   1966 type drum, and the only thing guaranteeing that the two hosts are
   shaped identically. It is pure, so it is the one part of this project
   worth testing. */

test('downgrade: uppercases', () => {
  assert.equal(downgrade('hello world'), 'HELLO WORLD');
});

test('downgrade: folds the glyphs a small model actually emits', () => {
  assert.equal(downgrade('it’s'), "IT'S");
  assert.equal(downgrade('“quoted”'), '"QUOTED"');
  assert.equal(downgrade('a — b'), 'A - B');
  assert.equal(downgrade('wait…'), 'WAIT...');
  assert.equal(downgrade('a b'), 'A B');
  assert.equal(downgrade('• item'), '* ITEM');   // the drum has an asterisk
  assert.equal(downgrade('a\tb'), 'A B');
});

test('downgrade: drops everything off the type drum', () => {
  // Emoji, CJK, and the backtick/brace end of ASCII are physically absent.
  assert.equal(downgrade('OK \u{1F600}'), 'OK ');
  assert.equal(downgrade('中文'), '');
  assert.equal(downgrade('a`b{c}d|e~f'), 'ABCDEF');
});

test('downgrade: keeps the whole 0x20-0x5F set', () => {
  let all = '';
  for (let c = 0x20; c <= 0x5F; c++) all += String.fromCharCode(c);
  assert.equal(downgrade(all), all);
  assert.equal(all.length, 64);
});

test('downgrade: survives null and undefined', () => {
  assert.equal(downgrade(null), '');
  assert.equal(downgrade(undefined), '');
});

test('wrap: never exceeds the column count', () => {
  const text = 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG. '.repeat(8);
  for (const line of wrap(text)) assert.ok(line.length <= COLS, line);
});

test('wrap: breaks between words, not inside them', () => {
  assert.deepEqual(wrap('AAA BBB CCC', 7), ['AAA BBB', 'CCC']);
});

test('wrap: preserves the double space after a full stop', () => {
  assert.deepEqual(wrap('SAY.  LET ME', 40), ['SAY.  LET ME']);
});

test('wrap: a line never starts with whitespace', () => {
  // After a carriage return the head is already home.
  for (const line of wrap('AAAA BBBB CCCC DDDD', 9)) {
    assert.ok(!/^\s/.test(line), JSON.stringify(line));
  }
});

test('wrap: a word longer than the line is broken, not lost', () => {
  const long = 'X'.repeat(100);
  const lines = wrap(long, 30);
  assert.equal(lines.join(''), long);
  for (const l of lines) assert.ok(l.length <= 30);
});

test('wrap: empty input still yields one line', () => {
  assert.deepEqual(wrap(''), ['']);
});

/* ---- blind-test integrity ------------------------------------------- */

test('toPaper: leading blank line and trailing prompt are the formatter\'s', () => {
  const out = toPaper('HELLO');
  assert.equal(out[0], '');
  assert.equal(out[out.length - 1], PROMPT);
  assert.deepEqual(out, ['', 'HELLO', PROMPT]);
});

test('toPaper: two hosts saying the same thing differently come out identical', () => {
  // ELIZA-shaped: terse and already uppercase.
  const a = toPaper('I SEE.');
  // LLM-shaped: lowercase, padded, curly punctuation, trailing newline.
  const b = toPaper('\n\n  i see.  \n\n');
  assert.deepEqual(a, b);
});

test('toPaper: vertical padding cannot be used as a signature', () => {
  assert.deepEqual(toPaper('A\n\n\n\n\nB'), ['', 'A', '', 'B', PROMPT]);
});

test('toPaper: an empty reply still looks like a reply', () => {
  assert.deepEqual(toPaper(''), ['', '?', PROMPT]);
  assert.deepEqual(toPaper('   \n  '), ['', '?', PROMPT]);
  // A reply that is entirely unprintable is the same case.
  assert.deepEqual(toPaper('\u{1F600}\u{1F600}'), ['', '?', PROMPT]);
});

test('toPaper: markdown does not survive as layout', () => {
  // The hash goes: the 1966 script never prints one, and on this machine a
  // printed # is doubly confusing, because typing one erases a character.
  // The dash stays -- ELIZA uses it five times.
  const out = toPaper('# Heading\n\n- one\n- two');
  assert.deepEqual(out, ['', 'HEADING', '', '- ONE', '- TWO', PROMPT]);
});

test('toPaper: no line is ever wider than the paper', () => {
  const rant = 'the model has a lot to say about this topic, at length. '.repeat(20);
  for (const line of toPaper(rant)) assert.ok(line.length <= COLS, line);
});

test('toPaper: every line is printable on the type drum', () => {
  const out = toPaper('Curly “quotes”, an em—dash, emoji \u{1F600}, and 日本語.');
  for (const line of out) assert.ok(/^[ -_]*$/.test(line), JSON.stringify(line));
});

test('one reply cannot use more paper than another, whichever host sent it', () => {
  const essay = 'the model has a great deal to say about this. '.repeat(40);
  assert.ok(toPaper(essay).length <= MAX_REPLY_LINES + 2, 'blank line + body + prompt');
  // The ceiling applies to both hosts. ELIZA simply never reaches it.
  assert.deepEqual(toPaper('IN WHAT WAY'), ['', 'IN WHAT WAY', PROMPT]);
});

test('no reply ends in punctuation, whichever host sent it', () => {
  // ELIZA never does; the model almost always does. One character is enough
  // to win the blind test without reading a word.
  for (const raw of ['What do you mean by that?', 'I hear you.', 'Go on!',
                     'Tell me more...', 'Yes, and?']) {
    const body = toPaper(raw).slice(1, -1);
    for (const line of body) assert.doesNotMatch(line, /[.?!,;:]$/, line);
  }
});

test('the apostrophe survives: two 1966 replies legitimately end in one', () => {
  assert.deepEqual(toPaper("WHY DO YOU SAY 'AM'"), ['', "WHY DO YOU SAY 'AM'", PROMPT]);
});

test('a reply is not cut to one sentence', () => {
  // ELIZA's answer to HELLO contains a full stop. A first-sentence rule
  // would silently rewrite the 1966 script.
  assert.deepEqual(toPaper('HOW DO YOU DO. PLEASE STATE YOUR PROBLEM'),
                   ['', 'HOW DO YOU DO. PLEASE STATE YOUR PROBLEM', PROMPT]);
});

test('markdown emphasis is a signature, so the wrappers come off', () => {
  // * and _ are both on the type drum. The 1966 script never emits either;
  // a modern model reaches for *this* constantly.
  assert.equal(houseStyle(downgrade('what do you think of *men being alike*')),
               'WHAT DO YOU THINK OF MEN BEING ALIKE');
  assert.equal(houseStyle(downgrade('that is **very** important')), 'THAT IS VERY IMPORTANT');
  assert.equal(houseStyle(downgrade('a _quiet_ thought')), 'A QUIET THOUGHT');
  // The drum carries an asterisk and the keyboard can type one. It is only
  // the hosts that may not print it, because the 1966 script never does.
  assert.equal(downgrade('press * to continue'), 'PRESS * TO CONTINUE');
  assert.equal(houseStyle('PRESS * TO CONTINUE'), 'PRESS  TO CONTINUE');
});

test('a trimmed reply is never half a sentence', () => {
  const long = 'WHAT DO YOU THINK IS IMPORTANT TO YOU RIGHT NOW, WHETHER IT IS ABOUT ' +
               'EMOTIONS OR EXPERIENCES, WHEN SOMEONE ELSE IS MAKING YOU FEEL THAT WAY';
  const body = toPaper(long).slice(1, -1).join(' ');
  assert.ok(body.split(/\s+/).length <= MAX_REPLY_WORDS);
  assert.ok(long.startsWith(body), 'must be a prefix of what the host said');
  // The LAST clean break that fits, not the first: spend as much of the
  // budget as possible, but never end mid-clause.
  assert.equal(body,
    'WHAT DO YOU THINK IS IMPORTANT TO YOU RIGHT NOW, WHETHER IT IS ABOUT EMOTIONS OR EXPERIENCES');
});

test('an em dash is punctuation, so it can be trimmed at', () => {
  assert.equal(downgrade('now—whether'), 'NOW - WHETHER');
  // A real hyphen is part of the word and must not be split.
  assert.equal(downgrade('self‑esteem'), 'SELF-ESTEEM');
});

test('the word budget never touches ELIZA', () => {
  // 20 is one more than the longest reply ELIZA was measured producing.
  const longest = "WHAT MAKES YOU THINK I AM NOT VERY AGGRESSIVE BUT YOU THINK I DON'T " +
                  'WANT YOU TO NOTICE THAT';
  assert.equal(longest.split(/\s+/).length, 19);
  assert.deepEqual(toPaper(longest).slice(1, -1).join(' '), longest);
});

test('hosts print only the punctuation the 1966 script prints', () => {
  // Measured across all 199 reassembly templates: ' , - . and nothing else.
  const ELIZA_PUNCTUATION = new Set(["'", ',', '-', '.']);
  const noisy = 'He said: "I\'m tired"; why? Wow! (really) 50% ~ [ok]';
  for (const line of toPaper(noisy).slice(1, -1)) {
    for (const ch of line) {
      if (/[A-Z0-9 ]/.test(ch)) continue;
      assert.ok(ELIZA_PUNCTUATION.has(ch), `host printed ${JSON.stringify(ch)} in ${line}`);
    }
  }
});

test('a quoted phrase keeps its quotes, the 1966 way', () => {
  // ELIZA quotes too: WHY DO YOU SAY 'AM' / ARE YOU SAYING 'NO'.
  assert.deepEqual(toPaper('WHAT DID YOU MEAN BY "I AM TIRED"'),
                   ['', "WHAT DID YOU MEAN BY 'I AM TIRED'", PROMPT]);
});
