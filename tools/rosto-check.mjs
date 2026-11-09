// Seguir rosto (plano 11-01): clipe de câmera acha o rosto e recorta em volta dele. Mouse e teclado REAIS pelo CDP.
// Precisa de uma câmera que mostre rostos. Sem webcam apontada para alguém, use a câmera falsa do Chromium com um vídeo de
// teste (duas pessoas paradas 4 s, andando 4 s, paradas 2 s, fora de quadro 3 s, voltam):
//   tools/ffmpeg/ffmpeg.exe -f lavfi -i "color=c=0x2b2b2b:s=640x360:r=15:d=14" -loop 1 -i tools/compare/clips/rostos.jpg -filter_complex
//     "[1:v]scale=490:-2[f];[0:v][f]overlay=x='if(lt(t,4),20,if(lt(t,8),20+(t-4)*30,if(lt(t,10),140,if(lt(t,13),800,20))))':y=360-h-10:shortest=1,format=yuv420p" -t 14 cam.y4m
//   PROJ_USERDATA=<pasta de teste> electron . --remote-debugging-port=9334 --use-fake-device-for-media-stream --use-fake-ui-for-media-stream --use-file-for-fake-video-capture=cam.y4m
//   (para não piscar na tela: --disable-backgrounding-occluded-windows --disable-renderer-backgrounding e a janela fora da tela)
// Uso: PROJ_CDP=9334 node tools/rosto-check.mjs   (não traz a janela para a frente; limpa a casa no fim)
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLuz');
if (!page) { console.error('janela do OpenLuz não achada'); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map(); const erros = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') erros.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const btn = (type, x, y, n = 1) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: n });
const click = async (x, y) => { await btn('mouseMoved', x, y); await btn('mousePressed', x, y); await btn('mouseReleased', x, y); await wait(200); };
const key = async (k, code, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await wait(150); };
let falhas = 0, n = 0; const ruins = [];
const check = (nome, ok, extra = '') => { n++; if (!ok) { falhas++; ruins.push(nome); } console.log((ok ? 'OK    ' : 'FALHA ') + nome + (extra ? '  — ' + extra : '')); };
const P = 'window.projecionista', clip = `${P}.state.layers[0].clips[0]`;
const linha = (rot) => ev(`(() => { const r = [...document.querySelectorAll('#clipPan .prow')].find(x => x.querySelector('.pl') && x.querySelector('.pl').textContent.trim() === ${JSON.stringify(rot)}); if (!r) return null; r.scrollIntoView({ block: 'center' }); const q = (s) => { const e = r.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }; return { sel: q('select'), anb: q('.anb'), ck: q('.ck') || q('label') || q('input[type=checkbox]') || q('.pv') }; })()`);
const estado = () => ev(`(() => { const c = ${clip}; if (!c) return null; const k = c._crop, f = (c._faces || []).map(r => ({ cx: (r.x + r.w / 2) * c.w, cy: (r.y + r.h / 2) * c.h, h: r.h * c.h })); return { w: c.w, h: c.h, faces: f, crop: k && { cx: (k.x + k.w / 2) * c.w, cy: (k.y + k.h / 2) * c.h, w: k.w * c.w, h: k.h * c.h }, seg: c._seguido && { cx: c._seguido.x + c._seguido.w / 2, todos: !!c._seguido.todos } }; })()`);
const ate = async (cond, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await estado(); if (s && cond(s)) return s; await wait(200); } return null; };

// preparo: câmera na casa (0,0), no ar, selecionada, na Prévia
const prep = await ev(`(async () => { const p = ${P}; p.menubar.close(); document.querySelectorAll('.dlg, .dlgOver').forEach(d => d.remove()); p.clearCell(0, 0); p.clearCell(0, 1); p.clearCell(0, 2);
  const c = await p.C.cameraClip('', 'Câmera de teste'); p.panels.ctx.putClip(0, 0, c); p.state.sel = { l: 0, c: 0 }; p.state.selLayer = 0; p.state.pv = { l: 0, c: 0 }; p.panels.tab = 'clip'; p.render(); p.trigger(0, 0); return { w: c.w, h: c.h }; })()`);
await wait(800);
{ const t = await ev(`(() => { const r = document.getElementById('clipTitle').getBoundingClientRect(); return { x: r.x + 20, y: r.y + r.height / 2 }; })()`); await click(t.x, t.y); }

