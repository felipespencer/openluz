// Texto com IA (plano 02-06): ✦ Montar com IA no painel do texto, três versões, troca por clique, Separar em clipes, ♪ da
// animação, Ctrl+Z, sem serviço abre a Configuração › IA, e o Testar do Ollama local. Mouse e teclado REAIS pelo CDP.
// O pedido do painel usa o serviço de mentira do processo principal (ia-main.js, 'falso'): resposta fixa, sem rede.
// Uso: node tools/ia-check.mjs [--sem-ollama]   (programa aberto com --remote-debugging-port=9333; limpa a grade no fim)
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLuz');
if (!page) { console.error('janela do OpenLuz não achada', pages.map(p => p.title)); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const key = async (k, code, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); };
const type = (text) => send('Input.insertText', { text });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const btn = (type, x, y, n = 1) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: n });
const click = async (x, y) => { await btn('mouseMoved', x, y); await btn('mousePressed', x, y); await btn('mouseReleased', x, y); await wait(150); };
const dbl = async (x, y) => { await click(x, y); await btn('mousePressed', x, y, 2); await btn('mouseReleased', x, y, 2); await wait(300); };
const center = (sel, txt) => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find(e => ${txt ? `e.textContent.trim() === ${JSON.stringify(txt)}` : 'true'}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
const clickOn = async (sel, txt) => { const c = await center(sel, txt); if (!c) throw new Error('não achei ' + sel + ' ' + (txt || '')); await click(c[0], c[1]); return c; };
const results = []; const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const P = 'window.projecionista';
const until = async (expr, ms = 5000) => { for (let t = 0; t < ms; t += 100) { if (await ev(expr)) return true; await wait(100); } return false; };

for (let i = 0; i < 5 && await ev(`document.querySelectorAll('.dlgOver').length`) > 0; i++) { await key('Escape', 'Escape', 27); await wait(200); }
const n = await ev(`${P}.state.layers.length`), L1 = n - 1;
const limpar = () => ev(`(() => { const p = ${P}; p.state.layers.forEach((L, i) => { for (let c = 0; c < 8; c++) if (L.clips[c]) p.clearCell(i, c); p.eject(i); }); p.state.sel = null; window.__iaServico = undefined; p.render(); return 1; })()`);
await limpar();
const cell = (c) => `#grid .cell[data-layer="${L1}"][data-col="${c}"]`;
const clipAt = (c, expr) => ev(`(() => { const k = ${P}.state.layers[${L1}].clips[${c}]; return k ? (${expr}) : null; })()`);

// 1. Texto com IA (fonte própria, plano 09-01) na casa e a parte laranja no painel
for (let i = 0; i < 4 && await ev(`document.querySelector('#browserTabs .on').dataset.tab`) !== 'src'; i++) { await clickOn('#browserTabs [data-tab=src]'); await wait(300); }
await clickOn(cell(0) + ' .nm');
{ const c = await center('#browserPan .item.src', 'Texto com IA'); await dbl(c[0], c[1]); }
await clickOn(cell(0) + ' .nm'); await wait(300);
check('o painel do Texto com IA tem ✦ Montar com IA', await ev(`!!document.querySelector('#clipPan .iabox') && [...document.querySelectorAll('#clipPan .iafun button')].map(b => b.textContent).join('|') === 'Diagramar|Animar|Escrever|Separar em clipes'`));

// 2. sem serviço configurado, Montar abre a Configuração › IA (só quando este PC ainda não tem serviço)
const temServico = await ev(`window.projDesktop.ia.config().then(c => !!c.servico)`);
if (!temServico) {
  await clickOn('#clipPan .iago'); await until(`document.querySelectorAll('.dlgOver').length > 0`, 8000);
  check('sem serviço, Montar abre a Configuração › IA', await ev(`(document.querySelector('.dlg .dhead') || {}).textContent === 'Configuração › IA'`));
  check('a Configuração mostra os quatro serviços', await ev(`[...document.querySelectorAll('.dlg .iasrv b')].map(b => b.textContent).join('|')`) === 'Google Gemini|Groq|Ollama (no próprio PC)|Claude (Anthropic)');
  await key('Escape', 'Escape', 27); await wait(300);
} else console.log('      (este PC já tem serviço de IA: pulei o teste de "sem serviço")');

// 3. pedido digitado, funções ligadas por clique, Montar com o serviço de mentira
await ev(`window.__iaServico = 'falso'; 1`);
{ const c = await center('#clipPan .iabox textarea'); await click(c[0], c[1]); await key('a', 'KeyA', 65, 2); await type('Festa no galpão. Sábado às 22h. Traga seu copo!'); await ev(`document.activeElement.blur(); 1`); await wait(200); }
await clickOn('#clipPan .iafun button', 'Separar em clipes');
check('clicar numa função liga ela', await ev(`[...document.querySelectorAll('#clipPan .iafun button.on')].map(b => b.textContent).join('|')`) === 'Diagramar|Separar em clipes');
await clickOn('#clipPan .iago');
check('Montar devolve três versões', await until(`document.querySelectorAll('#clipPan .iav').length === 3`, 8000), String(await ev(`document.querySelectorAll('#clipPan .iav').length`)));
check('a primeira versão vira o clipe, com estilo por linha', await clipAt(0, `k.text.content === 'Festa no galpão.' && k.text.lines[0].font === 'Impact' && k.text.ia === 'Cartaz'`), JSON.stringify(await clipAt(0, `[k.text.content, k.text.lines, k.text.ia]`)));
check('Separar em clipes: uma casa por frase, para a direita', (await clipAt(1, `k.text.content`)) === 'Sábado às 22h.' && (await clipAt(2, `k.text.content`)) === 'Traga seu copo!', [await clipAt(1, `k.text.content`), await clipAt(2, `k.text.content`)].join(' | '));
check('as miniaturas das versões têm desenho', await ev(`[...document.querySelectorAll('#clipPan .iav canvas')].every(c => { const d = c.getContext('2d').getImageData(0, 0, 192, 108).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i]; return s > 2000; })`));

// 4. clicar na terceira versão (a que anima): vira Text Animator com ♪ e o desenho muda com a batida
await clickOn('#clipPan .iav[data-v="2"]'); await wait(300);
check('a versão escolhida troca o clipe', await clipAt(0, `k.text.ia === 'Batida' && k.text.animator === true && k.text.animated === true && k.panim.aScale && k.panim.aScale.shape === '4floor'`), JSON.stringify(await clipAt(0, `[k.text.ia, k.text.animator, k.panim]`)));
check('o painel mostra ♪ ligado na Escala animada', await ev(`[...document.querySelectorAll('#clipPan .prow')].some(r => r.querySelector('.pl').textContent === 'Escala' && r.querySelector('.anb.on'))`));
{ const c = await center(cell(0) + ' .th'); await click(c[0], c[1]); await wait(300); }   // no ar: o laço redesenha
const soma = () => clipAt(0, `(() => { const d = k.el.getContext('2d').getImageData(0, 0, 1920, 1080).data; let s = 0; for (let i = 3; i < d.length; i += 16) s += d[i]; return s; })()`);
const a1 = await soma(); await wait(170); const a2 = await soma(); await wait(170); const a3 = await soma();
check('com ♪ o desenho muda com a batida', new Set([a1, a2, a3]).size > 1, [a1, a2, a3].join(', '));

// 5. Ctrl+Z volta para a versão de antes
await ev(`document.activeElement && document.activeElement.blur(); 1`); await key('Shift', 'ShiftLeft', 16); await wait(100);
const r0 = await ev(`${P}.hist.redo.length`); await key('z', 'KeyZ', 90, 2);
await until(`!${P}.hist.busy && ${P}.hist.redo.length !== ${r0}`, 4000); await wait(200);
check('Ctrl+Z volta para a versão de antes', await clipAt(0, `k.text.ia === 'Cartaz' && !k.text.animator && !(k.panim && k.panim.aScale)`), JSON.stringify(await clipAt(0, `[k.text.ia, k.text.animator, k.panim]`)));

// 6. salvar e abrir guarda as linhas com estilo
check('salvar e abrir guarda as linhas com estilo', await ev(`(async () => { const C = await import('./clips.js'); const k = ${P}.state.layers[${L1}].clips[0]; const d = await C.deserializeClip(JSON.parse(JSON.stringify(C.serializeClip(k)))); return JSON.stringify(d.text.lines) === JSON.stringify(k.text.lines) && d.text.ia === k.text.ia; })()`));

// 7. a chave nunca chega à página
check('a configuração que a página vê não tem chave', await ev(`window.projDesktop.ia.config().then(c => !JSON.stringify(c).match(/sk-|AIza|gsk_/) && 'temChave' in c)`));

// 8. Testar do Ollama local (o mesmo botão da Configuração), se ele estiver instalado
if (!process.argv.includes('--sem-ollama')) {
  await ev(`${P}.iaDialog(); 1`); await until(`!!document.querySelector('.dlg .iasrv')`, 3000);
  await clickOn('.dlg .iasrv[data-srv=ollama]'); await clickOn('.dlg button[data-k=testar]');
  const ok = await until(`(document.querySelector('.dlg [data-k=msg]') || {}).textContent?.startsWith('Respondeu')`, 60000);
  check('Testar o Ollama responde e escolhe um modelo', ok, await ev(`(document.querySelector('.dlg [data-k=msg]') || {}).textContent || ''`));
  await key('Escape', 'Escape', 27); await wait(300);
}

await limpar();
const ok = results.filter(Boolean).length;
console.log(ok === results.length ? `APROVADO: ${ok} verificações` : `REPROVADO: ${results.length - ok} de ${results.length}`);
ws.close(); process.exit(ok === results.length ? 0 : 1);
