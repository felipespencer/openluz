// Pente fino por uso (plano 12-08): um "show de mentira" no OpenLuz aberto, com mouse e teclado REAIS pelo CDP
// (Input.dispatchMouseEvent / dispatchKeyEvent, nunca .click()), uma foto por passo. Não corrige nem contorna: o passo que
// falha é anotado e o roteiro segue. Programa aberto com --remote-debugging-port=9333 (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/show-passada.mjs [--so nome1,nome2] [--lista]     fotos e passos.json em tools/compare/saida/passada/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..');
const OUT = path.join(HERE, 'compare', 'saida', 'passada'); fs.mkdirSync(OUT, { recursive: true });
const CLIPS = path.join(HERE, 'compare', 'clips').replace(/\\/g, '/');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const so = arg('--so') ? arg('--so').split(',') : null;
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLuz');
if (!page) { console.error('janela do OpenLuz não achada', pages.map(p => p.title)); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map(); const erros = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); }
  if (d.method === 'Runtime.exceptionThrown') erros.push(String(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 300));
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') erros.push('console.error: ' + d.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300)); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
export const wait = (ms) => new Promise(r => setTimeout(r, ms));
export const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const P = 'window.projecionista';
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const click = async (x, y, n = 1) => { await mouse('mouseMoved', x, y, { buttons: 0 }); for (let i = 1; i <= n; i++) { await mouse('mousePressed', x, y, { clickCount: i }); await mouse('mouseReleased', x, y, { clickCount: i }); } };
const rclick = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'right', buttons: 2, clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'right', buttons: 0, clickCount: 1 }); };
const drag = async (x0, y0, x1, y1, passos = 10) => { await mouse('mouseMoved', x0, y0, { buttons: 0 }); await mouse('mousePressed', x0, y0); for (let i = 1; i <= passos; i++) { await mouse('mouseMoved', x0 + (x1 - x0) * i / passos, y0 + (y1 - y0) * i / passos); await wait(15); } await mouse('mouseReleased', x1, y1); };
// arrastar e soltar de verdade (HTML5): o Chromium entrega o arrasto interceptado e a gente solta no alvo
let dragData = null; const onMsg0 = ws.onmessage;
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.method === 'Input.dragIntercepted') dragData = d.params.data; onMsg0(m); };
const dnd = async (de, para) => { const a = await onde(de), b = await onde(para); dragData = null; await send('Input.setInterceptDrags', { enabled: true });
  await mouse('mouseMoved', a.x, a.y, { buttons: 0 }); await mouse('mousePressed', a.x, a.y); for (let i = 1; i <= 6 && !dragData; i++) { await mouse('mouseMoved', a.x + i * 6, a.y + i * 4); await wait(60); }
  if (!dragData) { await mouse('mouseReleased', a.x + 30, a.y + 20); await send('Input.setInterceptDrags', { enabled: false }); throw new Error('o arrasto não começou em ' + de); }
  for (const type of ['dragEnter', 'dragOver', 'dragOver', 'drop']) { await send('Input.dispatchDragEvent', { type, x: b.x, y: b.y, data: dragData }); await wait(60); }
  await mouse('mouseReleased', b.x, b.y); await send('Input.setInterceptDrags', { enabled: false }); await wait(350); };
const VK = { Escape: 27, Enter: 13, Delete: 46, Backspace: 8, Tab: 9, ' ': 32, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
const key = async (k, mods = 0) => { const vk = VK[k] ?? k.toUpperCase().charCodeAt(0), code = k.length === 1 ? (/[0-9]/.test(k) ? 'Digit' + k : k === ' ' ? 'Space' : 'Key' + k.toUpperCase()) : k;
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods, ...(k.length === 1 && !mods ? { text: k } : {}) }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods }); };
const CTRL = 2, SHIFT = 8;
const digita = async (txt) => { for (const ch of txt) { await send('Input.insertText', { text: ch }); await wait(10); } };
// centro de um elemento: seletor CSS, ou expressão JS que devolve o elemento (começando com "js:")
const onde = async (alvo, n = 0) => { const expr = alvo.startsWith('js:') ? alvo.slice(3) : `document.querySelectorAll(${JSON.stringify(alvo)})[${n}]`;
  const r = await ev(`(() => { const e = (${expr}); if (!e) return null; if (e.scrollIntoView) e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, t: r.top, w: r.width, h: r.height, vis: r.width > 0 && r.height > 0 }; })()`);
  if (!r || !r.vis) throw new Error('não achei na tela: ' + alvo); return r; };
