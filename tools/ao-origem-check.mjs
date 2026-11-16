// Origens da entrada do slice na Saída avançada (plano 07-09): Camada selecionada, Grupo selecionado, Bus A, Bus B e as
// opções "Opacidade da camada" e "Bypass/Solo da camada", com mouse e teclado REAIS pelo CDP no painel e nos menus.
// O estado da grade (opacidade, bypass, bus, crossfader) é posto direto no que o programa expõe; os pixels vêm da tela.
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/ao-origem-check.mjs
//
// Medido no Resolume (.paul/phases/07-saida-avancada/07-09-MEDIDAS.md): com Input Opacity ligado o slice escurece junto
// com a camada, desligado mostra a camada inteira; com Input Bypass/Solo ligado o slice some quando a camada está em
// bypass, desligado continua mostrando. Bus A e Bus B NÃO foram medidos lá (a API recusou o crossfader): aqui, cada bus
// é só o que está nele, sem depender da posição do crossfader.
// Prévia e outra tela como fonte (plano 07-16) também NÃO foram medidas no Resolume (o Arena não abriu os menus): a Prévia é o
// clipe do quadro Prévia; a tela é a saída pronta dela (com máscara), esticada no quadro da composição.
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const click = async (x, y, n = 1) => { await mouse('mouseMoved', x, y, { buttons: 0 }); for (let i = 1; i <= n; i++) { await mouse('mousePressed', x, y, { clickCount: i }); await mouse('mouseReleased', x, y, { clickCount: i }); } await wait(300); };
const drag = async (x0, y0, x1, y1, mods = 0) => { await mouse('mouseMoved', x0, y0, { buttons: 0, modifiers: mods }); await mouse('mousePressed', x0, y0, { modifiers: mods }); for (let k = 1; k <= 10; k++) { await mouse('mouseMoved', x0 + (x1 - x0) * k / 10, y0 + (y1 - y0) * k / 10, { modifiers: mods }); await wait(20); } await mouse('mouseReleased', x1, y1, { modifiers: mods }); await wait(300); };
const cl = async (expr, n = 1) => { const r = await ev(`const e = (${expr}); if (!e) return null; e.scrollIntoView && e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;`); if (!r) throw new Error('não achei na tela: ' + expr.slice(0, 90)); await click(r.x, r.y, n); };
const texto = (t) => `[...document.querySelectorAll('button, .mi, .tab, .lb, label, span, div')].filter(e => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(t)} && e.getBoundingClientRect().width > 0).sort((a, b) => (b.tagName === 'BUTTON') - (a.tagName === 'BUTTON'))[0]`;
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
// quatro pontos dentro do slice de cima (dois caem em casa branca do xadrez, dois em preta) e um fora
const PTS = [[0.3, 0.3], [0.4, 0.45], [0.6, 0.55], [0.7, 0.7], [0.05, 0.1]];
const pix = async () => { await wait(250); return ev(`const a = S.screens; return P.engine.probeScreen(a[0], S.layers, a, ${JSON.stringify(PTS)}).map(c => c[0]);`); };
const j = (v) => JSON.stringify(v), perto = (a, b, t = 3) => Math.abs(a - b) <= t;
const brancos = (p, v) => perto(p[0], v) && perto(p[1], v) && p[2] === 0 && p[3] === 0;   // o xadrez visto pelo slice, com os brancos em v
const preto = (p) => p.slice(0, 4).every(c => c === 0);
const caixa = (rot) => `([...document.querySelectorAll('#aoProps > *')].find(r => r.textContent.trim().startsWith(${JSON.stringify(rot)})) || { querySelector() { return null; } }).querySelector('.ck')`;
const abre = async () => { await cl(`document.querySelector('#btnAO')`); await wait(700); await cl(`document.querySelector('#aoTabOut')`); await wait(300); await cl(`[...document.querySelectorAll('#aoList .row.item')].find(r => /Slice 2/.test(r.textContent))`); await wait(300); };
const salva = async () => { await cl(`document.querySelector('#aoOk')`); await wait(600); };
const fonte = async (rot) => { await cl(`document.querySelector('#aoProps select')`); await ev(`const s = document.querySelector('#aoProps select'), o = [...s.options].find(x => x.textContent.trim() === ${JSON.stringify(rot)}); if (!o) throw new Error('a Fonte não tem a opção ' + ${JSON.stringify(rot)}); s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); return 1;`); await wait(400); };
const sl2 = () => ev(`const it = S.screens[0].items.find(i => i.name === 'Slice 2'); return it ? { fonte: it.source, op: it.inOpacity !== false, by: it.inBypass !== false, bg: !!it.blackBg } : null;`);

