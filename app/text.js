// Fontes de texto: Text Block e Text Animator, com os controles e o desenho medidos no Resolume 7.28.1
// (tools/compare/saida/texto/MEDIDAS.md). Desenho em canvas 2D que vira textura. Nada de código do Resolume.
//
// Regras medidas (composição 1920×1080):
//   em = 128 px × Size; linha = ascendente + descendente + entrelinha da fonte (Arial: 1,15 em), centrada; Spacing Y = % da linha; Spacing X = px × Size entre letras;
//   alinhamento dentro de uma caixa de Line Width centrada (no Animator, a caixa é a linha mais larga);
//   Position em px fixos (Y desce); Rotation em radianos, horário, em volta do bloco; Scale em volta do centro da tela;
//   contorno = faixa de 6 px × largura × Size para cada lado da borda; brilho = rampa linear de 8 px × valor × Size.
//   Animator: cada pedaço (letra, palavra, linha ou tudo) vê os valores animados atrasados em i × Delay ms.

export const EM = 128;              // px do em no Size 1 (largura de "Resolume" e das quebras; a tinta do H dá 93 px)
const OUTLINE = 6;                  // px por lado no Outline Width 1, Size 1
const GLOW0 = 0, GLOW = 8;          // px da rampa = 8 × valor × Size (medido; 1,5 + 7 × valor ficou pior na bancada)

export const STYLES = ['Regular', 'Italic', 'Bold', 'Bold Italic', 'Black'];
export const RANGES = [['all', 'Tudo'], ['lines', 'Linhas'], ['words', 'Palavras'], ['chars', 'Letras']];
export const ORDERS = [['front', 'Da frente para trás'], ['back', 'De trás para a frente'], ['random', 'Aleatória']];
// valores animados do Text Animator, com o valor que não muda nada
export const ANIM_KEYS = { aOpacity: 1, aScale: 1, aX: 0, aY: 0, aRot: 0, anchorX: 0, anchorY: 0, aOutline: 0, aGlowIn: 0, aGlowOut: 0 };

export function textDefaults(animator = false) {
  return {
    v: 2, animator, content: animator ? 'OpenLume' : 'OpenLume', font: 'Arial', style: 'Bold', color: '#ffffffff', size: 1,
    align: animator ? 'left' : 'center', valign: 'center', lineWidth: 1920, x: 0, y: 0, rotation: 0, scale: 1,
    spacingX: 0, spacingY: 0, outlineColor: '#ff0000ff', outlineWidth: 0, glowIn: 0, glowOut: 0,
    animated: false, range: 'chars', order: 'front', delay: 100, ...ANIM_KEYS,
  };
}

// texto salvo antes da beta.51 (tamanho em px, cor HSV, X/Y de −1 a 1 com Y para cima) vira o modelo novo
export function migrateText(o) {
  if (!o) return textDefaults();
  if (o.v === 2) return { ...textDefaults(o.animator), ...o };
  const t = textDefaults();
  t.content = o.content ?? t.content; t.font = o.font || t.font; t.style = o.bold === false ? 'Regular' : 'Bold';
  t.size = (o.size || 160) / EM; t.align = o.align || 'center';
  t.color = hsvHex(o.hue || 0, o.sat || 0, o.val ?? 1) + 'ff';
  t.x = (o.x || 0) * 960; t.y = -(o.y || 0) * 540;
  return t;
}
function hsvHex(h, s, v) {
  const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), u = v * (1 - (1 - f) * s);
  const [r, g, b] = [[v, u, p], [q, v, p], [p, v, u], [p, q, v], [u, p, v], [v, p, q]][i % 6];
  return '#' + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
export function cssColor(hex) {
  const h = String(hex || '#ffffffff').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16), a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return `rgba(${r},${g},${b},${a})`;
}
export function fontCss(t, px) {
  const st = t.style || 'Bold';
  const italic = /Italic/.test(st) ? 'italic ' : '', weight = st === 'Black' ? 900 : /Bold/.test(st) ? 700 : 400;
  return `${italic}${weight} ${px}px "${t.font}", sans-serif`;
}

// altura da linha como o navegador a calcula com line-height normal: ascendente + descendente + entrelinha da fonte
const lhCache = new Map();
function lineHeight(t, em) {
  const k = fontCss(t, 100);
  if (!lhCache.has(k)) {
    const sp = document.createElement('span'); sp.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;line-height:normal;font:' + k; sp.textContent = 'Hg';
    document.body.appendChild(sp); const h = sp.getBoundingClientRect().height; sp.remove();
    if (h > 0) lhCache.set(k, h / 100); else return 1.15 * em;   // fonte ainda não carregada: não guarda
  }
  return lhCache.get(k) * em;
}

