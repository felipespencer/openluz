// Censo: cada efeito de vídeo do Resolume (fichas da API REST) contra o que o OpenLuz tem.
// Uso: node tools/compare/censo.mjs [--json arquivo]
// Para cada efeito diz: falta | só o nome (controles próprios) | controles iguais à ficha | controles diferentes (quais).
// Não abre nenhum dos dois programas: lê referencia-resolume/extraido/effects-rest.json e app/effects*.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const fichas = JSON.parse(fs.readFileSync(path.join(ROOT, 'referencia-resolume/extraido/effects-rest.json'), 'utf8'));
const { EFFECTS } = await import(pathToFileURL(path.join(ROOT, 'app/effects.js')));
const FORA = new Set(['Opacity', 'Blend Mode']);          // mistura do próprio efeito: vale para todos, é do painel
const perto = (a, b) => Math.abs(a - b) <= 1e-3 * Math.max(1, Math.abs(a), Math.abs(b));

const linhas = [];
for (const f of fichas) {
  const d = EFFECTS.find(e => (e.rname || e.name) === f.nome);
  const rp = f.params.filter(p => !FORA.has(p.nome));
  if (!d) { linhas.push({ nome: f.nome, estado: 'falta', n: rp.length, dif: [] }); continue; }
  if (!d.rparams) { linhas.push({ nome: f.nome, estado: 'nome', n: rp.length, nosso: d.params.length, dif: [] }); continue; }
  const dif = [];
  for (const p of rp) {
    const k = d.rparams[p.nome] ?? (d.rfields && d.rfields[p.nome]);
    if (!k) { dif.push(`sem "${p.nome}"`); continue; }
    const q = d.params.find(x => x.key === k);
    if (!q) continue;                                     // controle que não é número (arquivo, texto)
    if (p.tipo === 'ParamRange') {
      if (!perto(q.min, p.min) || !perto(q.max, p.max)) dif.push(`"${p.nome}" faixa ${q.min}..${q.max} ≠ ${p.min}..${p.max}`);
      if (typeof q.def === 'number' && !perto(q.def, p.padrao)) dif.push(`"${p.nome}" padrão ${q.def} ≠ ${+(+p.padrao).toFixed(4)}`);
    } else if (p.tipo === 'ParamChoice') {
      const nossas = q.ropts || q.opts || [];
      if (nossas.length !== (p.opcoes || []).length) dif.push(`"${p.nome}" ${nossas.length} opções ≠ ${(p.opcoes || []).length}`);
    }
  }
  const np = (d.presets || []).length, rpz = (f.presets || []).length;
  if (np < rpz) dif.push(`presets ${np} de ${rpz}`);
  linhas.push({ nome: f.nome, estado: dif.length ? 'difere' : 'igual', n: rp.length, dif });
}
const conta = e => linhas.filter(l => l.estado === e).length;
console.log(`Resolume: ${fichas.length} efeitos | controles iguais: ${conta('igual')} | com diferença: ${conta('difere')} | só o nome: ${conta('nome')} | faltam: ${conta('falta')}`);
for (const e of ['falta', 'difere', 'nome', 'igual']) {
  console.log(`\n== ${e} ==`);
  for (const l of linhas.filter(x => x.estado === e)) console.log(`  ${l.nome} (${l.n} controles${l.nosso != null ? `, nossos ${l.nosso}` : ''})${l.dif.length ? ': ' + l.dif.join('; ') : ''}`);
}
const extras = EFFECTS.filter(e => !fichas.some(f => f.nome === (e.rname || e.name))).map(e => e.name);
console.log(`\n== no OpenLuz e não no Resolume (${extras.length}) ==\n  ${extras.join(', ')}`);
const i = process.argv.indexOf('--json');
if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify(linhas, null, 1));