try {
  await cl(`document.querySelector('.cell[data-layer="0"][data-col="0"]')`);
  await cl(`[...document.querySelectorAll('#browserTabs span')].find(e => e.textContent.trim() === 'Fontes')`);
  await cl(`[...document.querySelectorAll('#browserPan .item')].find(e => e.textContent.trim() === 'Checkered')`, 2);
  await cl(`document.querySelector('.cell[data-layer="0"][data-col="0"]')`); await wait(500);
  confere('preparo: Checkered no ar na Camada 5', await ev(`return S.layers[0].on === 0 && !!S.layers[0].clips[0];`));
  await cl(`document.querySelector('#btnAO')`); await wait(700); await cl(`document.querySelector('#aoTabOut')`); await wait(300);
  await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="slice"]')`); await wait(500);
  const opcoes = await ev(`return [...document.querySelector('#aoProps select').options].map(o => o.textContent.trim()).join(' | ');`);
  confere('a Fonte tem Composição, Prévia, Bus A, Bus B, Grupo selecionado, Camada selecionada e as camadas', opcoes.startsWith('Composição | Prévia | Bus A | Bus B | Grupo selecionado | Camada selecionada | Camada 5'), opcoes);
  confere('com uma tela só, a Fonte não oferece tela nenhuma (a própria não entra)', !opcoes.includes(await ev(`return S.screens[0].name;`)), opcoes);
  confere('lendo a composição, as caixas da camada não aparecem', await ev(`return !(${caixa('Opacidade da camada')}) && !(${caixa('Bypass/Solo da camada')});`));
  await cl(caixa('Fundo preto'));   // com fundo preto, o que o slice não desenha fica preto em vez de mostrar o slice de baixo
  const ref = await pix(); confere('preparo: o slice mostra o xadrez (dois pontos brancos, dois pretos)', brancos(ref, 255), j(ref));

  // ---- Camada selecionada
  await fonte('Camada selecionada');
  confere('lendo uma camada, aparecem "Opacidade da camada" e "Bypass/Solo da camada", ligadas', await ev(`const a = ${caixa('Opacidade da camada')}, b = ${caixa('Bypass/Solo da camada')}; return !!a && !!b && a.classList.contains('on') && b.classList.contains('on');`));
  await salva();
  await cl(`document.querySelector('.cell[data-layer="1"][data-col="5"]')`); let p = await pix();
  confere('Camada selecionada: com a Camada 4 (vazia) selecionada, o slice fica preto', await ev(`return S.selLayer === 1;`) && preto(p), j(p));
  await cl(`document.querySelector('.cell[data-layer="0"][data-col="5"]')`); await wait(200); await cl(`document.querySelector('.cell[data-layer="0"][data-col="0"]')`); p = await pix();
  confere('Camada selecionada: de volta à Camada 5, o slice mostra o xadrez', await ev(`return S.selLayer === 0 && S.layers[0].on === 0;`) && brancos(p, 255), j(p));

  // ---- Opacidade da camada
  await abre(); await fonte('Camada 5'); await salva();
  await ev(`S.layers[0].opacity = 0.5; return 1;`); p = await pix();
  confere('camada a 50% com "Opacidade da camada" ligada: o slice escurece junto', brancos(p, 128, 4), j(p));
  await abre(); await cl(caixa('Opacidade da camada')); await salva(); p = await pix();
  confere('desligada: o slice mostra a camada inteira, e a composição continua a 50%', !(await sl2()).op && brancos(p, 255), j(p));
  await ev(`S.layers[0].opacity = 1; return 1;`);

  // ---- Bypass/Solo da camada
  await ev(`S.layers[0].bypass = true; return 1;`); p = await pix();
  confere('camada em bypass com "Bypass/Solo da camada" ligado: o slice some', preto(p), j(p));
  await abre(); await cl(caixa('Bypass/Solo da camada')); await salva(); p = await pix();
  confere('desligado: o slice continua mostrando a camada em bypass', !(await sl2()).by && brancos(p, 255), j(p));
  await ev(`S.layers[0].bypass = false; S.layers[1].solo = true; return 1;`); p = await pix();
  confere('outra camada em solo, com a opção desligada: o slice continua mostrando', brancos(p, 255), j(p));
  await abre(); await cl(caixa('Bypass/Solo da camada')); await salva(); p = await pix();
  confere('ligado de novo, com outra camada em solo: o slice some', (await sl2()).by && preto(p), j(p));
  await ev(`S.layers[1].solo = false; return 1;`);

  // ---- Bus A e Bus B
  await ev(`S.layers[0].bus = 'A'; S.xfade.pos = 1; return 1;`);
  await abre(); await fonte('Bus A'); await salva(); p = await pix();
  confere('camada no Bus A e crossfader todo em B: a composição apaga, o slice lendo Bus A mostra a camada', perto(p[4], 0) && brancos(p, 255), j(p));
  await ev(`S.xfade.pos = 0; return 1;`); p = await pix(); confere('crossfader todo em A: o Bus A continua igual', brancos(p, 255), j(p));
  await abre(); await fonte('Bus B'); await salva(); p = await pix();
  confere('lendo Bus B, que está vazio: o slice fica preto', preto(p), j(p));
  await ev(`S.layers[0].bus = null; S.xfade.pos = 0.5; return 1;`);

  // ---- Grupo selecionado
  await abre(); await fonte('Grupo selecionado'); await salva(); p = await pix();
  confere('Grupo selecionado sem grupo nenhum: o slice fica preto', preto(p), j(p));
  await cl(`document.querySelector('.cell[data-layer="0"][data-col="5"]')`); await wait(200); await cl(`document.querySelector('.cell[data-layer="0"][data-col="0"]')`);
  await cl(texto('Grupo')); await wait(250); await cl(texto('Novo (com a camada selecionada)')); await wait(500); p = await pix();
  confere('criado um grupo com a Camada 5 (ele fica selecionado): o slice mostra o grupo', await ev(`return S.groups.length === 1 && S.selGroup === S.groups[0].id && S.layers[0].group === S.groups[0].id;`) && brancos(p, 255), j(p));
  await ev(`S.groups[0].opacity = 0.5; return 1;`); p = await pix();
  confere('grupo a 50%: o slice lendo o grupo escurece junto', brancos(p, 128, 4), j(p));
  await ev(`S.groups[0].opacity = 1; return 1;`);

  // ---- Prévia (07-16)
  await abre(); await fonte('Prévia'); await salva();
  await ev(`P.engine._on0 = S.layers[0].on; S.layers[0].on = -1; S.pv = null; return 1;`); p = await pix();
  confere('clipe fora do ar e Prévia vazia: tudo preto', (await sl2()).fonte === 'preview' && preto(p) && perto(p[4], 0), j(p));
  await cl(`document.querySelector('.cell[data-layer="0"][data-col="0"] .nm')`); await wait(300); p = await pix();
  confere('clipe mandado para a Prévia (clique no nome), ainda fora do ar: a composição segue apagada e o slice mostra a Prévia', await ev(`return !!S.pv && S.pv.l === 0 && S.pv.c === 0 && S.layers[0].on === -1;`) && perto(p[4], 0) && brancos(p, 255), j(p));
  await ev(`S.pv = null; return 1;`); p = await pix();
  confere('Prévia esvaziada: o slice deixa de desenhar', await ev(`return P.engine.sourceTex(S.screens[0].items.find(i => i.name === 'Slice 2'), S.layers) === null;`) && preto(p), j(p));
  await ev(`S.layers[0].on = P.engine._on0; delete P.engine._on0; return 1;`); await wait(200);

  // ---- outra tela (07-16)
  await abre(); await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="screen"]')`); await wait(400);
  await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="maskRect"]')`); await wait(400);
  // a máscara da Tela 2 vira uma janela no canto de cima à esquerda: assim dá para ver se a imagem chega de pé e sem espelhar
  const t2 = await ev(`const sc = P.ao.screens()[1], m = sc && sc.items.find(i => i.type === 'mask'); if (!m) return null;
    m.pts = [[0.05, 0.05], [0.5, 0.05], [0.5, 0.5], [0.05, 0.5]].map(([x, y]) => [x * sc.w, y * sc.h]); m.invert = true; m.rev++; P.ao.c.onChange(); P.ao.refresh(); return { nome: sc.name, uid: sc.uid, w: sc.w, h: sc.h };`);
  confere('preparo: Tela 2 criada com um slice e uma máscara em janela', !!t2, j(t2));
  await cl(`[...document.querySelectorAll('#aoList .row.item')].find(r => /Slice 2/.test(r.textContent))`); await wait(300);
  const op2 = await ev(`return [...document.querySelector('#aoProps select').options].map(o => o.textContent.trim());`);
  confere('com duas telas, a Fonte do slice da Tela 1 oferece a Tela 2 e não a própria', op2.includes(t2.nome) && !op2.includes(await ev(`return P.ao.screens()[0].name;`)), op2.join(' | '));
  await fonte(t2.nome); await salva(); await wait(400);
  const G = [0.1, 0.2, 0.3, 0.4, 0.6, 0.8], uv = G.flatMap(v => G.map(u => [u, v]));
  const cmp = await ev(`const a = S.screens, s0 = a[0], it = s0.items.find(i => i.name === 'Slice 2'), xs = it.warp.pts.map(q => q[0]), ys = it.warp.pts.map(q => q[1]);
    const bx = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }, uv = ${j(uv)}, E = P.engine;
    const meu = E.probeScreen(s0, S.layers, a, uv.map(([u, v]) => [(bx.x + u * bx.w) / s0.w, (bx.y + v * bx.h) / s0.h])).map(c => c[0]);
    const dela = E.probeScreen(a[1], S.layers, a, uv.map(([u, v]) => [(it.in.x + u * it.in.w) / E.W, (it.in.y + v * it.in.h) / E.H])).map(c => c[0]);
    return { fonte: it.source, meu, dela, aberta: !!(a[1].win && !a[1].win.closed) };`);
  const dentro = (k) => uv[k][0] < 0.5 && uv[k][1] < 0.5;
  confere('preparo: a saída da Tela 2 só tem imagem na janela da máscara (canto de cima à esquerda)', cmp.dela.some((c, k) => dentro(k) && c > 200) && cmp.dela.every((c, k) => dentro(k) || c === 0), j(cmp.dela));
  confere('Fonte = Tela 2: o slice mostra a saída pronta dela, com a máscara, de pé e sem espelhar, com a janela dela fechada',
    cmp.fonte === 'screen:' + t2.uid && !cmp.aberta && cmp.meu.every((c, k) => perto(c, cmp.dela[k], 6)), j(cmp.meu));
  const ida = await ev(`const M = await import(new URL('./screens.js', location.href).href), it = M.deserialize(M.serialize(S.screens))[0].items.find(i => i.name === 'Slice 2'); return it ? it.source : null;`);
  confere('salvar e abrir (preset) guarda a tela como fonte', ida === 'screen:' + t2.uid, j(ida));
  // polígono: as mesmas fontes
  await abre(); await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="polyTri"]')`); await wait(400);
  const opP = await ev(`return [...document.querySelector('#aoProps select').options].map(o => o.textContent.trim());`);
  await ev(`const s = document.querySelector('#aoProps select'), o = [...s.options].find(x => x.textContent.trim() === 'Prévia'); s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); return 1;`); await wait(300);
  const pol = await ev(`const it = P.ao.sel.item; return { tipo: it.type, fonte: it.source };`);
  confere('o polígono tem as mesmas fontes novas', opP.includes('Prévia') && opP.includes(t2.nome) && pol.tipo === 'poly' && pol.fonte === 'preview', j(pol));
  await ev(`P.ao.removeItem(P.ao.sel.item); return 1;`); await wait(300);
  // apagada a Tela 2, o slice não desenha nada e nada quebra
  await cl(`[...document.querySelectorAll('#aoList .row.screen')][1]`); await wait(300); await cl(texto('Apagar esta tela')); await wait(400);
  for (let i = 0; i < 2 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) { await cl(`[...document.querySelectorAll('.dlgOver button')].pop()`); await wait(300); }
  await salva(); await wait(400); p = await pix();
  confere('apagada a Tela 2: o slice deixa de desenhar e o programa segue', await ev(`return S.screens.length === 1 && P.engine.sourceTex(S.screens[0].items.find(i => i.name === 'Slice 2'), S.layers) === null;`) && p.length === 5, j(p));

  // ---- a cópia passa por salvar e abrir
  await abre(); await fonte('Camada selecionada'); await wait(200);   // "Opacidade da camada" segue desligada desde o teste dela, lá em cima
  const svg = await ev(`const s = document.querySelector('#aoSvg'), r = s.getBoundingClientRect(); return { x: r.left, y: r.top, k: r.width / +s.getAttribute('viewBox').split(' ')[2] };`);
  await drag(svg.x + 960 * svg.k, svg.y + 500 * svg.k, svg.x + 960 * svg.k + 50, svg.y + 500 * svg.k, 1);
  const c = await ev(`const it = P.ao.sel.item; return { nome: it.name, fonte: it.source, op: it.inOpacity !== false, by: it.inBypass !== false };`);
  confere('a cópia (Alt + arrastar) guarda a fonte e as opções', c.nome !== 'Slice 2' && c.fonte === 'sel' && c.op === false && c.by === true, j(c));
  await cl(`document.querySelector('#aoCancel')`); await wait(500);
  for (let i = 0; i < 2 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) await cl(`[...document.querySelectorAll('.dlgOver button')].pop()`);
} catch (e) { ruim++; console.log('PAROU: ' + String(e.message).slice(0, 400)); }
console.log(`\n${ok + ruim} verificações, ${ruim} falha(s) — ${ruim ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(ruim ? 1 : 0);
