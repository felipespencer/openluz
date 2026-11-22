// Motor de mistura e de saída, em WebGL2, num único canvas mestre escondido.
//
// 1. render(): as camadas são desenhadas, de baixo para cima, numa textura (a composição).
//    Cada camada passa pelos efeitos do clipe e da camada; a composição passa pelos seus.
//    Uma camada usada como fonte direta de algum slice também ganha uma textura só sua.
// 2. renderScreen(): para cada tela, os slices recortam a composição (ou a camada) e a
//    desenham deformados numa textura do tamanho da tela; um passe final aplica cor,
//    opacidade e as máscaras de saída.
// 3. blit(): copia o resultado para um canvas 2D, que a janela de saída recebe por stream.
//
// A cor sai do shader já multiplicada pela opacidade (premultiplicada), o que deixa os
// modos de mistura corretos só com blendFunc.
import { tessellate, tessellatePoly } from './warp.js';
import { softWidths, softGradsOn, gradRadius, allSlices } from './screens.js';
import { effectById, EFFECT_HELPERS } from './effects.js';
import { sourceById } from './sources.js';
import { FS_MIX, mixerCode, normMixer, hexRgb, hexRgba, MIXER_OPT, mixerColor } from './mixers.js';
import { animValue } from './beat.js';
import { lutOf } from './lut.js';

// camada/clipe: quad com ajuste, posição, escala e giro
const VS_LAYER = `#version 300 es
in vec2 a; uniform vec2 uScale; uniform vec2 uPos; uniform float uRot; uniform float uAspect; out vec2 v;
void main(){ v = a * 0.5 + 0.5; vec2 p = a * uScale; p.x *= uAspect; float c = cos(uRot), s = sin(uRot); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y); p.x /= uAspect; gl_Position = vec4(p + uPos, 0.0, 1.0); }`;
// uPre = 0: a textura é de um elemento (vídeo, imagem, texto), com alfa reto, e é premultiplicada aqui;
// uPre = 1: já vem premultiplicada (resultado de efeito, de fonte ou de mistura) e entra como está — multiplicar de novo
// escurecia duas vezes tudo que é meio transparente e passa por efeito (visto na bancada do Threshold, 2026-10-25)
const FS_LAYER = `#version 300 es
precision highp float; in vec2 v; uniform sampler2D uTex; uniform float uOp; uniform float uPre; uniform vec4 uSrc; out vec4 o;
void main(){ vec4 c = texture(uTex, uSrc.xy + v * uSrc.zw); if (uPre < 0.5) c.rgb *= c.a; o = c * uOp; }`;
// uSrc: o pedaço da textura que entra (x, y, largura, altura em uv; (0,0,1,1) = inteira). O "Seguir rosto" da câmera (11-01) usa.

