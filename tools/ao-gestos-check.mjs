// Gestos da Saída avançada iguais aos do Resolume 7.28.1 (plano 07-04), com mouse e teclado REAIS pelo CDP.
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/ao-gestos-check.mjs
//
// Medido no Resolume (tools/compare/sondas/ao_resolume.py; fotos em tools/compare/saida/ao-resolume/g e /h):
//   arrastar o corpo ou um canto: pixels inteiros (com o ímã ligado, que é como ele abre); Ctrl: livre, com fração
//   Shift + corpo: só anda no eixo dominante; Shift + canto: mantém a proporção, canto oposto fixo
//   Alt + corpo: duplica e arrasta a cópia; Alt + canto: cresce para os dois lados, o centro fica
//   anel em volta do canto: gira em volta do centro; seta 1 px, Shift + seta 10 px; roda: cerca de 5% de zoom por passo
//   NÃO medido lá: o passo do giro com Shift (aqui: 15 graus) e o ponto em volta do qual o zoom acontece
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const click = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(250); };
const SHIFT = 8, CTRL = 2, ALT = 1;
const drag = async (x0, y0, x1, y1, mods = 0) => { await mouse('mouseMoved', x0, y0, { buttons: 0, modifiers: mods }); await mouse('mousePressed', x0, y0, { modifiers: mods }); for (let k = 1; k <= 12; k++) { await mouse('mouseMoved', x0 + (x1 - x0) * k / 12, y0 + (y1 - y0) * k / 12, { modifiers: mods }); await wait(20); } await mouse('mouseReleased', x1, y1, { modifiers: mods }); await wait(250); };
const key = async (k, vk, mods = 0) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: vk, modifiers: mods }); await wait(250); };
const cl = async (expr) => { const r = await ev(`const e = (${expr}); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };`); await click(r.x, r.y); };
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
// geometria do item selecionado: caixa dos pontos (saída) ou retângulo de entrada, giro, nome e quantos itens a tela tem
const G = () => ev(`const a = P.ao, it = a.sel && a.sel.item; if (!it) return null; const pts = it.pts || it.warp.pts, xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const b = a.tab === 'in' && it.in ? it.in : { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  return { x: b.x, y: b.y, w: b.w, h: b.h, rot: a.tab === 'in' && it.in ? it.in.rot || 0 : it.warp ? it.warp.rot || 0 : 0, p0: pts[0], nome: it.name, n: a.sel.screen.items.length, id: it.id };`);
const int = (v) => Math.abs(v - Math.round(v)) < 1e-6, perto = (a, b, t = 1.01) => Math.abs(a - b) <= t;
const txt = (g) => g ? [g.x, g.y, g.w, g.h].map(v => Math.round(v * 100) / 100).join(' ') + ' rot ' + Math.round(g.rot * 10) / 10 : 'sem seleção';
const igual = (a, b) => a && b && ['x', 'y', 'w', 'h', 'rot'].every(k => Math.abs(a[k] - b[k]) < 0.01) && a.n === b.n && a.nome === b.nome;   // o id muda a cada desfazer (o estado é refeito); o nome não

