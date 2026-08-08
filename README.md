# 33talk

**Two Teletype® Model 33 terminals, side by side, driven by one keyboard.**
One is wired to ELIZA (1966). One is wired to a local LLM (2026). Which is
which is randomised, and you have to commit to a guess before the answer is
shown.

The machine is not the product. The blind test is the product. The machine is
the stage — and it happens to be the best teaching device ever built for
explaining why terminals behave the way they do.

If you have ever wondered why `\r` and `\n` are two different characters, why
`Ctrl+C` interrupts, why the terminal beeps, or what `stty erase` is for: they
are all fossils of this one machine, and you can hear every one of them.

---

## Run it

Everything, including the LLM, in one command:

```sh
docker compose up --build
```

then open <http://localhost:16001>. The model is inside the image, so there is
nothing to download at boot.

Where `huggingface.co` is unreachable:

```sh
docker compose build --build-arg HF_HOST=https://hf-mirror.com
```

ES modules do not load over `file://`, so opening `web/index.html` by
double-click will not work.

---

## Developing

Start it once with the dev overlay:

```sh
docker compose -f compose.yml -f compose.dev.yml up
```

That bind-mounts `web/` over the image's static directory. **Edit a file,
refresh the browser — that is the whole loop.** No rebuild, no restart, and
the LLM container is never touched.

The overlay is deliberately *not* named `docker-compose.override.yml`: that
filename is loaded automatically, and committing it would silently make the
production server serve files from its own host directory.

| | |
|---|---|
| Develop | `docker compose -f compose.yml -f compose.dev.yml up` |
| Front end alone, no containers | `npm run serve` |
| Rebuild the front-end image only | `docker compose build web` (seconds) |
| Production | `docker compose up --build -d` |
| Change the model | edit `MODEL_FILE`, then `docker compose build llm` |
| Tests | `npm test` |

**The model is not re-downloaded when you change code.** It lives in a
different image (`Dockerfile.llm`), and even rebuilding that one hits the
Docker layer cache unless `MODEL_REPO`, `MODEL_FILE` or `HF_HOST` changed.

**Never mount code with a named volume.** A named volume over a path the
image already populates is seeded once, on first creation, and never updates
— you would rebuild, restart, and still be served stale code with nothing to
indicate why. Bind mounts do not have this problem.

---

## What is real, and what is not

Every constraint of the machine is load-bearing. Removing one to make the
thing nicer removes the point.

| Real | |
|---|---|
| 72 characters per line | terminfo `cols#72` |
| 10 characters per second, 110 baud | Model 33 spec |
| 6 lines per inch, 8.44 inch roll paper | Model 33 spec |
| Uppercase only, 64-character ASCII | there is no lowercase on the type drum |
| **No backspace key** | the carriage moves forward, or it returns |
| `RUB OUT` is not backspace | it is DEL, for punching out tape holes |
| `LINE FEED` and `RETURN` are separate keys | two mechanical actions — which is why CR and LF are two characters, and why Windows kept CRLF |
| **`@` is SHIFT+P**, not its own key | Ray Tomlinson picked it off this keyboard in 1971 |
| No auto-wrap at column 72 | it overstrikes in place; wrapping is the *host's* job |
| The bell rings near end of line | warns the typist — and ASCII 0x07 rings it too |
| A carriage return takes real time | which is why real hosts padded with NULs after CR |

The terminfo entry for this machine is the one used as the worked example in
`terminfo(5)`:

```
33|tty33|tty|model 33 teletype,
    bel=^G, cols#72, cr=^M, cud1=^J, hc, ind=^J, os,
```

`hc` = hardcopy. `os` = overstrike. Both are implemented.

| Deliberately not real | Why |
|---|---|
| The cheat panel | so remote echo can be shown side by side on video. Labelled as such |
| `READY` after every reply | a timesharing BASIC prompt, not something ELIZA on CTSS printed. Kept because **both hosts must format output identically** |
| 30 and 120 CPS buttons | mercy for the impatient |

