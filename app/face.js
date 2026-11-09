// Seguir rosto (plano 11-01, maquete camera-rosto-mockup.html aprovada em 2026-11-09): o clipe de câmera acha o rosto e recorta
// a imagem em volta dele, como um cinegrafista. O detector roda no processo nativo (face-native.js, YuNet); aqui ficam o pedido
// do quadro (pequeno, lido da placa sem travar), a escolha do rosto, o alvo do recorte e o filtro 1€ que deixa o movimento liso.
// O recorte vai em c._crop = { x, y, w, h } (frações da imagem, de cima para baixo); o motor desenha só esse pedaço (uSrc).
import { animValue } from './beat.js';

export const PARAMS_FACE = [
  { key: 'enq', label: 'Enquadrar', opts: ['Rosto', 'Busto', 'Corpo'], def: 1, help: 'Quanto cabe em volta do rosto.' },
  { key: 'zoom', label: 'Zoom', min: 0.5, max: 2, step: 0.01, def: 1, unit: '×', help: 'Aperta ou abre o enquadramento: multiplica o Enquadrar.' },
  { key: 'alt', label: 'Altura', min: 0.2, max: 0.6, step: 0.01, def: 0.36, help: 'Onde o rosto fica na altura do quadro: menos é mais para cima.' },
  { key: 'suave', label: 'Suavidade', min: 0, max: 1, step: 0.01, def: 0.6, help: 'Quão devagar a câmera acompanha: mais é mais liso, menos é mais rápido.' },
  { key: 'varios', label: 'Vários rostos', opts: ['O maior', 'Todos juntos', 'O do meio'], def: 0, help: 'Com mais de um rosto: segue o maior, enquadra todos, ou o mais perto do meio. Não pula de pessoa enquanto a seguida está na imagem.' },
  { key: 'sem', label: 'Sem rosto', opts: ['Fica onde estava', 'Volta à imagem inteira', 'Centro'], def: 0, help: 'O que fazer quando ninguém aparece (depois de 1 s).' },
  { key: 'marca', label: 'Marcação', opts: ['Mostrar na Prévia', 'Esconder'], def: 0, help: 'Na Prévia, mostra a imagem inteira com o rosto (verde) e o recorte (laranja). A saída nunca mostra marcação.' },
];
const ENQ = [2.0, 3.0, 6.5];   // altura do recorte em alturas de rosto (Rosto, Busto, Corpo)
export const faceDefaults = () => ({ on: false, params: Object.fromEntries(PARAMS_FACE.map(p => [p.key, p.def])), panim: {} });
export const faceSerial = (f) => f ? { on: !!f.on, params: { ...f.params }, panim: JSON.parse(JSON.stringify(f.panim || {})) } : undefined;

// ---------- porta do processo nativo ----------
let port = null, pedindo = false, err = '', ep = '', nextId = 1;
const espera = new Map();   // id do pedido → clipe
export const stats = { ms: 0, porSeg: 0, n: 0, t0: 0, ep: '', err: '' };
function abrir() {
  if (port || pedindo) return; const D = window.projDesktop; if (!D || !D.facePort) { stats.err = 'só no programa do Windows'; return; }
  pedindo = true;
  const onMsg = (e) => {
    if (e.source !== window || !e.data || e.data.type !== 'face:port' || !e.ports || !e.ports[0]) return;
    window.removeEventListener('message', onMsg); port = e.ports[0]; pedindo = false;
    port.onmessage = (ev) => {
      const m = ev.data || {};
      if (m.type === 'faces') { const c = espera.get(m.id); espera.delete(m.id); stats.ep = m.ep; stats.ms += (m.ms - stats.ms) * 0.2; stats.n++; if (c && c.face) { c._faces = m.faces; c._facesAt = performance.now(); c._faceBusy = false; } }
      else if (m.type === 'err') { stats.err = m.msg; const c = espera.get(m.id); espera.delete(m.id); if (c) c._faceBusy = false; }
      else if (m.type === 'ready' && !m.ok) stats.err = 'o detector não abriu: ' + (m.err || '');
    };
    port.start && port.start();
  };
  window.addEventListener('message', onMsg); D.facePort();
}

