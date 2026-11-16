// Slice polígono da Saída avançada (plano 07-13), como o Polygon do Resolume 7.28.1, com mouse e teclado REAIS pelo CDP.
// Os pixels são lidos da composição e da tela de saída pelo motor (engine.probe e engine.probeScreen).
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/ao-poligono-check.mjs
//
// Medido no Resolume (.paul/phases/07-saida-avancada/07-12-POLIGONO.md): o polígono nasce como um triângulo da altura
// inteira, com a ponta no meio do topo, (960, 0), (336, 1080) e (1584, 1080) em 1920×1080; os pontos da entrada e os da
// saída são independentes; a imagem de dentro do polígono de entrada é esticada para o de saída; tem Transform e Edit
// Points nas duas abas; o painel tem fonte, cor, Is Key e Black BG, sem espelhar, emenda nem malha.
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state, D = window.projDesktop; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const SHIFT = 8, CTRL = 2, ALT = 1;
const drag = async (x0, y0, x1, y1, mods = 0) => { await mouse('mouseMoved', x0, y0, { buttons: 0, modifiers: mods }); await mouse('mousePressed', x0, y0, { modifiers: mods }); for (let k = 1; k <= 10; k++) { await mouse('mouseMoved', x0 + (x1 - x0) * k / 10, y0 + (y1 - y0) * k / 10, { modifiers: mods }); await wait(20); } await mouse('mouseReleased', x1, y1, { modifiers: mods }); await wait(250); };
const click = (x, y, n = 1) => (async () => { await mouse('mouseMoved', x, y, { buttons: 0 }); for (let i = 1; i <= n; i++) { await mouse('mousePressed', x, y, { clickCount: i }); await mouse('mouseReleased', x, y, { clickCount: i }); } await wait(300); })();
const key = async (k, vk, mods = 0) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: vk, modifiers: mods }); await wait(220); };
const cl = async (expr, n = 1) => { const r = await ev(`const e = (${expr}); if (!e) return null; e.scrollIntoView && e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;`); if (!r) throw new Error('não achei na tela: ' + expr.slice(0, 90)); await click(r.x, r.y, n); };
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
const j = (v) => JSON.stringify(v), perto = (a, b, t = 1) => Math.abs(a - b) <= t, cor = (a, b, t = 6) => a && b && a.every((v, i) => Math.abs(v - b[i]) <= t);
const arr = (L) => L.map(p => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]);
const P0 = () => ev(`const it = P.ao.screens()[0].items.find(i => i.type === 'poly' && /^Pol/.test(i.name)); return it ? { nome: it.name, tipo: it.type, e: it.inPts.map(p => [...p]), s: it.outPts.map(p => [...p]), fonte: it.source, key: !!it.key, bg: !!it.blackBg, rotS: it.rotOut, rotE: it.rotIn, n: P.ao.screens()[0].items.length, polys: P.ao.screens()[0].items.filter(i => i.type === 'poly').length } : null;`);
const cen = (L) => [L.reduce((a, p) => a + p[0], 0) / L.length, L.reduce((a, p) => a + p[1], 0) / L.length];
const naComp = async (p) => { await wait(200); return ev(`return P.engine.probe(S.layers, [[${p[0] / 1920}, ${p[1] / 1080}]])[0];`); };
const naTela = async (p) => { await wait(200); return ev(`const a = P.ao.screens(); return P.engine.probeScreen(a[0], S.layers, a, [[${p[0] / 1920}, ${p[1] / 1080}]])[0];`); };
const palco = () => ev(`const s = document.querySelector('#aoSvg'), r = s.getBoundingClientRect(); return { x: r.left, y: r.top, k: r.width / +s.getAttribute('viewBox').split(' ')[2] };`);
const caixa = (rot) => `([...document.querySelectorAll('#aoProps > *')].find(r => r.textContent.trim().startsWith(${JSON.stringify(rot)})) || { querySelector() { return null; } }).querySelector('.ck')`;
const ctrlZ = () => key('z', 90, CTRL);