const texto = (t, raiz = 'document') => `js:[...${raiz}.querySelectorAll('button, .mi, .tab, .lb, label, span, div')].filter(e => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(t)} && e.getBoundingClientRect().width > 0).sort((a, b) => (b.tagName === 'BUTTON') - (a.tagName === 'BUTTON'))[0]`;   // botão primeiro: a caixa de Ajuda repete o nome do controle sob o mouse
const cl = async (alvo, n = 0) => { const r = await onde(alvo, n); await click(r.x, r.y); await wait(180); return r; };
const menu = async (...itens) => { for (const t of itens) { await cl(texto(t)); await wait(120); } };
const foto = async (nome) => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(path.join(OUT, nome + '.jpg'), Buffer.from(r.result.data, 'base64')); };
const st = (expr) => ev(`(() => { const P = ${P}, S = P.state; return (${expr}); })()`);
const notas = []; const nota = (t) => { notas.push(t); console.log('   · ' + t); };
const celula = (li, c) => `.cell[data-layer="${li}"][data-col="${c}"]`;

// ───────── os passos ─────────
const passos = [];
const passo = (nome, f) => passos.push({ nome, f });

passo('00-abertura', async () => {
  const dlg = await st(`[...document.querySelectorAll('.dlgOver')].map(d => (d.querySelector('.dlgTitle, .title, h1, h2, b') || d).textContent.slice(0, 40))`);
  nota('diálogos abertos ao abrir: ' + JSON.stringify(dlg));
  await foto('00a-como-abriu');
  if (dlg.length) { await cl(texto('Pular')).catch(e => nota('sem botão Pular: ' + e.message)); await wait(300); }
  nota('depois de Pular, diálogos: ' + await st(`document.querySelectorAll('.dlgOver').length`) + '; composição ' + await st(`S.comp ? S.comp.w + 'x' + S.comp.h : (P.engine.canvas.width + 'x' + P.engine.canvas.height)`));
});

passo('01-fontes', async () => {
  await cl(texto('Fontes', 'document.querySelector("#browserTabs")')); await wait(300);
  const itens = await st(`[...document.querySelectorAll('#browserPan .item')].map(e => e.textContent.trim().slice(0, 28))`);
  nota(itens.length + ' fontes: ' + itens.slice(0, 40).join(' | '));
  await cl(celula(0, 0)); await wait(200);
  nota('clique numa casa vazia: selecionada = ' + await st(`JSON.stringify(P.panels && P.panels.sel || S.sel || null)`));
  const r = await onde('#browserPan .item', 0); await click(r.x, r.y, 2); await wait(600);
  nota('duplo clique na 1ª fonte com a casa (0,0) selecionada: casa tem ' + await st(`(S.layers[0].clips[0] || {}).name || 'NADA'`));
  await dnd('js:document.querySelectorAll("#browserPan .item")[3]', celula(1, 1));
  nota('arrastei a 4ª fonte para a casa (1,1): ' + await st(`(S.layers[1].clips[1] || {}).name || 'NADA'`));
});

passo('02-arquivos', async () => {
  await cl(texto('Arquivos', 'document.querySelector("#browserTabs")')); await wait(400);
  const itens = await st(`[...document.querySelectorAll('#browserPan .item')].map(e => e.className + ':' + e.textContent.trim().slice(0, 34))`);
  nota(itens.length + ' itens na pasta: ' + itens.slice(0, 12).join(' | '));
  nota('barra do caminho: ' + await st(`[...document.querySelectorAll('#browserPan > *:not(.item)')].slice(0, 6).map(e => e.tagName + '.' + e.className + ':' + (e.value || e.textContent).trim().slice(0, 50)).join(' || ')`));
  await dnd('js:[...document.querySelectorAll("#browserPan .item.file")].find(e => /\.gif/.test(e.textContent))', celula(0, 1));
  nota('arrastei o GIF para (0,1): ' + await st(`(S.layers[0].clips[1] || {}).name || 'NADA'`));
  await dnd('js:[...document.querySelectorAll("#browserPan .item.file")].find(e => /\.webm/.test(e.textContent))', celula(0, 2));
  nota('arrastei um vídeo para (0,2): ' + await st(`(S.layers[0].clips[2] || {}).name || 'NADA'`));
});

