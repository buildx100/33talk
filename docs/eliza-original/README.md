# Original ELIZA material — archive

**Do not edit anything in this directory.**

These files are historical artefacts kept verbatim. They exist so that the
rules this project runs can be checked against their source, and a "helpful"
tidy-up would destroy the only thing they are for.

| File | What it is |
|---|---|
| `DOCTOR-1966-CACM.txt` | The DOCTOR script, transcribed from the appendix of Weizenbaum's January 1966 CACM article |
| `LICENSE-CC0.txt` | CC0 1.0 Universal, the licence of the transcription |

## Provenance

> Weizenbaum, J. "ELIZA — A Computer Program For the Study of Natural
> Language Communication Between Man And Machine."
> *Communications of the ACM*, Vol. 9, No. 1 (January 1966), pp. 36–45.

The transcription is by **Anthony Hay, December 2020**, from
[`anthay/ELIZA`](https://github.com/anthay/ELIZA), released **CC0**. The
original MAD-SLIP source was recovered from the Weizenbaum archives at MIT
and released into the public domain under CC0 with the agreement of
Weizenbaum's estate; see [elizagen.org](https://elizagen.org).

CC0 imposes no conditions. The credit here is courtesy, not obligation.

Hay's own notes on the transcription are preserved in the header of
`DOCTOR-1966-CACM.txt`. The one substantive edit is his: six lines were
printed twice in the CACM appendix, making the structure nonsensical, and
the duplicates are commented out rather than deleted.

## How it is used

`web/js/eliza-rules.js` contains this script **byte for byte** and parses it
at load time. It is not transcribed into JavaScript literals, because
hand-copying 435 lines would put every rank and every reply at the mercy of
someone's typing, and a single wrong number would be invisible.

`test/eliza.test.js` asserts that the copy in `eliza-rules.js` is identical
to `DOCTOR-1966-CACM.txt`. If anyone edits either one, the test fails.

That is also what Weizenbaum was arguing for. From the paper: *"an important
property of ELIZA is that a script is data; i.e., it is not part of the
program itself."*

## The typos are deliberate

`APOLIGIZE` is printed exactly that way in the CACM appendix. So is
`WHAT DOES THAT DREAM SUGGEST TO YOU` sitting next to the American spelling
elsewhere. **Do not fix them.** They are 1966 artefacts, and correcting them
would mean this file no longer matches the paper it claims to reproduce.
