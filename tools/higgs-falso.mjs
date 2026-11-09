// Higgsfield de mentira (plano 09-03): imita a API pública (POST do SOUL 2 → fila → status_url → images[].url) para a bateria
// testar o caminho inteiro sem rede e sem gastar crédito. Palavras no pedido escolhem erro: #401, #402, #nsfw, #failed.
// Uso: import { subir } from './higgs-falso.mjs'  ou  node tools/higgs-falso.mjs [porta]  (padrão 18089)
// O programa de desenvolvimento precisa abrir com PROJ_HIGGS_URL=http://127.0.0.1:<porta>. GET /__log devolve o que chegou.
import http from 'node:http';
import zlib from 'node:zlib';

function png(w, h, cor) {
  const crc = (b) => { let c, x = 0xffffffff; for (let n = 0; n < b.length; n++) { c = (x ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; x = (x >>> 8) ^ c; } return (x ^ 0xffffffff) >>> 0; };
  const ch = (t, d) => { const tb = Buffer.from(t), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(d.length); c.writeUInt32BE(crc(Buffer.concat([tb, d]))); return Buffer.concat([l, tb, d, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(cor, y * (w * 3 + 1) + 1 + x * 3);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]);
}

export function subir(porta = 18089) {
  const log = [], pedidos = new Map(); let seq = 0;
  const srv = http.createServer(async (req, res) => {
    const json = (st, o) => { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    const u = new URL(req.url, 'http://x'), base = `http://127.0.0.1:${porta}`;
    if (u.pathname === '/__log') return json(200, log);
    if (u.pathname === '/__limpar') { log.length = 0; return json(200, {}); }
    let corpo = ''; for await (const c of req) corpo += c;
    if (req.method === 'POST' && u.pathname === '/higgsfield-ai/soul/v2/standard') {
      let b = {}; try { b = JSON.parse(corpo); } catch { }
      log.push({ auth: req.headers.authorization || '', idem: req.headers['idempotency-key'] || '', body: b });
      if (/#401/.test(b.prompt)) return json(401, { detail: 'Invalid credentials' });
      if (/#402/.test(b.prompt)) return json(402, { detail: 'Not enough credits' });
      if (!/^Key [^:]+:[^:]+$/.test(req.headers.authorization || '')) return json(401, { detail: 'missing key' });
      const id = 'req-' + (++seq);
      pedidos.set(id, { t0: Date.now(), b });
      return json(200, { status: 'queued', request_id: id, status_url: `${base}/requests/${id}/status`, cancel_url: `${base}/requests/${id}/cancel` });
    }
    let m = /^\/requests\/([^/]+)\/(status|cancel)$/.exec(u.pathname);
    if (m) {
      const p = pedidos.get(m[1]); if (!p) return json(404, { detail: 'not found' });
      if (m[2] === 'cancel') { res.writeHead(202); return res.end(); }
      const dt = Date.now() - p.t0, pr = p.b.prompt || '';
      if (dt < 1200) return json(200, { status: 'queued', request_id: m[1] });
      if (dt < 2500) return json(200, { status: 'in_progress', request_id: m[1] });
      if (/#nsfw/.test(pr)) return json(200, { status: 'nsfw', request_id: m[1] });
      if (/#failed/.test(pr)) return json(200, { status: 'failed', request_id: m[1], error: 'falha de mentira' });
      const n = p.b.batch_size || 1;
      return json(200, { status: 'completed', request_id: m[1], images: Array.from({ length: n }, (_, i) => ({ url: `${base}/img/${m[1]}-${i}.png` })) });
    }
    m = /^\/img\/(.+)\.png$/.exec(u.pathname);
    if (m) { const p = pedidos.get(m[1].replace(/-\d+$/, '')), r = p && p.b.resolution === '1080p' ? 2 : 1; res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(png(64 * r, 36 * r, [200, 60 + (seq * 40) % 190, 120])); }
    json(404, { detail: 'not found' });
  });
  return new Promise(r => srv.listen(porta, '127.0.0.1', () => r({ srv, porta, log })));
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) { const { porta } = await subir(Number(process.argv[2]) || 18089); console.log('Higgsfield de mentira em http://127.0.0.1:' + porta); }
