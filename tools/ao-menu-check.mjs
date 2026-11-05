// Botão direito da Saída avançada (plano 07-02): o mesmo menu do Resolume 7.28.1, nos mesmos lugares, e cada item com o
// efeito medido lá (tools/compare/saida/menu-ao/MEDIDAS.md). Cliques e botão direito REAIS pelo CDP (Input.dispatchMouseEvent),
// teclas reais para Ctrl+Z e Esc. Devolve as telas como achou (Cancelar). Programa aberto com --remote-debugging-port=9333.
// Uso: node tools/ao-menu-check.mjs
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLume');
if (!page) { console.error('janela do OpenLume não achada', pages.map(p => p.title)); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const key = async (k, code, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); };
await key('Shift', 'ShiftLeft', 16);   // aquecimento: a primeira tecla depois de uso pesado às vezes se perde
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const btn = (type, x, y, b = 'left') => send('Input.dispatchMouseEvent', { type, x, y, button: b, buttons: type === 'mousePressed' ? (b === 'right' ? 2 : 1) : 0, clickCount: 1 });
const click = async (x, y) => { await btn('mouseMoved', x, y); await btn('mousePressed', x, y); await btn('mouseReleased', x, y); await wait(150); };
const rclick = async (x, y) => { await btn('mouseMoved', x, y); await btn('mousePressed', x, y, 'right'); await btn('mouseReleased', x, y, 'right'); await wait(250); };
const results = []; const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const P = 'window.projecionista';
const center = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
const menuLabels = () => ev(`[...document.querySelectorAll('.menuLayer .mi')].map(r => r.querySelector('.lb').textContent + (r.classList.contains('dis') ? '(cinza)' : ''))`);
const menuOpen = () => ev(`!!document.querySelector('.menuLayer')`);
const pick = async (label) => {
  const c = await ev(`(() => { const r = [...document.querySelectorAll('.menuLayer .mi')].find(r => r.querySelector('.lb').textContent === ${JSON.stringify(label)}); if (!r) return null; const b = r.getBoundingClientRect(); return [b.x + 20, b.y + b.height / 2]; })()`);
  if (!c) throw new Error('item não achado no menu: ' + label);
  await btn('mouseMoved', c[0], c[1]); await wait(60); await click(c[0], c[1]); await wait(150);
};
const undo = async () => { await ev(`document.activeElement && document.activeElement.blur(); 1`); await key('z', 'KeyZ', 90, 2); await wait(250); };
const round = (o) => JSON.stringify(Object.fromEntries(['x', 'y', 'w', 'h'].map(k => [k, Math.round(o[k])])));
const inR = () => ev(`(() => { const s = ${P}.ao.sel.item; return s.in; })()`).then(round);
const outR = () => ev(`${P}.M.outRect(${P}.ao.sel.item)`).then(round);
// botão direito no corpo do item selecionado, no palco
const bodySel = () => ev(`'#aoSvg [data-k=body][data-id="' + ${P}.ao.sel.item.id + '"]'`);
const rOnBody = async () => { const c = await center(await bodySel()); await rclick(c[0], c[1]); };

// preparo: diálogos fechados; uma tela com um slice; Saída avançada aberta na aba Entrada
for (let i = 0; i < 5 && await ev(`document.querySelectorAll('.dlgOver').length`) > 0; i++) { await key('Escape', 'Escape', 27); await wait(200); }
await ev(`(() => { const p = ${P}; if (p.automape && p.automape.dlg) p.automape.close(); if (p.ao.open) p.ao.hide(true); if (p.laser.open) p.laser.hide(); return 1; })()`);
await ev(`${P}.ao.show(); ${P}.ao.clip = null; 1`); await wait(300);
const W = await ev(`${P}.ao.c.compW`), H = await ev(`${P}.ao.c.compH`);
await ev(`(() => { const p = ${P}, ao = p.ao, M = p.M; const sc = p.screens()[0]; const s = M.mkSlice('Slice', { x: 100, y: 100, w: 800, h: 400 }, { x: 100, y: 100, w: 800, h: 400 }); sc.items = [s]; ao.sel = { screen: sc, item: s }; ao.hist = []; ao.c.onChange(); ao.setTab('in'); return 1; })()`);
const SW = await ev(`${P}.screens()[0].w`), SH = await ev(`${P}.screens()[0].h`);
await wait(300);
{ const c = await center('#aoView'); await click(c[0], c[1] - 1); await ev(`(() => { const ao = ${P}.ao; ao.sel = { screen: ${P}.screens()[0], item: ${P}.screens()[0].items[0] }; ao.refresh(); return 1; })()`); await wait(150); }   // clique de aquecimento na janela