// ---- diagramação: letras com posição, linha, palavra e caixa de tinta ----
export function layoutText(ctx, t, W, H) {
  const em = EM * t.size;
  ctx.font = fontCss(t, em);
  const sx = (t.spacingX || 0) * t.size;
  const mw = (s) => s ? ctx.measureText(s).width + sx * (s.length - 1) : 0;
  // quebra: linhas do texto e, no Text Block, por palavra na largura da linha
  const lines = [];
  for (const raw of String(t.content ?? '').split('\n')) {
    if (t.animator || !(t.lineWidth > 0)) { lines.push(raw); continue; }
    const words = raw.split(' '); let cur = '';
    for (const w of words) {
      const tryS = cur ? cur + ' ' + w : w;
      if (cur && mw(tryS) > t.lineWidth) { lines.push(cur); cur = w; } else cur = tryS;
    }
    lines.push(cur);
  }
  const asc = ctx.measureText('Hg').fontBoundingBoxAscent, lh = lineHeight(t, em);
  const pitch = lh * (1 + (t.spacingY || 0) / 100);
  const bh = pitch * (lines.length - 1) + lh;
  const top = t.valign === 'top' ? 0 : t.valign === 'bottom' ? H - bh : (H - bh) / 2;
  const widths = lines.map(mw);
  const boxW = t.animator ? Math.max(0, ...widths) : t.lineWidth, boxL = W / 2 - boxW / 2;
  const glyphs = []; let word = 0;
  lines.forEach((ln, li) => {
    const lw = widths[li], x0 = boxL + (t.align === 'left' ? 0 : t.align === 'right' ? boxW - lw : (boxW - lw) / 2), base = top + asc + li * pitch;
    let prevSpace = true;
    for (let i = 0; i < ln.length; i++) {
      const ch = ln[i];
      if (ch === ' ') { prevSpace = true; continue; }
      if (prevSpace) { word++; prevSpace = false; }
      const x = x0 + (i ? ctx.measureText(ln.slice(0, i)).width : 0) + i * sx;
      const g = ctx.measureText(ch);
      glyphs.push({ ch, x, y: base, line: li, word, l: x - g.actualBoundingBoxLeft, r: x + g.actualBoundingBoxRight, t: base - g.actualBoundingBoxAscent, b: base + g.actualBoundingBoxDescent });
    }
    word++;
  });
  const minX = Math.min(...lines.map((_, i) => boxL + (t.align === 'left' ? 0 : t.align === 'right' ? boxW - widths[i] : (boxW - widths[i]) / 2)));
  const maxX = Math.max(...lines.map((_, i) => boxL + (t.align === 'left' ? 0 : t.align === 'right' ? boxW - widths[i] : (boxW - widths[i]) / 2) + widths[i]));
  return { glyphs, em, cx: lines.length ? (minX + maxX) / 2 : W / 2, cy: top + bh / 2 };
}

// pedaços do Animator, na ordem em que recebem o atraso
function unitsOf(t, glyphs) {
  const key = t.range === 'all' ? () => 0 : t.range === 'lines' ? g => g.line : t.range === 'words' ? g => g.word : (_, i) => i;
  const map = new Map();
  glyphs.forEach((g, i) => { const k = key(g, i); if (!map.has(k)) map.set(k, []); map.get(k).push(g); });
  const units = [...map.values()].map(gs => ({ gs, cx: (Math.min(...gs.map(g => g.l)) + Math.max(...gs.map(g => g.r))) / 2, cy: (Math.min(...gs.map(g => g.t)) + Math.max(...gs.map(g => g.b))) / 2 }));
  if (t.order === 'back') units.reverse();
  else if (t.order === 'random') {   // sorteio fixo para o mesmo texto: o mesmo pedaço tem sempre o mesmo atraso
    let s = 0; for (const ch of String(t.content)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = units.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [units[i], units[j]] = [units[j], units[i]]; }
  }
  return units;
}

// histórico dos valores animados: cada pedaço lê o valor de (agora − i × Delay)
const animNow = (t) => { const o = {}; for (const k in ANIM_KEYS) o[k] = t[k] ?? ANIM_KEYS[k]; return o; };
export function animSample(c, now) {
  const t = c.text, cur = animNow(t), h = c.animHist || (c.animHist = []);
  const last = h[h.length - 1];
  if (!last || Object.keys(cur).some(k => cur[k] !== last.v[k])) h.push({ t: now, v: cur });
  return h;
}
function valueAt(h, at) {
  for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= at) return h[i].v;
  return h[0].v;
}

let tmpA = null, tmpB = null;
const scratch = (cv, which) => {
  let s = which ? tmpB : tmpA;
  if (!s || s.width !== cv.width || s.height !== cv.height) { s = document.createElement('canvas'); s.width = cv.width; s.height = cv.height; if (which) tmpB = s; else tmpA = s; }
  const x = s.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, s.width, s.height); return [s, x];
};

