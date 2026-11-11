// Rede e sites (plano 12-06, achados 46, 47 e 54 da revisão geral): o servidor do celular só aceita quem traz a chave do momento
// e só quando alguém está esperando um celular; um site aberto como fonte "Página web" não recebe câmera nem microfone; a janela
// de página web só abre http(s). Programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP) e com a câmera falsa do Chromium:
//   electron . --remote-debugging-port=9333 --use-fake-device-for-media-stream
// (SEM --use-fake-ui-for-media-stream: essa opção aceita as permissões sozinha, por cima do filtro do programa, e o teste do site mente)
// Uso: node tools/rede-check.mjs   (limpa a casa no fim)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLuz');
if (!page) { console.error('janela do OpenLuz não achada', pages.map(p => p.title)); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map(); const erros = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } else if (d.method === 'Runtime.exceptionThrown') erros.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const VK = { Escape: 27, Enter: 13, Delete: 46, Shift: 16 };
const key = async (k, mods = 0) => {
  const one = k.length === 1, code = one ? 'Key' + k.toUpperCase() : (k === 'Shift' ? 'ShiftLeft' : k), vk = one ? k.toUpperCase().charCodeAt(0) : VK[k];
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods }); await wait(300);
};
const clickXY = async (x, y, button = 'left', pausa = 350) => {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, buttons: button === 'left' ? 1 : 2, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, buttons: 0, clickCount: 1 }); await wait(pausa);
};
// centro do elemento: por seletor, ou o menor elemento visível de `sel` cujo texto começa com `txt`
const pos = (sel, txt) => ev(`(()=>{ const t=${JSON.stringify(txt || '')}; let e; if (t) { e=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(x=>x.offsetParent!==null && x.textContent.trim().startsWith(t)).sort((a,b)=>a.textContent.length-b.textContent.length)[0]; } else e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'nearest',inline:'nearest'}); const b=e.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; })()`);
const click = async (sel, txt, button) => { const r = await pos(sel, txt); if (!r) throw new Error('não achei ' + sel + ' ' + (txt || '')); await clickXY(r.x, r.y, button); return r; };
const menu = async (i, item) => { await click(`#menubar .mb[data-i="${i}"]`); await click('.menuLayer .menu .mi', item); };
const results = []; const check = (name, ok, info = '') => { results.push({ name, ok }); console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const P = 'window.projecionista';
const CL = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'compare/clips').replace(/\\/g, '/') + '/';
const LOG = path.join(process.env.PROJ_USERDATA || path.join(process.env.APPDATA || os.homedir(), 'OpenLuz'), 'openluz.log');
const logTxt = () => { try { return fs.readFileSync(LOG, 'utf8'); } catch { return ''; } };
const quadros = (ms) => ev(`(async()=>{ const a=${P}.frames(); await new Promise(r=>setTimeout(r,${ms})); return ${P}.frames()-a; })()`);
const limpa = () => ev(`(()=>{ const p=${P}; p.state.layers.forEach((L,i)=>{ for(let k=0;k<p.cols();k++) if(L.clips[k]) p.clearCell(i,k); p.eject(i); }); p.state.sel=null; p.state.pv=null; p.render(); return 1; })()`);
const cell = (l, k, part) => `#grid .cell[data-layer="${l}"][data-col="${k}"]` + (part ? ' .' + part : '');
const quais = process.argv.slice(2), quer = (n) => !quais.length || quais.includes(n);

// preparo: Shift de aquecimento e diálogos fechados com Esc de verdade (o de "Projetores" abre ao iniciar)
await key('Shift');
for (let i = 0; i < 3 && await ev(`!!document.querySelector('.dlgOver')`); i++) await key('Escape');
if (await ev(`${P}.ao.open`)) await ev(`${P}.ao.hide(true)`);