// 1. sem item selecionado, não abre nada (como no Resolume)
await ev(`(() => { const ao = ${P}.ao; ao.sel = { screen: ${P}.screens()[0], item: null }; ao.refresh(); return 1; })()`); await wait(150);
{ const c = await center('#aoView'); await rclick(c[0], c[1]); }
check('sem item selecionado o botão direito no palco não abre menu', !(await menuOpen()));
await ev(`(() => { const ao = ${P}.ao; ao.select(${P}.screens()[0], ${P}.screens()[0].items[0]); return 1; })()`); await wait(150);

// 2. aba Entrada: lista de itens e cada um com o efeito medido
const IN_LIST = 'Centralizar X|Centralizar Y|Espelhar X|Espelhar Y|Metade esquerda|Metade de cima|Metade direita|Metade de baixo|Área toda|Casar com a saída|Trocar entrada e saída|Trazer para frente(cinza)|Mandar para trás(cinza)|Duplicar|Copiar|Recortar|Colar(cinza)';
await rOnBody();
check('aba Entrada: o menu do slice tem os itens do Resolume, na ordem', (await menuLabels()).join('|') === IN_LIST, (await menuLabels()).join('|'));
await key('Escape', 'Escape', 27); await wait(200);
check('Esc fecha só o menu; a Saída avançada continua aberta', !(await menuOpen()) && await ev(`${P}.ao.open`));
const baseIn = await inR();
const casosIn = [
  ['Centralizar X', { x: (W - 800) / 2, y: 100, w: 800, h: 400 }], ['Centralizar Y', { x: 100, y: (H - 400) / 2, w: 800, h: 400 }],
  ['Espelhar X', { x: W - 900, y: 100, w: 800, h: 400 }], ['Espelhar Y', { x: 100, y: H - 500, w: 800, h: 400 }],
  ['Metade esquerda', { x: 0, y: 0, w: W / 2, h: H }], ['Metade de cima', { x: 0, y: 0, w: W, h: H / 2 }],
  ['Metade direita', { x: W / 2, y: 0, w: W / 2, h: H }], ['Metade de baixo', { x: 0, y: H / 2, w: W, h: H / 2 }],
  ['Área toda', { x: 0, y: 0, w: W, h: H }],
];
for (const [label, want] of casosIn) {
  await rOnBody(); await pick(label);
  const got = await inR();
  check('Entrada › ' + label, got === round(want), got);
  await undo();
  check('Ctrl+Z desfaz ' + label, await inR() === baseIn, await inR());
}
// casar e trocar: a saída é outro retângulo
await ev(`(() => { const p = ${P}; p.M.fitOutRect(p.ao.sel.item, { x: 300, y: 200, w: 600, h: 300 }); p.ao.hist = []; p.ao.refresh(); return 1; })()`); await wait(100);
await rOnBody(); await pick('Casar com a saída');
check('Entrada › Casar com a saída: a entrada fica com a caixa da saída', await inR() === round({ x: 300, y: 200, w: 600, h: 300 }), await inR());
await undo();
await rOnBody(); await pick('Trocar entrada e saída');
check('Trocar entrada e saída: entrada ← saída e saída ← entrada', await inR() === round({ x: 300, y: 200, w: 600, h: 300 }) && await outR() === baseIn, await inR() + ' / ' + await outR());
await undo();

