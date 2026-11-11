// Recorte, webcam e processos nativos que se recuperam (plano 12-05, achados 60, 61 e 62 da revisão geral). Mata de verdade os
// processos nativos do programa (taskkill) e confere que ele segue. Precisa do OBS instalado para a parte da webcam.
// Programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP). Uso: node tools/nativos-check.mjs   (limpa a casa no fim)
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

const { execFileSync } = await import('node:child_process');
const porta = +(process.env.PROJ_CDP || 9333);
const ps = (cmd) => execFileSync('powershell', ['-NoProfile', '-Command', cmd]).toString().trim();
const principal = +ps(`(Get-NetTCPConnection -LocalPort ${porta} -State Listen | Select-Object -First 1).OwningProcess`);
// processos nativos do programa: os utilityProcess (serviço de Node) filhos do processo principal
const nativos = () => { const o = ps(`@(Get-CimInstance Win32_Process -Filter "ParentProcessId=${principal}" | Where-Object { $_.CommandLine -like '*node.mojom.NodeService*' } | ForEach-Object { $_.ProcessId }) -join ','`); return o ? o.split(',').map(Number) : []; };
const mata = (pid) => { try { execFileSync('taskkill', ['/PID', String(pid), '/F'], { stdio: 'ignore' }); } catch { } };
const ate = async (expr, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await wait(300); } return false; };
const n = await ev(`${P}.state.layers.length`), L1 = n - 1;
const seg = (campos) => ev(`JSON.stringify((() => { const s = ${P}.seg; return { native: s.native, runs: s.runs, err: s.err || '' }; })())`).then(JSON.parse);

// ---------- recorte: vídeo no ar com Background Removal ----------
await limpa();
const antesSeg = nativos();
await ev(`${P}.putPath(${L1},0,${JSON.stringify(CL + 'andando.mp4')},'andando.mp4')`); await wait(1500);
await click(cell(L1, 0, 'th'));
const efeito = await ev(`(async () => { const p = ${P}, def = p.EFFECTS.find(e => e.id === 'backgroundremoval'); if (!def) return null; const m = await import('./effects.js'); p.state.layers[${L1}].clips[0].fx.push(m.mkFx(def.id)); p.render(); return def.name; })()`);
if (!efeito) check('o efeito Background Removal existe', false);
else {
  const subiu = await ate(`${P}.seg.native && ${P}.seg.runs > 20`, 25000);
  let s0 = await seg();
  check('com o processo nativo: as máscaras chegam', subiu, JSON.stringify(s0));
  // o processo do recorte sobe na abertura do programa (aquecimento): se já havia um só processo nativo, é ele
  const pidSeg = antesSeg.length === 1 ? antesSeg : nativos().filter(p => !antesSeg.includes(p));

  // ---------- 60: a reserva (WebGPU) sozinha entrega máscaras ----------
  await ev(`(() => { const s = ${P}.seg; s.native = false; s.runs = 0; return 1; })()`); await wait(8000);
  const sR = await seg();
  check('só com a reserva (WebGPU), em 8 s (contando a carga do modelo): as máscaras continuam chegando (10 ou mais; antes do conserto vinha 1)', sR.runs >= 10, sR.runs + ' máscara(s); ' + sR.err);
  await ev(`(() => { ${P}.seg.native = true; return 1; })()`); await wait(1500);

  // ---------- 61 e 62: o processo nativo morre e o recorte segue ----------
  if (pidSeg.length !== 1) check('achei o processo nativo do recorte para matar', false, 'novos processos: ' + pidSeg.join(','));
  else {
    mata(pidSeg[0]); await wait(2500);
    const a = await seg(); await wait(8000); const b = await seg();
    check('processo nativo morto: as máscaras continuam chegando (30 ou mais em 8 s)', b.runs - a.runs >= 30, (b.runs - a.runs) + ' máscara(s); nativo=' + b.native + '; ' + b.err);
    const voltou = await ate(`${P}.seg.native`, 15000), novo = nativos().filter(p => p !== pidSeg[0]);
    check('e o processo nativo é refeito sozinho', voltou && novo.length >= 1, 'nativo=' + voltou + ', processo novo: ' + novo.join(','));
  }
  await ev(`(() => { const c = ${P}.state.layers[${L1}].clips[0]; c.fx = c.fx.filter(f => f.id !== 'backgroundremoval'); ${P}.render(); return 1; })()`);
}
await limpa();

// ---------- 62: a webcam virtual não fica pendurada quando o processo dela morre ----------
{
  const antes = nativos();
  const r = await ev(`Promise.race([${P}.webcam.ligar(), new Promise(z => setTimeout(() => z({ ok: false, motivo: 'tempo' }), 15000))]).then(x => JSON.stringify(x))`).then(JSON.parse);
  if (!r.ok) console.log('info: a webcam virtual não ligou aqui (' + (r.motivo || '') + ' ' + (r.erro || '') + '); a parte da webcam fica de fora');
  else {
    await wait(1500);
    const pidCam = nativos().filter(p => !antes.includes(p));
    if (pidCam.length !== 1) check('achei o processo nativo da webcam para matar', false, 'novos processos: ' + pidCam.join(','));
    else {
      await ev(`document.getElementById('toast').textContent = ''; 1`);
      mata(pidCam[0]); await wait(2500);
      const on = await ev(`${P}.webcam.on`), aviso = await ev(`document.getElementById('toast').textContent`);
      check('processo da webcam morto: ela passa a desligada e o programa avisa', on === false && /webcam virtual parou/i.test(aviso), 'ligada=' + on + ' aviso=' + JSON.stringify(aviso));
      const q = await quadros(1500);
      check('a imagem do programa continua andando', q > 30, q + ' quadros em 1,5 s');
      const r2 = await ev(`Promise.race([${P}.webcam.ligar(), new Promise(z => setTimeout(() => z({ ok: false, motivo: 'pendurou' }), 15000))]).then(x => JSON.stringify(x))`).then(JSON.parse);
      await wait(1200);
      const env = await ev(`(async () => { const a = ${P}.webcam.enviados; await new Promise(z => setTimeout(z, 1000)); return ${P}.webcam.enviados - a; })()`);
      check('ligar de novo funciona (sobe outro processo e os quadros voltam a sair)', r2.ok === true && env > 10, JSON.stringify(r2) + ', ' + env + ' quadros em 1 s');
      const d = await ev(`Promise.race([${P}.webcam.desligar().then(() => 'desligou'), new Promise(z => setTimeout(() => z('pendurou'), 8000))])`);
      check('desligar responde', d === 'desligou' && await ev(`${P}.webcam.on`) === false, d);
    }
    if (await ev(`${P}.webcam.on`)) await ev(`Promise.race([${P}.webcam.desligar(), new Promise(z => setTimeout(z, 5000))]).then(() => 1)`);
  }
}

check('nenhuma exceção na página', erros.length === 0, erros.slice(0, 2).map(e => e.slice(0, 160)).join(' | '));
await limpa();

const falhas = results.filter(r => !r.ok).length;
console.log('\n' + results.length + ' verificações, ' + falhas + ' falha(s) — ' + (falhas ? 'REPROVADO' : 'APROVADO'));
ws.close(); await wait(100);
process.exitCode = falhas ? 1 : 0;
