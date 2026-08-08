# The machine

Why the Model 33 behaves the way it does, and which parts of that behaviour
are still in your terminal today.

---

## 72 columns

`terminfo(5)` uses this machine as its worked example, and the entry is:

```
33|tty33|tty|model 33 teletype,
    bel=^G, cols#72, cr=^M, cud1=^J, hc, ind=^J, os,
```

`cols#72` is the number. `hc` is *hardcopy*: there is no cursor to move,
because the output is ink on paper. `os` is *overstrike*: printing over an
existing character does not replace it, it adds to it.

Both capabilities are implemented here, and both are why several "obvious"
terminal features are missing rather than unimplemented.

## No auto-wrap

At column 72 the carriage stops. It does not advance and it does not wrap.
Every further character strikes on top of the last one until you send a
carriage return, and what you get is a smear.

This is why **wrapping is the host's job**. A program that wanted 72-column
output had to count columns itself and emit CR/LF, and that responsibility
never really went away — it moved into the terminal driver and then into
libraries, but somebody is still counting.

In this codebase the machine deliberately does not wrap:

```js
if (m.carriage >= COLS) m.carriage = COLS - 1;
```

That looks like an off-by-one. It is the overstrike behaviour.

## CR and LF are two keys

`RETURN` returns the carriage. `LINE FEED` advances the platen by one line.
They are two separate mechanical actions performed by two separate keys, so
they are two separate characters.

Every "why does Windows use CRLF" argument traces back to this. CRLF is not a
Microsoft invention; it is what the hardware required. Unix decided the driver
should expand one character into both, and that decision is what a modern
`\n` actually is.

## Carriage return takes time

The head has to physically travel back. On a Model 33 that is up to about a
fifth of a second from the far end of the line — many character times at 110
baud. Anything the host sent during the return was lost, so hosts padded
after CR with NUL characters to burn the time.

Here the return is animated over a duration proportional to the column, and
the print queue is stalled for the equivalent number of character slots:

```js
const ms = charMs() + Math.min(m.carriage, COLS) * charMs() * 0.06;
m.wait = Math.max(0, Math.round(ms / charMs()) - 1);
```

`stty` still has knobs for this era of problem.

## No backspace

There is no backspace key. There is no way to move the head backwards at all.

`RUB OUT` is not backspace — it is DEL, 0x7F, all seven bits punched. It
exists so that a mistake on **paper tape** can be corrected: you back the tape
up and punch out every remaining hole, and the reader ignores the result.

So how did you correct a typing mistake? The line discipline did it, and it
did it with printable characters:

- `#` erases the previous character
- `@` kills the whole line

Both of them **print**, because there is no way not to print them. The paper
therefore keeps an honest record of every mistake you made. `stty erase` and
`stty kill` are the direct descendants, and the defaults only changed to
`^H`/`^U` once terminals had screens.

## The bell

There is a physical bell in the machine. It rings near the end of the line —
column 65 here — to warn the typist that the carriage is running out, because
column 72 will not wrap, it will smear.

The computer can also ring it by sending ASCII 0x07. That is why the `G`
keycap is stamped `BELL`, why `Ctrl+G` rings, and why your terminal beeps.
`bel=^G` in the terminfo entry above is the same bell.

Muting the bell in this implementation also disables the lamp, because the
lamp is only a stand-in for the sound — leaving it lit would be a visual tell
where the real machine had none.

## 64 characters, uppercase only

The type drum carries 64 glyphs: ASCII 0x20 (space) through 0x5F
(underscore). There is no lowercase, no backtick, no braces, no tilde.

This is not a limitation of the software. It is the shape of a metal drum.
It is also why `format.js` filters host output in code rather than asking a
model nicely: the machine physically cannot print what it does not carry.

## `@` is SHIFT+P

`@` has no key of its own on this keyboard. It is the shifted `P`.

In 1971 Ray Tomlinson needed a character to separate a user name from a host
name that could not appear in either. He picked `@` off this keyboard,
largely because nothing else was using it.

## The paper geometry

- 8.44 inch roll paper
- 10 characters per inch
- 6 lines per inch

72 characters at 10 CPI is 7.2 inches of type, which is exactly what is left
of 8.44 inches after the margins. The print stylesheet derives its type size
from that chain rather than choosing one:

```
8.44in page
- 0.30in @page margin x2  = 7.84in sheet
- 0.32in body padding x2  = 7.20in of type = 72 chars at 10 CPI
```

12pt Courier *is* 10 CPI, so the font size falls out of the paper width, and
12pt line height is 6 lines per inch. Change one number and the whole chain
breaks.

---

## Uncertain

Stated here rather than asserted in the code, because several "obvious"
details turned out to be wrong during the prototype — including which
direction the paper moves.

- The control-code keycap legends `W=ETB`, `R=DC2`, `Y=EM`, `O=SI`, `P=DLE`
  were derived from the ASCII table, not read off a photograph. `G=BELL`,
  `H=BS`, `I=TAB`, `M=CR`, `D=EOT` and `K=VT` **are** legible in reference
  photographs.
- Which row `HERE IS`, `RUB OUT`, `REPT` and `BREAK` belong to. Machines of
  this era were frequently ex-lease units with varying configurations.
- The keyboard row stagger. Measured off a low-resolution photograph and then
  adjusted by eye. The values live in `ROWS[].pad` in `keyboard.js`, in **key
  pitches** (`--pitch` = key + gap), not key widths.

Corrections welcome, ideally with a photograph.
