// Arestas do 12-20 vistas com os dois projetores ligados. Teclado REAL pelo CDP (Input.dispatchKeyEvent).
// 1) Na Saída avançada, um seletor do painel (Fonte do slice, Dispositivo da tela) não perde o foco quando a seta do
//    teclado troca a opção: o painel é refeito a cada troca e, antes do conserto, o <select> novo ficava sem foco.
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/redondo-check.mjs
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const click = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(300); };
const cl = async (expr) => { const r = await ev(`const e = (${expr}); if (!e) return null; e.scrollIntoView && e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;`); if (!r) throw new Error('não achei na tela: ' + expr.slice(0, 90)); await click(r.x, r.y); };
const KEYS = { ArrowDown: 40, ArrowUp: 38, Escape: 27 };
const tecla = async (key) => { const c = KEYS[key]; await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: c, nativeVirtualKeyCode: c }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: c, nativeVirtualKeyCode: c }); await wait(350); };
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
const sel = (rot) => `([...document.querySelectorAll('#aoProps .prow')].find(r => r.querySelector('.pl') && r.querySelector('.pl').textContent.trim() === ${JSON.stringify(rot)}) || { querySelector() { return null; } }).querySelector('select')`;
// o foco vai ao seletor pelo próprio elemento (o clique real abriria a lista nativa, que o CDP não fecha de forma confiável)
const foca = (rot) => ev(`const s = ${sel(rot)}; if (!s) throw new Error('sem seletor ' + ${JSON.stringify(rot)}); s.focus(); return document.activeElement === s;`);
const estado = (rot) => ev(`const s = ${sel(rot)}, a = document.activeElement; return { valor: s && s.value, texto: s && s.selectedOptions[0] && s.selectedOptions[0].textContent.trim(), focado: !!s && a === s, ativo: a ? a.tagName + (a.closest('.prow') ? ' em ' + a.closest('.prow').querySelector('.pl').textContent.trim() : '') : '' };`);

try {
  await cl(`document.querySelector('#btnAO')`); await wait(700);
  await cl(`document.querySelector('#aoTabOut')`); await wait(300);
  await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="slice"]')`); await wait(500);
  confere('preparo: slice novo selecionado, foco no seletor Fonte', await foca('Fonte'));
  const e0 = await estado('Fonte');
  await tecla('ArrowDown'); const e1 = await estado('Fonte');
  confere('↓ no seletor Fonte troca a opção', e1.valor !== e0.valor, e0.texto + ' → ' + e1.texto);
  confere('depois da 1ª seta o seletor Fonte continua com o foco', e1.focado, e1.ativo);
  await tecla('ArrowDown'); const e2 = await estado('Fonte');
  confere('a 2ª seta anda mais uma opção sem focar de novo', e2.valor !== e1.valor && e2.focado, e1.texto + ' → ' + e2.texto + ' (' + e2.ativo + ')');
  await tecla('ArrowUp'); await tecla('ArrowUp'); const e3 = await estado('Fonte');
  confere('↑ ↑ volta para a primeira e o foco fica', e3.valor === e0.valor && e3.focado, e3.texto);
  confere('o slice guardou a fonte de volta', await ev(`const it = P.ao.sel && P.ao.sel.item; return !!it && String(it.source) === ${JSON.stringify(e0.valor)};`));

  // Dispositivo da tela: a troca reabre a saída; com os dois projetores ligados ela pisca neles e volta
  await cl(`[...document.querySelectorAll('#aoList .row')].find(r => r.classList.contains('screen') || /^Tela|^Screen/.test(r.textContent.trim()))`); await wait(400);
  if (await ev(`return !!(${sel('Dispositivo')});`)) {
    await foca('Dispositivo'); const d0 = await estado('Dispositivo');
    await tecla('ArrowDown'); const d1 = await estado('Dispositivo');
    confere('↓ no Dispositivo troca e o foco fica', d1.valor !== d0.valor && d1.focado, d0.texto + ' → ' + d1.texto + ' (' + d1.ativo + ')');
    await tecla('ArrowUp'); const d2 = await estado('Dispositivo');
    confere('↑ volta ao dispositivo de antes e o foco fica', d2.valor === d0.valor && d2.focado, d2.texto);
  } else confere('seletor Dispositivo da tela', false, 'não achei o seletor');
  await cl(`document.querySelector('#aoCancel') || document.querySelector('#aoOk')`); await wait(500);
} catch (e) { confere('a bateria rodou até o fim', false, e.message); }
console.log(`\n${ok} OK, ${ruim} falha(s)`); ws.close(); process.exit(ruim ? 1 : 0);