try {
  await cl(`document.querySelector('#btnAO')`); await wait(800); await cl(`document.querySelector('#aoTabOut')`); await wait(300);
  // 12-20: na regressão inteira, com a máquina carregada, o palco às vezes ainda não tinha viewBox aos 800 ms ("reading 'split'")
  for (let i = 0; i < 25 && !(await ev(`return !!document.querySelector('#aoSvg')?.getAttribute('viewBox');`)); i++) await wait(200);
  const svg = await ev(`const s = document.querySelector('#aoSvg'), r = s.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, W: +s.getAttribute('viewBox').split(' ')[2] };`);
  const k = svg.w / svg.W, X = v => svg.x + v * k, Y = v => svg.y + v * k;
  const ctrlZ = () => key('z', 90, CTRL);
  // um gesto, a conferência dele e UM Ctrl+Z que tem de voltar tudo
  const gesto = async (nome, b, faz, teste) => { await faz(); const g = await G(); const r = teste(g); confere(nome, !!r, txt(g)); await ctrlZ(); const v = await G(); confere(nome + ': um Ctrl+Z volta', igual(v, b), txt(v)); };

  for (const [alvo, rotulo] of [['maskRect', 'máscara'], ['slice', 'slice']]) {
    await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="${alvo}"]')`); await wait(400);
    const b = await G(); console.log('== ' + rotulo + ' (saída): ' + txt(b));
    const mx = X(b.x + b.w / 2), my = Y(b.y + b.h / 2 - 40), bx = X(b.x + b.w), by = Y(b.y + b.h), a0 = b.w / b.h;
    await gesto(rotulo + ': arrastar o corpo fica em pixels inteiros', b, () => drag(mx, my, mx + 70, my + 15), g => int(g.x) && int(g.y) && perto(g.x, b.x + 70 / k) && perto(g.y, b.y + 15 / k));
    await gesto(rotulo + ': Shift + corpo prende o eixo', b, () => drag(mx, my, mx + 70, my + 30, SHIFT), g => g.y === b.y && perto(g.x, b.x + 70 / k));
    await gesto(rotulo + ': Shift + corpo prende o eixo vertical', b, () => drag(mx, my, mx + 20, my + 60, SHIFT), g => g.x === b.x && perto(g.y, b.y + 60 / k));
    await gesto(rotulo + ': Ctrl + corpo fica livre (com fração)', b, () => drag(mx, my, mx + 70, my + 15, CTRL), g => !int(g.x) && Math.abs(g.x - (b.x + 70 / k)) < 0.01);
    await gesto(rotulo + ': Alt + corpo duplica e arrasta a cópia', b, () => drag(mx, my, mx + 70, my + 15, ALT), g => g.n === b.n + 1 && g.nome !== b.nome && perto(g.x, b.x + 70 / k) && perto(g.w, b.w, 0.01));
    await gesto(rotulo + ': canto fica em pixels inteiros, canto oposto fixo', b, () => drag(bx, by, bx + 35, by + 31), g => int(g.w) && int(g.h) && g.x === b.x && g.y === b.y && perto(g.w, b.w + 35 / k) && perto(g.h, b.h + 31 / k));
    await gesto(rotulo + ': Shift + canto mantém a proporção', b, () => drag(bx, by, bx + 35, by + 16, SHIFT), g => g.w > b.w + 20 && Math.abs(g.w / g.h - a0) < 0.006 && g.x === b.x && g.y === b.y);
    await gesto(rotulo + ': Alt + canto cresce pelo centro', b, () => drag(bx, by, bx + 35, by + 31, ALT), g => perto(g.x + g.w / 2, b.x + b.w / 2, 0.51) && perto(g.y + g.h / 2, b.y + b.h / 2, 0.51) && perto(g.w, b.w + 70 / k, 2) && perto(g.h, b.h + 62 / k, 2));
    await gesto(rotulo + ': Ctrl + canto fica livre', b, () => drag(bx, by, bx + 35, by + 31, CTRL), g => !int(g.w) && g.x === b.x);
    await gesto(rotulo + ': alça do lado só muda a largura', b, () => drag(bx, Y(b.y + b.h / 2), bx + 35, Y(b.y + b.h / 2)), g => g.h === b.h && int(g.w) && perto(g.w, b.w + 35 / k));
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r0 = Math.hypot(b.x - cx, b.y - cy);
    const girou = (g) => Math.abs(Math.hypot(g.p0[0] - cx, g.p0[1] - cy) - r0) < 0.6 && Math.hypot(g.p0[0] - b.p0[0], g.p0[1] - b.p0[1]) > 20 && g.n === b.n && g.nome === b.nome;
    await gesto(rotulo + ': o anel gira em volta do centro', b, () => drag(bx + 8, by + 8, bx + 8, by - 41), g => girou(g) && (alvo === 'maskRect' || Math.abs(g.rot) > 2));
    if (alvo === 'slice') await gesto(rotulo + ': Shift + anel gira de 15 em 15', b, () => drag(bx + 8, by + 8, bx + 8, by - 41, SHIFT), g => girou(g) && g.rot !== 0 && Math.abs(g.rot / 15 - Math.round(g.rot / 15)) < 1e-6);
    await wait(900); await gesto(rotulo + ': seta anda 1 px', b, () => key('ArrowRight', 39), g => g.x === b.x + 1);
    await wait(900);   // setas seguidas em menos de 0,8 s viram um passo só de desfazer
    await gesto(rotulo + ': Shift + seta anda 10 px', b, () => key('ArrowRight', 39, SHIFT), g => g.x === b.x + 10);
  }

  // aba de entrada: o mesmo no recorte do slice
  await cl(`document.querySelector('#aoTabIn')`); await wait(400);
  { const b = await G(); console.log('== slice (entrada): ' + txt(b));
    const s2 = await ev(`const s = document.querySelector('#aoSvg'), r = s.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, W: +s.getAttribute('viewBox').split(' ')[2] };`);
    const k2 = s2.w / s2.W, X2 = v => s2.x + v * k2, Y2 = v => s2.y + v * k2, mx = X2(b.x + b.w / 2), my = Y2(b.y + b.h / 2 - 40), bx = X2(b.x + b.w), by = Y2(b.y + b.h);
    await gesto('entrada: Shift + corpo prende o eixo, em pixels inteiros', b, () => drag(mx, my, mx + 70, my + 30, SHIFT), g => g.y === b.y && int(g.x) && perto(g.x, b.x + 70 / k2));
    await gesto('entrada: Shift + canto mantém a proporção', b, () => drag(bx, by, bx + 35, by + 16, SHIFT), g => g.w > b.w + 20 && Math.abs(g.w / g.h - b.w / b.h) < 0.006 && g.x === b.x);
    await gesto('entrada: o anel gira o recorte', b, () => drag(bx + 8, by + 8, bx + 8, by - 41), g => Math.abs(g.rot) > 2 && g.w === b.w);
  }
  await cl(`document.querySelector('#aoTabOut')`); await wait(400);

  // roda do mouse
  const z0 = await ev(`return { s: P.ao.scale, v: document.querySelector('#aoZoom').value };`);
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: X(960), y: Y(540), deltaX: 0, deltaY: -120 }); await wait(400);
  const z1 = await ev(`const z = document.querySelector('#aoZoom'); return { s: P.ao.scale, v: z.value, t: z.options[z.selectedIndex] ? z.options[z.selectedIndex].textContent : '' };`);
  confere('roda para cima aproxima cerca de 5%', Math.abs(z1.s / z0.s - 1.05) < 0.005, z0.s.toFixed(4) + ' → ' + z1.s.toFixed(4));
  confere('o campo de zoom mostra a porcentagem', /^\d+%$/.test(z1.t) && Math.abs(parseInt(z1.t) - z1.s * 100) <= 0.5, z1.t);
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: X(960), y: Y(540), deltaX: 0, deltaY: 240 }); await wait(400);
  const z2 = await ev(`return P.ao.scale;`); confere('roda para baixo afasta', z2 < z1.s, z2.toFixed(4));
  await cl(`document.querySelector('#aoZoom')`); await ev(`const z = document.querySelector('#aoZoom'); z.value = 'fit'; z.dispatchEvent(new Event('change', { bubbles: true })); return 1;`); await key('Escape', 27); await wait(300);
  const z3 = await ev(`return { s: P.ao.scale, aberta: P.ao.open, n: document.querySelector('#aoZoom').options.length };`);
  confere('"Ajustar" volta a encaixar', Math.abs(z3.s - z0.s) < 0.001, z3.s.toFixed(4));

  if (await ev(`return P.ao.open;`)) { await cl(`document.querySelector('#aoCancel')`); await wait(500); }
  for (let i = 0; i < 2 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) await cl(`[...document.querySelectorAll('.dlgOver button')].pop()`);
} catch (e) { ruim++; console.log('PAROU: ' + String(e.message).slice(0, 400)); }
console.log(`\n${ok + ruim} verificações, ${ruim} falha(s) — ${ruim ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(ruim ? 1 : 0);
