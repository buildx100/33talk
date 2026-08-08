/* THE shared post-processor.

   Every host reply passes through here and nowhere else. Neither host
   formats its own output -- see the README. Content is allowed to
   differ between the two machines; SHAPE is not. Same prompt, same wrapping,
   same blank lines, same handling of empty and garbage input.

   The filter has to be code, not a system prompt. A small model will emit
   lowercase, Markdown, emoji, curly quotes and em dashes no matter what you
   ask it, and the machine physically cannot print any of that.

   This file is pure: no DOM, and nothing imported but COLS. That is what
   makes it testable, and the tests are the only guard against the blind test
   quietly springing a leak. */

import { COLS, MAX_REPLY_LINES, MAX_REPLY_WORDS } from './config.js';

export const PROMPT = 'READY';

/* Glyphs with an obvious ASCII ancestor are folded onto it. Everything else
   is dropped rather than transliterated: a missing character is honest, a
   wrong one is not.

   Written with \u escapes on purpose -- a literal curly quote or a literal
   non-breaking space inside a character class is invisible in a diff. */
const SUBSTITUTIONS = [
  [/[\u2018\u2019\u201A\u201B\u2032]/g, "'"],                       // curly single quotes, prime
  [/[\u201C\u201D\u201E\u201F\u2033]/g, '"'],                       // curly double quotes
  [/[\u2010\u2011]/g, '-'],                                         // true hyphens: self-esteem
  // En and em dashes are PUNCTUATION, not hyphens, so they are spaced
  // out. 1966 wrote them that way -- NAMES - PLEASE CONTINUE -- and it
  // also keeps them as their own word, which is what lets trimToBudget
  // see them as a clause break instead of welding NOW-WHETHER together.
  [/\s*[\u2012\u2013\u2014\u2015\u2212]\s*/g, ' - '],                            // en/em dash, minus
  [/\u2026/g, '...'],                                                // ellipsis
  [/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' '],                // exotic spaces
  [/[\u2022\u00B7\u25CF]/g, '*'],                                    // bullets
  [/\t/g, ' ']
];

/* The 1966 script's ENTIRE punctuation vocabulary, measured across all 199
   reassembly templates, is four characters:

       '  x34     ,  x13     -  x5      .  x1

   No double quote. No question mark -- not one, anywhere in the script.
   A 2026 model reaches for all of them, so every one it uses that ELIZA
   cannot is a character that appears on exactly one roll. That is the
   definition of a tell.

   So host replies are folded into that vocabulary. Where there is an
   obvious equivalent it is used rather than dropped, because ELIZA quotes
   too -- it just quotes the 1966 way:

       WHY DO YOU SAY 'AM'
       ARE YOU SAYING 'NO' JUST TO BE NEGATIVE

   This constrains what the HOSTS may print. It does not constrain the
   keyboard: type a question mark and it prints, because the key exists. */
