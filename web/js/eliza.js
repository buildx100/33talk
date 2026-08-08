import { DOCTOR } from './eliza-rules.js';

/* ELIZA running the DOCTOR script. Weizenbaum, MIT, 1966.

   The algorithm is the one in the CACM paper, and the parts most
   reimplementations drop are the parts that make it work:

     RANK          keywords carry a priority. COMPUTER is 50, WAS is 2. When
                   several match, the highest wins -- not the first.
     CYCLING       each decomposition rule keeps a pointer into its list of
                   replies and advances it. It does NOT pick at random. This
                   is why the original never says the same thing twice in a
                   row, and why random-choice copies feel subtly broken.
     MEMORY        inputs mentioning MY are stashed and resurfaced later,
                   when nothing else matches. A large part of why the
                   illusion holds is that it appears to remember.
     NEWKEY        a rule may decline to answer and hand the turn to the
                   next keyword down the stack.
     EQUIVALENCE   MACHINE is not a synonym table entry, it is COMPUTER's
                   rules reached under a different word.

   It returns RAW text. It must not uppercase, wrap at 72, or append a
   prompt: every reply is shaped by format.js, because any difference in the
   SHAPE of output would identify the host regardless of content. */

const MEMORY_DEPTH = 20;

/* ------------------------------------------------------------------ *
   Matching
 * ------------------------------------------------------------------ */

function hasTag(script, word, tag) {
  const t = script.tags.get(word);
  return !!t && t.includes(tag);
}

/* Returns the matched components, one string per decomposition part, or
   null. A leading wildcard takes as FEW words as it can: the match runs
   left to right and the first success wins. */
function match(script, words, parts) {
  if (parts.length === 0) return words.length === 0 ? [] : null;

  const [part, ...rest] = parts;

  if (part.word !== undefined) {
    if (words[0] !== part.word) return null;
    const tail = match(script, words.slice(1), rest);
    return tail && [part.word, ...tail];
  }

  if (part.any !== undefined) {
    if (!words.length || !part.any.includes(words[0])) return null;
    const tail = match(script, words.slice(1), rest);
    return tail && [words[0], ...tail];
  }

  if (part.tag !== undefined) {
    if (!words.length || !hasTag(script, words[0], part.tag)) return null;
    const tail = match(script, words.slice(1), rest);
    return tail && [words[0], ...tail];
  }

  if (part.wild > 0) {
    if (words.length < part.wild) return null;
    const tail = match(script, words.slice(part.wild), rest);
    return tail && [words.slice(0, part.wild).join(' '), ...tail];
  }

  for (let take = 0; take <= words.length; take++) {
    const tail = match(script, words.slice(take), rest);
    if (tail) return [words.slice(0, take).join(' '), ...tail];
  }
  return null;
}

// Bare integers in a template name matched components, 1-based.
function assemble(template, components) {
  return template
    .map(tok => (/^\d+$/.test(tok) ? (components[Number(tok) - 1] ?? '') : tok))
    .filter(s => s !== '')
    .join(' ');
}

/* ------------------------------------------------------------------ *
   The doctor
 * ------------------------------------------------------------------ */

