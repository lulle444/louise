// ============================================================
// SFX — chunky 8-bit / Minecraft-flavoured sound synth via the
// Web Audio API. No audio files: tones are oscillators, and the
// satisfying "block" sounds are filtered white-noise bursts, so
// it stays offline and copyright-free. Call unlock() on first input.
// ============================================================

let ctx = null, master = null, noiseBuf = null;
function ac() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  return ctx;
}
export function unlock() { const c = ac(); if (c && c.state === 'suspended') c.resume(); startMusic(); }

let muted = false;
export function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.85; return muted; }

const out = () => master || (ac() && ac().destination);

// pitched oscillator with an exponential decay; optional pitch slide + start delay
function tone(freq, dur, type = 'square', vol = 0.12, slideTo = 0, delay = 0) {
  const c = ac(); if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(out()); o.start(t0); o.stop(t0 + dur + 0.02);
}

// filtered white-noise burst — the "chunky" block-break / impact body
function getNoise(c) {
  if (noiseBuf) return noiseBuf;
  const n = (c.sampleRate * 0.5) | 0; noiseBuf = c.createBuffer(1, n, c.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
function noise(dur, freq, q, vol, type = 'lowpass', delay = 0) {
  const c = ac(); if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource(); src.buffer = getNoise(c);
  const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(out()); src.start(t0); src.stop(t0 + dur + 0.02);
}
function seq(notes) { notes.forEach(([f, d, t, v], i) => tone(f, d, t || 'square', v || 0.12, 0, i * 0.085)); }

export const SFX = {
  // woody double-thock (axe on wood)
  chop()   { noise(0.09, 360, 1.3, 0.17, 'lowpass'); tone(150, 0.08, 'triangle', 0.1, 88);
             noise(0.07, 300, 1.3, 0.12, 'lowpass', 0.075); tone(120, 0.06, 'triangle', 0.08, 78, 0.075); },
  // gritty stone crack (pickaxe on rock)
  mine()   { noise(0.13, 1700, 0.7, 0.17, 'bandpass'); tone(92, 0.1, 'square', 0.1, 58);
             noise(0.06, 2600, 0.6, 0.08, 'highpass', 0.045); },
  // punchy combat hit
  hit()    { noise(0.07, 850, 0.9, 0.14, 'lowpass'); tone(300, 0.07, 'square', 0.09, 150); },
  throw()  { tone(380, 0.13, 'sine', 0.1, 760); },
  catch()  { seq([[523, 0.1], [659, 0.1], [784, 0.16, 'triangle', 0.13]]); },
  fail()   { tone(240, 0.22, 'sawtooth', 0.11, 100); noise(0.12, 480, 0.6, 0.06, 'lowpass'); },
  pickup() { tone(740, 0.06, 'square', 0.09, 1080); tone(1080, 0.05, 'square', 0.06, 0, 0.05); },
  // crunchy two-bite chew
  eat()    { noise(0.06, 1200, 0.9, 0.12, 'bandpass'); noise(0.06, 1000, 0.9, 0.1, 'bandpass', 0.09); },
  craft()  { tone(420, 0.06, 'square', 0.1); tone(620, 0.08, 'square', 0.09, 0, 0.06); noise(0.05, 800, 1, 0.06, 'lowpass'); },
  quest()  { seq([[392, 0.11], [523, 0.11], [659, 0.11], [880, 0.18, 'triangle', 0.13]]); },
  // deep block-placement thud
  build()  { noise(0.13, 260, 1.6, 0.18, 'lowpass'); tone(108, 0.12, 'triangle', 0.12, 68); },
  click()  { tone(520, 0.04, 'square', 0.06); },
  shiny()  { seq([[784, 0.09], [988, 0.09], [1319, 0.14, 'triangle', 0.11]]); },
  levelup(){ seq([[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.2, 'triangle', 0.13]]); },
  // "oof" — soft thud + downward groan
  hurt()   { noise(0.14, 420, 1, 0.16, 'lowpass'); tone(220, 0.18, 'sawtooth', 0.12, 90); },
  // 8-bit game-over: descending notes + a low thud
  death()  { seq([[523, 0.14], [392, 0.15], [311, 0.16], [233, 0.34, 'sawtooth', 0.14]]); noise(0.3, 300, 1.1, 0.16, 'lowpass', 0.18); tone(120, 0.32, 'triangle', 0.1, 70, 0.18); },
  select() { tone(620, 0.06, 'square', 0.09, 880); },
  // shimmering evolve sweep
  evolve() { for (let i = 0; i < 5; i++) tone(440 + i * 110, 0.18, 'triangle', 0.09, 660 + i * 130, i * 0.06); noise(0.3, 2600, 0.5, 0.05, 'highpass', 0.1); },
  // rising chain blip — pitch climbs with the combo count
  combo(n = 1) { const f = 520 + Math.min(20, n) * 45; tone(f, 0.07, 'square', 0.09, f * 1.3); tone(f * 1.5, 0.05, 'square', 0.05, 0, 0.05); },
  // bright coin "cha-ching"
  coin() { tone(988, 0.06, 'square', 0.08, 1319); tone(1319, 0.1, 'square', 0.07, 0, 0.05); },
  // egg crack → hatch sparkle
  egg() { noise(0.08, 900, 1.1, 0.12, 'lowpass'); seq([[659, 0.09], [880, 0.09], [1175, 0.16, 'triangle', 0.12]]); },
  // ominous boss horn
  boss() { tone(110, 0.5, 'sawtooth', 0.16, 70); tone(146, 0.5, 'sawtooth', 0.12, 92, 0.04); noise(0.5, 200, 1.4, 0.12, 'lowpass', 0.05); tone(220, 0.4, 'square', 0.08, 110, 0.2); },
  // triumphant daily/streak fanfare
  daily() { seq([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.12], [1319, 0.24, 'triangle', 0.14]]); },
  // deep prestige gong + rising shimmer
  prestige() { tone(98, 0.7, 'sine', 0.18, 196); for (let i = 0; i < 6; i++) tone(392 + i * 130, 0.3, 'triangle', 0.08, 0, 0.08 + i * 0.07); },
  // sparkly "perfect" reveal
  perfect() { seq([[784, 0.08], [1047, 0.08], [1319, 0.08], [1568, 0.2, 'triangle', 0.13]]); noise(0.3, 3200, 0.5, 0.05, 'highpass', 0.05); },
};

// ============================================================
// Ambient 8-bit survival music — a gentle, endlessly-looping
// chiptune at low volume. Generative (no files); starts on the
// first user interaction via unlock().
// ============================================================
let musicOn = false, musicTimer = null, musicGain = null, musicStep = 0;
// calm minor-key loop: Am – F – C – G (root bass + soft triangle arpeggio)
const PROG = [
  { bass: 110.00, notes: [220.00, 261.63, 329.63, 261.63] }, // Am
  { bass: 87.31,  notes: [174.61, 220.00, 261.63, 220.00] }, // F
  { bass: 130.81, notes: [261.63, 329.63, 392.00, 329.63] }, // C
  { bass: 98.00,  notes: [196.00, 246.94, 293.66, 246.94] }, // G
];
function mnote(freq, dur, vol, delay, type = 'triangle') {
  const c = ac(); if (!c || !musicGain) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.05);     // soft attack
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);   // gentle release
  o.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + dur + 0.03);
}
function musicTick() {
  if (!musicOn) return;
  const ch = PROG[musicStep % PROG.length];
  mnote(ch.bass, 1.9, 0.5, 0, 'triangle');                 // bass
  mnote(ch.bass * 2, 1.8, 0.16, 0, 'sine');                // soft octave pad
  for (let i = 0; i < 4; i++) mnote(ch.notes[i % ch.notes.length], 0.5, 0.22, i * 0.5 + 0.04, 'triangle'); // arpeggio
  musicStep++;
  musicTimer = setTimeout(musicTick, 2000);                // ~2s per bar — calm pace
}
export function startMusic() {
  const c = ac(); if (!c || musicOn) return;
  if (!musicGain) { musicGain = c.createGain(); musicGain.gain.value = 0.06; musicGain.connect(out()); } // low, comfortable volume
  musicOn = true; musicStep = 0; musicTick();
}
export function stopMusic() { musicOn = false; if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; } }
export function toggleMusic() { if (musicOn) stopMusic(); else startMusic(); return musicOn; }