// slice: posição em px da tela; luv é a coordenada local (0..1) dentro do recorte
const VS_SLICE = `#version 300 es
in vec2 aPos; in vec2 aLuv;
uniform vec2 uScreen; uniform vec4 uIn; uniform float uRot; uniform vec2 uFlip; uniform vec2 uSrc;
out vec2 vUv; out vec2 vLuv;
void main(){
  vec2 l = mix(aLuv, 1.0 - aLuv, uFlip);
  vec2 d = (l - 0.5) * uIn.zw;
  float c = cos(uRot), s = sin(uRot);
  vec2 p = uIn.xy + uIn.zw * 0.5 + vec2(d.x * c - d.y * s, d.x * s + d.y * c);
  vUv = vec2(p.x / uSrc.x, 1.0 - p.y / uSrc.y);
  vLuv = aLuv;
  gl_Position = vec4(aPos.x / uScreen.x * 2.0 - 1.0, 1.0 - aPos.y / uScreen.y * 2.0, 0.0, 1.0);
}`;
const FS_SLICE = `#version 300 es
precision highp float;
in vec2 vUv; in vec2 vLuv; out vec4 o;
uniform int uKey; uniform int uBlack;   // É chave: o slice sai branco na medida da transparência; Fundo preto: preto opaco na forma do slice
uniform sampler2D uTex; uniform vec2 uBC; uniform vec3 uRGB;
uniform int uUseSoft; uniform vec3 uSoftP; uniform vec3 uGamma;
#define NG 8
uniform int uNG; uniform vec4 uGA[NG]; uniform vec4 uGB[NG]; uniform vec2 uInSize;   // degradês de emenda: A→B em px do recorte e (n1, n2, raio, 0)
uniform int uUseMask; uniform sampler2D uMask;
float ramp(float x){
  float s = step(0.5, x);
  return uSoftP.y * pow(2.0 * x, uSoftP.x) * (1.0 - s) + (1.0 - (1.0 - uSoftP.y) * pow(2.0 * (1.0 - x), uSoftP.x)) * s;
}
void main(){
  float inside = (vUv.x < 0.0 || vUv.x > 1.0 || vUv.y < 0.0 || vUv.y > 1.0) ? 0.0 : 1.0;
  vec4 c = texture(uTex, clamp(vUv, 0.0, 1.0)) * inside;
  c.rgb = mix(vec3(0.5) * c.a, c.rgb * uBC.x, uBC.y) + uRGB * c.a;
  if (uUseSoft != 0) {
    float f = 1.0;
    // cada degradê: faixa em volta da reta A→B (t ao longo, s para os lados); dentro dela a rampa vai de inteiro em A a zero em B;
    // os cantos do lado de A podem ser redondos; fora da faixa a imagem fica inteira. Vários degradês se multiplicam.
    vec2 p = vLuv * uInSize;
    for (int i = 0; i < NG; i++) {
      if (i >= uNG) break;
      vec2 a = uGA[i].xy, d = uGA[i].zw - a; float L = max(length(d), 1e-3); vec2 u = d / L, n = vec2(-u.y, u.x);
      vec2 q = p - a; float t = dot(q, u), s = dot(q, n), n1 = uGB[i].x, n2 = uGB[i].y, r = uGB[i].z;
      bool dentro = t >= 0.0 && t <= L && s <= n1 && s >= -n2;
      if (dentro && r > 0.0 && t < r) {
        if (s > n1 - r) dentro = length(vec2(t - r, s - (n1 - r))) <= r;
        else if (s < -n2 + r) dentro = length(vec2(t - r, s - (-n2 + r))) <= r;
      }
      if (dentro) f *= ramp(clamp(1.0 - t / L, 0.0, 1.0));
    }
    // o nível de preto só sobe fora da faixa de emenda, para casar o preto dos dois projetores
    c.rgb = max(c.rgb, vec3(uSoftP.z) * step(0.99, f) * c.a);
    c.rgb *= pow(vec3(f), 1.0 / uGamma);
  }
  if (uUseMask != 0) c *= texture(uMask, vec2(vLuv.x, 1.0 - vLuv.y)).r;
  if (uBlack != 0) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  o = uKey != 0 ? vec4(c.a) : c;
}`;
// passe final da tela: cor, opacidade e máscaras de saída
const VS_QUAD = `#version 300 es
in vec2 a; out vec2 v; void main(){ v = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;
const FS_SCREEN = `#version 300 es
precision highp float; in vec2 v; out vec4 o;
uniform sampler2D uTex; uniform sampler2D uMask; uniform int uUseMask; uniform vec2 uBC; uniform vec3 uRGB; uniform float uOp;
void main(){
  vec4 c = texture(uTex, v);
  c.rgb = mix(vec3(0.5), c.rgb * uBC.x, uBC.y) + uRGB;
  if (uUseMask != 0) c.rgb *= texture(uMask, v).r;
  o = vec4(clamp(c.rgb, 0.0, 1.0) * uOp, 1.0);
}`;
const FS_COPY = `#version 300 es
precision highp float; in vec2 v; out vec4 o; uniform sampler2D uTex; uniform int uOpaque;
void main(){ vec4 c = texture(uTex, v); o = uOpaque != 0 ? vec4(c.rgb, 1.0) : c; }`;
const FX_HEAD = `#version 300 es
precision highp float; in vec2 v; out vec4 o; uniform sampler2D uTex; uniform sampler2D uPrev; uniform vec2 uRes; uniform float uTime;
`;
// Delay RGB: quantos quadros renderizados valem 1,0 de atraso. Medido no Resolume (bancada de 2026-10-25): 0,5 deu 20 quadros
// com ele rendendo a 30 fps (a 0,5× de velocidade do clipe o atraso em pixels cai pela metade, então é fila de quadros, não de tempo).
const RING_FRAMES = 40;
// controle de cor ({ color: true }, valor "#rrggbb") vira vec3 no shader (com { alpha: true }, "#rrggbbaa" vira vec4);
// número, lista (índice da opção) e liga/desliga viram float
const uDecl = (p) => (p.color ? (p.alpha ? 'uniform vec4 ' : 'uniform vec3 ') : 'uniform float ') + p.key + ';';

export const FITS = { contain: 'Encaixar', cover: 'Preencher', stretch: 'Esticar' };
export const IDENT_TR = () => ({ x: 0, y: 0, scale: 1, sx: 1, sy: 1, rot: 0 });   // tamanho final: largura = scale*sx, altura = scale*sy
const trIdent = (t) => !t || !(t.x || t.y || t.scale !== 1 || t.rot || (t.sx ?? 1) !== 1 || (t.sy ?? 1) !== 1);

export class Engine {
  constructor(width, height) {
    this.W = width; this.H = height; this.time = 0; this.master = 1;
    const canvas = this.canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const gl = this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 indisponível');
    this.progLayer = this.program(VS_LAYER, FS_LAYER, ['uScale', 'uPos', 'uRot', 'uAspect', 'uOp', 'uPre', 'uTex', 'uSrc']);
    this.progSlice = this.program(VS_SLICE, FS_SLICE, ['uScreen', 'uIn', 'uRot', 'uFlip', 'uSrc', 'uTex', 'uBC', 'uRGB', 'uUseSoft', 'uSoftP', 'uGamma', 'uNG', 'uGA', 'uGB', 'uInSize', 'uUseMask', 'uMask', 'uKey', 'uBlack']);
    this.progScreen = this.program(VS_QUAD, FS_SCREEN, ['uTex', 'uMask', 'uUseMask', 'uBC', 'uRGB', 'uOp']);
    this.progCopy = this.program(VS_QUAD, FS_COPY, ['uTex', 'uOpaque']);
    this.progMix = this.program(VS_QUAD, FS_MIX, ['uA', 'uB', 'uK', 'uTrans', 'uMode', 'uColor', 'uSmooth', 'uTime', 'uRes', 'uSeed']);
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.quadVao = gl.createVertexArray(); gl.bindVertexArray(this.quadVao);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.enable(gl.BLEND);
    this.tex = new Map();          // clip.id → { t, done }
    this.white = this.newTex();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    this.comp = this.fbo(width, height);
    this.layerFbo = new Map();     // layer.id → fbo (fonte direta para slices)
    this.screenFbo = new Map();    // screen.id → fbo
    this.screenOut = new Map();    // screen.uid → fbo com a saída pronta da tela, para quem a usa como fonte (07-16)
    this.geom = new Map();         // slice.id → { rev, vao, n, ... }
    this.maskTex = new Map();      // 'o'+screen.id / 'i'+slice.id → { t, rev, canvas }
    this.fxProg = new Map();       // effect id → programa
    this.srcProg = new Map();      // source id → programa
    this.srcFbo = new Map();       // clip.id → fbo da fonte gerada
    this.testCard = false;         // Test Card ligado: as telas recebem o test card no lugar da composição
    this.scratch = [this.fbo(width, height), this.fbo(width, height), this.fbo(width, height)];   // efeitos: entrada e pingue-pongue
    this.mixFbo = [this.fbo(width, height), this.fbo(width, height), this.fbo(width, height), this.fbo(width, height)];   // mistura: clipe antigo, clipe novo, camada pronta, cópia do alvo
    this.compFx = []; this.bg = [0, 0, 0];
    this.groupFbo = new Map();    // group.id → fbo (as camadas do grupo juntas)
    this.groups = []; this.xfade = null; this.soloL = false; this.beat = null;   // beat: o relógio de BPM (app.js)
    this.fxMem = new WeakMap();   // instância de efeito com feedback → { a, b, i, w, h }: a saída do quadro anterior
  }
  // Configurações da composição: tamanho novo refaz as texturas que dependem dele
  setSize(w, h) {
    const gl = this.gl, del = (f) => { if (f && f.fb) { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.t); } };
    this.W = w; this.H = h; this.canvas.width = w; this.canvas.height = h;
    del(this.comp); this.comp = this.fbo(w, h);
    this.scratch.forEach(del); this.scratch = [this.fbo(w, h), this.fbo(w, h), this.fbo(w, h)];
    this.mixFbo.forEach(del); this.mixFbo = [this.fbo(w, h), this.fbo(w, h), this.fbo(w, h), this.fbo(w, h)];
    for (const f of this.groupFbo.values()) del(f); this.groupFbo.clear();
    for (const f of this.srcFbo.values()) del(f); this.srcFbo.clear();
    for (const f of this.layerFbo.values()) del(f); this.layerFbo.clear();
    for (const f of this.screenFbo.values()) del(f); this.screenFbo.clear();
    for (const f of this.screenOut.values()) del(f); this.screenOut.clear();
  }

  program(vs, fs, uniforms) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, vs.includes('aPos') ? 'aPos' : 'a');
    if (vs.includes('aLuv')) gl.bindAttribLocation(p, 1, 'aLuv');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('programa: ' + gl.getProgramInfoLog(p));
    const u = {}; for (const n of uniforms) u[n] = gl.getUniformLocation(p, n);
    return { p, u };
  }
  newTex() {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  fbo(w, h) {
    const gl = this.gl, t = this.newTex();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, t, w, h };
  }
  ensureSize(w, h) {
    const c = this.canvas;
    if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); }
  }

  // ---------- fontes ----------
  texFor(clip) {
    const gl = this.gl;
    if (clip.kind === 'source') return this.renderSource(clip);
    let e = this.tex.get(clip.id);
    if (!e) {
      const t = this.newTex();
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      e = { t, done: false, rev: -1 };
      this.tex.set(clip.id, e);
    }
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, e.t);
    const el = clip.el; if (!el && !clip.player) return e.t;
    if (clip.player) {   // reprodutor próprio: tocando a 1x é o <video> escondido; parado, esfregando ou na ré é o quadro do WebCodecs
      const p = clip.player;
      if (p.live && p.audio && p.audio.readyState >= 2) { try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, p.audio); e.rev = -1; } catch { } }
      else if (p.frame && e.rev !== p.frameId) { try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, p.frame); e.rev = p.frameId; } catch { } }
    } else if (clip.kind === 'video' || clip.kind === 'camera' || clip.kind === 'capture') {
      if (el.readyState >= 2) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
    } else if (clip.kind === 'text' || clip.kind === 'lasermirror' || clip.kind === 'model3d') {
      if (e.rev !== clip.rev) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el); e.rev = clip.rev; }
    } else if (!e.done && el.complete && el.naturalWidth) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
      e.done = true;
    }
    return e.t;
  }
  drop(clipId) {
    const e = this.tex.get(clipId);
    if (e) { this.gl.deleteTexture(e.t); this.tex.delete(clipId); }
    const f = this.srcFbo.get(clipId);
    if (f) { this.gl.deleteFramebuffer(f.fb); this.gl.deleteTexture(f.t); this.srcFbo.delete(clipId); }
  }
  // fonte gerada: um shader desenhado numa textura do tamanho da composição
  renderSource(clip) {
    const gl = this.gl, def = sourceById(clip.source);
    if (!def) return this.white;
    let f = this.srcFbo.get(clip.id);
    if (!f) { f = this.fbo(this.W, this.H); this.srcFbo.set(clip.id, f); }
    let pr = this.srcProg.get(def.id);
    if (!pr) {
      const fs = FX_HEAD + def.params.map(uDecl).join('\n') + '\n' + EFFECT_HELPERS + def.glsl + '\nvoid main(){ vec4 c = src(v); o = vec4(c.rgb * c.a, c.a); }';
      pr = this.program(VS_QUAD, fs, ['uRes', 'uTime', ...def.params.map(p => p.key)]); this.srcProg.set(def.id, pr);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.viewport(0, 0, f.w, f.h); gl.disable(gl.BLEND);
    gl.useProgram(pr.p); gl.bindVertexArray(this.quadVao);
    gl.uniform2f(pr.u.uRes, f.w, f.h); gl.uniform1f(pr.u.uTime, this.time + (clip.seed || 0));
    for (const p of def.params) this.setParam(pr, p, this.paramValue(clip, p));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.BLEND); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return f.t;
  }
  setParam(pr, p, v) {
    if (p.color && p.alpha) { const [r, g, b, a] = hexRgba(v); this.gl.uniform4f(pr.u[p.key], r, g, b, a); }
    else if (p.color) { const [r, g, b] = hexRgb(v); this.gl.uniform3f(pr.u[p.key], r, g, b); } else this.gl.uniform1f(pr.u[p.key], +v);
  }

  // o valor de um parâmetro de efeito ou de fonte agora: o guardado, ou o animado na batida
  paramValue(holder, p) {
    const a = holder.panim && holder.panim[p.key];
    if (a && a.shape && this.beat && !p.color) return animValue(a, this.beat);
    return holder.params[p.key] ?? p.def;
  }
  // ---------- efeitos ----------
  fxProgram(def) {
    let pr = this.fxProg.get(def.id);
    if (!pr) {
      // Opacidade do efeito (como no Resolume, todo efeito tem): mistura o resultado com o que entrou
      // efeito com { ring: true } (Delay RGB): recebe três quadros mais antigos da própria entrada, um por canal
      const fs = FX_HEAD + 'uniform float uFxOp;\n' + (def.ring ? 'uniform sampler2D uDelR; uniform sampler2D uDelG; uniform sampler2D uDelB;\n' : '') + (def.stage ? 'uniform sampler2D uMid;\n' : '') + (def.strokes ? 'uniform sampler2D uFld; uniform vec2 uFldRes; uniform sampler2D uStk;\n' : '') + (def.hist ? 'uniform highp sampler2DArray uHist; uniform float uHistI; uniform float uHistN; uniform float uHistL;\n' : '') + (def.lut ? 'uniform highp sampler3D uLut; uniform float uLutN;\n' : '') + def.params.map(uDecl).join('\n') + '\n' + EFFECT_HELPERS + def.glsl + '\nvoid main(){ vec4 r = fx(v); o = uFxOp >= 1.0 ? r : mix(texture(uTex, v), r, uFxOp); }';
      pr = this.program(VS_QUAD, fs, ['uTex', 'uPrev', 'uMid', 'uFld', 'uFldRes', 'uStk', 'uRes', 'uTime', 'uFxOp', ...(def.ring ? ['uDelR', 'uDelG', 'uDelB'] : []), ...(def.hist ? ['uHist', 'uHistI', 'uHistN', 'uHistL'] : []), ...(def.lut ? ['uLut', 'uLutN'] : []), ...def.params.map(p => p.key)]); this.fxProg.set(def.id, pr);
      // efeito com { stage }: um primeiro passe gera uma imagem intermediária (uMid), que o { gauss } desfoca para o uPrev (CRT: a máscara de fósforo e o bloom dela)
      if (def.stage) pr.stage = this.program(VS_QUAD, FX_HEAD + def.params.map(uDecl).join('\n') + '\n' + EFFECT_HELPERS + 'uniform float uPass;\n' + def.stage + '\nvoid main(){ o = fx(v); }', ['uTex', 'uPrev', 'uPass', 'uRes', 'uTime', ...def.params.map(p => p.key)]);
    }
    return pr;
  }
  // desfoque gaussiano separável de verdade (dois passes, 3 sigmas para cada lado), para efeito com { gauss: (valores, w, h) => sigma em px }:
  // o resultado entra no uPrev do efeito. Dois alvos compartilhados bastam: o efeito consome logo em seguida.
  gaussOf(src, w, h, sigma, sigmaY = sigma, cosseno = false) {
    const gl = this.gl; sigma = Math.min(128, sigma); sigmaY = Math.min(128, sigmaY); if (!(sigma > 0.01) && !(sigmaY > 0.01)) return src;
    if (!this.gaussProg) this.gaussProg = this.program(VS_QUAD, `#version 300 es