const https = await import('node:https'); const http = await import('node:http');
// pedido ao servidor do celular como um aparelho qualquer da rede faria (o certificado é do próprio programa)
const pede = (porta, metodo, caminho, corpo) => new Promise((ok) => {
  const r = https.request({ host: '127.0.0.1', port: porta, path: caminho, method: metodo, rejectUnauthorized: false, headers: corpo ? { 'Content-Type': 'application/json' } : {}, timeout: 6000 }, (res) => { let t = ''; res.on('data', d => t += d); res.on('end', () => ok({ status: res.statusCode, texto: t.slice(0, 200) })); });
  r.on('timeout', () => { r.destroy(); ok({ status: 0, texto: 'sem resposta em 6 s' }); }); r.on('error', (e) => ok({ status: -1, texto: e.message }));
  if (corpo) r.write(JSON.stringify(corpo)); r.end();
});
const D = 'window.projDesktop';
const n = await ev(`${P}.state.layers.length`), L1 = n - 1;
const nomes = () => ev(`${P}.state.layers[${L1}].clips.map(c => c ? c.name : '-').slice(0, 4).join(' | ')`);
const fechaPagina = (k) => ev(`${D}.capture.webClose ? ${D}.capture.webClose(${JSON.stringify(k)}).then(() => 1).catch(() => 0) : 0`);
const abrePagina = (k, url) => ev(`Promise.race([${D}.capture.webOpen(${JSON.stringify(k)}, ${JSON.stringify(url)}, 320, 240).then(() => 'abriu').catch(e => 'recusou: ' + e.message.slice(0, 80)), new Promise(r => setTimeout(() => r('demorou'), 25000))])`);
await limpa(); await ev(`${P}.putPath(${L1},0,${JSON.stringify(CL + 'quadA.png')},'quadA.png')`); await wait(600);
await click(cell(L1, 0, 'nm'));   // quadA selecionado: era nele que a câmera de um celular qualquer caía

// ---------- 46: o servidor do celular sem a chave ----------
const info0 = await ev(`${D}.phone.info()`), porta = info0.port;
if (!porta) check('o servidor do celular está de pé', false, JSON.stringify(info0));
else {
  let r = await pede(porta, 'GET', '/celular');
  check('aparelho qualquer da rede abre /celular sem a chave: recusado (403)', r.status === 403, r.status + ' ' + r.texto.slice(0, 70));
  r = await pede(porta, 'POST', '/celular/oferta', { sdp: 'v=0', nome: 'intruso' });
  check('oferta de câmera sem a chave: recusada (403)', r.status === 403, r.status + ' ' + r.texto.slice(0, 70));
  r = await pede(porta, 'POST', '/celular/oferta?k=0000AAAA', { sdp: 'v=0', nome: 'intruso' });
  check('oferta com chave errada: recusada (403)', r.status === 403, r.status + ' ' + r.texto.slice(0, 70));

  // ---------- 46: com o endereço certo, mas sem ninguém esperando um celular ----------
  const info1 = await ev(`${D}.phone.info()`); const u1 = (info1.urls[0] || '').replace(/^https:\/\/[^:]+:/, 'https://127.0.0.1:');
  const antes = await nomes();
  await abrePagina('rede-cel-1', u1 + (u1.includes('?') ? '&' : '?') + 'auto=1'); await wait(9000);
  check('celular que manda a câmera sem o diálogo "Celular como câmera" aberto: o clipe selecionado não é trocado', await nomes() === antes, antes + ' → ' + await nomes());
  await fechaPagina('rede-cel-1');

  // ---------- o caminho de sempre continua: pedir o celular, ele entra na casa escolhida ----------
  await ev(`${P}.putPhone(${L1}, 2); 1`); await wait(900);
  const u2 = (await ev(`(document.querySelector('.dlgOver .dtext.big') || {}).textContent || ''`)).replace(/^https:\/\/[^:]+:/, 'https://127.0.0.1:');
  check('o endereço mostrado no diálogo traz a chave', /[?&]k=[0-9A-F]{8}/.test(u2) || !/k=/.test(JSON.stringify(info0.urls)) && false, u2.slice(0, 70));
  await abrePagina('rede-cel-2', u2 + (u2.includes('?') ? '&' : '?') + 'auto=1');
  let entrou = false; for (let i = 0; i < 40 && !entrou; i++) { await wait(500); entrou = await ev(`!!(${P}.state.layers[${L1}].clips[2] && ${P}.state.layers[${L1}].clips[2].phone)`); }
  check('com o diálogo aberto e o endereço dele, o celular entra na casa escolhida', entrou, await nomes());
  check('e o diálogo fecha sozinho', !(await ev(`!!document.querySelector('.dlgOver')`)));
  r = await pede(porta, 'GET', new URL(u2).pathname + new URL(u2).search);
  check('o endereço que já foi usado não serve para outro celular (403)', r.status === 403, r.status + ' ' + r.texto.slice(0, 60));
  await fechaPagina('rede-cel-2');
  if (await ev(`!!document.querySelector('.dlgOver')`)) await key('Escape');

  // ---------- diálogo fechado sem celular: o endereço deixa de valer ----------
  await ev(`${P}.putPhone(${L1}, 3); 1`); await wait(900);
  const u3 = (await ev(`(document.querySelector('.dlgOver .dtext.big') || {}).textContent || ''`)).replace(/^https:\/\/[^:]+:/, 'https://127.0.0.1:');
  r = await pede(porta, 'GET', new URL(u3).pathname + new URL(u3).search);
  const valia = r.status === 200;
  await key('Escape'); await wait(700);
  r = await pede(porta, 'GET', new URL(u3).pathname + new URL(u3).search);
  check('com o diálogo aberto o endereço vale; fechado sem celular, deixa de valer (403)', valia && r.status === 403, 'aberto: ' + (valia ? 200 : 'não') + ', fechado: ' + r.status);
}

