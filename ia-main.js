// Texto com IA — pedidos aos serviços pelo processo principal: a chave nunca chega à página nem à composição.
// Serviços: Google Gemini (cota grátis), Groq (cota grátis), Ollama (no próprio PC, sem chave), Claude (Anthropic, pago).
// As chaves ficam em userData/ia.json cifradas pelo Windows (safeStorage). A página manda { system, user, schema } e
// recebe o objeto JSON da resposta (ou { erro }). O modelo de cada serviço vem da lista do próprio serviço.
const { app, safeStorage, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const SERVICOS = ['gemini', 'groq', 'ollama', 'claude'];
const CLAUDE_MODELO = 'claude-opus-5-5';
// Onde pegar a chave de cada serviço (o Ollama não tem chave: é a página de baixar). Lista fixa: a página só manda o nome.
const SITES = {
  gemini: 'https://aistudio.google.com/apikey',
  groq: 'https://console.groq.com/keys',
  claude: 'https://console.anthropic.com/settings/keys',
  ollama: 'https://ollama.com/download',
};
const FILE = () => path.join(app.getPath('userData'), 'ia.json');
function ler() { try { return JSON.parse(fs.readFileSync(FILE(), 'utf8')); } catch { return { servico: '', modelos: {}, chaves: {} }; } }
function gravar(c) { fs.writeFileSync(FILE(), JSON.stringify(c, null, 1)); }
function chave(c, s) {
  const b = c.chaves && c.chaves[s]; if (!b) return '';
  try { return safeStorage.decryptString(Buffer.from(b, 'base64')); } catch { return ''; }
}
// o que a página pode ver: nunca a chave, só se existe
function publica(c) { return { servico: c.servico || '', modelos: c.modelos || {}, temChave: Object.fromEntries(SERVICOS.map(s => [s, !!(c.chaves && c.chaves[s])])) }; }

const comTempo = (ms) => { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms); return { signal: ac.signal, fim: () => clearTimeout(t) }; };
async function getJson(url, opts = {}, ms = 20000) {
  const { signal, fim } = comTempo(ms);
  try {
    const r = await fetch(url, { ...opts, signal });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch { }
    if (!r.ok) { const e = new Error((j && (j.error && (j.error.message || j.error))) || txt.slice(0, 200) || ('HTTP ' + r.status)); e.status = r.status; throw e; }
    return j;
  } catch (e) { if (e.name === 'AbortError') throw new Error('o serviço demorou demais para responder'); throw e; } finally { fim(); }
}

