/* Numbers the rest of the code must not invent for itself.
   Several of these are load-bearing history, not taste. See docs/model33.md. */

// The type drum is 72 columns wide. terminfo(5) for this machine: cols#72.
export const COLS = 72;

// The bell rings near the end of the line to warn the typist. Column 72 does
// not wrap -- it overstrikes -- so this is the only warning you get.
export const BELL_COL = 65;

export const MAXLINES = 400;      // how much roll we keep in the DOM
export const MAXWINLINES = 8;     // how many lines the platen window shows
export const PAPER_RATIO = 0.90;  // paper width as a fraction of the deck

/* How worn the ribbon is, and how much play the mechanism has.
   The carriage runs on a rack so it wanders less sideways than the type
   drum does up and down -- hence the two different jitter figures.
   An earlier version used +/-0.45px on both axes and the text visibly
   failed to sit on a baseline. */
export const INK_MIN = 0.75, INK_RANGE = 0.25;
export const JITTER_X = 0.25, JITTER_Y = 0.35;

/* ---- Hosts ----------------------------------------------------------
   There is one deployment: the container, which always has both hosts. A
   build without the LLM would be a build without the blind test, and the
   blind test is the product.

   v1 is local-only: no API key exists, so there is no secret to hide and
   no proxy to write. nginx serves this page and reverse-proxies /v1 to
   llama-server, so the endpoint is same-origin and CORS never enters the
   picture. */
export const LLM_ENDPOINT = '/v1/chat/completions';

/* Generation limits. These are pacing decisions as much as model settings:
   the paper prints at 10 characters per second, so 60 tokens is already
   roughly 25 seconds of hammering. Anything longer stops being a reply and
   becomes a wait. */
export const LLM_MAX_TOKENS = 60;
export const LLM_TEMPERATURE = 0.9;

/* Without these, a 0.6B model answers every single turn with "WHAT DO YOU
   THINK ABOUT ..." -- which is a tell after two exchanges, and a worse
   showing than the model deserves. Measured over a five-turn conversation:
   2/5 distinct openings without them, 5/5 with.

   Note that ELIZA needs no equivalent. Its variety comes from cycling
   pointers through the 1966 script, which is deterministic. */
export const LLM_PRESENCE_PENALTY = 1.2;
export const LLM_FREQUENCY_PENALTY = 0.6;

// How many previous exchanges the LLM is reminded of. ELIZA has MEMORY, so
// a host with no recall at all would be identifiable by that alone -- but
// the context window is 2048 tokens, so this cannot be unbounded.
export const LLM_HISTORY_TURNS = 8;

/* The word budget for one reply, applied by format.js to every host alike.

   20 is not a taste: it is one more than the longest reply ELIZA was
   measured producing over a full conversation (19 words -- reassembly
   templates top out at 13, but they splice matched text back in). So the
   1966 host is untouched by this rule, and the 2026 host, whose median came
   out at 18 words against ELIZA's 8, is brought into the same range.

   The budget is spent back to the last clean break, so a trimmed reply is
   never a half sentence. See trimToBudget in format.js. */
export const MAX_REPLY_WORDS = 20;

/* A hard ceiling on how much paper ONE reply may use, applied by format.js
   to every host alike. ELIZA never comes close; this exists so a runaway
   model cannot be identified by the length of the roll, and so nobody has
   to watch a minute of printing. */
export const MAX_REPLY_LINES = 4;

/* ---- Persistence ---------------------------------------------------- */
export const STORAGE_LANG = 'm33.lang';
export const STORAGE_SCORE = 'm33.score';
