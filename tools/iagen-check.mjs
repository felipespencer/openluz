// ✦ IA generativa (plano 09-02): fonte própria, pedido escrito no teclado, Quantas, ✦ Gerar com o serviço de mentira (sem rede),
// versões, escolher outra versão, Ken Burns e Loop na batida, Ctrl+Z, salvar e abrir, e a chave longe da página. Mouse e teclado REAIS pelo CDP.
// Uso: node tools/iagen-check.mjs (programa aberto com --remote-debugging-port=9333; limpa a casa no fim)
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLuz');
if (!page) { console.error('janela do OpenLuz não achada'); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const btn = (type, x, y, n = 1) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: n });
const click = async (x, y) => { await btn('mouseMoved', x, y); await btn('mousePressed', x, y); await btn('mouseReleased', x, y); await wait(200); };
const dbl = async (x, y) => { await click(x, y); await btn('mousePressed', x, y, 2); await btn('mouseReleased', x, y, 2); await wait(500); };
const key = async (k, code, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await wait(150); };
let falhas = 0, n = 0; const ruins = [];
const check = (nome, ok, extra = '') => { n++; if (!ok) { falhas++; ruins.push(nome); } console.log((ok ? 'OK    ' : 'FALHA ') + nome + (extra ? '  — ' + extra : '')); };
const P = 'window.projecionista', clip = `${P}.state.layers[0].clips[0]`;
const pos = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
const achar = async (nome) => {
  for (let k = 0; k < 20; k++) {
    const p = await ev(`(() => { const e = [...document.querySelectorAll('.flist .item')].find(x => x.textContent === ${JSON.stringify(nome)}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await wait(400);
    if (p && await ev(`(() => { const e = document.elementFromPoint(${p.x}, ${p.y}); const it = e && e.closest('.flist .item'); return !!it && it.textContent === ${JSON.stringify(nome)}; })()`)) return p;
  }
  return null;
};
const esperar = async () => { for (let i = 0; i < 100 && await ev(`!!${clip} && !!${clip}.iagen && ${clip}.iagen.gerando`); i++) await wait(200); await wait(400); };

await ev(`(() => { const p = ${P}; p.menubar.close(); document.querySelectorAll('.dlg, .dlgOver, .edtx').forEach(d => d.remove()); p.clearCell(0, 0); p.state.sel = { l: 0, c: 0 }; p.state.selLayer = 0; p.render(); window.__iaImgServico = 'falso'; return 1; })()`);
{ const t = await pos('#clipTitle'); await click(t.x, t.y); }   // o primeiro clique só acorda a janela
await ev(`(() => { const b = ${P}.browser; b.search = ''; b.setTab('src'); return 1; })()`); await wait(2500);
// 1. a fonte e o painel
{
  for (let k = 0; k < 3 && !(await ev(`!!${clip} && !!${clip}.iagen`)); k++) { const it = await achar('✦ IA generativa'); await dbl(it.x, it.y); await wait(800); }
  check('✦ IA generativa (duplo clique em Fontes) põe a casa com a imagem de espera', await ev(`!!${clip} && ${clip}.kind === 'image' && /espera\\.png$/.test(${clip}.path)`));
  await ev(`(() => { ${P}.panels.tab = 'clip'; ${P}.render(); return 1; })()`); await wait(300);
  check('o painel tem pedido, estilo, proporção, quantas, depois e ✦ Gerar', await ev(`!!document.querySelector('#clipPan .iagen [data-k=gerar]') && document.querySelectorAll('#clipPan .iagen [data-estilo]').length === 9 && document.querySelectorAll('#clipPan .iagen [data-prop]').length === 4 && document.querySelectorAll('#clipPan .iagen [data-depois]').length === 3`));
}
// 2. pedido escrito no teclado, Quantas 2, ✦ Gerar
{
  const ta = await pos('#clipPan .iagen textarea'); await click(ta.x, ta.y);
  await send('Input.insertText', { text: 'onda do mar em xilogravura' }); await wait(200);
  await ev(`document.activeElement.blur(); 1`); await wait(200);
  const q = await pos('#clipPan .iagen [data-qtd="2"]'); await click(q.x, q.y);
  const g = await pos('#clipPan .iagen [data-k=gerar]'); await click(g.x, g.y);
  await esperar();
  const r = await ev(`(() => { const c = ${clip}; return { pedido: c.iagen.pedido, n: c.iagen.versoes.length, path: c.path, esc: c.iagen.esc, erro: c.iagen.erro, w: c.w, nome: c.name }; })()`);
  check('o pedido escrito fica guardado', r.pedido === 'onda do mar em xilogravura', r.pedido);
  check('✦ Gerar faz duas versões em arquivo, em Vídeos\\\\OpenLuz\\\\IA', r.n === 2 && /OpenLuz[\\/]IA[\\/]onda-do-mar/i.test(r.path) && !r.erro, JSON.stringify(r));
  check('a primeira versão entrou no clipe', r.esc === 1 && r.w > 0 && r.nome.startsWith('onda do mar'), JSON.stringify(r));
  check('as versões aparecem como miniaturas', await ev(`document.querySelectorAll('#clipPan .iagen .iav img').length`) === 2);
}
// 3. clicar noutra versão troca a imagem do clipe; Ctrl+Z volta
{
  const antes = await ev(`${clip}.path`);
  const v = await pos('#clipPan .iagen .iav[data-v="0"]'); await click(v.x, v.y); await wait(600);
  const depois = await ev(`${clip}.path`);
  check('clicar noutra versão troca a imagem do clipe', depois !== antes && (await ev(`${clip}.iagen.esc`)) === 0, depois.split(/[\\/]/).pop());
  const t = await pos('#clipTitle'); await click(t.x, t.y);
  await key('z', 'KeyZ', 90, 2); await wait(600);
  check('Ctrl+Z volta a imagem de antes', await ev(`${clip}.path`) === antes);
  await key('y', 'KeyY', 89, 2); await wait(600);
}
// 4. Depois: Ken Burns e Loop na batida viram Transform com ♪
{
  const kb = await pos('#clipPan .iagen [data-depois="kenburns"]'); await click(kb.x, kb.y); await wait(300);
  const f = await ev(`(${clip}.fx || []).filter(x => x.iagen).map(x => [x.id, Object.keys(x.panim || {}).join('+'), x.panim && x.panim.scale && x.panim.scale.shape])`);
  check('Ken Burns põe um Transform com a escala andando devagar', f.length === 1 && f[0][0] === 'transform' && f[0][2] === 'lfo', JSON.stringify(f));
  const lb = await pos('#clipPan .iagen [data-depois="batida"]'); await click(lb.x, lb.y); await wait(300);
  const f2 = await ev(`(${clip}.fx || []).filter(x => x.iagen).map(x => x.panim.scale.shape + ':' + x.panim.scale.beats)`);
  check('Loop na batida troca para um pulso por batida', f2.length === 1 && f2[0] === '1floor:1', JSON.stringify(f2));
  const pa = await pos('#clipPan .iagen [data-depois="parada"]'); await click(pa.x, pa.y); await wait(300);
  check('Imagem parada tira o Transform', await ev(`(${clip}.fx || []).filter(x => x.iagen).length`) === 0);
}
// 5. ↻ variar faz mais uma versão
{
  await ev(`(() => { const e = document.querySelector('#clipPan .iagen .iav[data-v="0"] [data-k=variar]'); e.style.opacity = 1; e.parentElement.style.opacity = 1; return 1; })()`);
  const vr = await pos('#clipPan .iagen .iav[data-v="0"] [data-k=variar]'); await click(vr.x, vr.y); await esperar();
  check('↻ variar faz mais versões', await ev(`${clip}.iagen.versoes.length`) === 4, String(await ev(`${clip}.iagen.versoes.length`)));
}
// 6. salvar e abrir guardam o pedido e as versões; a chave nunca chega à página
{
  const ok = await ev(`(async () => { const p = ${P}, C = p.C, c = ${clip}; const o = JSON.parse(JSON.stringify(C.serializeClip(c))); const n = await C.deserializeClip(o, {}); return !!n && n.path === c.path && n.iagen.pedido === c.iagen.pedido && n.iagen.versoes.length === c.iagen.versoes.length && !n.iagen.gerando; })()`);
  check('salvar e abrir guardam a imagem, o pedido e as versões', ok);
  const cfg = await ev(`window.projDesktop.iaImg.config()`);
  check('a configuração que a página vê não tem chave', !JSON.stringify(cfg).match(/AIza|sk-|"chave"/) && 'temChave' in cfg, JSON.stringify(cfg));
}
// 7. pedido vazio não chama o serviço
{
  await ev(`(() => { ${clip}.iagen.pedido = ''; ${P}.panels.render(); return 1; })()`);
  const g = await pos('#clipPan .iagen [data-k=gerar]'); await click(g.x, g.y); await wait(300);
  check('pedido vazio avisa em português', /escreva o pedido/.test(await ev(`${clip}.iagen.erro`)));
}
await ev(`(() => { window.__iaImgServico = undefined; ${P}.clearCell(0, 0); ${P}.render(); return 1; })()`);
console.log(`${n} verificações, ${falhas} falha(s) — ${falhas ? 'REPROVADO: ' + ruins.join(', ') : 'APROVADO'}`);
ws.close(); process.exit(falhas ? 1 : 0);
