// Gravação e Preparar (plano 12-07, achados 6, 7 e 71 da revisão geral): gravar uma tela com a saída fechada dá imagem, a gravação
// vai para o disco enquanto acontece, e o Preparar entrega o clipe onde ele está, não onde estava. Grava numa pasta temporária.
// Programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP). Uso: node tools/gravar-check.mjs   (limpa a casa no fim)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLuz');
if (!page) { console.error('janela do OpenLuz não achada', pages.map(p => p.title)); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map(); const erros = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } else if (d.method === 'Runtime.exceptionThrown') erros.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const VK = { Escape: 27, Enter: 13, Delete: 46, Shift: 16 };
const key = async (k, mods = 0) => {
  const one = k.length === 1, code = one ? 'Key' + k.toUpperCase() : (k === 'Shift' ? 'ShiftLeft' : k), vk = one ? k.toUpperCase().charCodeAt(0) : VK[k];
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods }); await wait(300);
};
const clickXY = async (x, y, button = 'left', pausa = 350) => {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, buttons: button === 'left' ? 1 : 2, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, buttons: 0, clickCount: 1 }); await wait(pausa);
};
// centro do elemento: por seletor, ou o menor elemento visível de `sel` cujo texto começa com `txt`
const pos = (sel, txt) => ev(`(()=>{ const t=${JSON.stringify(txt || '')}; let e; if (t) { e=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(x=>x.offsetParent!==null && x.textContent.trim().startsWith(t)).sort((a,b)=>a.textContent.length-b.textContent.length)[0]; } else e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'nearest',inline:'nearest'}); const b=e.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; })()`);
const click = async (sel, txt, button) => { const r = await pos(sel, txt); if (!r) throw new Error('não achei ' + sel + ' ' + (txt || '')); await clickXY(r.x, r.y, button); return r; };
const menu = async (i, item) => { await click(`#menubar .mb[data-i="${i}"]`); await click('.menuLayer .menu .mi', item); };
const results = []; const check = (name, ok, info = '') => { results.push({ name, ok }); console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const P = 'window.projecionista';
const CL = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'compare/clips').replace(/\\/g, '/') + '/';
const LOG = path.join(process.env.PROJ_USERDATA || path.join(process.env.APPDATA || os.homedir(), 'OpenLuz'), 'openluz.log');
const logTxt = () => { try { return fs.readFileSync(LOG, 'utf8'); } catch { return ''; } };
const quadros = (ms) => ev(`(async()=>{ const a=${P}.frames(); await new Promise(r=>setTimeout(r,${ms})); return ${P}.frames()-a; })()`);
const limpa = () => ev(`(()=>{ const p=${P}; p.state.layers.forEach((L,i)=>{ for(let k=0;k<p.cols();k++) if(L.clips[k]) p.clearCell(i,k); p.eject(i); }); p.state.sel=null; p.state.pv=null; p.render(); return 1; })()`);
const cell = (l, k, part) => `#grid .cell[data-layer="${l}"][data-col="${k}"]` + (part ? ' .' + part : '');
const quais = process.argv.slice(2), quer = (n) => !quais.length || quais.includes(n);

// preparo: Shift de aquecimento e diálogos fechados com Esc de verdade (o de "Projetores" abre ao iniciar)
await key('Shift');
for (let i = 0; i < 3 && await ev(`!!document.querySelector('.dlgOver')`); i++) await key('Escape');
if (await ev(`${P}.ao.open`)) await ev(`${P}.ao.hide(true)`);

const { execFileSync, spawnSync } = await import('node:child_process');
const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const FF = path.join(AQUI, 'ffmpeg', 'ffmpeg.exe');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'openluz-gravar-'));
// quadros de vídeo de um arquivo, contados pelo ffmpeg
const quadrosDe = (arq) => { const r = spawnSync(FF, ['-v', 'error', '-stats', '-i', arq, '-map', '0:v:0', '-f', 'null', '-'], { encoding: 'utf8' }); const m = [...String(r.stderr).matchAll(/frame=\s*(\d+)/g)]; return m.length ? +m[m.length - 1][1] : 0; };
const arquivos = () => fs.readdirSync(TMP).filter(f => f.endsWith('.webm')).map(f => ({ f, tam: fs.statSync(path.join(TMP, f)).size }));
const n = await ev(`${P}.state.layers.length`), L1 = n - 1;
const dir0 = await ev(`${P}.recorder.c.dir || ''`), opts0 = await ev(`JSON.stringify(${P}.recorder.opts)`);
await ev(`(() => { const r = ${P}.recorder; r.c.dir = ${JSON.stringify(TMP)}; Object.assign(r.opts, { after: 'nothing', start: 'now', stop: 'manual', media: 'video', preset: 'low' }); return 1; })()`);
await limpa(); await ev(`${P}.putPath(${L1},0,${JSON.stringify(CL + 'andando.mp4')},'andando.mp4')`); await wait(1500);
await click(cell(L1, 0, 'th'));

// ---------- 7: a gravação vai para o disco enquanto acontece ----------
{
  await ev(`(() => { ${P}.recorder.opts.source = 'comp'; ${P}.recorder.start(); return 1; })()`); await wait(4500);
  const meio = arquivos();
  check('gravando a composição: depois de 4 s o arquivo já existe no disco e está crescendo', meio.length === 1 && meio[0].tam > 20000, JSON.stringify(meio));
  await ev(`${P}.recorder.stop(); 1`);
  let fim = []; for (let i = 0; i < 20; i++) { await wait(400); if (await ev(`${P}.recorder.state`) === 'idle' && await ev(`${P}.recorder.files.length`) > 0) { fim = arquivos(); break; } }
  const q = fim.length ? quadrosDe(path.join(TMP, fim[0].f)) : 0;
  check('ao parar, o arquivo fecha inteiro e toca (60 quadros ou mais em ~5 s)', fim.length === 1 && q >= 60, JSON.stringify(fim) + ' ' + q + ' quadros');
  for (const a of arquivos()) fs.rmSync(path.join(TMP, a.f));
}