export function createDoctor(script = DOCTOR) {
  // Cycling pointers and the memory stack are per-conversation, which is
  // why they live here and not in the parsed script.
  const cycle = new Map();
  let memoryStack = [];

  function nextReassembly(rule) {
    const i = cycle.get(rule.id) || 0;
    cycle.set(rule.id, (i + 1) % rule.reassemblies.length);
    return rule.reassemblies[i];
  }

  // Punctuation ends a thought. ELIZA keeps only the part of the input it
  // is going to work on, and everything after a comma or full stop is a
  // separate candidate.
  function segments(input) {
    return String(input)
      .toUpperCase()
      .replace(/[^A-Z0-9'.,\s-]/g, ' ')
      .split(/[.,]/)
      .map(s => s.trim().split(/\s+/).filter(Boolean))
      .filter(w => w.length);
  }

  /* Scan a segment left to right. Words carrying a substitution are
     rewritten in place -- this is what turns "I AM SAD" into "YOU ARE SAD"
     before any rule sees it -- and words that are keywords go on the stack,
     highest rank first. */
  function scan(words) {
    const text = [];
    const stack = [];
    for (const word of words) {
      const entry = script.keywords.get(word);
      if (entry && (entry.rules.length || entry.equiv)) stack.push(entry);
      text.push(script.substitutions.get(word) ?? word);
    }
    // Stable: equal ranks keep the order they were found in.
    stack.sort((a, b) => b.rank - a.rank);
    return { text, stack };
  }

  function rulesFor(entry) {
    // (ALIKE 10 (=DIT)) -- ALIKE has DIT's rules, reached under its own rank.
    const seen = new Set();
    let e = entry;
    while (e && !e.rules.length && e.equiv && !seen.has(e.key)) {
      seen.add(e.key);
      e = script.keywords.get(e.equiv);
    }
    return e || entry;
  }

  /* Try one keyword against the text. Returns a reply, or null to mean
     "this keyword declines" (NEWKEY, or nothing matched). */
  function tryKeyword(entry, words, depth = 0) {
    if (depth > 12) return null;         // a script could loop through links
    const target = rulesFor(entry);

    for (const rule of target.rules) {
      const components = match(script, words, rule.decomp);
      if (!components) continue;

      const reasmb = nextReassembly(rule);

      if (reasmb.newkey) return null;

      if (reasmb.pre) {
        const rebuilt = assemble(reasmb.pre, components).split(' ').filter(Boolean);
        const next = script.keywords.get(reasmb.link);
        return next ? tryKeyword(next, rebuilt, depth + 1) : null;
      }

      if (reasmb.link) {
        const next = script.keywords.get(reasmb.link);
        if (!next) return null;
        return tryKeyword(next, words, depth + 1);
      }

      return assemble(reasmb.text, components);
    }
    return null;
  }

  function remember(words) {
    for (let n = 0; n < script.memory.rules.length; n++) {
      const rule = script.memory.rules[(cycle.get('memory') || 0) % script.memory.rules.length];
      cycle.set('memory', (cycle.get('memory') || 0) + 1);
      const components = match(script, words, rule.decomp);
      if (components) {
        memoryStack.push(assemble(rule.reassemblies[0].text, components));
        if (memoryStack.length > MEMORY_DEPTH) memoryStack.shift();
        return;
      }
    }
  }

  return {
    greeting: script.greeting,

    reset() {
      cycle.clear();
      memoryStack = [];
    },

    respond(input) {
      const candidates = segments(input).map(scan);
      if (!candidates.length) return tryKeyword(script.none, [], 0) ?? '';

      // The segment with the highest-ranked keyword is the one answered.
      let chosen = candidates[0];
      for (const c of candidates) {
        const best = c.stack.length ? c.stack[0].rank : -1;
        const cur = chosen.stack.length ? chosen.stack[0].rank : -1;
        if (best > cur) chosen = c;
      }

      // Anything about MY is worth storing, whether or not it is what we
      // answer with now.
      if (chosen.text.includes(script.memory.key) ||
          chosen.text.includes(script.substitutions.get(script.memory.key))) {
        remember(chosen.text);
      }

      for (const entry of chosen.stack) {
        const reply = tryKeyword(entry, chosen.text);
        if (reply) return reply;
      }

      // Nothing matched. Bringing something back up is far more convincing
      // than another "PLEASE GO ON", so memory is preferred to NONE.
      if (memoryStack.length) return memoryStack.shift();
      return tryKeyword(script.none, chosen.text) ?? '';
    }
  };
}

const doctor = createDoctor();

export const eliza = {
  // The year is the whole point of the comparison, so it goes in the name --
  // but only ever shown after the guess is locked in.
  id: 'HOST - ELIZA(1966)',
  greeting: doctor.greeting,
  respond: line => doctor.respond(line),
  // RESHUFFLE starts a new round, so it starts a new conversation. TEAR OFF
  // does not: tearing gives you fresh paper, not a fresh patient.
  reset: () => doctor.reset()
};
