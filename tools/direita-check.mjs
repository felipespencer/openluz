// Coluna da direita (plano 12-22, maquete janelas-direita-mockup.html). O Felipe: "preciso poder mexer nos tamanhos dessas
// janelinhas" e "a janela Projetores na direita, eles não aparecem montados". Confere, com mouse REAL pelo CDP:
//   divisória Composição | Prévia, divisória par | Projetores, duplo clique, limites, tamanho guardado nas preferências;
//   vista Projetores montada na posição dos monitores do Windows (arranjo falso de três monitores e o arranjo real).
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/direita-check.mjs            (tudo; deixa as duas divisórias arrastadas e guardadas)
//      node tools/direita-check.mjs reaberto   (depois de fechar e reabrir com a mesma pasta: confere o tamanho guardado)
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state, W = (ms) => new Promise(r => setTimeout(r, ms)); ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const arrasta = async (x0, y0, x1, y1) => { await mouse('mouseMoved', x0, y0, { buttons: 0 }); await mouse('mousePressed', x0, y0); for (let i = 1; i <= 10; i++) await mouse('mouseMoved', x0 + (x1 - x0) * i / 10, y0 + (y1 - y0) * i / 10); await mouse('mouseReleased', x1, y1); await wait(400); };
const duplo = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); for (const c of [1, 2]) { await mouse('mousePressed', x, y, { clickCount: c }); await mouse('mouseReleased', x, y, { clickCount: c }); } await wait(400); };
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
const j = (o) => JSON.stringify(o);
const caixa = (sel) => ev(`const e = document.querySelector('${sel}'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };`);
const mede = async () => ({ comp: await caixa('#outScr'), prev: await caixa('#prevScr'), par: await caixa('#mons .par'), proj: await caixa('#projView'), mons: await caixa('#mons') });
const forma = (b) => b.w / b.h;
// fecha o assistente de Projetores e diálogos que abrem na pasta de dados nova
await ev(`for (let i = 0; i < 4; i++) { const d = document.querySelector('.dlgOver'); if (!d) break; const b = [...d.querySelectorAll('button')].find(x => /Pular|Cancelar|Fechar/.test(x.textContent)); if (b) b.click(); else d.remove(); await W(200); } return 1;`);
const AR = await ev(`return S.settings.w / S.settings.h;`);

if (process.argv[2] === 'reaberto') {
  const p = await ev(`const p = await window.projDesktop.prefs.get(); return p.sizes || {};`), m = await mede();
  confere('ao reabrir, a fração Composição | Prévia guardada vale', p.splitPar > 0.55 && m.comp.w > m.prev.w + 20, j({ guardado: p.splitPar, comp: Math.round(m.comp.w), prev: Math.round(m.prev.w) }));
  confere('ao reabrir, a altura do par guardada vale', p.splitProj > 0 && Math.abs(m.par.h - p.splitProj) <= 3, j({ guardado: p.splitProj, par: Math.round(m.par.h) }));
  console.log(`\n${ok} OK, ${ruim} falha(s)`); ws.close(); process.exit(ruim ? 1 : 0);
}

// ---- 1. divisórias existem
const sPar = await caixa('#splitPar'), sProj = await caixa('#splitProj');
confere('divisória entre Composição e Prévia existe e está entre as duas', !!sPar && sPar.h > 20 && (await caixa('#outScr')).x < sPar.x && sPar.x < (await caixa('#prevScr')).x, j(sPar));
confere('divisória entre o par e Projetores existe, embaixo do botão Saída avançada e em cima da vista', !!sProj && sProj.w > 100 && sProj.y > (await caixa('#btnAO')).y && sProj.y < (await caixa('#projView')).y, j(sProj));
if (!sPar || !sProj) { console.log(`\n${ok} OK, ${ruim} falha(s)`); process.exit(1); }

