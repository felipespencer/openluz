// Test Card no quadro Composição (plano 12-15), com clique REAL no menu pelo CDP.
// Programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP) e pasta de dados própria (node tools/compare/abre-dev.mjs).
// Uso: node tools/testcard-check.mjs
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const cl = async (expr) => { const r = await ev(`const e = (${expr}); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;`); if (!r) throw new Error('não achei na tela: ' + expr.slice(0, 90)); await mouse('mouseMoved', r.x, r.y, { buttons: 0 }); await mouse('mousePressed', r.x, r.y); await mouse('mouseReleased', r.x, r.y); await wait(300); };
const texto = (t) => `[...document.querySelectorAll('button, .mi, .tab, .lb, label, span, div')].filter(e => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(t)} && e.getBoundingClientRect().width > 0).sort((a, b) => (b.tagName === 'BUTTON') - (a.tagName === 'BUTTON'))[0]`;
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
// o que o quadro Composição mostra: média e quantas cores diferentes numa grade de pontos do canvas dele
const quadro = async () => { await wait(500); return ev(`const c = document.querySelector('#outScr canvas'), g = document.createElement('canvas'); g.width = 96; g.height = 54; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 96, 54); const d = x.getImageData(0, 0, 96, 54).data; let s = 0; const cores = new Set(); for (let i = 0; i < d.length; i += 4) { s += d[i] + d[i + 1] + d[i + 2]; cores.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)); } return { media: Math.round(s / (96 * 54 * 3)), cores: cores.size };`); };
const menuTestCard = async () => { await cl(texto('OUTPUT')); await wait(250); await cl(`[...document.querySelectorAll('body *')].filter(e => e.textContent.trim().startsWith('Mostrar Test Card') && e.getBoundingClientRect().width > 0).sort((a, b) => a.textContent.length - b.textContent.length)[0]`); await wait(400); };
const j = (v) => JSON.stringify(v);
try {
  // numa pasta de dados nova, com projetor ligado, o assistente Projetores abre sozinho: dispensar
  for (let i = 0; i < 3 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) await cl(`[...document.querySelectorAll('.dlgOver button')].find(b => /Pular|Cancelar|Fechar/.test(b.textContent))`);
  await ev(`await P.reset(); return 1;`);
  const a = await quadro(); confere('preparo: grade vazia, quadro Composição preto e Test Card desligado', a.media < 3 && !(await ev(`return !!S.testCard;`)), j(a));
  await menuTestCard(); const b = await quadro();
  confere('OUTPUT › Mostrar Test Card: o quadro Composição mostra o test card', await ev(`return S.testCard === true;`) && b.media > 20 && b.cores > 8, j(b));
  const t = await ev(`const a = S.screens; return P.engine.probeScreen(a[0], S.layers, a, [[0.5, 0.5], [0.2, 0.3], [0.8, 0.7]]);`);
  confere('a tela de saída continua recebendo o test card', t.some(c => c[0] + c[1] + c[2] > 60), j(t));
  await menuTestCard(); const c = await quadro();
  confere('desligado, o quadro Composição volta a mostrar a composição', await ev(`return !S.testCard;`) && c.media < 3, j(c));
} catch (e) { ruim++; console.log('PAROU: ' + String(e.message).slice(0, 400)); }
try { await ev(`if (S.testCard) { S.testCard = false; P.engine.testCard = false; } return 1;`); } catch { }
console.log(`\n${ok + ruim} verificações, ${ruim} falha(s) — ${ruim ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(ruim ? 1 : 0);
