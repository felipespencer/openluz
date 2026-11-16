// Menu Presets da Saída avançada como no Resolume 7.28.1 (plano 07-06), com mouse e teclado REAIS pelo CDP.
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/ao-presets-check.mjs
//
// No Resolume (07-03-DIFERENCAS.md, linha 14): Save, Save as…, Remove, Rename…, New, Show in Explorer, Load…, Export to SVG…
// e a lista sob "Presets". "Mostrar na pasta" e "Abrir…" não são clicados: abrem janelas do Windows que o CDP não fecha; só a
// presença e o estado deles são conferidos. O Exportar SVG… (plano 07-15) é clicado de verdade: a pasta vai por a._svgProva no
// lugar da janela de escolher pasta (só em desenvolvimento e teste), e os arquivos gravados são lidos do disco aqui.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, D = window.projDesktop; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const click = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(300); };
const key = async (k, vk, mods = 0) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: vk, modifiers: mods }); await wait(200); };
const digita = async (t) => { for (const ch of t) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch }); } await wait(150); };
const cl = async (expr) => { const r = await ev(`const e = (${expr}); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;`); if (!r) throw new Error('não achei na tela: ' + expr.slice(0, 90)); await click(r.x, r.y); };
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
const A = 'prova-0706', B = 'prova-0706-b', C = 'prova-0706-c';
const menu = async (k) => { await cl(`document.querySelector('#aoPresetBtn')`); await cl(`document.querySelector('#aoPresetMenu [data-p="${k}"]')`); await wait(400); };
const itens = () => ev(`return [...document.querySelectorAll('#aoPresetMenu [data-p]')].map(b => b.textContent.trim() + (b.disabled ? ' (apagado)' : '')).join(' | ');`);
const dlg = (rot) => `[...document.querySelectorAll('.dlgOver button')].find(b => b.textContent.trim() === ${JSON.stringify(rot)})`;
const nomeia = async (n) => { await wait(200); await key('a', 65, 2); await digita(n); await cl(dlg('OK')); await wait(600); };
const lista = () => ev(`return (await D.presets.list()).filter(n => n.startsWith('prova-0706'));`);
const estado = () => ev(`const a = P.ao; return { nome: a.presetName, rot: document.querySelector('#aoPresetName').textContent, telas: a.screens().length, itens: a.screens()[0].items.map(i => i.type + ':' + i.name).join(',') };`);

