// Fonte "Texto" (plano 09-01, maquete editor-texto-mockup.html): um cartaz com várias caixas de texto, no jeito do Canva.
// Cada caixa tem trechos (cor/fonte/negrito/itálico por pedaço), efeito (sombra, neon, vazado...) e animação na batida.
// O mesmo desenho serve ao editor e à projeção: o que se vê no editor é o que sai. Recurso só do OpenLume.
import { PRESETS, quebrar } from './text-presets.js';

export const EFEITOS = [['nenhum', 'Nenhum'], ['sombra', 'Sombra'], ['elevar', 'Elevar'], ['vazado', 'Vazado'], ['contorno', 'Contorno'], ['fundo', 'Fundo'],
  ['neon', 'Neon'], ['eco', 'Eco'], ['glitch', 'Glitch'], ['recorte', 'Recorte'], ['degrade', 'Degradê'], ['curva', 'Curva']];
export const ANIMS = [['nenhuma', 'Nenhuma', 'parado'], ['surgir', 'Surgir', 'aparece aos poucos'], ['subir', 'Subir', 'sobe e aparece'], ['digitar', 'Máquina de escrever', 'um pedaço de cada vez'],
  ['pulso', 'Pulso', 'pula na batida'], ['piscar', 'Piscar', 'liga e desliga na batida'], ['tremer', 'Tremer', 'nervoso, sem parar'], ['bloco', 'Bloco', 'uma faixa passa e revela']];
export const POR = [['letra', 'Letra'], ['palavra', 'Palavra'], ['linha', 'Linha'], ['caixa', 'Caixa inteira']];
export const BATIDAS = [0.25, 0.5, 1, 2, 4, 8];
export const FUNDOS = [['none', 'Transparente'], ['#000000', 'Preto'], ['lin', 'Degradê'], ['#1a0b2e', 'Roxo escuro']];
const W0 = 1920, H0 = 1080;

// caixa nova: s = tamanho em % da largura da tela (10 = 192 px), x/y em % da tela, r em graus, o em %, ls em centésimos de em, lh em %
export function novaCaixa(o = {}) {
  return { trechos: [{ t: 'Texto' }], f: 'Rubik', peso: 400, s: 5, c: '#ffffff', b: false, it: false, u: false, st: false, caixa: false, al: 'center', ls: 0, lh: 105,
    x: 50, y: 50, r: 0, o: 100, fx: { tipo: 'nenhum', forca: 50, cor: '#ff3c9e' }, an: { tipo: 'nenhuma', batidas: 1, por: 'palavra' }, ...o };
}
export const textoDe = (k) => (k.trechos || []).map(r => r.t).join('');
export function cartazPadrao(texto = 'Texto') {
  return { v: 2, cartaz: true, fundo: 'none', caixas: [novaCaixa({ trechos: [{ t: texto }], f: 'Archivo', peso: 900, s: 10 })], content: texto };
}
export const ehCartaz = (t) => !!(t && t.cartaz);

// ---------- medida ----------
const fontOf = (k, r, px) => `${(r.it ?? k.it) ? 'italic ' : ''}${(r.b ?? k.b) ? Math.max(700, k.peso || 400) : (k.peso || 400)} ${px}px "${r.f || k.f}", sans-serif`;
let mctx = null;
const mc = () => mctx || (mctx = document.createElement('canvas').getContext('2d'));
// layout de uma caixa: letras com posição relativa ao centro da caixa (px numa tela de largura W)
export function layoutCaixa(k, W = W0) {
  const ctx = mc(), px = Math.max(4, k.s * W / 100), ls = (k.ls || 0) / 100 * px, lh = px * (k.lh || 105) / 100 * 1.12;
  const linhas = [[]];
  for (const r of k.trechos || []) {
    const txt = k.caixa ? String(r.t).toLocaleUpperCase('pt-BR') : String(r.t);
    for (const ch of txt) { if (ch === '\n') { linhas.push([]); continue; } linhas[linhas.length - 1].push({ ch, r }); }
  }
  const gl = []; let li = 0, wi = 0, ci = 0; const larg = [];
  const ascent = px * 0.78;
  for (const ln of linhas) {
    let x = 0; const row = [];
    for (const { ch, r } of ln) {
      ctx.font = fontOf(k, r, px); const w = ctx.measureText(ch).width;
      if (ch === ' ') wi++;
      row.push({ ch, x, w, font: ctx.font, color: r.c || k.c, line: li, word: wi, idx: ch === ' ' ? -1 : ci++, u: r.u ?? k.u, st: r.st ?? k.st });
      x += w + ls;
    }
    const lw = Math.max(0, x - (ln.length ? ls : 0)); larg.push(lw); gl.push(row); li++; wi++;
  }
  const bw = Math.max(1, ...larg), bh = Math.max(lh, lh * linhas.length);
  const out = [];
  gl.forEach((row, i) => {
    const off = k.al === 'left' ? -bw / 2 : k.al === 'right' ? bw / 2 - larg[i] : -larg[i] / 2;
    const base = -bh / 2 + i * lh + (lh - px) / 2 + ascent;
    for (const g of row) { g.x += off; g.y = base; out.push(g); }
  });
  return { glyphs: out, w: bw, h: bh, px, lh, linhas: gl.length, larg, ls, nLetras: ci, nPalavras: wi, ascent };
}

