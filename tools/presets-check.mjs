// Estilos prontos do Text Block (maquete presets-texto-mockup.html): cada botão com clique REAL pelo CDP monta o cartaz,
// a palavra forte fica grande, trocar de estilo volta ao texto como foi escrito, Ctrl+Z desfaz, e os que animam viram Text Animator.
// Grava tools/compare/saida/presets/<id>.png (o desenho do clipe). Uso: node tools/presets-check.mjs (programa com --remote-debugging-port=9333)
import fs from 'node:fs';
import path from 'node:path';
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLume');
if (!page) { console.error('janela do OpenLume não achada'); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const btn = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
const click = async (x, y) => { await btn('mouseMoved', x, y); await btn('mousePressed', x, y); await btn('mouseReleased', x, y); await wait(250); };
const key = async (k, code, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); };
let falhas = 0, n = 0;
const check = (nome, ok, extra = '') => { n++; if (!ok) falhas++; console.log((ok ? 'OK    ' : 'FALHA ') + nome + (extra ? '  — ' + extra : '')); };
const P = 'window.projecionista';
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), 'compare', 'saida', 'presets'); fs.mkdirSync(OUT, { recursive: true });

// clipe de texto novo na camada 1, coluna 1, selecionado
await ev(`(async () => { const p = ${P}; p.menubar.close(); document.querySelectorAll('.dlg').forEach(d => d.remove()); p.clearCell(0, 0); p.putText(0, 0, 'somos todos contra as BETS', false); p.state.sel = { l: 0, c: 0 }; p.state.selLayer = 0; p.panels.tab = 'clip'; p.render(); const c = p.state.layers[0].clips[0]; c.text.content = 'somos todos contra as BETS'; p.panels.render(); return 1; })()`);
await wait(400);
const ids = await ev(`[...document.querySelectorAll('.presets button[data-preset]')].map(b => b.dataset.preset)`);
check('o painel do texto tem os nove estilos', ids.join(',') === 'lambe,neon,protesto,festa,elegante,letreiro,cordel,manuscrito,tecno', ids.join(','));
const pos = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
const clip = `${P}.state.layers[0].clips[0]`;
{ const r = await pos('#clipTitle'); await click(...r); }   // o primeiro clique só acorda a janela
for (const pid of ids) {
  const p = await pos(`.presets button[data-preset="${pid}"]`); await click(...p); await wait(400);
  const r = await ev(`(() => { const c = ${clip}, t = c.text; return { preset: t.preset, content: t.content, lines: t.lines.map(l => [l.font, l.size, l.color]), anim: !!t.animator, panim: Object.keys(c.panim || {}), on: (document.querySelector('.presets button[data-preset].on') || {}).dataset?.preset }; })()`);
  const big = Math.max(...r.lines.map(l => l[1])), small = Math.min(...r.lines.map(l => l[1]));
  check(`${pid}: aplica e marca o botão`, r.preset === pid && r.on === pid, JSON.stringify(r.lines));
  if (pid !== 'cordel' && pid !== 'tecno' && pid !== 'protesto') check(`${pid}: BETS é a linha grande`, /BETS$/.test(r.content.split('\n')[r.lines.findIndex(l => l[1] === big)] || '') && big > small * 1.8);
  check(`${pid}: anima só nos estilos que animam`, r.anim === ['neon', 'festa', 'tecno'].includes(pid) && (r.panim.length > 0) === r.anim, r.panim.join(','));
  const png = await ev(`(async () => { const c = ${clip}; const cv = document.createElement('canvas'); cv.width = 960; cv.height = 540; const big = c.canvas || c.tex || null; const src = document.createElement('canvas'); src.width = 1920; src.height = 1080; const { drawText } = await import('./text.js'); drawText(src, c.text, c); const x = cv.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 960, 540); x.drawImage(src, 0, 0, 960, 540); return cv.toDataURL('image/png').split(',')[1]; })()`);
  fs.writeFileSync(path.join(OUT, pid + '.png'), Buffer.from(png, 'base64'));
}
// trocar de estilo volta ao texto como foi escrito (o Elegante deixa "BETS" como está e o resto em maiúsculas; o Festa põe o apoio em minúsculas)
{
  const p = await pos(`.presets button[data-preset="festa"]`); await click(...p); await wait(300);
  const c = await ev(`${clip}.text.content`);
  check('trocar de estilo volta ao texto original', c.startsWith('somos todos contra as'), JSON.stringify(c));
}
// Ctrl+Z volta ao estilo de antes
{
  const antes = await ev(`${clip}.text.preset`);
  const p = await pos(`.presets button[data-preset="lambe"]`); await click(...p); await wait(300);
  await key('z', 'KeyZ', 90, 2); await wait(300);
  check('Ctrl+Z desfaz o estilo', await ev(`${P}.state.layers[0].clips[0].text.preset`) === antes, antes);
}
await ev(`${P}.clearCell(0, 0); ${P}.render(); 1`);
console.log(`${n} verificações, ${falhas} falha(s) — ${falhas ? 'REPROVADO' : 'APROVADO'}`);
ws.close(); process.exit(falhas ? 1 : 0);