// ---------- 47: um site aberto como "Página web" não recebe a câmera ----------
{
  let relato = null;
  const srv = http.createServer((req, res) => {
    if (req.url.startsWith('/r?')) { relato = decodeURIComponent(req.url.slice(3)); res.writeHead(200); res.end('ok'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta charset="utf-8"><title>site de teste</title><script>navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(s => fetch('/r?ganhou a camera e o microfone')).catch(e => fetch('/r?' + encodeURIComponent(e.name)));</script>`);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const ps = srv.address().port;
  const ab = await abrePagina('rede-site', 'http://127.0.0.1:' + ps + '/');
  for (let i = 0; i < 20 && relato == null; i++) await wait(500);
  check('site aberto como Página web pede câmera e microfone: negado', relato === 'NotAllowedError', 'abrir: ' + ab + '; o site recebeu: ' + relato);
  await fechaPagina('rede-site'); srv.close();
  const meu = await ev(`navigator.mediaDevices.getUserMedia({ video: true }).then(s => { s.getTracks().forEach(t => t.stop()); return 'ok'; }).catch(e => e.name)`);
  check('a janela do próprio programa continua recebendo a câmera', meu === 'ok', meu);
  const fontes = await ev(`(window.queryLocalFonts ? window.queryLocalFonts().then(l => l.length > 0 ? 'ok' : 'vazia').catch(e => e.name) : 'sem API')`);
  check('e a lista de fontes do computador (Text Block) continua vindo', fontes === 'ok', fontes);
  const arq = await abrePagina('rede-arq', 'file:///C:/Windows/win.ini');
  check('a janela de Página web recusa endereço que não é http ou https', /^recusou/.test(arq), arq);
  await fechaPagina('rede-arq');
}

check('nenhuma exceção na página', erros.length === 0, erros.slice(0, 2).map(e => e.slice(0, 160)).join(' | '));
for (let i = 0; i < 3 && await ev(`!!document.querySelector('.dlgOver')`); i++) await key('Escape');
await limpa();

const falhas = results.filter(r => !r.ok).length;
console.log('\n' + results.length + ' verificações, ' + falhas + ' falha(s) — ' + (falhas ? 'REPROVADO' : 'APROVADO'));
ws.close(); await wait(100);
process.exitCode = falhas ? 1 : 0;
