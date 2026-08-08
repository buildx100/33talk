/* The ASR-33 keyboard: layout data, DOM, and the press animation.

   UNVERIFIED, and worth saying so out loud:

   - The control-code legends W=ETB, R=DC2, Y=EM, O=SI, P=DLE were derived
     from the ASCII table, not read off a photograph. G=BELL, H=BS, I=TAB,
     M=CR, D=EOT and K=VT *are* legible in reference photographs.
   - Which row HERE IS / RUB OUT / REPT / BREAK belong to. Machines of this
     era were often ex-lease units with varying configurations.
   - The row stagger. Measured off a low-resolution photograph, then adjusted
     by eye.

   pad and sep are in KEY PITCHES (--pitch = --key + --gap), not key widths.
   Using --key makes every step about 15% short. */

export const ROWS = [
  { pad: 0.63, keys: [
    { up: '!', lo: '1', k: '1' }, { up: '"', lo: '2', k: '2' }, { up: '#', lo: '3', k: '3' },
    { up: '$', lo: '4', k: '4' }, { up: '%', lo: '5', k: '5' }, { up: '&', lo: '6', k: '6' },
    { up: "'", lo: '7', k: '7' }, { up: '(', lo: '8', k: '8' }, { up: ')', lo: '9', k: '9' },
    { up: '', lo: '0', k: '0' }, { up: '*', lo: ':', k: ':' }, { up: '=', lo: '-', k: '-' },
    { lo: 'HERE\nIS', cls: 'tiny' }
  ] },
  { pad: 0.00, keys: [
    { lo: 'ESC', cls: 'tiny' },
    { lo: 'Q', k: 'Q', ctl: 'DC1' }, { lo: 'W', k: 'W', ctl: 'ETB' }, { lo: 'E', k: 'E', ctl: 'WRU' },
    { lo: 'R', k: 'R', ctl: 'DC2' }, { lo: 'T', k: 'T', ctl: 'DC4' }, { lo: 'Y', k: 'Y', ctl: 'EM' },
    { lo: 'U', k: 'U', ctl: 'NAK' }, { lo: 'I', k: 'I', ctl: 'TAB' }, { lo: 'O', k: 'O', ctl: 'SI' },
    // @ is SHIFT+P. It is not its own key -- Ray Tomlinson picked it off
    // this keyboard in 1971 precisely because nothing else was using it.
    { up: '@', lo: 'P', k: 'P' },
    // Two separate keys, two separate mechanical actions. This is why \r and
    // \n are two characters, and why Windows still writes both.
    { lo: 'LINE\nFEED', cls: 'tiny' }, { lo: 'RE-\nTURN', cls: 'tiny', k: '\n' }
  ] },
  { pad: 0.24, keys: [
    { lo: 'CTRL', cls: 'tiny' },
    { lo: 'A', k: 'A', ctl: 'SOH' }, { lo: 'S', k: 'S', ctl: 'DC3' }, { lo: 'D', k: 'D', ctl: 'EOT' },
    { lo: 'F', k: 'F', ctl: 'ACK' }, { lo: 'G', k: 'G', ctl: 'BELL' }, { lo: 'H', k: 'H', ctl: 'BS' },
    { lo: 'J', k: 'J', ctl: 'LF' }, { lo: 'K', k: 'K', ctl: 'VT' }, { lo: 'L', k: 'L', ctl: 'FF' },
    { up: '+', lo: ';', k: ';' },
    // RUB OUT is DEL, for punching out tape holes. It is NOT a backspace.
    { lo: 'RUB\nOUT', cls: 'tiny', k: '\b' },
    { lo: 'REPT', cls: 'tiny', sep: 0.45 },
    { lo: 'BREAK', cls: 'tiny' }
  ] },
  { pad: 0.66, keys: [
    { lo: 'SHIFT', cls: 'tiny', k: 'SHIFT' },
    { lo: 'Z', k: 'Z', ctl: 'SUB' }, { lo: 'X', k: 'X', ctl: 'CAN' }, { lo: 'C', k: 'C', ctl: 'ETX' },
    { lo: 'V', k: 'V', ctl: 'SYN' }, { lo: 'B', k: 'B', ctl: 'STX' }, { lo: 'N', k: 'N', ctl: 'SO' },
    { lo: 'M', k: 'M', ctl: 'CR' },
    { up: '<', lo: ',', k: ',' }, { up: '>', lo: '.', k: '.' }, { up: '?', lo: '/', k: '/' },
    { lo: 'SHIFT', cls: 'tiny', k: 'SHIFT' }
  ] },
  { pad: 4.44, keys: [{ cls: 'space', k: ' ' }] }
];

/* Which unshifted key produces a given shifted character, so the animation
   can light the base key AND both SHIFT caps. */
export const SHIFTED = {
  '!': '1', '"': '2', '#': '3', '$': '4', '%': '5', '&': '6', "'": '7',
  '(': '8', ')': '9', '*': ':', '=': '-', '+': ';',
  '<': ',', '>': '.', '?': '/', '@': 'P'
};

const keyMap = {};

export function build(kb) {
  ROWS.forEach(row => {
    const r = document.createElement('div'); r.className = 'krow';
    r.style.marginLeft = 'calc(var(--pitch) * ' + row.pad + ')';
    row.keys.forEach(def => {
      const el = document.createElement('div');
      el.className = 'key' + (def.cls ? ' ' + def.cls : '') + (def.ctl ? ' hasctl' : '');
      if (def.sep) el.style.marginLeft = 'calc(var(--pitch) * ' + def.sep + ')';
      if (def.ctl) { const c = document.createElement('span'); c.className = 'ctlx'; c.textContent = def.ctl; el.appendChild(c); }
      if (def.up !== undefined) { const u = document.createElement('span'); u.className = 'up'; u.textContent = def.up; el.appendChild(u); }
      if (def.lo !== undefined) { const l = document.createElement('span'); l.className = 'lo'; l.innerHTML = (def.lo || '').replace(/\n/g, '<br>'); el.appendChild(l); }
      if (def.k) { (keyMap[def.k] = keyMap[def.k] || []).push(el); }
      r.appendChild(el);
    });
    kb.appendChild(r);
  });
  return keyMap;
}

export function press(ch) {
  const targets = [];
  const base = SHIFTED[ch];
  if (base) {
    if (keyMap[base]) targets.push(...keyMap[base]);
    if (keyMap['SHIFT']) targets.push(...keyMap['SHIFT']);
  } else if (keyMap[ch]) targets.push(...keyMap[ch]);
  targets.forEach(el => {
    el.classList.add('down');
    setTimeout(() => el.classList.remove('down'), 95);
  });
}
