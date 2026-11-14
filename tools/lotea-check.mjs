// Lote A do pente fino (plano 12-09): o que derruba um show. Uma verificação por achado; reprovava antes do conserto.
// Programa aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/lotea-check.mjs            (24, 22, 21, 75, 5, 16)
//      node tools/lotea-check.mjs --queda    (27: põe clipe no ar, abre a saída, manda o programa reabrir como depois de uma queda
//                                             e confere que voltou; 49: o registro diz que o laser foi desligado antes de sair)
// As verificações mexem no estado pelo que o programa expõe (window.projecionista); o que é de mouse e teclado está nas outras baterias.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORTA = process.env.PROJ_CDP || 9333, base = 'http://127.0.0.1:' + PORTA;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
async function liga() {
  for (let i = 0; i < 80; i++) { try { const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz'); if (pg) { const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); return ws; } } catch { } await wait(500); }
  throw new Error('janela do OpenLuz não achada');
}
let ws = await liga(), id = 0; const waits = new Map();
const escuta = () => { ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } }; }; escuta();
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state, W = ms => new Promise(r => setTimeout(r, ms)); ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const res = []; const check = (nome, ok, info = '') => { res.push(ok); console.log((ok ? 'OK    ' : 'FALHA ') + nome + (info ? '  — ' + info : '')); };
const fecha = async () => { for (let i = 0; i < 4; i++) await ev(`const d = document.querySelector('.dlgOver'); if (d) { const b = [...d.querySelectorAll('button')].find(x => /Pular|Cancelar|Fechar/.test(x.textContent)); if (b) b.click(); else d.remove(); await W(200); } return 1;`); };
const VIDEO = path.join(os.tmpdir(), 'proj-test').replace(/\\/g, '/');