Some details are **unverified** and marked as such in the source rather than
asserted: several of the control-code keycap legends, which row `HERE IS` /
`RUB OUT` / `REPT` / `BREAK` belong to, and the keyboard row stagger.

---

## Things to try

| Type this | What happens |
|---|---|
| `PASSWORD` ⏎ | both hosts stop echoing. Keep typing — nothing appears on either roll. This is why your password does not echo in a terminal today |
| `HELLO###P` ⏎ | there is no backspace. `#` erases one character, `@` kills the line, **and both of them print**. The paper keeps an honest record of every mistake |
| `HELP` ⏎ | the machine explains itself, on paper |
| Backspace | the window flinches and nothing happens |
| `PRINT` | the two rolls, one page each, at real geometry — 8.44in paper, 10 CPI, 6 LPI, torn top and bottom |

With headphones, **A is in the left channel and B in the right**. All audio is
synthesised live in Web Audio: no samples, no files. The two motors are tuned
60 Hz and 60.4 Hz so they beat against each other, like two real machines on
one bench.

---

## Layout

```
web/                    native ES modules, no bundler
├── index.html
├── css/                base, machine, keyboard, panel, dialog, print
└── js/
    ├── main.js         boot and wiring only
    ├── config.js       the numbers nothing else may invent
    ├── clock.js        THE metronome -- one timer, both machines
    ├── machine.js      roll, queue, strike, carriage
    ├── audio.js        Web Audio synthesis
    ├── keyboard.js     layout data + press animation
    ├── format.js       THE shared post-processor  <- read this one
    ├── hosts.js        registry + sync gate
    ├── eliza.js        DOCTOR engine, 1966
    ├── llm.js          llama-server client, 2026
    ├── game.js         assignment, guessing, score
    ├── print.js        print sheet builder
    ├── eliza-rules.js  the 1966 script, verbatim, + its reader
    └── i18n.js         + locales/{en,zh,ja}.js

Dockerfile              nginx + web/
Dockerfile.llm          llama-server + the model, baked in
nginx.conf              static files, and /v1 -> llama-server
test/                   node --test, no framework
docs/                   model33.md, eliza.md
docs/eliza-original/    the 1966 script as published. Archive: do not edit
```

There is **one** deployment and one artefact. A build without the LLM would
be a build without the blind test, and the blind test is the product.

`npm test` runs the suite. It covers exactly one module, `format.js`, because
that is the only part of this project where a silent bug is a *product* bug —
see below.

---

## Blind-test integrity

The whole thing collapses if the machine leaks which host is which, and
latency is only the most obvious channel.

- **Sync gate.** Both hosts are resolved with `Promise.all` and only then
  queued, so both start printing on the same frame. ELIZA answers in 0 ms and
  the LLM in 1–3 seconds; without this, response time alone gives it away
  instantly. (`hosts.js`)
- **Shared metronome.** One timer steps both machines. They cannot run at
  different speeds and cannot drift apart. (`clock.js`)
- **One shared post-processor.** Uppercase, filter to the 64-character set,
  wrap at 72, one leading blank line, one trailing `READY`. **Neither host
  formats its own output.** Anything about the *shape* of a reply is a tell
  independent of its content. (`format.js`)
- **One guess per round.** `REVEAL` disables itself after a guess; only
  `RESHUFFLE` re-arms it.
- **Tear-off does not reshuffle.** New paper, same assignment. Tearing must
  not hand you a fresh bet.

The filter has to be **code**, not a system prompt. A small model will emit
lowercase, Markdown, emoji, curly quotes and em dashes no matter what you ask
it, and the machine physically cannot print any of that.

### What the machine may print, and what a host may print

Two different things, so two different functions in `format.js`:

| | |
|---|---|
| `downgrade()` | **hardware.** Uppercase, fold curly quotes and dashes, filter to 0x20–0x5F. What the type drum carries |
| `houseStyle()` | **convention.** Markdown, punctuation vocabulary. What a HOST may print |