// ---------- animação ----------
const clamp = (v) => Math.max(0, Math.min(1, v));
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function unidade(g, an) { return an.por === 'letra' ? g.idx : an.por === 'palavra' ? g.word : an.por === 'linha' ? g.line : 0; }
function nUnid(L, an) { return an.por === 'letra' ? L.nLetras : an.por === 'palavra' ? L.nPalavras : an.por === 'linha' ? L.linhas : 1; }
// valores de uma unidade na batida: alfa, deslocamento (em), escala, faixa do Bloco (0..1 ou -1)
function animar(an, i, n, B, now) {
  const v = { a: 1, dx: 0, dy: 0, sc: 1, bar: -1 };
  if (!an || an.tipo === 'nenhuma' || i < 0) return v;
  const beats = an.batidas || 1, beat = B ? B.beat : now * 2, x = beat / beats, ph = x - Math.floor(x), s = n > 1 ? i / n : 0;
  switch (an.tipo) {
    case 'surgir': { const l = clamp((ph - s * 0.6) / 0.3); v.a = l * l * (3 - 2 * l); break; }
    case 'subir': { const l = clamp((ph - s * 0.6) / 0.25), e = 1 - (1 - l) ** 3; v.a = l; v.dy = (1 - e) * 0.6; break; }
    case 'digitar': v.a = ph * 1.15 * n >= i + 1 ? 1 : 0; break;
    case 'pulso': { const q = (x + s * 0.25) % 1; v.sc = 1 + 0.14 * Math.max(0, 1 - q * 3) ** 2; break; }
    case 'piscar': v.a = ((Math.floor(x * 2) + i) % 2) ? 0.15 : 1; break;
    case 'tremer': { const t = Math.floor(now * 24); v.dx = (hash(t + i * 7.3) - 0.5) * 0.06; v.dy = (hash(t * 1.7 + i * 3.1) - 0.5) * 0.06; break; }
    case 'bloco': { const l = (ph * 1.3 - s * 0.9) / 0.22; v.a = l >= 0.5 ? 1 : 0; v.bar = l >= 0 && l < 1 ? l : -1; break; }
  }
  return v;
}
export const animada = (t) => ehCartaz(t) && (t.caixas || []).some(k => k.an && k.an.tipo !== 'nenhuma');