// botão da linha de uma camada (pelo alinhamento vertical com as casas dela) ou por começo do title
const naCamada = (li, sel) => `js:(() => { const c = document.querySelector('${celula(li, 0)}').getBoundingClientRect(); return [...document.querySelectorAll('#mid ${sel}')].find(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.left < c.left && r.top >= c.top - 6 && r.bottom <= c.bottom + 6; }); })()`;
const titulo = (t, n = 0) => `js:[...document.querySelectorAll('[title]')].filter(e => e.title.startsWith(${JSON.stringify(t)}) && e.getBoundingClientRect().width > 0)[${n}]`;
const noAr = () => st(`JSON.stringify(S.layers.map(L => L.on))`);
const ser = () => st(`(() => { const x = P.serialize(); return typeof x === 'string' ? x : JSON.stringify(x); })()`);
const difer = (ja, jb) => { const out = []; const d = (a, b, p) => { if (out.length > 12) return; if (typeof a !== typeof b || (a === null) !== (b === null)) return out.push(p + ': ' + String(JSON.stringify(a)).slice(0, 50) + ' → ' + String(JSON.stringify(b)).slice(0, 50));
  if (a && typeof a === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) d(a[k], b[k], p + '.' + k); } else if (a !== b) out.push(p + ': ' + String(a).slice(0, 50) + ' → ' + String(b).slice(0, 50)); }; d(JSON.parse(ja), JSON.parse(jb), ''); return out.join(' ; ') || 'nada'; };
const tVideo = () => st(`(() => { const c = S.layers[0].clips[2]; return c && c.el ? +c.el.currentTime.toFixed(2) : -1; })()`);
const umVideo = 'js:[...document.querySelectorAll("#browserPan .item.file")].find(e => e.textContent.includes(".webm"))';

passo('03-disparar', async () => {
  nota('antes de disparar, no ar por camada: ' + await noAr());
  await cl(celula(0, 1)); await wait(500); nota('clique no GIF (0,1): ' + await noAr());
  await cl(celula(1, 1)); await wait(500); nota('clique em (1,1): ' + await noAr());
  await cl(celula(0, 2)); await wait(700); nota('clique no vídeo (0,2): ' + await noAr() + '; tempo do vídeo ' + await tVideo());
  await foto('03a-no-ar');
  await cl(titulo('Dispara a coluna', 1)); await wait(500); nota('▶ da Coluna 2: ' + await noAr());
  await cl(naCamada(1, 'button.x')); await wait(300); nota('✕ da Camada 2: ' + await noAr());
  await cl(titulo('Parar: tirar tudo do ar')); await wait(300); nota('■ do transporte: ' + await noAr());
  await cl(celula(0, 2)); await wait(400); await cl(celula(1, 1)); await wait(400);
  await cl(titulo('Pausar todos')); await wait(600); const t1 = await tVideo(); await wait(700); const t2 = await tVideo();
  nota(`‖ do transporte: tempo do vídeo ${t1} → ${t2} (parado se iguais)`);
  await cl(titulo('Tocar todos')); await wait(700); nota('▶ do transporte: tempo ' + await tVideo());
  await key(' '); await wait(300); nota('barra de espaço: no ar ' + await noAr());
});

passo('04-camadas', async () => {
  const L = (k) => st(`JSON.stringify(S.layers.slice(0, 2).map(L => L.${k}))`);
  await cl(naCamada(0, 'button.by')); nota('B (bypass) na Camada 1: ' + await L('bypass')); await cl(naCamada(0, 'button.by')); nota('B de novo: ' + await L('bypass'));
  await cl(naCamada(1, 'button.so')); nota('S (solo) na Camada 2: ' + await L('solo')); await foto('04a-solo'); await cl(naCamada(1, 'button.so')); nota('S de novo: ' + await L('solo'));
  const fd = await st(`(() => { const c = document.querySelector('${celula(0, 0)}').getBoundingClientRect(); return [...document.querySelectorAll('#mid .fader')].filter(b => { const r = b.getBoundingClientRect(); return r.top >= c.top - 6 && r.bottom <= c.bottom + 6; }).map(b => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, t: r.top, h: r.height, c: b.className }; }); })()`);
  nota('faders da Camada 1: ' + JSON.stringify(fd));
  const vals = () => st(`[S.layers[0].master, S.layers[0].volume, S.layers[0].opacity].join(' / ')`);
  for (let i = 0; i < fd.length; i++) { const antes = await vals(); await drag(fd[i].x, fd[i].t + fd[i].h * 0.2, fd[i].x, fd[i].t + fd[i].h * 0.7); await wait(200);
    nota(`arrastei o ${i + 1}º fader da Camada 1 para baixo: master / volume / opacidade ${antes} → ` + await vals()); }
  await foto('04b-faders');
  const sel = await onde(naCamada(0, 'select')); await click(sel.x, sel.y); await wait(250); await key('ArrowDown'); await key('ArrowDown'); await key('Enter'); await wait(300);
  nota('modo de mistura da Camada 1 por teclado (2 para baixo): ' + await L('blend'));
  await cl(naCamada(0, 'button.bus')); nota('bus A na Camada 1: ' + await L('bus')); await cl(naCamada(1, 'button.bus')); nota('bus na Camada 2: ' + await L('bus'));
  await cl(naCamada(0, 'button.nx')); await wait(400); nota('▶| (próximo clipe) na Camada 1: no ar ' + await noAr()); await cl(naCamada(0, 'button.pv')); await wait(400); nota('|◀ (anterior): ' + await noAr());
});