The distinction is load-bearing. The drum really does carry `?` and `*`, and
the keyboard really can type them — echo does not pass through `houseStyle`.
It is only the two computers that may not use them.

**Punctuation vocabulary.** Measured across all 199 reassembly templates in
the 1966 script, ELIZA's entire punctuation vocabulary is four characters:

```
'  x34      ,  x13      -  x5      .  x1
```

No double quote. **No question mark — not one, anywhere in the script.** The
model reaches for all of them, so any mark it uses that ELIZA cannot is a
character that appears on exactly one roll. Host output is folded into that
vocabulary: `"` → `'` (ELIZA quotes too, it just quotes the 1966 way — `WHY
DO YOU SAY 'AM'`), `;:` → `,`, `?!` → `.`, anything else dropped.

**No terminal punctuation.** 197 of the 199 templates end on a letter or a
digit and the other two on an apostrophe; none end on `.?!`. The model ends
almost every sentence with `?`. That is a **one-character tell** — you could
win by looking at the last character of the roll without reading a word.

**Word budget of 20.** One more than the longest reply ELIZA was measured
producing over a real conversation. The model's median was 18 words against
ELIZA's 8. Trimming spends the budget back to the last clean break —
sentence end, then clause end — so a trimmed reply is never half a sentence.

### Deterministic tells are closed in code; statistical ones are not

- **Deterministic** — one character, always on one side and never the other.
  Close it. Terminal `?`, double quotes, markdown `*`.
- **Statistical** — overlapping distributions. Shape it at generation, and
  only ever trim at a clean boundary. Truncating mid-sentence is a *louder*
  tell than the one it removes.

One statistical gap is left open deliberately. Measured over 20 exchanges,
distinct reply openings: **ELIZA 95%, the model 23%.** ELIZA cycles pointers
through 199 hand-written templates; a 0.6B model has one system prompt and a
sampling distribution. It cannot be tuned away, and it points the *wrong*
way — the repetitive, wordier host is the 2026 one, which is the opposite of
what a player expects. It makes the test harder, not easier.

### The LLM's system prompt sets role and brevity, and nothing else

It deliberately does **not** mention ELIZA, DOCTOR or 1966, does not ask the
model to sound old-fashioned, and gives it no examples to imitate. Telling it
to impersonate ELIZA would make this a test of impersonation. The question is
whether sixty years is legible when both sides do the same job under the same
constraints.

---

## Status

**v1.0** — both hosts are real, the deployment runs, and the blind test is a
blind test.

| | |
|---|---|
| Machine, sound, keyboard, print, i18n, scoring | done |
| ELIZA | **done** — DOCTOR script, 1966, with rank, cycling and MEMORY |
| LLM | **done** — qwen3:0.6b via llama-server, same origin |
| Deployment | `docker compose up --build` |

ELIZA is the real thing: the DOCTOR script from the CACM appendix, embedded
verbatim and parsed at load time rather than transcribed into JavaScript, so
that fidelity is a property of the file rather than of someone's proofreading.
`npm test` reproduces the conversation printed in the 1966 paper, exchange for
exchange.

---

## Deploying it

### What you need

A machine with Docker, three cores and 4 GB of RAM. No GPU, no API key, no
account anywhere. The model runs on the CPU, and at 10 characters per second
the paper is a far tighter bottleneck than the processor.

### Steps

```sh
git clone <this repo>
cd 33talk
docker compose up --build -d
```

Open `http://<your-server>:16001`. That is the whole deployment.

The first build downloads the model — 429 MB, a few minutes. Nothing is
downloaded at boot, and nothing is downloaded on later builds unless you
change the model.

**In mainland China, or anywhere `huggingface.co` is unreachable**, build
through a mirror:

```sh
docker compose build --build-arg HF_HOST=https://hf-mirror.com
docker compose up -d
```

