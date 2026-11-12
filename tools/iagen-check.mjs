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
  const f = await ev(`(${clip}.fx || []).filter(x => x.iagen).map(x => [x.id, Object.keys(x.panim || {}).join('+'), x.panim && x.panim.sc && x.panim.sc.shape])`);
  check('Ken Burns põe um Transform com a escala andando devagar', f.length === 1 && f[0][0] === 'transform' && f[0][2] === 'lfo', JSON.stringify(f));
  const lb = await pos('#clipPan .iagen [data-depois="batida"]'); await click(lb.x, lb.y); await wait(300);
  const f2 = await ev(`(${clip}.fx || []).filter(x => x.iagen).map(x => x.panim.sc.shape + ':' + x.panim.sc.beats)`);
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
// 8. Higgsfield (plano 09-03), com o servidor de mentira: PROJ_HIGGS=1 e o programa aberto com PROJ_HIGGS_URL=http://127.0.0.1:18089.
//    Sem PROJ_HIGGS (programa instalado), só confere que a linha está no diálogo.
{
  const D = 'window.projDesktop.iaImg', antes = await ev(`${D}.config()`);
  await ev(`(() => { ${P}.panels.ctx.iaImgDialog(() => { }); return 1; })()`); await wait(500);
  const lin = await pos('.dlg .iasrv[data-srv="higgsfield"]');
  check('Configuração › IA (imagens) tem a linha Higgsfield (SOUL 2), pago', !!lin && await ev(`/Higgsfield \\(SOUL 2\\)/.test(document.querySelector('.dlg .iasrv[data-srv="higgsfield"]').textContent) && !!document.querySelector('.dlg .iasrv[data-srv="higgsfield"] .iapreco.pago')`));
  await click(lin.x, lin.y); await wait(300);
  const campo = await pos('.dlg input[type=password]');
  check('clicar no Higgsfield mostra o campo da chave com a dica ID:segredo', !!campo && /ID:segredo/.test(await ev(`document.querySelector('.dlg input[type=password]').placeholder`)) || (antes.temChave.higgsfield && !!campo));
  if (!process.env.PROJ_HIGGS || antes.temChave.higgsfield) {
    await key('Escape', 'Escape', 27); await wait(300); await ev(`document.querySelectorAll('.dlg, .dlgOver').forEach(d => d.remove()); 1`);
    if (antes.temChave.higgsfield) console.log('(já há chave do Higgsfield guardada: o teste com o servidor de mentira fica de fora para não trocá-la)');
  } else {
    const F = 'http://127.0.0.1:' + (process.env.PROJ_HIGGS_PORT || 18089);
    const { subir } = await import('./higgs-falso.mjs'); let falso = null; try { falso = await subir(Number(process.env.PROJ_HIGGS_PORT || 18089)); } catch { }   // já pode estar de pé
    const lg = async () => (await fetch(F + '/__log')).json(), limpa = () => fetch(F + '/__limpar');
    await click(campo.x, campo.y); await send('Input.insertText', { text: 'teste-id:teste-segredo' }); await wait(200);
    const ok = await ev(`(() => { const b = [...document.querySelectorAll('.dlg button')].find(x => x.textContent.trim() === 'OK'); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`); await click(ok.x, ok.y); await wait(500);
    const cfg = await ev(`${D}.config()`);
    check('OK guarda o Higgsfield como serviço e a chave (a página só sabe que existe)', cfg.servico === 'higgsfield' && cfg.temChave.higgsfield && !JSON.stringify(cfg).includes('segredo'), JSON.stringify(cfg));
    await ev(`(() => { window.__iaImgServico = undefined; ${P}.panels.render(); return 1; })()`); await wait(300);
    const gerar = async (texto, qtd) => {
      await ev(`(() => { ${clip}.iagen.pedido = ${JSON.stringify(texto)}; ${clip}.iagen.erro = ''; ${P}.panels.render(); return 1; })()`); await wait(200);
      const q = await pos(`#clipPan .iagen [data-qtd="${qtd}"]`); await click(q.x, q.y);
      const g = await pos('#clipPan .iagen [data-k=gerar]'); await click(g.x, g.y);
      for (let i = 0; i < 150 && await ev(`${clip}.iagen.gerando`); i++) await wait(200); await wait(400);
    };
    await limpa(); const v0 = await ev(`${clip}.iagen.versoes.length`);
    await gerar('farol na tempestade', 1);
    let l = await lg();
    check('✦ Gerar manda ao Higgsfield o cabeçalho Key ID:segredo, SOUL 2, 16:9, 720p', l.length === 1 && l[0].auth === 'Key teste-id:teste-segredo' && l[0].body.aspect_ratio === '16:9' && l[0].body.resolution === '720p' && l[0].body.batch_size === 1 && /farol/.test(l[0].body.prompt) && !!l[0].idem, JSON.stringify(l));
    check('a imagem do Higgsfield entra no clipe, gravada em Vídeos\\\\OpenLuz\\\\IA', await ev(`${clip}.iagen.versoes.length`) === v0 + 1 && !(await ev(`${clip}.iagen.erro`)) && /OpenLuz[\\/]IA[\\/]farol/i.test(await ev(`${clip}.path`)), await ev(`${clip}.iagen.erro || ${clip}.path`));
    await limpa(); await gerar('farol na tempestade', 4); l = await lg();
    check('Quantas 4 faz quatro versões, uma imagem por pedido (nada pago e jogado fora)', l.length === 4 && l.every(x => x.body.batch_size === 1) && await ev(`${clip}.iagen.versoes.length`) === v0 + 5, l.length + ' pedidos');
    await limpa();
    await ev(`(() => { const e = document.querySelector('#clipPan .iagen .iav[data-v="0"] [data-k=maior]'); e.style.opacity = 1; e.parentElement.style.opacity = 1; return 1; })()`);
    { const m = await pos('#clipPan .iagen .iav[data-v="0"] [data-k=maior]'); await click(m.x, m.y); for (let i = 0; i < 150 && await ev(`${clip}.iagen.gerando`); i++) await wait(200); await wait(300); }
    l = await lg(); check('Fazer maior pede 1080p ao Higgsfield', l.length >= 1 && l.every(x => x.body.resolution === '1080p'), JSON.stringify(l.map(x => x.body.resolution)));
    await gerar('teste #creditos', 1);
    check('sem crédito (403 not_enough_credits, como a API real) diz sem crédito, não chave recusada', /sem crédito no Higgsfield/.test(await ev(`${clip}.iagen.erro`)), await ev(`${clip}.iagen.erro`));
    check('quando não adianta insistir aparece o botão Usar o Pollinations (grátis)', await ev(`!!document.querySelector('#clipPan [data-k=usarGratis]')`));
    await gerar('teste #402', 1);
    check('sem saldo (402) avisa em português', /sem crédito/.test(await ev(`${clip}.iagen.erro`)), await ev(`${clip}.iagen.erro`));
    await gerar('teste #nsfw', 1);
    check('recusado pela moderação avisa em português', /modera/.test(await ev(`${clip}.iagen.erro`)), await ev(`${clip}.iagen.erro`));
    await gerar('teste #failed', 1);
    check('falha do Higgsfield avisa em português', /não conseguiu gerar/.test(await ev(`${clip}.iagen.erro`)), await ev(`${clip}.iagen.erro`));
    const n1 = await ev(`${clip}.iagen.versoes.length`); await gerar('farol depois do erro', 1);
    check('depois dos erros o próximo pedido funciona', await ev(`${clip}.iagen.versoes.length`) === n1 + 1 && !(await ev(`${clip}.iagen.erro`)));
    // a chave longe da página, da composição e do log
    const naPagina = await ev(`(() => document.documentElement.outerHTML.includes('teste-segredo') || JSON.stringify(Object.entries(localStorage)).includes('teste-segredo') || JSON.stringify(${P}.C.serializeClip(${clip})).includes('teste-segredo'))()`);
    const fs = await import('node:fs'), path = await import('node:path');
    let noLog = false; for (const d of ['OpenLuz', 'openluz']) { try { noLog = noLog || fs.readFileSync(path.join(process.env.APPDATA, d, 'openluz.log'), 'utf8').includes('teste-segredo'); } catch { } }
    check('a chave não aparece na página, no localStorage, na composição nem no openluz.log', !naPagina && !noLog);
    // devolve como estava: apaga a chave de teste e volta o serviço
    await ev(`window.projDesktop.ia.salvar({ para: 'higgsfield', chave: '' })`); await ev(`${D}.servico(${JSON.stringify(antes.servico)})`);
    if (falso) falso.srv.close();
  }
}
await ev(`(() => { window.__iaImgServico = undefined; ${P}.clearCell(0, 0); ${P}.render(); return 1; })()`);
console.log(`${n} verificações, ${falhas} falha(s) — ${falhas ? 'REPROVADO: ' + ruins.join(', ') : 'APROVADO'}`);
ws.close(); process.exit(falhas ? 1 : 0);
