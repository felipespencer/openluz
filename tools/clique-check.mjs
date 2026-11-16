// Clique na grade que sobrevive ao refazer (plano 12-13), com mouse REAL pelo CDP.
// A grade inteira é refeita a cada disparo do Autopilot; se isso cai entre o apertar e o soltar do botão, o navegador não
// gera o clique. Aqui o refazer é provocado de propósito (P.render()) entre o apertar e o soltar.
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/clique-check.mjs
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const onde = async (expr) => { const r = await ev(`const e = (${expr}); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;`); if (!r) throw new Error('não achei na tela: ' + expr.slice(0, 90)); return r; };
// aperta em A, refaz a grade (ou não), solta em B (ou no mesmo lugar)
const gesto = async (expr, { refaz = true, soltaEm = null } = {}) => { const a = await onde(expr); await mouse('mouseMoved', a.x, a.y, { buttons: 0 }); await mouse('mousePressed', a.x, a.y); await wait(60);
  if (refaz) await ev(`P.render(); return 1;`); await wait(60); const b = soltaEm ? await onde(soltaEm) : a; if (soltaEm) await mouse('mouseMoved', b.x, b.y); await mouse('mouseReleased', b.x, b.y); await wait(250); };
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
const casa = (l, c) => `document.querySelector('.cell[data-layer="${l}"][data-col="${c}"] .th')`, nome = (l, c) => `document.querySelector('.cell[data-layer="${l}"][data-col="${c}"] .nm')`;
const bot = (op, l) => `document.querySelectorAll('#grid button[data-op="${op}"]')[${l}]`;
const est = () => ev(`return { on: S.layers.map(L => L.on), sel: S.sel, pv: S.pv || null, by: S.layers[1].bypass, so: !!S.layers[1].solo };`);
const j = (v) => JSON.stringify(v);

try {
  await ev(`await P.reset(); P.putSource(0, 0, 'sinewave'); P.putSource(1, 0, 'rings'); P.putSource(1, 1, 'checkered'); P.render(); return 1;`); await wait(400);
  let e = await est(); confere('preparo: três clipes na grade, nada no ar', e.on.every(v => v === -1), j(e));

  await gesto(casa(1, 0)); e = await est();
  confere('casa: apertar, grade refeita, soltar — o clipe entra no ar e a casa fica selecionada', e.on[1] === 0 && e.sel && e.sel.l === 1 && e.sel.c === 0, j(e));
  await gesto(nome(1, 1)); e = await est();
  confere('nome do clipe: o clique manda para a Prévia sem mexer no que está no ar', e.pv && e.pv.l === 1 && e.pv.c === 1 && e.on[1] === 0, j(e));
  await gesto(bot('B', 1)); e = await est(); confere('B da camada: liga o bypass', e.by === true, j(e));
  await gesto(bot('B', 1)); e = await est(); confere('B de novo: desliga (uma vez só por clique)', e.by === false, j(e));
  await gesto(bot('S', 1)); e = await est(); confere('S da camada: liga o solo', e.so === true, j(e));
  await gesto(bot('S', 1)); e = await est(); confere('S de novo: desliga', e.so === false, j(e));
  await gesto(bot('X', 1)); e = await est(); confere('✕ da camada: tira do ar', e.on[1] === -1, j(e));

  // sem clique dobrado nem fantasma
  await gesto(casa(1, 1), { refaz: false }); e = await est(); confere('clique comum, sem refazer: dispara', e.on[1] === 1, j(e));
  await gesto(bot('B', 1), { refaz: false }); e = await est(); confere('clique comum no B: liga uma vez (não dobra)', e.by === true, j(e));
  await gesto(bot('B', 1), { refaz: false }); e = await est(); confere('clique comum no B: desliga uma vez', e.by === false, j(e));
  await gesto(casa(1, 0), { soltaEm: casa(0, 0) }); e = await est(); confere('apertar numa casa e soltar em outra, com a grade refeita: nada dispara', e.on[1] === 1 && e.on[0] === -1, j(e));
  await ev(`S.layers[1].clips[1].trig = 'toggle'; P.render(); return 1;`);
  await gesto(casa(1, 1)); e = await est(); confere('clipe de estilo alternar, no ar, com a grade refeita no meio: sai do ar uma vez (não volta)', e.on[1] === -1, j(e));
  await gesto(casa(1, 1)); e = await est(); confere('e o clique seguinte põe de volta', e.on[1] === 1, j(e));

  // o caso real: Autopilot rápido refazendo a grade enquanto se clica
  await ev(`S.layers[1].clips[1].trig = 'normal'; Object.assign(S.layers[0].autopilot, { dir: 'next', dur: 'fixed', secs: 0.15, loop: true }); P.putSource(0, 1, 'checkered'); P.trigger(0, 0); P.render(); return 1;`);
  let certos = 0; const N = 30;
  for (let i = 0; i < N; i++) { const c = i % 2; const a = await onde(casa(1, c)); await mouse('mouseMoved', a.x, a.y, { buttons: 0 }); await mouse('mousePressed', a.x, a.y); await wait(110); await mouse('mouseReleased', a.x, a.y); await wait(90); if ((await ev(`return S.layers[1].on;`)) === c) certos++; }
  await ev(`S.layers[0].autopilot.dir = 'off'; return 1;`);
  confere(`com o Autopilot trocando a cada 0,15 s, ${N} cliques seguidos: todos entram`, certos === N, certos + ' de ' + N);
  await ev(`await P.reset(); return 1;`);
} catch (e) { ruim++; console.log('PAROU: ' + String(e.message).slice(0, 400)); }
console.log(`\n${ok + ruim} verificações, ${ruim} falha(s) — ${ruim ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(ruim ? 1 : 0);
