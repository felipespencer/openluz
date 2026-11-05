// Roda uma lista de casos da bancada (compare.mjs) de um efeito, cada um com a base mais as mudanças dele.
// Uso: node tools/compare/casos.mjs <arquivo de casos .json>
//   { "efeito": "Grid Cloner", "clip": "tools/compare/clips/prova.png", "base": { "Columns": 4 }, "casos": { "gc2": { "Rotation": 15 } } }
// Imprime uma linha por caso: rótulo, diferença média e máxima, pixels acima de 16.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const L = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const so = process.argv[3] ? process.argv[3].split(',') : null;
for (const [nome, mud] of Object.entries(L.casos)) {
  if (so && !so.includes(nome)) continue;
  const v = { ...L.base, ...mud }, a = ['tools/compare/compare.mjs', L.efeito, '--nome', nome];
  if (L.clip) a.push('--clip', mud.__clip || L.clip);
  if (L.espera) a.push('--espera', String(L.espera));
  for (const [k, x] of Object.entries(v)) if (!k.startsWith('__')) a.push('--r', `${k}=${x}`);
  try {
    const out = execFileSync('node', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim().split('\n').pop();
    const j = JSON.parse(out);
    console.log(`${nome.padEnd(10)} média ${String(j.media).padEnd(6)} máx ${String(j.max).padEnd(4)} >16: ${j.acima16}  ${JSON.stringify(mud)}`);
  } catch (e) { console.log(`${nome.padEnd(10)} ERRO ${(e.stderr || e.message).toString().split('\n').slice(-3).join(' ')}`); }
}
