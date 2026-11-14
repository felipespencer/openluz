// Lote B2 do pente fino (plano 12-11): Saída avançada. Mouse e teclado reais pelo CDP.
// Programa aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/loteb-check.mjs     (39 formas da máscara, 40 nono degradê, 44 palco vazio, 42 desfazer vazio, N2 Esc do menu +)
const PORTA = process.env.PROJ_CDP || 9333, base = 'http://127.0.0.1:' + PORTA;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
if (!pg) { console.error('janela do OpenLuz não achada'); process.exit(1); }
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state, A = P.ao, W = ms => new Promise(r => setTimeout(r, ms)); ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const click = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(180); };
const drag = async (x0, y0, x1, y1) => { await mouse('mouseMoved', x0, y0, { buttons: 0 }); await mouse('mousePressed', x0, y0); for (let i = 1; i <= 8; i++) { await mouse('mouseMoved', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await wait(15); } await mouse('mouseReleased', x1, y1); await wait(200); };
const key = async (k, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: vk, modifiers: mods }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: vk, modifiers: mods }); await wait(200); };
const pos = async (expr) => { const r = await ev(`const e = (${expr}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };`); if (!r || !r.w) throw new Error('não achei na tela: ' + expr); return r; };
const cl = async (expr) => { const r = await pos(expr); await click(r.x, r.y); };
const res = []; const check = (nome, ok, info = '') => { res.push(ok); console.log((ok ? 'OK    ' : 'FALHA ') + nome + (info ? '  — ' + info : '')); };
const slice = `S.screens[0].items.find(i => i.type === 'slice')`;
const dica = (t) => `[...document.querySelectorAll('#ao [title], #ao [data-help]')].find(e => ((e.title || '') + '|' + (e.dataset.help || '')).split('|').some(x => x.trim() === ${JSON.stringify(t)}) && e.getBoundingClientRect().width > 0)`;
const abre = async () => { await ev(`for (let i = 0; i < 4; i++) { const d = document.querySelector('.dlgOver'); if (!d) break; const b = [...d.querySelectorAll('button')].find(x => /Pular|Cancelar|Fechar|OK/.test(x.textContent)); if (b) b.click(); else d.remove(); await W(200); } if (A.open) A.hide(false); await P.reset(); return 1;`);
  await cl(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Saída avançada')`); await wait(600); };
const formas = (pts) => `${pts.length} pontos, ${new Set(pts.map(p => Math.round(p[0] * 1000))).size} x diferentes`;
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });

try {
  // 39: máscaras Hexágono e Coração
  await abre();
  await cl(dica('Hexágono')); const hx = await ev(`return (${slice}.inMask || {}).pts || [];`);
  check('39: a máscara de entrada Hexágono tem seis lados', hx.length === 6, formas(hx));
  await cl(dica('Coração')); const co = await ev(`return (${slice}.inMask || {}).pts || [];`);
  check('39: a máscara de entrada Coração tem o contorno de um coração', co.length >= 24 && new Set(co.map(p => Math.round(p[0] * 1000))).size > 8, formas(co));
  await cl(`document.querySelector('#aoAdd')`); await wait(250); await cl(`document.querySelector('#aoAddMenu [data-add="maskHex"]')`); await wait(300);
  const mh = await ev(`const m = S.screens[0].items.filter(i => i.type === 'mask').pop(); return m ? m.pts : [];`);
  check('39: a máscara de saída Hexágono (menu +) tem seis lados', mh.length === 6, formas(mh));
  // N2: Esc com o menu + aberto
  await cl(`document.querySelector('#aoAdd')`); await wait(250); const ab = await ev(`return !document.querySelector('#aoAddMenu').hidden;`);
  await key('Escape', 27); const n2 = await ev(`return { menu: !document.querySelector('#aoAddMenu').hidden, aberta: A.open, dlg: document.querySelectorAll('.dlgOver').length };`);
  check('N2: Esc com o menu + aberto fecha só o menu', ab && !n2.menu && n2.aberta && n2.dlg === 0, JSON.stringify(n2));
  await ev(`for (let i = 0; i < 3; i++) { const d = document.querySelector('.dlgOver'); if (!d) break; const b = [...d.querySelectorAll('button')].find(x => /Cancelar/.test(x.textContent)); if (b) b.click(); await W(200); } return 1;`);
  // 42: clique que não muda nada não entra no desfazer nem apaga o refazer
  await abre();
  const corpo = `[...document.querySelectorAll('#ao svg [data-k="body"]')][0]`; const c0 = await pos(corpo);
  const x0 = await ev(`return ${slice}.in.x;`); await drag(c0.x, c0.y, c0.x + 120, c0.y + 40); const x1 = await ev(`return ${slice}.in.x;`), h1 = await ev(`return A.hist.length;`);
  const c1 = await pos(corpo); for (let i = 0; i < 3; i++) await click(c1.x, c1.y);
  const h2 = await ev(`return A.hist.length;`); await key('z', 90, 2); const x2 = await ev(`return ${slice}.in.x;`);
  check('42: três cliques sem mudar nada não entram no desfazer', x1 !== x0 && h2 === h1, `desfazer com ${h1} passo(s) depois de mover, ${h2} depois dos cliques`);
  check('42: um Ctrl+Z desfaz o movimento', x2 === x0, `x do slice ${x0} → ${x1} → ${x2}`);
  const c2 = await pos(corpo); await click(c2.x, c2.y); const rd = await ev(`return A.redoHist.length;`); await key('y', 89, 2); const x3 = await ev(`return ${slice}.in.x;`);
  check('42: clicar num item não apaga o refazer', rd > 0 && x3 === x1, `refazer com ${rd} passo(s); x depois do Ctrl+Y ${x3}`);
  // 44: desenhando a máscara de entrada, clicar numa tela da árvore
  await abre();
  await cl(dica('Desenhar')); const c4 = await pos(corpo); await click(c4.x - 60, c4.y - 40); await click(c4.x + 60, c4.y - 40);
  const des = await ev(`return !!A.drawing;`); await cl(`document.querySelector('#aoList').firstElementChild`); await wait(300);
  const d44 = await ev(`return { desenhando: !!A.drawing, noPalco: document.querySelectorAll('#ao svg [data-k]').length };`);
  check('44: clicar numa tela da árvore encerra o desenho e o palco mostra os itens', des && !d44.desenhando && d44.noPalco > 0, JSON.stringify(d44));
  // 40: o nono degradê
  await abre();
  await ev(`${slice}.soft.on = true; A.refresh(); return 1;`); await wait(300);
  const mais = `[...document.querySelectorAll('#ao button')].find(b => /degrad/i.test(b.textContent) && b.getBoundingClientRect().width > 0)`;
  let nCliques = 0; for (let i = 0; i < 10; i++) { try { await ev(`(${mais}).scrollIntoView({ block: 'center' }); return 1;`); await cl(mais); nCliques++; } catch { break; } }
  const g = await ev(`const s = ${slice}; return { ligados: A.grads(s).filter(x => x.on !== false).length, total: A.grads(s).length, aviso: document.querySelector('#toast').textContent };`);
  check('40: não dá para ligar mais degradês do que o motor aplica (8), e o programa avisa', nCliques >= 9 && g.ligados <= 8 && /No máximo 8/.test(g.aviso), `${nCliques} cliques em "${await ev(`return (${mais}) ? (${mais}).textContent.trim() : 'sem botão';`)}": ${JSON.stringify(g)}`);
} catch (e) { check('a bateria parou no meio', false, String(e.message).slice(0, 200)); }
await ev(`if (A.open) A.hide(false); await P.reset(); return 1;`).catch(() => { });
console.log(`\n${res.length} verificações, ${res.filter(x => !x).length} falha(s) — ${res.every(Boolean) ? 'APROVADO' : 'REPROVADO'}`);
ws.close(); process.exit(res.every(Boolean) ? 0 : 1);
