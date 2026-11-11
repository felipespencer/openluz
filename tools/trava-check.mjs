// Trava e saída que cai (plano 12-02, achados 1, 34, 35, 51 e 80 da revisão geral), com mouse e teclado REAIS pelo CDP:
// um erro num quadro não congela o programa (Beat Snap + camada removida; exceção no desenho), duplicar/apagar/desfazer tela
// na Saída avançada não derruba nem deixa órfã a saída de outra tela, o X avisa quando há diálogo aberto, e o editor de texto
// não abre duas vezes. Programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP); o registro é lido de PROJ_USERDATA
// (ou %APPDATA%/OpenLuz). Uso: node tools/trava-check.mjs [laco] [telas] [fechar] [editor]   (sem nomes: tudo; limpa a casa no fim)
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
const bpm0 = await ev(`JSON.stringify({ bpm: ${P}.bpm.bpm, snap: ${P}.bpm.snap })`);

if (quer('laco')) {
  // ---------- AC-1a: Beat Snap + camada removida antes da batida ----------
  await limpa();
  const n0 = await ev(`${P}.state.layers.length`), L1 = n0 - 1;
  await ev(`(()=>{ const p=${P}; p.bpm.bpm=60; p.bpm.snap=16; return 1; })()`);
  await ev(`${P}.putPath(${L1},0,${JSON.stringify(CL + 'quadA.png')},'quadA.png')`); await wait(600);
  await ev(`new Promise(r=>{ const t=setInterval(()=>{ if((${P}.bpm.beat%16)<3){ clearInterval(t); r(1); } },100); })`);   // começo do ciclo: sobra tempo até a batida
  await click(cell(L1, 0, 'th'));
  check('Beat Snap: o clique na miniatura põe o disparo na fila', await ev(`${P}.pending()`) === 1);
  await menu(4, 'Remover');
  const n1 = await ev(`${P}.state.layers.length`);
  check('Camada › Remover tira a camada de baixo', n1 === n0 - 1, n0 + ' → ' + n1);
  check('a fila do Beat Snap esquece a camada removida', await ev(`${P}.pending()`) === 0, 'na fila: ' + await ev(`${P}.pending()`));
  const falta = await ev(`Math.max(0, 16 - (${P}.bpm.beat % 16))`); await wait(falta * 1000 + 1200);   // passa da batida
  const q1 = await quadros(2000);
  check('depois da batida a imagem continua andando (mais de 40 quadros em 2 s)', q1 > 40, q1 + ' quadros');
  check('nenhuma exceção na página', erros.length === 0, erros.slice(0, 2).map(e => e.slice(0, 160)).join(' | '));
  await ev(`(()=>{ const p=${P}; p.insertLayer(p.state.layers.length, 1); return 1; })()`);   // devolve a camada de baixo
  await ev(`(()=>{ const p=${P}; const o=${bpm0}; p.bpm.bpm=o.bpm; p.bpm.snap=o.snap; return 1; })()`);

  // ---------- AC-1b: exceção no desenho, uma vez e depois em todo quadro por 2 s ----------
  await limpa();
  const n = await ev(`${P}.state.layers.length`);
  await ev(`${P}.putPath(${n - 1},0,${JSON.stringify(CL + 'quadA.png')},'quadA.png')`); await wait(600);
  await click(cell(n - 1, 0, 'th'));
  const log0 = logTxt().length; erros.length = 0;
  await ev(`(()=>{ const e=${P}.engine; window.__travaRender=e.render; let vezes=1; window.__travaAte=0; e.render=function(){ if (vezes-- > 0 || performance.now() < window.__travaAte) throw new Error('erro de teste no quadro'); return window.__travaRender.apply(this, arguments); }; return 1; })()`);
  await wait(500);
  const qA = await quadros(1500);
  check('uma exceção num quadro não para o laço', qA > 30, qA + ' quadros em 1,5 s');
  const aviso = await ev(`(()=>{ const t=document.getElementById('toast'); return t ? t.textContent : ''; })()`);
  check('o erro aparece num aviso na tela', /erro/i.test(aviso), JSON.stringify(aviso.slice(0, 90)));
  await ev(`(()=>{ window.__travaAte = performance.now() + 2000; return 1; })()`); await wait(2600);
  const qB = await quadros(1500);
  check('depois de 2 s de erro em todo quadro, a imagem volta sozinha', qB > 30, qB + ' quadros em 1,5 s');
  await ev(`(()=>{ ${P}.engine.render = window.__travaRender; delete window.__travaRender; return 1; })()`);
  await wait(600);
  const linhas = logTxt().slice(log0).split('\n').filter(l => l.includes('erro de teste no quadro')).length;
  check('o registro guarda o erro sem uma linha por quadro (1 a 3 linhas para ~60 quadros com erro)', linhas >= 1 && linhas <= 3, linhas + ' linha(s) em ' + LOG);
  await limpa();
}

