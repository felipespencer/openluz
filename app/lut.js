// LUT 3D (efeito LUT, igual ao do Resolume 7.28): lê arquivo .cube (Adobe/Resolve) e guarda os LUTs que vêm com o
// OpenLuz. Os do OpenLuz são feitos por conta aqui (nenhum arquivo de terceiros); os do Resolume (pasta luts dele, da
// IWLTBAP) não podem ser redistribuídos, mas a pessoa pode abrir qualquer .cube que tiver.
// Uma LUT: { name, n, data: Float32Array(n³ × 4, RGBA) }, vermelho variando mais rápido, como no .cube.

export function parseCube(text, name = 'LUT') {
  let n = 0, i = 0, data = null, min = [0, 0, 0], max = [1, 1, 1];
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l || l[0] === '#') continue;
    const w = l.split(/\s+/);
    const k = w[0].toUpperCase();
    if (k === 'TITLE') { name = l.slice(5).trim().replace(/^"|"$/g, '') || name; continue; }
    if (k === 'LUT_3D_SIZE') { n = parseInt(w[1], 10); if (!(n >= 2 && n <= 256)) throw new Error('LUT_3D_SIZE inválido'); data = new Float32Array(n * n * n * 4); continue; }
    if (k === 'LUT_1D_SIZE') throw new Error('LUT 1D não é aceito (só 3D)');
    if (k === 'DOMAIN_MIN') { min = w.slice(1, 4).map(Number); continue; }
    if (k === 'DOMAIN_MAX') { max = w.slice(1, 4).map(Number); continue; }
    if (/^[A-Z_]+$/.test(k)) continue;   // outra palavra-chave que não muda nada aqui
    if (!data) throw new Error('falta LUT_3D_SIZE antes dos valores');
    if (i >= n * n * n) continue;
    data[i * 4] = +w[0]; data[i * 4 + 1] = +w[1]; data[i * 4 + 2] = +w[2]; data[i * 4 + 3] = 1; i++;
  }
  if (!data || i < n * n * n) throw new Error('arquivo .cube incompleto');
  return { name, n, data, min, max };
}

// LUTs do OpenLuz, calculadas: nome → função de (r, g, b) em 0..1 para [r, g, b]
const L = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const cl = (x) => Math.max(0, Math.min(1, x));
const curva = (x, k) => cl(0.5 + (x - 0.5) * k);
const BUILTIN = {
  'Quente': (r, g, b) => [cl(r * 1.08 + 0.03), cl(g * 1.0 + 0.01), cl(b * 0.85)],
  'Frio': (r, g, b) => [cl(r * 0.88), cl(g * 0.98 + 0.01), cl(b * 1.1 + 0.04)],
  'Preto e branco': (r, g, b) => { const y = L(r, g, b); return [y, y, y]; },
  'Sépia': (r, g, b) => { const y = L(r, g, b); return [cl(y * 1.07 + 0.05), cl(y * 0.9 + 0.03), cl(y * 0.68)]; },
  'Desbotado': (r, g, b) => [0.08 + 0.84 * cl(r * 0.95 + 0.02), 0.07 + 0.83 * g, 0.1 + 0.8 * b].map((x, i) => { const y = L(r, g, b); return cl(y + (x - y) * 0.75); }),
  'Contraste': (r, g, b) => [r, g, b].map(x => { const s = x * x * (3 - 2 * x); return cl(x + (s - x) * 0.8); }),
  'Noite': (r, g, b) => { const y = L(r, g, b); return [cl(y * 0.35), cl(y * 0.55 + g * 0.1), cl(y * 0.95 + 0.05)]; },
  'Neon': (r, g, b) => { const y = L(r, g, b); return [r, g, b].map(x => curva(y + (x - y) * 1.7, 1.15)); },
};
export const BUILTIN_NAMES = Object.keys(BUILTIN);
const cache = new Map();
export function builtinLut(name) {
  if (cache.has(name)) return cache.get(name);
  const f = BUILTIN[name]; if (!f) return null;
  const n = 17, data = new Float32Array(n * n * n * 4);
  let i = 0;
  for (let b = 0; b < n; b++) for (let g = 0; g < n; g++) for (let r = 0; r < n; r++) {
    const o = f(r / (n - 1), g / (n - 1), b / (n - 1));
    data[i++] = o[0]; data[i++] = o[1]; data[i++] = o[2]; data[i++] = 1;
  }
  const lut = { name, n, data, min: [0, 0, 0], max: [1, 1, 1] };
  cache.set(name, lut); return lut;
}

// A LUT de um efeito LUT agora (f.lut = 'builtin:Nome' ou o caminho de um .cube). Arquivo é lido uma vez, sem travar:
// enquanto não chega, o efeito passa a imagem como está. Erro fica em f._lutErr.
const files = new Map();   // caminho → { lut } | { err } | { loading: true }
export function lutOf(f) {
  const k = f.lut || '';
  if (!k) return null;
  if (k.startsWith('builtin:')) return builtinLut(k.slice(8));
  let e = files.get(k);
  if (!e) {
    e = { loading: true }; files.set(k, e);
    const rd = typeof window !== 'undefined' && window.projDesktop && window.projDesktop.media && window.projDesktop.media.read;
    if (!rd) { e.loading = false; e.err = 'abrir arquivo só no programa para Windows'; }
    else rd(k).then(buf => { e.lut = parseCube(new TextDecoder().decode(buf), k.split(/[\\/]/).pop().replace(/\.cube$/i, '')); e.loading = false; })
      .catch(err => { e.loading = false; e.err = String(err && err.message || err); });
  }
  f._lutErr = e.err || '';
  return e.lut || null;
}
// texto de um .cube já lido (arquivo solto ou escolhido sem caminho): guarda com a chave dada
export function putLutText(key, text) { const lut = parseCube(text, key.split(/[\\/]/).pop().replace(/\.cube$/i, '')); files.set(key, { lut }); return lut; }
