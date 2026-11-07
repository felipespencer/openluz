// ✎ Editar texto (plano 09-01): fontes separadas (Texto, Texto com IA), editor aberto com dois cliques no clipe, estilos prontos,
// mover/aumentar/girar com o mouse, escrever com dois cliques e pintar um pedaço, efeitos, animação, Ctrl+Z dentro do editor,
// Aplicar e Ctrl+Z no programa, salvar e abrir, desenho a 30 qps com cinco caixas. Mouse e teclado REAIS pelo CDP.
// Uso: node tools/editor-check.mjs (programa aberto com --remote-debugging-port=9333; limpa a casa no fim)
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
const btn = (type, x, y, n = 1) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: n });
const click = async (x, y) => { await btn('mouseMoved', x, y); await btn('mousePressed', x, y); await btn('mouseReleased', x, y); await wait(200); };
const dbl = async (x, y) => { await click(x, y); await btn('mousePressed', x, y, 2); await btn('mouseReleased', x, y, 2); await wait(400); };
const dragm = async (x0, y0, x1, y1, passos = 12) => { await btn('mouseMoved', x0, y0); await btn('mousePressed', x0, y0); for (let i = 1; i <= passos; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0 + (x1 - x0) * i / passos, y: y0 + (y1 - y0) * i / passos, button: 'left', buttons: 1 }); await wait(15); } await btn('mouseReleased', x1, y1); await wait(250); };
const key = async (k, code, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await wait(150); };
let falhas = 0, n = 0; const ruins = [];
const check = (nome, ok, extra = '') => { n++; if (!ok) { falhas++; ruins.push(nome); } console.log((ok ? 'OK    ' : 'FALHA ') + nome + (extra ? '  — ' + extra : '')); };
const P = 'window.projecionista';
const pos = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; })()`);
const clip = `${P}.state.layers[0].clips[0]`;
const K = (i, campo) => ev(`(() => { const e = window.__ed; const k = e.t.caixas[${i}]; return k ? JSON.parse(JSON.stringify(k${campo ? '.' + campo : ''})) : null; })()`);

await ev(`(() => { const p = ${P}; p.menubar.close(); document.querySelectorAll('.dlg, .dlgOver, .edtx').forEach(d => d.remove()); p.clearCell(0, 0); p.render(); return 1; })()`);
{ const t = await pos('#clipTitle'); await click(t.x, t.y); }   // o primeiro clique só acorda a janela

// 1. Fontes: Texto e Texto com IA separados; o ✦ Montar com IA só no Texto com IA
{
  await ev(`(() => { const b = ${P}.browser; b.search = ''; b.setTab('src'); return 1; })()`); await wait(2500);
  const itens = await ev(`[...document.querySelectorAll('.flist .item span')].map(s => s.textContent)`);
  check('Fontes tem Text Block, Text Animator, Texto e Texto com IA', ['Text Block', 'Text Animator', 'Texto', 'Texto com IA'].every(x => itens.includes(x)), itens.filter(x => /Text/.test(x)).join(', '));
  await ev(`(() => { const p = ${P}; p.putText(0, 0, 'oi', false); p.state.sel = { l: 0, c: 0 }; p.panels.tab = 'clip'; p.render(); return 1; })()`); await wait(300);
  check('Text Block não mostra mais o ✦ Montar com IA', await ev(`!document.querySelector('#clipPan .iabox') && !!document.querySelector('#clipPan .presets')`));
  // Texto com IA pelo duplo clique em Fontes (põe na casa selecionada)
  const it = await pos('.flist .item.src:nth-child(1)');
  // a lista de Fontes se remonta sozinha (câmeras e janelas chegam depois): espera o item ficar parado sob o ponto
  const achar = async (nome) => {
    for (let k = 0; k < 20; k++) {
      const p = await ev(`(() => { const e = [...document.querySelectorAll('.flist .item')].find(x => x.textContent === ${JSON.stringify(nome)}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      await wait(400);
      if (p && await ev(`(() => { const e = document.elementFromPoint(${p.x}, ${p.y}); const it = e && e.closest('.flist .item'); return !!it && it.textContent === ${JSON.stringify(nome)}; })()`)) return p;
    }
    return null;
  };
  const ia = await achar('Texto com IA');
  void it; await dbl(ia.x, ia.y); await wait(600);
  for (let k = 0; k < 2 && !(await ev(`!!${clip} && ${clip}.text.iaFonte === true`)); k++) { const q = await achar('Texto com IA'); await dbl(q.x, q.y); await wait(600); }
  check('Texto com IA (duplo clique em Fontes) mostra o ✦ Montar com IA', await ev(`!!${clip} && ${clip}.text.iaFonte === true && !!document.querySelector('#clipPan .iabox')`));
  let tx = null;
  for (let k = 0; k < 3 && !(await ev(`!!${clip} && ${clip}.text.cartaz === true`)); k++) { tx = await achar('Texto'); await dbl(tx.x, tx.y); await wait(600); }   // a lista de Fontes ainda pode se remontar no meio do clique
  check('Texto (duplo clique em Fontes) cria o cartaz com o botão ✎ Editar texto', await ev(`${clip}.text.cartaz === true && !!document.querySelector('#clipPan [data-k=editar]')`), await ev(`JSON.stringify([${P}.state.sel, ${P}.state.layers[0].clips.map(c => c && c.name)])`) + ' ' + JSON.stringify(tx));
}
// 2. dois cliques no clipe da grade abrem o editor
{
  const c = await pos('.cell[data-layer="0"][data-col="0"] .th'); await dbl(c.x, c.y); await wait(800);
  await ev(`window.__ed = document.querySelector('.edtx') ? (window.projecionista.textEditor || null) : null; 1`);
  check('dois cliques no clipe abrem o editor', await ev(`!!document.querySelector('.edtx .tela canvas')`));
}
// acesso ao editor para conferir o estado (o mouse faz tudo; aqui só se lê)
await ev(`window.__ed = ${P}.textEditor; 1`);
// 3. estilo pronto (clique real) monta duas caixas
{
  const b = await pos('.edtx .est[data-estilo="lambe"]'); await click(b.x, b.y); await wait(300);
  const ks = await ev(`window.__ed.t.caixas.map(k => [k.f, Math.round(k.s * 19.2), k.c])`);
  check('Lambe-lambe monta caixas de apoio e destaque', ks.length >= 1 && ks.some(k => k[2] === '#ffd400'), JSON.stringify(ks));
}
// 4. Adicionar título e mexer com o mouse: mover (com ímã no centro), aumentar pela alça, girar pela alça de cima
{
  const a = await pos('.edtx .rod [data-add="Título"]'); await click(a.x, a.y); await wait(300);
  const i = await ev(`window.__ed.sel`), k0 = await K(i);
  let box = await pos(`.edtx .cx-hit[data-i="${i}"]`);
  const tela = await pos('.edtx .tela');
  await dragm(box.x, box.y, box.x + tela.w * 0.2, box.y + tela.h * 0.15);
  const k1 = await K(i);
  check('arrastar a caixa move', Math.abs(k1.x - k0.x - 20) < 3 && Math.abs(k1.y - k0.y - 15) < 3, `${k0.x},${k0.y} → ${k1.x.toFixed(1)},${k1.y.toFixed(1)}`);
  box = await pos(`.edtx .cx-hit[data-i="${i}"]`);
  await dragm(box.x, box.y, tela.l + tela.w * 0.5 + 3, tela.t + tela.h * 0.5 - 2);
  const k2 = await K(i);
  check('o ímã prende no centro', k2.x === 50 && k2.y === 50, `${k2.x},${k2.y}`);
  const br = await pos(`.edtx .cx-hit[data-i="${i}"] .h.br`);
  await dragm(br.x, br.y, br.x + (br.x - tela.x) * 0.5, br.y + (br.y - tela.y) * 0.5);
  const k3 = await K(i);
  check('a alça do canto aumenta', k3.s > k2.s * 1.3, `${k2.s.toFixed(2)} → ${k3.s.toFixed(2)}`);
  const rot = await pos(`.edtx .cx-hit[data-i="${i}"] .h.rot`), cx = await pos(`.edtx .cx-hit[data-i="${i}"]`);
  await dragm(rot.x, rot.y, cx.x + 200, cx.y);
  const k4 = await K(i);
  check('a alça de cima gira', Math.abs(k4.r - 90) < 8, String(k4.r));
  // 5. Ctrl+Z dentro do editor desfaz o giro
  await key('z', 'KeyZ', 90, 2);
  check('Ctrl+Z dentro do editor desfaz o giro', (await K(i)).r === k3.r, String((await K(i)).r));
  // 6. dois cliques escrevem; um pedaço selecionado ganha outra cor
  const b2 = await pos(`.edtx .cx-hit[data-i="${i}"]`); await dbl(b2.x, b2.y);
  check('dois cliques abrem a escrita na caixa', await ev(`!!document.querySelector('.edtx .cx-txt') && document.activeElement === document.querySelector('.edtx .cx-txt')`));
  await send('Input.insertText', { text: 'NOSSO FESTIVAL' }); await wait(200);
  // seleciona "FESTIVAL" e pinta pela barra (o seletor de cor do Windows não abre pelo CDP: o valor entra e o evento input dispara)
  await ev(`(() => { const t = document.querySelector('.edtx .cx-txt'); const n = t.firstChild; const r = document.createRange(); r.setStart(n, 6); r.setEnd(n, 14); const s = getSelection(); s.removeAllRanges(); s.addRange(r); const c = document.querySelector('.edtx [data-k=cor]'); c.value = '#ff3c9e'; c.dispatchEvent(new Event('input', { bubbles: true })); return 1; })()`);
  await key('Escape', 'Escape', 27);
  const tr = (await K(i)).trechos;
  check('o texto escrito entra na caixa', tr.map(r => r.t).join('') === 'NOSSO FESTIVAL', JSON.stringify(tr));
  check('o pedaço selecionado ficou com a cor dele', tr.some(r => r.t === 'FESTIVAL' && r.c === '#ff3c9e') && tr.some(r => r.t.startsWith('NOSSO') && !r.c), JSON.stringify(tr));
  // 7. efeito e animação pelas abas (cliques reais)
  const ab = await pos('.edtx .abas [data-a="efeitos"]'); await click(ab.x, ab.y);
  const ne = await pos('.edtx .ef[data-fx="neon"]'); await click(ne.x, ne.y);
  check('aba Efeitos: Neon na caixa', (await K(i, 'fx')).tipo === 'neon');
  check('os doze efeitos aparecem', await ev(`document.querySelectorAll('.edtx .ef').length`) === 12);
  const aa = await pos('.edtx .abas [data-a="animar"]'); await click(aa.x, aa.y);
  const pu = await pos('.edtx .an[data-an="pulso"]'); await click(pu.x, pu.y);
  check('aba Animar: Pulso na caixa', (await K(i, 'an')).tipo === 'pulso');
  // 8. barra: B e tamanho +
  const s0 = (await K(i)).s; const mais = await pos('.edtx .tool [data-c="mais"]'); await click(mais.x, mais.y);
  check('o + da barra aumenta o tamanho', (await K(i)).s > s0 * 1.05);
  const bb = await pos('.edtx .tool [data-c="b"]'); await click(bb.x, bb.y);
  check('o B da barra liga o negrito', (await K(i)).b === true);
}
// 9. Aplicar troca o clipe; Ctrl+Z do programa volta ao de antes
{
  const antes = await ev(`${clip}.text.caixas.length`);
  const ap = await pos('.edtx [data-k="aplicar"]'); await click(ap.x, ap.y); await wait(400);
  const depois = await ev(`(() => { const t = ${clip}.text; return { n: t.caixas.length, fechou: !document.querySelector('.edtx'), festival: t.caixas.some(k => k.trechos.some(r => r.t === 'FESTIVAL')) }; })()`);
  check('Aplicar põe as caixas no clipe e fecha o editor', depois.fechou && depois.festival && depois.n > antes, JSON.stringify(depois));
  const g = await pos('#clipTitle'); await click(g.x, g.y);
  await key('z', 'KeyZ', 90, 2); await wait(300);
  check('Ctrl+Z do programa volta ao texto de antes do editor', await ev(`${P}.state.layers[0].clips[0].text.caixas.length`) === antes);
  await key('y', 'KeyY', 89, 2); await wait(300);
}
// 10. salvar e abrir guardam as caixas, os trechos, o efeito e a animação
{
  const r = await ev(`(async () => { const p = ${P}; const json = JSON.stringify(p.comps.serialize ? p.comps.serialize() : null); return json ? json.length : -1; })()`);
  const ok = await ev(`(async () => {
    const p = ${P}, C = p.C, c = p.state.layers[0].clips[0];
    const o = JSON.parse(JSON.stringify({ kind: 'text', text: c.text }));
    const n = C.textClip(null, 'cartaz', o.text);
    return JSON.stringify(n.text.caixas) === JSON.stringify(c.text.caixas) && n.name === c.name;
  })()`);
  check('salvar e abrir guardam o cartaz igual', ok);
  void r;
}
// 11. desenho a 30 qps: cinco caixas com efeito e animação, 1920×1080
{
  const ms = await ev(`(async () => {
    const { desenharCartaz, novaCaixa } = await import('./cartaz.js');
    const fx = ['neon', 'contorno', 'eco', 'glitch', 'fundo'], an = ['pulso', 'subir', 'piscar', 'tremer', 'bloco'];
    const t = { fundo: 'lin', caixas: fx.map((f, i) => novaCaixa({ trechos: [{ t: 'CAIXA ' + i + ' TESTE' }], f: 'Rubik', peso: 900, s: 6, y: 12 + i * 18, fx: { tipo: f, forca: 60, cor: '#ff3c9e' }, an: { tipo: an[i], batidas: 1, por: 'letra' } })) };
    const cv = document.createElement('canvas'); cv.width = 1920; cv.height = 1080; const B = { beat: 0 };
    for (let i = 0; i < 5; i++) desenharCartaz(cv, t, B, i / 30);
    const t0 = performance.now(); for (let i = 0; i < 40; i++) { B.beat = i / 15; desenharCartaz(cv, t, B, i / 30); } return (performance.now() - t0) / 40;
  })()`);
  check('cinco caixas com efeito e animação desenham em menos de 20 ms (30 qps)', ms < 20, ms.toFixed(1) + ' ms por quadro');
}
await ev(`(() => { const p = ${P}; document.querySelectorAll('.edtx').forEach(d => d.remove()); p.clearCell(0, 0); p.render(); return 1; })()`);
console.log(`${n} verificações, ${falhas} falha(s) — ${falhas ? 'REPROVADO: ' + ruins.join(', ') : 'APROVADO'}`);
ws.close(); process.exit(falhas ? 1 : 0);
