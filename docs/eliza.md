# ELIZA

## Provenance

ELIZA was written by Joseph Weizenbaum at MIT between 1964 and 1966, in
MAD-SLIP, running under CTSS on an IBM 7094. DOCTOR is a *script* for ELIZA —
the Rogerian-therapist persona — not a separate program. The distinction
mattered to Weizenbaum and is worth keeping: ELIZA is the pattern-matching
engine, DOCTOR is one set of rules fed to it.

The paper is:

> Weizenbaum, J. "ELIZA — A Computer Program For the Study of Natural
> Language Communication Between Man And Machine."
> *Communications of the ACM*, Vol. 9, No. 1 (January 1966), pp. 36–45.

## Licensing

The original MAD-SLIP source was recovered from MIT's archives and, in
December 2024, released into the public domain under **CC0** with the
agreement of Weizenbaum's estate.

CC0 imposes no conditions at all. The credit in `NOTICE` and in this file is
**courtesy, not obligation**. There is zero licensing risk in this project's
use of the rules.

## Implementation notes

The rules live in `web/js/eliza-rules.js` and the engine in
`web/js/eliza.js`. Both are implemented.

### The script is embedded, not transcribed

`eliza-rules.js` contains the CACM appendix script **byte for byte** and
parses it at load time. It is not hand-converted into JavaScript literals,
and this was a deliberate choice:

- Transcribing 435 lines would put 67 keywords, every rank and every
  reassembly rule at the mercy of typing. One wrong rank is invisible —
  ELIZA would simply feel slightly off, with nothing to point at.
- Embedded, fidelity stops being a matter of proofreading. `npm test`
  asserts the embedded copy is identical to
  `docs/eliza-original/DOCTOR-1966-CACM.txt`. Edit either and the test
  fails.
- It is also what the paper argues for: *"an important property of ELIZA is
  that a script is data; i.e., it is not part of the program itself."*
  Transcribing the data into literals turns it back into program.

The cost is a reader, about 120 lines. That is a good trade: a bug in a
parser is systematic and shows up immediately, while a transcription error
is random and hides.

The 1966 typos survive — `APOLIGIZE` is printed exactly that way in the
appendix. Do not fix them.

**Work from the original rules.** Do not `npm install` an `eliza` package.
Almost every ELIZA on npm is a third- or fourth-hand descendant of a 1960s
BASIC port — several lossy transformations away from the paper, usually with
keywords dropped, ranks flattened, and the reassembly cycling replaced by
`Math.random()`. They are recognisably not the same program.

**Do not try to run the real MAD-SLIP.** That needs an IBM 7094 emulator
running CTSS. Interesting, but a different project.

All of the following are implemented. They are also, one by one, the things
a naive reimplementation gets wrong:

- **Keywords are ranked.** When an input matches several keywords, the
  highest-ranked one wins, not the first one found.
- **Reassembly rules cycle, they do not shuffle.** Each keyword keeps a
  pointer into its list of responses and advances it. This is why the real
  ELIZA does not repeat itself twice in a row, and why a random picker feels
  subtly wrong.
- **Reflection is a substitution pass on the matched fragment**, applied
  before it is echoed back: I→YOU, MY→YOUR, ME→YOU, and the reverse where
  the original had it.
- **MEMORY.** Certain inputs are stashed and re-surfaced later when nothing
  matches, which is a large part of why the illusion holds.
- **NONE responses** are the fallback when no keyword matches at all, and
  they cycle too.

## Its role here

In 33talk, ELIZA is one of the two hosts in the blind test. Two consequences
follow, and both are constraints on the implementation:

1. **It returns raw text.** It must not uppercase, wrap at 72, or append the
   `READY` prompt. Everything a host says is shaped by `format.js`, because
   any difference in the *shape* of output is a tell independent of content.
   See the blind-test notes in the README.

2. **It answers in 0 ms**, where the LLM takes 1–3 seconds. The sync gate in
   `hosts.js` holds it back so both machines start printing on the same
   frame. Without that, the blind test is decided before either machine
   prints a word.

## Verifying it

`npm test` replays the conversation printed on pages 36-37 of the paper and
asserts every reply, exchange for exchange:

```
Men are all alike.                        IN WHAT WAY
They're always bugging us ...             CAN YOU THINK OF A SPECIFIC EXAMPLE
Well, my boyfriend made me come here.     YOUR BOYFRIEND MADE YOU COME HERE
He says I'm depressed much of the time.   I AM SORRY TO HEAR YOU ARE DEPRESSED
...
```

To see MEMORY work, say something about your mother or your boyfriend, then
type something with no keyword in it at all — `BULLFROGS AND TELEPHONE
POLES` is the traditional choice. Instead of "PLEASE GO ON" it comes back to
what you said earlier.

## Fair play

The point of the comparison is not to make ELIZA look good by dressing it up.
It should run the DOCTOR rules faithfully and be allowed to fail the way it
actually fails. A 1966 program that holds its own against a 2026 model some
of the time is a much more interesting result than one that has been quietly
helped.
