// Strokes no painel (plano 02-12), com mouse e teclado REAIS pelo CDP: o efeito na camada mostra o seletor Preset com os seis
// presets do Resolume e o seletor Pincel com os cinco pincéis; escolher pelo teclado troca os controles e a imagem; o efeito desenha
// (pinta a tela) e não derruba os quadros.
// Programa recém-aberto com --remote-debugging-port=9333 (node tools/compare/abre-dev.mjs 9333).  Uso: node tools/strokes-check.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const CARTA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'compare', 'clips', 'carta.png').replace(/\\/g, '/');
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const click = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(300); };
const cl = async (expr) => { const r = await ev(`const e = (${expr}); if (!e) return null; e.scrollIntoView && e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;`); if (!r) return false; await click(r.x, r.y); return true; };
const KEYS = { ArrowDown: 40, ArrowUp: 38, Escape: 27 };
const tecla = async (key) => { const c = KEYS[key]; await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: c, nativeVirtualKeyCode: c }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: c, nativeVirtualKeyCode: c }); await wait(350); };
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
const sel = (rot) => `([...document.querySelectorAll('.prow')].find(r => r.offsetParent && r.querySelector('.pl') && r.querySelector('.pl').textContent.trim() === ${JSON.stringify(rot)}) || { querySelector() { return null; } }).querySelector('select')`;
const fx = () => ev(`const f = S.layers[0].fx && S.layers[0].fx[0]; return f ? { id: f.id, preset: f.preset || '', p: { ...f.params } } : null;`);
// brilho médio e quantos pixels mudam entre dois quadros (a saída do motor, não a tela)
const imagem = () => ev(`const S2 = ms => new Promise(r => setTimeout(r, ms)); const le = () => { const c = document.createElement('canvas'); c.width = 240; c.height = 135; const x = c.getContext('2d'); x.drawImage(P.engine.canvas, 0, 0, 240, 135); return x.getImageData(0, 0, 240, 135).data; };
  const a = le(); await S2(300); const b = le(); let m = 0, d = 0; for (let i = 0; i < a.length; i += 4) { m += b[i] + b[i + 1] + b[i + 2]; if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 24) d++; } return { media: m / (a.length / 4 * 3), mudou: d / (a.length / 4) };`);