try {
  await ev(`try { await D.presets.remove('prova-0713'); } catch { } return 1;`);
  // um degradê no ar, para cada ponto da composição ter uma cor diferente
  await cl(`document.querySelector('.cell[data-layer="0"][data-col="0"]')`);
  await cl(`[...document.querySelectorAll('#browserTabs span')].find(e => e.textContent.trim() === 'Fontes')`);
  await cl(`[...document.querySelectorAll('#browserPan .item')].find(e => e.textContent.trim() === 'Gradient')`, 2);
  await cl(`document.querySelector('.cell[data-layer="0"][data-col="0"]')`); await wait(600);
  const g1 = await naComp([300, 300]), g2 = await naComp([1600, 800]);
  confere('preparo: degradê no ar, com cores diferentes em pontos diferentes', await ev(`return S.layers[0].on === 0;`) && !cor(g1, g2, 12), j([g1, g2]));

  await cl(`document.querySelector('#btnAO')`); await wait(800); await cl(`document.querySelector('#aoTabOut')`); await wait(300);
  confere('o menu "+" tem Polígono', await ev(`return !!document.querySelector('#aoAddMenu [data-add="polyTri"]') && /Polígono/.test(document.querySelector('#aoAddMenu').textContent);`));
  await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="polyTri"]')`); await wait(500);
  let p = await P0(); const T = [[960, 0], [336.46, 1080], [1583.54, 1080]], igual = (a, b, t = 0.6) => a.length === b.length && a.every((q, i) => perto(q[0], b[i][0], t) && perto(q[1], b[i][1], t));
  confere('nasce "Polígono", triângulo da altura inteira com a ponta no meio do topo, igual na entrada e na saída', p && p.nome === 'Polígono' && igual(p.e, T) && igual(p.s, T), p ? j([arr(p.e), arr(p.s)]) : 'não nasceu');
  confere('aparece na lista e fica selecionado', await ev(`return [...document.querySelectorAll('#aoList .row.item')].some(r => /Polígono/.test(r.textContent) && r.classList.contains('sel'));`));
  // sem o slice de baixo, a tela mostra só o polígono
  await cl(`[...document.querySelectorAll('#aoList .row.item')].find(r => /Composição inteira/.test(r.textContent)).querySelector('.ck')`); await wait(300);
  await cl(`[...document.querySelectorAll('#aoList .row.item')].find(r => /Polígono/.test(r.textContent))`); await wait(300);
  let cE = cen(p.e), cS = cen(p.s), a = await naComp(cE), b = await naTela(cS);
  confere('dentro do polígono a tela mostra a composição', cor(a, b) && a.some(v => v > 20), j([a, b]));
  confere('fora do polígono a tela fica preta', cor(await naTela([150, 150]), [0, 0, 0], 2) && cor(await naTela([1800, 200]), [0, 0, 0], 2));

  // ---- Editar pontos na saída: entrada e saída independentes, imagem esticada
  await cl(`document.querySelector('#aoPts')`); await wait(300); let st = await palco(); const X = v => st.x + v * st.k, Y = v => st.y + v * st.k;
  await drag(X(p.s[0][0]), Y(p.s[0][1]) + 2, X(p.s[0][0]) + 150, Y(p.s[0][1]) + 180); let q = await P0();
  confere('arrastar um ponto na saída: só a saída muda', igual(q.e, p.e) && !igual([q.s[0]], [p.s[0]], 20) && igual(q.s.slice(1), p.s.slice(1)), j(arr(q.s)));
  confere('o painel mostra X e Y do ponto escolhido', await ev(`const r = [...document.querySelectorAll('#aoProps > *')].filter(x => /^[XY]\\s*-?\\d/.test(x.textContent.trim())); return r.length === 2;`));
  b = await naTela(cen(q.s));
  confere('a imagem é esticada: o centro do polígono de saída mostra o centro do polígono de entrada', cor(a, b), j([a, b]));
  await key('ArrowRight', 39); let q2 = await P0(); confere('seta move o ponto escolhido 1 px', perto(q2.s[0][0], q.s[0][0] + 1, 0.01), j(arr([q2.s[0]])));
  await wait(900); await ctrlZ(); await ctrlZ(); q2 = await P0(); confere('dois Ctrl+Z voltam o ponto', igual(q2.s, p.s), j(arr(q2.s)));

  // ---- aba de entrada: Editar pontos e Transformar também existem para o polígono
  await cl(`document.querySelector('#aoTabIn')`); await wait(400);
  confere('na aba de entrada, com o polígono selecionado, aparecem Editar pontos e Transformar', await ev(`return !document.querySelector('#aoPts').hidden && !document.querySelector('#aoMove').hidden;`));
  await cl(`document.querySelector('#aoPts')`); await wait(300); st = await palco();
  await drag(X(p.e[1][0]) + 2, Y(p.e[1][1]) - 2, X(p.e[1][0]) + 260, Y(p.e[1][1]) - 220); q = await P0();
  confere('arrastar um ponto na entrada: só a entrada muda', igual(q.s, p.s) && !igual([q.e[1]], [p.e[1]], 20) && perto(q.e[0][0], p.e[0][0], 0.01), j(arr(q.e)));
  const a2 = await naComp(cen(q.e)); b = await naTela(cen(q.s));
  confere('a saída passa a mostrar o novo pedaço da composição', cor(a2, b) && !cor(a2, a, 4), j([a, a2, b]));
  await ctrlZ(); q = await P0(); confere('Ctrl+Z volta o ponto da entrada', igual(q.e, p.e));

  // ---- Transformar na saída: corpo, canto, anel, números
  await cl(`document.querySelector('#aoTabOut')`); await wait(400); await cl(`document.querySelector('#aoMove')`); await wait(300); st = await palco();
  const m = cen(p.s); await drag(X(m[0]), Y(m[1]), X(m[0]) + 70, Y(m[1]) + 15); q = await P0();
  confere('arrastar o corpo move a saída inteira, em pixels inteiros', q.s.every((v, i) => perto(v[0] - p.s[i][0], Math.round(70 / st.k), 1.01) && perto(v[1] - p.s[i][1], Math.round(15 / st.k), 1.01)) && igual(q.e, p.e), j(arr(q.s)));
  await ctrlZ();
  await drag(X(1583.54) + 8, Y(1080) + 8, X(1583.54) + 8, Y(1080) - 60); q = await P0();
  confere('o anel gira a saída em volta do centro', Math.abs(q.rotS) > 2 && q.rotE === 0 && !igual(q.s, p.s, 5) && igual(q.e, p.e), 'giro ' + q.rotS);
  await ctrlZ(); q = await P0(); confere('Ctrl+Z desfaz o giro', igual(q.s, p.s) && (q.rotS || 0) === 0, j(arr(q.s)));
  confere('o painel tem Fonte, caixa, Giro, É chave, Fundo preto e cor', await ev(`const t = document.querySelector('#aoProps').textContent; return ['Fonte', 'Esquerda', 'Largura', 'Giro', 'É chave', 'Fundo preto', 'Brilho', 'Pontos'].every(x => t.includes(x)) && !t.includes('Espelhar') && !t.includes('Soft Edge');`));
  await cl(caixa('É chave')); b = await naTela(cen(p.s)); confere('É chave: dentro do polígono sai branco', cor(b, [255, 255, 255], 2), j(b));
  await ctrlZ(); b = await naTela(cen(p.s)); confere('Ctrl+Z desliga o É chave', cor(a, b), j(b));

  // ---- duplicar, preset, apagar
  await drag(X(m[0]), Y(m[1]), X(m[0]) + 60, Y(m[1]), ALT); q = await ev(`const it = P.ao.sel.item; return { nome: it.name, tipo: it.type, ne: it.inPts.length, ns: it.outPts.length, polys: P.ao.screens()[0].items.filter(i => i.type === 'poly').length };`);
  confere('Alt + arrastar duplica o polígono', q.tipo === 'poly' && q.nome !== 'Polígono' && q.ne === 3 && q.ns === 3 && q.polys === 2, j(q));
  await ctrlZ();
  await ev(`await P.ao.savePreset('prova-0713'); P.ao.newPreset(); return 1;`); await wait(500);
  confere('Novo: a saída nova não tem polígono', (await P0()) === null);
  await ev(`await P.ao.loadPreset('prova-0713'); return 1;`); await wait(600); q = await P0();
  confere('salvar e abrir o preset devolve o polígono igual', q && igual(q.e, p.e) && igual(q.s, p.s) && q.fonte === 'comp', q ? j([arr(q.e), arr(q.s)]) : 'sumiu');
  b = await naTela(cen(p.s)); confere('e a tela volta a mostrar a composição dentro dele', cor(a, b), j(b));
  await cl(`[...document.querySelectorAll('#aoList .row.item')].find(r => /Polígono/.test(r.textContent))`); await wait(300);
  await cl(`[...document.querySelectorAll('#aoProps button.wide')].find(x => /Apagar este polígono/.test(x.textContent))`); await wait(400);
  confere('"Apagar este polígono" tira o item', (await P0()) === null);
  await ctrlZ(); confere('Ctrl+Z traz o polígono de volta', !!(await P0()));

  await ev(`try { await D.presets.remove('prova-0713'); } catch { } return 1;`);
  await cl(`document.querySelector('#aoCancel')`); await wait(500);
  for (let i = 0; i < 2 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) await cl(`[...document.querySelectorAll('.dlgOver button')].pop()`);
  confere('cancelada a Saída avançada, a tela volta ao que era', (await ev(`return P.ao.screens()[0].items.map(i => i.type + ':' + i.enabled).join();`)) === 'slice:true');
} catch (e) { ruim++; console.log('PAROU: ' + String(e.message).slice(0, 400)); }
console.log(`\n${ok + ruim} verificações, ${ruim} falha(s) — ${ruim ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(ruim ? 1 : 0);
