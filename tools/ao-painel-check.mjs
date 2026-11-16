// Painel da máscara, máscara nova e lista de zoom da Saída avançada como no Resolume 7.28.1 (plano 07-05),
// com mouse e teclado REAIS pelo CDP.
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/ao-painel-check.mjs
//
// Medido no Resolume (07-03-DIFERENCAS.md, linhas 16, 21 e 25): a máscara retangular nasce 756×756 em (582, 162) numa
// tela 1920×1080; o painel dela tem X, Y, Left, Top, Width, Height, Rotation e Invert; o zoom lista Fit, 10, 25, 50,
// 100, 150, 200 e 300%.
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const click = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(250); };
const drag = async (x0, y0, x1, y1, mods = 0) => { await mouse('mouseMoved', x0, y0, { buttons: 0, modifiers: mods }); await mouse('mousePressed', x0, y0, { modifiers: mods }); for (let k = 1; k <= 12; k++) { await mouse('mouseMoved', x0 + (x1 - x0) * k / 12, y0 + (y1 - y0) * k / 12, { modifiers: mods }); await wait(20); } await mouse('mouseReleased', x1, y1, { modifiers: mods }); await wait(250); };
const key = async (k, vk, mods = 0) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: vk, modifiers: mods }); await wait(200); };
const digita = async (t) => { for (const ch of t) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch }); } };
const cl = async (expr) => { const r = await ev(`const e = (${expr}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };`); if (!r) throw new Error('não achei na tela: ' + expr); await click(r.x, r.y); };
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
const linha = (rot) => `[...document.querySelectorAll('#aoProps > *')].find(r => r.querySelector('.val') && r.textContent.trim().replace(/[-\\d.,°−+ ]+$/, '').trim() === ${JSON.stringify(rot)})`;
const campo = (rot) => ev(`const r = ${linha(rot)}; return r ? r.querySelector('.val').textContent.trim() : null;`);
const poe = async (rot, v) => { await cl(`(${linha(rot)} || {querySelector(){return null}}).querySelector('.val')`); await key('a', 65, 2); await digita(String(v)); await key('Enter', 13); await wait(300); };
const G = () => ev(`const a = P.ao, it = a.sel && a.sel.item; if (!it) return null; const xs = it.pts.map(p => p[0]), ys = it.pts.map(p => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), rot: it.rot, inv: it.invert, p0: it.pts[0], nome: it.name, n: a.sel.screen.items.length, tipo: it.type };`);
const txt = (g) => g ? [g.x, g.y, g.w, g.h].map(v => Math.round(v * 100) / 100).join(' ') + ' rot ' + g.rot : 'sem seleção';
const eq = (a, b, t = 0.01) => Math.abs(a - b) <= t;