passo('05-xfade-deck-bpm', async () => {
  const x = await onde(titulo('Crossfader')); nota('crossfader antes: ' + await st(`S.xfade.pos`));
  await drag(x.l + x.w * 0.5, x.y, x.l + x.w * 0.95, x.y); await wait(200); nota('arrastei para a direita: ' + await st(`S.xfade.pos`)); await foto('05a-xfade-B');
  await drag(x.l + x.w * 0.95, x.y, x.l + x.w * 0.05, x.y); await wait(200); nota('arrastei para a esquerda: ' + await st(`S.xfade.pos`));
  await cl(titulo('Ir para o bus B')); await wait(1200); nota('botão B do crossfader: ' + await st(`S.xfade.pos`)); await cl(titulo('Ir para o bus A')); await wait(1200); nota('botão A: ' + await st(`S.xfade.pos`));
  nota('BPM antes: ' + await st(`JSON.stringify(S.bpm).slice(0, 160)`));
  for (let i = 0; i < 5; i++) { await cl(titulo('Bata no ritmo')); await wait(400); } nota('5 toques no TAP a cada ~0,6 s (esperado ~100): ' + await st(`S.bpm.bpm`));
  await cl(titulo('Metade do BPM')); nota('/2: ' + await st(`S.bpm.bpm`)); await cl(titulo('Dobro do BPM')); nota('×2: ' + await st(`S.bpm.bpm`)); await cl(titulo('BPM +1')); nota('+1: ' + await st(`S.bpm.bpm`));
  const bv = await onde('input.bv'); await click(bv.x, bv.y, 2); await wait(150); await key('a', CTRL); await digita('128'); await key('Enter'); await wait(200); nota('digitei 128 no campo do BPM: ' + await st(`S.bpm.bpm`) + ' (campo mostra ' + await st(`document.querySelector('input.bv').value`) + ')');
  const cas = () => st(`S.decks.length + ' decks (atual ' + S.deck + '); casas com clipe ' + S.layers.reduce((a, L) => a + L.clips.filter(Boolean).length, 0) + '; no ar ' + JSON.stringify(S.layers.map(L => L.on))`);
  nota('antes: ' + await cas()); await cl(titulo('Deck novo')); await wait(500); nota('+ deck: ' + await cas()); await foto('05b-deck2');
  await cl(titulo('Deck Deck 1')); await wait(500); nota('voltei ao Deck 1: ' + await cas());
});

passo('06-desfazer', async () => {
  const a = await ser(); await cl(naCamada(2, 'button.by')); await dnd(umVideo, celula(2, 3));
  const b = await ser(); nota('fiz 2 coisas (bypass na Camada 3, vídeo em (2,3)); mudou: ' + (a !== b));
  const como = () => st(`'casa (2,3): ' + ((S.layers[2].clips[3] || {}).name || 'vazia') + ', bypass da Camada 3: ' + S.layers[2].bypass`);
  await key('z', CTRL); await wait(300); nota('1º Ctrl+Z → ' + await como()); await key('z', CTRL); await wait(300); const c = await ser(); nota('2º Ctrl+Z → ' + await como() + '; igual ao começo: ' + (c === a) + (c === a ? '' : ' — o que ficou diferente: ' + difer(a, c)));
  await key('y', CTRL); await wait(300); await key('y', CTRL); await wait(300); const d = await ser(); nota('Ctrl+Y duas vezes → ' + await como() + '; igual ao feito: ' + (d === b) + (d === b ? '' : ' — diferente: ' + difer(b, d)));
  await key('z', CTRL); await wait(200); await key('z', CTRL); await wait(300);
});

const painel = (n) => `[...document.querySelectorAll('#bot > .pan')][${n}]`;   // 0 = Composição/Camada/Grupo, 1 = Clipe, 2 = Arquivos…
const folhas = (n, max = 70) => st(`[...${painel(n)}.querySelectorAll('*')].filter(e => e.children.length === 0 && e.getBoundingClientRect().width > 0 && (e.textContent.trim() || e.value || e.title)).map(e => (e.tagName === 'INPUT' ? '[' + (e.type || '') + ' ' + e.value + ']' : e.textContent.trim().slice(0, 22)) + (e.title ? '«' + e.title.slice(0, 18) + '»' : '')).slice(0, ${max}).join(' | ')`);
const fxDe = () => st(`JSON.stringify({ clipe: (S.layers[0].clips[2].fx || []).map(f => f.id + (f.bypass ? '(desl)' : '')), camada: (S.layers[0].fx || []).map(f => f.id) })`);

