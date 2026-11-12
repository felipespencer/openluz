// Abre um OpenLuz de desenvolvimento para a bancada, com pasta de dados à parte, e sai deixando-o aberto.
// Uso: node tools/compare/abre-dev.mjs [porta=9333]      fecha: node tools/compare/abre-dev.mjs fecha [porta]
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const fecha = process.argv[2] === 'fecha', porta = +(process.argv[fecha ? 3 : 2] || 9333);
const ud = path.join(os.tmpdir(), 'openluz-bancada-' + porta), pidArq = path.join(ud, 'bancada.pid');
const S = ms => new Promise(r => setTimeout(r, ms));
if (fecha) {
  try { execFileSync('taskkill', ['/PID', fs.readFileSync(pidArq, 'utf8').trim(), '/T', '/F'], { stdio: 'ignore' }); fs.rmSync(pidArq); console.log('fechado'); } catch { console.log('não estava aberto'); }
  process.exit(0);
}
fs.mkdirSync(ud, { recursive: true });
const p = spawn(path.join(ROOT, 'node_modules/electron/dist/electron.exe'), ['.', `--remote-debugging-port=${porta}`], { cwd: ROOT, env: { ...process.env, PROJ_USERDATA: ud }, stdio: 'ignore', detached: true });
p.unref(); fs.writeFileSync(pidArq, String(p.pid));
for (let i = 0; i < 80; i++) {
  await S(500);
  try { const pg = await (await fetch(`http://127.0.0.1:${porta}/json`)).json(); if (pg.find(x => x.type === 'page' && x.title === 'OpenLuz')) { await S(5000); console.log('aberto, pid', p.pid, 'porta', porta); process.exit(0); } } catch { }
}
console.error('não abriu'); process.exit(1);
