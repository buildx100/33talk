export const en = {
  lblSpeed: 'SPEED', cps10: '10 CPS REAL', cps30: '30 CPS', cps120: '120 CPS',
  lblSound: 'SOUND', btnSound: 'SOUND ON', btnMotor: 'MOTOR HUM', btnBell: 'BELL ♪',
  lblMachine: 'MACHINE', btnTear: 'TEAR OFF', btnShuffle: 'RESHUFFLE',
  lblAux: 'AUX', btnReveal: 'REVEAL A / B', btnHelp: 'HOW TO PLAY ?',
  btnCheat: 'CHEAT PANEL', btnPrint: 'PRINT ⎙',
  volume: 'Volume', hostRx: 'HOST RECEIVED', unknown: '? ? ?',
  btnGotIt: 'GOT IT',
  score: 'correct / wrong',
  guessTitle: 'WHICH IS WHICH ?',
  guessPrompt: 'Commit before you see the answer. Your call is recorded.',
  guessA: 'A = ELIZA    ·    B = LLM',
  guessB: 'A = LLM    ·    B = ELIZA',
  verdictRight: 'CORRECT',
  verdictWrong: 'WRONG',
  actual: 'A was {a} and B was {b}.',
  modalTitle: 'TWO MODEL 33s, ONE KEYBOARD',
  modalBody:
    '<p>One keyboard feeding two terminals was a real wiring arrangement in the ' +
    'timesharing era. <b>Every key you press reaches both computers, and both ' +
    'machines print it back.</b></p>' +
    '<p>Which side is which is <b>decided at random on every boot</b>. The paper ' +
    'only says A and B. Press REVEAL when you are ready to commit to a guess — ' +
    'you have to call it before the answer appears, and the tally in the top ' +
    'right keeps score.</p>' +
    '<div class="rule"></div>' +
    '<p><b>Both start on the same frame and run at exactly the same speed.</b> ' +
    'The faster host is held back until the slower one is ready — otherwise ' +
    'whichever answered first would give the game away. For the same reason ' +
    'both hosts end every reply with the same READY prompt: any difference in ' +
    'how they format output, however small, would be a tell.</p>' +
    '<p>With headphones: <b>A is in the left channel, B in the right.</b> One ' +
    'machine finishes and falls silent while the other is still hammering away.</p>' +
    '<div class="rule"></div>' +
    '<p><b>PRINT</b> gives you the rolls themselves, one page each, at the real ' +
    'geometry: 8.44 inch paper, ten characters per inch, six lines per inch, ' +
    'torn top and bottom. <b>Ink does not come off, so print it and keep it.</b></p>' +
    '<div class="rule"></div>' +
    '<p><b>About the bell.</b> The real machine has a physical bell. It rings at ' +
    'column 65 to warn the typist the line is running out — column 72 does not ' +
    'wrap, it overstrikes into a smear. <b>The computer can also ring it by ' +
    'sending ASCII 0x07.</b> That is where the terminal beep comes from, and why ' +
    'the G keycap is stamped BELL and Ctrl+G rings.</p>' +
    '<p><b>About language.</b> The language buttons only change the interface. ' +
    '<b>The paper is always English</b> — the type drum has 64 uppercase ASCII ' +
    'characters and nothing else.</p>' +
    '<div class="rule"></div>' +
    '<p>Type <b>PASSWORD</b> and press return. Both computers stop echoing. You ' +
    'keep typing and nothing appears on either roll.</p>' +
    '<p>Type <b>HELLO###P</b> and press return. There is no backspace key. ' +
    '<b>#</b> erases one character and <b>@</b> kills the line, but both of them ' +
    'print. The paper keeps an honest record of every mistake you made.</p>' +
    '<p><b>@ is not its own key — it is SHIFT+P.</b> Ray Tomlinson picked it off ' +
    'this keyboard in 1971.</p>' +
    '<p><b>ELIZA is the real thing.</b> It runs the DOCTOR script exactly as ' +
    'published in the January 1966 CACM paper, ranked keywords and all. It even ' +
    'remembers: mention something about your mother, wander off, say something ' +
    'it cannot parse at all, and watch it come back to her.</p>' +
    '<p><b>The other machine is a language model running on this server</b> ' +
    '-- qwen3, 0.6B, four-bit. Both hosts are told the same thing: be a ' +
    'therapist, keep it to one short sentence. Neither is told to imitate the ' +
    'other. Sixty years apart, same job, same paper.</p>'
};