passo('07-efeitos', async () => {
  await cl(celula(0, 2)); await wait(500);
  nota('painel Clipe com o vídeo selecionado: ' + await folhas(1, 60));
  await foto('07a-painel-clipe');
  await cl(texto('Efeitos', 'document.querySelector("#browserTabs")')); await wait(300);
  const lista = await st(`[...document.querySelectorAll('#browserPan .item')].map(e => e.textContent.trim().slice(0, 20))`); nota(lista.length + ' efeitos na lista; primeiros: ' + lista.slice(0, 8).join(', '));
  const ef = (nome) => `js:[...document.querySelectorAll('#browserPan .item')].find(e => e.textContent.trim().startsWith(${JSON.stringify(nome)}))`;
  const b = await onde('#browserPan input.search').catch(() => null);
  if (b) { await click(b.x, b.y); await digita('blur'); await wait(300); nota('busca "blur": ' + await st(`[...document.querySelectorAll('#browserPan .item')].filter(e => e.getBoundingClientRect().height > 0).map(e => e.textContent.trim().slice(0, 18)).join(', ')`));
    await key('a', CTRL); await key('Backspace'); await wait(300); nota('apaguei a busca: ' + await st(`[...document.querySelectorAll('#browserPan .item')].filter(e => e.getBoundingClientRect().height > 0).length`) + ' visíveis'); } else nota('sem campo de busca na aba Efeitos');
  await cl(celula(0, 2)); await wait(300);
  const r = await onde(ef('Blur')); await click(r.x, r.y, 2); await wait(500); nota('duplo clique no Blur com o clipe selecionado: ' + await fxDe() + '; aviso na tela: "' + await st(`document.querySelector('#toast').textContent`) + '"; o que está sob o mouse: ' + await st(`(() => { const e = document.elementFromPoint(${r.x}, ${r.y}); return e ? e.tagName + '.' + e.className + ':' + e.textContent.slice(0, 20) : 'nada'; })()`));
  await dnd(ef('Invert'), celula(0, 2)); nota('arrastei Invert RGB para a casa do clipe: ' + await fxDe());
  await dnd(ef('Hue'), `js:[...${painel(1)}.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim().startsWith('Solte outro efeito'))`); nota('arrastei Hue Rotate para "Solte outro efeito aqui" do painel Clipe: ' + await fxDe());
  await foto('07b-com-efeitos');
  nota('painel Clipe com efeitos: ' + await folhas(1, 110));
});

// num painel: o controle (folha com o texto `oque`) da linha que tem o rótulo `rot`; `qual` escolhe entre rótulos repetidos
const naLinha = (n, rot, oque, qual = 0) => `js:(() => { const lb = [...${painel(n)}.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(rot)} && e.getBoundingClientRect().width > 0)[${qual}]; if (!lb) return null;
  let r = lb.parentElement; for (let i = 0; i < 4 && r; i++, r = r.parentElement) { const a = [...r.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(oque)}); if (a) return a; } return null; })()`;
const fx0 = () => st(`JSON.stringify((S.layers[0].clips[2].fx || []).map(f => f.id + (f.bypass ? '(desl)' : '') + ' ' + JSON.stringify(f.params).slice(0, 70)))`);

passo('08-painel-efeitos', async () => {
  await cl(celula(0, 2)); await wait(400); nota('efeitos do clipe: ' + await fx0());
  for (let i = 0; i < 3; i++) await cl(naLinha(1, 'Vermelho', '−')); nota('3 cliques no − do Vermelho (Invert RGB): ' + await fx0());
  const v = await onde(naLinha(1, 'Vermelho', '−')); const linha = await st(`(() => { const e = document.elementFromPoint(${v.x - 60}, ${v.y}); return e.tagName + '.' + e.className + ':' + (e.value || e.textContent).slice(0, 12); })()`); nota('à esquerda do − há: ' + linha);
  await click(v.x - 60, v.y, 2); await wait(200); await key('a', CTRL); await digita('0.5'); await key('Enter'); await wait(250); nota('duplo clique no valor e digitei 0.5: ' + await fx0());
  await key('a', CTRL); await digita('0,25'); await key('Enter'); await wait(250); nota('digitei 0,25 (com vírgula): ' + await fx0());
  await cl(naLinha(1, 'Hue Rotate', '▲')).catch(e => nota('sem ▲ no Hue Rotate: ' + e.message)); nota('▲ (subir) no Hue Rotate: ' + await fx0());
  await foto('08a-efeitos-mexidos');
  await cl(naLinha(1, 'Invert RGB', '✕')); nota('✕ no Invert RGB: ' + await fx0());
  await key('z', CTRL); await wait(300); nota('Ctrl+Z: ' + await fx0());
  nota('cabeçalho do efeito tem: ' + await st(`(() => { const lb = [...${painel(1)}.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === 'Hue Rotate'); return [...lb.parentElement.querySelectorAll('*')].filter(e => e.children.length === 0).map(e => e.textContent.trim() + (e.title ? '«' + e.title + '»' : '')).join(' | '); })()`));
});

