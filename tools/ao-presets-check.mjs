// Menu Presets da Saída avançada como no Resolume 7.28.1 (plano 07-06), com mouse e teclado REAIS pelo CDP.
// Programa recém-aberto com --remote-debugging-port=9333 e pasta de dados própria (node tools/compare/abre-dev.mjs 9333).
// Uso: node tools/ao-presets-check.mjs
//
// No Resolume (07-03-DIFERENCAS.md, linha 14): Save, Save as…, Remove, Rename…, New, Show in Explorer, Load…, Export to SVG…
// e a lista sob "Presets". Aqui não entra o Export to SVG. "Mostrar na pasta" e "Abrir…" não são clicados: abrem janelas do
// Windows que o CDP não fecha; só a presença e o estado deles são conferidos.
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
  confere('menu: Salvar, Salvar como…, Apagar, Renomear…, Novo, Mostrar na pasta, Abrir…', m0.replace(/ \(apagado\)/g, '') === 'Salvar | Salvar como… | Apagar | Renomear… | Novo | Mostrar na pasta | Abrir…', m0);
  confere('sem preset carregado, Salvar, Apagar, Renomear… e Mostrar na pasta ficam apagados', m0 === 'Salvar (apagado) | Salvar como… | Apagar (apagado) | Renomear… (apagado) | Novo | Mostrar na pasta (apagado) | Abrir…', m0);
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

  await ev(`for (const n of ['${A}', '${B}', '${C}']) { try { await D.presets.remove(n); } catch { } } return 1;`);
  await cl(`document.querySelector('#aoCancel')`); await wait(500);
  for (let i = 0; i < 2 && await ev(`return document.querySelectorAll('.dlgOver').length;`) > 0; i++) await cl(`[...document.querySelectorAll('.dlgOver button')].pop()`);
} catch (e) { ruim++; console.log('PAROU: ' + String(e.message).slice(0, 400)); }
console.log(`\n${ok + ruim} verificações, ${ruim} falha(s) — ${ruim ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(ruim ? 1 : 0);