try {
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }); await wait(300);
  await ev(`for (const d of document.querySelectorAll('.dlgOver')) d.remove(); await P.putPath(0, 1, ${JSON.stringify(CARTA)}, 'carta.png'); P.trigger(0, 1); S.selLayer = 0; P.render(); return true;`); await wait(700);
  const semFx = await imagem();
  await ev(`const d = P.EFFECTS.find(e => e.id === 'strokes'); const params = {}; for (const p of d.params) params[p.key] = p.def; S.layers[0].fx = [{ id: 'strokes', params, bypass: false, anim: {} }]; S.selLayer = 0; P.render(); return true;`);
  confere('aba Camada aberta com clique', await cl(`document.querySelector('#leftTabs [data-tab="layer"]')`)); await wait(1500);
  const comFx = await imagem();
  confere('o Strokes pinta e mexe (a imagem muda de um quadro para o outro)', comFx.mudou > 0.3 && comFx.media > 40, `sem efeito: média ${semFx.media.toFixed(0)}, mudou ${(100 * semFx.mudou).toFixed(0)} %; com: média ${comFx.media.toFixed(0)}, mudou ${(100 * comFx.mudou).toFixed(0)} %`);
  const ops = await ev(`const a = ${sel('Preset')}, b = ${sel('Pincel')}; return { preset: a ? [...a.options].map(o => o.textContent.trim()) : null, pincel: b ? [...b.options].map(o => o.textContent.trim()) : null };`);
  confere('seletor Preset com os seis presets do Resolume', !!ops.preset && ['Adamantium Claws', 'Arrow Cloud', 'Bubble Bath', 'Floating Oil', 'Product Placement', 'Starry Night'].every(n => ops.preset.includes(n)), (ops.preset || []).join(', '));
  confere('seletor Pincel com os cinco pincéis', !!ops.pincel && ops.pincel.length === 5, (ops.pincel || []).join(', '));

  // Preset pelo teclado: o foco vai ao seletor pelo próprio elemento (o clique real abriria a lista nativa, que o CDP não fecha de forma confiável)
  confere('foco no seletor Preset', await ev(`const s = ${sel('Preset')}; s.focus(); return document.activeElement === s;`));
  await tecla('ArrowDown'); const f1 = await fx();
  confere('↓ escolhe Adamantium Claws e troca os controles', f1.preset === 'Adamantium Claws' && f1.p.size === 0.5 && f1.p.brush === 1 && f1.p.edges === 1 && f1.p.feedback === 0.3, JSON.stringify({ preset: f1.preset, size: f1.p.size, brush: f1.p.brush, feedback: f1.p.feedback }));
  confere('o seletor Preset continua com o foco', await ev(`return document.activeElement === ${sel('Preset')};`));
  await tecla('ArrowDown'); await tecla('ArrowDown'); await tecla('ArrowDown'); const f4 = await fx();
  confere('↓ ↓ ↓ chega em Floating Oil (Flow 1, Feedback 0,87, pincel comum)', f4.preset === 'Floating Oil' && f4.p.flow === 1 && f4.p.feedback === 0.87 && f4.p.brush === 0, JSON.stringify({ preset: f4.preset, flow: f4.p.flow, feedback: f4.p.feedback, brush: f4.p.brush }));
  await wait(1500); const oleo = await imagem();
  confere('com Floating Oil a tela fica cheia e clara', oleo.media > comFx.media + 10, `média ${comFx.media.toFixed(0)} → ${oleo.media.toFixed(0)}`);

  // Pincel pelo teclado
  confere('foco no seletor Pincel', await ev(`const s = ${sel('Pincel')}; s.focus(); return document.activeElement === s;`));
  await tecla('ArrowDown'); await tecla('ArrowDown'); const f5 = await fx();
  confere('↓ ↓ no Pincel escolhe a Seta', f5.p.brush === 2, 'brush ' + f5.p.brush);
  await wait(1200); const seta = await imagem();
  confere('com a Seta o efeito segue desenhando', seta.mudou > 0.05 && seta.media > 20, `média ${seta.media.toFixed(0)}, mudou ${(100 * seta.mudou).toFixed(0)} %`);

  // peso: Amount no máximo e Variation alta
  await ev(`const f = S.layers[0].fx[0]; f.params.amount = 5000; f.params.vari = 1; f.params.brush = 0; P.render(); return true;`); await wait(600);
  const qps = await ev(`const S2 = ms => new Promise(r => setTimeout(r, ms)); const f0 = P.frames(), t0 = performance.now(); await S2(2500); return (P.frames() - f0) / ((performance.now() - t0) / 1000);`);
  const livre = await ev(`const S2 = ms => new Promise(r => setTimeout(r, ms)); S.layers[0].fx = []; P.render(); await S2(400); const f0 = P.frames(), t0 = performance.now(); await S2(2500); return (P.frames() - f0) / ((performance.now() - t0) / 1000);`);
  confere('5000 pinceladas com Variation 1 não derrubam os quadros', qps > 0.85 * livre, `${qps.toFixed(1)} qps com o efeito, ${livre.toFixed(1)} sem`);
  const erros = await ev(`return (window.__erros || []).length;`);
  confere('sem erro no console do programa', !erros, erros);
} catch (e) { confere('a bateria rodou até o fim', false, String(e && e.message || e)); }
await ev(`S.layers[0].fx = []; P.render(); return true;`).catch(() => { });
console.log(`${ok} OK, ${ruim} falha(s)`); ws.close(); process.exit(ruim ? 1 : 0);
