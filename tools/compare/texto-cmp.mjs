// Compara o texto do OpenLuz (app/text.js, pelo CDP na porta 9333) com as capturas do Resolume feitas por texto.py.
// Uso: node tools/compare/texto-cmp.mjs <lista.txt> [--capturar]
//   lista: uma linha por caso, como em texto.py: "<rotulo> Controle=valor ..." (~ = espaço, \n = quebra de linha).
//   --capturar refaz a captura do Resolume (py texto.py) antes; sem ele usa saida/texto/<rotulo>.png que já existe.
// Sai: saida/texto/ol-<rotulo>.png e, por caso, a caixa do desenho nos dois e a diferença média por pixel.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'saida', 'texto');
const MAP = { 'Text': 'content', 'Font': 'font', 'Style': 'style', 'Color': 'color', 'Size': 'size', 'Alignment': 'align', 'AlignmentVertically': 'valign', 'Line Width': 'lineWidth', 'Position X': 'x', 'Position Y': 'y', 'Rotation': 'rotation', 'Scale': 'scale', 'Spacing X': 'spacingX', 'Spacing Y': 'spacingY', 'Outline Color': 'outlineColor', 'Outline Width': 'outlineWidth', 'Glow In': 'glowIn', 'Glow Out': 'glowOut' };

async function olEval(expr) {
  const pages = await (await fetch('http://127.0.0.1:9333/json')).json();
  const page = pages.find(p => p.type === 'page' && p.title.includes('OpenLuz') && !p.url.includes('output.html'));
  if (!page) throw new Error('OpenLuz não está aberto com --remote-debugging-port=9333');
  const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  const res = await new Promise(r => { ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id === 1) r(d); }; ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true } })); });
  ws.close();
  if (res.result.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description || res.result.exceptionDetails.text);
  return res.result.result.value;
}

const [lista, ...flags] = process.argv.slice(2);
const ANIM = flags.includes('--anim');   // Text Animator: Scale e Rotation viram os valores animados de cada pedaço
const MAP_A = { ...MAP, 'Scale': 'aScale', 'Rotation': 'aRot', 'Opacity': 'aOpacity', 'Animated Position X': 'aX', 'Animated Position Y': 'aY', 'Anchor X': 'anchorX', 'Anchor Y': 'anchorY', 'Animated Outline Width': 'aOutline', 'Animated Glow In': 'aGlowIn', 'Animated Glow Out': 'aGlowOut', 'Animated': 'animated', 'Range': 'range', 'Order': 'order', 'Delay': 'delay' };
const RANGE = { 'All': 'all', 'Lines': 'lines', 'Words': 'words', 'Characters': 'chars' }, ORDER = { 'Front to back': 'front', 'Back to front': 'back', 'Random': 'random' };
let acum = {};   // no --anim os casos se somam (texto.py com SEM_PADRAO), como foram capturados
const casos = fs.readFileSync(lista, 'utf8').split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
for (const linha of casos) {
  const [rot, ...pares] = linha.trim().split(/\s+/);
  if (flags.includes('--capturar')) execFileSync('py', [path.join(HERE, 'texto.py'), rot, ...pares], { stdio: ['ignore', 'ignore', 'inherit'] });
  const t = ANIM ? acum : {};
  for (const p of pares) {
    let [k, v] = p.replace(/~/g, ' ').split(/=(.*)/s); v = v.replace(/\\n/g, '\n');
    const key = (ANIM ? MAP_A : MAP)[k]; if (!key) throw new Error('controle sem par no OpenLuz: ' + k);
    t[key] = ['align', 'valign'].includes(key) ? v.toLowerCase() : key === 'animated' ? v === 'true' : key === 'range' ? RANGE[v] : key === 'order' ? ORDER[v] : ['content', 'font', 'style', 'color', 'outlineColor'].includes(key) ? v : Number(v);
  }
  const url = await olEval(`(async () => { const T = await import('./text.js'); const t = { ...T.textDefaults(${ANIM}), content: 'Resolume', ...${JSON.stringify(t)} };
    await document.fonts.load(T.fontCss(t, 130)); const cv = document.createElement('canvas'); cv.width = 1920; cv.height = 1080; T.drawText(cv, t, null);
    const o = document.createElement('canvas'); o.width = 1920; o.height = 1080; const x = o.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 1920, 1080); x.drawImage(cv, 0, 0); return o.toDataURL('image/png'); })()`);
  const olPng = path.join(OUT, 'ol-' + rot + '.png');
  fs.writeFileSync(olPng, Buffer.from(url.split(',')[1], 'base64'));
  const r = execFileSync('py', ['-c', `
import sys, json, numpy as n
from PIL import Image
a = n.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float); b = n.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float)
def caixa(x):
    m = x.max(2) > 40
    if not m.any(): return None
    ys, xs = n.where(m); return [int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())]
d = abs(a - b).mean(2); m = (a.max(2) > 8) | (b.max(2) > 8)
print(json.dumps({'res': caixa(a), 'ol': caixa(b), 'dif_media': round(float(d.mean()), 3), 'dif_no_texto': round(float(d[m].mean()) if m.any() else 0, 1)}))
`, path.join(OUT, rot + '.png'), olPng]).toString().trim();
  console.log(rot.padEnd(8), r);
}