precision highp float; in vec2 v; out vec4 o; uniform sampler2D uTex; uniform vec2 uDir; uniform float uSigma; uniform float uCos;
void main(){ float sg = max(uSigma, 0.01); int R = int(ceil(sg * (uCos > 0.5 ? 1.0 : 3.0))); vec4 s = vec4(0.0); float t = 0.0; for (int i = -R; i <= R; i++) { float x = float(i) / sg, g = uCos > 0.5 ? (abs(x) < 1.0 ? pow(cos(x * 1.5707963), 2.0) : 0.0) : exp(-0.5 * x * x); s += texture(uTex, v + uDir * float(i)) * g; t += g; } o = s / t; }`, ['uTex', 'uDir', 'uSigma', 'uCos']);
    let G = this.gaussFbo;
    if (!G || G[0].w !== w || G[0].h !== h) { if (G) for (const q of G) { gl.deleteFramebuffer(q.fb); gl.deleteTexture(q.t); } G = this.gaussFbo = [this.fbo(w, h), this.fbo(w, h)]; }
    const P = this.gaussProg; gl.useProgram(P.p); gl.viewport(0, 0, w, h); gl.activeTexture(gl.TEXTURE0); gl.uniform1i(P.u.uTex, 0); gl.uniform1f(P.u.uSigma, sigma); gl.uniform1f(P.u.uCos, cosseno ? 1 : 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, G[0].fb); gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform2f(P.u.uDir, 1 / w, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.uniform1f(P.u.uSigma, sigmaY); gl.bindFramebuffer(gl.FRAMEBUFFER, G[1].fb); gl.bindTexture(gl.TEXTURE_2D, G[0].t); gl.uniform2f(P.u.uDir, 0, 1 / h); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return G[1].t;
  }
  // fila dos últimos quadros da entrada de um efeito com { hist: (valores, w, h) => { n, s } | null } (Grid Cloner com Delay):
  // n quadros numa textura em camadas, em s × o tamanho (cópia pequena não precisa do quadro inteiro). Recomeça quando o clipe troca.
  histOf(f, def, src, w, h, key) {
    const gl = this.gl, H = def.hist(Object.fromEntries(def.params.map(p => [p.key, this.paramValue(f, p)])), w, h);
    let m = this.fxMem.get(f);
    if (!H || H.n < 2) { if (m && m.arr) { gl.deleteTexture(m.arr); gl.deleteFramebuffer(m.fb); this.fxMem.delete(f); } return null; }
    const hw = Math.max(1, Math.round(w * H.s)), hh = Math.max(1, Math.round(h * H.s));
    if (!m || m.hw !== hw || m.hh !== hh || m.n !== H.n) {
      if (m && m.arr) { gl.deleteTexture(m.arr); gl.deleteFramebuffer(m.fb); }
      const arr = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, arr); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, hw, hh, H.n);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D_ARRAY, k, v);
      m = { arr, fb: gl.createFramebuffer(), hw, hh, n: H.n, i: -1, cnt: 0, key }; this.fxMem.set(f, m);
    }
    if (m.key !== key) { m.key = key; m.cnt = 0; }
    m.i = (m.i + 1) % m.n; m.cnt = Math.min(m.cnt + 1, m.n);
    gl.bindFramebuffer(gl.FRAMEBUFFER, m.fb); gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, m.arr, 0, m.i);
    this.copyInto(src, m.hw, m.hh, false); gl.disable(gl.BLEND);
    return m;
  }
  // Strokes, como medido no Resolume 7.28 (tools/compare/sondas/strokes_*.py, plano 02-12):
  // - a cada rodada (Frequency vezes por segundo, ou por minuto em BPM; Reset força uma) Amount pinceladas caem em lugares sorteados
  //   e ficam paradas até a rodada seguinte; cada uma tem a cor da imagem no lugar onde cai;
  // - a direção vem do "campo": o brilho (Rec. 601) desfocado num raio de 5 + 101 × Swirl px (em 1080 linhas). A pincelada deita ao
  //   longo da borda (gradiente + 90°, mais Rotation × uma volta); onde o campo é liso fica quase na horizontal, e some com Edges Only;
  // - comprimento "4 sigma" 169,5 px × Size, largura 0,414 disso; a Variation soma ao Size um sorteio normal (tamanho = Size +
  //   Variation × sorteio; negativo = pincelada virada); Size Mode Brightness multiplica por 0,1 + 0,9 × o maior canal da cor;
  // - as pinceladas da rodada são desenhadas numa camada à parte (opacas, a última por cima); o glsl do efeito mistura essa camada com
  //   o fundo, que é a saída anterior escurecida e empurrada ao longo das bordas pelo Flow.
  // Os pincéis são desenho nosso (tools/compare/sondas/strokes_pincel.py gera as tabelas dos fios e as medidas do quadrado do primeiro).
  // O Resolume troca o pincel por um arquivo de imagem (Resource); os presets dele usam cinco: o pincel, um feixe de riscos, uma seta,
  // quatro bolinhas e o logotipo deles. Aqui são cinco desenhos feitos no shader, no tamanho medido de cada um (a marca é genérica).
  strokesField(src, w, h, swirl) {
    const gl = this.gl, red = Math.max(1, Math.round(h / 270)), fw = Math.max(2, Math.ceil(w / red)), fh = Math.max(2, Math.ceil(h / red));
    if (this.stkFloat === undefined) this.stkFloat = !!gl.getExtension('EXT_color_buffer_float');
    let F = this.stkFld;
    if (!F || F.w !== fw || F.h !== fh) {
      if (F) for (const q of [F.a, F.b]) { gl.deleteFramebuffer(q.fb); gl.deleteTexture(q.t); }
      const mk = () => {   // meia precisão quando a placa deixa desenhar nela: o desfoque largo de um degradê suave precisa de mais que 8 bits
        const t = this.newTex();
        if (this.stkFloat) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, fw, fh, 0, gl.RGBA, gl.HALF_FLOAT, null); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fw, fh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        return { fb, t };
      };
      F = this.stkFld = { a: mk(), b: mk(), w: fw, h: fh };
    }
    if (!this.stkFldProg) this.stkFldProg = this.program(VS_QUAD, `#version 300 es
precision highp float; in vec2 v; out vec4 o; uniform sampler2D uTex; uniform vec2 uStep; uniform float uRad; uniform int uMode;
void main(){
  float s = 0.0, n = 0.0;
  if (uMode == 0) {   // brilho da entrada, média do bloco que vira um ponto do campo
    for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) s += dot(texture(uTex, v + (vec2(float(i), float(j)) - 0.5) * uStep).rgb, vec3(0.299, 0.587, 0.114));
    o = vec4(s * 0.25);
  } else {            // média numa linha de uRad pontos para cada lado (as pontas entram pela metade que couber)
    for (int k = -28; k <= 28; k++) { float p = clamp(uRad + 0.5 - abs(float(k)), 0.0, 1.0); s += p * texture(uTex, v + float(k) * uStep).r; n += p; }
    o = vec4(s / n);
  }
}`, ['uTex', 'uStep', 'uRad', 'uMode']);
    const P = this.stkFldProg, raio = Math.max(0, (5 + 101 * Math.max(0, Math.min(1, swirl)) - 4) / 4);   // em pontos do campo (1 ponto = 4 px de 1080 linhas; a diferença central já alcança um ponto)
    gl.useProgram(P.p); gl.disable(gl.BLEND); gl.viewport(0, 0, fw, fh); gl.activeTexture(gl.TEXTURE0); gl.uniform1i(P.u.uTex, 0);
    const passo = (alvo, tex, modo, sx, sy) => { gl.bindFramebuffer(gl.FRAMEBUFFER, alvo.fb); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(P.u.uMode, modo); gl.uniform2f(P.u.uStep, sx, sy); gl.uniform1f(P.u.uRad, Math.min(28, raio / 2)); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    passo(F.a, src, 0, red / 2 / w, red / 2 / h);
    for (let i = 0; i < 2; i++) { passo(F.b, F.a.t, 1, 1 / fw, 0); passo(F.a, F.b.t, 1, 0, 1 / fh); }   // duas passadas de metade do raio: o peso cai até zero na beirada (sem o degrau de uma média só)
    return { t: F.a.t, w: fw, h: fh };
  }
  strokesPass(f, def, src, w, h, fld) {
    const gl = this.gl, V = Object.fromEntries(def.params.map(p => [p.key, this.paramValue(f, p)]));
    let Y = this.stkLay;
    if (!Y || Y.w !== w || Y.h !== h) { if (Y) { gl.deleteFramebuffer(Y.fb); gl.deleteTexture(Y.t); } Y = this.stkLay = this.fbo(w, h); }
    if (!this.stkProg) this.stkProg = this.program(`#version 300 es
