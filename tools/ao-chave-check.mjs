// "É chave" e "Fundo preto" do slice na Saída avançada, como o Is Key e o Black BG do Resolume 7.28.1 (plano 07-07),
// com mouse e teclado REAIS pelo CDP. Os pixels são lidos da tela de saída pelo motor (engine.probeScreen).
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/ao-chave-check.mjs
//
// Medido no Resolume pelo Spout (.paul/phases/07-saida-avancada/07-07-MEDIDAS.md), slice menor por cima de um slice cheio:
//   slice de cima lendo uma camada vazia: aparece o de baixo; com Black BG: a área dele fica preta; com Is Key: nada muda
//   slice de cima lendo uma camada com imagem meio transparente: com Is Key sai 127 + metade do de baixo (branco na medida
//   da transparência, por cima do de baixo); com Is Key e Black BG: cinza 127 liso
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const click = async (x, y, n = 1) => { await mouse('mouseMoved', x, y, { buttons: 0 }); for (let i = 1; i <= n; i++) { await mouse('mousePressed', x, y, { clickCount: i }); await mouse('mouseReleased', x, y, { clickCount: i }); } await wait(300); };
const drag = async (x0, y0, x1, y1, mods = 0) => { await mouse('mouseMoved', x0, y0, { buttons: 0, modifiers: mods }); await mouse('mousePressed', x0, y0, { modifiers: mods }); for (let k = 1; k <= 10; k++) { await mouse('mouseMoved', x0 + (x1 - x0) * k / 10, y0 + (y1 - y0) * k / 10, { modifiers: mods }); await wait(20); } await mouse('mouseReleased', x1, y1, { modifiers: mods }); await wait(300); };
const key = async (k, vk, mods = 0) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: vk, modifiers: mods }); await wait(200); };
const cl = async (expr, n = 1) => { const r = await ev(`const e = (${expr}); if (!e) return null; e.scrollIntoView && e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;`); if (!r) throw new Error('não achei na tela: ' + expr.slice(0, 90)); await click(r.x, r.y, n); };
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
const PTS = [[0.3, 0.3], [0.4, 0.45], [0.6, 0.55], [0.7, 0.7], [0.05, 0.1]];   // quatro dentro do slice de cima, um fora
const pix = () => ev(`const a = P.ao.screens(); return P.engine.probeScreen(a[0], S.layers, a, ${JSON.stringify(PTS)});`);
const j = (v) => JSON.stringify(v), dentro = (p) => p.slice(0, 4), igual = (a, b) => j(a) === j(b);
const caixa = (rot) => `([...document.querySelectorAll('#aoProps > *')].find(r => r.textContent.trim().startsWith(${JSON.stringify(rot)})) || { querySelector() { return null; } }).querySelector('.ck')`;
const fonte = async (rot) => { await cl(`document.querySelector('#aoProps select')`); await ev(`const s = document.querySelector('#aoProps select'), o = [...s.options].find(x => x.textContent.trim() === ${JSON.stringify(rot)}); s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); return 1;`); await wait(400); };
const est = () => ev(`const it = P.ao.sel.item; return { nome: it.name, key: !!it.key, bg: !!it.blackBg, fonte: it.source, n: P.ao.sel.screen.items.length };`);

try {
  // um clipe opaco no ar na camada de cima (Camada 5), como um novato faria
  await cl(`document.querySelector('.cell[data-layer="0"][data-col="0"]')`);
  await cl(`[...document.querySelectorAll('#browserTabs span')].find(e => e.textContent.trim() === 'Fontes')`);
  await cl(`[...document.querySelectorAll('#browserPan .item')].find(e => e.textContent.trim() === 'Checkered')`, 2);
  await cl(`document.querySelector('.cell[data-layer="0"][data-col="0"]')`); await wait(500);
  confere('preparo: Checkered no ar na Camada 5', await ev(`return S.layers[0].on === 0 && !!S.layers[0].clips[0];`));
  await cl(`document.querySelector('#btnAO')`); await wait(800); await cl(`document.querySelector('#aoTabOut')`); await wait(300);
  await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="slice"]')`); await wait(500);
  const p0 = await pix();
  confere('preparo: a tela tem imagem (o xadrez) dentro e fora do slice novo', dentro(p0).some(c => c[0] > 200) && dentro(p0).some(c => c[0] < 50), j(p0));
  confere('o painel do slice tem "É chave" e "Fundo preto"', await ev(`return !!(${caixa('É chave')}) && !!(${caixa('Fundo preto')});`));

  await fonte('Camada 1'); const p1 = await pix();
  confere('slice de cima lendo uma camada vazia: aparece o de baixo', igual(p1, p0), j(p1));
  await cl(caixa('Fundo preto')); const p2 = await pix(), e2 = await est();
  confere('Fundo preto: a área do slice fica preta e fora dele nada muda', e2.bg && dentro(p2).every(c => c[0] === 0 && c[1] === 0 && c[2] === 0) && igual(p2[4], p0[4]), j(p2));
  await key('z', 90, 2); const p2z = await pix();
  confere('Ctrl+Z desliga o Fundo preto', !(await est()).bg && igual(p2z, p0), j(p2z));
  await cl(caixa('É chave')); const p3 = await pix();
  confere('É chave com a camada vazia: nada muda', (await est()).key && igual(p3, p0), j(p3));
  await fonte('Camada 5'); const p4 = await pix();
  confere('É chave com imagem opaca: a área do slice sai branca e fora dele nada muda', dentro(p4).every(c => c[0] === 255 && c[1] === 255 && c[2] === 255) && igual(p4[4], p0[4]), j(p4));
  await cl(caixa('Fundo preto')); const p5 = await pix();
  confere('É chave e Fundo preto com imagem opaca: branco', dentro(p5).every(c => c[0] === 255), j(p5));
  await fonte('Camada 1'); const p6 = await pix();
  confere('É chave e Fundo preto com a camada vazia: preto', dentro(p6).every(c => c[0] === 0 && c[1] === 0 && c[2] === 0), j(p6));

  // a cópia passa por salvar e abrir: tem de guardar as duas caixas
  const svg = await ev(`const s = document.querySelector('#aoSvg'), r = s.getBoundingClientRect(); return { x: r.left, y: r.top, k: r.width / +s.getAttribute('viewBox').split(' ')[2] };`);
  const e0 = await est(); await drag(svg.x + 960 * svg.k, svg.y + 500 * svg.k, svg.x + 960 * svg.k + 50, svg.y + 500 * svg.k, 1); const e1 = await est();
  confere('a cópia (Alt + arrastar) guarda É chave e Fundo preto', e1.n === e0.n + 1 && e1.nome !== e0.nome && e1.key && e1.bg, j(e1));

  await cl(`document.querySelector('#aoCancel')`); await wait(500);
  for (let i = 0; i < 2 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) await cl(`[...document.querySelectorAll('.dlgOver button')].pop()`);
  const pf = await pix();
  confere('cancelada a Saída avançada, a tela volta ao que era', igual(pf[4], p0[4]) && (await ev(`return P.ao.screens()[0].items.length;`)) === 1, j(pf));
} catch (e) { ruim++; console.log('PAROU: ' + String(e.message).slice(0, 400)); }
console.log(`\n${ok + ruim} verificações, ${ruim} falha(s) — ${ruim ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(ruim ? 1 : 0);
