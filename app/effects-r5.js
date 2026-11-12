// Efeitos refeitos com os controles e a imagem do Resolume 7.28 — lote 5. Ver tools/compare/LOTES.md.
// A conta de cada um foi deduzida das fotos do gabarito e conferida com tools/compare/confere.mjs.
import { N, B, L, C, E, def } from './effects-rk.js';

// os oito controles dos cantos (Keystone, Keystone Crop, Keystone Mask); x cresce para a direita, y para baixo
const cantos = (d) => [
  N('tlx', 'Top Left X', 'Cima-esq. X', d[0], 0, 1), N('tly', 'Top Left Y', 'Cima-esq. Y', d[1], 0, 1),
  N('trx', 'Top Right X', 'Cima-dir. X', d[2], 0, 1), N('try', 'Top Right Y', 'Cima-dir. Y', d[3], 0, 1),
  N('brx', 'Bot. Right X', 'Baixo-dir. X', d[4], 0, 1), N('bry', 'Bot. Right Y', 'Baixo-dir. Y', d[5], 0, 1),
  N('blx', 'Bot. Left X', 'Baixo-esq. X', d[6], 0, 1), N('bly', 'Bot. Left Y', 'Baixo-esq. Y', d[7], 0, 1)];
// os cantos esticam a imagem por interpolação bilinear (as linhas da carta continuam igualmente espaçadas, sem
// perspectiva); ks() devolve o ponto do quadrado (0..1) que cai em p (z < 0: nenhum). Grade: 5 x 5 casas, risco branco a 50 %.
const KS = `
float kx(vec2 a, vec2 b){ return a.x * b.y - a.y * b.x; }
vec2 kuv(vec2 h, vec2 e, vec2 f, vec2 g, float v){ float dx = e.x + g.x * v, dy = e.y + g.y * v; return vec2(abs(dx) > abs(dy) ? (h.x - f.x * v) / dx : (h.y - f.y * v) / dy, v); }
vec3 ks(vec2 p){ vec2 a = vec2(tlx, tly), b = vec2(trx, try), c = vec2(brx, bry), d = vec2(blx, bly);
  vec2 e = b - a, f = d - a, g = a - b + c - d, h = p - a;
  float k2 = kx(g, f), k1 = kx(e, f) + kx(h, g), k0 = kx(h, e);
  if (abs(k2) < 1e-6) { if (abs(k1) < 1e-9) return vec3(0.0, 0.0, -1.0); return vec3(kuv(h, e, f, g, -k0 / k1), 1.0); }
  float w = k1 * k1 - 4.0 * k0 * k2; if (w < 0.0) return vec3(0.0, 0.0, -1.0); w = sqrt(w);
  vec2 r = kuv(h, e, f, g, (-k1 - w) * 0.5 / k2);
  if (r.x < 0.0 || r.x > 1.0 || r.y < 0.0 || r.y > 1.0) r = kuv(h, e, f, g, (-k1 + w) * 0.5 / k2);
  return vec3(r, 1.0); }
float kgrid(vec2 s){ vec2 g = s * 5.0, w = max(fwidth(g), vec2(1e-6)); vec2 d = min(fract(g), 5.0 - g) / w; return min(d.x, d.y) < 2.0 ? 1.0 : 0.0; }
vec4 kline(vec4 c){ return vec4(c.rgb * 0.5 + 0.5 + 0.5 * (1.0 - c.a), 1.0); }
// dentro do polígono dos quatro cantos (regra par-ímpar, como sai quando os lados se cruzam)
float kin(vec2 p){ vec2 v[4] = vec2[4](vec2(tlx, tly), vec2(trx, try), vec2(brx, bry), vec2(blx, bly)); bool c = false;
  for (int i = 0; i < 4; i++) { vec2 a = v[i], b = v[(i + 1) % 4]; if ((a.y > p.y) != (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c; }
  return c ? 1.0 : 0.0; }
`;

