// Tela acordada com a saída aberta (plano 12-14), com clique REAL pelo CDP.
// Com uma janela de saída aberta o programa pede ao sistema para não apagar a tela nem dormir por inatividade; fechada a
// última saída, devolve o normal. O que se confere é o estado do bloqueio do Electron (powerSaveBlocker), não a tela
// apagando de verdade (isso levaria o tempo de inatividade configurado no Windows).
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Abre e fecha uma janela de saída. Uso: node tools/acordado-check.mjs
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const paginas = async () => (await (await fetch(base + '/json')).json()).filter(p => p.type === 'page');
const pg = (await paginas()).find(p => p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state, D = window.projDesktop; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const botao = async () => { const r = await ev(`const r = document.querySelector('#btnOut').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };`); await mouse('mouseMoved', r.x, r.y, { buttons: 0 }); await mouse('mousePressed', r.x, r.y); await mouse('mouseReleased', r.x, r.y); };
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
const est = async () => ({ acordado: await ev(`return D.acordado ? await D.acordado() : 'sem leitura';`), saidas: (await paginas()).filter(p => p.url.includes('output.html')).length });
const j = (v) => JSON.stringify(v);

try {
  let e = await est(); confere('sem saída aberta, o bloqueio está desligado', e.acordado === false && e.saidas === 0, j(e));
  for (let i = 1; i <= 3; i++) {
    await botao(); await wait(2500); e = await est();
    confere(`abrir a saída (${i}ª vez): a tela não apaga por inatividade`, e.acordado === true && e.saidas >= 1, j(e));
    await botao(); await wait(1500); e = await est();
    confere(`fechar a saída (${i}ª vez): o bloqueio sai`, e.acordado === false && e.saidas === 0, j(e));
  }
} catch (e) { ruim++; console.log('PAROU: ' + String(e.message).slice(0, 400)); }
try { if (await ev(`return S.screens.some(s => s.win && !s.win.closed);`)) { await botao(); await wait(800); } } catch { }
console.log(`\n${ok + ruim} verificações, ${ruim} falha(s) — ${ruim ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(ruim ? 1 : 0);
