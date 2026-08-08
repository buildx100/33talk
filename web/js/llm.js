import {
  LLM_ENDPOINT, LLM_MAX_TOKENS, LLM_TEMPERATURE, LLM_HISTORY_TURNS,
  LLM_PRESENCE_PENALTY, LLM_FREQUENCY_PENALTY
} from './config.js';

/* The 2026 host: qwen3:0.6b behind llama-server's OpenAI-compatible API.

   Same origin, proxied by nginx, so there is no key, no CORS and no backend
   code. Returns RAW text -- format.js shapes it, because any difference in
   the SHAPE of a reply identifies the host regardless of content. */

/* ---- The system prompt --------------------------------------------------

   This is the most consequential file in the project that is not code, so
   the reasoning is worth writing down.

   With no system prompt at all, the model answers a Rogerian opening with
   430 characters of even-handed essay. On paper that is 43 SECONDS of
   printing, and you can identify it across the room without reading a word.
   A blind test that can be won by looking at the length of the roll is not
   measuring anything.

   So both hosts are put in the same ROLE and given the same brevity, and
   then left alone. What this prompt does NOT do is equally deliberate:

     - it does not mention ELIZA, DOCTOR, or 1966
     - it does not ask the model to sound old-fashioned, robotic, or dumb
     - it does not give it example replies to imitate

   Telling it to impersonate ELIZA would make this a test of impersonation.
   The question is whether sixty years of progress is legible when both
   sides are doing the same job under the same constraints.

   It also says nothing about uppercase, ASCII, or line width. That is
   format.js's job, in code, because the machine physically cannot print
   anything else -- and, tested against this model, asking for it here made
   the replies markedly worse: a 0.6B model spends its attention on the
   formatting rules and starts parroting the input back verbatim. */
const SYSTEM_PROMPT =
  'You are a therapist listening to a patient. Respond in a single short ' +
  'sentence that invites them to say more. Never explain, never advise, ' +
  'never list. Ask about what they just said. Be brief.';

/* Qwen3 is a hybrid reasoning model. Left alone it puts its answer in
   reasoning_content and returns an EMPTY content string, so the paper comes
   out blank. Verified against this build:
     chat_template_kwargs.enable_thinking=false   clean, no think block
     "/no_think" appended to the user text        works, but edits the input
     reasoning_format:"none"                      leaves raw <think> in content
   The first is the only one that is both clean and invisible to the user. */
const NO_THINKING = { enable_thinking: false };

let history = [];

export const llm = {
  /* Dated at runtime rather than hardcoded: the point being made is the
     distance between the two years, and this one keeps moving. */
  id: 'HOST - TINYLLM(' + new Date().getFullYear() + ')',

  async respond(line) {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: line }
    ];

    const res = await fetch(LLM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        max_tokens: LLM_MAX_TOKENS,
        temperature: LLM_TEMPERATURE,
        presence_penalty: LLM_PRESENCE_PENALTY,
        frequency_penalty: LLM_FREQUENCY_PENALTY,
        stream: false,
        chat_template_kwargs: NO_THINKING
      })
    });

    // Let this throw. hosts.js turns any failure into the same words on
    // both machines, because a host identifiable by its excuse is as much
    // of a leak as one identifiable by its latency.
    if (!res.ok) throw new Error('llm: HTTP ' + res.status);

    const data = await res.json();
    const message = data?.choices?.[0]?.message ?? {};

    // reasoning_content is the fallback for the case where thinking was not
    // actually suppressed -- better a stray thought on the paper than a
    // blank roll, which would be a very loud tell.
    const text = (message.content || message.reasoning_content || '').trim();
    if (!text) throw new Error('llm: empty reply');

    // Only remember exchanges that completed. A turn that timed out upstream
    // must not leave a half-conversation behind.
    history.push({ role: 'user', content: line });
    history.push({ role: 'assistant', content: text });
    if (history.length > LLM_HISTORY_TURNS * 2) {
      history = history.slice(-LLM_HISTORY_TURNS * 2);
    }

    return text;
  },

  /* A new round is a new conversation. ELIZA clears its MEMORY here; if this
     host kept talking about the previous round's boyfriend it would be
     identifiable by continuity alone. RESHUFFLE only -- TEAR OFF gives you
     fresh paper, not a fresh patient. */
  reset() { history = []; }
};