const HOST_PUNCTUATION = [
  [/["\u201C\u201D`]/g, "'"],   // the 1966 way of quoting
  [/[;:]/g, ','],               // clause break -> the clause break ELIZA has
  [/[?!]/g, '.'],               // sentence break -> the one ELIZA has
];

/* Emphasis markers are stripped rather than printed. * and _ are both on
   the type drum, so this is not a hardware limit -- it is that the 1966
   script never emits either one, while a modern model reaches for *this*
   constantly. Printed, they are a signature; the words inside them are not.

   Only the wrappers go. A lone asterisk survives, because that is a
   character someone could legitimately type. */
/* House style: what a HOST may print, as opposed to what the machine can
   print. downgrade() above is the hardware; this is the convention. Keeping
   them apart matters -- the type drum really does carry ? and *, and the
   keyboard really can type them. It is only the two computers that may not. */
export function houseStyle(text) {
  let s = demarkup(text);
  for (const [re, to] of HOST_PUNCTUATION) s = s.replace(re, to);
  // Anything left outside the vocabulary has no 1966 equivalent at all.
  return s.replace(/[^A-Za-z0-9 '\-.,\n]/g, '');
}

function demarkup(text) {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/(^|\s)_([^_\n]+)_(?=\s|$)/g, '$1$2');
}

/* Down to the 64 characters that physically exist on the type drum:
   0x20 SPACE through 0x5F UNDERSCORE, uppercase only.
   Uppercasing happens BEFORE the filter, because a-z is 0x61-0x7A and would
   otherwise be deleted rather than folded. */
export function downgrade(text) {
  let s = String(text == null ? '' : text);
  for (const [re, to] of SUBSTITUTIONS) s = s.replace(re, to);
  s = s.toUpperCase();
  s = s.replace(/[^ -_]/g, '');
  return s;
}

/* Wrapping is the host's job, not the machine's -- the machine overstrikes.
   Whitespace runs are preserved inside a line so "SAY.  LET" keeps the two
   spaces after the full stop, but a line never starts with them: after a
   carriage return the head is already home. */
export function wrap(text, cols = COLS) {
  const out = [];
  let line = '';
  const tokens = String(text).match(/\s+|\S+/g) || [];

  for (const tok of tokens) {
    if (/^\s+$/.test(tok)) {
      if (line) line += tok;
      continue;
    }
    let word = tok;
    // A word longer than the whole line cannot be wrapped, only broken.
    while (word.length > cols) {
      if (line) { out.push(line.replace(/\s+$/, '')); line = ''; }
      out.push(word.slice(0, cols));
      word = word.slice(cols);
    }
    if (line.length + word.length > cols) { out.push(line.replace(/\s+$/, '')); line = word; }
    else line += word;
  }
  if (line) out.push(line.replace(/\s+$/, ''));
  return out.length ? out : [''];
}

/* The 1966 script ends 197 of its 199 replies on a letter or a digit. It
   contains no question mark at all, and exactly one full stop. A 2026 model
   ends almost every sentence with "?".

   That is a one-character tell: you could win the blind test by looking at
   the last character of the roll, without reading a word. So the closing
   punctuation comes off every reply, from either host.

   Only .?!,;: are removed. The apostrophe stays, because two of the 1966
   replies legitimately end in one -- WHY DO YOU SAY 'AM' -- and stripping
   it would damage the script rather than disguise it.

   Note what is NOT done here: replies are not cut to one sentence. That
   sounds like the same kind of rule, but ELIZA's HELLO answer is "HOW DO
   YOU DO. PLEASE STATE YOUR PROBLEM", so a first-sentence rule would
   silently rewrite the 1966 script. Deterministic tells get closed in code;
   statistical ones (reply length, which already overlaps -- ELIZA runs to
   13 words, the model to 11) are shaped at generation instead, because
   truncating mid-sentence is a louder tell than the one it removes. */
/* Bring a reply inside the word budget without ever leaving half a
   sentence on the paper.

   Three tiers, in order of how much they cost:
     1. the last sentence end that fits    -- lossless, drops a whole thought
     2. the last clause end that fits      -- drops a trailing subordinate
     3. a plain cut at the budget          -- last resort, and it shows

   Tier 3 exists because tiers 1 and 2 cannot help a single long clause, and
   leaving those through would defeat the rule: the model's characteristic
   output is exactly one 26-word sentence with no internal punctuation. */
function trimToBudget(text, budget = MAX_REPLY_WORDS) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= budget) return text;

  const endsWith = (i, re) => re.test(words[i].slice(-1));
  for (const re of [/[.?!]/, /[,;:-]/]) {
    for (let i = budget - 1; i >= 1; i--) {
      if (endsWith(i, re)) return words.slice(0, i + 1).join(' ');
    }
  }
  return words.slice(0, budget).join(' ');
}

function unpunctuate(line) {
  return line.replace(/[.?!,;:]+$/, '');
}

/* Raw host text in, printable lines out.

   The leading blank line and the trailing prompt belong to the formatter,
   not to the hosts. A host that padded its own reply with one extra blank
   line would be identifiable without reading a word of it. */
export function toPaper(text, prompt = PROMPT) {
  const body = String(text == null ? '' : text)
    .split(/\r\n|\r|\n/)
    .flatMap(paragraph => wrap(unpunctuate(trimToBudget(houseStyle(downgrade(paragraph)).trim()))));

  // Collapse runs of blank lines to one, then strip them from both ends, so
  // vertical padding cannot be used as a signature either.
  const tidy = [];
  for (const l of body) {
    if (l === '' && tidy[tidy.length - 1] === '') continue;
    tidy.push(l);
  }
  while (tidy.length && tidy[0] === '') tidy.shift();
  while (tidy.length && tidy[tidy.length - 1] === '') tidy.pop();

  // An empty reply still has to look like a reply. A host that answered with
  // nothing at all would stand out immediately.
  if (!tidy.length) tidy.push('?');

  /* One ceiling, both hosts. ELIZA never reaches it; the LLM would, and a
     reply that takes forty seconds to print is identifiable from across the
     room without reading a word of it. The rule has to live here rather
     than in llm.js, because a limit applied to one host and not the other
     IS the tell it is meant to prevent. */
  if (tidy.length > MAX_REPLY_LINES) tidy.length = MAX_REPLY_LINES;

  return ['', ...tidy, prompt];
}