// ---- 2. Composição | Prévia
await ev(`const b = document.querySelector('#splitProj'); b.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); return 1;`);   // começa do padrão
const m0 = await mede();
await arrasta(sPar.cx, sPar.cy, sPar.cx + 60, sPar.cy);
const m1 = await mede();
confere('arrastar para a direita: a Composição cresce e a Prévia diminui', m1.comp.w > m0.comp.w + 25 && m1.prev.w < m0.prev.w - 25, j({ antes: [m0.comp.w, m0.prev.w].map(Math.round), depois: [m1.comp.w, m1.prev.w].map(Math.round) }));
confere('os dois quadros continuam na forma da composição', Math.abs(forma(m1.comp) - AR) < 0.05 && Math.abs(forma(m1.prev) - AR) < 0.05, j({ AR, comp: forma(m1.comp).toFixed(3), prev: forma(m1.prev).toFixed(3) }));
const s1 = await caixa('#splitPar');
await arrasta(s1.cx, s1.cy, s1.cx + 400, s1.cy);
const m2 = await mede();
confere('no limite, a Prévia não some (pelo menos 20% da largura)', m2.prev.w >= 0.18 * m2.par.w * 0.9 && m2.prev.w > 30, j({ prev: Math.round(m2.prev.w), par: Math.round(m2.par.w) }));
const s2 = await caixa('#splitPar'); await duplo(s2.cx, s2.cy);
const m3 = await mede();
confere('duplo clique volta a metade e metade', Math.abs(m3.comp.w - m3.prev.w) <= 2, j([m3.comp.w, m3.prev.w].map(Math.round)));

// ---- 3. par | Projetores
const p0 = await mede(), t0 = await caixa('#splitProj');
await arrasta(t0.cx, t0.cy, t0.cx, t0.cy + 100);
const p1 = await mede();
confere('arrastar para baixo: o par fica ~100 px mais alto e a divisória anda com o mouse', Math.abs((p1.par.h - p0.par.h) - 100) <= 8, j({ antes: Math.round(p0.par.h), depois: Math.round(p1.par.h) }));
confere('a vista Projetores diminui o mesmo tanto', Math.abs((p0.proj.h - p1.proj.h) - 100) <= 10, j({ antes: Math.round(p0.proj.h), depois: Math.round(p1.proj.h) }));
confere('os quadros seguem a forma da composição com o par mais alto', Math.abs(forma(p1.comp) - AR) < 0.05 && Math.abs(forma(p1.prev) - AR) < 0.05, j({ comp: forma(p1.comp).toFixed(3) }));
confere('os quadros cabem no par (não vazam para baixo)', p1.comp.y + p1.comp.h <= p1.par.y + p1.par.h + 1 && p1.prev.y + p1.prev.h <= p1.par.y + p1.par.h + 1, j({ comp: Math.round(p1.comp.y + p1.comp.h), par: Math.round(p1.par.y + p1.par.h) }));
const tela1 = await ev(`const c = document.querySelector('#projView .tela canvas'); return c ? c.width + 'x' + c.height : '';`);
const t1 = await caixa('#splitProj'); await arrasta(t1.cx, t1.cy, t1.cx, t1.cy + 2000);
const p2 = await mede();
confere('no limite de baixo, a vista Projetores fica com pelo menos ~140 px', p2.proj.h >= 140, j({ proj: Math.round(p2.proj.h) }));
const tela2 = await ev(`const c = document.querySelector('#projView .tela canvas'); return c ? c.width + 'x' + c.height : '';`);
confere('as miniaturas dos projetores se refazem no tamanho novo', tela1 && tela2 && tela1 !== tela2, j({ tela1, tela2 }));
const t2 = await caixa('#splitProj'); await arrasta(t2.cx, t2.cy, t2.cx, t2.cy - 2000);
const p3 = await mede();
confere('no limite de cima, o par fica com pelo menos 90 px', p3.par.h >= 88, j({ par: Math.round(p3.par.h) }));
confere('com o par baixo, os quadros encolhem para caber na altura (e seguem a forma)', p3.comp.h < p0.comp.h - 5 && p3.comp.y + p3.comp.h <= p3.par.y + p3.par.h + 1 && Math.abs(forma(p3.comp) - AR) < 0.05, j({ padrao: Math.round(p0.comp.h), baixo: Math.round(p3.comp.h) }));
const t3 = await caixa('#splitProj'); await duplo(t3.cx, t3.cy);
const p4 = await mede();
confere('duplo clique volta ao padrão', Math.abs(p4.par.h - p0.par.h) <= 2 && !(await ev(`return document.getElementById('mons').classList.contains('fixo');`)), j({ padrao: Math.round(p0.par.h), agora: Math.round(p4.par.h) }));