precision highp float;
uniform sampler2D uTex; uniform sampler2D uFld; uniform vec2 uRes, uFldRes; uniform float uTick, uSize, uVar, uRot, uEdges, uSMode; uniform vec2 uHalf;
out vec2 vq; out vec4 vc;
uint pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float hu(uint id, uint k){ return float(pcg(id * 8u + k)) / 4294967295.0; }   // sorteio por inteiros: o fract(sin) perdia precisão e punha as pinceladas numa grade
float cp(vec2 p){ return textureLod(uFld, p, 0.0).r; }
void main(){
  uint id = pcg(uint(gl_InstanceID) + uint(uTick) * 5003u);
  vec2 p = vec2(hu(id, 0u), hu(id, 1u)), t = 1.0 / uFldRes;
  vec4 c = textureLod(uTex, p, 0.0);
  // gradiente do campo em brilho por px da tela
  vec2 g = vec2(cp(p + vec2(t.x, 0.0)) - cp(p - vec2(t.x, 0.0)), cp(p + vec2(0.0, t.y)) - cp(p - vec2(0.0, t.y))) * 0.5 * uFldRes / uRes;
  bool liso = length(g) * uRes.y / 1080.0 < 1.2e-5;
  float a = (liso ? -0.035 : atan(g.y, g.x) + 1.5707963) + uRot * 6.2831853;
  vec2 dir = vec2(cos(a), sin(a));
  float u1 = max(hu(id, 2u), 1e-6), u2 = hu(id, 3u), n = sqrt(-2.0 * log(u1)) * cos(6.2831853 * u2);
  float k = (uSize + uVar * n) * uRes.y / 1080.0;   // a Variation SOMA ao Size (medido com Size 0,1 e 0,2); negativo: a pincelada sai virada
  if (uSMode > 0.5) k *= 0.1 + 0.9 * max(c.r, max(c.g, c.b));
  bool fora = c.a < 0.01 || abs(k) * uHalf.x < 0.3 || (uEdges > 0.5 && liso);
  vec2 q = vec2(gl_VertexID & 1, gl_VertexID >> 1) * 2.0 - 1.0;
  vec2 P = p * uRes + dir * q.x * uHalf.x * k + vec2(-dir.y, dir.x) * q.y * uHalf.y * k;
  vq = q; vc = c;
  gl_Position = fora ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(P / uRes * 2.0 - 1.0, 0.0, 1.0);
}`, `#version 300 es
precision highp float; in vec2 vq; in vec4 vc; out vec4 o; uniform float uBrush;
// os 16 fios do pincel: onde cada um acaba e onde tem uma falha (9 = sem falha)
const float PONTA[16] = float[16](0.62, 0.899, 0.887, 0.541, 0.719, 0.897, 0.536, 0.529, 0.705, 0.584, 0.637, 0.566, 0.569, 0.8, 0.735, 0.62);
const float F0[16] = float[16](0.302, 0.543, 0.567, 9.0, 0.384, 9.0, 0.194, 0.199, 0.438, 0.333, 0.334, 9.0, 0.41, 9.0, 9.0, 0.29);
const float F1[16] = float[16](0.372, 0.621, 0.702, 9.0, 0.523, 9.0, 0.307, 0.266, 0.508, 0.451, 0.415, 9.0, 0.472, 9.0, 9.0, 0.347);
float borda(float d, float w){ return 1.0 - smoothstep(-w, w, d); }   // 1 dentro (d < 0), 0 fora, com a beirada de um pixel
void main(){
  float x = vq.x, y = vq.y, ay = abs(y), wx = 0.7 * fwidth(x) + 1e-5, wy = 0.7 * fwidth(y) + 1e-5, m = 0.0, tom = 1.0;
  if (uBrush < 0.5) {          // pincel: corpo cheio, ponta esquerda redonda, ponta direita rasgada em fios
    int i = int(clamp(floor((y * 0.5 + 0.5) * 16.0), 0.0, 15.0));
    float esq = -1.0 + 0.5 * (1.0 - sqrt(max(0.0, 1.0 - ay * ay)));
    float cima = 0.97 - 0.10 * pow(clamp((x - 0.2) / 0.8, 0.0, 1.0), 2.0);
    float fino = clamp(8.0 * fwidth(y) - 0.25, 0.0, 1.0);                    // fios menores que um pixel: vale a ponta média, sem falhas
    m = smoothstep(esq - wx, esq + wx, x) * borda(x - mix(PONTA[i], 0.678, fino), wx) * borda(ay - cima, wy);
    m *= 1.0 - (1.0 - fino) * smoothstep(F0[i] - wx, F0[i] + wx, x) * (1.0 - smoothstep(F1[i] - wx, F1[i] + wx, x));
  } else if (uBrush < 1.5) {   // riscos: seis traços finos e ondulados, de comprimentos diferentes
    for (int j = 0; j < 6; j++) {
      float fj = float(j), yc = -0.78 + fj * 0.312 + 0.07 * sin(x * 3.1 + fj * 1.7) + 0.03 * sin(x * 9.0 + fj * 4.1);
      float x0 = -0.95 + 0.12 * fract(fj * 0.618 + 0.3), x1 = 0.95 - 0.16 * fract(fj * 0.381 + 0.1);
      float afina = smoothstep(x0, x0 + 0.25, x) * (1.0 - smoothstep(x1 - 0.25, x1, x));
      m = max(m, borda(abs(y - yc) - 0.075 * afina, wy) * step(x0, x) * step(x, x1));
    }
  } else if (uBrush < 2.5) {   // seta para a direita, com o rabo sumindo
    float haste = borda(ay - 0.32, wy) * step(x, 0.3) * smoothstep(-1.0, 0.05, x);
    float ponta = borda(ay - (1.0 - x) / 0.78, wy) * step(0.22, x) * borda(x - 1.0, wx);
    m = max(haste, ponta);
    // contorno escuro, como uma seta desenhada: por dentro de uma margem a cor é cheia
    float dentro = max(borda(ay - 0.2, wy) * step(x, 0.34), borda(ay - (0.86 - x) / 0.78, wy) * step(0.32, x));
    tom = mix(0.5, 1.0, dentro);
  } else if (uBrush < 3.5) {   // quatro bolinhas
    m = borda(length(abs(vq) - 0.68) - 0.31, max(wx, wy));
  } else {                     // marca genérica: um quadrado de cantos redondos e uma barra (o logotipo do Resolume não entra)
    vec2 a = abs(vec2((x + 0.9) * 8.1, y)) - 0.62;                     // o quadrado (o desenho é 8,1 vezes mais largo que alto)
    float quad = borda(length(max(a, 0.0)) + min(max(a.x, a.y), 0.0) - 0.2, wy);
    float bx = fract((x + 0.72) * 2.6), barra = borda(abs(y) - 0.34, wy) * step(-0.72, x) * borda(x - 0.98, wx) * step(0.16, bx);   // a barra em blocos, como letras
    if (ay < 0.19 && bx > 0.31 && bx < 0.85) barra = 0.0;              // blocos vazados
    m = max(quad, barra);
  }
  o = vec4(vc.rgb * tom, vc.a) * m;
}`, ['uTex', 'uFld', 'uRes', 'uFldRes', 'uTick', 'uSize', 'uVar', 'uRot', 'uEdges', 'uSMode', 'uHalf', 'uBrush']);
    // a rodada
    const S = f._stk || (f._stk = { tick: 0, t0: this.time, rs: +V.reset });
    if (+V.reset !== S.rs) { S.rs = +V.reset; S.tick++; S.t0 = this.time; }
    const per = V.freq > 0 ? (V.fmode >= 0.5 ? 60 : 1) / V.freq : Infinity;
    if (this.time < S.t0) S.t0 = this.time;
    if (this.time - S.t0 >= per) { const n = Math.floor((this.time - S.t0) / per); S.tick += n; S.t0 += n * per; }
    const P = this.stkProg; gl.useProgram(P.p);
    gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, fld.t); gl.uniform1i(P.u.uFld, 7); gl.uniform2f(P.u.uFldRes, fld.w, fld.h);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform1i(P.u.uTex, 0);
    gl.uniform2f(P.u.uRes, w, h); gl.uniform1f(P.u.uTick, S.tick % 4096);
    for (const [u, k] of [['uSize', 'size'], ['uVar', 'vari'], ['uRot', 'rot'], ['uEdges', 'edges'], ['uSMode', 'smode']]) gl.uniform1f(P.u[u], +V[k]);
    // meio comprimento e meia largura do quadrado de cada pincel, em px de 1080 linhas com Size 1 (medidos no Resolume; o do pincel pelo "4 sigma")
    const meio = [[90.83, 31.85], [50, 34.5], [66.5, 31.5], [32.5, 32], [280, 34.5]][Math.max(0, Math.min(4, Math.round(+V.brush || 0)))];
    gl.uniform2f(P.u.uHalf, meio[0], meio[1]); gl.uniform1f(P.u.uBrush, Math.round(+V.brush || 0));
    gl.bindFramebuffer(gl.FRAMEBUFFER, Y.fb); gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, Math.max(1, Math.min(5000, Math.round(V.amount))));
    gl.disable(gl.BLEND);
    return Y.t;
  }
  // a textura 3D da LUT de um efeito LUT (lut.js): refeita quando a LUT muda
  lutTex(f) {
    const L = lutOf(f), gl = this.gl;
    if (!this.lutMem) this.lutMem = new WeakMap();
    let m = this.lutMem.get(f);
    if (!L) return null;
    if (!m || m.lut !== L) {
      if (m) gl.deleteTexture(m.t);
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_3D, t);
      // textura 3D com FLIP_Y ou PREMULTIPLY ligado dá INVALID_OPERATION calado (o motor liga os dois para vídeo e imagem)
      const fy = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL), pm = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA16F, L.n, L.n, L.n, 0, gl.RGBA, gl.FLOAT, L.data);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, fy); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, pm);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_3D, k, v);
      m = { lut: L, t, n: L.n }; this.lutMem.set(f, m);
    }
    return m;
  }
  lutVazio() {
    if (!this._lutVazio) { const gl = this.gl; this._lutVazio = gl.createTexture(); gl.bindTexture(gl.TEXTURE_3D, this._lutVazio); gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGBA8, 1, 1, 1); }
    return this._lutVazio;
  }
  histVazio() {
    if (!this._histVazio) { const gl = this.gl, arr = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, arr); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, 1, 1, 1); this._histVazio = { arr, i: 0, cnt: 0, n: 1 }; }
    return this._histVazio;
  }
  // aplica uma cadeia de efeitos a uma textura w×h; devolve a textura resultante (ou a própria).
  // key: identidade do clipe de onde vem a textura (a fila do Delay RGB recomeça quando o clipe troca)
  applyChain(tex, w, h, chain, key) {
    const gl = this.gl, live = (chain || []).filter(f => !f.bypass && effectById(f.id));
    if (!live.length) return tex;
    gl.disable(gl.BLEND); gl.bindVertexArray(this.quadVao);
    let src = tex, i = 0;
    for (const f of live) {
      const def = effectById(f.id), pr = this.fxProgram(def);
      let dst, prev = this.white, ring = null, midTex = null, stage2 = null, hist = null;
      if (def.feedback) {   // a saída anterior entra em uPrev; desenha na outra textura do par
        let m = this.fxMem.get(f);
        if (!m || m.w !== w || m.h !== h) { if (m) { for (const q of [m.a, m.b]) { gl.deleteFramebuffer(q.fb); gl.deleteTexture(q.t); } } m = { a: this.fbo(w, h), b: this.fbo(w, h), i: 0, w, h }; this.fxMem.set(f, m); }
        dst = m.i ? m.b : m.a; prev = (m.i ? m.a : m.b).t; m.i ^= 1;
      } else {
        if (def.ring) {   // Delay RGB: fila dos últimos quadros renderizados desta entrada; cada canal lê um quadro mais antigo
          const del = def.params.map(p => Math.round(Math.max(0, Math.min(1, +this.paramValue(f, p))) * RING_FRAMES)), L = Math.max(...del) + 1;
          let m = this.fxMem.get(f);
          if (!m || m.w !== w || m.h !== h || m.ring.length < L) { if (m) for (const q of m.ring) { gl.deleteFramebuffer(q.fb); gl.deleteTexture(q.t); } m = { w, h, ring: Array.from({ length: L }, () => this.fbo(w, h)), i: -1, n: 0, key }; this.fxMem.set(f, m); }
          if (m.key !== key) { m.key = key; m.n = 0; }   // trocou o clipe: os três canais mostram o clipe novo de uma vez, como no Resolume
          const R = m.ring.length; m.i = (m.i + 1) % R; m.n = Math.min(m.n + 1, R);
          gl.bindFramebuffer(gl.FRAMEBUFFER, m.ring[m.i].fb); this.copyInto(src, w, h, false); gl.disable(gl.BLEND);
          const pick = d => m.ring[((m.i - Math.min(d, m.n - 1)) % R + R) % R].t;   // sem quadro tão antigo ainda, vale o mais antigo que há
          ring = del.map(pick);
        }
        if (def.hist) hist = this.histOf(f, def, src, w, h, key);
        if (def.stage) {
          const S = pr.stage; let T = this.stageFbo, T2 = this.stageFbo2;
          if (!T || T.w !== w || T.h !== h) { if (T) for (const q of [T, T2]) { gl.deleteFramebuffer(q.fb); gl.deleteTexture(q.t); } T = this.stageFbo = this.fbo(w, h); T2 = this.stageFbo2 = this.fbo(w, h); }
          gl.bindFramebuffer(gl.FRAMEBUFFER, T.fb); gl.viewport(0, 0, w, h); gl.useProgram(S.p); gl.uniform1f(S.u.uPass, 0);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform1i(S.u.uTex, 0);
          gl.uniform2f(S.u.uRes, w, h); gl.uniform1f(S.u.uTime, this.time);
          for (const p of def.params) this.setParam(S, p, this.paramValue(f, p));
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); midTex = T.t;
          // { stageMip }: o passe final lê a imagem intermediária já reduzida (textureLod); a textura é a mesma para todos os efeitos, por isso o filtro volta ao normal nos outros
          gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, T.t); if (def.stageMip) gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, def.stageMip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.activeTexture(gl.TEXTURE0);
          gl.bindFramebuffer(gl.FRAMEBUFFER, T2.fb); gl.uniform1f(S.u.uPass, 1); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); stage2 = T2.t;   // segundo passe: o que o gauss desfoca
        }
        if (def.gauss) { const sg = def.gauss(Object.fromEntries(def.params.map(p => [p.key, this.paramValue(f, p)])), w, h); prev = this.gaussOf(stage2 || src, w, h, Array.isArray(sg) ? sg[0] : sg, Array.isArray(sg) ? sg[1] : sg, Array.isArray(sg) && sg[2]); }
        if (def.mask && f._maskTex) prev = f._maskTex;   // Background Removal: a máscara da segmentação
        if (def.mask && f._segWant) {   // o recorte pediu um quadro: sai daqui, da entrada deste efeito, no tamanho do modelo
          const wnt = f._segWant; f._segWant = null;
          try { const rd = this.beginReadTex(src, wnt.W, wnt.H); (f._segReads || (f._segReads = [])).push({ rd, meta: wnt.meta }); if (this.segHook) this.segHook(f); } catch (err) { if (wnt.fail) wnt.fail(); }
          gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.disable(gl.BLEND);   // copyInto religa a mistura: sem isto o efeito desenhava POR CIMA do que sobrou no buffer, e onde a máscara é zero ficava o quadro velho
        }
        dst = this.scratch[1 + (i & 1)];
        if (dst.w !== w || dst.h !== h) { gl.deleteFramebuffer(dst.fb); gl.deleteTexture(dst.t); dst = this.scratch[1 + (i & 1)] = this.fbo(w, h); }
        if (dst.t === src) { dst = this.scratch[1 + ((i + 1) & 1)]; }
      }
      const fld = def.strokes ? this.strokesField(src, w, h, +this.paramValue(f, def.params.find(p => p.key === 'swirl'))) : null;   // Strokes: o campo de direção (brilho desfocado)
      const stk = def.strokes ? this.strokesPass(f, def, src, w, h, fld) : null;   // e a camada com as pinceladas da rodada
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, w, h);
      gl.useProgram(pr.p);
      if (fld) { gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, fld.t); gl.uniform1i(pr.u.uFld, 7); gl.uniform2f(pr.u.uFldRes, fld.w, fld.h); gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_2D, stk); gl.uniform1i(pr.u.uStk, 8); }
      if (ring) for (let k = 0; k < 3; k++) { gl.activeTexture(gl.TEXTURE2 + k); gl.bindTexture(gl.TEXTURE_2D, ring[k]); gl.uniform1i(pr.u[['uDelR', 'uDelG', 'uDelB'][k]], 2 + k); }
      if (midTex) { gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, midTex); gl.uniform1i(pr.u.uMid, 2); }
      if (def.lut) { const T = this.lutTex(f); gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_3D, T ? T.t : this.lutVazio()); gl.uniform1i(pr.u.uLut, 6); gl.uniform1f(pr.u.uLutN, T ? T.n : 0); }
      if (def.hist) { const H = hist || this.histVazio(); gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D_ARRAY, H.arr); gl.uniform1i(pr.u.uHist, 5); gl.uniform1f(pr.u.uHistI, H.i); gl.uniform1f(pr.u.uHistN, hist ? H.cnt : 0); gl.uniform1f(pr.u.uHistL, H.n); }
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, prev); gl.uniform1i(pr.u.uPrev, 1);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform1i(pr.u.uTex, 0);
      gl.uniform2f(pr.u.uRes, w, h); gl.uniform1f(pr.u.uTime, this.time);
      gl.uniform1f(pr.u.uFxOp, f.opacity ?? 1);
      for (const p of def.params) this.setParam(pr, p, this.paramValue(f, p));
      if (def.uniforms) {   // listas de números que o efeito calcula em JS (Grid Cloner: a ordem das cópias)
        const U = def.uniforms(Object.fromEntries(def.params.map(p => [p.key, this.paramValue(f, p)])), w, h); pr.ux = pr.ux || {};
        for (const k in U) { if (!(k in pr.ux)) pr.ux[k] = gl.getUniformLocation(pr.p, k); if (pr.ux[k]) gl.uniform1fv(pr.ux[k], U[k]); }
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      src = dst.t; i++;
    }
    gl.enable(gl.BLEND); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return src;
  }

  // ---------- camadas ----------
  // recorte do Seguir rosto: só quando o clipe é desenhado (a Prévia com marcação pede a imagem inteira: noCropId)
  cropOf(clip) { return clip && clip._crop && clip.id !== this.noCropId ? clip._crop : null; }
  fitScale(clip, W, H) {
    const k = this.cropOf(clip), ar = k ? (clip.w * k.w) / (clip.h * k.h) : clip.w / clip.h, car = W / H;
    let sx = 1, sy = 1;
    if (clip.fit === 'contain') { if (ar > car) sy = car / ar; else sx = ar / car; }
    else if (clip.fit === 'cover') { if (ar > car) sx = ar / car; else sy = car / ar; }
    return [sx, sy];
  }
  // desenha um clipe com ajuste e transformação no alvo atual (quad com a textura fornecida)
  drawClipQuad(tex, clip, tr, opacity, W, H, blend) {
    const gl = this.gl, P = this.progLayer;
    gl.useProgram(P.p); gl.bindVertexArray(this.quadVao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(P.u.uTex, 0);
    const [sx, sy] = clip ? this.fitScale(clip, W, H) : [1, 1];
    const t = tr || IDENT_TR();
    gl.uniform2f(P.u.uScale, sx * t.scale * (t.sx ?? 1), sy * t.scale * (t.sy ?? 1));
    gl.uniform2f(P.u.uPos, t.x, t.y); gl.uniform1f(P.u.uRot, -t.rot * Math.PI / 180); gl.uniform1f(P.u.uAspect, W / H);
    gl.uniform1f(P.u.uOp, opacity);
    gl.uniform1f(P.u.uPre, clip && clip.kind !== 'source' ? 0 : 1);   // só a textura de um elemento (vídeo, imagem, texto) ainda tem alfa reto
    const k = this.cropOf(clip);   // a textura sobe virada (UNPACK_FLIP_Y): o y do uv cresce para cima
    if (k) gl.uniform4f(P.u.uSrc, k.x, 1 - k.y - k.h, k.w, k.h); else gl.uniform4f(P.u.uSrc, 0, 0, 1, 1);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  clipReady(clip) { return clip && clip.w > 0 && clip.h > 0 && (clip.kind === 'source' || clip.el || clip.player); }
  // o clipe pronto para a camada, numa textura do tamanho da composição: ajuste e transformação
  // do clipe, efeitos do clipe e da camada, transformação da camada, opacidade do clipe
  clipTexInto(fbo, c, L, W, H) {
    const gl = this.gl, chain = [...(c.fx || []), ...(L.fx || [])], s = this.scratch[0];
    const tex = this.texFor(c);
    gl.bindFramebuffer(gl.FRAMEBUFFER, s.fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawClipQuad(tex, c, c.transform, c.opacity ?? 1, W, H, 'normal');
    const out = this.applyChain(s.t, W, H, chain, c.id);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawClipQuad(out, null, L.transform || IDENT_TR(), 1, W, H, 'normal');
    return fbo.t;
  }
  // mistura A (embaixo / clipe antigo) com B (camada / clipe novo) no modo pedido, com o fader k, dentro de dst
  mixInto(dst, texA, texB, k, mode, trans, opt, W, H, seed = 0) {
    const gl = this.gl, P = this.progMix, o = opt || MIXER_OPT();
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, W, H); gl.disable(gl.BLEND);
    gl.useProgram(P.p); gl.bindVertexArray(this.quadVao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA); gl.uniform1i(P.u.uA, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB); gl.uniform1i(P.u.uB, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1f(P.u.uK, k); gl.uniform1i(P.u.uTrans, trans ? 1 : 0); gl.uniform1i(P.u.uMode, mixerCode(mode));
    const [r, g, b] = hexRgb(mixerColor(mode, o)); gl.uniform3f(P.u.uColor, r, g, b); gl.uniform1f(P.u.uSmooth, o.smooth ?? 0.1);
    gl.uniform1f(P.u.uTime, this.time); gl.uniform2f(P.u.uRes, W, H); gl.uniform1f(P.u.uSeed, seed);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.BLEND);
    return dst.t;
  }
  // crossfader: quanto cada bus (A ou B) aparece, pela posição (0 = A, 1 = B) e pela curva
  busFactor(bus) {
    const x = this.xfade; if (!bus || !x || this._noBus) return 1;   // _noBus: passe de um bus do crossfader como fonte de slice
    const p = Math.max(0, Math.min(1, x.pos));
    if (x.curve === 'cut') return bus === 'A' ? (p <= 0.5 ? 1 : 0) : (p >= 0.5 ? 1 : 0);
    if (x.curve === 'power') return bus === 'A' ? Math.cos(p * Math.PI / 2) : Math.sin(p * Math.PI / 2);
    return bus === 'A' ? 1 - p : p;
  }
  // uma textura pronta (um grupo) entra no alvo com efeitos, transformação, opacidade e modo de mistura
  compositeInto(target, tex, fx, transform, op, blend, opt, W, H, seed) {
    const gl = this.gl, F = this.mixFbo, tr = transform || IDENT_TR();
    let src = this.applyChain(tex, W, H, fx);
    if (src !== tex || !trIdent(tr)) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, F[2].fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawClipQuad(src, null, tr, 1, W, H, 'normal'); src = F[2].t;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, W, H);
    if (blend === 'alpha') { this.drawClipQuad(src, null, null, op, W, H, 'normal'); return; }
    gl.bindFramebuffer(gl.FRAMEBUFFER, F[3].fb); this.copyInto(target.t, W, H, false);
    this.mixInto(target, F[3].t, src, op, blend, 0, opt, W, H, seed);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  // uma camada = o clipe no ar (e, na transição, o anterior saindo pelo modo escolhido) com os
  // efeitos do clipe e da camada, misturada no alvo pelo modo de mistura da camada. target é um fbo {fb, t}.
  drawLayer(L, W, H, target) {
    const gl = this.gl;
    // _rawOp e _rawBy: passes de fonte de slice que ignoram a opacidade ou o bypass/solo da camada (Input Opacity e Input Bypass/Solo desligados)
    const op = (this._rawOp ? 1 : (L.master ?? 1) * L.opacity) * this.busFactor(L.bus);   // M (master) × V (opacidade) da camada, como no Resolume
    if (!this._rawBy && (L.bypass || (this.soloL && !L.solo))) return;
    if (op <= 0) return;
    const clip = L.on >= 0 ? L.clips[L.on] : (L.ghost || null);   // ghost: o clipe de outro deck que continua no ar
    let k = 1;
    if (L.prev && L.prev.clip && this.clipReady(L.prev.clip)) {
      k = Math.min(1, (this.time - L.prev.t0) / Math.max(0.01, L.prev.dur));
      if (k >= 1) L.prev = null;
    } else L.prev = null;
    const transitioning = !!L.prev;
    const blend = normMixer((clip && clip.blend) || L.blend);
    if (!transitioning) {
      if (!this.clipReady(clip)) return;
      if (blend === 'alpha') {   // caminho direto: o clipe desenhado por cima do alvo
        const c = clip, chain = [...(c.fx || []), ...(L.fx || [])];
        let tex = this.texFor(c), tr = L.transform || IDENT_TR();
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, W, H);
        if (chain.length || !trIdent(c.transform)) {
          const s = this.scratch[0];
          gl.bindFramebuffer(gl.FRAMEBUFFER, s.fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
          this.drawClipQuad(tex, c, c.transform, 1, W, H, 'normal');
          tex = this.applyChain(s.t, W, H, chain, c.id);
          gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, W, H);
          this.drawClipQuad(tex, null, tr, op * (c.opacity ?? 1), W, H, 'normal');
        } else this.drawClipQuad(tex, c, { ...tr }, op * (c.opacity ?? 1), W, H, 'normal');
        return;
      }
    }
    // a textura da camada: o clipe pronto ou, na transição, antigo e novo misturados no modo da transição
    const F = this.mixFbo;
    let layerTex;
    if (transitioning) {
      const a = this.clipTexInto(F[0], L.prev.clip, L, W, H);
      let b;
      if (this.clipReady(clip)) b = this.clipTexInto(F[1], clip, L, W, H);
      else { gl.bindFramebuffer(gl.FRAMEBUFFER, F[1].fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); b = F[1].t; }
      layerTex = this.mixInto(F[2], a, b, k, L.prev.mode || 'alpha', 1, L.prev.opt, W, H, L.prev.seed || 0);
    } else layerTex = this.clipTexInto(F[2], clip, L, W, H);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, W, H);
    if (blend === 'alpha') { this.drawClipQuad(layerTex, null, null, op, W, H, 'normal'); return; }
    // modo de mistura: copia o alvo e mistura a camada por cima, com o fader da camada
    gl.bindFramebuffer(gl.FRAMEBUFFER, F[3].fb); this.copyInto(target.t, W, H, false);
    this.mixInto(target, F[3].t, layerTex, op, blend, 0, L.blendOpt, W, H, L.id);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // textura auxiliar de fonte de slice, guardada junto das de camada (some com elas quando o tamanho muda)
  auxFbo(key, W, H) {
    const gl = this.gl; let f = this.layerFbo.get(key);
    if (!f) { f = this.fbo(W, H); this.layerFbo.set(key, f); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    return f;
  }
  // camadas e grupos que passam no filtro, de baixo para cima, num alvo transparente; os grupos entram com os efeitos e a opacidade deles
  drawTree(layers, target, W, H, quer) {
    const gl = this.gl, groups = this.groups || [];
    for (let i = layers.length - 1; i >= 0; i--) {
      const L = layers[i], g = L.group != null ? groups.find(x => x.id === L.group) : null;
      if (!g) { if (quer(L, null)) this.drawLayer(L, W, H, target); continue; }
      let j = i; while (j - 1 >= 0 && layers[j - 1].group === L.group) j--;
      const members = []; for (let k = i; k >= j; k--) members.push(layers[k]);
      i = j;
      if (!quer(L, g) || g.bypass || g.opacity <= 0) continue;
      const f = this.auxFbo('tmpg', W, H);
      for (const m of members) this.drawLayer(m, W, H, f);
      this.compositeInto(target, f.t, g.fx, g.transform, g.opacity, normMixer(g.blend), g.blendOpt, W, H, 1000 + g.id);
    }
  }
  // fontes de slice além da composição e da camada simples: camada sem a opacidade ou sem o bypass/solo dela, Bus A, Bus B e o grupo selecionado
  renderSliceSources(layers, W, H) {
    const nd = this.need; if (!nd) return;
    for (const [key, v] of nd.variants) {
      const f = this.auxFbo(key, W, H), L = layers.find(x => x.id === v.id); if (!L) continue;
      this._rawOp = v.ro; this._rawBy = v.rb; try { this.drawLayer(L, W, H, f); } finally { this._rawOp = this._rawBy = false; }
    }
    for (const b of nd.bus) {   // só o que está naquele bus, sem depender da posição do crossfader
      const f = this.auxFbo('bus' + b, W, H);
      this._noBus = true; try { this.drawTree(layers, f, W, H, (L, g) => (g ? g.bus : L.bus) === b); } finally { this._noBus = false; }
    }
    if (nd.group) {
      const f = this.auxFbo('selgroup', W, H), id = this.selGroupId;
      if (id != null) { this._noBus = true; try { this.drawTree(layers, f, W, H, (L, g) => !!g && g.id === id); } finally { this._noBus = false; } }
    }
  }
  // layers: de cima para baixo (como na grade). Desenha de baixo para cima na composição.
  // layerIds: camadas que algum slice usa como fonte direta; cada uma ganha a sua textura.
  render(layers, layerIds = new Set(), time = performance.now() / 1000) {
    const gl = this.gl, W = this.W, H = this.H; this.time = time;
    if (this.compBypass) layers = [];   // B da composição (linha de cima da grade): a saída fica no fundo, o que está no ar continua tocando
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.comp.fb);
    gl.viewport(0, 0, W, H);
    gl.clearColor(this.bg[0], this.bg[1], this.bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
    const groups = this.groups || [], gById = (id) => groups.find(g => g.id === id);
    this.soloL = layers.some(L => L.solo && !L.bypass);
    const soloG = groups.some(g => g.solo && !g.bypass);
    for (let i = layers.length - 1; i >= 0; i--) {
      const L = layers[i], g = L.group != null ? gById(L.group) : null;
      if (!g) { if (!soloG) this.drawLayer(L, W, H, this.comp); continue; }
      // o trecho contíguo do grupo, de baixo para cima, numa textura só
      let j = i; while (j - 1 >= 0 && layers[j - 1].group === L.group) j--;
      const members = []; for (let k = i; k >= j; k--) members.push(layers[k]);
      i = j;
      const gop = g.opacity * this.busFactor(g.bus);
      if (g.bypass || gop <= 0 || (soloG && !g.solo)) continue;
      let f = this.groupFbo.get(g.id);
      if (!f) { f = this.fbo(W, H); this.groupFbo.set(g.id, f); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      for (const m of members) this.drawLayer(m, W, H, f);
      this.compositeInto(this.comp, f.t, g.fx, g.transform, gop, normMixer(g.blend), g.blendOpt, W, H, 1000 + g.id);
    }
    for (const L of layers) {
      if (!layerIds.has(L.id)) continue;
      let f = this.layerFbo.get(L.id);
      if (!f) { f = this.fbo(W, H); this.layerFbo.set(L.id, f); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawLayer(L, W, H, f);
    }
    this.renderSliceSources(layers, W, H);
    // efeitos da composição e o master
    const out = this.applyChain(this.comp.t, W, H, this.compFx);
    const ct = this.compTransform;   // posição, escala e giro da composição inteira (painel Composição)
    if (out !== this.comp.t || this.master < 1 || !trIdent(ct)) {
      const s = this.scratch[0];
      gl.bindFramebuffer(gl.FRAMEBUFFER, s.fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawClipQuad(out, null, ct, this.master, W, H, 'normal');
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.comp.fb);
      this.copyInto(s.t, W, H, true);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // a composição vai para o canvas mestre, para o monitor e para as sondas
    this.copyTo(this.comp.t, W, H);
  }
  // prévia: um clipe da camada (mesmo fora do ar) renderizado como sairia, com os efeitos do
  // clipe e da camada; fica no canvas mestre para o blit
  previewLayer(L, clipIdx) {
    const gl = this.gl, W = this.W, H = this.H;
    if (this.prevFbo && (this.prevFbo.w !== W || this.prevFbo.h !== H)) { gl.deleteFramebuffer(this.prevFbo.fb); gl.deleteTexture(this.prevFbo.t); this.prevFbo = null; }   // a composição mudou de tamanho (ex.: assistente de projetores): a Prévia saía na escala velha (Felipe, 2026-10-30)
    if (!this.prevFbo) this.prevFbo = this.fbo(W, H);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.prevFbo.fb); gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawLayer({ ...L, on: clipIdx, prev: null, ghost: null, bypass: false, opacity: 1, solo: true, bus: null }, W, H, this.prevFbo);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.copyTo(this.prevFbo.t, W, H);
  }
  // Quadro de um clipe reduzido a w×h, lido da placa (para o recorte de pessoa): a textura do clipe já está na placa para o
  // render, então um passe de cópia + readPixels custa ~2 ms, contra ~24 ms do createImageBitmap do <video> na thread principal
  // (que ainda derrubava a composição de 30 para 24 qps). Linhas saem de cima para baixo, como o getImageData.
  // A leitura é ASSÍNCRONA (readPixels num buffer PIXEL_PACK + fence): o readPixels direto esperava a placa terminar tudo o que
  // estava na fila (9 a 17 ms parado, mais quanto mais máscaras por segundo). beginReadClipFrame enfileira; pollReadClipFrame
  // devolve os pixels quando a placa acabou, ou null se ainda não.
  // A máscara do recorte tem de nascer da MESMA imagem que o efeito vê (a entrada dele na cadeia, já encaixada na camada), e não
  // da textura crua do clipe: uma webcam 4:3 encaixada com barras numa composição 16:9 dava uma máscara esticada 33% na horizontal
  // (Felipe, 2026-10-30: "a imagem da câmera estava menor que a máscara"; era o "aberto" e os "ombros esticados" de todas as betas).
  beginReadTex(tex, w, h) {
    const gl = this.gl;
    let f = this.readFbo; if (!f || f.w !== w || f.h !== h) { if (f) { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.t); } f = this.readFbo = this.fbo(w, h); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); this.copyInto(tex, w, h, true);
    const pbo = gl.createBuffer(); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo); gl.bufferData(gl.PIXEL_PACK_BUFFER, w * h * 4, gl.STREAM_READ);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, 0); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
    return { sync, pbo, w, h, t0: performance.now() };
  }
  pollReadClipFrame(r) {
    const gl = this.gl; if (!r || !r.sync) return null;
    const st = gl.clientWaitSync(r.sync, 0, 0);
    if (st === gl.TIMEOUT_EXPIRED) return null;
    gl.deleteSync(r.sync); r.sync = null;
    const buf = new Uint8Array(r.w * r.h * 4);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, r.pbo); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, buf); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); gl.deleteBuffer(r.pbo);
    // as texturas sobem com UNPACK_FLIP_Y_WEBGL e o readPixels devolve de baixo para cima: vira as linhas para ficar como o getImageData
    // (Felipe, beta.26: "botou a máscara de cabeça para baixo")
    const row = r.w * 4, tmp = new Uint8Array(row);
    for (let y = 0, z = r.h - 1; y < z; y++, z--) { const a = y * row, b = z * row; tmp.set(buf.subarray(a, a + row)); buf.copyWithin(a, b, b + row); buf.set(tmp, b); }
    return buf;
  }
  // Webcam virtual: a composição encaixada em W×H (barras pretas, sem esticar) vira NV12 na placa. Quatro bytes por pixel da textura de
  // W/4 × H×3/2: as linhas de Y primeiro, depois as de UV. Faixa limitada 16–235, como a câmera do OBS espera. A primeira linha lida é a de cima da imagem.
  beginWebcam(W, H) {
    const gl = this.gl, w = W / 4, h = H * 3 / 2;
    if (!this.camProg) this.camProg = this.program(VS_QUAD, `#version 300 es
