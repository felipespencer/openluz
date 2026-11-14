// Porta de entrada (plano 13-01): o caminho de quem abre o OpenLuz pela primeira vez, com mouse e teclado reais pelo CDP.
// Abrir o programa INSTALADO numa pasta de dados nova, com a marca que impede a cópia dos dados antigos (um novato não os tem):
//   UD=%TEMP%\openluz-primeira-vez  (vazia, só com o arquivo .migrado-de-openlume)
//   PROJ_USERDATA=<UD> "%LOCALAPPDATA%\Programs\OpenLuz\OpenLuz.exe" --remote-debugging-port=9333
// Uso: node tools/primeira-vez.mjs     -> fotos em tools/compare/saida/primeira-vez/ e o relato na tela
//      node tools/primeira-vez.mjs --ajuda   -> só as verificações do convite e do aviso (13-02), no programa aberto como novato
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'compare', 'saida', 'primeira-vez'); fs.mkdirSync(OUT, { recursive: true });
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const paginas = async () => (await (await fetch(base + '/json')).json()).filter(p => p.type === 'page');
async function liga(pg) { const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  return { ws, send }; }
const { ws, send } = await liga((await paginas()).find(p => p.title === 'OpenLuz'));
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state, W = ms => new Promise(r => setTimeout(r, ms)); ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const click = async (x, y, n = 1) => { await mouse('mouseMoved', x, y, { buttons: 0 }); for (let i = 1; i <= n; i++) { await mouse('mousePressed', x, y, { clickCount: i }); await mouse('mouseReleased', x, y, { clickCount: i }); } await wait(250); };
const key = async (k, vk, mods = 0) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: vk, modifiers: mods }); await wait(300); };
const pos = async (expr) => { const r = await ev(`const e = (${expr}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };`); if (!r || !r.w) throw new Error('não achei na tela: ' + expr); return r; };
const cl = async (expr, n = 1) => { const r = await pos(expr); await click(r.x, r.y, n); };
let n = 0; const foto = async (nome, s = send) => { const r = await s('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); const f = String(++n).padStart(2, '0') + '-' + nome + '.jpg'; fs.writeFileSync(path.join(OUT, f), Buffer.from(r.result.data, 'base64')); return f; };
const diz = (t) => console.log(t);
const brilho = `(() => { const c = P.engine.canvas, g = document.createElement('canvas'); g.width = 64; g.height = 36; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return Math.round(s / (64 * 36 * 3)); })()`;
const aba = (t) => `[...document.querySelectorAll('#browserTabs span')].find(e => e.textContent.trim() === ${JSON.stringify(t)})`;

const visto = (id) => `(() => { const e = document.getElementById('${id}'); if (!e || e.hidden || !e.isConnected) return null; const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 10 ? { t: e.textContent, pe: getComputedStyle(e).pointerEvents, x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`;
if (process.argv.includes('--ajuda')) {
  let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; diz((passou ? 'OK   ' : 'FALHA ') + nome + (obs ? '  [' + obs + ']' : '')); };
  const casa = (l, c) => `document.querySelector('.cell[data-layer="${l}"][data-col="${c}"]')`;
  try {
    for (let i = 0; i < 3 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) await cl(`[...document.querySelectorAll('.dlgOver button')].find(b => /Pular|Cancelar|Fechar/.test(b.textContent))`);
    const vazia = await ev(`return S.layers.every(L => L.clips.every(c => !c)) && S.layers.every(L => L.on < 0);`);
    if (!vazia) throw new Error('o programa não está como novato: há clipe na grade');
    const g = await ev(`return ${visto('gridHint')};`);
    confere('AC-1 grade vazia mostra o convite', !!g && /Arraste/.test(g.t) && /Fontes/.test(g.t), g ? g.t : 'não aparece');
    confere('AC-1 o convite não recebe o mouse', !!g && g.pe === 'none');
    confere('AC-2 sem clipe, o aviso de clicar não aparece', !(await ev(`return ${visto('airHint')};`)));
    diz('     [' + await foto('ajuda-grade-vazia') + ']');
    if (g) { const em = await ev(`const e = document.elementFromPoint(${g.x}, ${g.y}); return e ? e.className : '';`); confere('AC-1 o clique no meio do convite cai numa casa', /cell/.test(em), em); }
    await cl(aba('Fontes')); const item = `[...document.querySelectorAll('#browserPan .item')].find(e => e.textContent.trim() === 'Checkered')`;
    await cl(casa(2, 3)); await ev(`(${item}).scrollIntoView({ block: 'center' }); return 1;`); await cl(item, 2); await wait(400);
    confere('clipe posto na casa (camada 2, coluna 3) e nada no ar', await ev(`return !!S.layers[2].clips[3] && S.layers.every(L => L.on < 0);`));
    confere('AC-1 o convite some com o primeiro clipe', !(await ev(`return ${visto('gridHint')};`)));
    const a = await ev(`return ${visto('airHint')};`);
    confere('AC-2 com clipe e nada no ar, aparece o aviso', !!a && /Clique na miniatura do clipe/.test(a.t) && a.pe === 'none', a ? a.t : 'não aparece');
    diz('     [' + await foto('ajuda-falta-clicar') + ']');
    await cl(casa(2, 3)); await wait(500);
    confere('clique na casa põe no ar', await ev(`return S.layers[2].on === 3;`));
    confere('AC-2 o aviso some com o clipe no ar', !(await ev(`return ${visto('airHint')};`)));
    await cl(casa(2, 0)); await wait(400);   // clique numa casa vazia tira a camada do ar
    confere('camada fora do ar de novo', await ev(`return S.layers.every(L => L.on < 0);`));
    confere('AC-3 depois da primeira vez, o aviso não volta', !(await ev(`return ${visto('airHint')};`)));
    confere('AC-3 a preferência ficou guardada', await ev(`const p = await window.projDesktop.prefs.get(); return p.airedOnce === true;`));
    await cl(`document.querySelector('#btnOut')`); await wait(2500);
    const saida = (await paginas()).find(p => p.url.includes('output'));
    if (saida) { const o = await liga(saida); const r = await o.send('Runtime.evaluate', { expression: `document.body.innerText + '|' + !!document.getElementById('airHint') + !!document.getElementById('gridHint')`, returnByValue: true }); o.ws.close();
      confere('janela de saída sem texto de ajuda', !/Clique na miniatura|Arraste um/.test(r.result.result.value) && /falsefalse$/.test(r.result.result.value), JSON.stringify(r.result.result.value).slice(0, 80)); } else confere('janela de saída abriu', false);
    await cl(`document.querySelector('#btnOut')`); await wait(800);
  } catch (e) { ruim++; diz('PAROU: ' + String(e.message).slice(0, 240)); }
  diz(`\n${ok} aprovadas, ${ruim} reprovadas`); ws.close(); process.exit(ruim ? 1 : 0);
}
try {
  diz('1. ABRIU  [' + await foto('abriu') + ']');
  diz('   diálogos na frente: ' + JSON.stringify(await ev(`return [...document.querySelectorAll('.dlgOver')].map(d => d.textContent.slice(0, 80));`)));
  diz('   nome no topo: "' + await ev(`return document.querySelector('#compName').textContent;`) + '"; botões do topo: ' + await ev(`return [...document.querySelectorAll('#top button')].map(b => b.textContent.trim()).join(' | ');`));
  diz('   grade: ' + await ev(`return S.layers.length + ' camadas × ' + P.cols() + ' colunas, ' + S.layers.reduce((a, L) => a + L.clips.filter(Boolean).length, 0) + ' clipes';`));
  diz('   aba Arquivos: pasta "' + await ev(`const b = document.querySelector('#browserPan .fbar'); return b ? b.textContent.slice(0, 70) : 'sem barra';`) + '", ' + await ev(`return document.querySelectorAll('#browserPan .item').length;`) + ' itens');
  diz('   caixa de Ajuda diz: "' + await ev(`const h = document.querySelector('#browserHelp'); return h ? h.textContent.slice(0, 120) : '';`) + '"');
  for (let i = 0; i < 3 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) { await cl(`[...document.querySelectorAll('.dlgOver button')].find(b => /Pular|Cancelar|Fechar/.test(b.textContent))`); }

  await cl(aba('Fontes')); diz('2. ABA FONTES  [' + await foto('fontes') + ']: ' + await ev(`return [...document.querySelectorAll('#browserPan .item')].map(e => e.textContent.trim()).slice(0, 8).join(', ') + '…';`));
  const item = `[...document.querySelectorAll('#browserPan .item')].find(e => e.textContent.trim() === 'Checkered')`;
  await cl(item, 2); diz('   duplo clique em Checkered sem nada selecionado: ' + await ev(`return S.layers.reduce((a, L) => a + L.clips.filter(Boolean).length, 0) + ' clipes na grade; aviso: "' + document.querySelector('#toast').textContent + '"';`));
  await cl(`document.querySelector('.cell[data-layer="0"][data-col="0"]')`); diz('   clique numa casa vazia: selecionada ' + await ev(`return JSON.stringify(S.sel);`));
  await ev(`(${item}).scrollIntoView({ block: 'center' }); return 1;`); await cl(item, 2); diz('   duplo clique em Checkered com a casa selecionada: casa tem "' + await ev(`return (S.layers[0].clips[0] || {}).name || 'NADA';`) + '"; no ar: ' + await ev(`return S.layers[0].on;`) + '; brilho do monitor ' + await ev(`await W(300); return ${brilho};`));
  await cl(`document.querySelector('.cell[data-layer="0"][data-col="0"]')`); await wait(400);
  diz('3. CLIQUE NO CLIPE  [' + await foto('no-ar') + ']: no ar ' + await ev(`return S.layers[0].on;`) + '; brilho do monitor ' + await ev(`return ${brilho};`));

  const antes = (await paginas()).length; await cl(`document.querySelector('#btnOut')`); await wait(2500);
  const pgs = await paginas(), saida = pgs.find(p => p.url.includes('output'));
  diz('4. ABRIR SAÍDA: janelas ' + antes + ' → ' + pgs.length + '; botão agora diz "' + await ev(`return document.querySelector('#btnOut').textContent.trim();`) + '"; estado "' + await ev(`return document.querySelector('#outState').textContent.trim();`) + '"; diálogos: ' + JSON.stringify(await ev(`return [...document.querySelectorAll('.dlgOver')].map(d => d.textContent.slice(0, 120));`)));
  if (saida) { const o = await liga(saida); diz('   janela de saída "' + saida.title + '"  [' + await foto('saida', o.send) + ']'); o.ws.close(); } else diz('   NENHUMA janela de saída apareceu');
  diz('   [' + await foto('controle-com-saida') + ']');
  await cl(`document.querySelector('#btnOut')`); await wait(800); diz('   clique de novo no botão: janelas ' + (await paginas()).length + '; botão "' + await ev(`return document.querySelector('#btnOut').textContent.trim();`) + '"');

  await key('s', 83, 2); await wait(500);
  diz('5. CTRL+S  [' + await foto('salvar') + ']: ' + JSON.stringify(await ev(`return [...document.querySelectorAll('.dlgOver')].map(d => d.textContent.slice(0, 160));`)) + '; aviso "' + await ev(`return document.querySelector('#toast').textContent;`) + '"');
  for (let i = 0; i < 3 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) await key('Escape', 27);
} catch (e) { diz('PAROU: ' + String(e.message).slice(0, 240)); }
ws.close(); process.exit(0);
