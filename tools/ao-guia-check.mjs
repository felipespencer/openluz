// Imagem de guia da tela e "Mostrar na saída" da Saída avançada, como no Resolume 7.28.1 (plano 07-08),
// com mouse e teclado REAIS pelo CDP. O diálogo de arquivo é o do sistema, respondido pelo CDP (Page.fileChooserOpened).
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Abre e fecha uma janela de saída. Uso: node tools/ao-guia-check.mjs
//
// Medido no Resolume (.paul/phases/07-saida-avancada/07-08-MEDIDAS.md): Input Guide e Output Guide são imagens por cima do
// palco de cada aba, com 25% de opacidade ao carregar, nome, tamanho, ✕ e "…"; não vão para a saída. Com Show in Output,
// o que o palco de saída mostra por cima da imagem (guia de saída, grade e nome do slice) vai também para a saída.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import zlib from 'node:zlib';
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const paginas = async () => (await (await fetch(base + '/json')).json()).filter(p => p.type === 'page');
async function liga(pg) { const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map(), evs = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } else if (d.method) evs.push(d); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  return { ws, send, evs }; }
const { ws, send, evs } = await liga((await paginas()).find(p => p.title === 'OpenLuz'));
await send('Page.enable'); await send('DOM.enable'); await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await send('Page.setInterceptFileChooserDialog', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state, D = window.projDesktop; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const click = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(300); };
const key = async (k, vk, mods = 0) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: vk, modifiers: mods }); await wait(200); };
const digita = async (t) => { for (const ch of t) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch }); } await wait(150); };
const cl = async (expr) => { const r = await ev(`const e = (${expr}); if (!e) return null; e.scrollIntoView && e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;`); if (!r) throw new Error('não achei na tela: ' + expr.slice(0, 90)); await click(r.x, r.y); };
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };

// duas imagens de prova (PNG de cor chapada), escritas numa pasta temporária
const png = (w, h, [r, g, b]) => { const crc = (buf) => { let c, n, k, t = []; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of buf) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (tp, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(tp), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  const row = Buffer.alloc(1 + w * 3); for (let x = 0; x < w; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array(h).fill(row)))), chunk('IEND', Buffer.alloc(0))]); };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'openluz-guia-')), GE = path.join(TMP, 'guia-entrada.png'), GS = path.join(TMP, 'guia-saida.png');
fs.writeFileSync(GE, png(640, 360, [200, 40, 40])); fs.writeFileSync(GS, png(1920, 1080, [40, 60, 200]));

// a última linha com esse nome: a tela também tem uma Opacidade, mais acima no painel
const linha = (rot) => `[...document.querySelectorAll('#aoProps > *')].reverse().find(r => r.querySelector('.val') && r.textContent.trim().replace(/[-\\d.,°%−+ ]+$/, '').trim() === ${JSON.stringify(rot)})`;
const carrega = async (botao, arquivo) => { evs.length = 0; await cl(botao); let e = null; for (let i = 0; i < 40 && !(e = evs.find(x => x.method === 'Page.fileChooserOpened')); i++) await wait(100);
  if (!e) throw new Error('o diálogo de arquivo não abriu'); await send('DOM.setFileInputFiles', { files: [arquivo], backendNodeId: e.params.backendNodeId }); await wait(900); };
const guia = () => ev(`const a = P.ao, sc = a.curScreen(), im = document.querySelector('#aoGuide'); const f = g => g ? { nome: g.name, w: g.w, h: g.h, op: g.op, jpeg: g.url.startsWith('data:image/jpeg'), kb: Math.round(g.url.length / 1024) } : null;
  return { aba: a.tab, entrada: f(sc.guideIn), saida: f(sc.guideOut), visivel: !im.hidden && im.getBoundingClientRect().width > 50, opacidade: +im.style.opacity, larg: Math.round(im.getBoundingClientRect().width), palco: Math.round(document.querySelector('#aoCv').getBoundingClientRect().width) };`);
const j = (v) => JSON.stringify(v);
const PTS = [[0.25, 0.25], [0.75, 0.75]], pix = () => ev(`const a = P.ao.screens(); return JSON.stringify(P.engine.probeScreen(a[0], S.layers, a, ${j(PTS)}));`);
const ajudantes = () => ev(`const h = window.__projHelpers[P.ao.curScreen().id]; return h ? Object.keys(h).filter(k => k !== 'w' && k !== 'h').sort().join(',') : '';`);
const naSaida = async () => { const p = (await paginas()).find(p => p.url.includes('output.html')); if (!p) return null; const o = await liga(p); await wait(500);
  const r = await o.send('Runtime.evaluate', { expression: `(() => { const c = document.getElementById('ov'); if (getComputedStyle(c).display === 'none') return 'escondida'; const d = c.getContext('2d').getImageData(Math.round(c.width * 0.25), Math.round(c.height * 0.25), 1, 1).data; return [...d].join(','); })()`, returnByValue: true }); o.ws.close(); return r.result.result.value; };