// ---------- 6: gravar uma tela com a janela de saída fechada ----------
{
  await ev(`(() => { const p = ${P}; for (const w of p.outWins()) w.close(); return 1; })()`); await wait(500);
  const sid = await ev(`${P}.state.screens[0].id`);
  await ev(`(() => { const r = ${P}.recorder; r.opts.source = 'screen:${sid}'; r.start(); return 1; })()`); await wait(4500);
  await ev(`${P}.recorder.stop(); 1`);
  for (let i = 0; i < 20; i++) { await wait(400); if (await ev(`${P}.recorder.state`) === 'idle') break; }
  await wait(600);
  const fim = arquivos(), q = fim.length ? quadrosDe(path.join(TMP, fim[0].f)) : 0;
  check('gravando a Tela 1 com a saída fechada: o arquivo tem imagem andando (60 quadros ou mais em ~4,5 s)', fim.length === 1 && q >= 60, JSON.stringify(fim) + ' ' + q + ' quadros; saídas abertas: ' + await ev(`${P}.outWins().length`));
  for (const a of arquivos()) fs.rmSync(path.join(TMP, a.f));
  await ev(`(() => { ${P}.recorder.opts.source = 'comp'; return 1; })()`);
}

// ---------- a gravação que vira clipe tem duração e toca ----------
{
  await ev(`(() => { const r = ${P}.recorder; Object.assign(r.opts, { source: 'comp', after: 'clip', stop: 'after', stopSecs: 2 }); r.start(); return 1; })()`);
  let k = null; for (let i = 0; i < 30 && !k; i++) { await wait(500); k = await ev(`(() => { const L = ${P}.state.layers[${P}.state.selLayer || 0]; const j = L.clips.findIndex(c => c && /^gravacao-/.test(c.name)); return j < 0 ? null : { l: ${P}.state.layers.indexOf(L), c: j, dur: L.clips[j].dur }; })()`); }
  check('a gravação vira clipe com a duração certa (perto de 2 s; o arquivo não traz a duração escrita)', !!k && k.dur > 1.2 && k.dur < 3.5, JSON.stringify(k));
  if (k) {
    await click(cell(k.l, k.c, 'th')); await wait(400);
    const t = await ev(`(async () => { const c = ${P}.state.layers[${k.l}].clips[${k.c}]; const a = c.el.currentTime; await new Promise(r => setTimeout(r, 700)); return { a, b: c.el.currentTime, parado: c.el.paused }; })()`);
    check('e o clipe gravado toca quando vai para o ar', !t.parado && t.b !== t.a, JSON.stringify(t));
    await ev(`(() => { const p = ${P}; p.clearCell(${k.l}, ${k.c}); Object.assign(p.recorder.opts, { after: 'nothing', stop: 'manual' }); return 1; })()`);
  }
  for (const a of arquivos()) fs.rmSync(path.join(TMP, a.f));
}

// ---------- 71: o Preparar entrega o clipe onde ele está ----------
{
  await limpa();
  const video = path.join(TMP, 'preparar.mp4').replace(/\\/g, '/'); fs.copyFileSync(CL + 'longo90.mp4', video);
  await ev(`${P}.putPath(${L1},0,${JSON.stringify(video)},'preparar.mp4')`); await wait(1500);
  ev(`${P}.prepareClip(${L1}, 0)`).catch(() => { }); await wait(700);
  // com a conversão andando: o clipe vai para a casa 4 e outro clipe entra na casa 1
  await ev(`(async () => { const p = ${P}, L = p.state.layers[${L1}]; L.clips[3] = L.clips[0]; L.clips[0] = null; await p.putPath(${L1}, 0, ${JSON.stringify(CL + 'quadA.png')}, 'quadA.png'); p.render(); return 1; })()`);
  let pronto = false; for (let i = 0; i < 240 && !pronto; i++) { await wait(500); pronto = await ev(`${P}.state.layers[${L1}].clips.some(c => c && /\.proj\.mp4$/.test(c.name))`); if (pronto) await wait(1000); }   // espera a troca acontecer: o arquivo aparece no disco antes de a conversão acabar
  const linha = await ev(`${P}.state.layers[${L1}].clips.slice(0, 4).map(c => c ? c.name : '-').join(' | ')`);
  check('clipe movido durante o Preparar: o preparado entra na casa nova e a casa antiga fica com o que foi posto lá', /^quadA\.png \| - \| - \| preparar\.proj\.mp4$/.test(linha), linha);
  const toca = await ev(`(() => { const c = ${P}.state.layers[${L1}].clips[3]; return !!(c && c.dur > 1); })()`);
  check('e o clipe preparado está vivo (tem duração)', toca);
}

check('nenhuma exceção na página', erros.length === 0, erros.slice(0, 2).map(e => e.slice(0, 160)).join(' | '));
await limpa();
await ev(`(() => { const r = ${P}.recorder; r.c.dir = ${JSON.stringify(dir0)}; Object.assign(r.opts, ${opts0}); r.files = r.files.filter(f => !String(f.path).includes('openluz-gravar-')); return 1; })()`);
await wait(500); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { }

const falhas = results.filter(r => !r.ok).length;
console.log('\n' + results.length + ' verificações, ' + falhas + ' falha(s) — ' + (falhas ? 'REPROVADO' : 'APROVADO'));
ws.close(); await wait(100);
process.exitCode = falhas ? 1 : 0;
