// Lote C1 do pente fino (plano 12-10): o que engana quem está usando. Mouse e teclado reais pelo CDP onde há clique ou tecla.
// Programa aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/lotec-check.mjs               (N1, 72, N3, 73, 74)
//      node tools/lotec-check.mjs --projetores  (N5: fecha e abre o programa duas vezes; precisa de um segundo monitor ligado)
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), PORTA = process.env.PROJ_CDP || 9333, base = 'http://127.0.0.1:' + PORTA;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const waits = new Map();
async function liga() {
  for (let i = 0; i < 80; i++) { try { const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz'); if (pg) { ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } }; return; } } catch { } await wait(500); }
  throw new Error('janela do OpenLuz não achada');
}
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state, W = ms => new Promise(r => setTimeout(r, ms)); ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const move = (x, y) => mouse('mouseMoved', x, y, { buttons: 0 });
const click = async (x, y, n = 1) => { await move(x, y); for (let i = 1; i <= n; i++) { await mouse('mousePressed', x, y, { clickCount: i }); await mouse('mouseReleased', x, y, { clickCount: i }); } };
const key = async (k, vk) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: vk }); };
const rect = (expr) => ev(`const e = (${expr}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: r.top, b: r.bottom };`);
const cel = (l, c) => `document.querySelector('.cell[data-layer="${l}"][data-col="${c}"]')`;
const res = []; const check = (nome, ok, info = '') => { res.push(ok); console.log((ok ? 'OK    ' : 'FALHA ') + nome + (info ? '  — ' + info : '')); };
const limpa = () => ev(`for (let i = 0; i < 4; i++) { const d = document.querySelector('.dlgOver'); if (!d) break; const b = [...d.querySelectorAll('button')].find(x => /Pular|Cancelar|Fechar/.test(x.textContent)); if (b) b.click(); else d.remove(); await W(200); } await P.reset(); return 1;`);
const fim = () => { console.log(`\n${res.length} verificações, ${res.filter(x => !x).length} falha(s) — ${res.every(Boolean) ? 'APROVADO' : 'REPROVADO'}`); ws.close(); process.exit(res.every(Boolean) ? 0 : 1); };

if (process.argv.includes('--projetores')) {
  const reabre = async () => { ws.close(); execFileSync('node', [path.join(HERE, 'compare', 'abre-dev.mjs'), 'fecha', String(PORTA)]); execFileSync('node', [path.join(HERE, 'compare', 'abre-dev.mjs'), String(PORTA)]); await liga(); await wait(1500); };
  const dlg = () => ev(`return [...document.querySelectorAll('.dlgOver')].some(d => d.textContent.startsWith('Projetores'));`);
  await liga();
  const telas = await ev(`return (await window.projDesktop.displays()).length;`);
  if (telas < 2) { check('N5: (só um monitor ligado: o assistente não abre sozinho, nada a conferir)', false); fim(); }
  await ev(`const p = await window.projDesktop.prefs.get(); await window.projDesktop.prefs.set({ ...p, noWizard: false }); return 1;`);
  await reabre(); check('N5: na primeira abertura o assistente de Projetores aparece', await dlg());
  await reabre(); check('N5: na segunda abertura ele não aparece', !(await dlg()));
  check('N5: e continua no menu Saída › Projetores…', await ev(`P.projectorWizard(false); await W(300); const ok = [...document.querySelectorAll('.dlgOver')].some(d => d.textContent.startsWith('Projetores')); document.querySelectorAll('.dlgOver').forEach(d => d.remove()); return ok;`));
  fim();
}

await liga(); await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
// N1: duplo clique num efeito de descrição longa que é o último visível da lista
await limpa(); await ev(`P.putSource(0, 0, 'sinewave'); return 1;`);
{ const c = await rect(cel(0, 0)); await click(c.x, c.y); await wait(300);
  const tab = await rect(`[...document.querySelectorAll('#browserTabs span')].find(e => e.textContent.trim() === 'Efeitos')`); await click(tab.x, tab.y); await wait(400); await move(700, 300); await wait(300);
  const item = `[...document.querySelectorAll('#browserPan .item')].find(e => e.textContent.trim() === 'Blur')`;
  await ev(`const l = document.querySelector('#browserPan .flist'), e = ${item}; l.scrollTop += e.getBoundingClientRect().bottom - l.getBoundingClientRect().bottom; return 1;`);   // Blur encostado no fim da lista
  const antes = await rect(`document.querySelector('#browserPan .flist')`), r = await rect(item);
  await move(r.x, r.y); await wait(500);
  const depois = await rect(`document.querySelector('#browserPan .flist')`);
  const sob = await ev(`const e = document.elementFromPoint(${r.x}, ${r.y}); return !!(e && e.closest('.item'));`);
  check('N1: a lista não encolhe quando o mouse passa num efeito de descrição longa', Math.abs(depois.b - antes.b) < 1 && sob, `fim da lista ${antes.b} → ${depois.b}; item sob o mouse: ${sob}`);
  await click(r.x, r.y, 2); await wait(500);
  check('N1: o duplo clique põe o efeito no clipe selecionado', await ev(`return (S.layers[0].clips[0].fx || []).some(f => f.id === 'blur');`)); }
