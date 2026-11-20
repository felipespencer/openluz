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
  for (let i = 0; i < 4 && await ev(`return document.querySelectorAll('.dlgOver').length;`); i++) await key('Escape', 27);   // diálogo da primeira vez
  let m = await mede();
  confere('em 1920×1080 os dois quadros ficam deitados (16:9)', Math.abs(m.comp.ar - 16 / 9) < 0.03 && Math.abs(m.prev.ar - 16 / 9) < 0.03, txt(m));
  const v = await preset('1080x1920');
  confere('Preset "Em pé 1080×1920" escolhido pelas setas e OK', v === '1080x1920' && await ev(`return S.settings.w === 1080 && S.settings.h === 1920;`), v);
  m = await mede();
  confere('em 1080×1920 o quadro Composição fica em pé', Math.abs(m.comp.ar - 9 / 16) < 0.03, txt(m));
  confere('e o quadro Prévia também', Math.abs(m.prev.ar - 9 / 16) < 0.03, txt(m));
  confere('a imagem enche os quadros, sem faixa preta (a Prévia vazia não tem imagem)', m.comp.enche && m.prev.enche && await ev(`return !!document.querySelector('#outScr canvas');`));
  confere('os quadros em pé não empurram a lista Telas para fora da coluna', m.listaTopo + 20 < m.monsFundo, txt(m));
  confere('o quadro em pé fica no meio da metade dele (Composição e Prévia lado a lado)', await ev(`const c = document.querySelector('#outScr').getBoundingClientRect(), m = document.querySelector('#outScr').closest('.mon').getBoundingClientRect(); return Math.abs((c.left + c.right) / 2 - (m.left + m.right) / 2) < 12;`));
  // composição salva em pé reabre em pé: o mesmo caminho do abrir (applySettings com o que veio do arquivo)
  await ev(`P.applySettings({ ...S.settings, w: 1920, h: 1080 }); return 1;`); await wait(200);
  await ev(`P.applySettings({ ...S.settings, w: 1080, h: 1920 }); return 1;`); await wait(300);
  m = await mede(); confere('reaberta em pé, os quadros voltam em pé', Math.abs(m.comp.ar - 9 / 16) < 0.03, txt(m));
  await preset('1920x1080'); m = await mede();
  confere('de volta a 1920×1080, os quadros deitam de novo', Math.abs(m.comp.ar - 16 / 9) < 0.03 && Math.abs(m.prev.ar - 16 / 9) < 0.03, txt(m));
  await preset('3840x1080'); m = await mede();
  confere('3840×1080 (dois Full HD lado a lado): quadro bem largo, 32:9', Math.abs(m.comp.ar - 32 / 9) < 0.06, txt(m));
  await preset('1920x1080');

  // ---- vista Projetores (12-21): duas telas, uma em cada projetor
  const mon = await ev(`return await window.projDesktop.displays();`), proj = mon.filter(d => !d.primary);
  if (proj.length < 2) confere('preciso de dois projetores ligados para a vista', false, mon.map(d => d.label).join(', '));
  else {
    await cl(`document.querySelector('#btnAO')`); await wait(700);
    await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="screen"]')`); await wait(400);
    await cl(`document.querySelector('#aoOk')`); await wait(700);
    for (let i = 0; i < 2; i++) { await ev(`const s = document.querySelectorAll('#scrList select.dev')[${i}]; s.value = ${JSON.stringify(proj[i].id)}; s.dispatchEvent(new Event('change')); return 1;`); await wait(800); }
    // algo no ar: Checkered na primeira casa
    await cl(`document.querySelector('.cell[data-layer="0"][data-col="0"]')`);
    await cl(`[...document.querySelectorAll('#browserTabs span')].find(e => e.textContent.trim() === 'Fontes')`);
    await ev(`return 1;`); { const r = await ev(`const e = [...document.querySelectorAll('#browserPan .item')].find(e => e.textContent.trim() === 'Checkered'); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };`); await mouse('mouseMoved', r.x, r.y, { buttons: 0 }); for (let i = 1; i <= 2; i++) { await mouse('mousePressed', r.x, r.y, { clickCount: i }); await mouse('mouseReleased', r.x, r.y, { clickCount: i }); } await wait(400); }
    await cl(`document.querySelector('.cell[data-layer="0"][data-col="0"]')`); await wait(500);
    await cl(`document.querySelector('#btnOut')`); await wait(2500);
    const v = await ev(`const t = [...document.querySelectorAll('#projView .tela')]; return t.map(e => { const sc = S.screens.find(s => s.uid == e.dataset.uid), r = e.getBoundingClientRect(); return { nome: sc.name, ar: r.width / r.height, quer: sc.w / sc.h, on: e.classList.contains('on'), x: r.left, w: r.width, h: r.height, dentro: r.bottom <= document.querySelector('#projView').getBoundingClientRect().bottom + 1 }; });`);
    confere('a vista mostra as duas telas', v.length === 2, JSON.stringify(v.map(t => t.nome)));
    confere('cada miniatura tem a forma da tela dela (uma deitada, uma em pé)', v.every(t => Math.abs(t.ar - t.quer) / t.quer < 0.06) && v.some(t => t.quer > 1) && v.some(t => t.quer < 1), v.map(t => t.nome + ' ' + Math.round(t.w) + '×' + Math.round(t.h)).join(', '));
    confere('as duas no ar, marcadas como no ar', v.every(t => t.on));
    confere('as miniaturas cabem na vista', v.every(t => t.dentro));
    const amostra = () => ev(`return [...document.querySelectorAll('#projView .tela canvas')].map(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 16) s += d[i] + d[i + 1] + d[i + 2]; return s; });`);
    const a0 = await amostra();
    confere('as miniaturas têm imagem (não estão pretas)', a0.every(n => n > 0), a0.join(', '));
    // imagem que muda: tira do ar e confere que a miniatura acompanha
    await ev(`P.eject(0); return 1;`); await wait(1200); const a1 = await amostra();
    confere('tirando o clipe do ar, as miniaturas acompanham', a1.every((n, i) => n !== a0[i]), a0.join(',') + ' → ' + a1.join(','));
    await cl(`document.querySelector('.cell[data-layer="0"][data-col="0"]')`); await wait(800);
    const f0 = await ev(`return P.frames();`); await wait(5000); const qps = (await ev(`return P.frames();`) - f0) / 5;
    confere('com as duas saídas e a vista, o motor fica em 28 qps ou mais', qps >= 28, qps.toFixed(1) + ' qps');
    // clique numa miniatura abre a Saída avançada nela
    const alvo = v.find(t => t.quer < 1);
    await cl(`[...document.querySelectorAll('#projView .tela')].find(e => S.screens.find(s => s.uid == e.dataset.uid).name === ${JSON.stringify(alvo.nome)})`); await wait(700);
    confere('clicar no projetor em pé abre a Saída avançada nele, na aba Saída', await ev(`return P.ao.open && P.ao.curScreen().name === ${JSON.stringify(alvo.nome)} && P.ao.tab === 'out';`));
    await cl(`document.querySelector('#aoCancel') || document.querySelector('#aoOk')`); await wait(600);
    // aviso: só a tela em pé ligada, composição deitada
    const deitada = v.find(t => t.quer > 1).nome;
    await ev(`S.screens.find(s => s.name === ${JSON.stringify(deitada)}).enabled = false; P.render(); return 1;`); await wait(1500);
    confere('só o projetor em pé ligado e a composição deitada: aparece o aviso', await ev(`return !document.querySelector('#projSug').hidden && /esticada/.test(document.querySelector('#projSug').textContent);`));
    await cl(`[...document.querySelectorAll('#projSug button')].find(b => b.textContent.trim() === 'Deixar em pé')`); await wait(800);
    confere('"Deixar em pé" troca a composição para 1080×1920 e o aviso some', await ev(`return S.settings.w === 1080 && S.settings.h === 1920 && document.querySelector('#projSug').hidden;`));
    m = await mede(); confere('e os quadros ficam em pé', Math.abs(m.comp.ar - 9 / 16) < 0.03, txt(m));
    await key('z', 90, 2); await wait(800);
    confere('Ctrl+Z volta a composição para 1920×1080', await ev(`return S.settings.w === 1920 && S.settings.h === 1080;`), await ev(`return S.settings.w + '×' + S.settings.h;`));
    await ev(`S.screens.forEach(s => s.enabled = true); P.render(); return 1;`);
    await cl(`document.querySelector('#btnOut')`); await wait(800);
  }
} catch (e) { confere('a bateria rodou até o fim', false, e.message); }
console.log(`\n${ok} OK, ${ruim} falha(s)`); ws.close(); process.exit(ruim ? 1 : 0);
