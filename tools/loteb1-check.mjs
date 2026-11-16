// Lote B1 do pente fino (plano 12-12): defeitos de projetor e tela (achados 36, 37, 38, 41, 43 do 12-01-ACHADOS.md),
// com mouse e teclado REAIS pelo CDP e os projetores ligados.
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Precisa de pelo menos um monitor além do de controle. Abre e fecha janelas de saída nos projetores; não deixa nenhuma.
// Uso: node tools/loteb1-check.mjs
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const paginas = async () => (await (await fetch(base + '/json')).json()).filter(p => p.type === 'page');
async function liga(pg) { const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  return { ws, send }; }
const { ws, send } = await liga((await paginas()).find(p => p.title === 'OpenLuz'));
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const click = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(250); };
const key = async (k, vk, mods = 0) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: vk, modifiers: mods }); await wait(200); };
const cl = async (expr) => { const r = await ev(`const e = (${expr}); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;`); if (!r) throw new Error('não achei na tela: ' + expr.slice(0, 90)); await click(r.x, r.y); };
const texto = (t) => `[...document.querySelectorAll('button, .mi, .tab, .lb, label, span, div')].filter(e => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(t)} && e.getBoundingClientRect().width > 0).sort((a, b) => (b.tagName === 'BUTTON') - (a.tagName === 'BUTTON'))[0]`;
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
// onde está cada janela de saída aberta, lido dentro dela
const saidas = async () => { const out = []; for (const p of (await paginas()).filter(p => p.url.includes('output.html'))) { const o = await liga(p); const r = await o.send('Runtime.evaluate', { expression: `JSON.stringify({ x: screenX, y: screenY, w: innerWidth, h: innerHeight, sw: screen.width, sh: screen.height, dpr: devicePixelRatio })`, returnByValue: true }); o.ws.close(); out.push(JSON.parse(r.result.result.value)); } return out; };
const fechaSaidas = async () => { if (await ev(`return S.screens.some(s => s.win && !s.win.closed);`)) { await cl(`document.querySelector('#btnOut')`); await wait(900); } };