try {
  await ev(`for (const n of ['${A}', '${B}', '${C}']) { try { await D.presets.remove(n); } catch { } } return 1;`);
  await cl(`document.querySelector('#btnAO')`); await wait(800);
  await cl(`document.querySelector('#aoPresetBtn')`); const m0 = await itens(); await cl(`document.querySelector('#aoPresetBtn')`);
  confere('menu: Salvar, Salvar como…, Apagar, Renomear…, Novo, Mostrar na pasta, Abrir…, Exportar SVG…', m0.replace(/ \(apagado\)/g, '') === 'Salvar | Salvar como… | Apagar | Renomear… | Novo | Mostrar na pasta | Abrir… | Exportar SVG…', m0);
  confere('sem preset carregado, Salvar, Apagar, Renomear… e Mostrar na pasta ficam apagados; Exportar SVG… fica ligado', m0 === 'Salvar (apagado) | Salvar como… | Apagar (apagado) | Renomear… (apagado) | Novo | Mostrar na pasta (apagado) | Abrir… | Exportar SVG…', m0);
  confere('a lista vem sob o título Presets', await ev(`const h = document.querySelector('#aoPresetMenu .hdr'); return !!h && h.textContent.trim() === 'Presets';`));

  await menu('saveas'); await nomeia(A); let e = await estado();
  confere('Salvar como… pede o nome e grava', e.nome === A && e.rot === A && (await lista()).includes(A), JSON.stringify(e));
  await cl(`document.querySelector('#aoPresetBtn')`); const m1 = await itens(); await cl(`document.querySelector('#aoPresetBtn')`);
  confere('com preset carregado, todos os itens ficam ligados', !m1.includes('apagado'), m1);

  await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="maskRect"]')`); await wait(400);
  confere('antes de Salvar, o arquivo ainda não tem a máscara nova', !(await ev(`return (await D.presets.load('${A}')).includes('"mask"');`)));
  await menu('save'); await wait(400);
  confere('Salvar grava por cima do preset carregado', await ev(`return (await D.presets.load('${A}')).includes('"mask"');`));

  await menu('saveas'); await nomeia(B); e = await estado();
  confere('Salvar como… com outro nome cria outro arquivo', e.nome === B && (await lista()).join() === [A, B].join(), (await lista()).join());
  await menu('saveas'); await nomeia(A); const pergunta = await ev(`const d = document.querySelector('.dlgOver'); return d ? d.innerText.replace(/\\n+/g, ' | ').slice(0, 120) : '';`);
  confere('gravar por cima de outro preset pede confirmação', /Já existe/.test(pergunta), pergunta);
  if (pergunta) { await cl(dlg('Cancelar')); await wait(400); }
  e = await estado(); confere('cancelada a confirmação, nada muda', e.nome === B, JSON.stringify(e));

  await menu('rename'); await nomeia(C); e = await estado();
  confere('Renomear… troca o nome do arquivo', e.nome === C && e.rot === C && (await lista()).join() === [A, C].join(), (await lista()).join());

  await menu('new'); e = await estado();
  confere('Novo: uma tela com a composição inteira, sem nome', e.nome === '' && e.rot === 'Presets' && e.telas === 1 && e.itens === 'slice:Composição inteira', JSON.stringify(e));
  await key('z', 90, 2); e = await estado();
  confere('Ctrl+Z depois de Novo traz de volta o que havia', /mask:/.test(e.itens), JSON.stringify(e));

  await cl(`document.querySelector('#aoPresetBtn')`); await cl(`[...document.querySelectorAll('#aoPresetMenu button.pr')].find(b => b.textContent.trim() === '${A}')`); await wait(600); e = await estado();
  confere('clicar num nome da lista carrega o preset', e.nome === A && /mask:/.test(e.itens), JSON.stringify(e));

  await menu('remove'); const p2 = await ev(`const d = document.querySelector('.dlgOver'); return d ? d.innerText.replace(/\\n+/g, ' | ').slice(0, 120) : '';`);
  confere('Apagar pede confirmação', /Apagar o preset/.test(p2), p2);
  await cl(dlg('OK')); await wait(1200); e = await estado();
  confere('confirmado, o preset sai da lista e o editor fica sem nome', e.nome === '' && !(await lista()).includes(A), (await lista()).join());

  // ---------- Exportar SVG… (07-15) ----------
  const pasta = path.join(os.tmpdir(), 'openluz-svg-prova'); fs.rmSync(pasta, { recursive: true, force: true }); fs.mkdirSync(pasta, { recursive: true });
  const P1 = JSON.stringify(pasta), arqs = () => fs.readdirSync(pasta).sort();
  await menu('new'); await wait(300);
  for (const k of ['slice', 'polyTri', 'maskRect', 'screen']) { await cl(`document.querySelector('#aoAdd')`); await cl(`document.querySelector('#aoAddMenu [data-add="${k}"]')`); await wait(350); }
  // por dentro, só o que o mouse não alcança depressa: nomes difíceis, entrada girada, um canto fora do lugar e um slice de malha
  const mod = await ev(`const a = P.ao, t = a.screens(), [s0, s1] = t[0].items.filter(i => i.type === 'slice');
    t[1].name = 'Tela 2: lateral/esq'; s0.name = 'A&B "x" <1>'; s0.in.rot = 30; s0.warp.pts[0] = [248.4711, 152.5]; s0.rev++;
    const M = await import(new URL('./screens.js', location.href).href); M.setWarpMode(s1, 'mesh');
    a.c.onChange(); a.refresh();
    return { telas: t.map(sc => ({ name: sc.name, w: sc.w, h: sc.h, itens: sc.items.map(i => ({ type: i.type, name: i.name, modo: i.warp ? i.warp.mode : '', cantos: i.warp && i.warp.mode === 'corners' ? i.warp.pts : null, inr: i.in || null, inPts: i.inPts || null, outPts: i.outPts || null, pts: i.type === 'mask' ? i.pts : null })) })), comp: [a.c.compW, a.c.compH] };`).catch(e => ({ erro: e.message }));
  confere('saída de prova montada (duas telas, slice de cantos, slice de malha, polígono, máscara)', !mod.erro && mod.telas.length === 2 && mod.telas[0].itens.map(i => i.type + i.modo).join() === 'slicecorners,slicemesh,poly,mask', JSON.stringify(mod).slice(0, 300));
  await ev(`P.ao._svgProva = 'cancelar'; return 1;`); await menu('svg'); await wait(500);
  confere('Exportar SVG… cancelado não grava nada', arqs().length === 0, arqs().join());
  await ev(`P.ao._svgProva = ${P1}; return 1;`); await menu('svg'); await wait(900);
  const esperados = ['Input.svg', 'Output1_' + mod.telas[0].name + '.svg', 'Output2_Tela 2_ lateral_esq.svg'].sort();
  confere('grava Input.svg e um Output<N>_<tela>.svg por tela; caractere proibido no nome vira _', arqs().join('|') === esperados.join('|'), arqs().join(' | '));
  const aviso = await ev(`return document.querySelector('#toast').textContent;`);
  confere('avisa quantos arquivos gravou e onde', /^3 arquivos SVG gravados em /.test(aviso), aviso);
  const le = (n) => { try { return fs.readFileSync(path.join(pasta, n), 'utf8'); } catch { return ''; } };
  // lê cada arquivo com o leitor de XML do navegador: { erro, w, h, viewBox, grupos: [{ id, itens: [{ tag, id, n: [números] }] }] }
  const xml = (t) => ev(`const d = new DOMParser().parseFromString(${JSON.stringify(t)}, 'image/svg+xml'), r = d.documentElement;
    return { erro: !!d.querySelector('parsererror') || r.nodeName !== 'svg', w: r.getAttribute('width'), h: r.getAttribute('height'), vb: r.getAttribute('viewBox'), fill: r.getAttribute('fill'), stroke: r.getAttribute('stroke'),
      grupos: [...r.children].map(g => ({ tag: g.nodeName, id: g.getAttribute('id'), itens: [...g.children].map(e => ({ tag: e.nodeName, id: e.getAttribute('id'), d: e.getAttribute('d') || '', n: ((e.getAttribute('points') || e.getAttribute('d') || '').match(/-?\\d+(\\.\\d+)?(e-?\\d+)?/g) || []).map(Number) })) })) };`);
  const perto = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= Math.max(0.01, Math.abs(b[i]) * 1e-4));
  const plano = (pts) => pts.flat(), fechado = (pts) => [...pts, pts[0]].flat();
  const [T1, T2] = mod.telas, [W, H] = mod.comp;
  const xi = await xml(le('Input.svg')), x1 = await xml(le(esperados.find(n => n.startsWith('Output1')))), x2 = await xml(le('Output2_Tela 2_ lateral_esq.svg'));
  confere('os três arquivos são SVG válidos, com o tamanho da composição (entrada) e de cada tela (saída), traço preto sem preenchimento',
    !xi.erro && !x1.erro && !x2.erro && xi.vb === `0 0 ${W} ${H}` && +xi.w === W && x1.vb === `0 0 ${T1.w} ${T1.h}` && x2.vb === `0 0 ${T2.w} ${T2.h}` && xi.fill === 'none' && xi.stroke === '#000000', JSON.stringify([xi.erro, x1.erro, x2.erro, xi.vb, x1.vb, x2.vb]));
  confere('Input.svg: um grupo por tela, com o nome dela; slices e polígonos, sem as máscaras',
    xi.grupos.map(g => g.tag + ':' + g.id).join('|') === mod.telas.map(t => 'g:' + t.name).join('|') && xi.grupos.every((g, k) => g.itens.map(i => i.id).join('|') === mod.telas[k].itens.filter(i => i.type !== 'mask').map(i => i.name).join('|')), JSON.stringify(xi.grupos.map(g => [g.id, g.itens.map(i => i.id)])));
  confere('saída: um grupo com o nome da tela e um elemento por item, na ordem da lista, com o nome (aspas, & e < inteiros)',
    x1.grupos.length === 1 && x1.grupos[0].id === T1.name && x1.grupos[0].itens.map(i => i.id).join('|') === T1.itens.map(i => i.name).join('|') && x1.grupos[0].itens.some(i => i.id === 'A&B "x" <1>') && x2.grupos[0].id === 'Tela 2: lateral/esq', JSON.stringify(x1.grupos[0].itens.map(i => i.id)));
  const de = (x, nome) => x.grupos.flatMap(g => g.itens).find(i => i.id === nome) || { tag: '', n: [], d: '' }, m = (nome) => T1.itens.find(i => i.name === nome);
  const sA = T1.itens.find(i => i.type === 'slice' && i.cantos), eA = de(x1, sA.name);
  confere('slice na saída: <polygon> com os quatro cantos do editor (o canto puxado sai com seis algarismos)', eA.tag === 'polygon' && perto(eA.n, plano(sA.cantos)) && eA.n[0] === 248.471, eA.tag + ' ' + eA.n.join(','));
  const r = sA.inr, ang = r.rot * Math.PI / 180, giro = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => { const dx = (u - 0.5) * r.w, dy = (v - 0.5) * r.h; return [r.x + r.w / 2 + dx * Math.cos(ang) - dy * Math.sin(ang), r.y + r.h / 2 + dx * Math.sin(ang) + dy * Math.cos(ang)]; });
  const iA = xi.grupos[0].itens.find(i => i.id === sA.name) || { tag: '', n: [] };
  confere('slice na entrada: <polygon> com os cantos do recorte, girados junto com ele', iA.tag === 'polygon' && perto(iA.n, plano(giro)), iA.n.join(','));
  const pol = T1.itens.find(i => i.type === 'poly'), eP = de(x1, pol.name), iP = xi.grupos[0].itens.find(i => i.id === pol.name) || { tag: '', n: [], d: '' };
  confere('polígono: <path> M … L … z com o primeiro ponto repetido, pontos de saída na saída e de entrada na entrada',
    eP.tag === 'path' && /^M [^A-Za-z]+( L [^A-Za-z]+)+ z$/.test(eP.d) && perto(eP.n, fechado(pol.outPts)) && iP.tag === 'path' && perto(iP.n, fechado(pol.inPts)), eP.d);
  const mk = T1.itens.find(i => i.type === 'mask'), eM = de(x1, mk.name);
  confere('máscara: <path> com os pontos dela, só no arquivo de saída', eM.tag === 'path' && perto(eM.n, fechado(mk.pts)) && !xi.grupos.flatMap(g => g.itens).some(i => i.id === mk.name), eM.d);
  const sM = T1.itens.find(i => i.modo === 'mesh');
  if (sM) { const eS = de(x1, sM.name); confere('slice de malha: <path> do contorno', eS.tag === 'path' && eS.n.length >= 10, eS.tag + ' ' + eS.n.length); }
  fs.writeFileSync(path.join(pasta, 'Input.svg'), 'de outra coisa'); await ev(`document.querySelector('#toast').textContent = ''; return 1;`); await menu('svg'); await wait(700);
  confere('pasta que já tem um Input.svg: não grava por cima sem perguntar', le('Input.svg') === 'de outra coisa' && await ev(`return document.querySelector('#toast').textContent;`) === '', le('Input.svg').slice(0, 40));
  await ev(`P.ao._svgProva = ${JSON.stringify(path.join(pasta, 'nao-existe', 'x'))}; return 1;`); await menu('svg'); await wait(700);
  const erro = await ev(`return document.querySelector('#toast').textContent;`);
  confere('pasta que não dá para gravar vira aviso, sem quebrar', /^Não consegui exportar o SVG/.test(erro), erro);
  await ev(`delete P.ao._svgProva; return 1;`); fs.rmSync(pasta, { recursive: true, force: true });

  await ev(`for (const n of ['${A}', '${B}', '${C}']) { try { await D.presets.remove(n); } catch { } } return 1;`);
  await cl(`document.querySelector('#aoCancel')`); await wait(500);
  for (let i = 0; i < 2 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) await cl(`[...document.querySelectorAll('.dlgOver button')].pop()`);
} catch (e) { ruim++; console.log('PAROU: ' + String(e.message).slice(0, 400)); }
console.log(`\n${ok + ruim} verificações, ${ruim} falha(s) — ${ruim ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(ruim ? 1 : 0);
