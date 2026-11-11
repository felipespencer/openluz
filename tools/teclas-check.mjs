// Teclas que fazem o que não deviam e editores que descartam trabalho (plano 12-04, achados 30, 31, 32, 33, 69 e 70 da revisão
// geral), com mouse e teclado REAIS pelo CDP. Programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP).
// Uso: node tools/teclas-check.mjs   (limpa a casa no fim)
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

const n = await ev(`${P}.state.layers.length`), L1 = n - 1;
const noAr = () => ev(`${P}.state.layers[${L1}].on`);
const grade = () => ev(`${P}.state.layers.map(L => L.clips.filter(Boolean).map(c => c.name).join(',')).filter(Boolean).join(' / ')`);
const dialogo = () => ev(`[...document.querySelectorAll('.dlgOver')].map(d => d.textContent.slice(0, 70)).join(' | ')`);
const itens = () => ev(`${P}.state.screens[0].items.length`);
const telas0 = await ev(`${P}.M.serialize(${P}.state.screens)`);
await limpa(); await ev(`${P}.putPath(${L1},0,${JSON.stringify(CL + 'quadA.png')},'quadA.png')`); await wait(600);

// ---------- 69: Esc que fecha um menu não tira a camada do ar ----------
{
  await click(cell(L1, 0, 'th')); const a = await noAr();
  await click('#menubar .mb[data-i="1"]'); const aberto = await ev(`${P}.menubar.open`);
  await key('Escape');
  check('Esc com um menu da barra aberto: fecha o menu e o clipe continua no ar', a === 0 && aberto >= 0 && await noAr() === 0 && await ev(`${P}.menubar.open`) < 0, 'no ar ' + a + ' → ' + await noAr() + ', menu ' + await ev(`${P}.menubar.open`));
  const r = await pos(cell(L1, 0, 'th')); await clickXY(r.x, r.y, 'right'); const tinha = await ev(`document.querySelectorAll('.menuLayer .menu').length`);
  await key('Escape');
  check('Esc com o menu do botão direito aberto: fecha o menu e o clipe continua no ar', tinha > 0 && await noAr() === 0 && await ev(`document.querySelectorAll('.menuLayer .menu').length`) === 0, 'menus ' + tinha + ' → ' + await ev(`document.querySelectorAll('.menuLayer .menu').length`) + ', no ar ' + await noAr());
  await key('Escape');
  check('Esc sem menu nenhum continua tirando a camada do ar (o atalho de sempre)', await noAr() === -1, 'no ar ' + await noAr());
}

// ---------- 70: Enter que confirma um diálogo não dispara o clipe selecionado ----------
{
  await click(cell(L1, 0, 'nm')); const a = await noAr(), sel = await ev(`JSON.stringify(${P}.state.sel)`);
  await menu(0, 'Sobre'); const d = await dialogo();
  await key('Enter');
  check('Enter no diálogo Sobre: fecha o diálogo e o clipe selecionado continua fora do ar', a === -1 && !!d && !(await dialogo()) && await noAr() === -1, 'selecionado ' + sel + ', diálogo ' + JSON.stringify(d.slice(0, 20)) + ', no ar ' + a + ' → ' + await noAr());
  await key('Enter');
  check('Enter sem diálogo continua disparando a casa selecionada (o atalho de sempre)', await noAr() === 0, 'no ar ' + await noAr());
}

