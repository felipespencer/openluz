// Strokes no OpenLuz (lado de cá das sondas strokes_*.py): põe a imagem e o efeito com os valores pedidos, pelos nomes do
// Resolume, e guarda N quadros da saída do motor em tools/compare/saida/stk/O-<rotulo>-<i>.png.
// Uso: node tools/compare/sondas/strokes_o.mjs <rotulo> <imagem> [Controle=valor ...] [--n 6] [--intervalo 550] [--espera 20] [--porta 9333]
//   --intervalo  ms entre um quadro guardado e o seguinte (550 pega rodadas diferentes com Frequency 2)
//   --espera     quadros desenhados antes do primeiro (para o Feedback assentar use 60)
//   --seguidos   guarda quadros desenhados um atrás do outro (ignora --intervalo)
// O OpenLuz de desenvolvimento tem de estar aberto: node tools/compare/abre-dev.mjs 9333
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..', '..'), OUT = path.join(HERE, '..', 'saida', 'stk');
const a = { n: 6, intervalo: 550, espera: 20, porta: 9333, seguidos: false, vals: {}, pos: [] };
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (k === '--n') a.n = +process.argv[++i]; else if (k === '--intervalo') a.intervalo = +process.argv[++i]; else if (k === '--espera') a.espera = +process.argv[++i];
  else if (k === '--porta') a.porta = +process.argv[++i]; else if (k === '--seguidos') a.seguidos = true;
  else if (k.includes('=')) { const j = k.indexOf('='); a.vals[k.slice(0, j)] = k.slice(j + 1); } else a.pos.push(k);
}
const [rot, img] = a.pos;
if (!rot || !img) { console.log('uso: node tools/compare/sondas/strokes_o.mjs <rotulo> <imagem> [Controle=valor ...]'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const pg = (await (await fetch(`http://127.0.0.1:${a.porta}/json`)).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
if (!pg) { console.error('OpenLuz de desenvolvimento não está aberto na porta ' + a.porta); process.exit(1); }
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };

// definição fresca do efeito (só dados; o código do motor só muda reabrindo o programa)
const { EFFECTS } = await import(pathToFileURL(path.join(ROOT, 'app/effects.js')).href + '?t=' + Date.now());
const def = EFFECTS.find(e => e.id === 'strokes');
const clip = path.resolve(img).replace(/\\/g, '/');
const r = await ev(`(async () => {
  const P = window.projecionista, L = P.state.layers[0], S = ms => new Promise(r => setTimeout(r, ms));
  for (const d of document.querySelectorAll('.dlgOver')) d.remove();
  const novo = ${JSON.stringify(def)}, i = P.EFFECTS.findIndex(e => e.id === novo.id);
  for (const k of Object.keys(P.EFFECTS[i])) if (typeof P.EFFECTS[i][k] !== 'function' && !(k in novo)) delete P.EFFECTS[i][k];
  Object.assign(P.EFFECTS[i], novo); P.engine.fxProg.delete(novo.id);
  const d = P.EFFECTS[i];
  if (window.__stkClip !== ${JSON.stringify(clip)}) { await P.putPath(0, 1, ${JSON.stringify(clip)}, ${JSON.stringify(path.basename(clip))}); P.trigger(0, 1); await S(500); window.__stkClip = ${JSON.stringify(clip)}; }
  const params = {}; for (const p of d.params) params[p.key] = p.def;
  const vr = ${JSON.stringify(a.vals)}, fora = [];
  for (const [rn, v] of Object.entries(vr)) {
    const k = (d.rparams || {})[rn], p = k && d.params.find(q => q.key === k); if (!p) { fora.push(rn); continue; }
    params[k] = p.opts ? (/^[0-9]+$/.test(v) ? +v : Math.max(0, (p.ropts || p.opts).indexOf(v))) : (v === 'True' || v === 'true') ? 1 : (v === 'False' || v === 'false') ? 0 : +v;
  }
  L.fx = [{ id: d.id, params, bypass: false, anim: {} }];
  P.render(); let f0 = P.frames(); while (P.frames() - f0 < ${a.espera}) await S(8);
  const out = [], t0 = performance.now();
  for (let k = 0; k < ${a.n}; k++) {
    if (k) { if (${a.seguidos}) { f0 = P.frames(); while (P.frames() === f0) await S(2); } else await S(${a.intervalo}); }
    out.push({ png: P.engine.canvas.toDataURL('image/png'), t: performance.now() - t0, f: P.frames() });
  }
  return { out, fora, w: P.engine.canvas.width, h: P.engine.canvas.height };
})()`);
r.out.forEach((q, i) => fs.writeFileSync(path.join(OUT, `O-${rot}-${i}.png`), Buffer.from(q.png.split(',')[1], 'base64')));
for (let i = r.out.length; fs.existsSync(path.join(OUT, `O-${rot}-${i}.png`)); i++) fs.rmSync(path.join(OUT, `O-${rot}-${i}.png`));
console.log(JSON.stringify({ rot, quadros: r.out.length, tamanho: [r.w, r.h], semControle: r.fora, quadrosDesenhados: r.out.map(q => q.f - r.out[0].f) }));
ws.close();