if (quer('telas')) {
  // ---------- AC-2: duas telas de tamanhos diferentes com a saída aberta ----------
  const telas0 = await ev(`${P}.M.serialize(${P}.state.screens)`);   // as telas voltam a ser estas no fim
  await ev(`(()=>{ const p=${P}, M=p.M; for (const w of p.outWins()) w.close();
    const mk=(nome,w,h)=>{ const s=M.mkScreen(nome,{device:'window',w,h}); s.items.push(M.mkSlice('Slice '+nome,{x:0,y:0,w,h},{x:0,y:0,w,h})); return s; };
    p.setScreens([mk('Tela A',1280,720), mk('Tela B',1024,768)]); return 1; })()`); await wait(500);
  await ev(`${P}.openOutputs(); 1`); await wait(1800);
  const estado = () => ev(`JSON.stringify((()=>{ const s=${P}.state.screens; return { n: s.length, nomes: s.map(x=>x.name).join(','), marcas: s.map(x=>x.win && !x.win.closed ? (x.win.__marcaTrava || '?') : '-').join(','), tam: s.map(x=>x.w+'x'+x.h).join(',') }; })())`).then(JSON.parse);
  await ev(`(()=>{ const s=${P}.state.screens; s[0].win.__marcaTrava='A'; s[1].win.__marcaTrava='B'; window.__travaB = s[1].win; return 1; })()`);
  let e = await estado();
  check('duas saídas abertas, cada uma com a sua marca', e.n === 2 && e.marcas === 'A,B', JSON.stringify(e));
  await ev(`${P}.ao.show(); 1`); await wait(700);
  const duplicarA = async () => { const r = await pos('#aoList .row.screen .nm', 'Tela A'); await clickXY(r.x, r.y, 'right'); await click('.menuLayer .mi', 'Duplicar'); await wait(400); };
  await duplicarA(); e = await estado();
  check('botão direito na tela › Duplicar: três telas, as duas saídas seguem as mesmas', e.n === 3 && e.marcas.replace(/-,?|,-/g, '') === 'A,B', JSON.stringify(e));
  await key('z', 2); await wait(900); e = await estado();
  check('Ctrl+Z depois de duplicar: as duas saídas continuam abertas e são as mesmas janelas', e.n === 2 && e.marcas === 'A,B', JSON.stringify(e));
  await duplicarA(); await key('Escape'); await wait(500); if (await ev(`!!document.querySelector('.dlgOver')`)) await key('Enter'); await wait(900); e = await estado();   // com mudanças, o Esc pergunta: Enter confirma
  check('Cancelar (Esc) depois de duplicar: as duas saídas continuam abertas e são as mesmas janelas', e.n === 2 && e.marcas === 'A,B' && !(await ev(`${P}.ao.open`)), JSON.stringify(e));
  await ev(`${P}.ao.show(); 1`); await wait(700);
  { const r = await ev(`(()=>{ const row=[...document.querySelectorAll('#aoList .row.screen')].find(x=>x.querySelector('.nm').textContent.trim()==='Tela B'); if(!row) return null; const b=row.querySelector('.x').getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; })()`); await clickXY(r.x, r.y); await wait(700); }
  e = await estado();
  check('✕ da tela na árvore: a tela sai e a janela de saída dela fecha na hora', e.n === 1 && e.marcas === 'A' && await ev(`window.__travaB.closed`), JSON.stringify(e) + ' janela B fechada=' + await ev(`window.__travaB.closed`));
  await key('z', 2); await wait(1800); e = await estado();
  check('Ctrl+Z traz a tela de volta e reabre a saída dela; a outra é a mesma janela', e.n === 2 && e.marcas.startsWith('A,') && !e.marcas.endsWith('-'), JSON.stringify(e));
  check('nenhuma exceção na página (telas)', erros.length === 0, erros.slice(0, 2).map(x => x.slice(0, 160)).join(' | '));
  await ev(`(()=>{ const p=${P}; if (p.ao.open) p.ao.hide(false); for (const w of p.outWins()) w.close(); try { if (window.__travaB && !window.__travaB.closed) window.__travaB.close(); } catch {} delete window.__travaB; return 1; })()`); await wait(400);
  await ev(`(()=>{ const p=${P}; p.setScreens(p.M.deserialize(${JSON.stringify(telas0)})); return 1; })()`); await wait(300);
}

// o X da janela, de verdade: WM_CLOSE na janela principal do processo que escuta a porta do CDP (o mesmo que clicar no X)
const apertaX = async () => {
  const { execFileSync } = await import('node:child_process');
  const porta = +(process.env.PROJ_CDP || 9333);
  execFileSync('powershell', ['-NoProfile', '-Command', `$p = (Get-NetTCPConnection -LocalPort ${porta} -State Listen | Select-Object -First 1).OwningProcess; [void](Get-Process -Id $p).CloseMainWindow()`], { stdio: 'ignore' });
};
const vivo = async () => (await (await fetch(base + '/json')).json()).some(p => p.title === 'OpenLuz');