// 3. aba Saída: lista, Fazer círculo, Casar com a entrada
await ev(`${P}.ao.setTab('out'); 1`); await wait(250);
const OUT_LIST = 'Centralizar X|Centralizar Y|Espelhar X|Espelhar Y|Metade esquerda|Metade de cima|Metade direita|Metade de baixo|Área toda|Fazer círculo|Casar com a entrada|Trocar entrada e saída|Trazer para frente(cinza)|Mandar para trás(cinza)|Duplicar|Copiar|Recortar|Colar(cinza)';
await rOnBody();
check('aba Saída: o menu tem Fazer círculo e Casar com a entrada', (await menuLabels()).join('|') === OUT_LIST, (await menuLabels()).join('|'));
await key('Escape', 'Escape', 27); await wait(150);
await rOnBody(); await pick('Espelhar X');
check('Saída › Espelhar X espelha pelo meio da tela', await outR() === round({ x: SW - 900, y: 200, w: 600, h: 300 }), await outR());
await undo();
await rOnBody(); await pick('Fazer círculo');
{
  const r = JSON.parse(await outR()), info = await ev(`(() => { const s = ${P}.ao.sel.item, w = s.warp, n = 3 * w.divX + 1, P0 = w.pts, cx = 600, cy = 350; let maxErr = 0;
    for (let t = 0; t <= 1; t += 0.05) { const row = 0, c3 = Math.min(n - 1, Math.floor(t * (n - 1))); }
    // amostra o contorno: borda de cima, pedaço a pedaço, pelo bezier das quatro primeiras linhas de pontos
    for (let seg = 0; seg < w.divX; seg++) { const a = P0[seg * 3], b = P0[seg * 3 + 1], c = P0[seg * 3 + 2], d = P0[seg * 3 + 3];
      for (let t = 0; t <= 1; t += 0.1) { const u = 1 - t, x = u*u*u*a[0] + 3*u*u*t*b[0] + 3*u*t*t*c[0] + t*t*t*d[0], y = u*u*u*a[1] + 3*u*u*t*b[1] + 3*u*t*t*c[1] + t*t*t*d[1]; maxErr = Math.max(maxErr, Math.abs(Math.hypot(x - cx, y - cy) - 150)); } }
    return { mode: w.mode, curve: w.curve, div: w.divX + 'x' + w.divY, maxErr: +maxErr.toFixed(2) }; })()`);
  check('Fazer círculo: quadrado de lado min(L, A) no mesmo centro', Math.abs(r.w - 300) <= 1 && Math.abs(r.h - 300) <= 1 && Math.abs(r.x + r.w / 2 - 600) <= 1 && Math.abs(r.y + r.h / 2 - 350) <= 1, JSON.stringify(r));
  check('Fazer círculo: malha bezier com o contorno no círculo (erro < 1 px)', info.mode === 'mesh' && info.curve && info.maxErr < 1, JSON.stringify(info));
  await undo();
  check('Ctrl+Z desfaz o círculo', await ev(`${P}.ao.sel.item.warp.mode`) === 'corners' && await outR() === round({ x: 300, y: 200, w: 600, h: 300 }), await outR());
}
await rOnBody(); await pick('Casar com a entrada');
check('Saída › Casar com a entrada: a saída fica com o retângulo da entrada', await outR() === baseIn, await outR());
await undo();