// ---------- a cada quadro, para cada clipe de câmera com Seguir rosto ligado ----------
const val = (f, k, clock) => { const a = f.panim && f.panim[k]; if (a && a.shape && clock) return animValue(a, clock); return f.params[k] ?? PARAMS_FACE.find(p => p.key === k).def; };
class UmEuro { constructor() { this.x = null; this.dx = 0; } passo(v, dt, minCut, beta) { if (this.x == null) { this.x = v; return v; } const a = (c) => { const r = 2 * Math.PI * c * dt; return r / (r + 1); }; const dv = (v - this.x) / dt; this.dx += a(1) * (dv - this.dx); const cut = minCut + beta * Math.abs(this.dx); this.x += a(cut) * (v - this.x); return this.x; } reset() { this.x = null; this.dx = 0; } }
const iou = (a, b) => { const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y), x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h); const i = Math.max(0, x2 - x1) * Math.max(0, y2 - y1); return i / (a.w * a.h + b.w * b.h - i + 1e-9); };
// em pixels da imagem da câmera
function escolher(c, rs, modo) {
  if (!rs.length) return null;
  if (modo === 1) { const x0 = Math.min(...rs.map(r => r.x)), y0 = Math.min(...rs.map(r => r.y)), x1 = Math.max(...rs.map(r => r.x + r.w)), y1 = Math.max(...rs.map(r => r.y + r.h)); return { x: x0, y: y0, w: x1 - x0, h: rs.reduce((a, r) => a + r.h, 0) / rs.length, todos: y1 - y0 }; }
  const s = c._seguido;
  if (s && !s.todos) { const m = rs.map(r => [r, iou(r, s)]).sort((a, b) => b[1] - a[1])[0]; if (m[1] > 0.2) return m[0]; }   // não pula de pessoa
  if (modo === 2) return rs.slice().sort((a, b) => Math.abs(a.x + a.w / 2 - c.w / 2) - Math.abs(b.x + b.w / 2 - c.w / 2))[0];
  return rs.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0];
}
// asp: proporção do recorte (a da composição, para a câmera encher a camada sem barras)
export function tickFace(c, now, engine, clock, asp) {
  const f = c && c.kind === 'camera' && c.face; if (!f) return;
  if (!f.on) { if (c._crop) { c._crop = null; c._fx = null; c._faces = null; c._seguido = null; } return; }
  abrir(); if (!c.w || !c.h) return;
  const t = performance.now();
  // pede um quadro a cada ~66 ms (15 por segundo): leitura pela placa sem esperar (PBO + fence), como o recorte de pessoa
  if (c._faceRd) {
    const buf = engine.pollReadClipFrame(c._faceRd);
    if (buf) { const r = c._faceRd; c._faceRd = null; if (port) { const id = nextId++; espera.set(id, c); c._faceBusy = true; c._faceSent = t; port.postMessage({ type: 'run', id, rgba: buf, W: r.w, H: r.h }); } }
  } else if (port && !c._faceBusy && t - (c._faceAsk || 0) > 66 && engine.tex.get(c.id)) {
    c._faceAsk = t; const k = 640 / Math.max(c.w, c.h);
    try { c._faceRd = engine.beginReadClipFrame(c, Math.max(8, Math.round(c.w * k)), Math.max(8, Math.round(c.h * k))); } catch { c._faceRd = null; }
  }
  if (c._faceBusy && t - (c._faceSent || 0) > 2000) c._faceBusy = false;   // resposta perdida: pede de novo
  if (t - (stats.t0 || 0) > 1000) { stats.porSeg = stats.n / ((t - (stats.t0 || t)) / 1000 || 1); stats.n = 0; stats.t0 = t; }
  // o alvo
  const W = c.w, H = c.h, rs = (c._faces || []).map(r => ({ x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H, sc: r.sc }));
  const modo = val(f, 'varios') | 0, sem = val(f, 'sem') | 0;
  const alvoF = escolher(c, rs, modo);
  if (alvoF) { c._seguido = alvoF; c._semDesde = 0; } else if (!c._semDesde) c._semDesde = t;
  const fx = c._fx || (c._fx = { x: new UmEuro(), y: new UmEuro(), h: new UmEuro(), t: t });
  const dt = Math.max(1 / 120, Math.min(0.2, (t - fx.t) / 1000)); fx.t = t;
  const ant = c._cropPx;
  let a;
  if (alvoF) {
    const zoom = val(f, 'zoom', clock), alt = val(f, 'alt', clock), enq = ENQ[val(f, 'enq') | 0] ?? 3;
    let h = (alvoF.todos ? Math.max(alvoF.todos * 1.6, alvoF.h * enq) : alvoF.h * enq) / zoom;
    if (alvoF.todos) h = Math.max(h, alvoF.w * 1.25 / asp);
    h = Math.min(H, W / asp, Math.max(H * 0.12, h));
    a = { cx: alvoF.x + alvoF.w / 2, cy: alvoF.y + alvoF.h / 2 + h * (0.5 - alt), h };
  } else if (ant && t - c._semDesde < 1000) a = ant;   // segura 1 s antes de decidir
  else a = sem === 1 || !ant ? { cx: W / 2, cy: H / 2, h: Math.min(H, W / asp) } : sem === 2 ? { cx: W / 2, cy: H / 2, h: ant.h } : ant;
  const su = val(f, 'suave', clock), minCut = 0.05 + (1 - su) * 3, beta = 0.002 + (1 - su) * 0.02;
  let cx = fx.x.passo(a.cx, dt, minCut, beta / W * 1000), cy = fx.y.passo(a.cy, dt, minCut, beta / W * 1000), h = fx.h.passo(a.h, dt, minCut, beta / W * 500);
  h = Math.min(h, H, W / asp); const w = h * asp;
  cx = Math.min(W - w / 2, Math.max(w / 2, cx)); cy = Math.min(H - h / 2, Math.max(h / 2, cy));
  c._cropPx = { cx, cy, h };
  c._crop = { x: (cx - w / 2) / W, y: (cy - h / 2) / H, w: w / W, h: h / H };
}

