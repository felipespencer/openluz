// Roda o confere.mjs em todos os efeitos que têm gabarito e junta os resumos numa tabela.
// Uso: node tools/compare/confere-tudo.mjs [porta=9333]   -> tools/compare/saida/conf/_tudo.json e a tabela na tela
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), porta = process.argv[2] || '9333';
const REF = path.join(HERE, 'saida', 'ref'), out = [];
for (const d of fs.readdirSync(REF).sort()) {
  const cj = path.join(REF, d, 'casos.json'); if (!fs.existsSync(cj)) continue;
  const g = JSON.parse(fs.readFileSync(cj, 'utf8'));
  try {
    const t = execFileSync('node', [path.join(HERE, 'confere.mjs'), g.efeito, '--porta', porta], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26, timeout: 600000 }).trim().split('\n').pop();
    const r = JSON.parse(t); const padrao = g.casos[0] || {};
    out.push({ ...r, anima: !!padrao.anima });
  } catch (e) { out.push({ efeito: g.efeito, erro: String(e.stderr || e.message).trim().split('\n').pop().slice(0, 160) }); }
  const u = out[out.length - 1];
  console.log(u.erro ? `${u.efeito}: ERRO ${u.erro}` : `${u.efeito}: média ${u.media}${u.anima ? ' (mexe)' : ''} pior ${u.pior ? u.pior.caso + ' ' + u.pior.media : '-'}${u.semControle.length ? ' SEM: ' + u.semControle.join(',') : ''}`);
}
fs.writeFileSync(path.join(HERE, 'saida', 'conf', '_tudo.json'), JSON.stringify(out, null, 1));
const ok = out.filter(x => !x.erro && !x.anima && x.media != null);
console.log(`\n${out.length} efeitos | parados e medidos: ${ok.length} | igual (≤2): ${ok.filter(x => x.media <= 2).length} | perto (≤6): ${ok.filter(x => x.media > 2 && x.media <= 6).length} | longe: ${ok.filter(x => x.media > 6).length} | mexem sozinhos: ${out.filter(x => x.anima).length} | erro: ${out.filter(x => x.erro).length}`);