### Configuration

There is none by default. Everything below is optional — copy
`.env.example` to `.env` only if you need one of them.

| | | |
|---|---|---|
| `PORT` | `16001` | Published port. Change if 16001 is taken |
| `MODEL_REPO` | `ggml-org/Qwen3-0.6B-GGUF` | HuggingFace repo |
| `MODEL_FILE` | `Qwen3-0.6B-Q4_0.gguf` | File within it |
| `HF_HOST` | `https://huggingface.co` | Set to `https://hf-mirror.com` behind the GFW |

Changing the model is a rebuild, not a restart:
`docker compose build llm && docker compose up -d`.

### Day to day

| | |
|---|---|
| Logs | `docker compose logs -f` |
| Stop | `docker compose down` |
| Update after a `git pull` | `docker compose up --build -d` |
| Rebuild the front end only | `docker compose build web` — seconds, the model layer is cached |

### Troubleshooting

**Port already in use.** `echo "PORT=16005" > .env` and `docker compose up -d`.

**The build stalls or resets while downloading the model.** It resumes:
the download uses `curl -C -` inside a retry loop, and verifies the finished
size against what the server advertised. If it fails ten times, use the
mirror above.

**`llama-server` exits immediately with `cannot open shared object file`.**
Something changed the container's working directory. It must stay `/app` —
the loader finds the `.so` files relative to it, and the error names a
missing library rather than the real cause.

**Linux: `host.docker.internal` does not resolve.** Only relevant if you
point the app at an inference server running on the host instead of the one
in Compose. `compose.yml` already carries the `extra_hosts` entry that fixes
it; without it you get a connection failure with no useful error.

### How it fits together

```
browser --> nginx :16001 --+-- /       --> web/ (static files)
                           +-- /v1/... --> llama-server :16002
```

Two containers. Same origin, so the browser never makes a cross-origin
request and CORS never enters the picture. There is no backend code — nginx
is configuration, not a program. **`llama-server` is not published to the
host**: the only way in is through the `/v1` proxy.

| image | size | |
|---|---|---|
| `33talk-web` | 48 MB | nginx + `web/` |
| `33talk-llm` | 555 MB | llama-server (39 MB) + model (429 MB) on `ubuntu:24.04` |

**The model is baked into the image.** That reverses the usual advice, and
it is affordable only because the model is tiny. The blind test is worthless
if the LLM half is missing, so a deploy that boots and then spends minutes
downloading is the worse trade.

The upstream `llama.cpp:server` image is 845 MB, of which the binaries are
39 MB and the rest is a build environment. A multi-stage build takes the 39
MB onto a plain `ubuntu:24.04` and drops the image from 1.27 GB to 555 MB.
It has to be `ubuntu:24.04` specifically — `debian:12-slim` is the same size
but two glibc versions older, and fails at load with `GLIBC_2.38 not found`.

`llama-server` can also serve a static directory itself (`--path`, verified
against the binary; `--cors-origins` defaults to `*`), so a single-process
deployment is possible. The two-service split is kept because it leaves the
inference container replaceable.

---

## What this is not

- **Not a Model 33 emulator.** [`Random832/ttyemu`](https://github.com/Random832/ttyemu),
  `hughpyle/ttyemu`, `progs-n-things/asr33emu` and the PDP-8/E simulator
  already do that, better, with paper tape and serial backends. Feature parity
  with them is explicitly not a goal.
- **Not a terminal.** There is no shell, no PTY, no SSH.
- **Not a chat UI with a retro skin.**

"AI on a teletype" is not novel — `m15-ai/Paper-Tape-LLM` does it, and
hughpyle has run an LLM on a real ASR-33. **The 1966-versus-2026 blind test
is.**

---

## Licence

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

ELIZA's original source is CC0 / public domain — see [docs/eliza.md](docs/eliza.md).

"Teletype" is a trademark, which is why this project is called 33talk and not
teletype-anything.
