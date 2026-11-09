// Modelo 3D como clipe (plano 10-01): abrir GLB e STL, painel com os controles, mudar com mouse e teclado REAIS pelo CDP,
// ♪ na batida, no ar (a cena anda a cada quadro), salvar e abrir, Ctrl+Z, cópia para outra casa e tempo de desenho.
// Uso: node tools/modelo3d-check.mjs [modelo.glb] [modelo.stl]  (programa aberto com --remote-debugging-port; PROJ_CDP muda a porta)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLuz');
if (!page) { console.error('janela do OpenLuz não achada'); process.exit(1); }
const GLB = process.argv[2] || path.join(os.homedir(), 'Downloads', 'c8062a65-4403-4843-b41d-7b5f97ff11dd.glb');
const STL = process.argv[3] || path.join(os.homedir(), 'Desktop', 'cartao_projetemos_final.stl');
for (const f of [GLB, STL]) if (!fs.existsSync(f)) { console.error('falta o arquivo de teste ' + f); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const btn = (type, x, y, n = 1) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: n });
const click = async (x, y) => { await btn('mouseMoved', x, y); await btn('mousePressed', x, y); await btn('mouseReleased', x, y); await wait(200); };
const key = async (k, code, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await wait(150); };
let falhas = 0, n = 0; const ruins = [];
const check = (nome, ok, extra = '') => { n++; if (!ok) { falhas++; ruins.push(nome); } console.log((ok ? 'OK    ' : 'FALHA ') + nome + (extra ? '  — ' + extra : '')); };
const P = 'window.projecionista', clip = `${P}.state.layers[0].clips[0]`;
const linha = (rot) => ev(`(() => { const r = [...document.querySelectorAll('#clipPan .prow')].find(x => x.querySelector('.pl') && x.querySelector('.pl').textContent.trim() === ${JSON.stringify(rot)}); if (!r) return null; r.scrollIntoView({ block: 'center' }); const q = (s) => { const e = r.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, l: b.x, w: b.width }; }; return { pv: q('.pv'), sel: q('select'), anb: q('.anb'), bar: q('.bar') || q('.pv input') || q('.pv') }; })()`);
const pixels = (expr) => ev(`(() => { const g = (${expr}).getContext('2d').getImageData(0, 0, 1920, 1080).data; let n = 0; for (let i = 3; i < g.length; i += 4 * 97) if (g[i] > 0) n++; return n; })()`);

await ev(`(() => { const p = ${P}; p.menubar.close(); document.querySelectorAll('.dlg, .dlgOver, .edtx').forEach(d => d.remove()); p.clearCell(0, 0); p.clearCell(0, 1); p.state.sel = { l: 0, c: 0 }; p.state.selLayer = 0; p.render(); return 1; })()`);
{ const t = await ev(`(() => { const r = document.getElementById('clipTitle').getBoundingClientRect(); return { x: r.x + 20, y: r.y + r.height / 2 }; })()`); await click(t.x, t.y); }   // o primeiro clique só acorda a janela