// 1. só no clipe de câmera, desligado por padrão e sem recorte
check('o painel da câmera tem Seguir rosto, desligado', await ev(`!!${clip}.face && ${clip}.face.on === false && [...document.querySelectorAll('#clipPan .pl')].some(e => e.textContent.trim() === 'Seguir rosto')`));
check('desligado, a câmera vai inteira (sem recorte nenhum)', await ev(`!${clip}._crop && ${P}.engine.cropOf(${clip}) === null`));
{
  const tem = await ev(`(async () => { const p = ${P}; p.putSource(0, 1, 'gradient'); p.state.sel = { l: 0, c: 1 }; p.render(); await new Promise(r => setTimeout(r, 200)); const t = [...document.querySelectorAll('#clipPan .pl')].some(e => e.textContent.trim() === 'Seguir rosto'); p.clearCell(0, 1); p.state.sel = { l: 0, c: 0 }; p.render(); return t; })()`);
  check('a opção não aparece num clipe que não é câmera', tem === false);
}
// 2. liga com o mouse
{ const r = await linha('Seguir rosto'); await click(r.ck.x, r.ck.y); await wait(300); }
check('clicar em Seguir rosto liga', await ev(`${clip}.face.on === true`));
check('ligado, aparecem Enquadrar, Zoom, Altura, Suavidade, Vários rostos, Sem rosto e Marcação', await ev(`(() => { const t = [...document.querySelectorAll('#clipPan .pl')].map(e => e.textContent.trim()); return ['Enquadrar', 'Zoom', 'Altura', 'Suavidade', 'Vários rostos', 'Sem rosto', 'Marcação'].every(k => t.includes(k)); })()`));
// 3. acha os rostos e o recorte vai para eles
let s = await ate(s => s.faces.length >= 1 && s.crop && s.crop.h < s.h * 0.95, 25000);
check('acha o rosto e o recorte aperta em volta dele', !!s, s ? s.faces.length + ' rostos, recorte ' + Math.round(s.crop.w) + '×' + Math.round(s.crop.h) : 'nada em 25 s');
if (s) {
  await wait(1500); s = await estado();
  const alvo = s.seg ? s.seg.cx : s.faces[0].cx, borda = s.crop.cx - s.crop.w / 2 < 1 || s.crop.cx + s.crop.w / 2 > s.w - 1;
  check('o centro do recorte segue o rosto escolhido (ou encosta na borda)', borda || Math.abs(s.crop.cx - alvo) < s.w * 0.05, 'recorte ' + s.crop.cx.toFixed(0) + ' × rosto ' + alvo.toFixed(0));
  check('o recorte tem a proporção da composição (enche a camada sem barras)', Math.abs(s.crop.w / s.crop.h - 16 / 9) < 0.01, (s.crop.w / s.crop.h).toFixed(3));
}
// 4. parado não treme: mede o centro durante um trecho em que os rostos não andam
{
  let ok = false, extra = 'não achei 2 s parados';
  for (let tent = 0; tent < 8 && !ok; tent++) {
    const a = []; for (let i = 0; i < 10; i++) { const e = await estado(); if (e && e.crop && e.faces.length) a.push(e); await wait(200); }
    if (a.length < 10) continue;
    const fx = a.map(e => e.faces.reduce((m, f) => m + f.cx, 0) / e.faces.length), cx = a.map(e => e.crop.cx);
    const varF = Math.max(...fx) - Math.min(...fx), varC = Math.max(...cx) - Math.min(...cx);
    if (varF < a[0].w * 0.01) { ok = varC < a[0].w * 0.005; extra = 'centro variou ' + (varC / a[0].w * 100).toFixed(2) + '% da largura com os rostos parados'; if (!ok) break; }
  }
  check('com a pessoa parada o recorte não treme (menos de 0,5% da largura em 2 s)', ok, extra);
}
// 5. Enquadrar pelo teclado: Rosto < Busto < Corpo
{
  const med = async () => { await wait(2500); const e = await estado(); return e && e.crop ? e.crop.h : 0; };
  const escolhe = async (i) => { const r = await linha('Enquadrar'); await click(r.sel.x, r.sel.y); const cur = await ev(`${clip}.face.params.enq | 0`); for (let k = cur; k < i; k++) await key('ArrowDown', 'ArrowDown', 40); for (let k = cur; k > i; k--) await key('ArrowUp', 'ArrowUp', 38); await key('Enter', 'Enter', 13); await wait(300); };
  await ate(s => s.faces.length >= 1, 15000);
  await escolhe(0); const hR = await med(); const eR = await ev(`${clip}.face.params.enq`);
  await escolhe(2); const hC = await med(); const eC = await ev(`${clip}.face.params.enq`);
  await escolhe(1); const hB = await med();
  check('Enquadrar escolhido no teclado muda o tamanho: Rosto < Busto < Corpo', eR === 0 && eC === 2 && hR < hB && hB <= hC, [hR, hB, hC].map(v => Math.round(v)).join(' < '));
}
// 6. ♪ no Zoom (mouse) e Ctrl+Z
{
  const r = await linha('Zoom'); await click(r.anb.x, r.anb.y); await wait(300);
  const a = await ev(`(${clip}.face.panim || {}).zoom`);
  check('♪ liga o Zoom na batida', !!a && !!a.shape, JSON.stringify(a));
  const t = await ev(`(() => { const r = document.getElementById('clipTitle').getBoundingClientRect(); return { x: r.x + 20, y: r.y + r.height / 2 }; })()`); await click(t.x, t.y);
  await key('z', 'KeyZ', 90, 2); await wait(600);
  check('Ctrl+Z tira o ♪ do Zoom', !(await ev(`(${P}.state.layers[0].clips[0].face.panim || {}).zoom`)));
}
// 7. Todos juntos: o recorte cobre os dois rostos
{
  await ev(`(() => { ${clip}.face.params.varios = 1; ${P}.render(); return 1; })()`);
  const e = await ate(s => s.faces.length >= 2, 15000); await wait(2500);
  const s2 = await estado();
  const cobre = s2 && s2.faces.length >= 2 && s2.faces.every(f => Math.abs(f.cx - s2.crop.cx) < s2.crop.w / 2);
  check('Vários rostos = Todos juntos põe os dois rostos no recorte', !!e && cobre, s2 ? s2.faces.length + ' rostos' : '');
  await ev(`(() => { ${clip}.face.params.varios = 0; ${P}.render(); return 1; })()`);
}
// 8. Sem rosto = Volta à imagem inteira
{
  await ev(`(() => { ${clip}.face.params.sem = 1; ${P}.render(); return 1; })()`);
  const sem = await ate(s => s.faces.length === 0, 20000);
  let ok = false, extra = 'o vídeo de teste não ficou sem ninguém';
  if (sem) { await wait(2200); const s3 = await estado(); ok = !!s3 && (s3.faces.length > 0 || s3.crop.h > s3.h * 0.9); extra = s3 ? 'recorte ' + Math.round(s3.crop.h) + ' de ' + s3.h + ' de altura' : ''; }
  check('sem rosto, volta devagar à imagem inteira', ok, extra);
  await ev(`(() => { ${clip}.face.params.sem = 0; ${P}.render(); return 1; })()`);
}
// 9. salvar e abrir; cópia
{
  const ok = await ev(`(async () => { const p = ${P}, C = p.C, c = ${clip}; c.face.params.alt = 0.42; const o = JSON.parse(JSON.stringify(C.serializeClip(c))); const n = await C.deserializeClip(o, {}); const r = !!n && n.face.on === true && n.face.params.alt === 0.42 && n.face.params.enq === c.face.params.enq; try { n.stream && n.el && n.el.pause(); } catch {} return r; })()`);
  check('salvar e abrir guardam o Seguir rosto e os ajustes', ok);
  const cp = await ev(`(async () => { const p = ${P}, c = ${clip}, n = p.C.cloneClip(c); p.panels.ctx.putClip(0, 2, n); p.trigger(0, 2); await new Promise(r => setTimeout(r, 5000)); const r = { on: n.face.on, faces: (n._faces || []).length, crop: !!n._crop, propria: n.face !== c.face && n._crop !== c._crop }; p.clearCell(0, 2); p.trigger(0, 0); return r; })()`);
  check('a cópia para outra casa segue o rosto sozinha', cp.on && cp.faces > 0 && cp.crop && cp.propria, JSON.stringify(cp));
}
// 10. Prévia com marcação e saída sem; quadros por segundo com o Background Removal junto
{
  const pv = await ev(`(async () => { const p = ${P}; p.state.pv = { l: 0, c: 0 }; p.render(); await new Promise(r => setTimeout(r, 600)); return { marca: !!document.querySelector('#prevScr canvas'), crop: !!${clip}._crop }; })()`);
  check('a Prévia mostra a imagem inteira com a marcação; a composição recebe só o recorte', pv.marca && pv.crop && (await ev(`${P}.engine.noCropId == null`)));
  const br = await ev(`(async () => { const c = ${clip}, E = await import('app://projecionista/effects.js'); c.fx = c.fx || []; c.fx.push(E.mkFx('backgroundremoval')); ${P}.render(); return c.fx.map(f => f.id).join(','); })()`);
  check('o Background Removal entra no mesmo clipe da câmera', /backgroundremoval/.test(br), br);
  await wait(4000);
  const fps = await ev(`(async () => { const a = ${P}.frames(); await new Promise(r => setTimeout(r, 3000)); return (${P}.frames() - a) / 3; })()`);
  check('a composição segue a 28+ quadros por segundo com Seguir rosto e o recorte de pessoa', fps >= 28, fps.toFixed(1) + ' qps');
  const det = await ev(`(async () => { const c = ${clip}; let n = 0, last = c._facesAt; const t0 = performance.now(); while (performance.now() - t0 < 3000) { await new Promise(r => setTimeout(r, 20)); if (c._facesAt !== last) { n++; last = c._facesAt; } } return n / 3; })()`);
  check('o detector responde 10+ vezes por segundo', det >= 10, det.toFixed(1) + ' por segundo');
}
await ev(`(() => { const p = ${P}; p.eject && p.eject(0); p.clearCell(0, 0); p.clearCell(0, 2); p.state.pv = null; p.render(); return 1; })()`);
if (erros.length) console.log('exceções na página:\n' + erros.slice(0, 5).join('\n'));
check('nenhuma exceção na página', erros.length === 0);
console.log(`${n} verificações, ${falhas} falha(s) — ${falhas ? 'REPROVADO: ' + ruins.join(', ') : 'APROVADO'}`);
ws.close(); process.exit(falhas ? 1 : 0);
