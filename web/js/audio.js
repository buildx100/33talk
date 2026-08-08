/* Everything synthesised live: no samples, no external files.
   The context is created lazily, because browsers refuse to start one
   without a user gesture. */

export const Audio = (function () {
  let ctx = null, master = null, noiseBuf = null;
  // The motor starts OFF. The real machine hums the whole time it is
  // powered, but an unprompted drone the moment the page loads reads as a
  // fault rather than as a machine. MOTOR HUM switches it on.
  let on = true, motorOn = false, bellOn = true, vol = 0.7;
  const voices = [];

  function init() {
    if (ctx) return true;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
    master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination);
    const n = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, n, n);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    voices.forEach(v => v._attach());
    return true;
  }
  function resume() { if (!ctx) { init(); return; } if (ctx.state === 'suspended') ctx.resume(); }
  function noiseSrc() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }

  /* One voice per machine. The pan is what puts A in the left ear and B in
     the right; the motor frequencies are deliberately a fraction of a hertz
     apart so the two hums beat against each other like two real machines
     on the same bench. */
  function makeVoice(pan, motorHz) {
    const v = {
      out: null, motorBus: null,
      _attach() {
        if (!ctx || v.out) return;
        v.out = ctx.createGain(); v.out.gain.value = 1;
        if (ctx.createStereoPanner) {
          const p = ctx.createStereoPanner(); p.pan.value = pan;
          v.out.connect(p); p.connect(master);
        } else v.out.connect(master);
        if (on && motorOn) v.motorStart();
      },
      burst(o) {
        if (!on || !ctx || !v.out) return;
        const t = ctx.currentTime + (o.at || 0);
        const s = noiseSrc();
        if (o.rate) s.playbackRate.value = o.rate;
        const f = ctx.createBiquadFilter(); f.type = o.type; f.Q.value = o.q || 1;
        if (o.sweepTo) {
          f.frequency.setValueAtTime(o.freq, t);
          f.frequency.exponentialRampToValueAtTime(o.sweepTo, t + o.dur * 0.9);
        } else f.frequency.value = o.freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(o.amp, t + (o.attack || 0.001));
        g.gain.exponentialRampToValueAtTime(0.0004, t + o.dur);
        s.connect(f); f.connect(g); g.connect(v.out);
        s.start(t, Math.random() * 0.9); s.stop(t + o.dur + 0.02);
      },
      strike(isSpace) {
        // A space does not fire the type hammer, so it is much softer.
        if (isSpace) {
          v.burst({ type: 'bandpass', freq: 900 + Math.random() * 300, q: 1.4, amp: 0.14, dur: 0.03 });
          return;
        }
        v.burst({ type: 'bandpass', freq: 1900 + Math.random() * 900, q: 1.1, amp: 0.42 + Math.random() * 0.12, dur: 0.024, rate: 0.9 + Math.random() * 0.3 });
        v.burst({ type: 'lowpass', freq: 250 + Math.random() * 70, q: 4.5, amp: 0.30, dur: 0.055 });
      },
      feed() {
        v.burst({ type: 'bandpass', freq: 760, sweepTo: 420, q: 2.2, amp: 0.26, dur: 0.075, attack: 0.006 });
        v.burst({ type: 'lowpass', freq: 200, q: 3, amp: 0.14, dur: 0.05, at: 0.055 });
      },
      carriage(ms) {
        // The whine of the head travelling, then the thump as it hits home.
        const d = Math.max(0.07, ms / 1000);
        v.burst({ type: 'bandpass', freq: 2500, sweepTo: 620, q: 0.8, amp: 0.20, dur: d, attack: 0.02 });
        v.burst({ type: 'lowpass', freq: 170, q: 6, amp: 0.46, dur: 0.10, at: d * 0.86 });
      },
      bell() {
        if (!on || !bellOn || !ctx || !v.out) return;
        const t = ctx.currentTime;
        // Inharmonic partials: a struck bell, not a sine beep.
        [[1180, 0.34, 0.95], [1792, 0.16, 0.5], [2470, 0.09, 0.38], [3320, 0.05, 0.28]].forEach(([f, a, dec], i) => {
          const o = ctx.createOscillator();
          o.type = i === 0 ? 'triangle' : 'sine';
          o.frequency.value = f * (0.997 + Math.random() * 0.006);
          const g = ctx.createGain();
          g.gain.setValueAtTime(a, t);
          g.gain.exponentialRampToValueAtTime(0.0004, t + dec);
          o.connect(g); g.connect(v.out);
          o.start(t); o.stop(t + dec + 0.05);
        });
        v.burst({ type: 'highpass', freq: 3200, q: 0.7, amp: 0.2, dur: 0.018 });
      },
      motorStart() {
        if (!ctx || !v.out || v.motorBus) return;
        const t = ctx.currentTime;
        const bus = ctx.createGain();
        bus.gain.setValueAtTime(0.0001, t);
        bus.gain.exponentialRampToValueAtTime(0.045, t + 0.7);
        bus.connect(v.out); bus._parts = [];
        [[motorHz, 0.55], [motorHz * 2, 0.30], [motorHz * 3, 0.13], [motorHz * 4.97, 0.05]].forEach(([f, a]) => {
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f * 2.4; lp.Q.value = 0.7;
          const g = ctx.createGain(); g.gain.value = a;
          o.connect(lp); lp.connect(g); g.connect(bus);
          o.start(t); bus._parts.push(o);
        });
        const s = noiseSrc();
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 880; bp.Q.value = 0.55;
        const g = ctx.createGain(); g.gain.value = 0.05;
        s.connect(bp); bp.connect(g); g.connect(bus);
        s.start(t); bus._parts.push(s);
        v.motorBus = bus;
      },
      motorStop() {
        if (!v.motorBus || !ctx) return;
        const t = ctx.currentTime, bus = v.motorBus, parts = bus._parts;
        v.motorBus = null;
        bus.gain.cancelScheduledValues(t);
        bus.gain.setValueAtTime(bus.gain.value, t);
        bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        parts.forEach(p => { try { p.stop(t + 0.5); } catch (e) { } });
        setTimeout(() => { try { bus.disconnect(); } catch (e) { } }, 700);
      }
    };
    voices.push(v);
    if (ctx) v._attach();
    return v;
  }

  // The key click happens under your finger, so it is not panned to either
  // machine -- it goes straight to the master bus.
  function keyclick() {
    if (!on || !ctx) return;
    const t = ctx.currentTime;
    [[2600 + Math.random() * 700, 'bandpass', 2.2, 0.13, 0.014],
     [420, 'lowpass', 2, 0.09, 0.026]].forEach(([f, ty, q, amp, dur]) => {
      const s = noiseSrc();
      const bq = ctx.createBiquadFilter(); bq.type = ty; bq.frequency.value = f; bq.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp, t + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
      s.connect(bq); bq.connect(g); g.connect(master);
      s.start(t, Math.random() * 0.9); s.stop(t + dur + 0.02);
    });
  }

  return {
    init, resume, makeVoice, keyclick,
    // Muting the bell also kills the lamp: the lamp is a stand-in for a
    // sound, so it must not survive the sound being switched off.
    bellAudible() { return on && bellOn; },
    setOn(v) {
      on = v;
      if (!v) voices.forEach(x => x.motorStop());
      else { init(); if (motorOn) voices.forEach(x => x.motorStart()); }
    },
    setMotor(v) { motorOn = v; if (!ctx) return; (v && on) ? voices.forEach(x => x.motorStart()) : voices.forEach(x => x.motorStop()); },
    setBell(v) { bellOn = v; },
    setVol(v) { vol = v; if (master) master.gain.value = v; }
  };
})();
