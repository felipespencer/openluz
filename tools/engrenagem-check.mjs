// Confere a engrenagem do parâmetro (a que aparece ao passar o mouse na linha, como no Resolume) com mouse de verdade pelo CDP:
// escondida sem o mouse, aparece com ele, abre o menu, e cada modo (Timeline, BPM Sync, FFT, Presets, Basic) faz o que diz.
// Programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP). Uso: node tools/engrenagem-check.mjs
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLuz') || pages.find(p => p.type === 'page' && p.title.includes('OpenLuz'));
if (!page) { console.error('janela do OpenLuz não achada'); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
const click = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(250); };
let falhas = 0; const check = (name, ok, info = '') => { if (!ok) falhas++; console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const P = 'window.projecionista';
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await ev(`document.querySelectorAll('.dlgOver').forEach(d => d.remove()); 1`);
const src = await ev(`(() => { const p = ${P}; const ids = Object.keys(p.state ? {} : {}); return 1; })()`);
await ev(`(async () => { const p = ${P}; await p.putSource(0, 0, 'lines'); await new Promise(r => setTimeout(r, 600)); p.state.sel = { l: 0, c: 0 }; p.render(); p.panels.render(); return 1; })()`);
await wait(400);
const clip = `${P}.state.layers[0].clips[0]`;
const linha = () => ev(`(() => { const g = document.querySelector('#clipPan .prow.hasGear .pgear'); if (!g) return null; const row = g.closest('.prow'); row.scrollIntoView({ block: 'center' }); const r = row.getBoundingClientRect(), q = g.getBoundingClientRect(); return { row: [r.x + r.width / 2, r.y + r.height / 2], gear: [q.x + q.width / 2, q.y + q.height / 2], op: getComputedStyle(g).opacity, nome: row.firstChild.textContent.trim() }; })()`);
let L = await linha(); check('a linha de parâmetro tem engrenagem', !!L, JSON.stringify(L));
if (!L) { console.log('\n1 FALHA(S)'); process.exit(1); }
await mouse('mouseMoved', 5, 5); await wait(200); L = await linha(); check('sem o mouse na linha a engrenagem fica escondida', L.op === '0', 'opacidade ' + L.op);
await mouse('mouseMoved', L.row[0], L.row[1]); await wait(250); L = await linha(); check('com o mouse na linha ela aparece', L.op === '1', 'opacidade ' + L.op);
const key = await ev(`(() => { const c = ${clip}; return Object.keys(c.params)[0]; })()`);
const abre = async () => { const q = await linha(); await mouse('mouseMoved', q.row[0], q.row[1]); await click(q.gear[0], q.gear[1]); return ev(`[...document.querySelectorAll('.menuLayer .menu .mi .lb')].map(e => e.textContent)`); };
const escolhe = async (txt, sub) => {
  const itens = await abre(); if (!itens.includes(txt)) throw new Error('menu sem ' + txt + ': ' + itens.join(', '));
  let q = await ev(`(() => { const e = [...document.querySelectorAll('.menuLayer .menu .mi')].find(x => x.querySelector('.lb').textContent === ${JSON.stringify(txt)}); const r = e.getBoundingClientRect(); return [r.x + 20, r.y + r.height / 2]; })()`);
  if (!sub) { await click(q[0], q[1]); return; }
  await mouse('mouseMoved', q[0], q[1]); await wait(300);
  q = await ev(`(() => { const e = [...document.querySelectorAll('.menuLayer .menu .mi')].filter(x => x.querySelector('.lb').textContent === ${JSON.stringify(sub)}).pop(); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + 20, r.y + r.height / 2]; })()`);
  if (!q) throw new Error('submenu sem ' + sub); await click(q[0], q[1]);
};
const an = () => ev(`(() => { const c = ${clip}; return (c.panim && c.panim[${JSON.stringify(key)}]) || null; })()`);
const itens = await abre(); check('o menu abre com o nome do parâmetro e os modos', itens[0] === L.nome && ['Basic', 'Timeline', 'BPM Sync', 'Composition FFT', 'External FFT (microfone)', 'Presets'].every(t => itens.includes(t)), itens.join(' | '));
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await wait(200);
await ev(`(() => { const l = document.querySelector('.menuLayer'); if (l) ${P}.menubar.close(); return 1; })()`);
await escolhe('Timeline'); let a = await an(); check('Timeline: ciclo em segundos (5 s)', a && a.secs === 5 && a.shape !== 'fft', JSON.stringify(a));
check('aparece a linha · Segundos', await ev(`[...document.querySelectorAll('#clipPan .prow')].some(r => r.firstChild.textContent.includes('Segundos'))`));
{ const v0 = await ev(`${P}.C ? 1 : 0`); const s1 = await ev(`(async () => { const B = ${P}.bpm, a = ${clip}.panim[${JSON.stringify(key)}]; const m = await import('./beat.js'); const x = m.animValue(a, B); await new Promise(r => setTimeout(r, 700)); return [x, m.animValue(a, B)]; })()`); check('Timeline: o valor anda sozinho com o tempo', s1[0] !== s1[1], JSON.stringify(s1)); }
await escolhe('BPM Sync'); a = await an(); check('BPM Sync: ciclo em batidas, sem segundos', a && !a.secs && a.beats === 4, JSON.stringify(a));
await escolhe('Presets', 'On Off'); a = await an(); check('Presets › On Off troca a forma', a && a.shape === 'onoff' && !a.secs, JSON.stringify(a));
await escolhe('Composition FFT'); a = await an(); check('Composition FFT: som dos clipes, espectro inteiro com ganho, como medido no Resolume', a && a.shape === 'fft' && a.src === 'comp' && a.f0 === 0 && a.f1 === 1 && a.gain > 1, JSON.stringify(a));
await escolhe('External FFT (microfone)'); a = await an(); await wait(1500);
{ const m = await ev(`(() => { const A = ${P}.audio; return { ligado: !!A.micAnalyser, erro: A.err, fonteGeral: A.settings.source, nivel: A.micLevels.all }; })()`);
  check('External FFT: a animação ouve o microfone e o programa liga a entrada (ou avisa que não há)', a && a.src === 'mic' && (m.ligado || !!m.erro), JSON.stringify(m));
  check('ligar o microfone numa engrenagem não muda a fonte geral da aba Composição', m.fonteGeral === 'comp', m.fonteGeral);
  console.log('      microfone:', JSON.stringify(m)); }
L = await linha(); await mouse('mouseMoved', 5, 5); await wait(200); check('animado: a engrenagem fica acesa mesmo sem o mouse', (await linha()).op === '1');
await escolhe('Basic'); a = await an(); check('Basic tira a animação', !a, JSON.stringify(a));
// FFT de verdade: um vídeo com som que pulsa (meio segundo forte, meio fraco) no ar; a Opacidade em FFT tem de subir e descer com ele
{
  const { execFileSync } = await import('node:child_process'); const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const d = path.join(os.tmpdir(), 'ol-fft'); fs.mkdirSync(d, { recursive: true }); const f = path.join(d, 'pulso.mp4');
  if (!fs.existsSync(f)) execFileSync(path.join(import.meta.dirname, 'ffmpeg', 'ffmpeg.exe'), ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=25:duration=10', '-f', 'lavfi', '-i', "anoisesrc=d=10:c=pink:a=0.8,volume='if(lt(mod(t,1),0.5),1,0.02)':eval=frame", '-pix_fmt', 'yuv420p', '-shortest', f]);
  await ev(`(async () => { const p = ${P}; await p.putPath(1, 0, ${JSON.stringify(f.split(String.fromCharCode(92)).join('/'))}, 'pulso.mp4'); await new Promise(r => setTimeout(r, 1500)); p.trigger(1, 0); await new Promise(r => setTimeout(r, 1500)); const c = p.state.layers[1].clips[0]; c.panim = { '@opacity': { shape: 'fft', src: 'comp', band: 'all', gain: 1.4, min: 0, max: 100 } }; return 1; })()`);
  let mn = 9, mx = -1; for (let k = 0; k < 30; k++) { const o = await ev(`${P}.state.layers[1].clips[0].opacity`); mn = Math.min(mn, o); mx = Math.max(mx, o); await wait(80); }
  check('FFT com som de verdade: a Opacidade sobe e desce com o som', mx - mn > 0.25, 'de ' + mn.toFixed(2) + ' a ' + mx.toFixed(2));
  // os modos do painel de FFT (medidos no Resolume): ◀ inverte, + empurra o valor para a frente dando a volta; L escolhe os graves
  { const c1 = `${P}.state.layers[1].clips[0]`, faixa = async (n = 25) => { let mn = 9, mx = -1, sobe = 0, ant = null; for (let k = 0; k < n; k++) { const o = await ev(`${c1}.opacity`); mn = Math.min(mn, o); mx = Math.max(mx, o); if (ant != null && o > ant + 1e-4) sobe++; ant = o; await wait(80); } return { mn, mx, sobe }; };
    await ev(`(() => { const a = ${c1}.panim['@opacity']; a.fmode = 'inc'; delete a.band; a.f0 = 0; a.f1 = 1; return 1; })()`); const inc = await faixa(40); check('modo +: o som empurra o valor pela faixa inteira, sempre para a frente', inc.mx - inc.mn > 0.7 && inc.sobe > 20, JSON.stringify(inc));
    await ev(`(() => { ${c1}.panim['@opacity'].fmode = 'fwd'; ${P}.state.sel = { l: 1, c: 0 }; ${P}.state.selLayer = 1; ${P}.render(); ${P}.panels.render(); return 1; })()`); await wait(300);
    const pb = async (k) => { const q = await ev(`(() => { const b = document.querySelector('#clipPan .abox .ib[data-k="${k}"], #clipPan .abox .almh button[data-k="${k}"]'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`); if (!q) return false; await click(q[0], q[1]); return true; };
    check('o painel tem ◀ ▶ − + e a setinha do espectro', await ev(`['f◀', 'f▶', 'f−', 'f+', 'f▾'].every(k => !!document.querySelector('#clipPan .abox .ib[data-k="' + k + '"]'))`));
    await pb('f◀'); check('◀ pelo botão vira o modo ao contrário', (await ev(`${c1}.panim['@opacity'].fmode`)) === 'back');
    await pb('f▾'); check('a setinha abre o espectro com L M H', await ev(`!!document.querySelector('#clipPan .abox .aspec canvas') && document.querySelectorAll('#clipPan .abox .almh button').length === 3`));
    await pb('fL'); const fx = await ev(`(() => { const a = ${c1}.panim['@opacity']; return [a.f0, a.f1]; })()`); check('L escolhe os graves (0 a 36,5 % do espectro)', fx[0] === 0 && Math.abs(fx[1] - 0.365) < 1e-6, JSON.stringify(fx));
    const pintou = await ev(`(() => { const cv = document.querySelector('#clipPan .abox .aspec canvas'); const d = cv.getContext('2d').getImageData(0, 0, 256, 28).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; })()`); check('o espectro é desenhado com o som tocando', pintou > 200, pintou + ' pixels'); }
  await ev(`(() => { const p = ${P}; p.clearCell(1, 0); p.state.selLayer = 0; p.state.sel = { l: 0, c: 0 }; p.render(); p.panels.render(); return 1; })()`); await wait(300);
}
// valores "de casa": Opacidade do clipe, Posição X do Transform e Master da camada também têm engrenagem e andam sozinhos
{
  const gearDe = (pan, nome) => ev(`(() => { const row = [...document.querySelectorAll('${pan} .prow.hasGear')].find(r => r.firstChild.textContent.trim() === ${JSON.stringify(nome)}); if (!row) return null; row.scrollIntoView({ block: 'center' }); const r = row.getBoundingClientRect(), q = row.querySelector('.pgear').getBoundingClientRect(); return { row: [r.x + r.width / 2, r.y + r.height / 2], gear: [q.x + q.width / 2, q.y + q.height / 2] }; })()`);
  const modo = async (pan, nome, txt) => { const q = await gearDe(pan, nome); if (!q) return false; await mouse('mouseMoved', q.row[0], q.row[1]); await click(q.gear[0], q.gear[1]); const m = await ev(`(() => { const e = [...document.querySelectorAll('.menuLayer .menu .mi')].find(x => x.querySelector('.lb').textContent === ${JSON.stringify(txt)}); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + 20, r.y + r.height / 2]; })()`); if (!m) return false; await click(m[0], m[1]); return true; };
  const anda = async (expr) => { const a = await ev(expr); await wait(450); const b = await ev(expr); await wait(450); const c = await ev(expr); return [a, b, c]; };
  let v0; let ok = await modo('#clipPan', 'Opacidade', 'BPM Sync'); let v = await anda(`${clip}.opacity`); check('Opacidade do clipe em BPM Sync anda sozinha', ok && new Set(v).size > 1, JSON.stringify(v));
  // mini-transporte: barra com mínimo, máximo e o valor de agora; ‖ segura; arrastar o triângulo muda o mínimo; o retrato do desfazer não muda a cada quadro
  { const m = await ev(`(() => { const b = document.querySelector('#clipPan .abox'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const h0 = b.querySelector('.ahead').style.left; return { tem: true, botoes: [...b.querySelectorAll('.actl .ib')].map(x => x.dataset.k), forma: !!b.querySelector('select[data-k="a-forma"]'), h0 }; })()`); await wait(400);
    const h1 = await ev(`document.querySelector('#clipPan .abox .ahead').style.left`);
    check('mini-transporte: barra, ◀ ‖ ▶ e a forma', m && m.botoes.join('') === 'a◀a‖a▶' && m.forma, JSON.stringify(m)); check('o ▼ da barra acompanha o valor', m && m.h0 !== h1, (m && m.h0) + ' → ' + h1);
    const s1 = await ev(`${P}.serialize()`); await wait(350); const s2 = await ev(`${P}.serialize()`); check('animado, o retrato do desfazer e do salvar não muda de um quadro para outro', s1 === s2);
    check('o que se salva é a base (100 %), não o valor do quadro', JSON.parse(s1).layers[0].clips[0].opacity === 1, String(JSON.parse(s1).layers[0].clips[0].opacity));
    const pb = await ev(`(() => { const b = document.querySelector('#clipPan .abox .ib[data-k="a‖"]').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`); await click(pb[0], pb[1]); v = await anda(`${clip}.opacity`); check('‖ segura o valor', new Set(v).size === 1, JSON.stringify(v));
    const pf = await ev(`(() => { const b = document.querySelector('#clipPan .abox .ib[data-k="a▶"]').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`); await click(pf[0], pf[1]); v = await anda(`${clip}.opacity`); check('▶ solta de novo', new Set(v).size > 1, JSON.stringify(v));
    const q = await ev(`(() => { const b = document.querySelector('#clipPan .abox .abar'); const r = b.getBoundingClientRect(), h = b.querySelector('.hnd.in').getBoundingClientRect(); return { h: [h.x + h.width / 2, h.y + h.height / 2], x50: r.x + 6 + (r.width - 12) * 0.5 }; })()`);
    await mouse('mouseMoved', q.h[0], q.h[1]); await mouse('mousePressed', q.h[0], q.h[1]); for (let k = 1; k <= 5; k++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: q.h[0] + (q.x50 - q.h[0]) * k / 5, y: q.h[1], button: 'left', buttons: 1 }); await mouse('mouseReleased', q.x50, q.h[1]); await wait(250);
    const mn = await ev(`${clip}.panim['@opacity'].min`); check('arrastar o triângulo da esquerda leva o mínimo para 50 %', Math.abs(mn - 50) <= 2, String(mn)); }
  ok = await modo('#clipPan', 'Opacidade', 'Basic'); v0 = await ev(`${clip}.opacity`); check('Basic devolve a Opacidade à base (100 %)', v0 === 1, String(v0)); v = await anda(`${clip}.opacity`); check('Basic devolve a Opacidade parada', ok && new Set(v).size === 1, JSON.stringify(v));
  ok = await modo('#clipPan', 'Posição X', 'Timeline'); v = await anda(`${clip}.transform.x`); check('Posição X do clipe em Timeline anda sozinha', ok && new Set(v).size > 1, JSON.stringify(v));
  ok = await modo('#clipPan', 'Posição X', 'Basic'); await ev(`${clip}.transform.x = 0`);
  await ev(`(() => { const p = ${P}; p.panels.tab = 'layer'; p.state.selLayer = 0; p.panels.render(); return 1; })()`); await wait(250);
  ok = await modo('#leftPan', 'Master', 'BPM Sync'); v = await anda(`${P}.state.layers[0].opacity`); check('Master da camada em BPM Sync anda sozinho', ok && new Set(v).size > 1, JSON.stringify(v));
  ok = await modo('#leftPan', 'Master', 'Basic'); await ev(`(() => { const p = ${P}; p.state.layers[0].opacity = 1; delete p.state.layers[0].panim; p.panels.tab = 'comp'; p.render(); p.panels.render(); return 1; })()`);
}
await ev(`(() => { ${P}.clearCell(0, 0); ${P}.render(); return 1; })()`);
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo certo'); ws.close(); process.exit(falhas ? 1 : 0);
