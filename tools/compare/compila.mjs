// Compila o shader de todos os efeitos no OpenLuz aberto e lista os que não compilam.
// Uso: node tools/compare/compila.mjs [porta=9333]   (o OpenLuz tem de ter sido aberto depois da última edição dos efeitos)
// Um shader que não compila não derruba o programa, mas o efeito deixa a imagem passar sem aviso: esta conferência pega isso.
const porta = +(process.argv[2] || 9333);
const pg = (await (await fetch(`http://127.0.0.1:${porta}/json`)).json()).find(p => p.type === 'page' && p.title === 'OpenLuz');
if (!pg) { console.error('OpenLuz não está aberto na porta ' + porta); process.exit(1); }
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
const r = await new Promise(res => { ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id === 1) res(d); }; ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { returnByValue: true, expression: `(() => { const P = window.projecionista, ruins = []; let n = 0;
  for (const d of P.EFFECTS) { n++; P.engine.fxProg.delete(d.id); try { P.engine.fxProgram(d); } catch (e) { ruins.push(d.name + ': ' + String(e.message).slice(0, 300)); } }
  return { n, ruins }; })()` } })); });
ws.close();
if (r.result.exceptionDetails) { console.error(r.result.exceptionDetails.exception?.description); process.exit(1); }
const v = r.result.result.value;
console.log(`${v.n} efeitos, ${v.ruins.length} não compilam`);
for (const x of v.ruins) console.log('  ' + x);
process.exit(v.ruins.length ? 1 : 0);