if (quer('fechar')) {
  // ---------- AC-3a: X com um diálogo aberto avisa; sem diálogo, pergunta ----------
  const log0 = logTxt().length;
  await ev(`${P}.settingsDialog(); 1`); await wait(500);
  check('um diálogo está aberto (Configurações)', await ev(`document.querySelectorAll('.dlgOver').length`) === 1);
  await ev(`document.getElementById('toast').textContent = ''; 1`);
  await apertaX(); await wait(700);
  const aviso = await ev(`document.getElementById('toast').textContent`);
  check('X com diálogo aberto: aparece o aviso para fechar o diálogo antes', /Feche o diálogo/.test(aviso) && await vivo(), JSON.stringify(aviso));
  await key('Escape'); await wait(300);
  await apertaX(); await wait(700);
  const bts = await ev(`[...document.querySelectorAll('.dlgOver .dfoot button')].map(b => b.textContent).join('|')`);
  check('X sem diálogo: pergunta Salvar e fechar / Fechar sem salvar / Cancelar', bts === 'Cancelar|Fechar sem salvar|Salvar e fechar', bts);
  await apertaX(); await wait(500);
  check('X de novo com a pergunta na tela: continua uma pergunta só, sem aviso', await ev(`document.querySelectorAll('.dlgOver').length`) === 1);
  await click('.dlgOver .dfoot button', 'Cancelar'); await wait(2600);
  check('Cancelar fecha a pergunta; o programa continua e o processo principal não reclamou de falta de resposta', await ev(`document.querySelectorAll('.dlgOver').length`) === 0 && await vivo() && !logTxt().slice(log0).includes('não respondeu ao pedido de fechar'));
}

if (quais.includes('fechar-travado')) {
  // ---------- AC-3b (só a pedido: deixa um diálogo nativo na tela): janela sem responder ----------
  const log0 = logTxt().length;
  await ev(`setTimeout(() => { const t = performance.now(); while (performance.now() - t < 25000) { } }, 50); 1`); await wait(400);
  const t0 = Date.now(); await apertaX(); const tX = Date.now() - t0; await wait(3500);
  check('janela travada: em até 3 s o processo principal registra e pergunta por conta própria', logTxt().slice(log0).includes('a janela não respondeu ao pedido de fechar em 2 s'), 'o X levou ' + tX + ' ms para ser entregue');
}

if (quer('editor')) {
  // ---------- AC-5: dois cliques rápidos em ✎ Editar texto abrem um editor só ----------
  await limpa();
  const n = await ev(`${P}.state.layers.length`);
  // o clipe "Texto" de Fontes (cartaz, o que tem o editor), selecionado e com o painel Clipe à mostra
  await ev(`(async () => { const p = ${P}, m = await import('./cartaz.js'); const c = p.putText(${n - 1}, 0, 'TRAVA', false); c.text = m.cartazPadrao('TRAVA'); p.state.sel = { l: ${n - 1}, c: 0 }; p.panels.tab = 'clip'; p.render(); return 1; })()`); await wait(500);
  const b = await pos('#clipPan [data-k=editar]');
  if (!b) check('o painel do texto tem o botão ✎ Editar texto', false);
  else {
    await clickXY(b.x, b.y, 'left', 30); await clickXY(b.x, b.y, 'left', 30); await wait(3000);
    const qt = await ev(`document.querySelectorAll('.edtx').length`);
    check('dois cliques com 30 ms de intervalo abrem um editor só', qt === 1, qt + ' editor(es)');
    await key('Escape'); await wait(500);
    check('Esc fecha o editor e o programa fica acessível', await ev(`document.querySelectorAll('.edtx').length`) === 0 && !(await ev(`${P}.textEditor.open`)), await ev(`document.querySelectorAll('.edtx').length`) + ' editor(es) sobrando');
    // a corrida em si, sem depender da velocidade do mouse nem da lista de fontes: dois pedidos de abrir antes de o primeiro terminar
    // (com o mouse, nesta máquina, a lista de fontes responde rápido demais para o segundo clique entrar no meio)
    await ev(`(async () => { const p = ${P}, c = p.state.layers[${n - 1}].clips[0]; await Promise.all([p.textEditor.abrir(c), p.textEditor.abrir(c)]); return 1; })()`); await wait(600);
    const qt2 = await ev(`document.querySelectorAll('.edtx').length`);
    check('dois pedidos de abrir ao mesmo tempo dão um editor só', qt2 === 1, qt2 + ' editor(es)');
    await key('Escape'); await wait(500);
    const sobra = await ev(`document.querySelectorAll('.edtx').length`);
    check('e o Esc não deixa nenhum editor preso por cima do programa', sobra === 0, sobra + ' editor(es) sobrando');
    if (sobra) await ev(`(() => { document.querySelectorAll('.edtx').forEach(e => (e.closest('.dlgOver') || e).remove()); return 1; })()`);
  }
  await limpa();
}

const falhas = results.filter(r => !r.ok).length;
console.log('\n' + results.length + ' verificações, ' + falhas + ' falha(s) — ' + (falhas ? 'REPROVADO' : 'APROVADO'));
ws.close(); await wait(100);
process.exitCode = falhas ? 1 : 0;