passo('09-transporte-do-clipe', async () => {
  await cl(celula(0, 2)); await wait(500);
  const bot = await st(`[...${painel(1)}.querySelectorAll('button, [title]')].filter(e => e.getBoundingClientRect().width > 0).slice(0, 40).map(e => (e.textContent.trim().slice(0, 6) || '·') + '«' + (e.title || '').slice(0, 26) + '»').join(' | ')`); nota('botões do painel Clipe: ' + bot);
  await foto('09a-transporte');
  for (let i = 0; i < 2; i++) await cl(naLinha(1, 'Velocidade', '+')); nota('2 cliques no + da Velocidade: ' + await st(`S.layers[0].clips[2].speed`));
  const t0 = await tVideo(); await wait(500); nota(`vídeo andando: ${t0} → ` + await tVideo());
  await cl(texto('Piano')); await wait(200); nota('Estilo de disparo Piano: ' + await st(`S.layers[0].clips[2].trig`)); await cl(texto('Normal'));
  await cl(naLinha(1, 'Opacidade', '−')); nota('− na Opacidade do clipe: ' + await st(`S.layers[0].clips[2].opacity`));
  await cl(naLinha(1, 'Posição X', '+')); nota('+ na Posição X: ' + await st(`JSON.stringify(S.layers[0].clips[2].transform)`));
});

passo('A2-virgula', async () => {   // o programa mostra os valores com vírgula; dá para digitar com vírgula?
  await cl(celula(0, 2)); await wait(400);
  const v = await onde(naLinha(1, 'Verde', '−'));
  const digitar = async (txt) => { await click(v.x - 60, v.y, 2); await wait(250); const campo = await st(`(() => { const e = document.activeElement; return e ? e.tagName + ':' + (e.value ?? '') : 'nada'; })()`); await key('a', CTRL); await digita(txt); await key('Enter'); await wait(250);
    return `campo aberto "${campo}", digitei "${txt}" → verde = ` + await st(`S.layers[0].clips[2].fx.find(f => f.id === 'invertrgb').params.g`) + ', mostra "' + await st(`document.elementFromPoint(${v.x - 60}, ${v.y}).textContent`) + '"'; };
  nota(await digitar('0.4')); nota(await digitar('0,7')); nota(await digitar('abc')); nota(await digitar('5')); nota(await digitar('-1'));
});

const aoTxt = (max = 90) => st(`[...document.querySelectorAll('#ao *')].filter(e => e.children.length === 0 && e.getBoundingClientRect().width > 0 && (e.textContent.trim() || e.title)).map(e => (e.tagName === 'INPUT' ? '[' + e.value + ']' : e.textContent.trim().slice(0, 20)) + (e.title ? '«' + e.title.slice(0, 20) + '»' : '')).slice(0, ${max}).join(' | ')`);
const telas = () => st(`JSON.stringify((S.screens || []).map(sc => ({ nome: sc.name, itens: (sc.items || []).map(i => (i.type || i.kind || '?') + ':' + (i.name || '')) })))`);

passo('10-saida-avancada', async () => {
  await cl(texto('Saída avançada')); await wait(700);
  nota('aberta: ' + await st(`getComputedStyle(document.querySelector('#ao')).display`) + '; telas: ' + await telas());
  nota('o que há na janela: ' + await aoTxt(120));
  await foto('10a-saida-avancada');
  const sl = () => st(`JSON.stringify((S.screens || []).map(sc => (sc.items || []).map(i => ({ n: i.name, t: i.type || i.kind, in: i.in || i.input || i.src, out: i.out || i.quad || i.warp })))).slice(0, 420)`);
  nota('slice antes: ' + await sl());
  // a janela tem 1584×861: o slice ocupa de (302,162) a (1329,740) na aba Entrada
  await drag(1329, 740, 1100, 600); await wait(300); nota('arrastei o canto de baixo à direita para dentro (aba Entrada): ' + await sl()); await foto('10b-entrada-menor');
  await key('z', CTRL); await wait(300); nota('Ctrl+Z dentro da Saída avançada: ' + await sl());
  await cl(texto('Transformação de saída')); await wait(500); await foto('10c-aba-saida');
  nota('aba Saída mostra: ' + await aoTxt(60));
  await drag(1329, 740, 1200, 650); await wait(300); nota('arrastei o mesmo ponto na aba Saída: ' + await sl()); await foto('10d-saida-deformada');
  await cl(texto('Seleção de entrada')); await wait(300);
  const mais = await onde('#ao button, #ao .add, #ao [class*=add]').catch(() => null); await click(25, 62); await wait(300); nota('menu do +: ' + await st(`[...document.querySelectorAll('.menuLayer .mi .lb, .menuLayer .mi')].map(e => e.textContent.trim().slice(0, 24)).join(' | ')`)); await foto('10e-menu-mais');
  await key('Escape'); await wait(200); nota('depois do Esc no menu: Saída avançada ainda aberta = ' + (await st(`getComputedStyle(document.querySelector('#ao')).display`) !== 'none'));
  await cl(texto('Cancelar')); await wait(500);
  nota('Cancelar: perguntou algo? diálogos = ' + await st(`[...document.querySelectorAll('.dlgOver')].map(d => d.textContent.slice(0, 120)).join(' ## ')`) + '; aberta = ' + (await st(`getComputedStyle(document.querySelector('#ao')).display`) !== 'none')); await foto('10f-cancelar');
});

