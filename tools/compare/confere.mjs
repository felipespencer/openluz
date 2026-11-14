// Confere um efeito do OpenLuz contra o gabarito do Resolume (tools/compare/gabarito.py), sem o Resolume aberto.
// Uso: node tools/compare/confere.mjs "<efeito do Resolume>" [--so caso1,caso2] [--espera quadros] [--abre] [--porta 9333]
//   Para cada caso do gabarito (padrão e cada controle em vários valores) leva os mesmos valores ao OpenLuz pelo
//   mapa rparams do efeito, lê o canvas do motor e mede a diferença por pixel contra a foto do Resolume.
//   --abre  abre um OpenLuz de desenvolvimento só para isso (pasta de dados à parte) e fecha no fim.
//   Sem --abre usa o que estiver aberto com --remote-debugging-port. Antes de medir, a definição do efeito é relida
//   de app/effects*.js e trocada dentro do programa aberto: dá para editar o shader e conferir de novo sem reabrir.
// Sai em tools/compare/saida/conf/<efeito>/: <caso>.png (Resolume | OpenLuz | diferença x4) e resumo.json.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const S = ms => new Promise(r => setTimeout(r, ms));
const a = { so: null, espera: 4, abre: false, porta: 9333, efeito: null };
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (k === '--so') a.so = process.argv[++i].split(','); else if (k === '--espera') a.espera = +process.argv[++i];
  else if (k === '--abre') a.abre = true; else if (k === '--porta') a.porta = +process.argv[++i]; else a.efeito = k;
}
if (!a.efeito) { console.log('uso: node tools/compare/confere.mjs "<efeito>" [--so casos] [--espera n] [--abre]'); process.exit(1); }
const limpo = s => s.replace(/[^\w.\- ]+/g, '_');
// efeito de grade fina (CRT): se existe a pasta <efeito>-cheia (gabarito em 1920x1080, CHEIA=1 no gabarito2), vale ela, e sai também a medida "de longe"
const CHEIA = fs.existsSync(path.join(HERE, 'saida', 'ref', limpo(a.efeito) + '-cheia', 'casos.json'));
const REF = path.join(HERE, 'saida', 'ref', limpo(a.efeito) + (CHEIA ? '-cheia' : '')), OUT = path.join(HERE, 'saida', 'conf', limpo(a.efeito));
if (!fs.existsSync(path.join(REF, 'casos.json'))) { console.error('sem gabarito para ' + a.efeito + ' (rode tools/compare/gabarito.py)'); process.exit(1); }
const gab = JSON.parse(fs.readFileSync(path.join(REF, 'casos.json'), 'utf8'));
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

