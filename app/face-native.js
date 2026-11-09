// Processo nativo do "Seguir rosto" (plano 11-01): acha rostos no quadro da câmera com o YuNet (OpenCV Zoo, MIT,
// vendor/yunet) no onnxruntime-node. DirectML na placa (3,7 ms por quadro na RTX 2070 SUPER, medido em 2026-11-09);
// sem placa, processador com 2 fios (16 ms). Processo separado do Background Removal: um não espera o outro.
// Só acha "um rosto" (caixa e nota): não sabe de quem é e não guarda nada.
// Entrada: { type:'run', id, rgba (Uint8 W×H×4, linhas de cima para baixo), W, H } com W ou H = 640.
// Saída: { type:'faces', id, faces:[{ x, y, w, h, sc }] } em frações da imagem (0..1), ms.
const path = require('path');
let ort = null, ortErr = '';
try { ort = require('onnxruntime-node'); } catch (e) { ortErr = e.message || String(e); }
const FILE = path.join(__dirname, 'vendor', 'yunet', 'face_detection_yunet_2023mar.onnx');
const S = 640;   // o modelo tem entrada fixa 640×640: a imagem vai encostada em cima e à esquerda, o resto fica preto
let sess = null, ep = 'dml', loading = null;
async function load() {
  if (sess) return sess; if (loading) return loading;
  loading = (async () => {
    try { sess = await ort.InferenceSession.create(FILE, { executionProviders: ['dml'], graphOptimizationLevel: 'all' }); ep = 'dml'; }
    catch (e) { ep = 'cpu'; sess = await ort.InferenceSession.create(FILE, { executionProviders: ['cpu'], intraOpNumThreads: 2, graphOptimizationLevel: 'all' }); send({ type: 'aviso', msg: 'DirectML não abriu para o rosto; usando o processador' }); }
    return sess;
  })();
  try { return await loading; } finally { loading = null; }
}
const inp = new Float32Array(3 * S * S);
const iou = (a, b) => { const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y), x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h); const i = Math.max(0, x2 - x1) * Math.max(0, y2 - y1); return i / (a.w * a.h + b.w * b.h - i + 1e-9); };
async function run({ id, rgba, W, H }) {
  const s = await load(); const t0 = performance.now(); const N = S * S;
  inp.fill(0);
  // BGR, 0..255, NCHW (como o FaceDetectorYN do OpenCV)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, o = y * S + x; inp[o] = rgba[i + 2]; inp[N + o] = rgba[i + 1]; inp[2 * N + o] = rgba[i]; }
  const out = await s.run({ input: new ort.Tensor('float32', inp, [1, 3, S, S]) });
  const cand = [];
  for (const st of [8, 16, 32]) {
    const cls = out['cls_' + st].data, obj = out['obj_' + st].data, bb = out['bbox_' + st].data, cols = S / st;
    for (let i = 0; i < cls.length; i++) {
      const sc = Math.sqrt(Math.min(1, Math.max(0, cls[i])) * Math.min(1, Math.max(0, obj[i]))); if (sc < 0.6) continue;
      const r = Math.floor(i / cols), c = i % cols, bw = Math.exp(bb[i * 4 + 2]) * st, bh = Math.exp(bb[i * 4 + 3]) * st;
      cand.push({ x: (c + bb[i * 4]) * st - bw / 2, y: (r + bb[i * 4 + 1]) * st - bh / 2, w: bw, h: bh, sc });
    }
  }
  cand.sort((a, b) => b.sc - a.sc); const faces = [];
  for (const b of cand) if (faces.every(f => iou(b, f) < 0.3)) faces.push(b);
  send({ type: 'faces', id, ms: performance.now() - t0, ep, faces: faces.slice(0, 12).map(f => ({ x: f.x / W, y: f.y / H, w: f.w / W, h: f.h / H, sc: f.sc })) });
}
let port = null, busy = false, queued = null;
function send(m) { if (port) port.postMessage(m); }
async function handle(msg) {
  if (msg.type === 'hello') { send({ type: 'ready', ok: !!ort, err: ortErr }); if (ort) load().catch(e => send({ type: 'err', msg: 'Seguir rosto: ' + (e.message || e) })); return; }
  if (msg.type !== 'run' || !ort) return;
  if (busy) { queued = msg; return; }   // só o mais novo espera
  busy = true;
  try { await run(msg); } catch (e) { send({ type: 'err', id: msg.id, msg: 'Seguir rosto: ' + (e.message || e) }); }
  finally { busy = false; if (queued) { const q = queued; queued = null; handle(q); } }
}
process.on('uncaughtException', (e) => { try { send({ type: 'err', msg: 'Seguir rosto (nativo): ' + (e.message || e) }); } catch { } });
process.on('unhandledRejection', (e) => { try { send({ type: 'err', msg: 'Seguir rosto (nativo): ' + ((e && e.message) || e) }); } catch { } });
process.parentPort.on('message', (ev) => {
  if (ev.ports && ev.ports[0]) { port = ev.ports[0]; port.on('message', (e2) => { if (e2 && e2.data) handle(e2.data); }); port.start(); handle({ type: 'hello' }); }
});