passo('A3-menu-mais-da-saida', async () => {   // o menu "+" da Saída avançada: fecha com Esc? com clique fora? deixa clicar em Cancelar?
  const aberta = () => st(`getComputedStyle(document.querySelector('#ao')).display !== 'none'`);
  const menuM = () => st(`(() => { const e = [...document.querySelectorAll('#ao *, body > *')].find(x => x.children.length === 0 && x.textContent.trim() === 'Máscara de saída' && x.getBoundingClientRect().width > 0); if (!e) return 'fechado'; let p = e; while (p.parentElement && p.parentElement.getBoundingClientRect().width < 400) p = p.parentElement; return 'aberto (' + p.tagName + '.' + p.className + ' dentro de ' + (p.parentElement.id || p.parentElement.className) + ')'; })()`);
  if (!await aberta()) { await cl(texto('Saída avançada')); await wait(600); }
  if (await menuM() === 'fechado') { await click(25, 62); await wait(300); }
  nota('menu +: ' + await menuM());
  await key('Escape'); await wait(300); nota('Esc: menu ' + await menuM() + '; Saída avançada aberta = ' + await aberta() + '; diálogos = ' + await st(`document.querySelectorAll('.dlgOver').length`));
  for (let i = 0; i < 3 && await st(`document.querySelectorAll('.dlgOver').length`) > 0; i++) { nota('diálogo: ' + await st(`document.querySelector('.dlgOver').textContent.slice(0, 140)`)); await key('Escape'); await wait(300); }
  if (await menuM() === 'fechado') { await click(25, 62); await wait(300); }
  const c = await onde(texto('Cancelar')); await click(c.x, c.y); await wait(400); nota('clique em Cancelar com o menu aberto: menu ' + await menuM() + '; Saída avançada aberta = ' + await aberta());
  if (await aberta()) { await click(800, 800); await wait(300); nota('clique numa área vazia: menu ' + await menuM()); const c2 = await onde(texto('Cancelar')); await click(c2.x, c2.y); await wait(400); nota('Cancelar de novo: aberta = ' + await aberta() + '; diálogos = ' + await st(`[...document.querySelectorAll('.dlgOver')].map(d => d.textContent.slice(0, 100)).join(' ## ')`)); }
  for (let i = 0; i < 3 && await st(`document.querySelectorAll('.dlgOver').length`) > 0; i++) { await key('Escape'); await wait(300); }
  if (await aberta()) { await st(`(P.ao.hide(false), 1)`); nota('fechei a Saída avançada por fora para o roteiro seguir'); }
});

const menuAberto = () => st(`[...document.querySelectorAll('.menuLayer .mi')].map(e => e.textContent.trim().slice(0, 30)).join(' | ')`);

passo('11-gravar', async () => {
  if (await st(`getComputedStyle(document.querySelector('#ao')).display !== 'none'`)) await st(`(P.ao.hide(false), 1)`);
  await cl(celula(0, 2)); await wait(300);
  await cl('#btnRec'); await wait(2500); nota('REC ligado: botão diz "' + await st(`document.querySelector('#btnRec').textContent.trim()`) + '"; aviso "' + await st(`document.querySelector('#toast').textContent`) + '"'); await foto('11a-gravando');
  await cl('#btnRec'); await wait(2500); nota('REC desligado: botão "' + await st(`document.querySelector('#btnRec').textContent.trim()`) + '"; aviso "' + await st(`document.querySelector('#toast').textContent`) + '"; diálogos: ' + await st(`[...document.querySelectorAll('.dlgOver')].map(d => d.textContent.slice(0, 160)).join(' ## ')`));
  await foto('11b-depois-de-gravar');
  for (let i = 0; i < 3 && await st(`document.querySelectorAll('.dlgOver').length`) > 0; i++) { await key('Escape'); await wait(300); }
  await cl(texto('Gravar', 'document.querySelector("#browserTabs")')); await wait(400); nota('aba Gravar: ' + await st(`[...document.querySelectorAll('#browserPan *')].filter(e => e.children.length === 0 && e.textContent.trim()).map(e => e.textContent.trim().slice(0, 30)).slice(0, 14).join(' | ')`));
});

