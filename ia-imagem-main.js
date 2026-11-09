// ✦ IA generativa (plano 09-02, maquete ia-generativa-mockup.html): imagens por pedido, pelo processo principal.
// Serviços: Gemini (a mesma chave do Texto com IA), Pollinations (sem chave), ComfyUI no próprio PC, OpenAI (pago) e 'falso'
// (a bateria: desenha uma imagem lisa, sem rede). A chave nunca sai daqui; a página recebe só os caminhos dos arquivos gravados
// em Vídeos\OpenLuz\IA. Nenhum código vem da IA: a resposta é imagem (bytes) e nada mais.
const { app, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const zlib = require('node:zlib');

const SERVICOS_IMG = ['gemini', 'pollinations', 'comfyui', 'openai', 'higgsfield'];
const PAGOS_IMG = ['gemini', 'openai', 'higgsfield'];
const NOME_IMG = { gemini: 'Gemini', openai: 'OpenAI', higgsfield: 'Higgsfield' };
const SITES_IMG = { gemini: 'https://aistudio.google.com/apikey', openai: 'https://platform.openai.com/api-keys', comfyui: 'https://www.comfy.org/download', pollinations: 'https://pollinations.ai', higgsfield: 'https://console.higgsfield.ai' };
const ESTILO = {
  ia: '', foto: 'fotografia realista, luz natural, alta definição', ilustracao: 'ilustração digital colorida, traço limpo',
  neon: 'estética neon cyberpunk, cores saturadas brilhando no escuro', aquarela: 'pintura em aquarela, manchas suaves, papel texturizado',
  psicodelico: 'arte psicodélica, cores vibrantes, padrões fluidos', xilogravura: 'xilogravura de cordel nordestino, preto e branco, traço grosso',
  vj: 'fundo abstrato para projeção de VJ, formas e luz, sem texto, sem pessoas', textura: 'textura contínua sem emendas (tileable), sem texto',
};
const PROP = { '16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1440, 1440], '4:3': [1600, 1200] };

const pasta = () => { const d = path.join(app.getPath('videos'), 'OpenLuz', 'IA'); fs.mkdirSync(d, { recursive: true }); return d; };
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

// Erro do serviço → frase em português + o que fazer. e.esperar (segundos) só quando esperar resolve (limite por tempo);
// e.trocar quando não adianta insistir com este serviço (cota zero, sem crédito, chave recusada): a página oferece o grátis.
// Respostas medidas em 2026-11-09: Pollinations grátis = 402 FREE_LIMIT "1 image every 45 seconds per IP. Retry after 45s";
// Gemini com chave grátis = 429 "generate_content_free_tier_requests, limit: 0" em todos os modelos de imagem;
// Higgsfield sem saldo = 403 {"detail":"not_enough_credits"}.
function erroDoServico(url, status, j, txt) {
  const quem = /pollinations/.test(url) ? 'pollinations' : /generativelanguage/.test(url) ? 'gemini' : /openai\.com/.test(url) ? 'openai' : /higgsfield|^http:\/\/127\.0\.0\.1:18/.test(url) ? 'higgsfield' : '';
  const det = String((j && ((j.error && (j.error.message || j.error.code || j.error)) || j.detail || j.message)) || txt || '').slice(0, 400);
  const seg = /retry after\s*(\d+)\s*s/i.exec(det) || /"retryDelay"\s*:\s*"(\d+)/.exec(txt) || /(\d+)\s*seconds?/i.exec(det);
  const mk = (m, extra = {}) => Object.assign(new Error(m), { status }, extra);
  if (quem === 'pollinations' && (status === 402 || status === 429)) return mk('o Pollinations grátis faz 1 imagem a cada 45 s', { esperar: Math.min(120, (seg ? +seg[1] : 45) + 2) });
  if (quem === 'gemini' && status === 429) {
    if (/limit:\s*0\b/.test(det)) return mk('a chave do Gemini não tem imagem grátis (o Google dá cota zero de imagem sem faturamento). Ative o faturamento no Google AI Studio ou use o Pollinations', { trocar: true });
    return mk('o Gemini pediu um tempo (limite por minuto)', { esperar: Math.min(120, (seg ? +seg[1] : 30) + 2) });
  }
  if (/not_enough_credits|insufficient.*(credit|balance|fund)|billing_hard_limit/i.test(det) || status === 402) return mk('sem crédito no ' + ({ higgsfield: 'Higgsfield: ponha saldo em console.higgsfield.ai', openai: 'OpenAI: ponha saldo em platform.openai.com', gemini: 'Gemini' }[quem] || 'serviço'), { trocar: true });
  if (status === 401 || status === 403) return mk('a chave não foi aceita (' + status + '): confira se colou inteira' + (quem === 'higgsfield' ? ', no formato ID:segredo' : ''), { trocar: true });
  if (status === 429) return mk('o serviço pediu um tempo (429)', { esperar: Math.min(120, (seg ? +seg[1] : 30) + 2) });
  if (status >= 500) return mk('o serviço está com problema agora (' + status + '): tente de novo daqui a pouco ou troque de serviço');
  return mk(det || 'HTTP ' + status);
}

const comTempo = (ms) => { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms); return { signal: ac.signal, fim: () => clearTimeout(t) }; };
async function buscar(url, opts = {}, ms = 120000) {
  const { signal, fim } = comTempo(ms);
  try {
    const r = await fetch(url, { ...opts, signal });
    if (!r.ok) {
      const txt = await r.text().catch(() => ''); let j = null; try { j = JSON.parse(txt); } catch { }
      throw erroDoServico(url, r.status, j, txt);
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
    const res = await buscar(url, {}, 180000), mime = res.headers.get('content-type') || '';
    if (!/^image\//.test(mime)) throw new Error('o Pollinations respondeu sem imagem: tente de novo');
    return { buf: Buffer.from(await res.arrayBuffer()), mime };
  }));
}
async function openai(k, r, n) {
  const size = r.prop === '9:16' ? '1024x1536' : r.prop === '1:1' ? '1024x1024' : '1536x1024';
  const res = await buscar('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + k }, body: JSON.stringify({ model: 'gpt-image-1', prompt: textoPedido(r), size, n, quality: r.maior ? 'high' : 'medium' }) }, 240000);
  const j = await res.json();
  return (j.data || []).map(d => ({ buf: Buffer.from(d.b64_json, 'base64'), mime: 'image/png' }));
}
// Higgsfield (plano 09-03): SOUL 2 pela API pública (docs.higgsfield.ai, lida em 2026-11-09). Chave = "ID:segredo" do console;
// pedido na fila → acompanha pelo status_url que a resposta trouxe (só se for do mesmo host: a chave não vai para outro lugar)
// → baixa images[].url na hora (a URL expira). batch_size só aceita 1 ou 4: 4 vai num pedido, 1 e 2 vão um por um.
// PROJ_HIGGS_URL (só no programa de desenvolvimento) aponta para o servidor de mentira da bateria (tools/higgs-falso.mjs).
const HIGGS = () => (!app.isPackaged && process.env.PROJ_HIGGS_URL) || 'https://api.higgsfield.ai';
const HIGGS_PROP = { '16:9': 16 / 9, '9:16': 9 / 16, '4:3': 4 / 3, '3:4': 3 / 4, '1:1': 1, '2:3': 2 / 3, '3:2': 3 / 2 };
const espera = (ms) => new Promise(r => setTimeout(r, ms));
async function higgsfield(k, r, n) {
  if (!/^[^:\s]+:[^:\s]+$/.test(k)) throw new Error('a chave do Higgsfield é ID:segredo (as duas partes que o console mostra, com dois-pontos no meio)');
  const base = HIGGS(), host = new URL(base).host, seguro = new URL(base).protocol === 'https:';
  const [pw, ph] = (r.prop || '16:9').split(':').map(Number), alvo = pw && ph ? pw / ph : 16 / 9;
  const aspect = Object.keys(HIGGS_PROP).reduce((a, b) => Math.abs(Math.log(HIGGS_PROP[b] / alvo)) < Math.abs(Math.log(HIGGS_PROP[a] / alvo)) ? b : a);
  const H = () => ({ 'Content-Type': 'application/json', Authorization: 'Key ' + k, 'Idempotency-Key': require('node:crypto').randomUUID() });
  const doHost = (u) => { try { const x = new URL(u); return x.host === host && (x.protocol === 'https:' || !seguro); } catch { return false; } };
  const um = async (lote) => {
    const res = await buscar(base + '/higgsfield-ai/soul/v2/standard', { method: 'POST', headers: H(), body: JSON.stringify({ prompt: textoPedido(r), aspect_ratio: aspect, resolution: r.maior ? '1080p' : '720p', batch_size: lote }) }, 60000);
    let j = await res.json();
    const st = j.status_url || (j.request_id ? base + '/requests/' + encodeURIComponent(j.request_id) + '/status' : '');
    if (!st || !doHost(st)) throw new Error('o Higgsfield respondeu sem um endereço de acompanhamento válido');
    const t0 = Date.now();
    while (!['completed', 'failed', 'nsfw', 'canceled'].includes(j.status)) {
      if (Date.now() - t0 > 300000) {
        if (j.cancel_url && doHost(j.cancel_url)) fetch(j.cancel_url, { method: 'POST', headers: { Authorization: 'Key ' + k } }).catch(() => { });
        throw new Error('o Higgsfield não terminou em 5 minutos (pedido cancelado)');
      }
      await espera(2000);
      j = { cancel_url: j.cancel_url, ...(await (await buscar(st, { headers: { Authorization: 'Key ' + k } }, 20000)).json()) };
    }
    if (j.status === 'nsfw') throw new Error('o Higgsfield recusou o pedido pela moderação de conteúdo (nsfw): mude o texto');
    if (j.status === 'canceled') throw new Error('o pedido foi cancelado no Higgsfield');
    if (j.status === 'failed') throw new Error('o Higgsfield não conseguiu gerar' + (j.error ? ': ' + String(j.error.message || j.error).slice(0, 200) : ''));
    const urls = (j.images || []).map(x => x && x.url).filter(u => /^https?:\/\//.test(u || ''));
    return Promise.all(urls.map(async u => { const im = await buscar(u, {}, 60000); return { buf: Buffer.from(await im.arrayBuffer()), mime: im.headers.get('content-type') || 'image/jpeg' }; }));
  };
  if (n === 4) return um(4);
  return (await Promise.all(Array.from({ length: n }, () => um(1)))).flat();
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
    7: { class_type: 'SaveImage', inputs: { filename_prefix: 'openluz', images: ['6', 0] } },
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
      else if (PAGOS_IMG.includes(s)) { const k = chave(c, s); if (!k) return { ok: false, erro: 'falta a chave do ' + NOME_IMG[s] + ': cole em Configuração › IA (imagens)', semChave: true }; imgs = s === 'gemini' ? await gemini(k, req, n) : s === 'openai' ? await openai(k, req, n) : await higgsfield(k, req, n); }
      else return { ok: false, erro: 'serviço desconhecido' };
      if (!imgs.length) return { ok: false, erro: 'o serviço não devolveu imagem' };
      return { ok: true, servico: s, arquivos: imgs.map((im, i) => gravarImg(pedido, i, im.buf, im.mime)) };
    } catch (e) { return { ok: false, erro: String(e.message || e), esperar: e.esperar || 0, trocar: !!e.trocar, servico: s }; }
  });
}
module.exports = { instalarImagem, SERVICOS_IMG };