// 72: depois de escolher a mistura da camada, o teclado volta
await limpa(); await ev(`P.putSource(0, 0, 'sinewave'); return 1;`);
{ const sel = `(() => { const c = ${cel(0, 0)}.getBoundingClientRect(); return [...document.querySelectorAll('#mid select')].filter(b => { const r = b.getBoundingClientRect(); return r.left < c.left && r.top >= c.top - 6 && r.bottom <= c.bottom + 6; })[0]; })()`;
  const r = await rect(sel); await click(r.x, r.y); await wait(250); await key('Escape', 27); await wait(150);   // clique de verdade abre a lista e dá o foco a ela
  await ev(`const e = ${sel}; e.value = [...e.options].map(o => o.value).filter(v => v !== e.value).pop(); e.dispatchEvent(new Event('change', { bubbles: true })); return 1;`); await wait(300);   // a escolha em si: a lista nativa não recebe clique pelo CDP
  const m1 = await ev(`return S.layers[0].blend + " / " + S.layers[0].transMode;`), foco = await ev(`return document.activeElement ? document.activeElement.tagName : '';`);
  await key('ArrowDown', 40); await wait(300); const m2 = await ev(`return S.layers[0].blend + " / " + S.layers[0].transMode;`);
  check('72: escolhida a mistura, o foco sai da lista', foco !== 'SELECT', 'foco em ' + foco + '; mistura ' + m1);
  check('72: e a tecla seguinte não troca a mistura no ar', m1 === m2 && m1 !== "normal / alpha", `${m1} → ${m2} (no código antigo este ponto não pegava o defeito: a prova é o foco)`); }
// N3: ao voltar para o deck, a casa do clipe que seguiu tocando volta a marcar "no ar"
await limpa(); await ev(`P.putSource(0, 2, 'sinewave'); P.trigger(0, 2); await W(300); return 1;`);
{ const novo = await rect(`document.querySelector('[title^="Deck novo"]')`); await click(novo.x, novo.y); await wait(500);
  const d2 = await ev(`return { deck: S.deck, tocando: !!(S.layers[0].ghost || S.layers[0].on >= 0) };`);
  const d1 = await rect(`[...document.querySelectorAll('[title^="Deck "]')].find(e => e.textContent.trim() === 'Deck 1')`); await click(d1.x, d1.y); await wait(500);
  const v = await ev(`return { deck: S.deck, on: S.layers[0].on, casa: ${cel(0, 2)}.className };`);
  check('N3: no outro deck o clipe continua tocando', d2.deck === 1 && d2.tocando, JSON.stringify(d2));
  check('N3: de volta ao Deck 1, a casa dele aparece no ar', v.deck === 0 && v.on === 2 && /\bon\b/.test(v.casa), JSON.stringify(v)); }
// 73: clipe piano não fica preso
await limpa(); await ev(`P.putSource(0, 0, 'sinewave'); S.layers[0].clips[0].trig = 'piano'; P.render(); return 1;`);
{ const c = await rect(cel(0, 0)); await move(c.x, c.y); await mouse('mousePressed', c.x, c.y); await wait(300);
  const seg = await ev(`return S.layers[0].on;`); await ev(`window.dispatchEvent(new Event('blur')); await W(200); return 1;`);   // a janela perde o foco com o botão preso (Alt+Tab)
  const sol = await ev(`return S.layers[0].on;`); await mouse('mouseReleased', c.x, c.y); await wait(200);
  check('73: segurando, o clipe piano está no ar; perdendo o foco da janela, sai', seg === 0 && sol === -1, `segurando ${seg}, depois de perder o foco ${sol}`);
  await ev(`S.bpm.snap = 4; P.render(); return 1;`);
  const c2 = await rect(cel(0, 0)); await move(c2.x, c2.y); await mouse('mousePressed', c2.x, c2.y); await wait(200); await mouse('mouseReleased', c2.x, c2.y); await wait(2800);   // 4 batidas a 120 = 2 s
  check('73: com Beat Snap, soltar antes da batida não deixa o clipe entrar e ficar', await ev(`return S.layers[0].on;`) === -1, 'no ar: ' + await ev(`return S.layers[0].on;`));
  await ev(`S.bpm.snap = 0; return 1;`); }
// 74: o Autopilot não rouba a seleção nem refaz a grade a cada quadro
await limpa(); await ev(`P.putSource(0, 0, 'sinewave'); P.putSource(0, 1, 'checkered'); P.putSource(1, 0, 'rings'); Object.assign(S.layers[0].autopilot, { dir: 'next', dur: 'fixed', secs: 0.5, loop: true }); P.trigger(0, 0); P.render(); return 1;`);
{ const c = await rect(cel(1, 0)); await click(c.x, c.y); await wait(1800);
  const a = await ev(`return { sel: S.sel, on0: S.layers[0].on };`);
  check('74: o Autopilot troca o clipe da Camada 1 sem tirar a seleção da Camada 2', a.sel && a.sel.l === 1 && a.sel.c === 0, JSON.stringify(a));
  const n = await ev(`S.bpm.snap = 16; let n = 0; const o = new MutationObserver(m => { n += m.length; }); o.observe(document.querySelector('#mid'), { childList: true, subtree: true }); await W(1000); o.disconnect(); S.bpm.snap = 0; S.layers[0].autopilot.dir = 'off'; return n;`);
  check('74: esperando o Beat Snap, a grade não é refeita a cada quadro', n < 400, n + ' mudanças na grade em 1 s'); }
await ev(`await P.reset(); return 1;`);
fim();
