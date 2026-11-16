// Gestos do modo Editar pontos da Saída avançada como no Resolume 7.28.1 (plano 07-11), com mouse e teclado REAIS pelo CDP.
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/ao-pontos-check.mjs
//
// Medido no Resolume (.paul/phases/07-saida-avancada/07-11-MEDIDAS.md), num ponto de canto do slice:
//   arrastar: livre e com fração (1440 → 1538,82), mesmo com o ímã ligado; Shift não prende o eixo; Alt não muda nada
//   Ctrl + arrastar num ponto escolhido: o ponto não anda e sai da seleção; Ctrl+clique em outro ponto: soma à seleção
//   com dois pontos escolhidos o painel não mostra X e Y; as setas movem os dois (1 px; com Shift, 10 px)
//   clicar num ponto da seleção mantém a seleção; arrastá-lo move só ele; clicar em outro ponto deixa só esse escolhido
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const SHIFT = 8, CTRL = 2, ALT = 1;
const drag = async (x0, y0, x1, y1, mods = 0) => { await mouse('mouseMoved', x0, y0, { buttons: 0, modifiers: mods }); await mouse('mousePressed', x0, y0, { modifiers: mods }); for (let k = 1; k <= 10; k++) { await mouse('mouseMoved', x0 + (x1 - x0) * k / 10, y0 + (y1 - y0) * k / 10, { modifiers: mods }); await wait(20); } await mouse('mouseReleased', x1, y1, { modifiers: mods }); await wait(250); };
const click = (x, y, mods = 0) => drag(x, y, x, y, mods);
const key = async (k, vk, mods = 0) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: vk, modifiers: mods }); await wait(220); };
const cl = async (expr) => { const r = await ev(`const e = (${expr}); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };`); await click(r.x, r.y); };
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
const E = () => ev(`const a = P.ao, it = a.sel && a.sel.item; return { pts: it.warp.pts.map(p => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]), sel: a.selPt, varios: [...a.selPts].sort(), xy: [...document.querySelectorAll('#aoProps > *')].filter(r => /^[XY]\\s*-?\\d/.test(r.textContent.trim())).map(r => r.querySelector('.val').textContent.trim()).join(' '), acesos: document.querySelectorAll('#aoSvg .hd.anc.cur').length };`);
const j = (v) => JSON.stringify(v), int = (v) => Math.abs(v - Math.round(v)) < 1e-6, perto = (a, b, t = 0.6) => Math.abs(a - b) <= t;
const iguais = (a, b) => j(a) === j(b);