let proc = null;
async function paginas() { try { return await (await fetch(`http://127.0.0.1:${a.porta}/json`)).json(); } catch { return null; } }
if (a.abre) {
  const ud = path.join(os.tmpdir(), 'openluz-confere'); fs.mkdirSync(ud, { recursive: true });
  proc = spawn(path.join(ROOT, 'node_modules/electron/dist/electron.exe'), ['.', `--remote-debugging-port=${a.porta}`], { cwd: ROOT, env: { ...process.env, PROJ_USERDATA: ud }, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { await S(500); const p = await paginas(); if (p && p.find(x => x.type === 'page' && x.title === 'OpenLuz')) { await S(5000); break; } }
}
const fecha = () => { if (proc) try { execFileSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { } };
try {
  const pg = (await paginas() || []).find(p => p.type === 'page' && p.title === 'OpenLuz');
  if (!pg) throw new Error(`OpenLuz não está aberto com --remote-debugging-port=${a.porta} (use --abre)`);
  const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const waits = new Map();
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };

  // definição fresca do efeito (o programa aberto pode estar com a antiga): só dados; se tiver função, vale a que está aberta
  const { EFFECTS } = await import(pathToFileURL(path.join(ROOT, 'app/effects.js')).href + '?t=' + Date.now());
  const def = EFFECTS.find(e => (e.rname || e.name) === a.efeito);
  if (!def) throw new Error('o OpenLuz não tem o efeito ' + a.efeito);
  const temFuncao = Object.values(def).some(v => typeof v === 'function');
  await ev(`(() => { const P = window.projecionista; for (const d of document.querySelectorAll('.dlgOver')) d.remove();
    const novo = ${JSON.stringify(def)}, i = P.EFFECTS.findIndex(e => e.id === novo.id);
    if (i < 0) P.EFFECTS.push(novo); else { for (const k of Object.keys(P.EFFECTS[i])) if (typeof P.EFFECTS[i][k] !== 'function' && !(k in novo)) delete P.EFFECTS[i][k]; Object.assign(P.EFFECTS[i], novo); }
    P.engine.fxProg.delete(novo.id); return true; })()`);
  if (temFuncao) console.log('(o efeito tem função na definição: mudança nela só vale reabrindo o OpenLuz)');

  const casos = gab.casos.filter(c => c.arquivo && (!a.so || a.so.includes(c.arquivo.replace(/\.png$/, ''))));
  const pares = []; let clipAtual = null;
  for (const c of casos) {
    const clip = path.join(HERE, 'clips', c.clip || gab.clip).replace(/\\/g, '/');
    const r = await ev(`(async () => {
      const P = window.projecionista, L = P.state.layers[0], S = ms => new Promise(r => setTimeout(r, ms));
      const def = P.EFFECTS.find(e => e.id === ${JSON.stringify(def.id)});
      if (${JSON.stringify(clip)} !== ${JSON.stringify(clipAtual)}) { await P.putPath(0, 1, ${JSON.stringify(clip)}, ${JSON.stringify(path.basename(clip))}); P.trigger(0, 1); await S(400); }
      const params = {}; for (const p of def.params) params[p.key] = p.def;
      const rmap = def.rparams || {}, vr = ${JSON.stringify(c.valores)}, fora = [];
      for (const [rn, v] of Object.entries(vr)) {
        const k = rmap[rn]; if (!k) { fora.push(rn); continue; }
        const p = def.params.find(q => q.key === k); if (!p) { fora.push(rn); continue; }
        params[k] = p.opts ? Math.max(0, (p.ropts || p.opts).indexOf(v)) : p.color ? String(v).slice(0, p.alpha ? 9 : 7) : +v;
      }
      L.fx = [{ id: def.id, params, bypass: false, anim: {} }];
      P.render(); const f0 = P.frames(); while (P.frames() - f0 < ${a.espera}) await S(16);
      return { png: P.engine.canvas.toDataURL('image/png'), fora, w: P.engine.canvas.width, h: P.engine.canvas.height };
    })()`);
    clipAtual = clip;
    const nosso = path.join(OUT, c.arquivo.replace(/\.png$/, '.openluz.png'));
    fs.writeFileSync(nosso, Buffer.from(r.png.split(',')[1], 'base64'));
    pares.push({ caso: c.arquivo.replace(/\.png$/, ''), ref: path.join(REF, c.arquivo), nosso, lado: path.join(OUT, c.arquivo), anima: !!c.anima, igual_ao_padrao: !!c.igual_ao_padrao, fora: r.fora, cheia: CHEIA });
  }
  await ev(`(() => { window.projecionista.state.layers[0].fx = []; return true; })()`);
  ws.close();
  const lista = path.join(OUT, 'pares.json'); fs.writeFileSync(lista, JSON.stringify(pares));
  const res = JSON.parse(execFileSync('py', [path.join(HERE, 'confere.py'), lista], { maxBuffer: 1 << 26 }).toString());
  let soma = 0, n = 0, pior = null, somaL = 0, piorL = null;
  for (const r of res) {
    const marca = r.fora.length ? '  SEM CONTROLE: ' + r.fora.join(', ') : '';
    console.log(`${r.caso.padEnd(34)} média ${String(r.media).padStart(6)}  máx ${String(r.max).padStart(3)}  >16: ${String(r.acima16).padStart(5)}%${r.longe != null ? '  de longe ' + String(r.longe).padStart(5) : ''}${r.anima ? '  (mexe sozinho)' : ''}${r.igual_ao_padrao ? '  (no Resolume = padrão)' : ''}${marca}`);
    if (!r.anima && !/-foto$/.test(r.caso)) { soma += r.media; n++; if (!pior || r.media > pior.media) pior = r; if (r.longe != null) { somaL += r.longe; if (!piorL || r.longe > piorL.longe) piorL = r; } }
  }
  const resumo = { efeito: a.efeito, casos: res.length, media: n ? +(soma / n).toFixed(2) : null, pior: pior && { caso: pior.caso, media: pior.media }, semControle: [...new Set(res.flatMap(r => r.fora))], ...(CHEIA && n ? { longe: +(somaL / n).toFixed(2), piorLonge: piorL && { caso: piorL.caso, longe: piorL.longe } } : {}) };
  fs.writeFileSync(path.join(OUT, 'resumo.json'), JSON.stringify({ ...resumo, res }, null, 1));
  console.log(JSON.stringify(resumo));
} finally { fecha(); }
