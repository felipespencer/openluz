// Text Block e Text Animator (plano 02-05): controles do Resolume 7.28.1 no painel Clipe, texto digitado de verdade,
// Ctrl+Z, composição antiga abrindo no modelo novo e o atraso por letra do Animator. Mouse e teclado REAIS pelo CDP.
// O desenho em si é conferido contra o Resolume por tools/compare/texto-cmp.mjs (MEDIDAS.md).
// Uso: node tools/texto-check.mjs   (programa aberto com --remote-debugging-port=9333; limpa a grade no fim)
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLuz');
if (!page) { console.error('janela do OpenLuz não achada', pages.map(p => p.title)); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const key = async (k, code, vk, mods = 0, text) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); };
const type = (text) => send('Input.insertText', { text });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const btn = (type, x, y, n = 1) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: n });
const click = async (x, y) => { await btn('mouseMoved', x, y); await btn('mousePressed', x, y); await btn('mouseReleased', x, y); await wait(150); };
const dbl = async (x, y) => { await click(x, y); await btn('mousePressed', x, y, 2); await btn('mouseReleased', x, y, 2); await wait(300); };
const center = (sel, txt) => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find(e => ${txt ? `e.textContent.trim() === ${JSON.stringify(txt)}` : 'true'}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
const clickOn = async (sel, txt) => { const c = await center(sel, txt); if (!c) throw new Error('não achei ' + sel + ' ' + (txt || '')); await click(c[0], c[1]); return c; };
// linha do painel Clipe pelo rótulo (a n-ésima com esse rótulo)
const rowSel = (label, n = 0) => ev(`(() => { const r = [...document.querySelectorAll('#clipPan .prow')].filter(r => r.querySelector('.pl').textContent === ${JSON.stringify(label)})[${n}]; if (!r) return null; r.scrollIntoView({ block: 'center' }); r.dataset.t = 'alvo'; return 1; })()`);
const inRow = async (label, part, n = 0) => { if (!await rowSel(label, n)) throw new Error('sem a linha ' + label); const c = await center('#clipPan .prow[data-t=alvo] ' + part); await ev(`document.querySelector('#clipPan .prow[data-t=alvo]').removeAttribute('data-t'); 1`); return c; };
const setNum = async (label, v, n = 0) => { const c = await inRow(label, '.val', n); await click(c[0], c[1]); await key('a', 'KeyA', 65, 2); await type(String(v)); await key('Enter', 'Enter', 13); await wait(200); };
const results = []; const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const P = 'window.projecionista';
// desfazer reabre a composição; na primeira vez depois de abrir o programa pode passar de 300 ms: espera terminar
const undo = async () => { await ev(`document.activeElement && document.activeElement.blur(); 1`); await key('Shift', 'ShiftLeft', 16); await wait(100); const n0 = await ev(`${P}.hist.redo.length`); await key('z', 'KeyZ', 90, 2); for (let i = 0; i < 30 && (await ev(`${P}.hist.busy`) || await ev(`${P}.hist.redo.length`) === n0); i++) await wait(100); await wait(200); };

// preparo: diálogos fechados, grade limpa, casa (camada de baixo, coluna 1) selecionada com clique
for (let i = 0; i < 5 && await ev(`document.querySelectorAll('.dlgOver').length`) > 0; i++) { await key('Escape', 'Escape', 27); await wait(200); }
const n = await ev(`${P}.state.layers.length`), L1 = n - 1;
const limpar = () => ev(`(() => { const p = ${P}; p.state.layers.forEach((L, i) => { for (let c = 0; c < 8; c++) if (L.clips[c]) p.clearCell(i, c); p.eject(i); }); p.state.sel = null; p.render(); return 1; })()`);
await limpar();
const cell = (c) => `#grid .cell[data-layer="${L1}"][data-col="${c}"]`;
const clipAt = (c, expr) => ev(`(() => { const k = ${P}.state.layers[${L1}].clips[${c}]; return k ? (${expr}) : null; })()`);

// 1. as duas fontes no navegador de Fontes; duplo clique põe na casa selecionada
for (let i = 0; i < 4 && await ev(`document.querySelector('#browserTabs .on').dataset.tab`) !== 'src'; i++) { await clickOn('#browserTabs [data-tab=src]'); await wait(300); }   // o 1º clique depois de abrir às vezes se perde
check('Fontes lista Text Block e Text Animator', !!(await center('#browserPan .item.src', 'Text Block')) && !!(await center('#browserPan .item.src', 'Text Animator')));
await clickOn(cell(0) + ' .nm');
{ const c = await center('#browserPan .item.src', 'Text Block'); await dbl(c[0], c[1]); }
check('duplo clique em Text Block põe um texto na casa', await clipAt(0, `k.kind === 'text' && !k.text.animator && k.text.v === 2`));
await clickOn(cell(0) + ' .nm'); await wait(300);

// 2. painel com os controles do Resolume, na ordem
const labels = () => ev(`[...document.querySelectorAll('#clipPan .prow .pl')].map(e => e.textContent)`);
const BLOCK = ['Texto', 'Fonte', 'Estilo', 'Cor', 'Tamanho', 'Alinhar', 'Vertical', 'Largura da linha', 'Posição X', 'Posição Y', 'Rotação', 'Escala', 'Espaço X', 'Espaço Y', 'Cor do contorno', 'Contorno', 'Brilho dentro', 'Brilho fora'];
{ const l = await labels(), i = l.indexOf('Texto'); check('Text Block: controles do Resolume na ordem', i >= 0 && BLOCK.every((x, k) => l[i + k] === x), l.slice(i, i + BLOCK.length).join('|')); }
check('fontes do Windows na lista (mais de 40)', await ev(`(async () => (await (await import('./text.js')).listFonts()).length)()`) > 40);

// 3. texto digitado de verdade, com Enter quebrando a linha
{ const c = await inRow('Texto', 'textarea'); await click(c[0], c[1]); await key('a', 'KeyA', 65, 2); await type('Olá'); await key('Enter', 'Enter', 13, 0, String.fromCharCode(13)); await type('Mundo'); await ev(`document.activeElement.blur(); 1`); await wait(300); }
check('texto digitado vira o conteúdo, com duas linhas', await clipAt(0, `k.text.content`) === 'Olá\nMundo', JSON.stringify(await clipAt(0, `k.text.content`)));
const inkRows = (c) => clipAt(c, `(() => { const x = k.el.getContext('2d').getImageData(0, 0, 1920, 1080).data; let runs = 0, on = false; for (let y = 0; y < 1080; y++) { let a = false; for (let i = 0; i < 1920; i += 2) if (x[(y * 1920 + i) * 4 + 3] > 128) { a = true; break; } if (a && !on) runs++; on = a; } return runs; })()`);
check('o desenho tem duas linhas de letras', await inkRows(0) === 2, String(await inkRows(0)));
check('o nome do clipe é a primeira linha', await clipAt(0, `k.name`) === 'Olá');

// 4. Tamanho digitado, e Ctrl+Z volta
const inkH = (c) => clipAt(c, `(() => { const x = k.el.getContext('2d').getImageData(0, 0, 1920, 1080).data; let y0 = -1, y1 = -1; for (let y = 0; y < 1080; y++) for (let i = 0; i < 1920; i += 2) if (x[(y * 1920 + i) * 4 + 3] > 128) { if (y0 < 0) y0 = y; y1 = y; break; } return y1 - y0; })()`);
const h1 = await inkH(0);
await setNum('Tamanho', 2);
check('Tamanho 2 grava 2 e dobra o desenho', await clipAt(0, `k.text.size`) === 2 && Math.abs(await inkH(0) / h1 - 2) < 0.05, h1 + ' → ' + await inkH(0));
await undo();
check('Ctrl+Z volta o Tamanho para 1', await clipAt(0, `k.text.size`) === 1, String(await clipAt(0, `k.text.size`)));

// 5. Estilo pelo teclado na lista (Bold → Bold Italic)
{ if (!await rowSel('Estilo')) throw new Error('sem Estilo'); await ev(`document.querySelector('#clipPan .prow[data-t=alvo] select').focus(); document.querySelector('#clipPan .prow[data-t=alvo]').removeAttribute('data-t'); 1`); await key('ArrowDown', 'ArrowDown', 40); await wait(300); }
check('Estilo muda pela lista', await clipAt(0, `k.text.style`) === 'Bold Italic', String(await clipAt(0, `k.text.style`)));

// 6. composição salva: o texto volta igual; o texto antigo (antes da beta.51) vira o modelo novo
check('salvar e abrir devolve os mesmos valores', await ev(`(async () => { const C = await import('./clips.js'); const k = ${P}.state.layers[${L1}].clips[0]; const o = JSON.parse(JSON.stringify(C.serializeClip(k))); const d = await C.deserializeClip(o); return JSON.stringify(d.text) === JSON.stringify(k.text); })()`));
{
  const r = await ev(`(async () => { const C = await import('./clips.js'); const d = await C.deserializeClip({ kind: 'text', name: 'Antigo', fit: 'stretch', fx: [], transform: null, text: { content: 'Antigo', font: 'Segoe UI', size: 160, bold: true, hue: 0, sat: 0, val: 1, align: 'center', x: 0.5, y: 0.5 } }); return d.text; })()`);
  check('texto antigo abre no modelo novo (Tamanho 1,25, branco, X 480 px, Y −270 px)', r.v === 2 && Math.abs(r.size - 1.25) < 1e-9 && r.color === '#ffffffff' && r.x === 480 && r.y === -270 && r.style === 'Bold' && r.font === 'Segoe UI', JSON.stringify({ size: r.size, color: r.color, x: r.x, y: r.y }));
}

// 7. Text Animator: controles da animação e o atraso por letra
await clickOn(cell(1) + ' .nm');
{ const c = await center('#browserPan .item.src', 'Text Animator'); await dbl(c[0], c[1]); }
check('duplo clique em Text Animator põe o Animator', await clipAt(1, `k.kind === 'text' && k.text.animator === true`));
await clickOn(cell(1) + ' .nm'); await wait(300);
{ const l = await labels(); check('Animator: sem Largura da linha e com a parte de animação', !l.includes('Largura da linha') && ['Animado', 'Pedaços', 'Ordem', 'Atraso', 'Opacidade', 'Âncora X', 'Âncora Y'].every(x => l.includes(x)), l.join('|')); }
await ev(`(() => { const k = ${P}.state.layers[${L1}].clips[1]; k.text.content = 'HHHH'; ${P}.render(); return 1; })()`);
{ const c = await inRow('Texto', 'textarea'); await click(c[0], c[1]); await key('a', 'KeyA', 65, 2); await type('HHHH'); await ev(`document.activeElement.blur(); 1`); await wait(200); }
{ const c = await inRow('Animado', '.ck'); await click(c[0], c[1]); await wait(200); }
check('Animado liga', await clipAt(1, `k.text.animated`) === true);
await setNum('Atraso', 1000);
// o Animator precisa estar no ar para o laço redesenhar: dispara a casa
{ const c = await center(cell(1) + ' .th'); await click(c[0], c[1]); await wait(400); }
const yCols = () => clipAt(1, `(() => { const x = k.el.getContext('2d').getImageData(0, 0, 1920, 1080).data; const out = []; for (const [a, b] of [[790, 850], [880, 940], [975, 1035], [1065, 1125]]) { let s = 0, w = 0; for (let y = 0; y < 1080; y += 2) for (let i = a; i < b; i += 3) { const al = x[(y * 1920 + i) * 4 + 3]; if (al > 128) { s += y; w++; } } out.push(w ? Math.round(s / w) : -1); } return out; })()`);
const y0 = await yCols();
await setNum('Posição Y', 200, 1);   // a segunda "Posição Y" é a animada
const t0 = Date.now(); await wait(120);
const yA = await yCols(); const tA = Date.now() - t0;
await wait(3600);
const yB = await yCols();
const moved = (ys) => ys.map((y, i) => y - y0[i] > 150);
check('ao mudar a Posição Y animada, a 1ª letra desce logo e a última ainda não', moved(yA)[0] && !moved(yA)[3], `${tA} ms: ${yA.map((y, i) => y - y0[i]).join(', ')}`);
check('depois de 4 × 1000 ms as quatro desceram 200 px', yB.every((y, i) => Math.abs(y - y0[i] - 200) <= 2), yB.map((y, i) => y - y0[i]).join(', '));
check('a miniatura do Animator existe', (await clipAt(1, `k.thumb && k.thumb.length`)) > 100);

await limpar();
const ok = results.filter(Boolean).length;
console.log(ok === results.length ? `APROVADO: ${ok} verificações` : `REPROVADO: ${results.length - ok} de ${results.length}`);
ws.close(); process.exit(ok === results.length ? 0 : 1);
