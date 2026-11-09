// Lote 3 (Grid Cloner, SearchLight, WarpSpeed, LUT) no programa aberto com --remote-debugging-port=9333: cada controle deslizante movido com mouse REAL
// pelo CDP tem de chegar ao motor e mudar a imagem (SearchLight anda sozinho, nele só o valor é conferido; Atraso com imagem parada não muda nada);
// listas (Ordem, LUT 3D) pelo próprio <select>; um .cube do disco (gerado aqui, nenhum de terceiros) passa pelo leitor de arquivo;
// a composição salva com os valores e a LUT; qps de cada efeito.
// Uso: node tools/compare/lote3-check.mjs <imagem>
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
const pages = await (await fetch('http://127.0.0.1:9333/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const S = ms => new Promise(r => setTimeout(r, ms));
const mouse = (type, x, y, buttons = 1) => send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !buttons ? 'none' : 'left', buttons, clickCount: 1 });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const P = 'window.projecionista', abs = path.resolve(process.argv[2]).replace(/\\/g, '/');
await ev(`(async () => { const p = ${P}, L = p.state.layers[0]; document.querySelectorAll('.dlgOver').forEach(d => d.remove()); if (!L.clips[1] || L.clips[1].path !== ${JSON.stringify(abs)}) await p.putPath(0, 1, ${JSON.stringify(abs)}, ${JSON.stringify(path.basename(abs))}); p.trigger(0, 1); return 1; })()`);
const snap = `(() => { const c = document.createElement('canvas'); c.width = 96; c.height = 54; const x = c.getContext('2d'); x.drawImage(${P}.engine.canvas, 0, 0, 96, 54); return Array.from(x.getImageData(0, 0, 96, 54).data); })()`;
const dif = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
// a linha do controle dentro do efeito (o rótulo Giro também existe no Transform da camada): o data-help da linha começa com "Efeito · Rótulo|"
const dono = (fx, n) => `(x => { const h = x.closest('[data-help]'); return !${JSON.stringify(fx)} || (h && h.dataset.help.startsWith(${JSON.stringify(fx + ' · ' + n + '|')})); })`;
const rect = (n, fx = '') => ev(`(async () => { const e = [...document.querySelectorAll('*')].filter(x => x.children.length === 0 && x.textContent.trim() === ${JSON.stringify(n)} && x.parentElement.querySelector('.bar')).filter(${dono(fx, n)})[0]; if (!e) return null; e.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 80)); const b = e.parentElement.querySelector('.bar'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
// escolhe um item de uma lista do painel pelo <select> da linha com esse rótulo
const pick = (n, v, fx = '') => ev(`(() => { const e = [...document.querySelectorAll('*')].filter(x => x.children.length === 0 && x.textContent.trim() === ${JSON.stringify(n)} && x.parentElement.querySelector('select')).filter(${dono(fx, n)})[0]; if (!e) return false; const s = e.parentElement.querySelector('select'); if (![...s.options].some(o => o.value === ${JSON.stringify(v)})) return 'sem opção'; s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
const setFx = (nome, extra = {}) => ev(`(() => { const p = ${P}, L = p.state.layers[0], def = p.EFFECTS.find(e => e.name === ${JSON.stringify(nome)}), params = {}; for (const q of def.params) params[q.key] = q.def; Object.assign(params, ${JSON.stringify(extra)}); L.fx = [{ id: def.id, params, bypass: false, anim: {} }]; p.state.selLayer = 0; p.panels.tab = 'layer'; p.render(); return 1; })()`);
const qps = async () => { const f0 = await ev(`${P}.frames()`), t0 = Date.now(); await S(3000); return (await ev(`${P}.frames()`) - f0) / ((Date.now() - t0) / 1000); };
let falhas = 0;
// fixo: valores dados antes de mexer (SearchLight parado para a imagem só mudar pelo controle); sóValor: controles que, com imagem parada, não mudam a imagem
const lote = [
  ['Grid Cloner', {}, ['delay']],
  ['SearchLight', { freq: 0 }, ['freq']],
  ['WarpSpeed', {}, []],
];
for (const [nome, fixo, soValor] of lote) {
  await setFx(nome, fixo); await S(500);
  const ctl = await ev(`${P}.EFFECTS.find(e => e.name === ${JSON.stringify(nome)}).params.filter(q => !q.opts && !q.color).map(q => ({ key: q.key, label: q.label, min: q.min, max: q.max, def: q.def, step: q.step }))`);
  const linha = [];
  for (const c of ctl) {
    const r = await rect(c.label, nome); if (!r) { console.log(' ', nome, c.label, 'controle não achado'); falhas++; continue; }
    const base = fixo[c.key] ?? c.def, faixa = (c.max - c.min) || 1;
    const alvo = (base - c.min) / faixa > 0.5 ? 0.15 : 0.85, y = r.y + r.h / 2, x0 = r.x + r.w / 2, x1 = r.x + r.w * alvo;
    const a = await ev(snap);
    await mouse('mouseMoved', x0, y, 0); await mouse('mousePressed', x0, y); for (let i = 1; i <= 6; i++) { await mouse('mouseMoved', x0 + (x1 - x0) * i / 6, y); await S(10); } await mouse('mouseReleased', x1, y, 0);
    await S(300);
    const got = await ev(`${P}.state.layers[0].fx[0].params[${JSON.stringify(c.key)}]`), b = await ev(snap), d = dif(a, b);
    const quer = Math.round((c.min + alvo * faixa) / c.step) * c.step;
    const okValor = Math.abs(got - quer) <= Math.max(0.08 * faixa, c.step), okImg = soValor.includes(c.key) || d > 0.02;
    if (!okValor || !okImg) falhas++;
    linha.push(`${c.label}=${+(+got).toFixed(2)} Δ${d.toFixed(2)}${okValor ? '' : ' VALOR!'}${okImg ? '' : ' IMAGEM IGUAL!'}`);
    await ev(`(() => { ${P}.state.layers[0].fx[0].params[${JSON.stringify(c.key)}] = ${base}; ${P}.render(); return 1; })()`); await S(150);
  }
  console.log(nome + ':', linha.join(' | '));
  if (nome === 'Grid Cloner') {
    // Ordem pela lista; Atraso ligado com 4×4 cria a fila de quadros (a imagem não pode ficar preta)
    await ev(`(() => { const f = ${P}.state.layers[0].fx[0]; f.params.iscale = 60; f.params.rshift = 0; ${P}.render(); return 1; })()`); await S(400);
    const a = await ev(snap), ok = await pick('Ordem', '0', 'Grid Cloner'); await S(400);
    const ord = await ev(`${P}.state.layers[0].fx[0].params.order`), dOrd = dif(a, await ev(snap));
    await ev(`(() => { const f = ${P}.state.layers[0].fx[0]; f.params.delay = 1; ${P}.render(); return 1; })()`); await S(800);
    const sD = await ev(snap), luz = sD.reduce((s, v, i) => i % 4 === 3 ? s : s + v, 0) / (sD.length * 0.75);
    const okO = ok === true && ord === 0, okD = luz > 5;
    if (!okO || !okD) falhas++;
    console.log(`  Ordem→Centro ${okO ? 'ok' : 'FALHOU'} Δ${dOrd.toFixed(2)} | Atraso ligado: brilho médio ${luz.toFixed(1)} ${okD ? 'ok' : 'PRETO!'}`);
  }
  console.log('  qps ' + (await qps()).toFixed(1));
}
// LUT: as do OpenLuz pela lista; um .cube do disco (negativo, 2×2×2, escrito agora) pelo leitor de arquivo;
// a borda preta em volta da imagem é fora da camada, o efeito não pega nela: só conta o que não é preto puro
await setFx('LUT'); await S(400);
const a0 = await ev(snap); const okSel = await pick('LUT 3D', 'builtin:Quente', 'LUT'); await S(500);
const lutV = await ev(`${P}.state.layers[0].fx[0].lut`), dQ = dif(a0, await ev(snap));
const okQ = okSel === true && lutV === 'builtin:Quente' && dQ > 0.5; if (!okQ) falhas++;
console.log(`LUT: Quente pela lista ${okQ ? 'ok' : 'FALHOU'} Δ${dQ.toFixed(2)}`);
const cube = path.join(os.tmpdir(), 'openluz-lote3-negativo.cube');
fs.writeFileSync(cube, 'TITLE "negativo"\nLUT_3D_SIZE 2\n' + [0, 1].flatMap(b => [0, 1].flatMap(g => [0, 1].map(r => `${1 - r} ${1 - g} ${1 - b}`))).join('\n') + '\n');
const cubeAbs = cube.replace(/\\/g, '/');
await ev(`(() => { const f = ${P}.state.layers[0].fx[0]; f.lut = ${JSON.stringify(cubeAbs)}; ${P}.render(); return 1; })()`); await S(900);
const neg = await ev(snap); let soma = 0, n = 0; for (let i = 0; i < neg.length; i += 4) if (a0[i] + a0[i + 1] + a0[i + 2] > 0) for (let k = 0; k < 3; k++) { soma += Math.abs(neg[i + k] - (255 - a0[i + k])); n++; }
const errNeg = soma / n, errMsg = await ev(`${P}.state.layers[0].fx[0]._lutErr || ''`);
const okN = errNeg < 3 && !errMsg; if (!okN) falhas++;
console.log(`LUT: .cube do disco ${okN ? 'ok' : 'FALHOU'} (erro médio contra o negativo ${errNeg.toFixed(2)}${errMsg ? ', ' + errMsg : ''}); na lista: ${await ev(`[...document.querySelectorAll('select')].some(s => [...s.options].some(o => o.textContent.includes('(arquivo)')))`)}`);
console.log('  qps ' + (await qps()).toFixed(1));
// salvar: valores fora do padrão e a LUT atravessam o JSON da composição
const salvo = await ev(`(async () => { const { serializeComposition } = await import('./composition.js'); const p = ${P}, L = p.state.layers[0]; const mk = (n, v, x = {}) => { const def = p.EFFECTS.find(e => e.name === n), params = {}; for (const q of def.params) params[q.key] = q.def; Object.assign(params, v); return { id: def.id, params, bypass: false, anim: {}, ...x }; }; L.fx = [mk('Grid Cloner', { cols: 7, order: 0 }), mk('SearchLight', { size: 0.37 }), mk('WarpSpeed', { fade: 0.83 }), mk('LUT', {}, { lut: 'builtin:Sépia' })]; p.render(); await new Promise(r => setTimeout(r, 400)); const s = serializeComposition(p.state, p.laser, p.state.cols || 9); return { grid: s.includes('"cols":7'), luz: s.includes('"size":0.37'), warp: s.includes('"fade":0.83'), lut: s.includes('builtin:Sépia') }; })()`).catch(e => ({ erro: e.message }));
console.log('salvar:', JSON.stringify(salvo)); if (!salvo.grid || !salvo.luz || !salvo.warp || !salvo.lut) falhas++;
// tira o efeito e o clipe de prova: as outras baterias contam com a saída preta
await ev(`(() => { const p = ${P}; p.state.layers[0].fx = []; p.eject(0); p.clearCell(0, 1); p.render(); return 1; })()`);
try { fs.unlinkSync(cube); } catch {}
console.log(falhas ? 'FALHAS: ' + falhas : 'APROVADO'); ws.close(); process.exit(0);