try {
  await cl(`document.querySelector('#btnAO')`); await wait(800); await cl(`document.querySelector('#aoTabOut')`); await wait(300);
  await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="slice"]')`); await wait(400);
  await cl(`document.querySelector('#aoPts')`); await wait(300);
  const svg = await ev(`const s = document.querySelector('#aoSvg'), r = s.getBoundingClientRect(); return { x: r.left, y: r.top, k: r.width / +s.getAttribute('viewBox').split(' ')[2] };`);
  const k = svg.k, X = v => svg.x + v * k, Y = v => svg.y + v * k;
  const b = await E(); console.log('pontos do slice: ' + j(b.pts));
  const [TL, TR, BR, BL] = b.pts, ctrlZ = () => key('z', 90, CTRL);

  await click(X(BR[0]), Y(BR[1])); let e = await E();
  confere('clicar num ponto: ele fica escolhido e o painel mostra X e Y dele', e.sel === 2 && e.xy === BR[0] + ' ' + BR[1] && e.acesos === 1, j({ sel: e.sel, xy: e.xy }));
  await drag(X(BR[0]), Y(BR[1]), X(BR[0]) + 35, Y(BR[1]) + 31); e = await E();
  confere('arrastar o ponto: livre e com fração, como no Resolume', perto(e.pts[2][0], BR[0] + 35 / k) && perto(e.pts[2][1], BR[1] + 31 / k) && !int(e.pts[2][0]) && iguais(e.pts[0], TL), j(e.pts[2]));
  await ctrlZ(); e = await E(); confere('um Ctrl+Z volta o ponto', iguais(e.pts, b.pts), j(e.pts[2]));
  await drag(X(BR[0]), Y(BR[1]), X(BR[0]) + 35, Y(BR[1]) + 16, SHIFT); e = await E();
  confere('Shift + arrastar o ponto: não prende o eixo (os dois mudam)', perto(e.pts[2][0], BR[0] + 35 / k) && perto(e.pts[2][1], BR[1] + 16 / k), j(e.pts[2]));
  await ctrlZ();
  await drag(X(BR[0]), Y(BR[1]), X(BR[0]) + 35, Y(BR[1]) + 31, ALT); e = await E();
  confere('Alt + arrastar o ponto: igual a arrastar', perto(e.pts[2][0], BR[0] + 35 / k) && perto(e.pts[2][1], BR[1] + 31 / k), j(e.pts[2]));
  await ctrlZ();

  await click(X(BR[0]), Y(BR[1])); await drag(X(BR[0]), Y(BR[1]), X(BR[0]) + 35, Y(BR[1]) + 31, CTRL); e = await E();
  confere('Ctrl + arrastar num ponto escolhido: o ponto não anda e sai da seleção', iguais(e.pts, b.pts) && e.sel === -1 && e.xy === '' && e.acesos === 0, j({ p: e.pts[2], sel: e.sel, xy: e.xy }));

  await click(X(BR[0]), Y(BR[1])); await click(X(TR[0]), Y(TR[1]), CTRL); e = await E();
  confere('Ctrl+clique em outro ponto: os dois ficam escolhidos e o painel não mostra X e Y', iguais(e.varios, [1, 2]) && e.acesos === 2 && e.xy === '', j({ varios: e.varios, acesos: e.acesos, xy: e.xy }));
  await wait(900); await key('ArrowDown', 40); await key('ArrowDown', 40); await key('ArrowRight', 39); e = await E();
  confere('setas com dois pontos escolhidos: os dois andam (1 px por toque), os outros ficam', iguais(e.pts[1], [TR[0] + 1, TR[1] + 2]) && iguais(e.pts[2], [BR[0] + 1, BR[1] + 2]) && iguais(e.pts[0], TL) && iguais(e.pts[3], BL), j(e.pts));
  await wait(900); await key('ArrowLeft', 37, SHIFT); e = await E();
  confere('Shift + seta: os dois andam 10 px', iguais(e.pts[1], [TR[0] - 9, TR[1] + 2]) && iguais(e.pts[2], [BR[0] - 9, BR[1] + 2]), j([e.pts[1], e.pts[2]]));
  await ctrlZ(); await ctrlZ(); e = await E(); confere('dois Ctrl+Z voltam os dois grupos de setas', iguais(e.pts, b.pts), j(e.pts));

  await click(X(BR[0]), Y(BR[1])); await click(X(TR[0]), Y(TR[1]), CTRL); await click(X(BR[0]), Y(BR[1])); e = await E();
  confere('clicar num ponto da seleção mantém os dois escolhidos', iguais(e.varios, [1, 2]) && e.acesos === 2, j(e.varios));
  await drag(X(BR[0]), Y(BR[1]), X(BR[0]) + 35, Y(BR[1]) + 31); e = await E();
  confere('arrastar um ponto da seleção move só ele', perto(e.pts[2][0], BR[0] + 35 / k) && iguais(e.pts[1], TR), j([e.pts[1], e.pts[2]]));
  await ctrlZ();
  await click(X(TL[0]), Y(TL[1])); e = await E();
  confere('clicar em outro ponto: fica só ele escolhido, com X e Y no painel', e.sel === 0 && e.varios.length === 0 && e.acesos === 1 && e.xy === TL[0] + ' ' + TL[1], j({ sel: e.sel, varios: e.varios, xy: e.xy }));
  await click(X(BR[0]), Y(BR[1])); await click(X(TR[0]), Y(TR[1]), CTRL); await click(X(TR[0]), Y(TR[1]), CTRL); e = await E();
  confere('Ctrl+clique de novo no segundo ponto: ele sai e volta a ficar só o primeiro', e.sel === 2 && e.acesos === 1, j({ sel: e.sel, varios: e.varios, acesos: e.acesos }));
  await cl(`document.querySelector('#aoMove')`); await wait(200); await cl(`document.querySelector('#aoPts')`); await wait(200); e = await E();
  confere('sair do modo Editar pontos esquece a seleção de pontos', e.sel === -1 && e.varios.length === 0 && e.acesos === 0, j({ sel: e.sel, varios: e.varios }));

  await cl(`document.querySelector('#aoCancel')`); await wait(500);
  for (let i = 0; i < 2 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) await cl(`[...document.querySelectorAll('.dlgOver button')].pop()`);
} catch (e) { ruim++; console.log('PAROU: ' + String(e.message).slice(0, 400)); }
console.log(`\n${ok + ruim} verificações, ${ruim} falha(s) — ${ruim ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(ruim ? 1 : 0);
