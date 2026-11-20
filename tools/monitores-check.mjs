// Quadros Composição e Prévia na forma da composição (plano 12-21). O Felipe, com um projetor só, em pé: "ele ainda assim
// deixa os monitores da composicao e da previa na horizontal". No Resolume os quadros seguem a forma da composição.
// Teclado e mouse REAIS pelo CDP: Ctrl+Shift+C, setas no Preset, clique no OK.
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/monitores-check.mjs
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const click = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(300); };
const cl = async (expr) => { const r = await ev(`const e = (${expr}); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;`); if (!r) throw new Error('não achei na tela: ' + expr.slice(0, 90)); await click(r.x, r.y); };
const key = async (k, code, mods = 0) => { for (const type of ['rawKeyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, modifiers: mods }); await wait(300); };
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
const mede = () => ev(`const q = (s) => { const e = document.querySelector(s), r = e.getBoundingClientRect(), c = e.querySelector('canvas'), k = c && c.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), ar: r.width / r.height, enche: !c || (Math.abs(k.width - r.width) <= 3 && Math.abs(k.height - r.height) <= 3) }; };
  const l = document.querySelector('#scrList').getBoundingClientRect(), m = document.querySelector('#mons').getBoundingClientRect();
  return { comp: q('#outScr'), prev: q('#prevScr'), listaTopo: Math.round(l.top), monsFundo: Math.round(m.bottom), monsLarg: Math.round(m.width), tam: S.settings.w + '×' + S.settings.h };`);
const txt = (m) => `${m.tam}: Composição ${m.comp.w}×${m.comp.h}, Prévia ${m.prev.w}×${m.prev.h}, lista em y=${m.listaTopo} (fundo da coluna ${m.monsFundo})`;
const preset = async (alvo) => {   // Ctrl+Shift+C, foco no Preset, setas até o alvo, OK
  await key('c', 67, 10); await wait(400);
  const sel = `[...document.querySelectorAll('.dlgOver .prow')].find(r => r.querySelector('.pl')?.textContent.trim() === 'Preset')?.querySelector('select')`;
  if (!await ev(`const s = ${sel}; if (!s) return false; s.focus(); return document.activeElement === s;`)) throw new Error('sem o Preset nas Configurações');
  for (let i = 0; i < 12; i++) {
    const v = await ev(`return (${sel}).value;`); if (v === alvo) break;
    const idx = await ev(`const s = ${sel}; return [[...s.options].findIndex(o => o.value === s.value), [...s.options].findIndex(o => o.value === ${JSON.stringify(alvo)})];`);
    if (idx[1] > idx[0]) await key('ArrowDown', 40); else await key('ArrowUp', 38);
  }
  const fim = await ev(`return (${sel}).value;`);
  await cl(`[...document.querySelectorAll('.dlgOver .dfoot button')].find(b => b.textContent.trim() === 'OK')`); await wait(600);
  return fim;
};

try {
  let m = await mede();
  confere('em 1920×1080 os dois quadros ficam deitados (16:9)', Math.abs(m.comp.ar - 16 / 9) < 0.03 && Math.abs(m.prev.ar - 16 / 9) < 0.03, txt(m));
  const v = await preset('1080x1920');
  confere('Preset "Em pé 1080×1920" escolhido pelas setas e OK', v === '1080x1920' && await ev(`return S.settings.w === 1080 && S.settings.h === 1920;`), v);
  m = await mede();
  confere('em 1080×1920 o quadro Composição fica em pé', Math.abs(m.comp.ar - 9 / 16) < 0.03, txt(m));
  confere('e o quadro Prévia também', Math.abs(m.prev.ar - 9 / 16) < 0.03, txt(m));
  confere('a imagem enche os quadros, sem faixa preta (a Prévia vazia não tem imagem)', m.comp.enche && m.prev.enche && await ev(`return !!document.querySelector('#outScr canvas');`));
  confere('os quadros em pé não empurram a lista Telas para fora da coluna', m.listaTopo + 20 < m.monsFundo, txt(m));
  confere('o quadro em pé fica no meio da coluna', await ev(`const c = document.querySelector('#outScr').getBoundingClientRect(), m = document.querySelector('#mons').getBoundingClientRect(); return Math.abs((c.left + c.right) / 2 - (m.left + m.right) / 2) < 12;`));
  // composição salva em pé reabre em pé: o mesmo caminho do abrir (applySettings com o que veio do arquivo)
  await ev(`P.applySettings({ ...S.settings, w: 1920, h: 1080 }); return 1;`); await wait(200);
  await ev(`P.applySettings({ ...S.settings, w: 1080, h: 1920 }); return 1;`); await wait(300);
  m = await mede(); confere('reaberta em pé, os quadros voltam em pé', Math.abs(m.comp.ar - 9 / 16) < 0.03, txt(m));
  await preset('1920x1080'); m = await mede();
  confere('de volta a 1920×1080, os quadros deitam de novo', Math.abs(m.comp.ar - 16 / 9) < 0.03 && Math.abs(m.prev.ar - 16 / 9) < 0.03, txt(m));
  await preset('3840x1080'); m = await mede();
  confere('3840×1080 (dois Full HD lado a lado): quadro bem largo, 32:9', Math.abs(m.comp.ar - 32 / 9) < 0.06, txt(m));
  await preset('1920x1080');
} catch (e) { confere('a bateria rodou até o fim', false, e.message); }
console.log(`\n${ok} OK, ${ruim} falha(s)`); ws.close(); process.exit(ruim ? 1 : 0);
