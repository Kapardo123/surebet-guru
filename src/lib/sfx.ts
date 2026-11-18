/**
 * Tiny sound effects synthesised with Web Audio (no audio files shipped).
 * Off switch lives in Account > Settings; the choice is kept on this device.
 */
type Sfx = "rustle" | "rip" | "whoosh" | "flip" | "chime" | "stamp" | "coin";

const KEY = "gsb_sound";
let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

export const soundEnabled = () => {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
};
export const setSoundEnabled = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* storage unavailable */
  }
};

const audio = () => {
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
};

const noise = (c: AudioContext) => {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  return src;
};

const env = (c: AudioContext, g: GainNode, t0: number, peak: number, attack: number, decay: number) => {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
};

const tone = (c: AudioContext, freq: number, t0: number, dur: number, peak: number, type: OscillatorType = "sine") => {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  env(c, g, t0, peak, 0.005, dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
};

const filteredNoise = (
  c: AudioContext,
  t0: number,
  dur: number,
  peak: number,
  type: BiquadFilterType,
  from: number,
  to: number,
  q = 1,
) => {
  const src = noise(c);
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t0);
  f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = c.createGain();
  env(c, g, t0, peak, Math.min(0.03, dur / 4), dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.05);
};

export const play = (name: Sfx) => {
  if (!soundEnabled()) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (name) {
    case "rustle": // crinkly foil: a few quick band-passed bursts
      for (let i = 0; i < 5; i++) filteredNoise(c, t + i * 0.07 + Math.random() * 0.03, 0.06, 0.12, "bandpass", 3500 + Math.random() * 2500, 2500, 1.5);
      break;
    case "rip": // tearing foil: bright noise sweeping down
      filteredNoise(c, t, 0.32, 0.28, "highpass", 6000, 900, 0.7);
      for (let i = 0; i < 8; i++) filteredNoise(c, t + i * 0.035, 0.03, 0.15, "bandpass", 4000, 3000, 3);
      break;
    case "whoosh":
      filteredNoise(c, t, 0.38, 0.16, "bandpass", 400, 2400, 0.8);
      break;
    case "flip":
      filteredNoise(c, t, 0.05, 0.2, "bandpass", 2200, 1500, 2);
      tone(c, 180, t, 0.06, 0.08, "triangle");
      break;
    case "stamp":
      tone(c, 70, t, 0.25, 0.4, "sine");
      filteredNoise(c, t, 0.08, 0.15, "lowpass", 1200, 300, 0.7);
      break;
    case "coin":
      tone(c, 988, t, 0.09, 0.12, "square");
      tone(c, 1319, t + 0.08, 0.35, 0.12, "square");
      break;
    case "chime": // Gold reveal: bell partials
      [880, 1320, 1760, 2640].forEach((f, i) => tone(c, f, t + i * 0.015, 1.1 - i * 0.2, 0.12 / (i + 1)));
      tone(c, 1760, t + 0.18, 0.8, 0.05);
      break;
  }
};