// ---------- 30: atalhos da grade ficam de fora com a Saída avançada aberta ----------
{
  await click(cell(L1, 0, 'th'));
  await ev(`${P}.ao.show(); 1`); await wait(600);
  const i0 = await itens(), g0 = await grade();
  await key('Delete');
  check('Delete na Saída avançada: apaga o slice e NÃO mexe na grade', await itens() === i0 - 1 && await grade() === g0 && await noAr() === 0, 'itens ' + i0 + ' → ' + await itens() + ', grade ' + g0 + ' → ' + JSON.stringify(await grade()) + ', no ar ' + await noAr());
  await key('n', 2); await wait(400);
  check('Ctrl+N na Saída avançada: não zera a composição nem pergunta', await grade() === g0 && !(await dialogo()), JSON.stringify(await grade()) + ' ' + await dialogo());
  if (await dialogo()) await key('Escape');

  // ---------- 33: Esc com mudanças pergunta ----------
  await key('Escape'); await wait(400);
  let d = await dialogo();
  check('Esc na Saída avançada com mudanças: pergunta antes de jogar a sessão fora', /Saída avançada/.test(d) && await ev(`${P}.ao.open`), d || 'sem pergunta; aberta=' + await ev(`${P}.ao.open`));
  if (d) { await click('.dlgOver .dfoot button', 'Cancelar'); await wait(400); }
  check('Cancelar: a Saída avançada continua aberta, com a mudança', await ev(`${P}.ao.open`) && await itens() === i0 - 1, 'aberta=' + await ev(`${P}.ao.open`) + ' itens ' + await itens());
  await key('Escape'); await wait(400); if (await dialogo()) { await click('.dlgOver .dfoot button', 'OK'); await wait(500); }
  check('OK: fecha cancelando e as telas voltam ao que eram', !(await ev(`${P}.ao.open`)) && await itens() === i0, 'aberta=' + await ev(`${P}.ao.open`) + ' itens ' + await itens());
  await ev(`${P}.ao.show(); 1`); await wait(500); await key('Escape'); await wait(400);
  check('Esc sem nenhuma mudança: fecha direto, sem pergunta', !(await ev(`${P}.ao.open`)) && !(await dialogo()), 'aberta=' + await ev(`${P}.ao.open`) + ' ' + await dialogo());
  if (await dialogo()) await key('Escape'); if (await ev(`${P}.ao.open`)) await ev(`${P}.ao.hide(true)`);
}

// ---------- 31: as teclas do Automape não vazam para a Saída avançada que está atrás ----------
{
  await ev(`${P}.ao.show(); 1`); await wait(500);
  const antes = await ev(`JSON.stringify({ itens: ${P}.state.screens[0].items.length, hist: ${P}.ao.hist.length, sel: !!(${P}.ao.sel && ${P}.ao.sel.item), x: ${P}.state.screens[0].items[0].warp.pts[0][0], modo: ${P}.ao.mode })`);
  await ev(`${P}.automape.open(); 1`); await wait(700);
  await key('Delete'); await key('z', 2); await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 }); await key('t'); await wait(300);
  const depois = await ev(`JSON.stringify({ itens: ${P}.state.screens[0].items.length, hist: ${P}.ao.hist.length, sel: !!(${P}.ao.sel && ${P}.ao.sel.item), x: ${P}.state.screens[0].items[0] ? ${P}.state.screens[0].items[0].warp.pts[0][0] : null, modo: ${P}.ao.mode })`);
  check('Delete, Ctrl+Z, seta e T com o Automape aberto por cima: a Saída avançada não muda', antes === depois && JSON.parse(antes).sel, antes + ' → ' + depois);
  await key('Escape'); await wait(500);
  check('Esc fecha só o Automape; a Saída avançada continua aberta', !(await ev(`!!${P}.automape.dlg`)) && await ev(`${P}.ao.open`), 'automape=' + await ev(`!!${P}.automape.dlg`) + ' ao=' + await ev(`${P}.ao.open`));
  await ev(`(() => { ${P}.automape.guardado = false; return 1; })()`);

  // ---------- 32: criar pelo Automape entra no desfazer e não zera a sessão ----------
  const x0 = await ev(`${P}.state.screens[0].items[0].in.x`);
  await ev(`(() => { const p = ${P}; p.ao.pushUndo(); const s = p.state.screens[0].items[0]; s.in.x += 30; p.M.touch(s); return 1; })()`);
  const h1 = await ev(`${P}.ao.hist.length`), i1 = await itens();
  await ev(`${P}.automape.c.create([{ type: 'mask', name: 'Máscara de teste', pts: [[100, 100], [600, 100], [600, 500]] }]); 1`); await wait(500);
  const h2 = await ev(`${P}.ao.hist.length`), i2 = await itens();
  check('criar pelo Automape com a Saída avançada aberta: entra no desfazer e não apaga o histórico da sessão', i2 === i1 + 1 && h2 === h1 + 1 && await ev(`${P}.ao.open`), 'itens ' + i1 + ' → ' + i2 + ', desfazer ' + h1 + ' → ' + h2);
  await clickXY(...Object.values(await pos('#aoList .row.screen .nm'))); await key('z', 2); await wait(400);
  check('Ctrl+Z tira o que o Automape criou e mantém o que foi feito antes', await itens() === i1 && await ev(`${P}.state.screens[0].items[0].in.x`) === x0 + 30, 'itens ' + await itens() + ', in.x ' + await ev(`${P}.state.screens[0].items[0].in.x`));
  await ev(`${P}.ao.hide(true); 1`); await wait(300);
  check('Cancelar volta ao começo da sessão (antes do Automape e da mudança)', await ev(`${P}.state.screens[0].items[0].in.x`) === x0 && await itens() === i1, 'in.x ' + await ev(`${P}.state.screens[0].items[0].in.x`) + ' itens ' + await itens());
}

