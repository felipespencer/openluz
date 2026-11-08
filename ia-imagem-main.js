// ✦ IA generativa (plano 09-02, maquete ia-generativa-mockup.html): imagens por pedido, pelo processo principal.
// Serviços: Gemini (a mesma chave do Texto com IA), Pollinations (sem chave), ComfyUI no próprio PC, OpenAI (pago) e 'falso'
// (a bateria: desenha uma imagem lisa, sem rede). A chave nunca sai daqui; a página recebe só os caminhos dos arquivos gravados
// em Vídeos\OpenLume\IA. Nenhum código vem da IA: a resposta é imagem (bytes) e nada mais.
const { app, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const zlib = require('node:zlib');

const SERVICOS_IMG = ['gemini', 'pollinations', 'comfyui', 'openai'];
const SITES_IMG = { gemini: 'https://aistudio.google.com/apikey', openai: 'https://platform.openai.com/api-keys', comfyui: 'https://www.comfy.org/download', pollinations: 'https://pollinations.ai' };
const ESTILO = {
  ia: '', foto: 'fotografia realista, luz natural, alta definição', ilustracao: 'ilustração digital colorida, traço limpo',
  neon: 'estética neon cyberpunk, cores saturadas brilhando no escuro', aquarela: 'pintura em aquarela, manchas suaves, papel texturizado',
  psicodelico: 'arte psicodélica, cores vibrantes, padrões fluidos', xilogravura: 'xilogravura de cordel nordestino, preto e branco, traço grosso',
  vj: 'fundo abstrato para projeção de VJ, formas e luz, sem texto, sem pessoas', textura: 'textura contínua sem emendas (tileable), sem texto',
};
const PROP = { '16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1440, 1440], '4:3': [1600, 1200] };

const pasta = () => { const d = path.join(app.getPath('videos'), 'OpenLume', 'IA'); fs.mkdirSync(d, { recursive: true }); return d; };
const nomeArq = (pedido, i, ext) => {
  const base = String(pedido || 'imagem').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40).toLowerCase() || 'imagem';
  const t = new Date(), p2 = (n) => String(n).padStart(2, '0');
  const rnd = Math.random().toString(36).slice(2, 6);   // duas versões no mesmo segundo não podem ter o mesmo nome
  return `${base}-${t.getFullYear()}${p2(t.getMonth() + 1)}${p2(t.getDate())}-${p2(t.getHours())}${p2(t.getMinutes())}${p2(t.getSeconds())}-${i + 1}${rnd}.${ext}`;
};
function gravarImg(pedido, i, buf, mime) {
  const ext = /png/.test(mime) ? 'png' : /webp/.test(mime) ? 'webp' : 'jpg';
  const f = path.join(pasta(), nomeArq(pedido, i, ext)); fs.writeFileSync(f, buf); return f;
}
const textoPedido = (r) => [r.pedido, ESTILO[r.estilo] || '', r.extra || ''].filter(Boolean).join(', ');

// PNG liso (a bateria e a casa vazia): sem dependência nenhuma
function crc32(b) { let c, crc = 0xffffffff; for (let n = 0; n < b.length; n++) { c = (crc ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(tipo, dados) { const t = Buffer.from(tipo), len = Buffer.alloc(4), crc = Buffer.alloc(4); len.writeUInt32BE(dados.length); crc.writeUInt32BE(crc32(Buffer.concat([t, dados]))); return Buffer.concat([len, t, dados, crc]); }
function pngLiso(w, h, pinta) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const [r, g, b] = pinta(x, y); const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const comTempo = (ms) => { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms); return { signal: ac.signal, fim: () => clearTimeout(t) }; };
async function buscar(url, opts = {}, ms = 120000) {
  const { signal, fim } = comTempo(ms);
  try {
    const r = await fetch(url, { ...opts, signal });
    if (!r.ok) {
      const txt = await r.text().catch(() => ''); let j = null; try { j = JSON.parse(txt); } catch { }
      const msg = (j && (j.error && (j.error.message || j.error))) || txt.slice(0, 200) || ('HTTP ' + r.status);
      const e = new Error(r.status === 429 ? (/generativelanguage/.test(url) ? 'o Gemini não liberou imagem para esta chave (429): a imagem dele é paga; ative o faturamento no Google AI Studio ou use o Pollinations' : 'o serviço disse que a cota acabou por agora (429): tente daqui a pouco ou troque de serviço') : r.status === 401 || r.status === 403 ? 'a chave não foi aceita (' + r.status + ')' : String(msg)); e.status = r.status; throw e;
    }
    return r;
  } catch (e) { if (e.name === 'AbortError') throw new Error('o serviço demorou demais para responder'); if (/fetch failed/.test(e.message)) throw new Error('sem conexão com o serviço'); throw e; } finally { fim(); }
}

// ---------- cada serviço devolve [{ buf, mime }] ----------
async function gemini(k, r, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const parts = [{ text: (r.base ? 'Faça uma variação desta imagem: ' : 'Gere uma imagem: ') + textoPedido(r) + (i ? ` (versão ${i + 1}, diferente das outras)` : '') }];
    if (r.base) parts.push({ inlineData: { mimeType: r.base.mime, data: r.base.b64 } });
    const res = await buscar(`https://generativelanguage.googleapis.com/v1beta/models/${r.modelo || 'gemini-2.5-flash-image'}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: r.prop in PROP ? r.prop : '16:9' } } }),
    });
    const j = await res.json();
    const p = (((j.candidates || [])[0] || {}).content || {}).parts || [];
    const img = p.find(x => x.inlineData || x.inline_data); const d = img && (img.inlineData || img.inline_data);
    if (!d) throw new Error('o Gemini não devolveu imagem' + (j.candidates && j.candidates[0] && j.candidates[0].finishReason ? ' (' + j.candidates[0].finishReason + ')' : ''));
    out.push({ buf: Buffer.from(d.data, 'base64'), mime: d.mimeType || d.mime_type || 'image/png' });
  }
  return out;
}
async function pollinations(r, n) {
  const [w, h] = PROP[r.prop] || PROP['16:9'], f = r.maior ? 2 : 1;
  return Promise.all(Array.from({ length: n }, async (_, i) => {
    const seed = Math.floor(Math.random() * 1e9) + i;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(textoPedido(r))}?width=${w * f}&height=${h * f}&seed=${seed}&nologo=true&model=flux`;
    const res = await buscar(url, {}, 180000);
    return { buf: Buffer.from(await res.arrayBuffer()), mime: res.headers.get('content-type') || 'image/jpeg' };
  }));
}
async function openai(k, r, n) {
  const size = r.prop === '9:16' ? '1024x1536' : r.prop === '1:1' ? '1024x1024' : '1536x1024';
  const res = await buscar('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + k }, body: JSON.stringify({ model: 'gpt-image-1', prompt: textoPedido(r), size, n, quality: r.maior ? 'high' : 'medium' }) }, 240000);
  const j = await res.json();
  return (j.data || []).map(d => ({ buf: Buffer.from(d.b64_json, 'base64'), mime: 'image/png' }));
}
const COMFY = 'http://127.0.0.1:8188';
async function comfyui(r, n) {
  let ckpts;
  try { const j = await (await buscar(COMFY + '/object_info/CheckpointLoaderSimple', {}, 4000)).json(); ckpts = j.CheckpointLoaderSimple.input.required.ckpt_name[0]; }
  catch { throw new Error('o ComfyUI não está aberto neste PC (porta 8188)'); }
  if (!ckpts || !ckpts.length) throw new Error('o ComfyUI não tem nenhum modelo (checkpoint) baixado');
  const [w0, h0] = PROP[r.prop] || PROP['16:9'], esc = (r.maior ? 1.5 : 1) * 1024 / Math.max(w0, h0), w = Math.round(w0 * esc / 64) * 64, h = Math.round(h0 * esc / 64) * 64;
  const ck = ckpts.find(c => /sdxl|xl/i.test(c)) || ckpts[0];
  const g = {
    1: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: ck } },
    2: { class_type: 'CLIPTextEncode', inputs: { text: textoPedido(r), clip: ['1', 1] } },
    3: { class_type: 'CLIPTextEncode', inputs: { text: 'texto, marca d\'água, borrado, deformado', clip: ['1', 1] } },
    4: { class_type: 'EmptyLatentImage', inputs: { width: w, height: h, batch_size: n } },
    5: { class_type: 'KSampler', inputs: { seed: Math.floor(Math.random() * 1e9), steps: 25, cfg: 6.5, sampler_name: 'euler', scheduler: 'normal', denoise: 1, model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['4', 0] } },
    6: { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
    7: { class_type: 'SaveImage', inputs: { filename_prefix: 'openlume', images: ['6', 0] } },
  };
  const { prompt_id } = await (await buscar(COMFY + '/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: g }) }, 10000)).json();
  for (let t = 0; t < 600; t++) {
    await new Promise(z => setTimeout(z, 1000));
    const h2 = await (await buscar(COMFY + '/history/' + prompt_id, {}, 5000)).json();
    const it = h2[prompt_id]; if (!it) continue;
    const imgs = (it.outputs && it.outputs['7'] && it.outputs['7'].images) || [];
    return Promise.all(imgs.map(async im => { const res = await buscar(`${COMFY}/view?filename=${encodeURIComponent(im.filename)}&subfolder=${encodeURIComponent(im.subfolder || '')}&type=${im.type || 'output'}`, {}, 20000); return { buf: Buffer.from(await res.arrayBuffer()), mime: 'image/png' }; }));
  }
  throw new Error('o ComfyUI não terminou em 10 minutos');
}
function falso(r, n) {
  const [w, h] = (PROP[r.prop] || PROP['16:9']).map(v => Math.round(v / 6));
  return Array.from({ length: n }, (_, i) => {
    const hue = (r.pedido.length * 37 + i * 90) % 360, cor = (l) => { const c = (1 - Math.abs(2 * l - 1)), x = c * (1 - Math.abs(((hue / 60) % 2) - 1)), m = l - c / 2; const [a, b, d] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x]; return [a, b, d].map(v => Math.round((v + m) * 255)); };
    return { buf: pngLiso(w, h, (x, y) => cor(0.25 + 0.4 * (x / w + y / h) / 2)), mime: 'image/png' };
  });
}

function instalarImagem({ ler, gravar, chave }) {
  // casa vazia: uma imagem de espera (roxa) que vira a do pedido
  ipcMain.handle('iaimg:espera', () => {
    const f = path.join(pasta(), 'espera.png');
    if (!fs.existsSync(f)) fs.writeFileSync(f, pngLiso(480, 270, (x, y) => { const v = 0.5 + 0.5 * Math.cos(Math.hypot(x - 240, y - 135) / 40); return [Math.round(26 + 30 * v), Math.round(16 + 10 * v), Math.round(46 + 50 * v)]; }));
    return f;
  });
  ipcMain.handle('iaimg:config', () => { const c = ler(); return { servico: c.servicoImagem || 'pollinations', temChave: Object.fromEntries(SERVICOS_IMG.map(s => [s, s === 'pollinations' || s === 'comfyui' || !!(c.chaves && c.chaves[s])])) }; });
  ipcMain.handle('iaimg:servico', (_e, s) => { const c = ler(); if (SERVICOS_IMG.includes(s)) { c.servicoImagem = s; gravar(c); } return c.servicoImagem; });
  ipcMain.handle('iaimg:site', (_e, s) => { if (!SITES_IMG[s]) return false; shell.openExternal(SITES_IMG[s]); return true; });
  // { pedido, estilo, prop, n, maior?, base? (caminho de uma versão para variar), servico? } → { ok, arquivos } | { ok:false, erro }
  ipcMain.handle('iaimg:gerar', async (_e, r) => {
    const c = ler(), s = r.servico || c.servicoImagem || 'pollinations', n = Math.max(1, Math.min(4, r.n || 1));
    try {
      const pedido = String(r.pedido || '').trim().slice(0, 1500); if (!pedido) return { ok: false, erro: 'escreva o pedido primeiro' };
      const req = { pedido, estilo: String(r.estilo || 'ia'), prop: String(r.prop || '16:9'), maior: !!r.maior };
      if (r.base && s === 'gemini') { const b = fs.readFileSync(r.base); req.base = { b64: b.toString('base64'), mime: /png$/i.test(r.base) ? 'image/png' : 'image/jpeg' }; }
      if (r.base && s !== 'gemini') req.extra = 'variação parecida com a anterior';
      let imgs;
      if (s === 'falso') imgs = falso(req, n);
      else if (s === 'pollinations') imgs = await pollinations(req, n);
      else if (s === 'comfyui') imgs = await comfyui(req, n);
      else if (s === 'gemini' || s === 'openai') { const k = chave(c, s); if (!k) return { ok: false, erro: 'falta a chave do ' + (s === 'gemini' ? 'Gemini' : 'OpenAI') + ': cole em Configuração › IA', semChave: true }; imgs = s === 'gemini' ? await gemini(k, req, n) : await openai(k, req, n); }
      else return { ok: false, erro: 'serviço desconhecido' };
      if (!imgs.length) return { ok: false, erro: 'o serviço não devolveu imagem' };
      return { ok: true, servico: s, arquivos: imgs.map((im, i) => gravarImg(pedido, i, im.buf, im.mime)) };
    } catch (e) { return { ok: false, erro: String(e.message || e) }; }
  });
}
module.exports = { instalarImagem, SERVICOS_IMG };