precision highp float; in vec2 v; out vec4 o; uniform sampler2D uTex; uniform vec2 uCam; uniform vec2 uFit;
const vec3 KY = vec3(0.299, 0.587, 0.114), KU = vec3(-0.1687, -0.3313, 0.5), KV = vec3(0.5, -0.4187, -0.0813);   // BT.601: é como o Chromium lê esta câmera (medido com faixas de cor)
vec3 img(vec2 p){ vec2 u = (p / uCam - 0.5) / uFit + 0.5; if (u.x < 0.0 || u.x > 1.0 || u.y < 0.0 || u.y > 1.0) return vec3(0.0); return texture(uTex, vec2(u.x, 1.0 - u.y)).rgb; }
float Y(vec3 c){ return (16.0 + 219.0 * dot(c, KY)) / 255.0; }
void main(){ vec2 f = floor(gl_FragCoord.xy); float x = f.x * 4.0;
  if (f.y < uCam.y) { o = vec4(Y(img(vec2(x + 0.5, f.y + 0.5))), Y(img(vec2(x + 1.5, f.y + 0.5))), Y(img(vec2(x + 2.5, f.y + 0.5))), Y(img(vec2(x + 3.5, f.y + 0.5)))); return; }
  float r = (f.y - uCam.y) * 2.0 + 1.0; vec3 a = img(vec2(x + 1.0, r)), b = img(vec2(x + 3.0, r));
  o = vec4((128.0 + 224.0 * dot(a, KU)) / 255.0, (128.0 + 224.0 * dot(a, KV)) / 255.0, (128.0 + 224.0 * dot(b, KU)) / 255.0, (128.0 + 224.0 * dot(b, KV)) / 255.0); }`, ['uTex', 'uCam', 'uFit']);
    let f = this.camFbo; if (!f || f.w !== w || f.h !== h) { if (f) { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.t); } f = this.camFbo = this.fbo(w, h); }
    const P = this.camProg, car = this.W / this.H, tar = W / H;
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.viewport(0, 0, w, h); gl.disable(gl.BLEND); gl.useProgram(P.p); gl.bindVertexArray(this.quadVao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.comp.t); gl.uniform1i(P.u.uTex, 0); gl.uniform2f(P.u.uCam, W, H);
    gl.uniform2f(P.u.uFit, car > tar ? 1 : car / tar, car > tar ? tar / car : 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const pbo = gl.createBuffer(); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo); gl.bufferData(gl.PIXEL_PACK_BUFFER, w * h * 4, gl.STREAM_READ);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, 0); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.enable(gl.BLEND);
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
    return { sync, pbo, t0: performance.now() };
  }
  pollWebcam(r, buf) {
    const gl = this.gl; if (!r || !r.sync) return null;
    if (gl.clientWaitSync(r.sync, 0, 0) === gl.TIMEOUT_EXPIRED) return null;
    gl.deleteSync(r.sync); r.sync = null;
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, r.pbo); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, buf); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); gl.deleteBuffer(r.pbo); r.pbo = null;
    return buf;
  }
  beginReadClipFrame(c, w, h) { const e = this.tex.get(c.id); return this.beginReadTex(e ? e.t : this.texFor(c), w, h); }
  cancelReadClipFrame(r) { const gl = this.gl; if (!r) return; if (r.sync) gl.deleteSync(r.sync); if (r.pbo) gl.deleteBuffer(r.pbo); r.sync = null; r.pbo = null; }
  copyInto(tex, w, h, opaque) {
    const gl = this.gl;
    gl.viewport(0, 0, w, h); gl.disable(gl.BLEND);
    gl.useProgram(this.progCopy.p); gl.bindVertexArray(this.quadVao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(this.progCopy.u.uTex, 0); gl.uniform1i(this.progCopy.u.uOpaque, opaque ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.BLEND);
  }
  copyTo(tex, w, h) { this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null); this.copyInto(tex, w, h, true); }
  // copia o que está no canvas mestre (canto inferior esquerdo, w×h) para um canvas 2D
  blit(ctx, w = this.W, h = this.H) {
    ctx.drawImage(this.canvas, 0, this.canvas.height - h, w, h, 0, 0, w, h);
  }

  // Test Card no canvas, para o quadro Composição da janela de controle mostrar o mesmo que as telas recebem
  cardToCanvas() {
    const t = this.renderSource(this.testCardClip || (this.testCardClip = { id: '__testcard', kind: 'source', source: 'testcard', params: {} }));
    if (t) this.copyTo(t, this.W, this.H);
  }
  // ---------- telas ----------
  sourceTex(slice, layers) {
    const src = slice.source;
    if (src === 'comp') return this.comp.t;
    if (src === 'preview') return this.prevValid && this.prevFbo ? this.prevFbo.t : null;   // a Prévia, se foi desenhada neste quadro
    if (typeof src === 'string' && src.startsWith('screen:')) { const o = this.screenOut.get(src.slice(7)); return o && o.vivo ? o.t : null; }   // a saída pronta de outra tela
    let key;
    if (src === 'busA' || src === 'busB') key = 'bus' + src[3];
    else if (src === 'selgroup') key = 'selgroup';
    else {   // uma camada: a escolhida ou a que estiver selecionada na grade
      const id = src === 'sel' ? this.selLayerId : src, ro = slice.inOpacity === false, rb = slice.inBypass === false;
      key = ro || rb ? id + '|' + (ro ? 'o' : '') + (rb ? 'b' : '') : id;
    }
    const f = this.layerFbo.get(key);
    return f ? f.t : null;
  }
  geomFor(slice) {
    const gl = this.gl;
    let g = this.geom.get(slice.id);
    if (g && g.rev === slice.rev) return g;
    if (!g) {
      g = { vao: gl.createVertexArray(), pos: gl.createBuffer(), luv: gl.createBuffer(), idx: gl.createBuffer(), n: 0, rev: -1 };
      gl.bindVertexArray(g.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.pos); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.luv); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.idx);
      gl.bindVertexArray(null);
      this.geom.set(slice.id, g);
    }
    const t = slice.type === 'poly' ? tessellatePoly(slice, this.W, this.H) : tessellate(slice);   // polígono: leva a composição inteira como recorte e os pontos de entrada nos vértices
    // o buffer de índices pertence ao VAO que estiver ligado: liga o deste slice antes de
    // enviar, senão o índice novo vai parar no VAO do slice desenhado por último
    gl.bindVertexArray(g.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.pos); gl.bufferData(gl.ARRAY_BUFFER, t.pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.luv); gl.bufferData(gl.ARRAY_BUFFER, t.luv, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, t.idx, gl.DYNAMIC_DRAW);
    gl.bindVertexArray(null);
    g.n = t.idx.length; g.rev = slice.rev;
    return g;
  }
  // máscaras são polígonos desenhados num canvas 2D e enviados como textura
  maskTexFor(key, rev, w, h, draw) {
    const gl = this.gl;
    let m = this.maskTex.get(key);
    if (m && m.rev === rev && m.w === w && m.h === h) return m.t;
    if (!m) { m = { t: this.newTex(), canvas: document.createElement('canvas'), rev: -1, w: 0, h: 0 }; this.maskTex.set(key, m); }
    m.canvas.width = w; m.canvas.height = h; m.w = w; m.h = h; m.rev = rev;
    const ctx = m.canvas.getContext('2d');
    draw(ctx);
    gl.bindTexture(gl.TEXTURE_2D, m.t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, m.canvas);
    return m.t;
  }
  static polyPath(ctx, pts, sx, sy) {
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0] * sx, p[1] * sy) : ctx.moveTo(p[0] * sx, p[1] * sy));
    ctx.closePath();
  }

  renderScreen(screen, layers, screens) {
    const gl = this.gl, w = screen.w, h = screen.h;
    // Test Card: a fonte "testcard" no tamanho da composição entra em todos os slices no lugar da composição ou da camada
    const card = this.testCard ? this.renderSource(this.testCardClip || (this.testCardClip = { id: '__testcard', kind: 'source', source: 'testcard', params: {} })) : null;
    this.ensureSize(w, h);
    let f = this.screenFbo.get(screen.id);
    if (!f || f.w !== w || f.h !== h) {
      if (f) { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.t); }
      f = this.fbo(w, h); this.screenFbo.set(screen.id, f);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const P = this.progSlice; gl.useProgram(P.p);
    const all = allSlices(screens);
    for (const s of screen.items) {
      const poly = s.type === 'poly';   // slice polígono: mesmo desenho, com a rede de triângulos dele; sem recorte girado, espelho, emenda nem máscara de entrada
      if ((s.type !== 'slice' && !poly) || !s.enabled) continue;
      const tex = card || this.sourceTex(s, layers);
      if (!tex) continue;
      const g = this.geomFor(s);
      gl.bindVertexArray(g.vao);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(P.u.uTex, 0);
      gl.uniform2f(P.u.uScreen, w, h);
      if (poly) { gl.uniform4f(P.u.uIn, 0, 0, this.W, this.H); gl.uniform1f(P.u.uRot, 0); gl.uniform2f(P.u.uFlip, 0, 0); }
      else {
        gl.uniform4f(P.u.uIn, s.in.x, s.in.y, s.in.w, s.in.h);
        gl.uniform1f(P.u.uRot, s.in.rot * Math.PI / 180);
        gl.uniform2f(P.u.uFlip, s.flip.x ? 1 : 0, s.flip.y ? 1 : 0);
      }
      gl.uniform2f(P.u.uSrc, this.W, this.H);
      gl.uniform2f(P.u.uBC, s.color.bright, s.color.contrast);
      gl.uniform3f(P.u.uRGB, s.color.r, s.color.g, s.color.b);
      // degradês de emenda (até 8): A→B em pixels do recorte; o uv local cresce para baixo, como a composição
      const soft = poly ? { on: false, power: 2, lum: 0.5, black: 0, gamma: [2.2, 2.2, 2.2] } : s.soft;
      const gs = soft.on ? softGradsOn(s, all) : [];
      gl.uniform1i(P.u.uUseSoft, soft.on ? 1 : 0); gl.uniform1i(P.u.uNG, gs.length); gl.uniform2f(P.u.uInSize, poly ? this.W : s.in.w, poly ? this.H : s.in.h);
      if (gs.length) {
        const GA = new Float32Array(32), GB = new Float32Array(32);
        gs.forEach((g, i) => { GA.set([g.a[0], g.a[1], g.b[0], g.b[1]], i * 4); GB.set([g.n1, g.n2, gradRadius(g), 0], i * 4); });
        gl.uniform4fv(P.u.uGA, GA); gl.uniform4fv(P.u.uGB, GB);
      }
      gl.uniform3f(P.u.uSoftP, soft.power, soft.lum, soft.black / 255);
      gl.uniform3f(P.u.uGamma, soft.gamma[0], soft.gamma[1], soft.gamma[2]);
      if (!poly && s.inMask) {
        const m = s.inMask;
        gl.activeTexture(gl.TEXTURE1);       // a máscara vive na unidade 1; o envio acontece nela
        const mt = this.maskTexFor('i' + s.id, m.rev, 512, 512, (ctx) => {
          ctx.fillStyle = m.invert ? '#fff' : '#000'; ctx.fillRect(0, 0, 512, 512);
          Engine.polyPath(ctx, m.pts, 512, 512); ctx.fillStyle = m.invert ? '#000' : '#fff'; ctx.fill();
        });
        gl.bindTexture(gl.TEXTURE_2D, mt); gl.uniform1i(P.u.uMask, 1);
        gl.uniform1i(P.u.uUseMask, 1);
        gl.activeTexture(gl.TEXTURE0);
      } else {
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.white); gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(P.u.uMask, 1); gl.uniform1i(P.u.uUseMask, 0);
      }
      // Fundo preto (Black BG do Resolume): preto opaco na forma do slice, por baixo dele; É chave (Is Key): só a transparência, em branco
      gl.uniform1i(P.u.uKey, s.key ? 1 : 0);
      if (s.blackBg) { gl.uniform1i(P.u.uBlack, 1); gl.drawElements(gl.TRIANGLES, g.n, gl.UNSIGNED_INT, 0); }
      gl.uniform1i(P.u.uBlack, 0);
      gl.drawElements(gl.TRIANGLES, g.n, gl.UNSIGNED_INT, 0);
    }
    // passe final: cor da tela, opacidade e máscaras de saída
    const masks = screen.items.filter(i => i.type === 'mask' && i.enabled);
    let mt = null;
    if (masks.length) {
      const rev = masks.map(m => m.id + ':' + m.rev).join(',');
      gl.activeTexture(gl.TEXTURE1);
      mt = this.maskTexFor('o' + screen.id, rev, w, h, (ctx) => {
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        for (const m of masks) {
          if (m.invert) {
            ctx.save(); Engine.polyPath(ctx, m.pts, 1, 1); ctx.rect(w, 0, -w, h); ctx.fillStyle = '#000'; ctx.fill('evenodd'); ctx.restore();
          } else { Engine.polyPath(ctx, m.pts, 1, 1); ctx.fillStyle = '#000'; ctx.fill(); }
        }
      });
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h); gl.disable(gl.BLEND);
    const S = this.progScreen; gl.useProgram(S.p); gl.bindVertexArray(this.quadVao);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mt || this.white); gl.uniform1i(S.u.uMask, 1);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, f.t); gl.uniform1i(S.u.uTex, 0);
    gl.uniform1i(S.u.uUseMask, mt ? 1 : 0);
    gl.uniform2f(S.u.uBC, screen.color.bright, screen.color.contrast);
    gl.uniform3f(S.u.uRGB, screen.color.r, screen.color.g, screen.color.b);
    gl.uniform1f(S.u.uOp, screen.opacity);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // tela pedida como fonte por um slice de outra tela: a mesma saída pronta vai também para uma textura
    if (this.need && this.need.screens && this.need.screens.has(screen.uid)) {
      let o = this.screenOut.get(screen.uid);
      if (!o || o.w !== w || o.h !== h) { if (o) { gl.deleteFramebuffer(o.fb); gl.deleteTexture(o.t); } o = this.fbo(w, h); this.screenOut.set(screen.uid, o); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, o.fb); gl.viewport(0, 0, w, h); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); o.vivo = true;
    }
    gl.enable(gl.BLEND);
  }

  // ---------- sondas (testes) ----------
  readPts(pts, w, h) {
    const gl = this.gl, px = new Uint8Array(4);
    return pts.map(([x, y]) => {
      gl.readPixels(Math.floor(x * (w - 1)), Math.floor((1 - y) * (h - 1)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return [px[0], px[1], px[2]];
    });
  }
  probe(layers, pts) { this.render(layers); return this.readPts(pts, this.W, this.H); }
  probeScreen(screen, layers, screens, pts) { this.render(layers, this.neededLayers(screens)); this.renderScreen(screen, layers, screens); return this.readPts(pts, screen.w, screen.h); }
  // o que os slices pedem como fonte: devolve as camadas simples (uma textura por camada) e guarda em this.need as outras
  neededLayers(screens) {
    const s = new Set(); this.need = { variants: new Map(), bus: new Set(), group: false, preview: false, screens: new Set() };
    for (const sl of screens.flatMap(sc => sc.enabled ? sc.items.filter(i => i.type === 'slice' || i.type === 'poly') : [])) {
      const src = sl.source; if (src === 'comp') continue;
      if (src === 'preview') { this.need.preview = true; continue; }
      if (typeof src === 'string' && src.startsWith('screen:')) { this.need.screens.add(src.slice(7)); continue; }
      if (src === 'busA' || src === 'busB') { this.need.bus.add(src[3]); continue; }
      if (src === 'selgroup') { this.need.group = true; continue; }
      const id = src === 'sel' ? this.selLayerId : src; if (id == null) continue;
      const ro = sl.inOpacity === false, rb = sl.inBypass === false;
      if (!ro && !rb) s.add(id); else this.need.variants.set(id + '|' + (ro ? 'o' : '') + (rb ? 'b' : ''), { id, ro, rb });
    }
    for (const [uid, o] of this.screenOut) if (!this.need.screens.has(uid) || !screens.some(sc => sc.uid === uid && sc.enabled)) o.vivo = false;   // tela apagada, desligada ou que ninguém mais pede
    return s;
  }
}