// 4. Duplicar, ordem, Copiar/Colar, Recortar e Colar na tela
const names = () => ev(`${P}.screens()[0].items.map(i => i.name).join(',')`);
const listTop = () => ev(`[...document.querySelectorAll('#aoList .row.item .nm')].map(e => e.textContent).join(',')`);
await rOnBody(); await pick('Duplicar');
check('Duplicar: cópia "Slice 2" na frente, selecionada, no alto da lista', await names() === 'Slice,Slice 2' && await ev(`${P}.ao.sel.item.name`) === 'Slice 2' && await listTop() === 'Slice 2,Slice', `${await names()} / lista ${await listTop()}`);
check('Duplicar: mesma geometria', await outR() === round({ x: 300, y: 200, w: 600, h: 300 }) && await inR() === baseIn, await outR());
{ const c = await center('#aoList .row.item:nth-child(4)'); await rclick(c[0], c[1]); }   // botão direito na linha de baixo da lista ("Slice")
check('botão direito na lista seleciona a linha e abre o menu dela', await ev(`${P}.ao.sel.item.name`) === 'Slice' && await menuOpen(), await ev(`${P}.ao.sel.item.name`));
await pick('Trazer para frente');
check('Trazer para frente: sobe na lista e vai para a frente', await listTop() === 'Slice,Slice 2' && await names() === 'Slice 2,Slice', `lista ${await listTop()}`);
await rOnBody(); await pick('Mandar para trás');
check('Mandar para trás: desce na lista', await listTop() === 'Slice 2,Slice' && await ev(`${P}.ao.sel.item.name`) === 'Slice', `lista ${await listTop()}`);
await rOnBody(); await pick('Copiar');
await rOnBody();
check('depois de Copiar, Colar deixa de ser cinza', (await menuLabels()).includes('Colar'));
await pick('Colar');
check('Colar no slice: a cópia entra logo atrás e a seleção fica no original', await names() === 'Slice 3,Slice,Slice 2' && await ev(`${P}.ao.sel.item.name`) === 'Slice', `${await names()} sel=${await ev(`${P}.ao.sel.item.name`)}`);
await rOnBody(); await pick('Recortar');
check('Recortar: tira o slice e seleciona o que sobra', await names() === 'Slice 3,Slice 2' && !!(await ev(`${P}.ao.sel.item && ${P}.ao.sel.item.name`)), `${await names()}`);
{ const c = await center('#aoList .row.screen'); await rclick(c[0], c[1]); }
const scr = await menuLabels();
check('botão direito na tela: dispositivos, Duplicar e Colar', scr[0] === 'Dispositivos de saída(cinza)' && scr.includes('Janela') && scr.includes('Duplicar') && scr.includes('Colar'), scr.join('|'));
await pick('Colar');
check('Colar na tela: a cópia vai para o fundo e a seleção fica na tela', await names() === 'Slice,Slice 3,Slice 2' && await ev(`${P}.ao.sel.item === null`), await names());
await undo();
check('Ctrl+Z desfaz o Colar', await names() === 'Slice 3,Slice 2', await names());

// 5. máscara: menu sem círculo, casar e trocar
await ev(`(() => { const ao = ${P}.ao; ao.add('maskRect'); return 1; })()`); await wait(200);
await rOnBody();
check('máscara: o menu é o do slice sem Fazer círculo, Casar e Trocar', (await menuLabels()).join('|') === 'Centralizar X|Centralizar Y|Espelhar X|Espelhar Y|Metade esquerda|Metade de cima|Metade direita|Metade de baixo|Área toda|Trazer para frente(cinza)|Mandar para trás|Duplicar|Copiar|Recortar|Colar', (await menuLabels()).join('|'));
await pick('Área toda');
check('máscara › Área toda cobre a tela', JSON.stringify(await ev(`${P}.M.outRect ? (() => { const b = ${P}.ao.menuRect(${P}.ao.sel.item, true); return [Math.round(b.x), Math.round(b.y), Math.round(b.w), Math.round(b.h)]; })() : null`)) === JSON.stringify([0, 0, SW, SH]));

// devolve tudo como estava
await ev(`${P}.ao.hide(true); 1`); await wait(200);
const ok = results.filter(Boolean).length;
console.log(`\n${results.length} verificações, ${results.length - ok} falha(s) — ${ok === results.length ? 'APROVADO' : 'REPROVADO'}`);
ws.close(); process.exit(ok === results.length ? 0 : 1);