// desenha o texto no canvas do clipe. now em segundos (só o Animator usa). Devolve true se ainda há atraso correndo.
export function drawText(cv, t, c, now = performance.now() / 1000) {
  const W = cv.width, H = cv.height, ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, W, H);
  const L = layoutText(ctx, t, W, H);
  const anim = t.animator && t.animated;
  const units = anim ? unitsOf(t, L.glyphs) : [{ gs: L.glyphs, cx: L.cx, cy: L.cy }];
  let pending = false, vals = null;
  if (anim && c) {
    const h = animSample(c, now), d = (t.delay || 0) / 1000, span = d * units.length;
    while (h.length > 1 && h[1].t <= now - span - 1) h.shift();   // o que nenhum pedaço lê mais
    vals = units.map((_, i) => valueAt(h, now - i * d));
    pending = h.length > 1 && now - h[h.length - 1].t <= span;
  } else if (anim) vals = units.map(() => animNow(t));
  // transformação do bloco: Scale em volta do centro da tela, depois Position; Rotation em volta do bloco
  const block = (x) => {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.translate(t.x || 0, t.y || 0);
    if (!t.animator) { x.translate(W / 2, H / 2); x.scale(t.scale ?? 1, t.scale ?? 1); x.translate(-W / 2, -H / 2); x.translate(L.cx, L.cy); x.rotate(t.rotation || 0); x.translate(-L.cx, -L.cy); }
  };
  const unitT = (x, u, v) => {
    block(x);
    if (!v) return;
    x.translate((v.aX || 0) + u.cx, (v.aY || 0) + u.cy); x.rotate(v.aRot || 0); x.scale(v.aScale, v.aScale); x.translate(v.anchorX || 0, v.anchorY || 0); x.translate(-u.cx, -u.cy);
  };
  const font = fontCss(t, L.em), s = t.size;
  const each = (x, fn) => units.forEach((u, i) => { const v = vals && vals[i]; const a = v ? Math.max(0, Math.min(1, v.aOpacity)) : 1; if (a <= 0) return; unitT(x, u, v); x.font = font; fn(u, v, a); });
  const owOf = (v) => Math.max(0, (t.outlineWidth || 0) + (v ? v.aOutline || 0 : 0));
  const giOf = (v) => Math.max(0, (t.glowIn || 0) + (v ? v.aGlowIn || 0 : 0));
  const goOf = (v) => Math.max(0, (t.glowOut || 0) + (v ? v.aGlowOut || 0 : 0));
  const oc = cssColor(t.outlineColor);
  // rampa de brilho: N contornos somados, cada um com 1/N de alfa → alfa = 1 − distância/alcance, dos dois lados da borda
  const ramp = (which, get, inside) => {
    const [cvx, x] = scratch(cv, which); let any = false;
    x.globalCompositeOperation = 'lighter'; x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.fillStyle = '#fff';
    each(x, (u, v, a) => {
      const g = get(v); if (g <= 0) return; const R = (GLOW0 + GLOW * g) * s; any = true;
      const N = Math.min(48, Math.max(2, Math.ceil(R)));
      x.globalAlpha = a / N;
      for (let k = 1; k <= N; k++) { x.lineWidth = 2 * R * k / N; for (const g of u.gs) x.strokeText(g.ch, g.x, g.y); }
    });
    if (!any) return null;
    x.globalAlpha = 1; x.globalCompositeOperation = inside ? 'destination-in' : 'destination-out';
    each(x, (u) => { for (const g of u.gs) x.fillText(g.ch, g.x, g.y); });
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = oc; x.fillRect(0, 0, W, H);
    return cvx;
  };
  const gOut = ramp(0, goOf, false);
  if (gOut) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(gOut, 0, 0); }
  ctx.fillStyle = cssColor(t.color);
  each(ctx, (u, v, a) => { ctx.globalAlpha = a; for (const g of u.gs) ctx.fillText(g.ch, g.x, g.y); });
  ctx.globalAlpha = 1;
  const gIn = ramp(1, giOf, true);
  if (gIn) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(gIn, 0, 0); }
  ctx.strokeStyle = oc; ctx.lineJoin = 'round';
  each(ctx, (u, v, a) => { const w = OUTLINE * 2 * owOf(v) * s; if (w <= 0) return; ctx.globalAlpha = a; ctx.lineWidth = w; for (const g of u.gs) ctx.strokeText(g.ch, g.x, g.y); });
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  return pending;
}

// fontes do Windows, como no Resolume (ele lista as famílias instaladas); sem permissão, uma lista curta
let fontList = null;
export async function listFonts() {
  if (fontList) return fontList;
  try {
    const all = await window.queryLocalFonts();
    fontList = [...new Set(all.map(f => f.family))].sort((a, b) => a.localeCompare(b));
  } catch { }
  if (!fontList || !fontList.length) fontList = ['Arial', 'Bahnschrift', 'Calibri', 'Cambria', 'Comic Sans MS', 'Consolas', 'Courier New', 'Georgia', 'Impact', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'];
  return fontList;
}