export const R5 = [
  // a imagem inteira é esticada em perspectiva até os quatro cantos; fora fica vazio
  def({ id: 'keystone', name: 'Keystone', desc: 'Puxa os quatro cantos da imagem, em perspectiva.',
    params: [...cantos([0, 0, 1, 0, 1, 1, 0, 1]), B('grid', 'Show Grid', 'Mostrar grade'), B('bg', 'Black BG', 'Fundo preto')],
    glsl: KS + `vec4 fx(vec2 uv){ vec2 p = vec2(uv.x, 1.0 - uv.y); vec3 s = ks(p);
      bool in_ = s.z > 0.0 && s.x >= 0.0 && s.x <= 1.0 && s.y >= 0.0 && s.y <= 1.0;
      vec4 c = in_ ? tex(vec2(s.x, 1.0 - s.y)) : vec4(0.0);
      if (bg > 0.5) c = vec4(c.rgb, 1.0);
      if (grid > 0.5 && in_ && kgrid(1.0 - s.xy) > 0.5) c = kline(c);
      return c; }` }),
  // a imagem fica no lugar; só aparece o que está dentro do quadrilátero
  def({ id: 'keystonecrop', name: 'Keystone Crop', desc: 'Mostra só o que está dentro do quadrilátero dos quatro cantos.',
    params: [...cantos([0.25, 0.25, 0.75, 0.25, 0.75, 0.75, 0.25, 0.75]), B('grid', 'Show Grid', 'Mostrar grade'), B('bg', 'Black BG', 'Fundo preto')],
    glsl: KS + `vec4 fx(vec2 uv){ vec2 p = vec2(uv.x, 1.0 - uv.y); float k = kin(p); vec4 c = tex(uv) * k;
      if (bg > 0.5) c = vec4(c.rgb, 1.0);
      if (grid > 0.5 && k > 0.5) { vec3 s = ks(p); if (kgrid(s.xy) > 0.5) c = kline(c); }
      return c; }` }),
  // o contrário: o quadrilátero fura a imagem (Invert devolve o recorte)
  def({ id: 'keystonemask', name: 'Keystone Mask', desc: 'Fura a imagem com o quadrilátero dos quatro cantos; Inverter mostra só o que está dentro.',
    params: [...cantos([0.25, 0.25, 0.75, 0.25, 0.75, 0.75, 0.25, 0.75]), B('invert', 'Invert', 'Inverter'), B('grid', 'Show Grid', 'Mostrar grade'), B('bg', 'Black BG', 'Fundo preto')],
    glsl: KS + `vec4 fx(vec2 uv){ vec2 p = vec2(uv.x, 1.0 - uv.y); float k = kin(p); vec4 c = tex(uv) * (invert > 0.5 ? k : 1.0 - k);
      if (bg > 0.5) c = vec4(c.rgb, 1.0);
      if (grid > 0.5 && k > 0.5) { vec3 s = ks(p); if (kgrid(s.xy) > 0.5) c = kline(c); }
      return c; }` }),
  // Mask do Resolume: a transparência vem de uma imagem escolhida (arquivo). Sem imagem, como no gabarito, a entrada
  // passa inteira; o motor ainda não tem controle de arquivo de imagem, então os controles estão aqui mas sem efeito.
  def({ id: 'mask', name: 'Mask', desc: 'Usa uma imagem como máscara de transparência (sem imagem escolhida, a entrada passa inteira).',
    params: [L('resize', 'Resize', 'Encaixe', ['Fill', 'Fit', 'Stretch'], ['Preencher', 'Caber', 'Esticar'], 2),
      L('channel', 'Channel', 'Canal', ['Luminance', 'Red', 'Green', 'Blue', 'Alpha'], ['Brilho', 'Vermelho', 'Verde', 'Azul', 'Alfa']), B('invert', 'Invert', 'Inverter')],
    glsl: `vec4 fx(vec2 uv){ return tex(uv); }` }),
  // disco no centro: raio = Scale × 1/4 da largura; o contorno ocupa a fração Outline do raio, por dentro.
  // Cor com alfa a: imagem × (1 − a²) + cor × a (medido com a = 0,5: 0,75 × imagem + 0,5 × cor); o contorno mistura por cima
  // pelo alfa dele. O ruído estica o raio de cada ponto em até metade (Noise Amount × ruído × 0,5).
  def({ id: 'shaper', name: 'Shaper', desc: 'Um disco colorido com contorno no centro da imagem, com a borda desfiada por ruído.',
    params: [N('scale', 'Scale', 'Escala', 1, 0.01, 4), L('ntype', 'Noise Type', 'Tipo de ruído', ['Grain', 'Hatched'], ['Grão', 'Hachurado'], 1),
      N('namount', 'Noise Amount', 'Quantidade de ruído', 0, -1, 1), N('nspeed', 'Noise Speed', 'Velocidade do ruído', 0.75, 0, 1),
      C('color', 'Color', 'Cor', '#ffffffff', true), N('outline', 'Outline', 'Contorno', 0.1, 0, 0.5), C('ocolor', 'Outline Color', 'Cor do contorno', '#1dd0ffff', true)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec2 p = (uv - 0.5) * uRes; float R = scale * 0.25 * uRes.x, n = 0.0;
      if (namount != 0.0) { float t = floor(uTime * nspeed * 30.0);
        if (ntype < 0.5) n = hash(floor(p * 0.5) + t * 7.31);
        else { vec2 q = rot2(p, -0.9) / uRes.x * 960.0; n = vnoise(vec2(q.y * 1.6 + t * 3.7, q.x * 0.012 + t * 1.3)); } }
      float d = length(p) / (1.0 + 0.5 * namount * n);
      float m = clamp((R - d) * 0.5 + 0.5, 0.0, 1.0), mi = clamp((R * (1.0 - outline) - d) * 0.5 + 0.5, 0.0, 1.0);
      vec3 f = c.rgb * (1.0 - color.a * color.a) + color.rgb * color.a, g = mix(f, ocolor.rgb, ocolor.a);
      float fa = max(c.a, color.a), ga = max(fa, ocolor.a);
      return mix(c, mix(vec4(g, ga), vec4(f, fa), mi), m); }` }),
  // anéis em volta do centro: cada ponto recebe a cor de uma linha horizontal da imagem. Ponto de partida
  // t = 1 − 0,9 × Size (em x e em y, y contado de cima); anda para a direita a distância ao centro (em fração do quadro).
  def({ id: 'circles', name: 'Circles', desc: 'Transforma uma linha da imagem em anéis em volta do centro.',
    params: [N('size', 'Size', 'Tamanho', 0.5, 0, 1), B('bg', 'Black BG', 'Fundo preto')],
    glsl: `vec4 fx(vec2 uv){ float d = length(uv - 0.5), t = 1.0 - 0.9 * size; vec4 c = tex(vec2(t + d, 1.0 - t));
      return bg > 0.5 ? vec4(c.rgb, 1.0) : c; }` }),
  // grade a partir do centro: passo = Size × metade do quadro; risco de largura Width × passo; Fuzzyness × passo é a
  // largura da rampa (smoothstep) de cada lado, e risco mais fino que a rampa fica mais fraco. Vertical e horizontal
  // somam. A cor entra já multiplicada pelo alfa dela, no lugar da imagem.
  def({ id: 'grid', name: 'Grid', desc: 'Grade de linhas por cima da imagem.',
    params: [N('width', 'Width', 'Largura', 0.05, 0, 1), N('sx', 'Size X', 'Tamanho X', 0.1, 0, 1), N('sy', 'Size Y', 'Tamanho Y', 0.1, 0, 1),
      N('fuzz', 'Fuzzyness', 'Suavidade', 0.05, 0, 1), C('color', 'Color', 'Cor', '#ffffffff', true)],
    glsl: `float gband(float d, float f){ float h = width * 0.5; return smoothstep(0.0, 1.0, (h - d) / f + 0.5) - smoothstep(0.0, 1.0, (-h - d) / f + 0.5); }
    float gline(float x, float per, float px){ if (per <= 0.0) return 0.0; float u = x / per, d = abs(fract(u + 0.5) - 0.5), f = max(fuzz, 1e-5);
      return gband(d, f) + gband(1.0 - d, f) + gband(1.0 + d, f); }
    vec4 fx(vec2 uv){ vec4 c = tex(uv); if (width <= 0.0) return c;
      float m = clamp(gline(uv.x - 0.5, 0.5 * sx, 1.0 / uRes.x) + gline(uv.y - 0.5, 0.5 * sy, 1.0 / uRes.y), 0.0, 1.0);
      return mix(c, vec4(color.rgb * color.a, color.a), m); }` }),
  // bolinhas em colunas: meia casa s = 1 px + Dot Size × 1/4 da largura; colunas a cada 2s a partir do centro, bolinhas a
  // cada 2s em cada coluna, colunas alternadas deslocadas de s. A cor é a do centro da casa (2s × 2s) e o raio é
  // s × brilho (Rec. 601) dessa cor, com a borda desfeita em ~10 px. Abaixo do Threshold a bolinha some.
  def({ id: 'polkadot', name: 'Polkadot', desc: 'A imagem vira bolinhas, maiores onde é mais claro.',
    params: [N('dsize', 'Dot Size', 'Tamanho', 0.1, 0, 1), N('thr', 'Threshold', 'Limiar', 0, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ float s = 1.0 + dsize * uRes.x * 0.25; vec2 p = (uv - 0.5) * uRes; p.y = -p.y;
      float col = floor(p.x / (2.0 * s)), xc = (col + 0.5) * 2.0 * s, yd, ys;
      if (mod(col, 2.0) > 0.5) { yd = (floor(p.y / (2.0 * s)) + 0.5) * 2.0 * s; ys = yd; }
      else { yd = floor(p.y / (2.0 * s) + 0.5) * 2.0 * s; ys = yd + s; }
      vec4 c = abs(ys) > 0.5 * uRes.y ? vec4(0.0) : tex(vec2(xc, -ys) / uRes + 0.5); float l = lum(un(c)), r = (thr > 0.0 && l <= thr) ? 0.0 : s * l;
      return c * (r > 0.0 ? sqrt(smoothstep(-1.9, 7.5, r - length(p - vec2(xc, yd)))) : 0.0); }` }),
  // grade de pontos com a cor da imagem: 4 + 124 × Resolution pontos na largura (× 9/16 na altura), espalhados por
  // 1,062 × o quadro; ponto de raio 32 × Size px; Space afasta os pontos (× 1 + 9,1 × Space) sem mudar a cor de cada um;
  // Rotate X/Y/Z giram o plano (0,5 = parado, volta inteira de 0 a 1; medido só de 90 em 90 graus, sem perspectiva).
  // Smooth Start abaixo de 1 apaga parte dos pontos (no Resolume segue um ruído próprio; aqui, um ruído parecido).
  def({ id: 'pointgrid', name: 'Point Grid', desc: 'A imagem vira uma grade de pontos que pode ser afastada e girada no espaço.',
    params: [N('size', 'Size', 'Tamanho', 0.1, 0, 1), N('sstart', 'Smooth Start', 'Entrada suave', 1, 0, 1), B('bg', 'Black BG', 'Fundo preto'),
      N('space', 'Space', 'Espaço', 0, 0, 1), N('res', 'Resolution', 'Resolução', 0.5, 0, 1),
      N('rx', 'Rotate X', 'Girar X', 0.5, 0, 1), N('ry', 'Rotate Y', 'Girar Y', 0.5, 0, 1), N('rz', 'Rotate Z', 'Girar Z', 0.5, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ float nx = floor(4.5 + 124.0 * res), ny = max(1.0, floor(nx * 0.5625)), ext = 2.124 * (1.0 + 9.1 * space), A = 16.0 / 9.0;
      vec3 a = (vec3(rx, ry, 1.0 - rz) - 0.5) * 6.2831853, cs = cos(a), sn = sin(a);
      mat2 M = mat2(cs.z * cs.y, sn.z * cs.y, cs.z * sn.y * sn.x - sn.z * cs.x, sn.z * sn.y * sn.x + cs.z * cs.x);
      float det = M[0][0] * M[1][1] - M[1][0] * M[0][1]; if (abs(det) < 1e-5) det = det < 0.0 ? -1e-5 : 1e-5;
      mat2 Mi = mat2(M[1][1], -M[0][1], -M[1][0], M[0][0]) / det;
      vec2 n = (uv - 0.5) * 2.0, P = Mi * vec2(n.x, n.y * A), nn = vec2(nx, ny);
      vec2 f = (vec2(P.x, -P.y / A) / ext + 0.5) * nn - 0.5, b0 = clamp(floor(f + 0.5), vec2(0.0), nn - 1.0);
      float r = 32.0 * size + 0.4, best = -1.0; vec2 bi = vec2(0.0);
      for (int dj = -3; dj <= 3; dj++) for (int di = -3; di <= 3; di++) { vec2 id = b0 + vec2(float(di), float(dj));
        if (id.x < 0.0 || id.y < 0.0 || id.x >= nx || id.y >= ny) continue;
        vec2 g = ((id + 0.5) / nn - 0.5) * ext, w = M * vec2(g.x, -g.y * A);
        float d = length((vec2(w.x, w.y / A) - n) * 0.5 * uRes), o = id.y * nx + id.x;
        if (d < r && o > best) { best = o; bi = id; } }
      if (best < 0.0) return bg > 0.5 ? vec4(0.0, 0.0, 0.0, 1.0) : vec4(0.0);
      vec4 c = tex(vec2(bi.x / nx, 1.0 - bi.y / ny));
      float al = clamp(0.4 + 0.4 * vnoise(bi * vec2(0.9, 0.35)) + 0.75 * sstart, 0.0, 1.0);
      c *= al; return bg > 0.5 ? vec4(c.rgb, 1.0) : c; }` }),
  // varredura de radar: Angle gira o feixe no sentido horário a partir da direita; atrás do feixe o rastro vale
  // k = (1 − θ/volta)^(30,1 × (1 − Trail Length)). A imagem entra com saturação k e brilho min(1, k + Fade): fora do
  // rastro sobra a imagem cinza × Fade. Grade: riscos de 1/960 da largura a cada floor(32 × Grid Scale)/960, onde o fundo vale 0,2 em vez de Fade (1 nos cruzamentos).
  def({ id: 'radar', name: 'Radar', desc: 'Um feixe de radar revela a imagem em cores e deixa um rastro que apaga para o cinza.',
    params: [N('angle', 'Angle', 'Ângulo', 0, 0, 1), N('trail', 'Trail Length', 'Comprimento do rastro', 0.75, 0, 0.99), N('fade', 'Fade', 'Fundo', 0.1, 0, 1),
      B('grid', 'Show Grid', 'Mostrar grade', 1), N('gscale', 'Grid Scale', 'Escala da grade', 0.5, 0.08, 1)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 u = un(c); vec2 p = (uv - 0.5) * uRes; float un_ = uRes.x / 960.0;
      float th = mod(atan(p.y + un_, p.x) + 6.2831853 * angle, 6.2831853) / 6.2831853;
      float k = pow(1.0 - th, 30.1 * (1.0 - trail)), f = fade;
      if (grid > 0.5) { float P = max(1.0, floor(32.0 * gscale)) * un_; vec2 m = mod(vec2(p.x - uRes.x, -p.y - uRes.y), P);
        bool lx = m.x < un_, ly = m.y < un_; if (lx || ly) f = (lx && ly) ? 1.0 : 0.2; }
      vec3 o = mix(vec3(lum(u)), u, k) * min(1.0, k + f);
      return pre(o, c.a); }` }),
  // a imagem aparece em casas (X × Y, parte inteira): cada casa cresce de 0 a 1 com Phase, com uma moldura de Border
  // (em 1/960 da largura) de cada lado, e apaga junto se Fade. Scaling: de onde cresce (centro; para cima a partir de
  // baixo; para a direita a partir da esquerda; do canto de baixo à esquerda). Order Random: cada casa tem a sua vez
  // (avanço = 5 × Phase − 4 × sorteio; o sorteio do Resolume muda a cada vez, não bate casa a casa). Seed Audio segue o som.
  def({ id: 'reveal', name: 'Reveal', desc: 'Revela a imagem aos poucos, em casas que crescem cada uma na sua vez.',
    params: [N('phase', 'Phase', 'Fase', 0.5, 0, 1), N('nx', 'X', 'Casas em X', 8, 1, 80), N('ny', 'Y', 'Casas em Y', 8, 1, 80), N('border', 'Border', 'Moldura', 3, 0, 20),
      L('textura', 'Texture', 'Textura', ['Full', 'Color'], ['Imagem', 'Cor']), B('stretch', 'Stretch', 'Esticar'), B('fade', 'Fade', 'Apagar', 1),
      L('scaling', 'Scaling', 'Crescimento', ['None', 'Centre', 'Up', 'Right', 'Corner'], ['Nenhum', 'Centro', 'Para cima', 'Para a direita', 'Canto'], 1),
      L('order', 'Order', 'Ordem', ['Normal', 'Random'], ['Normal', 'Sorteada'], 1), L('seed', 'Seed', 'Semente', ['Normal', 'Audio'], ['Normal', 'Som']), B('bg', 'Black BG', 'Fundo preto', 1)],
    glsl: `vec4 fx(vec2 uv){ vec2 n = max(vec2(1.0), floor(vec2(nx, ny))), q = vec2(uv.x, 1.0 - uv.y) * n, id = floor(q), f = fract(q);
      float s = seed > 0.5 ? 0.0 : order < 0.5 ? phase : clamp(5.0 * phase - 4.0 * hash(id * 1.37 + 3.1), 0.0, 1.0);
      vec2 sc = scaling < 0.5 ? vec2(1.0) : scaling < 1.5 ? vec2(s) : scaling < 2.5 ? vec2(1.0, s) : scaling < 3.5 ? vec2(s, 1.0) : vec2(s);
      vec2 an = scaling < 1.5 ? vec2(0.5) : vec2(0.0, 1.0), lo = an * (1.0 - sc), b = border * uRes.x / 960.0 * n / uRes;
      vec4 o = vec4(0.0);
      if (s > 0.0 && f.x > lo.x + b.x && f.x < lo.x + sc.x - b.x && f.y > lo.y + b.y && f.y < lo.y + sc.y - b.y) {
        vec2 r = (f - lo - b) / (sc - 2.0 * b), t = textura > 0.5 ? vec2(0.5) : stretch > 0.5 ? r : lo + r * sc, p = (id + t) / n;
        o = tex(vec2(p.x, 1.0 - p.y)) * (fade > 0.5 ? s : 1.0); }
      return bg > 0.5 ? vec4(o.rgb, 1.0) : o; }` }),
  // Slice Transform do Resolume: aplica à imagem o recorte e o encaixe das fatias (slices) da Saída avançada. Sem fatias
  // montadas, como no gabarito, nenhum controle muda a imagem: a entrada passa inteira.
  def({ id: 'slicetransform', name: 'Slice Transform', desc: 'Encaixa a imagem nas fatias da saída avançada (sem fatias montadas, a entrada passa inteira).',
    params: [B('bg', 'Black BG', 'Fundo preto'), L('scaling', 'Scaling', 'Encaixe', ['Fill', 'Fit', 'Stretch', 'Mask', 'Mask Invert'], ['Preencher', 'Caber', 'Esticar', 'Máscara', 'Máscara invertida']),
      N('scale', 'Scale', 'Escala', 1, 0, 10)],
    glsl: `vec4 fx(vec2 uv){ return tex(uv); }` }),
  // faixas sorteadas que deixam ver a imagem sobre um fundo de cor (Red, Green, Blue, Alpha). No Resolume o sorteio muda
  // a cada vez (metade das fotos do gabarito saiu sem faixa nenhuma), então aqui vale a aparência: Number × 10 faixas,
  // largura sorteada entre MinWidth e MaxWidth (× 2,26 × GlobalWidth, como medido nas fotos de GlobalWidth), Direction
  // gira as faixas (0 = em pé, 0,25 = deitadas), Direction Spread entorta cada uma, Feather desfaz a borda, Speed anda.
  def({ id: 'stripper', name: 'Stripper', desc: 'Faixas sorteadas deixam ver a imagem sobre um fundo de cor.',
    params: [N('number', 'Number', 'Quantidade', 0.1, 0, 1), N('mode', 'Mode', 'Modo', 0, 0, 1), N('dir', 'Direction', 'Direção', 0, 0, 1), N('dspread', 'Direction Spread', 'Variação da direção', 0, 0, 1),
      N('mtype', 'MovementType', 'Tipo de movimento', 0, 0, 1), N('speed', 'Speed', 'Velocidade', 0, 0, 1), N('sspread', 'SpeedSpread', 'Variação da velocidade', 0, 0, 1),
      N('gwidth', 'GlobalWidth', 'Largura geral', 1, 0, 1), N('minw', 'MinWidth', 'Largura mínima', 0.1, 0, 1), N('maxw', 'MaxWidth', 'Largura máxima', 0.4, 0, 1),
      N('feather', 'Feather', 'Suavidade', 0, 0, 1), N('red', 'Red', 'Vermelho', 0, 0, 1), N('green', 'Green', 'Verde', 0, 0, 1), N('blue', 'Blue', 'Azul', 0, 0, 1), N('alpha', 'Alpha', 'Alfa', 1, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec2 p = vec2(uv.x - 0.5, (0.5 - uv.y) * uRes.y / uRes.x); float m = 0.0, n = ceil(number * 10.0 - 0.001);
      for (int i = 0; i < 10; i++) { float fi = float(i); if (fi >= n) break;
        float r1 = hash(vec2(fi, 1.7)), r2 = hash(vec2(fi, 5.3)), r3 = hash(vec2(fi, 9.1)), r4 = hash(vec2(fi, 13.9));
        float a = 6.2831853 * (dir + dspread * (r3 - 0.5) * 0.5), w = gwidth * mix(minw, maxw, r2) * 2.26 * 0.5;
        float c = r1 - 0.5, t = uTime * speed * (1.0 + sspread * (r4 * 4.0 - 2.0)) * 0.5;
        if (mtype > 0.99) c = hash(vec2(fi, floor(uTime * 8.0))) - 0.5; else c = fract(c + 0.5 + t) - 0.5;
        float d = abs(dot(p, vec2(cos(a), sin(a))) - c * 1.3), f = feather * w;
        m = max(m, w <= 0.0 ? 0.0 : f > 0.0 ? 1.0 - smoothstep(w - f, w, d) : step(d, w)); }
      vec4 c = tex(mode > 0.99 ? uv : uv), bgc = vec4(vec3(red, green, blue) * alpha, alpha);
      if (mode > 0.99) m = 1.0;
      return mix(bgc, c, m); }` }),
  // mexe sozinho (não bate por pixel): faixas horizontais sorteadas a cada instante; Frequency = quantas faixas pulam,
  // Horizontal = até onde andam para o lado (algumas saem esticadas na altura), Vertical = parte das faixas vira coluna
  // que anda para cima e para baixo, Size = altura das faixas. A imagem dá a volta; com Black BG o que sai some.
  def({ id: 'shiftglitch', name: 'Shift Glitch', desc: 'Faixas da imagem pulam de lugar e esticam, como defeito de sinal.',
    params: [N('freq', 'Frequency', 'Frequência', 1, 0, 1), N('vert', 'Vertical', 'Vertical', 0, 0, 1), N('horiz', 'Horizontal', 'Horizontal', 0.5, 0, 1),
      N('size', 'Size', 'Tamanho', 0.5, 0, 1), B('bg', 'Black BG', 'Fundo preto')],
    glsl: `vec4 sgs(vec2 q){ if (bg > 0.5) return texIn(q); return tex(fract(q)); }
    vec4 fx(vec2 uv){ float t = floor(uTime * 12.0), n = mix(40.0, 5.0, size); vec2 q = uv;
      float y0 = uv.y * n + hash(vec2(t, 3.0)) * 7.0, band = floor(y0), r = hash(vec2(band, t)), r2 = hash(vec2(band, t + 31.0)), r3 = hash(vec2(band, t + 57.0));
      band = floor(y0 / (1.0 + floor(r3 * 3.0)) ); r = hash(vec2(band, t)); r2 = hash(vec2(band, t + 31.0)); r3 = hash(vec2(band, t + 57.0));
      if (r < 0.15 + 0.45 * freq) {
        if (r3 < vert) { float col = floor(uv.x * n * 0.6 + r2 * 5.0), c1 = hash(vec2(col, t + 9.0)); q.y += (c1 - 0.5) * 1.2 * vert; q.x += (hash(vec2(col, t + 77.0)) - 0.5) * 0.3 * vert; }
        else { q.x += (r2 - 0.5) * 2.0 * horiz; if (r3 > 0.65) q.y = (band + 0.5) / n + (uv.y - (band + 0.5) / n) * 0.25 + (r2 - 0.5) * 0.6 * horiz; } }
      return sgs(q); }` }),
  // cópias da imagem (FragScale = tamanho de cada uma) espalhadas numa casca em volta do centro e somadas umas às
  // outras (peso CompositeOpacity²): Distance abre a casca, Rotation gira o conjunto, FragRotation X/Y/Z giram cada
  // cópia (aqui sem perspectiva). As posições do Resolume são sorteadas: vale a aparência, não bate cópia a cópia.
  def({ id: 'fragment', name: 'Fragment', desc: 'Muitas cópias da imagem somadas, que se afastam do centro e giram.',
    params: [N('frags', 'Fragments', 'Fragmentos', 0.3, 0, 1), N('dist', 'Distance', 'Distância', 0.33, 0, 1), N('rot', 'Rotation', 'Giro', 0, 0, 1),
      N('frx', 'FragRotationX', 'Giro X da cópia', 0.5, 0, 1), N('fry', 'FragRotationY', 'Giro Y da cópia', 0.5, 0, 1), N('frz', 'FragRotationZ', 'Giro Z da cópia', 0.5, 0, 1),
      N('fscale', 'FragScale', 'Tamanho da cópia', 0.5, 0, 1), N('cop', 'CompositeOpacity', 'Opacidade da soma', 0.75, 0, 1), B('bg', 'Black BG', 'Fundo preto', 1)],
    glsl: `vec4 fx(vec2 uv){ float n = max(1.0, floor(frags * 40.0 + 0.5)), asp = uRes.x / uRes.y; vec4 acc = vec4(0.0); vec2 p = (uv - 0.5) * vec2(asp, 1.0);
      vec3 a = (vec3(frx, fry, frz) - 0.5) * 6.2831853; float cz = cos(a.z), sz = sin(a.z), kx = cos(a.y), ky = cos(a.x), cr = cos(6.2831853 * rot), sr = sin(6.2831853 * rot);
      if (fscale <= 0.0 || abs(kx) < 0.01 || abs(ky) < 0.01) return bg > 0.5 ? vec4(0.0, 0.0, 0.0, 1.0) : vec4(0.0);
      for (int i = 0; i < 40; i++) { float fi = float(i); if (fi >= n) break;
        float z = hash(vec2(fi, 4.2)) * 2.0 - 1.0, an = 6.2831853 * hash(vec2(fi, 8.9)), rr = sqrt(1.0 - z * z);
        vec2 c = vec2(cos(an), sin(an)) * rr * dist * 1.25; c = vec2(cr * c.x - sr * c.y, sr * c.x + cr * c.y);
        float k = fscale / (1.0 - 0.3 * dist * z);
        vec2 d = p - c; d = vec2(cz * d.x + sz * d.y, -sz * d.x + cz * d.y);
        vec2 q = d / (k * vec2(asp * kx, ky)) + 0.5;
        if (q.x >= 0.0 && q.x <= 1.0 && q.y >= 0.0 && q.y <= 1.0) acc += tex(q) * cop * cop; }
      acc = min(acc, vec4(1.0)); return bg > 0.5 ? vec4(acc.rgb, 1.0) : acc; }` }),
  // casas (Resolution linhas; colunas = linhas × 16/9 arredondado para cima), cada uma com uma forma que vai da Shape 1
  // (onde a imagem é escura) à Shape 2 (onde é clara), pela cor do centro da casa. Mode: cheia, contorno, ou contorno
  // que engrossa com o brilho. Scale encolhe as formas escuras; Margin é a folga em volta. Formas e espessuras
  // tiradas das fotos a olho: perto, não exato.
  def({ id: 'metashape', name: 'Meta Shape', desc: 'A imagem vira uma grade de formas que mudam de uma para outra conforme o brilho.',
    params: [N('res', 'Resolution', 'Resolução', 18, 4, 512), L('shape1', 'Shape 1', 'Forma 1', ['Circle', 'Rectangle', 'Hexagon', 'Cross'], ['Círculo', 'Retângulo', 'Hexágono', 'Cruz'], 1),
      L('shape2', 'Shape 2', 'Forma 2', ['Circle', 'Rectangle', 'Hexagon', 'Cross'], ['Círculo', 'Retângulo', 'Hexágono', 'Cruz'], 3),
      L('colmode', 'Color', 'Cor', ['White', 'Greyscale', 'Sampled', 'Original'], ['Branco', 'Cinza', 'Da casa', 'Original'], 2),
      L('mode', 'Mode', 'Modo', ['Fill', 'Outline', 'Outline Scaled'], ['Cheia', 'Contorno', 'Contorno pelo brilho'], 2),
      B('scale', 'Scale', 'Tamanho pelo brilho'), B('invert', 'Invert', 'Inverter'), N('margin', 'Margin', 'Margem', 0.125, 0, 0.95)],
    glsl: `float msd(vec2 p, float k){ vec2 a = abs(p);
      if (k < 0.5) return length(p) - 1.0;
      if (k < 1.5) return max(a.x, a.y) - 1.0;
      if (k < 2.5) return max(a.y, a.x * 0.8660254 + a.y * 0.5) / 0.8660254 - 1.0;
      vec2 r = abs(vec2(p.x + p.y, p.x - p.y)) * 0.7071068; return min(max(r.x - 0.34, r.y - 1.25), max(r.y - 0.34, r.x - 1.25)); }
    vec4 fx(vec2 uv){ float rows = max(1.0, floor(res)), cols = ceil(rows * uRes.x / uRes.y - 0.01); vec2 n = vec2(cols, rows);
      vec2 q = vec2(uv.x, 1.0 - uv.y) * n, id = floor(q), p = (fract(q) - 0.5) * 2.0, cc = id / n;
      vec4 c = tex(vec2(cc.x, 1.0 - cc.y)); float l = lum(un(c)), tl = invert > 0.5 ? 1.0 - l : l, t = pow(tl, 2.0);
      float s = (1.0 - margin) * (scale > 0.5 ? l : 1.0); if (s <= 0.0) return vec4(0.0, 0.0, 0.0, 1.0);
      vec2 pp = p / s; float d = mix(msd(pp, shape1), msd(pp, shape2), t);
      float px = 2.0 * n.y / uRes.y / s, w = mode < 0.5 ? 9.0 : mode < 1.5 ? 0.14 : (0.125 + 0.9 * tl * tl * tl) * min(1.0, sqrt(rows / 18.0));
      float m = clamp(0.5 - d / px, 0.0, 1.0) * clamp(0.5 + (d + w) / px, 0.0, 1.0);
      vec3 col = colmode < 0.5 ? vec3(1.0) : colmode < 1.5 ? vec3(l) : colmode < 2.5 ? un(c) : un(tex(uv));
      return vec4(col * m, 1.0); }` }),
];
