// Salvar, abrir e desfazer sem perder composição (plano 12-03, achados 13, 14, 17, 18, 19, 20 e 50 da revisão geral), com mouse e
// teclado REAIS pelo CDP. Programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP) e, de preferência, recém-aberto e com
// PROJ_USERDATA numa pasta de teste: a bateria lê os arquivos em <dados>/composicoes e só cria e apaga os de nome salvar-check-*.
// Uso: node tools/salvar-check.mjs   (limpa a casa no fim)
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

const DADOS = process.env.PROJ_USERDATA || path.join(process.env.APPDATA || os.homedir(), 'OpenLuz');
const COMP = path.join(DADOS, 'composicoes');
const arq = (n) => path.join(COMP, n + '.json');
const existe = (n) => fs.existsSync(arq(n));
const clipesDe = (n) => { try { return JSON.parse(fs.readFileSync(arq(n), 'utf8')).layers.map(l => (l.clips || []).filter(Boolean).map(c => c.name).join(',')).filter(Boolean).join(' / '); } catch (e) { return 'erro: ' + e.message; } };
const faxina = () => { try { for (const f of fs.readdirSync(COMP)) if (/^_?salvar-check/.test(f)) fs.rmSync(path.join(COMP, f)); } catch { } };
const grade = () => ev(`${P}.state.layers.map(L => L.clips.filter(Boolean).map(c => c.name).join(',')).filter(Boolean).join(' / ')`);
const dialogo = () => ev(`[...document.querySelectorAll('.dlgOver')].map(d => d.textContent.slice(0, 80)).join(' | ')`);
const botao = async (txt) => { await click('.dlgOver .dfoot button', txt); await wait(500); };
const dbl = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); for (const n of [1, 2]) { await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: n }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: n }); } await wait(1500); };
const linha = (nome, parte) => ev(`(() => { const r = [...document.querySelectorAll('.flist .item.comp')].find(x => x.querySelector('b') && x.querySelector('b').textContent === ${JSON.stringify(nome)}); if (!r) return null; r.scrollIntoView({ block: 'nearest' }); const b = (${JSON.stringify(parte || '')} ? r.querySelector(${JSON.stringify(parte || 'b')}) : r.querySelector('b')).getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
const abaComps = async () => { await click('#browserTabs [data-tab]', 'Composições'); await wait(700); };
const n = await ev(`${P}.state.layers.length`), L1 = n - 1;
faxina();

// ---------- AC-4a: autosalvar (primeiro, com o programa como abriu) ----------
{
  const auto = arq('_automatica'), m0 = fs.existsSync(auto) ? fs.statSync(auto).mtimeMs : 0;
  await limpa(); await ev(`${P}.autosave()`); await wait(400);
  const m1 = fs.existsSync(auto) ? fs.statSync(auto).mtimeMs : 0;
  check('programa recém-aberto e sem nada mexido: o autosalvar não grava por cima da composição automática anterior', m1 === m0, m0 + ' → ' + m1);
  await ev(`(() => { ${P}.state.layers[0].opacity = 0.5; ${P}.render(); return 1; })()`); await ev(`${P}.autosave()`); await wait(500);
  const m2 = fs.existsSync(auto) ? fs.statSync(auto).mtimeMs : 0;
  check('grade vazia com algo mudado (opacidade de uma camada): o autosalvar grava', m2 > m1, m1 + ' → ' + m2);
  await ev(`(() => { ${P}.state.layers[0].opacity = 1; ${P}.render(); return 1; })()`);
}

// ---------- preparo das três composições: A (quadA), C (quadA) e B (barras) ----------
await limpa(); await ev(`${P}.putPath(${L1},0,${JSON.stringify(CL + 'quadA.png')},'quadA.png')`); await wait(500);
await ev(`${P}.comps.save('salvar-check-A')`); await ev(`${P}.comps.save('salvar-check-C')`);
await limpa(); await ev(`${P}.putPath(${L1},1,${JSON.stringify(CL + 'barras.png')},'barras.png')`); await wait(500);
await ev(`${P}.comps.save('salvar-check-B')`); await wait(300);

// ---------- AC-1: Ctrl+Z não atravessa a troca de composição ----------
{
  await abaComps();
  let r = await linha('salvar-check-A'); await dbl(r.x, r.y);
  if (await dialogo()) await botao('OK');
  const gA = await grade();
  r = await linha('salvar-check-B'); await dbl(r.x, r.y);
  const perguntou = await dialogo(); if (perguntou) await botao('OK');
  const gB = await grade();
  check('duplo clique abre a A e depois a B (sem mudança no meio, sem pergunta)', gA === 'quadA.png' && gB === 'barras.png' && !perguntou, gA + ' → ' + gB + (perguntou ? ' | perguntou: ' + perguntou : ''));
  await key('z', 2); await wait(1500);
  const g2 = await grade(), nome = await ev(`${P}.state.name`);
  check('Ctrl+Z depois de abrir a B: a grade continua sendo a da B', g2 === 'barras.png' && nome === 'salvar-check-B', g2 + ' com o nome ' + nome);
  await key('s', 2); await wait(900);
  check('Ctrl+S em seguida: o arquivo da B continua com o conteúdo da B', clipesDe('salvar-check-B') === 'barras.png', clipesDe('salvar-check-B'));
}

// ---------- AC-2: apagar e gravar por cima pedem confirmação ----------
{
  await abaComps();
  let r = await linha('salvar-check-A', 'button.mini'); await clickXY(r.x, r.y); await wait(500);
  let d = await dialogo();
  check('✕ da composição: pergunta antes de apagar e o arquivo continua lá', /Apagar/.test(d) && existe('salvar-check-A'), d || 'sem pergunta; arquivo existe=' + existe('salvar-check-A'));
  if (d) { await botao('Cancelar'); check('Cancelar: o arquivo continua', existe('salvar-check-A')); }
  await abaComps(); r = await linha('salvar-check-A', 'button.mini');
  if (r) { await clickXY(r.x, r.y); await wait(500); if (await dialogo()) await botao('OK'); await wait(900); }
  check('OK: o arquivo sai da pasta das composições', !existe('salvar-check-A'));
  // Salvar como por cima de outra (a C tem quadA; a atual é a B, com barras)
  await abaComps(); await click('.fbar button', 'Salvar como'); await wait(400);
  await key('a', 2); await send('Input.insertText', { text: 'salvar-check-C' }); await wait(200); await key('Enter'); await wait(600);
  d = await dialogo();
  check('Salvar como com o nome de outra composição: pergunta antes de gravar por cima', /Já existe/.test(d) && clipesDe('salvar-check-C') === 'quadA.png', (d || 'sem pergunta') + ' | C no disco: ' + clipesDe('salvar-check-C'));
  if (d) await botao('Cancelar');
  check('Cancelar: a outra composição fica como estava e a atual continua sendo a B', clipesDe('salvar-check-C') === 'quadA.png' && await ev(`${P}.state.name`) === 'salvar-check-B', clipesDe('salvar-check-C') + ' | nome ' + await ev(`${P}.state.name`));
  if (await ev(`!!document.querySelector('.fbar input')`)) await key('Escape');
}

// ---------- AC-3: Nova avisa quando há mudança não salva ----------
{
  await ev(`${P}.comps.open('salvar-check-B')`); await wait(1200);
  await ev(`${P}.putPath(${L1},3,${JSON.stringify(CL + 'quadB.png')},'quadB.png')`); await wait(500);
  await clickXY(6, await ev(`innerHeight - 4`)); await key('n', 2); await wait(600);
  let d = await dialogo();
  check('Ctrl+N com mudança não salva: pergunta antes de limpar', /não foram salvas/.test(d) && (await grade()).includes('quadB.png'), d || 'sem pergunta; grade: ' + await grade());
  if (d) { await botao('Cancelar'); check('Cancelar: a grade fica como estava', (await grade()) === 'barras.png,quadB.png', await grade()); }
  await key('n', 2); await wait(600); if (await dialogo()) await botao('OK'); await wait(600);
  check('OK: a composição nova vem', (await grade()) === '' && !(await ev(`${P}.state.name`)), JSON.stringify(await grade()));
  await key('n', 2); await wait(700);
  check('Ctrl+N sem nenhuma mudança: vem direto, sem pergunta', !(await dialogo()), await dialogo());
  if (await dialogo()) await botao('OK');
}

// ---------- AC-4b: nome começando com _ ----------
{
  await ev(`${P}.putPath(${L1},0,${JSON.stringify(CL + 'quadA.png')},'quadA.png')`); await wait(400);
  await ev(`${P}.comps.save('_salvar-check-U')`); await wait(400);
  check('nome começando com _: grava sem o _ e a composição aparece na lista', existe('salvar-check-U') && !existe('_salvar-check-U') && await ev(`${P}.state.name`) === 'salvar-check-U' && (await ev(`window.projDesktop.comps.list().then(l => l.some(c => c.name === 'salvar-check-U'))`)), 'arquivos: ' + fs.readdirSync(COMP).filter(f => /salvar-check-U/.test(f)).join(','));
}

// ---------- AC-5: gravação inteira e preferências mescladas ----------
{
  const sobras = fs.readdirSync(COMP).filter(f => f.endsWith('.tmp'));
  check('depois de salvar não sobra arquivo .tmp e os arquivos são JSON válido', sobras.length === 0 && !clipesDe('salvar-check-B').startsWith('erro') && !clipesDe('salvar-check-U').startsWith('erro'), sobras.join(','));
  const ok = await ev(`(async () => { const D = window.projDesktop, p = await D.prefs.get(); await D.prefs.set({ ...p, salvarCheck: 7 }); await ${P}.browser.savePrefs(); await new Promise(r => setTimeout(r, 400)); const q = await D.prefs.get(); const r = q.salvarCheck; delete q.salvarCheck; await D.prefs.set(q); return r; })()`);
  check('a aba Arquivos grava as preferências dela sem apagar as outras', ok === 7, 'salvarCheck=' + ok);
}

// ---------- AC-6: o Ctrl+Z que desfaz a Saída avançada avisa ----------
{
  await clickXY(6, await ev(`innerHeight - 4`));   // um gesto de verdade: o desfazer tira o retrato de antes
  const x0 = await ev(`${P}.state.screens[0].items[0].in.x`);
  await ev(`(() => { const p = ${P}; p.ao.show(); p.ao.pushUndo(); const s = p.state.screens[0].items[0]; s.in.x += 40; p.M.touch(s); p.ao.hide(false); return 1; })()`); await wait(500);
  await ev(`document.getElementById('toast').textContent = ''; 1`);
  await key('z', 2); await wait(900);
  const t = await ev(`document.getElementById('toast').textContent`), x1 = await ev(`${P}.state.screens[0].items[0].in.x`);
  check('Ctrl+Z que desfaz o que foi feito na Saída avançada avisa disso (e diz que Ctrl+Y refaz)', x1 === x0 && /Saída avançada/.test(t) && /Ctrl\+Y/.test(t), JSON.stringify(t) + ' in.x ' + x0 + ' → ' + x1);
}

// ---------- presets da Saída avançada: apagar pergunta ----------
{
  await ev(`(async () => { const p = ${P}; p.ao.show(); await p.ao.savePreset('salvar-check-P'); return 1; })()`); await wait(500);
  ev(`${P}.ao.deletePreset()`).catch(() => { }); await wait(600);
  const d = await dialogo(), tem = await ev(`window.projDesktop.presets.list().then(l => l.includes('salvar-check-P'))`);
  const porCima = await ev(`(() => { const dl = document.querySelector('.dlgOver .dfoot button'); if (!dl) return false; const b = dl.getBoundingClientRect(); const e = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return !!(e && e.closest('.dlgOver')); })()`);
  check('Apagar preset: pergunta (por cima do editor) e o preset continua lá', /Apagar o preset/.test(d) && tem && porCima, (d || 'sem pergunta') + ' | preset existe=' + tem + ' | pergunta por cima=' + porCima);
  if (d) { await botao('OK'); await wait(700); }
  check('OK: o preset sai da lista', !(await ev(`window.projDesktop.presets.list().then(l => l.includes('salvar-check-P'))`)));
  await ev(`(async () => { try { await window.projDesktop.presets.remove('salvar-check-P'); } catch { } if (${P}.ao.open) ${P}.ao.hide(true); return 1; })()`);
}

check('nenhuma exceção na página', erros.length === 0, erros.slice(0, 2).map(e => e.slice(0, 160)).join(' | '));
for (let i = 0; i < 3 && await dialogo(); i++) await key('Escape');
await ev(`(() => { const p = ${P}; p.comps.newComp(); return 1; })()`); await wait(400);
faxina(); await ev(`${P}.browser.render(); 1`);

const falhas = results.filter(r => !r.ok).length;
console.log('\n' + results.length + ' verificações, ' + falhas + ' falha(s) — ' + (falhas ? 'REPROVADO' : 'APROVADO'));
ws.close(); await wait(100);
process.exitCode = falhas ? 1 : 0;
