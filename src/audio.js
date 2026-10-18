// Audio con WebAudio: música de combate procedural y golpes de pisada.
// Si existe assets/audio/combate.mp3 (no versionado: la música oficial no va al repo),
// se reproduce ese archivo en bucle en lugar de la pista procedural.

const LOCAL_TRACK = 'assets/audio/combate.mp3';
const BPM = 138;
const STEPS_PER_BEAT = 4;
const LOOKAHEAD = 0.12;

// Progresión en re menor: Dm, Bb, C, A. Raíces en MIDI.
const CHORDS = [
  { root: 38, notes: [62, 65, 69] },
  { root: 34, notes: [58, 62, 65] },
  { root: 36, notes: [60, 64, 67] },
  { root: 33, notes: [57, 61, 64] },
];
const BASS_PATTERN = [0, 0, 12, 0, 0, 7, 0, 12, 0, 0, 12, 0, 10, 0, 7, 0];

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.musicOn = true;
  }

  /** Debe llamarse desde un gesto del usuario (el navegador bloquea el audio antes). */
  async start() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.35;
    this.musicBus.connect(this.master);
    this._noise = this._makeNoiseBuffer();

    if (!(await this._tryLocalTrack())) this._startSequencer();
  }

  toggleMusic() {
    if (!this.ctx) return;
    this.musicOn = !this.musicOn;
    this.musicBus.gain.setTargetAtTime(this.musicOn ? 0.35 : 0, this.ctx.currentTime, 0.1);
  }

  /** Golpe grave de pisada; strength en 0..1. */
  footstep(strength) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(70, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.35);
    gain.gain.setValueAtTime(0.9 * strength, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.5);
    this._noiseHit(t, 0.25 * strength, 0.3, 300);
  }

  async _tryLocalTrack() {
    try {
      const response = await fetch(LOCAL_TRACK);
      if (!response.ok) return false;
      const buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this.musicBus);
      source.start();
      return true;
    } catch {
      return false;
    }
  }

  _startSequencer() {
    const stepDuration = 60 / BPM / STEPS_PER_BEAT;
    let step = 0;
    let nextTime = this.ctx.currentTime + 0.1;
    const tick = () => {
      while (nextTime < this.ctx.currentTime + LOOKAHEAD) {
        this._playStep(step, nextTime, stepDuration);
        nextTime += stepDuration;
        step = (step + 1) % (16 * CHORDS.length);
      }
    };
    setInterval(tick, 25);
  }

  _playStep(step, time, stepDuration) {
    const chord = CHORDS[Math.floor(step / 16)];
    const inBar = step % 16;

    if (inBar % 2 === 0) this._tone(midiToHz(chord.root + BASS_PATTERN[inBar]), time, stepDuration * 1.8, 'sawtooth', 0.22, 500);
    if (inBar === 0 || inBar === 8) this._kick(time);
    if (inBar === 4 || inBar === 12) this._noiseHit(time, 0.35, 0.18, 1800);
    if (inBar === 14 || inBar === 15) this._noiseHit(time, 0.15, 0.08, 2500); // redoble
    if (inBar === 0 || inBar === 10) {
      // Acorde de metales.
      for (const note of chord.notes) this._tone(midiToHz(note), time, stepDuration * (inBar === 0 ? 6 : 4), 'sawtooth', 0.07, 1400);
    }
  }

  _tone(freq, time, duration, type, volume, cutoff) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(filter).connect(gain).connect(this.musicBus);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  _kick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    osc.connect(gain).connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  _noiseHit(time, volume, duration, cutoff) {
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = this._noise;
    filter.type = 'bandpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    source.connect(filter).connect(gain).connect(this.musicBus);
    source.start(time);
    source.stop(time + duration);
  }

  _makeNoiseBuffer() {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}

function midiToHz(note) {
  return 440 * 2 ** ((note - 69) / 12);
}