// ---------- Ollama: abre o servidor se estiver instalado e parado ----------
const OLLAMA = 'http://127.0.0.1:11434';
let ollamaAbrindo = null;
const ollamaTam = new Map();   // nome → bytes, para escolher um modelo que caiba na placa
async function ollamaPronto() {
  try { await getJson(OLLAMA + '/api/tags', {}, 2000); return true; } catch { }
  if (!ollamaAbrindo) ollamaAbrindo = (async () => {
    const exe = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe');
    if (!fs.existsSync(exe)) return false;
    // pelo Start-Process do Windows: aberto direto daqui, o Ollama herdava os soquetes do Electron (segurava a porta do
    // DevTools e a do celular mesmo depois de o OpenLume fechar)
    try { spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', `Start-Process -WindowStyle Hidden -FilePath '${exe.replace(/'/g, "''")}' -ArgumentList 'serve'`], { stdio: 'ignore', windowsHide: true }); } catch { return false; }
    for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 500)); try { await getJson(OLLAMA + '/api/tags', {}, 1500); return true; } catch { } }
    return false;
  })().finally(() => { ollamaAbrindo = null; });
  return ollamaAbrindo;
}

// ---------- lista de modelos de cada serviço, com o escolhido por padrão ----------
async function modelos(s, k) {
  if (s === 'ollama') {
    if (!await ollamaPronto()) throw new Error('o Ollama não está instalado neste PC (ollama.com)');
    const j = await getJson(OLLAMA + '/api/tags');
    for (const m of j.models || []) ollamaTam.set(m.name, m.size || 0);
    const l = (j.models || []).map(m => m.name);
    if (!l.length) throw new Error('o Ollama não tem nenhum modelo: rode "ollama pull gemma3" uma vez');
    return l;
  }
  if (s === 'gemini') {
    const j = await getJson('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': k } });
    return (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name.replace(/^models\//, ''));
  }
  if (s === 'groq') {
    const j = await getJson('https://api.groq.com/openai/v1/models', { headers: { Authorization: 'Bearer ' + k } });
    return (j.data || []).filter(m => m.active !== false && !/whisper|tts|guard|embed/i.test(m.id)).map(m => m.id);
  }
  if (s === 'claude') return [CLAUDE_MODELO];
  return [];
}
// o padrão: o mais forte entre os que costumam ser grátis (flash do Gemini, o maior aberto do Groq, o maior do Ollama)
function padrao(s, lista) {
  const pick = (re) => lista.filter(m => re.test(m));
  const ver = (m) => (m.match(/(\d+(?:\.\d+)?)/) || [0, 0])[1] * 1;
  if (s === 'gemini') { const f = pick(/flash/i).filter(m => !/lite|image|tts|live|audio|thinking|exp/i.test(m)); return (f.sort((a, b) => ver(b) - ver(a))[0]) || lista[0]; }
  if (s === 'groq') return pick(/gpt-oss-120b/)[0] || pick(/70b/)[0] || pick(/llama/)[0] || lista[0];
  // Ollama: o maior que cabe numa placa de 8 GB (o de 26b não coube na RTX 2070 e passou de 5 min); os :cloud ficam de fora
  if (s === 'ollama') { const loc = lista.filter(m => !/:cloud$|-cloud$/.test(m)); const cabe = loc.filter(m => (ollamaTam.get(m) || 0) > 0 && ollamaTam.get(m) < 7e9).sort((a, b) => ollamaTam.get(b) - ollamaTam.get(a)); return cabe[0] || loc.sort((a, b) => (ollamaTam.get(a) || 0) - (ollamaTam.get(b) || 0))[0] || lista[0]; }
  return lista[0];
}

// ---------- o pedido: devolve o objeto JSON ----------
function jsonDe(txt) {
  if (typeof txt !== 'string') return txt;
  const t = txt.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch { }
  const i = t.indexOf('{'), j = t.lastIndexOf('}');
  if (i >= 0 && j > i) return JSON.parse(t.slice(i, j + 1));
  throw new Error('a resposta não veio em JSON');
}
async function pedir(s, modelo, k, { system, user, schema }) {
  if (s === 'claude') {
    const Anthropic = require('@anthropic-ai/sdk'); const C = Anthropic.default || Anthropic;
    const client = new C({ apiKey: k, timeout: 180000, maxRetries: 1 });
    let r;
    try {
      r = await client.beta.messages.create({
        model: CLAUDE_MODELO, max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',   // recusa por engano: o próprio serviço tenta outro modelo
        output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
        system, messages: [{ role: 'user', content: user }],
      });
    } catch (e) {
      if (e instanceof C.AuthenticationError) throw new Error('a chave do Claude não foi aceita');
      if (e instanceof C.RateLimitError) throw new Error('o Claude pediu para esperar (limite de uso)');
      if (e instanceof C.APIError) throw new Error('o Claude respondeu com erro ' + e.status + ': ' + e.message);
      throw e;
    }
    if (r.stop_reason === 'refusal') throw new Error('o Claude recusou este pedido');
    if (r.stop_reason === 'max_tokens') throw new Error('a resposta passou do tamanho máximo');
    const b = r.content.find(x => x.type === 'text'); if (!b) throw new Error('o Claude não devolveu texto');
    return jsonDe(b.text);
  }
  if (s === 'ollama') {
    if (!await ollamaPronto()) throw new Error('o Ollama não está instalado neste PC (ollama.com)');
    const j = await getJson(OLLAMA + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: modelo, stream: false, format: schema, options: { temperature: 0.8 }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }) }, 300000);
    return jsonDe(j.message && j.message.content);
  }
  if (s === 'gemini') {
    const j = await getJson('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelo) + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.9 } }) }, 120000);
    const parts = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
    if (!parts) throw new Error('o Gemini não devolveu resposta' + (j.promptFeedback && j.promptFeedback.blockReason ? ' (bloqueado: ' + j.promptFeedback.blockReason + ')' : ''));
    return jsonDe(parts.map(p => p.text || '').join(''));
  }
  if (s === 'groq') {
    const j = await getJson('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + k }, body: JSON.stringify({ model: modelo, temperature: 0.9, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system + '\n\nResponda só com o objeto JSON.' }, { role: 'user', content: user }] }) }, 120000);
    return jsonDe(j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content);
  }
  throw new Error('serviço desconhecido: ' + s);
}

// serviço de mentira para a bateria (tools/ia-check.mjs): responde na hora, sem rede, sempre igual
function falso({ user }) {
  const m = /TEXTO:\n([\s\S]*?)\n---/.exec(user); const txt = (m ? m[1] : 'TESTE').trim();
  const frases = txt.split(/(?<=[.!?])\s+|\n+/).map(x => x.trim()).filter(Boolean);
  const v = (nome, tam, cor, anim) => ({ nome, linhas: frases.slice(0, 3).map((f, i) => ({ texto: f.toUpperCase(), fonte: i ? 'Arial' : 'Impact', estilo: i ? 'Regular' : 'Bold', tamanho: i ? tam / 2 : tam, cor: i ? '#ffffffff' : cor, espaco: 0 })), alinhar: 'center', vertical: 'center', contorno: 0, corContorno: '#000000ff', brilhoFora: 0, animar: anim, clipes: frases });
  const semAnim = { ligado: false, pedacos: 'chars', ordem: 'front', atraso: 100, valor: 'aOpacity', forma: '4floor', batidas: 4, de: 0, ate: 1 };
  return { versoes: [v('Cartaz', 2, '#ffcc00ff', semAnim), v('Limpo', 1.4, '#ffffffff', semAnim), v('Batida', 1.8, '#ff3366ff', { ...semAnim, ligado: true, pedacos: 'words', valor: 'aScale', forma: '4floor', batidas: 1, de: 1, ate: 1.3 })] };
}

function instalar() {
  ipcMain.handle('ia:config', () => publica(ler()));
  // { servico?, modelo?, chave? } — chave '' apaga; a chave nunca volta para a página
  ipcMain.handle('ia:salvar', (_e, o) => {
    const c = ler(); c.modelos = c.modelos || {}; c.chaves = c.chaves || {};
    if (o.servico !== undefined) c.servico = SERVICOS.includes(o.servico) ? o.servico : '';
    const s = o.para || c.servico;
    if (o.modelo !== undefined && s) c.modelos[s] = String(o.modelo || '');
    if (o.chave !== undefined && s) {
      if (!o.chave) delete c.chaves[s];
      else { if (!safeStorage.isEncryptionAvailable()) throw new Error('o Windows não liberou a cifra para guardar a chave'); c.chaves[s] = safeStorage.encryptString(String(o.chave).trim()).toString('base64'); }
    }
    gravar(c); return publica(c);
  });
  ipcMain.handle('ia:site', (_e, s) => { if (!SITES[s]) return false; shell.openExternal(SITES[s]); return true; });
  // Testar: lista os modelos do serviço e guarda o padrão se ainda não houver
  ipcMain.handle('ia:testar', async (_e, s) => {
    const c = ler();
    try {
      if (s !== 'ollama' && !chave(c, s)) return { ok: false, erro: 'cole a chave primeiro' };
      const l = await modelos(s, chave(c, s));
      if (!l.length) return { ok: false, erro: 'o serviço não listou nenhum modelo de texto' };
      c.modelos = c.modelos || {}; if (!c.modelos[s] || !l.includes(c.modelos[s])) c.modelos[s] = padrao(s, l);
      gravar(c); return { ok: true, modelos: l, modelo: c.modelos[s] };
    } catch (e) { return { ok: false, erro: String(e.message || e) }; }
  });
  ipcMain.handle('ia:pedir', async (_e, req) => {
    const c = ler(), s = req.servico || c.servico;
    try {
      if (s === 'falso') return { ok: true, resposta: falso(req) };
      if (!SERVICOS.includes(s)) return { ok: false, erro: 'escolha um serviço em Configuração › IA', semServico: true };
      if (s !== 'ollama' && !chave(c, s)) return { ok: false, erro: 'falta a chave do serviço em Configuração › IA', semServico: true };
      let modelo = (c.modelos || {})[s];
      if (!modelo && s !== 'claude') { const l = await modelos(s, chave(c, s)); modelo = padrao(s, l); c.modelos = c.modelos || {}; c.modelos[s] = modelo; gravar(c); }
      return { ok: true, resposta: await pedir(s, modelo, chave(c, s), req), servico: s, modelo: s === 'claude' ? CLAUDE_MODELO : modelo };
    } catch (e) { return { ok: false, erro: String(e.message || e) }; }
  });
}
module.exports = { instalar };
