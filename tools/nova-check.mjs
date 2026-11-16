// Composição nova abre os diálogos dela (plano 12-17): Projetores e depois "Nova composição". Teclas e cliques REAIS pelo CDP.
// Programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP). Uso: node tools/nova-check.mjs
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), wait = (ms) => new Promise(r => setTimeout(r, ms));
const pg = (await (await fetch(base + '/json')).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let id = 0; const w = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && w.has(d.id)) { w.get(d.id)(d); w.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async () => { const P = window.projecionista, S = P.state; ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const cl = async (expr) => { const r = await ev(`const e = (${expr}); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;`); if (!r) throw new Error('não achei na tela: ' + expr.slice(0, 90)); await mouse('mouseMoved', r.x, r.y, { buttons: 0 }); await mouse('mousePressed', r.x, r.y); await mouse('mouseReleased', r.x, r.y); await wait(300); };
const texto = (t) => `[...document.querySelectorAll('button, .mi, .tab, .lb, label, span, div')].filter(e => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(t)} && e.getBoundingClientRect().width > 0).sort((a, b) => (b.tagName === 'BUTTON') - (a.tagName === 'BUTTON'))[0]`;
let ok = 0, ruim = 0; const confere = (nome, passou, obs = '') => { passou ? ok++ : ruim++; console.log((passou ? 'OK    ' : 'FALHA ') + nome + (obs !== '' ? '  [' + obs + ']' : '')); };
const key = async (k, code, mods = 0) => { for (const type of ['rawKeyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: code, modifiers: mods }); await wait(600); };
const dlg = () => ev(`return [...document.querySelectorAll('.dlgOver .dhead')].map(d => d.textContent).join(' | ');`);
const botao = (t) => cl(`[...document.querySelectorAll('.dlgOver .dfoot button')].find(b => b.textContent.trim() === ${JSON.stringify(t)})`);
const temBotao = (t) => ev(`return [...document.querySelectorAll('.dlgOver .dfoot button')].some(b => b.textContent.trim() === ${JSON.stringify(t)});`);
const fora = async () => { const y = await ev(`return innerHeight - 4;`); await mouse('mouseMoved', 6, y, { buttons: 0 }); await mouse('mousePressed', 6, y); await mouse('mouseReleased', 6, y); await wait(200); };
const limpa = async () => { for (let i = 0; i < 4 && await dlg(); i++) await key('Escape', 27); };
try {
  await limpa(); await ev(`await P.reset(); return 1;`); await limpa();
  const varios = await ev(`return (await window.projDesktop.displays()).length > 1;`);
  console.log('   mais de um monitor: ' + varios);
  // 1. Ctrl+N de verdade
  await fora(); await key('n', 78, 2); let d = await dlg();
  if (varios) {
    confere('Ctrl+N: abre primeiro o assistente Projetores', d === 'Projetores', d);
    confere('o botão de sair do assistente diz Pular', await temBotao('Pular'));
    await botao('Pular'); await wait(400); d = await dlg();
  }
  confere((varios ? 'Pular: ' : 'Ctrl+N: ') + 'abre o diálogo "Nova composição"', d === 'Nova composição', d);
  // 2. o nome escrito vale depois do OK
  await cl(`document.querySelector('.dlgOver .dbody input[type=text], .dlgOver .dbody input:not([type])')`); await send('Input.insertText', { text: 'Show de sábado' }); await wait(200);
  await botao('OK'); await wait(400);
  confere('OK: o nome escrito fica na composição e não sobra diálogo', await ev(`return S.name;`) === 'Show de sábado' && !(await dlg()), await ev(`return S.name;`) + ' / ' + await dlg());
  // 3. sair do assistente por Esc também leva ao diálogo da composição
  if (varios) {
    await ev(`P.comps.newComp(); return 1;`); await wait(300); await fora(); await key('n', 78, 2);
    await key('Escape', 27); d = await dlg();
    confere('Esc no assistente: o diálogo "Nova composição" abre do mesmo jeito', d === 'Nova composição', d);
    await botao('Cancelar'); await wait(300);
    confere('Cancelar: fecha tudo', !(await dlg()), await dlg());
  }
  // 4. chamada sem pedido da pessoa (testes, código): nenhum diálogo
  await ev(`P.comps.newComp(); return 1;`); await wait(500);
  confere('newComp() sem pergunta não abre diálogo', !(await dlg()), await dlg());
  // 5. os dois diálogos sozinhos continuam sozinhos
  await ev(`P.projectorWizard(false); return 1;`); await wait(400);
  confere('OUTPUT › Projetores… sozinho: o botão diz Cancelar', await temBotao('Cancelar'));
  await botao('Cancelar'); await wait(400);
  confere('e ao fechar não abre outro diálogo', !(await dlg()), await dlg());
  await fora(); await key('c', 67, 10); d = await dlg();
  confere('Ctrl+Shift+C: "Configurações da composição", com o título de sempre', d === 'Configurações da composição', d);
  await limpa();
} catch (e) { ruim++; console.log('PAROU: ' + String(e.message).slice(0, 400)); }
try { await limpa(); } catch { }
console.log(`\n${ok + ruim} verificações, ${ruim} falha(s) — ${ruim ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(ruim ? 1 : 0);