// 1. abrir GLB e STL
{
  const ok = await ev(`${P}.putPath(0, 0, ${JSON.stringify(GLB)})`);
  const r = await ev(`(() => { const c = ${clip}; return c && { kind: c.kind, info: c.m3 && c.m3.info, thumb: (c.thumb || '').length }; })()`);
  check('o GLB vira um clipe 3D com o que veio no arquivo', ok && r && r.kind === 'model3d' && r.info.fmt === 'GLB' && r.info.tri > 0 && r.thumb > 1000, JSON.stringify(r));
  check('o modelo aparece no quadro do clipe (fundo transparente)', await pixels(`${clip}.el`) > 200);
  const ok2 = await ev(`${P}.putPath(0, 1, ${JSON.stringify(STL)})`);
  check('o STL também abre', ok2 && (await ev(`${P}.state.layers[0].clips[1].kind`)) === 'model3d');
}
// 2. o painel
await ev(`(() => { const p = ${P}; p.state.sel = { l: 0, c: 0 }; p.panels.tab = 'clip'; p.render(); return 1; })()`); await wait(300);
{
  const tem = await ev(`(() => { const t = [...document.querySelectorAll('#clipPan .pl')].map(e => e.textContent.trim()); return ['Girar sozinho', 'Escala', 'Distância', 'Luz pronta', 'Aparência', 'Animação', 'Velocidade'].filter(k => !t.includes(k)); })()`);
  check('o painel tem Movimento, Câmera, Luz, Material e Animação', tem.length === 0, tem.join(', '));
}
// 3. Aparência pelo teclado (Arame), o quadro muda
{
  const antes = await pixels(`${clip}.el`);
  const r = await linha('Aparência'); await click(r.sel.x, r.sel.y); await key('ArrowDown', 'ArrowDown', 40); await key('ArrowDown', 'ArrowDown', 40); await key('Enter', 'Enter', 13); await wait(500);
  const m = await ev(`${clip}.params.mat`);
  check('Aparência escolhida no teclado vira Arame', m === 2, String(m));
  await ev(`${P}.trigger(0, 0)`); await wait(800);
  const depois = await pixels(`${clip}.el`);
  check('no ar, o desenho muda com o Arame', depois !== antes, antes + ' → ' + depois);
  await ev(`${clip}.params.mat = 0; 1`);
}
// 4. no ar: a cena anda a cada quadro
{
  const r0 = await ev(`${clip}.rev`); await wait(1000); const r1 = await ev(`${clip}.rev`);
  check('no ar, o clipe é redesenhado a cada quadro', r1 - r0 > 20, (r1 - r0) + ' quadros em 1 s');
}
// 5. Escala arrastada com o mouse
{
  const r = await linha('Escala'), e0 = await ev(`${clip}.params.escala`);
  const b = r.bar; await btn('mouseMoved', b.x, b.y); await btn('mousePressed', b.x, b.y); for (let i = 1; i <= 6; i++) { await btn('mouseMoved', b.x + i * 12, b.y); await wait(30); } await btn('mouseReleased', b.x + 72, b.y); await wait(300);
  const e1 = await ev(`${clip}.params.escala`);
  check('arrastar a Escala com o mouse muda o tamanho', e1 > e0, e0 + ' → ' + e1);
  // Ctrl+Z volta
  const t = await ev(`(() => { const r = document.getElementById('clipTitle').getBoundingClientRect(); return { x: r.x + 20, y: r.y + r.height / 2 }; })()`); await click(t.x, t.y);
  await key('z', 'KeyZ', 90, 2); await wait(600);
  const e2 = await ev(`${P}.state.layers[0].clips[0].params.escala`);
  check('Ctrl+Z volta a Escala', Math.abs(e2 - e0) < 1e-6, String(e2));
}
// 6. ♪ no Girar sozinho
{
  const r = await linha('Girar sozinho'); await click(r.anb.x, r.anb.y); await wait(300);
  const a = await ev(`(${clip}.panim || {}).autoRot`);
  check('♪ liga o Girar sozinho na batida', !!a && !!a.shape, JSON.stringify(a));
}
// 7. salvar e abrir
{
  const ok = await ev(`(async () => { const p = ${P}, C = p.C, c = ${clip}; c.params.luz = 3; c.params.dist = 6.5; const o = JSON.parse(JSON.stringify(C.serializeClip(c))); const n = await C.deserializeClip(o, {}); return !!n && n.kind === 'model3d' && n.path === c.path && n.params.luz === 3 && n.params.dist === 6.5 && !!n.panim.autoRot && !!n.m3; })()`);
  check('salvar e abrir guardam o arquivo, os controles e o ♪', ok);
}
// 8. cópia para outra casa tem cena própria
{
  const ok = await ev(`(async () => { const p = ${P}, c = ${clip}, n = p.C.cloneClip(c); for (let i = 0; i < 100 && !n.m3; i++) await new Promise(r => setTimeout(r, 100)); return !!n.m3 && n.m3 !== c.m3 && n.params !== c.params; })()`);
  check('a cópia para outra casa tem a sua própria cena', ok);
}
// 9. tempo de desenho (o GLB deste teste tem ~300 mil triângulos)
{
  const ms = await ev(`(() => { const c = ${clip}, C = ${P}.C; let t0 = performance.now(); for (let i = 1; i <= 20; i++) C.tick3d(c, 1e6 + i / 60); return (performance.now() - t0) / 20; })()`);
  check('um quadro do modelo desenha em menos de 16 ms', ms < 16, ms.toFixed(1) + ' ms');
}
await ev(`(() => { const p = ${P}; p.eject && p.eject(0); p.clearCell(0, 0); p.clearCell(0, 1); p.render(); return 1; })()`);
console.log(`${n} verificações, ${falhas} falha(s) — ${falhas ? 'REPROVADO: ' + ruins.join(', ') : 'APROVADO'}`);
ws.close(); process.exit(falhas ? 1 : 0);
