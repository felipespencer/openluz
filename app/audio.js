// Áudio do OpenLuz, no jeito do Resolume: cada clipe de vídeo com som passa por
//   fonte → efeitos de áudio do clipe (Bitcrusher, Distortion, EQ-3, Flanger, HighPass, LowPass)
//   → volume → pan → master → saída,
// e o master passa por um analisador (FFT) que dá os níveis de graves, médios-graves, médios e
// agudos para a reação ao som (parâmetros animados com a forma "FFT", como o External FFT do
// Resolume: faixa, ganho e queda). A fonte da FFT pode ser a composição ou o microfone/placa.
// Tudo em WebAudio; o código é nosso.
const AP = (key, label, def, min, max, step = 0.01, unit = '') => ({ key, label, def, min, max, step, unit });
export const AUDIO_FX = [
  { id: 'bitcrusher', name: 'Bitcrusher', desc: 'Menos bits e menos amostras: som de videogame antigo.', params: [AP('bits', 'Bits', 6, 2, 16, 1), AP('rate', 'Taxa', 0.5, 0.05, 1, 0.01)] },
  { id: 'distortion', name: 'Distortion', desc: 'Satura o som.', params: [AP('drive', 'Drive', 0.5, 0, 1), AP('mix', 'Mistura', 1, 0, 1)] },
  { id: 'eq3', name: 'EQ-3', desc: 'Três bandas: graves, médios e agudos.', params: [AP('low', 'Graves', 0, -24, 24, 0.5, ' dB'), AP('mid', 'Médios', 0, -24, 24, 0.5, ' dB'), AP('high', 'Agudos', 0, -24, 24, 0.5, ' dB')] },
  { id: 'flanger', name: 'Flanger', desc: 'Varredura metálica, como um jato passando.', params: [AP('rate', 'Velocidade', 0.5, 0.05, 10, 0.05, ' Hz'), AP('depth', 'Profundidade', 0.5, 0, 1), AP('feedback', 'Realimentação', 0.3, 0, 0.95), AP('mix', 'Mistura', 0.5, 0, 1)] },
  { id: 'highpass', name: 'HighPass', desc: 'Só os agudos passam.', params: [AP('freq', 'Frequência', 300, 20, 8000, 10, ' Hz'), AP('q', 'Ressonância', 1, 0.1, 20, 0.1)] },
  { id: 'lowpass', name: 'LowPass', desc: 'Só os graves passam.', params: [AP('freq', 'Frequência', 1500, 40, 20000, 10, ' Hz'), AP('q', 'Ressonância', 1, 0.1, 20, 0.1)] },
];
export const audioFxById = (id) => AUDIO_FX.find(e => e.id === id);
export function mkAudioFx(id) { const d = audioFxById(id); if (!d) return null; const params = {}; for (const p of d.params) params[p.key] = p.def; return { id: d.id, params, bypass: false }; }
export const BANDS = [['bass', 'Graves'], ['lowmid', 'Médios-graves'], ['mid', 'Médios'], ['high', 'Agudos'], ['all', 'Tudo']];
export const AUDIO_SETTINGS = () => ({ source: 'comp', gain: 1, fallback: 4 });

const curveFor = (fn) => { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = fn(x); } return c; };