// ---------- desenho ----------
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function corA(hex, a) {
  const h = String(hex || '#ffffff').replace('#', ''); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
// desenha uma caixa no ctx já posicionado no centro dela; W = largura da tela em px
export function desenharCaixa(ctx, k, W, B, now, L = layoutCaixa(k, W)) {
  const fx = k.fx || { tipo: 'nenhum' }, f = (fx.forca ?? 50) / 50, px = L.px, an = k.an || { tipo: 'nenhuma' }, n = Math.max(1, nUnid(L, an));
  const curva = fx.tipo === 'curva' && Math.abs(f) > 0.01, R = curva ? L.w / (Math.min(2, f) * Math.PI * 0.33) : 0;   // Força 50 = arco de uns 60°
  const pos = (g) => {   // centro da letra (para animação e curva)
    const cx = g.x + g.w / 2, cy = g.y - px * 0.3;
    if (!curva) return { cx, cy, rot: 0 };
    const ang = cx / R; return { cx: Math.sin(ang) * R, cy: cy + R - Math.cos(ang) * R, rot: ang };   // arco para cima, como no Canva
  };
  const vals = L.glyphs.map(g => animar(an, unidade(g, an), n, B, now));
  // percorre as letras já no lugar (curva, animação); fn desenha a letra com origem no centro dela
  const cada = (fn, ox = 0, oy = 0) => {
    L.glyphs.forEach((g, j) => {
      const v = vals[j]; if (v.a <= 0.003 || g.ch === ' ') return;
      const p = pos(g);
      ctx.save(); ctx.translate(p.cx + ox + v.dx * px, p.cy + oy + v.dy * px); if (p.rot) ctx.rotate(p.rot); if (v.sc !== 1) ctx.scale(v.sc, v.sc);
      ctx.globalAlpha = (k.o ?? 100) / 100 * v.a; ctx.font = g.font;
      fn(g, -g.w / 2, px * 0.3); ctx.restore();
    });
  };
  ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  // fundo: faixa atrás de cada linha
  if (fx.tipo === 'fundo') {
    ctx.save(); ctx.globalAlpha = (k.o ?? 100) / 100; ctx.fillStyle = fx.cor;
    for (let i = 0; i < L.linhas; i++) {
      const gs = L.glyphs.filter(g => g.line === i); if (!gs.length) continue;
      const x0 = Math.min(...gs.map(g => g.x)), x1 = Math.max(...gs.map(g => g.x + g.w)), y = gs[0].y - L.ascent;
      const pad = px * 0.18 * f, padv = px * 0.06 * f; rr(ctx, x0 - pad, y - padv, x1 - x0 + pad * 2, px + padv * 2, px * 0.08); ctx.fill();
    }
    ctx.restore();
  }
  const fill = (cor) => cada((g, x, y) => { ctx.fillStyle = cor || g.color; ctx.fillText(g.ch, x, y); });
  if (fx.tipo === 'eco') for (let i = 3; i >= 1; i--) cada((g, x, y) => { ctx.globalAlpha *= [0.8, 0.5, 0.25][i - 1]; ctx.fillStyle = fx.cor; ctx.fillText(g.ch, x, y); }, i * 0.05 * f * px, i * 0.05 * f * px);
  if (fx.tipo === 'recorte') cada((g, x, y) => { ctx.fillStyle = fx.cor; ctx.fillText(g.ch, x, y); }, 0.06 * f * px, 0.06 * f * px);
  if (fx.tipo === 'glitch') {
    cada((g, x, y) => { ctx.fillStyle = '#00e5ff'; ctx.fillText(g.ch, x, y); }, -0.04 * f * px, 0);
    cada((g, x, y) => { ctx.fillStyle = '#ff2bd0'; ctx.fillText(g.ch, x, y); }, 0.04 * f * px, 0);
  }
  if (fx.tipo === 'contorno') cada((g, x, y) => { ctx.strokeStyle = fx.cor; ctx.lineWidth = 0.09 * f * px; ctx.strokeText(g.ch, x, y); });
  if (fx.tipo === 'sombra' || fx.tipo === 'elevar' || fx.tipo === 'neon') {
    const passes = fx.tipo === 'neon' ? [[0.08, 1], [0.22, 1], [0.5, 0.9]] : [[1, 1]];
    for (const [blur, al] of passes) cada((g, x, y) => {
      if (fx.tipo === 'sombra') { ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 0.1 * f * px; ctx.shadowOffsetX = ctx.shadowOffsetY = 0.05 * f * px; }
      else if (fx.tipo === 'elevar') { ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 0.25 * f * px; ctx.shadowOffsetY = 0.04 * f * px; }
      else { ctx.shadowColor = corA(fx.cor, al); ctx.shadowBlur = blur * f * px; }
      ctx.fillStyle = g.color; ctx.fillText(g.ch, x, y);
    });
  }
  if (fx.tipo === 'vazado') cada((g, x, y) => { ctx.strokeStyle = g.color; ctx.lineWidth = Math.max(1, 0.035 * f * px); ctx.strokeText(g.ch, x, y); });
  else if (fx.tipo === 'degrade') {
    const gr = ctx.createLinearGradient(-L.w / 2, 0, L.w / 2, 0); gr.addColorStop(0, k.c); gr.addColorStop(1, fx.cor);
    // o degradê atravessa a caixa: cada letra pega a cor do lugar dela
    cada((g, x, y) => { const t = clamp((g.x + g.w / 2 + L.w / 2) / L.w); ctx.fillStyle = mix(k.c, fx.cor, t); ctx.fillText(g.ch, x, y); });
    void gr;
  } else if (!['sombra', 'elevar', 'neon'].includes(fx.tipo)) fill();
  // sublinhado e riscado
  cada((g, x, y) => { if (!g.u && !g.st) return; ctx.fillStyle = g.color; const t = Math.max(1, px * 0.06); if (g.u) ctx.fillRect(x, y + px * 0.1, g.w + L.ls, t); if (g.st) ctx.fillRect(x, y - px * 0.3, g.w + L.ls, t); });
  // Bloco: a faixa passa por cima da letra antes de revelar
  L.glyphs.forEach((g, j) => { const v = vals[j]; if (v.bar < 0 || g.ch === ' ') return; const p = pos(g); ctx.save(); ctx.translate(p.cx, p.cy); ctx.globalAlpha = (k.o ?? 100) / 100; ctx.fillStyle = fx.tipo === 'nenhum' ? k.c : fx.cor; const w = (g.w + L.ls) * (v.bar < 0.5 ? v.bar * 2 : (1 - v.bar) * 2); ctx.fillRect(-g.w / 2 + (v.bar < 0.5 ? 0 : g.w - w), -px * 0.5, w, px * 0.95); ctx.restore(); });
}
function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map(i => parseInt(String(h).replace('#', '').slice(i - 1, i + 1), 16));
  const A = p(a), Bc = p(b); return '#' + A.map((v, i) => Math.round(v + (Bc[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// desenha o cartaz inteiro no canvas (1920×1080 na projeção; menor no editor); devolve true se precisa de outro quadro
export function desenharCartaz(cv, t, B, now = performance.now() / 1000, pular = -1) {
  const W = cv.width, H = cv.height, ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowColor = 'transparent'; ctx.clearRect(0, 0, W, H);
  if (t.fundo && t.fundo !== 'none') {
    if (t.fundo === 'lin') { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1a0b2e'); g.addColorStop(0.6, '#3a0b2a'); g.addColorStop(1, '#000'); ctx.fillStyle = g; }
    else ctx.fillStyle = t.fundo;
    ctx.fillRect(0, 0, W, H);
  }
  (t.caixas || []).forEach((k, i) => {
    if (i === pular) return;
    ctx.save(); ctx.translate(k.x / 100 * W, k.y / 100 * H); ctx.rotate((k.r || 0) * Math.PI / 180);
    try { desenharCaixa(ctx, k, W, B, now); } catch { }
    ctx.restore();
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowColor = 'transparent';
  return animada(t);
}

// ---------- estilos prontos para o editor: os nove do Text Block + Vazado, Glitch, Eco e Degradê ----------
const EXTRAS = [
  { id: 'vazado', nome: 'Vazado', apoio: { f: ['Anybody', 'Impact'], e: 'Black', c: '#ffffffff', t: 0.9, caixa: 1, esp: 0.02 }, dest: { f: ['Anybody', 'Impact'], e: 'Black', c: '#ffffffff', t: 3.4, caixa: 1, esp: 0.02 }, fxDest: { tipo: 'vazado', forca: 60, cor: '#ffffff' } },
  { id: 'glitch', nome: 'Glitch', apoio: { f: ['Rubik', 'Segoe UI'], e: 'Bold', c: '#ffffffff', t: 0.9, caixa: 1, esp: 0.05 }, dest: { f: ['Rubik', 'Segoe UI'], e: 'Black', c: '#ffffffff', t: 3.2, caixa: 1, esp: 0 }, fxDest: { tipo: 'glitch', forca: 60, cor: '#ff2bd0' }, anDest: { tipo: 'tremer', batidas: 1, por: 'caixa' } },
  { id: 'eco', nome: 'Eco', apoio: { f: ['Bahnschrift', 'Segoe UI'], e: 'Regular', c: '#ffffffff', t: 0.9, caixa: 1, esp: 0.1 }, dest: { f: ['Archivo Black', 'Archivo', 'Impact'], e: 'Black', c: '#ffffffff', t: 3, caixa: 1, esp: 0 }, fxDest: { tipo: 'eco', forca: 60, cor: '#ff3c9e' } },
  { id: 'degrade', nome: 'Degradê', apoio: { f: ['Michroma', 'Bahnschrift'], e: 'Regular', c: '#ffffffff', t: 0.75, caixa: 1, esp: 0.12 }, dest: { f: ['Archivo Black', 'Archivo', 'Impact'], e: 'Black', c: '#ffd400ff', t: 3.2, caixa: 1, esp: 0 }, fxDest: { tipo: 'degrade', forca: 50, cor: '#7f5bff' } },
];
export const ESTILOS_CARTAZ = [...PRESETS, ...EXTRAS];
const fonteDe = (lista, inst) => { const m = new Map(inst.map(f => [f.toLowerCase(), f])); for (const f of lista) if (m.get(f.toLowerCase())) return m.get(f.toLowerCase()); for (const f of lista) { const k = inst.find(x => x.toLowerCase().startsWith(f.toLowerCase())); if (k) return k; } return lista[lista.length - 1]; };
const pesoDe = (e) => e === 'Black' ? 900 : /Bold/.test(e) ? 700 : 400;
// estilo pronto -> caixas: o destaque numa caixa, o apoio de antes e de depois em outras; empilhadas no meio da tela
export function caixasDoEstilo(p, texto, inst) {
  const linhas = quebrar(texto, p.quebra || 'destaque');
  const grupos = []; for (const l of linhas) { const g = grupos[grupos.length - 1]; if (g && g.d === l.d && !l.d) g.s.push(l.s); else grupos.push({ d: l.d, s: [l.s] }); }
  const anim = p.anim ? { tipo: p.id === 'neon' ? 'piscar' : p.id === 'festa' ? 'pulso' : 'surgir', batidas: p.id === 'neon' ? 2 : p.anim.batidas, por: p.id === 'tecno' ? 'letra' : 'palavra' } : null;
  const ks = grupos.map(g => {
    const e = g.d ? p.dest : p.apoio, s = e.t * 128 / 19.2 * 0.92;
    const fx = g.d && p.fxDest ? { ...p.fxDest } : p.contorno && g.d ? { tipo: 'contorno', forca: 50, cor: p.contorno.cor.slice(0, 7) } : p.brilho ? { tipo: 'neon', forca: 50 + p.brilho.forca * 40, cor: p.brilho.cor.slice(0, 7) } : { tipo: 'nenhum', forca: 50, cor: '#ff3c9e' };
    const an = g.d && p.anDest ? { ...p.anDest } : anim && (g.d || p.id === 'tecno') ? { ...anim } : { tipo: 'nenhuma', batidas: 1, por: 'palavra' };
    return novaCaixa({ trechos: [{ t: g.s.join('\n') }], f: fonteDe(e.f, inst), peso: pesoDe(e.e), it: /Italic/.test(e.e), s, c: e.c.slice(0, 7), caixa: !!e.caixa, ls: Math.round(e.esp * 100), lh: g.s.length > 1 ? 100 : 105, fx, an });
  });
  // largura: se passar de 92 % da tela, diminui a caixa
  for (const k of ks) { const w = layoutCaixa(k, W0).w; if (w > W0 * 0.92) k.s *= W0 * 0.92 / w; }
  // empilha: altura de cada caixa medida, um respiro entre elas, o conjunto no meio; se não couber, diminui tudo junto
  let alt = ks.map(k => layoutCaixa(k, W0).h / H0 * 100), gap = 2, tot = alt.reduce((a, b) => a + b, 0) + gap * (ks.length - 1);
  if (tot > 90) { const f = 90 / tot; for (const k of ks) k.s *= f; alt = ks.map(k => layoutCaixa(k, W0).h / H0 * 100); tot = alt.reduce((a, b) => a + b, 0) + gap * (ks.length - 1); }
  let y = 50 - tot / 2; ks.forEach((k, i) => { k.y = y + alt[i] / 2; y += alt[i] + gap; });
  return ks;
}