if (process.argv.includes('--queda')) {
  await fecha();
  await ev(`await P.reset(); P.putSource(0, 2, 'sinewave'); P.putSource(1, 1, 'checkered'); P.trigger(0, 2); P.trigger(1, 1); await W(300); S.screens[0].device = 'window'; P.ao.openOutputs ? P.ao.openOutputs() : document.querySelector('#btnOut').click(); await W(1500); await P.autosave(); return 1;`);
  const antes = await ev(`return { on: S.layers.map(L => L.on), saidas: S.screens.filter(sc => sc.win && !sc.win.closed).length };`);
  console.log('antes da queda:', JSON.stringify(antes));
  const reg = path.join(os.tmpdir(), 'openluz-bancada-' + PORTA, 'openluz.log'); const tam = fs.existsSync(reg) ? fs.statSync(reg).size : 0;
  ev(`window.projDesktop.log.relaunch(); return 1;`).catch(() => { });   // o mesmo caminho da queda da placa que não volta: grava o motivo, relança e sai
  await wait(6000); ws = await liga(); escuta(); await wait(7000);
  const depois = await ev(`return { on: S.layers.map(L => L.on), saidas: S.screens.filter(sc => sc.win && !sc.win.closed).length, aviso: document.querySelector('#toast').textContent.slice(0, 60) };`);
  console.log('depois de reabrir:', JSON.stringify(depois));
  check('27: os clipes que estavam no ar voltam ao ar depois de reabrir sozinho', JSON.stringify(depois.on) === JSON.stringify(antes.on) && antes.on.some(x => x >= 0));
  check('27: as saídas que estavam abertas reabrem sozinhas', antes.saidas > 0 && depois.saidas === antes.saidas, `${antes.saidas} → ${depois.saidas}`);
  const novo = fs.existsSync(reg) ? fs.readFileSync(reg).subarray(tam).toString('utf8') : '';   // em bytes: o registro tem acento
  check('49: o laser é desligado antes de o programa sair para reabrir', /laser desligado antes de sair/.test(novo), reg);
  await ev(`for (const sc of S.screens) if (sc.win && !sc.win.closed) sc.win.close(); return 1;`);
  console.log('ATENÇÃO: o programa que está aberto agora é o que reabriu sozinho (outro processo): feche com taskkill no electron.exe de desenvolvimento, o abre-dev fecha não o conhece');
} else {
  await fecha();
  // 24: "Ignorar disparo de coluna" da camada
  await ev(`await P.reset(); P.putSource(0, 0, 'sinewave'); P.putSource(1, 0, 'checkered'); S.layers[0].ignoreColumn = true; return 1;`);
  check('24: "Ignorar disparo de coluna" da camada vai para o arquivo', await ev(`return JSON.parse(P.serialize()).layers[0].ignoreColumn === true;`));
  await ev(`const j = P.serialize(); await P.load(j, 'lotea'); return 1;`);
  check('24: e volta ao abrir', await ev(`return S.layers[0].ignoreColumn === true;`));
  await ev(`P.markUndo(); S.layers[1].bypass = true; P.markUndo(); await P.undo(); return 1;`);
  check('24: e sobrevive a um Ctrl+Z', await ev(`return S.layers[0].ignoreColumn === true;`));
  // 22: slice com Fonte = camada
  await ev(`await P.reset(); P.putSource(0, 0, 'sinewave'); P.putSource(2, 0, 'checkered'); const sl = S.screens[0].items.find(i => i.type === 'slice'); sl.source = S.layers[2].id; return 1;`);
  const fonte = `(() => { const sl = S.screens[0].items.find(i => i.type === 'slice'); return S.layers.findIndex(L => L.id === sl.source); })()`;
  await ev(`const j = P.serialize(); await P.load(j, 'lotea'); return 1;`);
  check('22: slice com Fonte = Camada 3 aponta para a Camada 3 depois de abrir', await ev(`return ${fonte};`) === 2, 'aponta para a camada de índice ' + await ev(`return ${fonte};`));
  await ev(`P.markUndo(); S.layers[1].bypass = true; P.markUndo(); await P.undo(); return 1;`);
  check('22: e depois de um Ctrl+Z na grade', await ev(`return ${fonte};`) === 2, 'índice ' + await ev(`return ${fonte};`));
  // 21: clipes de laser em três quadros
  const lz = await ev(`await P.reset(); const lz = P.laser; while (lz.frames.length < 3) { if (lz.addFrame) lz.addFrame(); else if (lz.newFrame) lz.newFrame(); else break; } lz.frames.forEach((f, i) => f.name = 'Q' + i); for (let i = 0; i < Math.min(3, lz.frames.length); i++) P.putLaserClip(0, i, lz.frames[i]); return { n: lz.frames.length, ids: lz.frames.map(f => f.id) };`);
  const quadros = `S.layers[0].clips.slice(0, 3).map(c => c ? (P.laser.frames.find(f => f.id === c.laserId) || {}).name || 'ÓRFÃO' : 'vazia')`;
  if (lz.n < 3) check('21: (não consegui criar três quadros de laser para o teste)', false, JSON.stringify(lz));
  else { await ev(`const j = P.serialize(); await P.load(j, 'lotea'); return 1;`);
    const q = await ev(`return ${quadros};`); check('21: cada clipe de laser reabre no mesmo quadro', JSON.stringify(q) === '["Q0","Q1","Q2"]', JSON.stringify(q) + ' (ids dos quadros antes: ' + lz.ids.join(',') + ')'); }
  // 75: remover coluna
  await ev(`await P.reset(); const n = P.cols(); P.putSource(0, n - 1, 'sinewave'); P.putSource(0, n - 2, 'checkered'); P.trigger(0, n - 1); await W(200); P.removeColumn(n - 1); P.removeColumn(n - 1); return 1;`);
  const c75 = await ev(`return { cols: P.cols(), linha: S.layers[0].clips.length, noAr: S.layers[0].on, resta: S.layers[0].clips.filter(Boolean).map(c => c.name) };`);
  check('75: Remover duas vezes com o mesmo número de coluna não deixa clipe sem casa', c75.linha === c75.cols && c75.resta.length === 1, JSON.stringify(c75));
  // 5: o clipe que sai na transição continua andando
  const v = fs.existsSync(VIDEO) ? fs.readdirSync(VIDEO).find(f => f.endsWith('.webm')) : null;
  if (!v) check('5: (sem vídeo de teste em ' + VIDEO + ')', false);
  else { const t = await ev(`await P.reset(); await P.putPath(0, 0, ${JSON.stringify(VIDEO + '/' + v)}, 'v.webm'); P.putSource(0, 1, 'checkered'); S.layers[0].transition = 3; P.trigger(0, 0); await W(900); const c = S.layers[0].clips[0]; const pos = () => c.el ? c.el.currentTime : (c.tr.pos ?? c.tr.t ?? -1); P.trigger(0, 1); const a = []; for (let i = 0; i < 6; i++) { a.push(+pos().toFixed(2)); await W(300); } return { a, dur: c.dur, prev: !!S.layers[0].prev }; `);
    check('5: na transição de 3 s o vídeo que sai continua andando', new Set(t.a).size >= 5, JSON.stringify(t)); }
  // 16: clipe cujo arquivo não existe continua na casa e no arquivo
  await ev(`await P.reset(); P.putSource(0, 0, 'sinewave'); return 1;`);
  const j16 = await ev(`const d = JSON.parse(P.serialize()); d.layers[0].clips[1] = { kind: 'video', name: 'sumiu.mp4', path: 'C:/nao/existe/sumiu.mp4', fit: 'fit', speed: 1, fx: [], tr: {} }; await P.load(JSON.stringify(d), 'lotea'); const d2 = JSON.parse(P.serialize()); return { casa: !!S.layers[0].clips[1], noArquivo: d2.layers[0].clips[1] && (d2.layers[0].clips[1].path || d2.layers[0].clips[1].name) };`);
  check('16: vídeo cujo arquivo sumiu continua no arquivo ao salvar de novo', !!j16.noArquivo, JSON.stringify(j16));
  await ev(`await P.reset(); return 1;`);
}
console.log(`\n${res.length} verificações, ${res.filter(x => !x).length} falha(s) — ${res.every(Boolean) ? 'APROVADO' : 'REPROVADO'}`);
ws.close(); process.exit(res.every(Boolean) ? 0 : 1);