// ---- 4. junto com a largura da coluna (divisória que já existe)
const t4 = await caixa('#splitProj'); await arrasta(t4.cx, t4.cy, t4.cx, t4.cy + 80);
const q0 = await mede(), sm = await caixa('#splitMon');
await arrasta(sm.cx, sm.cy, sm.cx - 120, sm.cy);
const q1 = await mede();
confere('alargar a coluna com a divisória antiga continua funcionando com as novas', q1.mons.w > q0.mons.w + 100 && Math.abs(q1.par.h - q0.par.h) <= 2, j({ coluna: [q0.mons.w, q1.mons.w].map(Math.round), par: [q0.par.h, q1.par.h].map(Math.round) }));
const sm2 = await caixa('#splitMon'); await duplo(sm2.cx, sm2.cy);

// ---- 5. vista Projetores montada: arranjo falso com os três monitores do Felipe
const telasAntes = await ev(`return S.screens.length;`);
const arr = await ev(`
  P.setDisplaysTeste([{ id: 'd1', label: 'DISPLAY1', x: 0, y: 0, w: 1920, h: 1080 }, { id: 'd2', label: 'DISPLAY2', x: 0, y: -1080, w: 1920, h: 1080 }, { id: 'd3', label: 'DISPLAY3', x: 1920, y: -420, w: 1080, h: 1920 }]);
  P.setScreens([P.M.mkScreen('Fachada', { device: 'd2', w: 1920, h: 1080 }), P.M.mkScreen('Coluna', { device: 'd3', w: 1080, h: 1920 })]);
  P.renderProjView(); await W(300);
  const v = document.querySelector('#projView').getBoundingClientRect(), q = (e) => { const r = e.getBoundingClientRect(); return { t: (e.querySelector('b') || e).textContent, x: r.left - v.left, y: r.top - v.top, w: r.width, h: r.height }; };
  return { telas: [...document.querySelectorAll('#projView .tela')].map(q), ctl: [...document.querySelectorAll('#projView .ctlmon')].map(q), vw: v.width, vh: v.height };`);