export class AudioEngine {
  constructor() {
    this.ctx = null; this.master = null; this.analyser = null; this.buf = null; this.micAnalyser = null; this.micBuf = null; this.micStream = null;
    this.levels = { bass: 0, lowmid: 0, mid: 0, high: 0, all: 0 }; this.raw = { bass: 0, lowmid: 0, mid: 0, high: 0, all: 0 };
    // níveis de cada fonte, sempre calculados quando ela existe: a engrenagem de um valor pode ouvir a composição e a de outro o microfone
    this.compLevels = { bass: 0, lowmid: 0, mid: 0, high: 0, all: 0 }; this.micLevels = { bass: 0, lowmid: 0, mid: 0, high: 0, all: 0 };
    this.settings = AUDIO_SETTINGS(); this.err = '';
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => { }); return this.ctx; }
    const ac = this.ctx = new AudioContext();
    this.master = ac.createGain(); this.analyser = ac.createAnalyser(); this.analyser.fftSize = 1024; this.analyser.smoothingTimeConstant = 0.5;
    this.master.connect(this.analyser); this.analyser.connect(ac.destination);
    this.buf = new Uint8Array(this.analyser.frequencyBinCount);
    return ac;
  }
  // liga um clipe de vídeo ao grafo (uma vez por elemento; depois disso o som só sai por aqui)
  attach(c) {
    const el = c.el; if (!el || !(el instanceof HTMLMediaElement) || c.srcNode) return;
    try {
      const ac = this.ensure();
      c.srcNode = ac.createMediaElementSource(el); c.gainNode = ac.createGain(); c.panNode = ac.createStereoPanner();
      c.gainNode.connect(c.panNode); c.panNode.connect(this.master);
      this.rebuild(c); this.apply(c);
    } catch (e) { this.err = e.message; }
  }
  apply(c) {
    const a = c.audio; if (!c.gainNode) return;
    c.gainNode.gain.value = a.mute ? 0 : Math.max(0, Math.min(1, a.vol)) * (c._lv ?? 1);   // _lv: fader A da camada (app.js)
    c.panNode.pan.value = Math.max(-1, Math.min(1, a.pan || 0));
    if (c.el) { c.el.muted = false; c.el.volume = 1; }   // o volume é do grafo
  }
  // a cadeia de efeitos de áudio do clipe: fonte → efeitos → volume
  rebuild(c) {
    if (!c.srcNode) return; const ac = this.ctx;
    try { c.srcNode.disconnect(); } catch { }
    for (const n of c.afxNodes || []) for (const x of n.all) { try { x.disconnect(); } catch { } }
    c.afxNodes = [];
    let head = c.srcNode;
    for (const f of c.afx || []) {
      if (f.bypass) continue;
      const node = this.makeNode(ac, f); if (!node) continue;
      head.connect(node.input); head = node.output; c.afxNodes.push(node);
    }
    head.connect(c.gainNode);
  }
  makeNode(ac, f) {
    const p = f.params, out = { all: [], update: null };
    if (f.id === 'lowpass' || f.id === 'highpass') {
      const b = ac.createBiquadFilter(); b.type = f.id === 'lowpass' ? 'lowpass' : 'highpass'; out.input = out.output = b; out.all = [b];
      out.update = (p) => { b.frequency.value = p.freq; b.Q.value = p.q; };
    } else if (f.id === 'eq3') {
      const lo = ac.createBiquadFilter(), mi = ac.createBiquadFilter(), hi = ac.createBiquadFilter();
      lo.type = 'lowshelf'; lo.frequency.value = 200; mi.type = 'peaking'; mi.frequency.value = 1000; mi.Q.value = 0.8; hi.type = 'highshelf'; hi.frequency.value = 4000;
      lo.connect(mi); mi.connect(hi); out.input = lo; out.output = hi; out.all = [lo, mi, hi];
      out.update = (p) => { lo.gain.value = p.low; mi.gain.value = p.mid; hi.gain.value = p.high; };
    } else if (f.id === 'distortion') {
      const dry = ac.createGain(), wet = ac.createGain(), sh = ac.createWaveShaper(), inp = ac.createGain(), sum = ac.createGain();
      sh.oversample = '2x'; inp.connect(sh); sh.connect(wet); inp.connect(dry); wet.connect(sum); dry.connect(sum);
      out.input = inp; out.output = sum; out.all = [dry, wet, sh, inp, sum];
      out.update = (p) => { const k = 1 + p.drive * 60; sh.curve = curveFor(x => Math.tanh(x * k) / Math.tanh(k * 0.5 + 0.5)); wet.gain.value = p.mix; dry.gain.value = 1 - p.mix; };
    } else if (f.id === 'bitcrusher') {
      const sh = ac.createWaveShaper(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; sh.connect(lp);
      out.input = sh; out.output = lp; out.all = [sh, lp];
      out.update = (p) => { const steps = Math.pow(2, Math.max(1, Math.round(p.bits)) - 1); sh.curve = curveFor(x => Math.round(x * steps) / steps); lp.frequency.value = 200 + p.rate * p.rate * 19000; };
    } else if (f.id === 'flanger') {
      const inp = ac.createGain(), dry = ac.createGain(), wet = ac.createGain(), dl = ac.createDelay(0.05), fb = ac.createGain(), osc = ac.createOscillator(), og = ac.createGain(), sum = ac.createGain();
      inp.connect(dry); inp.connect(dl); dl.connect(wet); dl.connect(fb); fb.connect(dl); osc.connect(og); og.connect(dl.delayTime); dry.connect(sum); wet.connect(sum); osc.start();
      out.input = inp; out.output = sum; out.all = [inp, dry, wet, dl, fb, osc, og, sum];
      out.update = (p) => { dl.delayTime.value = 0.004; osc.frequency.value = p.rate; og.gain.value = 0.0035 * p.depth; fb.gain.value = p.feedback; wet.gain.value = p.mix; dry.gain.value = 1 - p.mix * 0.5; };
    } else return null;
    out.update(p); out.fx = f;
    return out;
  }
  // mudou um parâmetro: só atualiza o nó
  updateFx(c, f) { const n = (c.afxNodes || []).find(x => x.fx === f); if (n) n.update(f.params); else this.rebuild(c); }
  detach(c) { for (const k of ['srcNode', 'gainNode', 'panNode']) { if (c[k]) { try { c[k].disconnect(); } catch { } } } c.afxNodes = []; }
  // fonte da FFT: a composição (o master) ou o microfone/placa de som
  // liga o microfone / entrada de áudio para a FFT (uma vez); não muda a fonte geral
  async enableMic() {
    if (this.micAnalyser) return true; if (this.micPend) return this.micPend;
    this.micPend = (async () => {
      try {
        const ac = this.ensure(); this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const s = ac.createMediaStreamSource(this.micStream); this.micAnalyser = ac.createAnalyser(); this.micAnalyser.fftSize = 1024; this.micAnalyser.smoothingTimeConstant = 0.5; s.connect(this.micAnalyser);
        this.micBuf = new Uint8Array(this.micAnalyser.frequencyBinCount); this.err = ''; return true;
      } catch (e) { this.err = 'Sem microfone: ' + e.message; return false; } finally { this.micPend = null; }
    })();
    return this.micPend;
  }
  async setSource(src) {
    this.settings.source = src;
    if (src === 'mic' && !(await this.enableMic())) this.settings.source = 'comp';
  }
  // o espectro que a engrenagem mostra vai de 20 Hz a 12 kHz em escala logarítmica; f0 e f1 (0..1) são posições nesse eixo
  specOf(src) { const mic = (src || this.settings.source) === 'mic'; return mic ? [this.micAnalyser, this.micBuf] : [this.analyser, this.buf]; }
  // nível (0..1, já com o ganho geral) do pedaço do espectro entre f0 e f1; o pedaço inteiro dá o mesmo que a faixa "Tudo"
  bandLevel(src, f0, f1) {
    const [an, buf] = this.specOf(src); if (!an || !buf) return 0;
    const hz = this.ctx.sampleRate / an.fftSize, F = (f) => 20 * Math.pow(600, Math.max(0, Math.min(1, f)));
    let a = Math.max(0, Math.floor(F(Math.min(f0, f1)) / hz)), b = Math.min(buf.length - 1, Math.ceil(F(Math.max(f0, f1)) / hz)); if (b < a) b = a;
    let sum = 0; for (let i = a; i <= b; i++) sum += buf[i];
    return sum / (b - a + 1) / 255 * this.settings.gain;
  }
  // n barras (0..1) do espectro, para o desenho
  spectrum(src, n, out) {
    const [an, buf] = this.specOf(src); out = out || new Float32Array(n); if (!an || !buf) { out.fill(0); return out; }
    const hz = this.ctx.sampleRate / an.fftSize, F = (f) => 20 * Math.pow(600, f);
    for (let k = 0; k < n; k++) { const a = Math.max(0, Math.floor(F(k / n) / hz)), b = Math.max(a, Math.min(buf.length - 1, Math.ceil(F((k + 1) / n) / hz) - 1)); let m = 0; for (let i = a; i <= b; i++) if (buf[i] > m) m = buf[i]; out[k] = m / 255; }
    return out;
  }
  // a cada quadro: lê a FFT e atualiza os níveis com ganho e queda (fallback, em unidades por segundo)
  tick(dt) {
    const g = this.settings.gain, fall = this.settings.fallback * dt;
    const calc = (an, buf, lv) => {
      if (!an || !buf) return null;
      an.getByteFrequencyData(buf);
      const hz = this.ctx.sampleRate / an.fftSize, band = (a, b) => { let s = 0, n = 0; for (let i = Math.max(0, Math.floor(a / hz)); i <= Math.min(buf.length - 1, Math.ceil(b / hz)); i++) { s += buf[i]; n++; } return n ? s / n / 255 : 0; };
      const r = { bass: band(20, 250) * g, lowmid: band(250, 800) * g, mid: band(800, 3000) * g, high: band(3000, 12000) * g, all: band(20, 12000) * g };
      for (const k in r) { const v = Math.min(1, r[k]); lv[k] = v >= lv[k] ? v : Math.max(v, lv[k] - fall); }
      return r;
    };
    const rc = calc(this.analyser, this.buf, this.compLevels), rm = calc(this.micAnalyser, this.micBuf, this.micLevels);
    // a fonte geral (aba Composição) continua valendo para as animações antigas, que não dizem de onde ouvem
    const mic = this.settings.source === 'mic', r = mic ? rm : rc; if (!r) return;
    Object.assign(this.raw, r); Object.assign(this.levels, mic ? this.micLevels : this.compLevels);
  }
}