try {
  await ev(`try { await D.presets.remove('prova-0708'); } catch { } return 1;`);
  await cl(`document.querySelector('#btnAO')`); await wait(800);
  await cl(`document.querySelector('#aoList .row.screen')`); await wait(300);
  const p0 = await pix();
  confere('aba de entrada: o painel da tela tem "Guia de entrada" e o botão Carregar…', await ev(`return [...document.querySelectorAll('#aoProps .phead')].some(h => h.textContent.trim() === 'Guia de entrada') && !!document.querySelector('#aoProps .prow.guia .gload');`));
  await carrega(`document.querySelector('#aoProps .prow.guia .gload')`, GE); let g = await guia();
  confere('carregar: a guia de entrada aparece por cima do palco, com 25% de opacidade', g.entrada && g.entrada.nome === 'guia-entrada.png' && g.entrada.w === 640 && g.entrada.h === 360 && g.entrada.op === 0.25 && g.visivel && g.opacidade === 0.25 && Math.abs(g.larg - g.palco) <= 1, j(g));
  confere('o painel mostra o nome e o tamanho da imagem, o ✕ e o "…"', await ev(`const r = document.querySelector('#aoProps .prow.guia'); return /guia-entrada\\.png/.test(r.textContent) && /640×360/.test(r.textContent) && !!r.querySelector('.gx') && !!r.querySelector('.gmais') && !!r.querySelector('.gthumb');`));
  await cl(`(${linha('Opacidade')}).querySelector('.val')`); await key('a', 65, 2); await digita('60'); await key('Enter', 13); await wait(300); g = await guia();
  confere('Opacidade = 60 muda a guia no palco', g.entrada.op === 0.6 && g.opacidade === 0.6, j(g.entrada));

  await cl(`document.querySelector('#aoTabOut')`); await wait(400); await cl(`document.querySelector('#aoList .row.screen')`); await wait(300); g = await guia();
  confere('aba de saída: a guia de entrada não aparece; o painel oferece "Guia de saída"', !g.visivel && await ev(`return [...document.querySelectorAll('#aoProps .phead')].some(h => h.textContent.trim() === 'Guia de saída') && !!document.querySelector('#aoProps .prow.guia .gload');`), j(g));
  await carrega(`document.querySelector('#aoProps .prow.guia .gload')`, GS); g = await guia();
  confere('guia de saída carregada: reduzida para caber na saída salva, tamanho original no painel', g.saida && g.saida.w === 1920 && g.saida.h === 1080 && g.saida.jpeg && g.saida.kb < 600 && g.visivel && g.opacidade === 0.25, j(g.saida));
  confere('a imagem da tela de saída não muda com as guias', (await pix()) === p0, await pix());

  // "Mostrar na saída"
  confere('o menu da grade tem "Mostrar na saída", ligado', await ev(`const b = document.querySelector('#aoGridMenu [data-g="out"]'); return !!b && b.textContent.trim() === 'Mostrar na saída' && b.classList.contains('on');`));
  await cl(`document.querySelector('#aoList .row.item')`); await wait(300);   // um slice selecionado: a grade dele também vai
  await mouse('mouseMoved', 700, 400, { buttons: 0 }); await wait(400);
  const h1 = await ajudantes(); confere('com "Mostrar na saída" ligado, a guia de saída e a grade vão para a saída', /grid/.test(h1) && /guide/.test(h1), h1);
  await cl(`document.querySelector('#aoOk')`); await wait(600); await cl(`document.querySelector('#btnOut')`); await wait(2500);
  await cl(`document.querySelector('#btnAO')`); await wait(800); await cl(`document.querySelector('#aoTabOut')`); await wait(400); await mouse('mouseMoved', 700, 400, { buttons: 0 }); await wait(600);
  const s1 = await naSaida(); confere('na janela de saída, a guia está desenhada por cima', s1 && s1 !== 'escondida' && +s1.split(',')[3] > 30, String(s1));
  await cl(`document.querySelector('#aoGridBtn')`); await cl(`document.querySelector('#aoGridMenu [data-g="out"]')`); await wait(700);
  const h2 = await ajudantes(), s2 = await naSaida();
  confere('desligado "Mostrar na saída", nada do editor vai para a saída', h2 === '' && (s2 === 'escondida' || +s2.split(',')[3] === 0), j({ h2, s2 }));
  await cl(`document.querySelector('#aoGridBtn')`); await cl(`document.querySelector('#aoGridMenu [data-g="out"]')`); await wait(400);

  // tirar, desfazer, salvar e abrir
  await cl(`document.querySelector('#aoList .row.screen')`); await wait(300);
  await cl(`document.querySelector('#aoProps .prow.guia .gx')`); g = await guia(); confere('✕ tira a guia', !g.saida && !g.visivel, j(g));
  await key('z', 90, 2); g = await guia(); confere('Ctrl+Z traz a guia de volta', !!g.saida && g.visivel, j(g.saida));
  await ev(`await P.ao.savePreset('prova-0708'); P.ao.newPreset(); return 1;`); await wait(500); g = await guia();
  confere('Novo: a saída nova não tem guia', !g.saida && !g.entrada, j(g));
  await ev(`await P.ao.loadPreset('prova-0708'); return 1;`); await wait(600); g = await guia();
  confere('salvar e abrir o preset guarda as duas guias e as opacidades', g.saida && g.saida.nome === 'guia-saida.png' && g.entrada && g.entrada.op === 0.6, j(g));

  await ev(`try { await D.presets.remove('prova-0708'); } catch { } return 1;`);
  await cl(`document.querySelector('#aoCancel')`); await wait(500);
  for (let i = 0; i < 2 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) await cl(`[...document.querySelectorAll('.dlgOver button')].pop()`);
  confere('fechada a Saída avançada, nada dela fica na saída', (await ajudantes()) === '', await ajudantes());
} catch (e) { ruim++; console.log('PAROU: ' + String(e.message).slice(0, 400)); }
try { if (await ev(`return S.screens.some(s => s.win && !s.win.closed);`)) { await cl(`document.querySelector('#btnOut')`); await wait(800); } } catch { }
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { }
console.log(`\n${ok + ruim} verificações, ${ruim} falha(s) — ${ruim ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(ruim ? 1 : 0);