const T = Object.fromEntries(arr.telas.map(t => [t.t, t])), C1 = arr.ctl.find(c => c.t === 'DISPLAY1');
confere('duas telas e o monitor de controle tracejado', arr.telas.length === 2 && arr.ctl.length === 1 && !!C1, j({ telas: arr.telas.map(t => t.t), ctl: arr.ctl.map(c => c.t) }));
if (T.Fachada && T.Coluna && C1) {
  confere('DISPLAY2 (Fachada) em cima do DISPLAY1, na mesma coluna', T.Fachada.y + T.Fachada.h <= C1.y + 1 && Math.abs(T.Fachada.x - C1.x) <= 3, j({ fachada: T.Fachada, d1: C1 }));
  confere('DISPLAY3 (Coluna) à direita do DISPLAY1 e em pé', T.Coluna.x >= C1.x + C1.w - 1 && T.Coluna.h > T.Coluna.w * 1.5, j({ coluna: T.Coluna }));
  confere('mesma escala para todos (largura do 2 = largura do 1; altura do 3 = 16/9 da do 1)', Math.abs(T.Fachada.w - C1.w) <= 3 && Math.abs(T.Coluna.h / C1.h - 1920 / 1080) < 0.06, j({ f: T.Fachada.w, d1: C1.w, razao: (T.Coluna.h / C1.h).toFixed(3) }));
  confere('o arranjo cabe na vista', [...arr.telas, ...arr.ctl].every(t => t.x >= 0 && t.y >= 0 && t.x + t.w <= arr.vw + 1 && t.y + t.h <= arr.vh + 1), j({ vw: arr.vw, vh: arr.vh }));
}
// tela sem monitor vai para a fila de baixo
const fila = await ev(`
  P.setScreens([P.M.mkScreen('Fachada', { device: 'd2', w: 1920, h: 1080 }), P.M.mkScreen('Solta', { device: 'auto', w: 1280, h: 720 })]); P.renderProjView(); await W(300);
  const v = document.querySelector('#projView').getBoundingClientRect(), r = (t) => { const e = [...document.querySelectorAll('#projView .tela')].find(x => x.querySelector('b').textContent === t); const b = e.getBoundingClientRect(); return { y: b.top - v.top, h: b.height, onde: e.querySelector('span').textContent }; };
  return { f: r('Fachada'), s: r('Solta'), ctl: [...document.querySelectorAll('#projView .ctlmon')].map(e => e.textContent), fila: !!document.querySelector('#projView .fila') };`);
confere('tela em "automático" fica na fila embaixo do arranjo, marcada como automático', fila.s.y > fila.f.y + fila.f.h && fila.s.onde === 'automático' && fila.fila, j(fila));
confere('monitores sem tela (1 e 3) ficam tracejados', fila.ctl.length === 2, j(fila.ctl));
// clique numa miniatura abre a Saída avançada nela (mouse real)
const mini = await ev(`const e = [...document.querySelectorAll('#projView .tela')].find(x => x.querySelector('b').textContent === 'Fachada'), r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };`);
await mouse('mouseMoved', mini.x, mini.y, { buttons: 0 }); await mouse('mousePressed', mini.x, mini.y); await mouse('mouseReleased', mini.x, mini.y); await wait(600);
const abriu = await ev(`const r = { open: P.ao.open, tela: P.ao.curScreen() && P.ao.curScreen().name }; if (P.ao.open) P.ao.hide(false); await W(300); return r;`);
confere('clique na miniatura abre a Saída avançada naquela tela', abriu.open && abriu.tela === 'Fachada', j(abriu));
// arranjo real desta máquina
const real = await ev(`const d = await window.projDesktop.displays(); P.setDisplaysTeste(d); P.setScreens(d.filter(x => !x.primary).map((x, i) => P.M.mkScreen('Projetor ' + (i + 1), { device: x.id, w: x.w, h: x.h }))); P.renderProjView(); await W(300);
  return { mons: d.map(x => x.label + ' ' + x.x + ',' + x.y + ' ' + x.w + 'x' + x.h), telas: document.querySelectorAll('#projView .tela').length, ctl: document.querySelectorAll('#projView .ctlmon').length };`);
confere('com os monitores reais desta máquina: uma miniatura por projetor e o de controle tracejado', real.telas === real.mons.length - 1 && real.ctl === 1, j(real));

// ---- 6. deixa as duas divisórias arrastadas para o teste "reaberto"
const u1 = await caixa('#splitPar'); await arrasta(u1.cx, u1.cy, u1.cx + 50, u1.cy);
const u2 = await caixa('#splitProj'); await arrasta(u2.cx, u2.cy, u2.cx, u2.cy + 60);
await wait(600);
const guard = await ev(`const p = await window.projDesktop.prefs.get(); return p.sizes || {};`);
confere('as duas divisórias ficam guardadas nas preferências', guard.splitPar > 0.5 && guard.splitProj > 0, j(guard));
console.log(`\n${ok} OK, ${ruim} falha(s)`); ws.close(); process.exit(ruim ? 1 : 0);