// Prévia com marcação: a imagem inteira da câmera (o motor desenha sem recorte) com o recorte (laranja) e os rostos (verde)
export const marcaNaPrevia = (c) => !!(c && c.kind === 'camera' && c.face && c.face.on && (c.face.params.marca | 0) === 0);
export function desenharMarca(ctx, c, engine, W, H) {
  if (!marcaNaPrevia(c) || !c._crop) return;
  const [sx, sy] = engine.fitScale({ ...c, _crop: null }, W, H), tr = c.transform || { x: 0, y: 0, scale: 1 };
  const iw = W * sx * (tr.scale ?? 1) * (tr.sx ?? 1), ih = H * sy * (tr.scale ?? 1) * (tr.sy ?? 1);
  const ox = W / 2 + (tr.x || 0) * W / 2 - iw / 2, oy = H / 2 - (tr.y || 0) * H / 2 - ih / 2;
  const k = c._crop, rx = ox + k.x * iw, ry = oy + k.y * ih, rw = k.w * iw, rh = k.h * ih;
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.fillRect(ox, oy, iw, ry - oy); ctx.fillRect(ox, ry + rh, iw, oy + ih - ry - rh); ctx.fillRect(ox, ry, rx - ox, rh); ctx.fillRect(rx + rw, ry, ox + iw - rx - rw, rh);
  ctx.lineWidth = Math.max(2, W / 480); ctx.strokeStyle = '#ff8a2b'; ctx.strokeRect(rx, ry, rw, rh);
  const sel = c._seguido;
  for (const r of c._faces || []) {
    const x = ox + r.x * iw, y = oy + r.y * ih, on = sel && (sel.todos || Math.abs(sel.x - r.x * c.w) < 1 && Math.abs(sel.y - r.y * c.h) < 1);
    ctx.strokeStyle = on ? '#5fd38a' : 'rgba(95,211,138,.5)'; ctx.lineWidth = Math.max(1.5, W / (on ? 600 : 900)); ctx.strokeRect(x, y, r.w * iw, r.h * ih);
  }
  ctx.restore();
}