try {
  await cl(`document.querySelector('#btnAO')`); await wait(800); await cl(`document.querySelector('#aoTabOut')`); await wait(300);
  const z = await ev(`return [...document.querySelector('#aoZoom').options].map(o => o.textContent).join(' ');`);
  confere('lista de zoom: Ajustar, 10, 25, 50, 100, 150, 200, 300%', z === 'Ajustar 10% 25% 50% 100% 150% 200% 300%', z);
  const tela = await ev(`const s = P.ao.curScreen(); return { w: s.w, h: s.h };`);
  await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="maskRect"]')`); await wait(400);
  const b = await G(); const lado = tela.h * 0.7;
  confere('máscara nova nasce quadrada, 70% da altura, no centro', b && b.tipo === 'mask' && eq(b.w, lado) && eq(b.h, lado) && eq(b.x, (tela.w - lado) / 2) && eq(b.y, tela.h * 0.15), txt(b));
  if (tela.w === 1920 && tela.h === 1080) confere('numa tela 1920×1080: 756×756 em (582, 162), como no Resolume', eq(b.x, 582) && eq(b.y, 162) && eq(b.w, 756) && eq(b.h, 756), txt(b));
  // medido no Resolume (07-10-MEDIDAS.md): a máscara nasce com Invert ligado e a imagem aparece só dentro da forma
  confere('máscara nova nasce com Inverter ligado, como no Resolume', b.inv === true && await ev(`const r = [...document.querySelectorAll('#aoProps > *')].find(x => x.textContent.trim().startsWith('Inverter')); return !!r && r.querySelector('.ck').classList.contains('on');`));
  const px = await ev(`const a = P.ao.screens(); P.engine.testCard = true; const r = P.engine.probeScreen(a[0], P.state.layers, a, [[0.5, 0.5], [0.05, 0.5]]); P.engine.testCard = false; return r;`);
  confere('na tela, a imagem aparece dentro da máscara nova e fica preta fora', px[0].some(v => v > 30) && px[1].every(v => v === 0), JSON.stringify(px));
  const campos = {}; for (const r of ['X', 'Y', 'Esquerda', 'Topo', 'Largura', 'Altura', 'Giro']) campos[r] = await campo(r);
  confere('o painel da máscara tem X, Y, Esquerda, Topo, Largura, Altura e Giro', Object.values(campos).every(v => v !== null), JSON.stringify(campos));
  confere('os campos mostram a caixa da forma', parseFloat(campos.X) === b.x + b.w / 2 && parseFloat(campos.Y) === b.y + b.h / 2 && parseFloat(campos.Esquerda) === b.x && parseFloat(campos.Topo) === b.y && parseFloat(campos.Largura) === b.w && parseFloat(campos.Altura) === b.h && parseFloat(campos.Giro) === 0);
  const ctrlZ = () => key('z', 90, 2);
  const passo = async (nome, faz, teste) => { await faz(); const g = await G(); confere(nome, !!teste(g), txt(g)); await ctrlZ(); const v = await G(); confere(nome + ': Ctrl+Z volta', v && eq(v.x, b.x) && eq(v.y, b.y) && eq(v.w, b.w) && eq(v.h, b.h) && (v.rot || 0) === 0 && v.n === b.n, txt(v)); };
  await passo('X = 1000 move o centro', () => poe('X', 1000), g => eq(g.x + g.w / 2, 1000) && eq(g.w, b.w) && eq(g.y, b.y));
  await passo('Y = 300 move o centro', () => poe('Y', 300), g => eq(g.y + g.h / 2, 300) && eq(g.x, b.x));
  await passo('Esquerda = 100', () => poe('Esquerda', 100), g => eq(g.x, 100) && eq(g.w, b.w));
  await passo('Topo = 50', () => poe('Topo', 50), g => eq(g.y, 50) && eq(g.h, b.h));
  await passo('Largura = 400 estica, borda esquerda fica', () => poe('Largura', 400), g => eq(g.w, 400) && eq(g.x, b.x) && eq(g.h, b.h));
  await passo('Altura = 300 estica, topo fica', () => poe('Altura', 300), g => eq(g.h, 300) && eq(g.y, b.y) && eq(g.w, b.w));
  await passo('Giro = 30 gira em volta do centro', () => poe('Giro', 30), g => g.rot === 30 && Math.hypot(g.p0[0] - b.p0[0], g.p0[1] - b.p0[1]) > 50 && eq(Math.hypot(g.p0[0] - 960, g.p0[1] - 540), Math.hypot(b.p0[0] - 960, b.p0[1] - 540), 0.5));
  // giro pelo campo e volta pelo campo: os pontos voltam ao lugar
  await poe('Giro', 45); await poe('Giro', 0); { const g = await G(); confere('Giro 45 e depois 0 devolve os pontos', (g.rot || 0) === 0 && eq(g.p0[0], b.p0[0], 0.01) && eq(g.p0[1], b.p0[1], 0.01), txt(g)); await ctrlZ(); await ctrlZ(); }
  // anel: o campo acompanha, e a cópia (que passa por salvar e abrir) guarda o giro
  const svg = await ev(`const s = document.querySelector('#aoSvg'), r = s.getBoundingClientRect(); return { x: r.left, y: r.top, k: r.width / +s.getAttribute('viewBox').split(' ')[2] };`);
  const X = v => svg.x + v * svg.k, Y = v => svg.y + v * svg.k, bx = X(b.x + b.w), by = Y(b.y + b.h);
  await drag(bx + 8, by + 8, bx + 8, by - 41, 8); const g1 = await G(), c1 = await campo('Giro');
  confere('girar pelo anel (com Shift) aparece no campo Giro', g1.rot !== 0 && g1.rot % 15 === 0 && parseFloat(c1) === g1.rot, 'rot ' + g1.rot + ', campo ' + c1);
  const m = await ev(`const it = P.ao.sel.item, xs = it.pts.map(p => p[0]), ys = it.pts.map(p => p[1]); return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };`);
  await drag(X(m.x), Y(m.y - 40), X(m.x) + 60, Y(m.y - 40), 1); const g2 = await G();
  confere('a cópia (Alt + arrastar) guarda o giro', g2.n === b.n + 1 && g2.nome !== b.nome && g2.rot === g1.rot, txt(g2));

  await cl(`document.querySelector('#aoCancel')`); await wait(500);
  for (let i = 0; i < 2 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) await cl(`[...document.querySelectorAll('.dlgOver button')].pop()`);
} catch (e) { ruim++; console.log('PAROU: ' + String(e.message).slice(0, 400)); }
console.log(`\n${ok + ruim} verificações, ${ruim} falha(s) — ${ruim ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(ruim ? 1 : 0);