// ---------- 33: Automape fechado no meio continua de onde parou ----------
{
  await ev(`(async () => { const a = ${P}.automape; a.guardado = false; a.open(); await a.loadSample('malha'); return 1; })()`); await wait(1500);
  const a = await ev(`JSON.stringify({ passo: ${P}.automape.step, foto: !!${P}.automape.S.photo, itens: ${P}.automape.S.items.length })`);
  await key('Escape'); await wait(500);
  const fechou = !(await ev(`!!${P}.automape.dlg`));
  await ev(`${P}.automape.open(); 1`); await wait(900);
  const b = await ev(`JSON.stringify({ passo: ${P}.automape.step, foto: !!${P}.automape.S.photo, itens: ${P}.automape.S.items.length })`);
  check('Automape fechado com Esc no meio do caminho: abrir de novo continua no mesmo passo, com a foto e as formas', fechou && JSON.parse(a).foto && a === b, a + ' → ' + b);
  await key('Escape'); await wait(400); await ev(`(() => { ${P}.automape.guardado = false; return 1; })()`);
  await ev(`${P}.automape.open(); 1`); await wait(600);
  check('aberto do zero (sem trabalho guardado) começa no passo 1 sem foto', await ev(`${P}.automape.step`) === 0 && !(await ev(`!!${P}.automape.S.photo`)), 'passo ' + await ev(`${P}.automape.step`));
  await key('Escape'); await wait(300);
}

// ---------- 33: Esc dentro de um campo do editor de texto só sai do campo ----------
{
  await limpa();
  await ev(`(async () => { const p = ${P}, m = await import('./cartaz.js'); const c = p.putText(${L1}, 0, 'TECLAS', false); c.text = m.cartazPadrao('TECLAS'); p.state.sel = { l: ${L1}, c: 0 }; p.panels.tab = 'clip'; p.render(); return 1; })()`); await wait(500);
  await click('#clipPan [data-k=editar]'); await wait(2800);
  const campo = await ev(`(() => { const e = [...document.querySelectorAll('.edtx input')].find(x => x.offsetParent !== null && x.type !== 'range' && x.type !== 'checkbox' && x.type !== 'color'); if (!e) return null; e.focus(); return e.type + (e.placeholder ? ' (' + e.placeholder + ')' : ''); })()`);
  if (!campo) check('o editor de texto tem um campo de texto para o teste', false, 'nenhum campo achado');
  else {
    await key('Escape');
    check('Esc com o foco num campo do editor: só sai do campo, o editor continua aberto', await ev(`document.querySelectorAll('.edtx').length`) === 1 && await ev(`document.activeElement.tagName`) !== 'INPUT', 'campo ' + campo + ', editores ' + await ev(`document.querySelectorAll('.edtx').length`) + ', foco ' + await ev(`document.activeElement.tagName`));
    await key('Escape'); await wait(400);
    check('Esc de novo, fora do campo, fecha o editor (como está escrito nele)', await ev(`document.querySelectorAll('.edtx').length`) === 0);
  }
  if (await ev(`document.querySelectorAll('.edtx').length`)) await key('Escape');
}

check('nenhuma exceção na página', erros.length === 0, erros.slice(0, 2).map(e => e.slice(0, 160)).join(' | '));
for (let i = 0; i < 3 && await dialogo(); i++) await key('Escape');
await ev(`(() => { const p = ${P}; if (p.ao.open) p.ao.hide(true); p.automape.guardado = false; p.setScreens(p.M.deserialize(${JSON.stringify(telas0)})); return 1; })()`);
await limpa();

const falhas = results.filter(r => !r.ok).length;
console.log('\n' + results.length + ' verificações, ' + falhas + ' falha(s) — ' + (falhas ? 'REPROVADO' : 'APROVADO'));
ws.close(); await wait(100);
process.exitCode = falhas ? 1 : 0;