try {
  const mon = await ev(`return await window.projDesktop.displays();`);
  console.log('monitores: ' + mon.map(d => `${d.label} ${d.w}×${d.h} em ${d.x},${d.y} escala ${d.scale}${d.primary ? ' (principal)' : ''}`).join(' | '));
  if (mon.length < 2) throw new Error('só há um monitor: este lote precisa de um projetor ligado');

  // ---- 43: a lista Telas não pode ser refeita com o seletor de monitor aberto
  await ev(`window.__sel43 = document.querySelector('#scrList select.dev'); return 1;`);
  await cl(`document.querySelector('#scrList select.dev')`); await wait(2300);
  const a43 = await ev(`return { mesma: window.__sel43.isConnected, foco: document.activeElement === window.__sel43 };`);
  confere('43: com o seletor de monitor aberto, a lista Telas não é refeita (o seletor não fecha sozinho)', a43.mesma && a43.foco, JSON.stringify(a43));
  await key('Escape', 27); await cl(`document.querySelector('#compName')`);
  await wait(1300); confere('43: fechado o seletor, a lista volta a se atualizar', await ev(`return !window.__sel43.isConnected || document.activeElement !== window.__sel43;`));

  // ---- 37: OUTPUT › Automático com a saída já aberta reabre no mesmo projetor, em tela cheia
  await cl(`document.querySelector('#btnOut')`); await wait(2500);
  const s1 = await saidas(); console.log('   saída aberta: ' + JSON.stringify(s1));
  confere('37: a saída abre num projetor, em tela cheia', s1.length === 1 && s1[0].w === s1[0].sw && s1[0].h === s1[0].sh && !(s1[0].x === 0 && s1[0].y === 0), JSON.stringify(s1[0] || {}));
  await cl(texto('OUTPUT')); await wait(250); await cl(`[...document.querySelectorAll('.mi, .menu *')].filter(e => e.children.length === 0 && e.textContent.trim().startsWith('Automático') && e.getBoundingClientRect().width > 0)[0]`); await wait(2800);
  const s2 = await saidas(); console.log('   depois de OUTPUT › Automático: ' + JSON.stringify(s2));
  confere('37: OUTPUT › Automático com a saída aberta reabre no mesmo projetor, em tela cheia', s2.length === 1 && s1.length === 1 && s2[0].x === s1[0].x && s2[0].y === s1[0].y && s2[0].w === s1[0].w && s2[0].h === s1[0].h, JSON.stringify(s2[0] || {}));

  // ---- 41: a tela tem o tamanho do projetor em pixels de verdade, não em pixels lógicos
  const alvo = mon.find(d => s2[0] && d.x === s2[0].x && d.y === s2[0].y), tela = await ev(`const s = S.screens.find(x => x.win && !x.win.closed); return s ? { w: s.w, h: s.h } : null;`);
  if (alvo && tela) confere('41: a tela mede o projetor em pixels físicos', tela.w === Math.round(alvo.w * alvo.scale) && tela.h === Math.round(alvo.h * alvo.scale), `tela ${tela.w}×${tela.h}, projetor ${alvo.w}×${alvo.h} lógicos, escala ${alvo.scale}` + (alvo.scale === 1 ? ' — com escala 100% este teste não distingue' : ''));
  else confere('41: achei o projetor em que a saída abriu', false);
  await fechaSaidas();

  // ---- 38: desligar uma tela no editor
  await cl(`document.querySelector('#btnAO')`); await wait(700);
  await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="screen"]')`); await wait(400);
  await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="slice"]')`); await wait(400);
  const g0 = await ev(`const a = P.ao, sc = a.screens(); const s1 = sc[0].items.find(i => i.type === 'slice'), s2 = sc[1].items.find(i => i.type === 'slice'); if (!s1 || !s2) return null;
    s1.soft.on = true; s2.soft.on = true; s2.in = { ...s2.in, x: 0, y: 0, w: 1200, h: 1080 }; s1.in = { ...s1.in, x: 720, y: 0, w: 1200, h: 1080 }; s1.rev = (s1.rev || 0) + 1; s2.rev = (s2.rev || 0) + 1; a.refresh();
    return { g1: a.grads(s1).filter(g => g.on).length, g2: a.grads(s2).filter(g => g.on).length, telas: sc.length };`);
  console.log('   duas telas com slices sobrepostos na entrada: ' + JSON.stringify(g0));
  confere('38: preparo — os dois slices sobrepostos ganham emenda', g0 && g0.g1 > 0 && g0.g2 > 0, JSON.stringify(g0));
  await cl(`document.querySelectorAll('#aoList .row.screen .ck')[1]`); await wait(400);
  const g1 = await ev(`const a = P.ao, sc = a.screens(); const s1 = sc[0].items.find(i => i.type === 'slice'); return { ligada: sc[1].enabled, g1: a.grads(s1).filter(g => g.on).length, saida2: !!(sc[1].win && !sc[1].win.closed) };`);
  console.log('   com a segunda tela desligada: ' + JSON.stringify(g1));
  confere('38: tela desligada não projeta, então o vizinho fica sem emenda E a saída dela não fica aberta', g1 && g1.ligada === false && g1.g1 === 0 && g1.saida2 === false, JSON.stringify(g1));
  await cl(`document.querySelector('#aoCancel')`); await wait(500);
  for (let i = 0; i < 2 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) await cl(`[...document.querySelectorAll('.dlgOver button')].pop()`);

  // ---- 38b: desligar no editor uma tela que está com a saída aberta fecha a saída dela
  if (mon.length >= 3) {
    await cl(`document.querySelector('#btnAO')`); await wait(700);
    await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="screen"]')`); await wait(400);
    await cl(`document.querySelector('#aoOk')`); await wait(600);
    await cl(`document.querySelector('#btnOut')`); await wait(3000);
    const n0 = (await saidas()).length;
    await cl(`document.querySelector('#btnAO')`); await wait(700); await cl(`document.querySelectorAll('#aoList .row.screen .ck')[1]`); await wait(1200);
    const n1 = (await saidas()).length;
    confere('38: desligar uma tela no editor fecha a janela de saída dela', n0 === 2 && n1 === 1, `saídas abertas: ${n0} → ${n1}`);
    await cl(`document.querySelector('#aoCancel')`); await wait(500);
    for (let i = 0; i < 2 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) await cl(`[...document.querySelectorAll('.dlgOver button')].pop()`);
    await fechaSaidas();
  } else console.log('   38b: só com três monitores (duas saídas abertas); pulado');

  // ---- 36: o programa fica sabendo quando um monitor chega ou sai
  confere('36: o programa escuta a chegada e a saída de monitores', await ev(`return typeof window.projDesktop.onDisplays === 'function';`), 'reprodução de verdade pede tirar e pôr o cabo de um projetor');
} catch (e) { ruim++; console.log('PAROU: ' + String(e.message).slice(0, 400)); }
try { await fechaSaidas(); } catch { }
console.log(`\n${ok + ruim} verificações, ${ruim} falha(s) — ${ruim ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(ruim ? 1 : 0);