passo('12-salvar', async () => {
  await cl(texto('Composição', 'document.querySelector("#menubar")')); await wait(300); nota('menu Composição: ' + await menuAberto()); await foto('12a-menu-composicao');
  await cl(texto('Salvar como…')).catch(async () => { nota('sem "Salvar como…" no menu'); await key('Escape'); });
  await wait(400); nota('diálogo: ' + await st(`[...document.querySelectorAll('.dlgOver')].map(d => d.textContent.slice(0, 120)).join(' ## ')`));
  await key('a', CTRL); await digita('passada-1208'); await key('Enter'); await wait(900);
  for (let i = 0; i < 2 && await st(`document.querySelectorAll('.dlgOver').length`) > 0; i++) { nota('outro diálogo: ' + await st(`document.querySelector('.dlgOver').textContent.slice(0, 140)`)); await key('Enter'); await wait(500); }
  nota('nome no topo: "' + await st(`document.querySelector('#compName').textContent`) + '"; aviso "' + await st(`document.querySelector('#toast').textContent`) + '"');
  fs.writeFileSync(path.join(OUT, 'salvo.json'), await ser());
  await cl(texto('Composições', 'document.querySelector("#browserTabs")')); await wait(400); nota('aba Composições: ' + await st(`[...document.querySelectorAll('#browserPan .item')].map(e => e.textContent.trim().slice(0, 26)).slice(0, 10).join(' | ')`));
});

passo('13-reabrir', async () => {   // rodar depois de fechar e abrir o programa: a composição salva volta igual?
  nota('ao abrir: nome "' + await st(`document.querySelector('#compName').textContent`) + '", diálogos: ' + await st(`[...document.querySelectorAll('.dlgOver')].map(d => d.textContent.slice(0, 60)).join(' ## ')`));
  for (let i = 0; i < 3 && await st(`document.querySelectorAll('.dlgOver').length`) > 0; i++) { await cl(texto('Pular')).catch(() => key('Escape')); await wait(400); }
  await cl(texto('Composições', 'document.querySelector("#browserTabs")')); await wait(400);
  const r = await onde(`js:[...document.querySelectorAll('#browserPan .item')].find(e => e.textContent.includes('passada-1208'))`); await click(r.x, r.y, 2); await wait(2500);
  for (let i = 0; i < 2 && await st(`document.querySelectorAll('.dlgOver').length`) > 0; i++) { nota('diálogo ao abrir: ' + await st(`document.querySelector('.dlgOver').textContent.slice(0, 140)`)); await key('Enter'); await wait(800); }
  let antes = fs.readFileSync(path.join(OUT, 'salvo.json'), 'utf8'); if (antes.startsWith('"')) antes = JSON.parse(antes); const agora = await ser();
  nota('abriu "' + await st(`document.querySelector('#compName').textContent`) + '"; igual ao que foi salvo: ' + (antes === agora) + (antes === agora ? '' : ' — diferente em: ' + difer(antes, agora)));
  nota('no ar depois de abrir: ' + await noAr());
});

if (process.argv.includes('--lista')) { for (const p of passos) console.log(p.nome); ws.close(); process.exit(0); }
const res = [];
for (const p of passos) {
  if (so && !so.includes(p.nome)) continue;
  console.log('▶ ' + p.nome); const n0 = notas.length, e0 = erros.length; let falha = null;
  try { await p.f(); } catch (e) { falha = String(e.message).slice(0, 300); console.log('   FALHOU: ' + falha); }
  await wait(250); await foto(p.nome).catch(() => { });
  res.push({ passo: p.nome, falha, notas: notas.slice(n0), erros: erros.slice(e0) });
  if (erros.length > e0) console.log('   erros na página: ' + erros.slice(e0).join(' | '));
}
const arq = path.join(OUT, 'passos.json'); const antigo = so && fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, 'utf8')) : [];
fs.writeFileSync(arq, JSON.stringify([...antigo.filter(a => !res.find(r => r.passo === a.passo)), ...res], null, 1));
console.log(`${res.length} passos, ${res.filter(r => r.falha).length} falharam, ${res.reduce((a, r) => a + r.erros.length, 0)} erros na página`);
ws.close(); process.exit(0);
