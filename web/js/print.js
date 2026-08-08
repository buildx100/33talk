import { COLS } from './config.js';

/* A separate, print-only DOM. One roll per page.

   No `ch` units anywhere: they re-resolve against the print font and the
   columns drift. Each line is rebuilt as a plain white-space:pre text run,
   with overstruck cells as inline-block spans carrying absolutely positioned
   overlays. Zero coordinate maths. */

function tearSVG(down) {
  const W = 200, H = 6, teeth = 46, step = W / teeth;
  const base = down ? 0 : H;
  const tip  = down ? H : 0;
  let d = 'M0,' + base;
  for (let i = 0; i < teeth; i++) {
    const y = (tip + (Math.random() * 1.4 - 0.7)).toFixed(2);
    d += ' L' + ((i + 0.5) * step).toFixed(2) + ',' + y
       + ' L' + ((i + 1) * step).toFixed(2) + ',' + base;
  }
  // A stroked path, not a background: browsers do not print background
  // colours unless the user ticks a box.
  return '<svg class="tear" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
         '<path d="' + d + '" fill="none" stroke="#2A2118" stroke-width="0.5"/></svg>';
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function lineHTML(cells) {
  let last = -1;
  for (let i = 0; i < COLS; i++) if (cells[i]) last = i;
  if (last < 0) return '&nbsp;';
  let out = '', run = '';
  for (let i = 0; i <= last; i++) {
    const c = cells[i];
    if (!c) { run += ' '; continue; }
    if (c.length === 1) { run += c; continue; }
    out += esc(run); run = '';
    out += '<span class="ov">' + esc(c[0]);
    for (let k = 1; k < c.length; k++) out += '<i>' + esc(c[k]) + '</i>';
    out += '</span>';
  }
  return out + esc(run);
}

function stamp() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
         '  ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function pad72(l, r) {
  const gap = Math.max(1, COLS - l.length - r.length);
  return l + ' '.repeat(gap) + r;
}

/* info: { guessed, hostIdFor(i), score:{ok,bad} } -- passed in rather than
   imported, so this file never learns anything about the game. */
export function buildPrintout(target, machines, info) {
  let html = '';
  machines.forEach((m, i) => {
    if (i > 0) html += '<div class="pagebreak"></div>';   // one roll per page
    html += '<div class="psheet">' + tearSVG(false) + '<div class="pbody">';
    html += '<div class="pmeta">' +
            esc(pad72('TELETYPE MODEL 33 ASR   TERMINAL ' + m.tag, stamp())) +
            '</div><div class="prule"></div>';
    m.lines.forEach(cells => { html += '<div class="pline">' + lineHTML(cells) + '</div>'; });
    if (info.guessed) {
      html += '<div class="prule"></div><div class="pmeta">' +
              esc(pad72('TERMINAL ' + m.tag + ' WAS ' + info.hostIdFor(i),
                        'SCORE ' + info.score.ok + ' / ' + info.score.bad)) +
              '</div>';
    }
    html += '</div>' + tearSVG(true) + '</div>';
  });
  target.innerHTML = html;
}
