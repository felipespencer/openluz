// Relógio de BPM do jeito do Resolume: as batidas correm o tempo todo (4 por compasso); TAP,
// nudge, /2 ×2, RESYNC, metrônomo e pausa; Beat Snap segura os disparos até a próxima batida;
// qualquer parâmetro de efeito ou fonte pode animar na batida com as formas dos presets do
// Resolume (4 to the Floor, On Off, Random, Step, LFO, Saw…). O código é nosso.
export const BPM = () => ({ bpm: 120, running: true, beat: 0, nudge: 0, nudgePct: 5, metronome: false, snap: 0 });
export const SNAPS = [[0, 'Desligado'], [0.25, '1/4 de batida'], [0.5, '1/2 batida'], [1, '1 batida'], [2, '2 batidas'], [4, '1 compasso (4)'], [8, '2 compassos (8)'], [16, '4 compassos (16)']];
export const BEATS = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64];
export const SHAPES = [['4floor', '4 to the Floor'], ['1floor', '1 to the Floor'], ['onoff', 'On Off'], ['random', 'Random'], ['step12', 'Step 1 2'], ['step1234', 'Step 1 2 3 4'], ['lfo', 'LFO'], ['saw', 'Saw'], ['updown', 'Up N Down'], ['jittery', 'Jittery'], ['adsr', 'ADSR'], ['ease', 'EasyEase'], ['fft', 'FFT (som)']];
export const ANIM = (p) => ({ shape: '4floor', beats: 4, min: p.min, max: p.max });
export const effBpm = (B) => B.bpm * (1 + (B.nudge || 0) / 100);
export function advance(B, dt) { if (B.running) B.beat += dt * effBpm(B) / 60; }
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// valor 0..1 de uma forma na fase (0..1) do ciclo; cycle é o número do ciclo (para as aleatórias)
export function shapeValue(shape, phase, cycle) {
  switch (shape) {
    case '4floor': return 1 - (phase * 4 % 1);
    case '1floor': return 1 - phase;
    case 'onoff': return phase < 0.5 ? 1 : 0;
    case 'random': return hash(cycle);
    case 'step12': return Math.floor(phase * 2);
    case 'step1234': return Math.floor(phase * 4) / 3;
    case 'lfo': return 0.5 + 0.5 * Math.cos(phase * Math.PI * 4);
    case 'saw': return phase;
    case 'updown': return 1 - Math.abs(2 * phase - 1);
    case 'jittery': return hash(cycle * 8 + Math.floor(phase * 8));
    case 'adsr': return phase < 0.1 ? phase / 0.1 : phase < 0.15 ? 1 - (phase - 0.1) / 0.05 * 0.25 : phase < 0.7 ? 0.75 : 0.75 * (1 - (phase - 0.7) / 0.3);
    case 'ease': return phase < 0.5 ? 2 * phase * phase : 1 - 2 * (1 - phase) * (1 - phase);
    default: return 0;
  }
}
// estado de execução de cada animação (valor segurado na pausa, nível da FFT caindo): fica fora do objeto para não ir para o arquivo
const RUN = new WeakMap();
export function animValue(a, B) {
  let r = RUN.get(a); if (!r) RUN.set(a, r = {});
  if (a.paused && r.v != null) return r.v;   // ‖ do mini-transporte: o valor fica onde parou
  const lo = a.min ?? 0, hi = a.max ?? 1; let v;
  if (a.shape === 'fft') {   // reação ao som: o nível da faixa, com ganho próprio e queda (quanto o nível pode cair por segundo)
    if (a.src === 'mic') B.micWanted = true;   // quem cuida do som liga o microfone quando alguém pede
    const au = a.src && B.audioBy ? B.audioBy[a.src] : B.audio;   // a.src: 'comp' (som dos clipes) ou 'mic'; sem src, a fonte geral
    // a.f0/a.f1: pedaço do espectro escolhido no painel (0..1); sem eles, a faixa antiga por nome (a.band)
    let lv = (a.f0 != null && B.audioBand ? B.audioBand(a.src, a.f0, a.f1 ?? 1) : (au ? (au[a.band || 'bass'] || 0) : 0)) * (a.gain ?? 1);
    const now = performance.now(), dt = Math.min(0.2, (now - (r.t || now)) / 1000); r.t = now;
    if (a.fall > 0) { lv = Math.max(lv, (r.lv || 0) - a.fall * dt); r.lv = lv; }
    lv = Math.min(1, lv);
    // os quatro modos do Resolume 7.28 (medidos em 2026-11-10, sondas/clip-fft.py): ▶ o valor é o nível; ◀ é o nível ao contrário;
    // + e − o som EMPURRA o valor para a frente ou para trás (um nível de 0,5 anda meia faixa por segundo) e dá a volta
    const m = a.fmode || 'fwd'; let f;
    if (m === 'inc' || m === 'dec') { r.acc = (((r.acc ?? 0) + (m === 'inc' ? lv : -lv) * dt) % 1 + 1) % 1; f = r.acc; } else f = m === 'back' ? 1 - lv : lv;
    v = lo + (hi - lo) * f;
  } else {
    // modo Timeline da engrenagem do Resolume: o ciclo dura a.secs segundos, solto do BPM; senão dura a.beats batidas. a.speed multiplica
    // o andamento e a.dir < 0 anda de trás para a frente
    const beats = a.beats || 4, x = (a.secs ? performance.now() / 1000 / a.secs : B.beat / beats) * (a.speed ?? 1), cycle = Math.floor(x); let phase = x - cycle;
    if (a.dir < 0) phase = 1 - phase;
    v = lo + (hi - lo) * shapeValue(a.shape, phase, cycle);
  }
  r.v = v; return v;
}
// animação dos valores que não são parâmetro de efeito ou fonte: opacidade, velocidade, volume e Transform. Ficam em holder.panim com chave
// começando por @ (não se confundem com as chaves dos parâmetros) e mínimo/máximo na unidade que o painel mostra
export const ANIM_SET = {
  '@x': (h, v) => { h.x = v / 100; }, '@y': (h, v) => { h.y = v / 100; }, '@scale': (h, v) => { h.scale = v / 100; }, '@rot': (h, v) => { h.rot = v; },
  '@opacity': (h, v) => { h.opacity = v / 100; }, '@speed': (h, v) => { h.speed = Math.max(0.01, v); }, '@vol': (h, v) => { if (h.audio) h.audio.vol = v / 100; },
};
// o valor que o dono tinha antes de ser animado (na unidade do painel): é ele que vai para o arquivo e para o Ctrl+Z, não o valor do quadro
export const ANIM_GET = {
  '@x': (h) => h.x * 100, '@y': (h) => h.y * 100, '@scale': (h) => h.scale * 100, '@rot': (h) => h.rot,
  '@opacity': (h) => (h.opacity ?? 1) * 100, '@speed': (h) => h.speed, '@vol': (h) => (h.audio ? h.audio.vol * 100 : 100),
};
const BASE = new WeakMap();
// devolve ao dono os valores de base (chamado antes de salvar ou tirar o retrato do desfazer; no quadro seguinte a animação volta)
export function restoreAnims(h) { const b = h && BASE.get(h); if (!b) return; for (const k in b) if (ANIM_SET[k]) ANIM_SET[k](h, b[k]); }
// tira uma animação @: o valor volta para a base
export function dropAnim(h, k) { const b = h && BASE.get(h); if (b && k in b) { if (ANIM_SET[k]) ANIM_SET[k](h, b[k]); delete b[k]; } if (h && h.panim) delete h.panim[k]; }
// base de um valor animado (para o painel mostrar e mudar); set muda a base
export const animBase = (h, k, set) => { const b = h && BASE.get(h); if (!b || !(k in b)) return undefined; if (set !== undefined) b[k] = set; return b[k]; };
// aplica as animações @ de um dono (clipe, camada ou transform); devolve 1 se mexeu na velocidade, 2 no volume, 4 no resto (somados)
export function applyAnims(h, B) {
  const P = h && h.panim; let b = h && BASE.get(h);
  if (b) for (const k in b) if (!P || !P[k] || !P[k].shape) delete b[k];   // a animação sumiu (desfazer, abrir outra composição): a base deixa de valer
  if (!P) return 0; let n = 0;
  for (const k in P) { const a = P[k], f = ANIM_SET[k]; if (!f || !a || !a.shape) continue;
    if (!b) BASE.set(h, b = {}); if (!(k in b)) b[k] = ANIM_GET[k](h);
    f(h, animValue(a, B)); n |= k === '@speed' ? 1 : k === '@vol' ? 2 : 4; }
  return n;
}
export const setBpm = (B, v) => { if (isFinite(v)) B.bpm = Math.max(20, Math.min(500, Math.round(v * 10) / 10)); };
// TAP: média dos intervalos entre os toques (2 no mínimo; mais de 2 s sem tocar recomeça)
export function tap(B, now) {
  const t = B.taps || (B.taps = []);
  if (t.length && now - t[t.length - 1] > 2) t.length = 0;
  t.push(now); if (t.length > 8) t.shift();
  if (t.length >= 2) { const iv = (t[t.length - 1] - t[0]) / (t.length - 1); setBpm(B, 60 / iv); B.beat = Math.floor(B.beat); }
  return t.length;
}
// RESYNC: este instante vira a batida 1 do compasso
export function resync(B) { B.beat = Math.round(B.beat / 4) * 4; }
// metrônomo em WebAudio: um clique por batida, mais agudo na primeira do compasso
let ac = null;
export function click(accent) {
  try {
    ac = ac || new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = accent ? 1600 : 1000;
    g.gain.setValueAtTime(0.25, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.06);
  } catch { }
}
