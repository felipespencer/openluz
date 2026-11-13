// Efeitos refeitos com os controles e a imagem do Resolume 7.28 — lote 4 (geometria). Ver tools/compare/LOTES.md.
// A conta de cada um foi deduzida das fotos do gabarito: a carta tem R = 0,15 + 0,7x e G = 0,15 + 0,7y, então a cor
// de cada ponto da foto diz de onde ele veio. Nenhum código do Resolume entra aqui.
import { N, B, L, C, E, def } from './effects-rk.js';

// "Black BG" do Resolume: o que ficou transparente vira preto (a carta é opaca: deduzido do nome, não das fotos)
const BG = B('blackbg', 'Black BG', 'Fundo preto');
const bg = `vec4 bgk(vec4 c){ return blackbg > 0.5 ? vec4(c.rgb, 1.0) : c; }`;
// amostra com a imagem repetida lado a lado
const rep = `vec4 texR(vec2 p){ return texture(uTex, fract(p)); }`;

export const R4 = [
  def({ id: 'flip', name: 'Flip', desc: 'Vira a imagem de lado ou de cabeça para baixo.',
    params: [B('horiz', 'Horizontal', 'Horizontal', 1), B('vert', 'Vertical', 'Vertical'), BG],
    glsl: `${bg} vec4 fx(vec2 uv){ return bgk(tex(vec2(horiz > 0.5 ? 1.0 - uv.x : uv.x, vert > 0.5 ? 1.0 - uv.y : uv.y))); }` }),
  // eixo em X (reflete o que está à esquerda dele) e em Y (reflete o que está abaixo); In / Out desliza a origem até o eixo;
  // Flip troca o lado que se reflete. Medido com um controle por vez e, na segunda passada, com Flip e In / Out juntos do eixo
  def({ id: 'mirror', name: 'Mirror', desc: 'Espelha a imagem em torno de um eixo vertical e de um horizontal.',
    params: [N('x', 'X', 'Eixo X', 0, 0, 1), N('y', 'Y', 'Eixo Y', 0, 0, 1), N('io', 'In / Out', 'Dentro / fora', 1, 0, 1), B('flipx', 'Flip X', 'Virar X'), B('flipy', 'Flip Y', 'Virar Y'), BG],
    glsl: `${bg} ${rep} vec4 fx(vec2 uv){ vec2 p = vec2(flipx > 0.5 ? x - abs(1.0 - uv.x - x) : abs(uv.x - x) + x * io, flipy > 0.5 ? (1.0 - y) - abs(uv.y - (1.0 - y)) : abs(uv.y - y) + io * (1.0 - y));
      return bgk(texR(p)); }` }),
  // a imagem inteira cabe em cada quarto, espelhada para o centro
  def({ id: 'mirrorquad', name: 'Mirror Quad', desc: 'Quatro cópias da imagem, espelhadas uma na outra.',
    params: [B('flipx', 'Flip X', 'Virar X'), B('flipy', 'Flip Y', 'Virar Y')],
    glsl: `vec4 fx(vec2 uv){ vec2 p = abs(1.0 - 2.0 * uv); if (flipx < 0.5) p.x = 1.0 - p.x; if (flipy > 0.5) p.y = 1.0 - p.y; return tex(p); }` }),
  def({ id: 'slide', name: 'Slide', desc: 'Desliza a imagem, que entra de novo pelo outro lado.',
    params: [N('x', 'X', 'Horizontal', 0, 0, 1), N('y', 'Y', 'Vertical', 0, 0, 1), BG],
    glsl: `${bg} ${rep} vec4 fx(vec2 uv){ return bgk(texR(vec2(uv.x - x, uv.y + y))); }` }),
  // bordas em px da composição (Top e Bottom contados de cima); fora fica transparente; Invert troca dentro e fora
  def({ id: 'crop', name: 'Crop', desc: 'Recorta um retângulo da imagem; o resto fica transparente.',
    params: [N('l', 'Left', 'Esquerda', 0, 0, 32768, 1, 'px'), N('r', 'Right', 'Direita', 1920, 0, 32768, 1, 'px'), N('t', 'Top', 'Cima', 0, 0, 32768, 1, 'px'), N('b', 'Bottom', 'Baixo', 1080, 0, 32768, 1, 'px'), B('invert', 'Invert', 'Inverter'), BG],
    glsl: `${bg} vec4 fx(vec2 uv){ vec2 q = vec2(uv.x, 1.0 - uv.y) * uRes;
      bool dentro = q.x >= l && q.x < r && q.y >= t && q.y < b; if (invert > 0.5) dentro = !dentro;
      return bgk(dentro ? tex(uv) : vec4(0.0)); }` }),
  // cópias = 20 × valor, a partir do centro; Skew inclina (2v − 1) e o giro é de uma volta, tudo em uv (sem corrigir a proporção)
  def({ id: 'tile', name: 'Tile', desc: 'Repete a imagem em ladrilhos, com inclinação e giro.',
    params: [N('tx', 'Tile X', 'Cópias X', 0.1, 0, 1), N('ty', 'Tile Y', 'Cópias Y', 0.1, 0, 1), N('skx', 'Skew X', 'Inclinar X', 0.5, 0, 1), N('sky', 'Skew Y', 'Inclinar Y', 0.5, 0, 1), N('rot', 'Rotation Angle', 'Giro', 0, 0, 1), BG],
    glsl: `${bg} ${rep} vec4 fx(vec2 uv){ vec2 k = uRes / (ceil(uRes / 16.0) * 16.0);   // medido: o giro e a inclinação contam a altura como 1088 (1080 arredondado para 16)
      vec2 p = rot2((uv - 0.5) * k, rot * 6.2831853);
      p = vec2(p.x - (2.0 * skx - 1.0) * p.y, p.y + (2.0 * sky - 1.0) * p.x) / k;
      return bgk(texR(p * 20.0 * vec2(tx, ty) + 0.5)); }` }),
  // plano da imagem no espaço, visto por uma câmera a meia largura de distância (medido: Anchor Z ±500 e ±100);
  // tudo em px da composição, Y para baixo, giro Z positivo no sentido horário. Anchor desloca a imagem antes do
  // giro e da escala (medido só sozinho). Os giros X e Y só têm foto de ±90° (some) e ±180° (vira).
  def({ id: 'transform', name: 'Transform', desc: 'Move, redimensiona e gira a imagem no espaço.',
    params: [N('px', 'Position X', 'Posição X', 0, -32768, 32768, 1, 'px'), N('py', 'Position Y', 'Posição Y', 0, -32768, 32768, 1, 'px'),
      N('sc', 'Scale', 'Escala', 100, 0, 1000, 1, '%'), N('sw', 'Scale W', 'Escala L', 100, 0, 1000, 1, '%'), N('sh', 'Scale H', 'Escala A', 100, 0, 1000, 1, '%'),
      N('rx', 'Rotation X', 'Giro X', 0, -180, 180, 1, '°'), N('ry', 'Rotation Y', 'Giro Y', 0, -180, 180, 1, '°'), N('rz', 'Rotation Z', 'Giro Z', 0, -180, 180, 1, '°'),
      N('ax', 'Anchor X', 'Âncora X', 0, -16384, 16384, 1, 'px'), N('ay', 'Anchor Y', 'Âncora Y', 0, -16384, 16384, 1, 'px'), N('az', 'Anchor Z', 'Âncora Z', 0, -16384, 16384, 1, 'px')],
    glsl: `mat3 rX(float a){ float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
    mat3 rY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
    mat3 rZ(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
    vec4 fx(vec2 uv){ float D = 0.5 * uRes.y * 2.4142136, g = 0.017453293;   // câmera com 45° de abertura vertical (medido com Rotation X e Y em 30°, 45° e 60°)
      vec3 S = vec3(sw, sh, 100.0) * sc * 0.0001; if (S.x < 1e-5 || S.y < 1e-5) return vec4(0.0);
      mat3 R = rZ(rz * g) * rX(rx * g) * rY(ry * g);   // ordem conferida com X e Y em 30° juntos
      vec3 E = vec3(0.0, 0.0, D), s = vec3((uv.x - 0.5) * uRes.x, (0.5 - uv.y) * uRes.y, 0.0);
      vec3 e = (E - vec3(px, py, 0.0)) * R, d = (s - E) * R;      // v * R = R transposta × v
      if (abs(d.z) < 1e-6) return vec4(0.0);
      float t = (S.z * az * D / (0.5 * uRes.x) - e.z) / d.z; if (t <= 0.0) return vec4(0.0);
      vec2 q = (e.xy + t * d.xy) / S.xy - vec2(ax, ay);
      return texIn(vec2(q.x / uRes.x + 0.5, 0.5 - q.y / uRes.y)); }` }),
  // em uv, em volta do centro: n = parte inteira de 12 × Angles fatias espelhadas; raio × Zoom; Rotation gira a
  // saída e Input Rotation gira a origem (uma volta cada)
  def({ id: 'kaleidoscope', name: 'Kaleidoscope', desc: 'Caleidoscópio em volta do centro.',
    params: [N('angles', 'Angles', 'Fatias', 0.3, 0, 1), N('rot', 'Rotation', 'Giro', 0, 0, 1), N('zoom', 'Zoom', 'Zoom', 0.5, 0, 1), N('irot', 'Input Rotation', 'Giro da entrada', 0, 0, 1), BG],
    glsl: `${bg} vec4 fx(vec2 uv){ float n = floor(angles * 12.0 + 1e-4); if (n < 0.5) return bgk(tex(vec2(0.0, 1.0)));
      vec2 k = uRes / (ceil(uRes / 16.0) * 16.0);
      vec2 p = (uv - 0.5) * k; float s = 6.2831853 / n, a = atan(p.y, p.x) - rot * 6.2831853;
      a = abs(mod(a + 0.5 * s, s) - 0.5 * s) + irot * 6.2831853;
      return bgk(tex(0.5 + length(p) * zoom * vec2(cos(a), sin(a)) / k)); }` }),
  // a largura da imagem dá a volta (emenda em cima, sentido anti-horário) e a altura vai do centro para fora, em px;
  // medido: voltas = parte inteira de Parts; anéis até a meia largura = (parte inteira de Rings + 1) / 2
  def({ id: 'polarkaleido', name: 'PolarKaleido', desc: 'Enrola a imagem em anéis e fatias em volta do centro.',
    params: [N('rings', 'Rings', 'Anéis', 1, 1, 16), N('parts', 'Parts', 'Fatias', 1, 1, 16), N('angle', 'Angle', 'Ângulo', 0, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec2 p = (uv - 0.5) * uRes;
      float sx = fract((atan(p.y, p.x) / 6.2831853 - 0.25 - angle) * floor(parts + 1e-4));
      float sy = fract(length(p) / uRes.x * (floor(rings + 1e-4) + 1.0));
      return tex(vec2(sx, 1.0 - sy)); }` }),
  // em uv, em volta do centro: o ângulo é multiplicado por n = 2 + parte inteira de 15 × Divisions e o raio vira raio²
  def({ id: 'bendoscope', name: 'Bendoscope', desc: 'Caleidoscópio que dobra a imagem em volta do centro.',
    params: [N('div', 'Divisions', 'Divisões', 0.1, 0, 1), BG],
    glsl: `${bg} vec4 fx(vec2 uv){ vec2 p = uv - 0.5; float a = atan(p.y, p.x) * (2.0 + floor(15.0 * div + 1e-4));
      return bgk(tex(0.5 + dot(p, p) * vec2(cos(a), sin(a)))); }` }),
  // em uv, a partir do centro: a distância é multiplicada por (1 − v) + v × distância × √2 (os cantos não saem do lugar)
  def({ id: 'fisheye', name: 'Fish Eye', desc: 'Lente olho de peixe: aumenta o meio da imagem.',
    params: [N('amount', 'FishEye', 'Força', 0.5, 0, 1), BG],
    glsl: `${bg} vec4 fx(vec2 uv){ vec2 p = uv - 0.5; return bgk(tex(0.5 + p * (1.0 - amount + amount * length(p) * 1.4142136))); }` }),
  // em uv: distância ao centro (em meias-telas) elevada a 1 − Suck; em 1 só sobra a borda, esticada em raios
  def({ id: 'suckr', name: 'Suckr', desc: 'Suga a imagem para o centro.',
    params: [N('suck', 'Suck', 'Força', 0.5, 0, 1), BG],
    glsl: `${bg} vec4 fx(vec2 uv){ vec2 p = uv - 0.5; float r = max(2.0 * length(p), 1e-6); return bgk(tex(0.5 + p * pow(r, -suck))); }` }),
  // em uv: gira cada ponto em volta do centro por 10 × (Twirl − 0,5) × t² × (3 − t) radianos, com t indo de 1 no
  // centro a 0 na distância 2 × Radius (medido em 12 distâncias, três raios)
  def({ id: 'twisted', name: 'Twisted', desc: 'Torce a imagem em volta do centro.',
    params: [N('twirl', 'Twirl', 'Giro', 0.6, 0, 1), N('radius', 'Radius', 'Raio', 0.25, 0, 1), BG],
    glsl: `${bg} ${rep} vec4 fx(vec2 uv){ vec2 p = uv - 0.5; float t = radius > 1e-5 ? max(0.0, 1.0 - length(p) / (2.0 * radius)) : 0.0;
      return bgk(texR(0.5 + rot2(p, 10.0 * (twirl - 0.5) * t * t * (3.0 - t)))); }` }),
  // um retângulo de centro (X, Y) e meia largura Width, meia altura Height fica como está; fora dele a borda se estica
  def({ id: 'blow', name: 'Blow', desc: 'Estica a borda de um retângulo da imagem até o fim da tela.',
    params: [N('x', 'X', 'Centro X', 0.5, 0, 1), N('y', 'Y', 'Centro Y', 0.5, 0, 1), N('w', 'Width', 'Largura', 0.5, 0, 1), N('h', 'Height', 'Altura', 0.5, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec2 c = vec2(x, 1.0 - y), d = vec2(w, h); return tex(clamp(uv, c - d, c + d)); }` }),
  // cada ponto busca a cor a uma distância igual ao próprio brilho × (1 − 2 × fator): X para a direita, Y para baixo.
  // No Clamp, o que passa da borda de baixo sai com meia transparência (medido). Segunda passada (fator 0,75): Threshold zera
  // o deslocamento abaixo do limiar, Invert usa 1 − brilho, Transparent apaga o ponto cuja origem cai fora (sem deslocar o resto).
  // Smooth usa o brilho médio de 5 × 5 pontos a cada 2 px (aproximado: 3,4 de diferença).
  def({ id: 'displace', name: 'Displace', desc: 'Desloca a imagem pelo próprio brilho.',
    params: [N('xf', 'X factor', 'Fator X', 0.5, 0, 1), N('yf', 'Y factor', 'Fator Y', 0.5, 0, 1), B('smooth_', 'Smooth', 'Suavizar'), N('thresh', 'Threshold', 'Limiar', 0, 0, 1), B('invert', 'Invert', 'Inverter'),
      L('mode', 'Mode', 'Borda', ['Clamp', 'Wrap', 'Transparent'], ['Esticar', 'Repetir', 'Transparente']), BG],
    glsl: `${bg} vec4 fx(vec2 uv){ float m = dot(un(tex(uv)), vec3(0.3, 0.59, 0.11));   // pesos medidos (0,299/0,587/0,114 dá diferença)
      if (smooth_ > 0.5) { m = 0.0; for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) m += dot(un(tex(uv + vec2(float(i), float(j)) * 2.0 / uRes)), vec3(0.3, 0.59, 0.11)); m /= 25.0; }
      if (m < thresh) m = 0.0;
      vec2 k = vec2(1.0 - 2.0 * xf, 2.0 * yf - 1.0); if (invert > 0.5) m = 1.0 - m;
      vec2 p = uv + m * k;
      if (mode > 1.5) { vec2 q = step(vec2(0.0), p) * step(p, vec2(1.0)); return bgk(tex(uv) * q.x * q.y); }
      if (mode > 0.5) return bgk(texture(uTex, 1.0 - abs(1.0 - mod(p, 2.0))));   // Wrap espelha na borda (medido)
      return bgk(tex(p) * clamp(0.5 + p.y * uRes.y, 0.5, 1.0)); }` }),
  // medido: a imagem se comporta como uma folha ondulada em profundidade vista em perspectiva a partir do centro:
  // ponto da tela = centro + (ponto da imagem − centro) / (1 + m), m = −0,25 × Both × (AmpH × sen(16π × FreqH × x + fase)
  // + AmpV × sen(16π × FreqV × y + fase)), com a onda calculada só nos nós de uma malha de 32 × 32 e reta entre eles
  // (é o que dá as quinas das fotos). O shader procura, ao longo do raio, a dobra mais próxima da câmera.
  def({ id: 'ripples', name: 'Ripples', desc: 'Ondula a imagem em profundidade, como um pano.',
    params: [N('fh', 'Frequency H', 'Frequência H', 0.2, 0, 1), N('ah', 'Amplitude H', 'Amplitude H', 0.5, 0, 1), N('fv', 'Frequency V', 'Frequência V', 0.2, 0, 1), N('av', 'Amplitude V', 'Amplitude V', 0.5, 0, 1),
      N('both', 'Amplitude Both', 'Amplitude geral', 1, 0, 1), N('phase', 'Phase', 'Fase', 0, 0, 1), BG],
    glsl: `${bg} float rw(float x, float w, float f, float n){ float g = x * n, i = floor(g); return mix(sin(w * i / n + f), sin(w * (i + 1.0) / n + f), g - i); }
    float rm(vec2 s){ float f = phase * 6.2831853; return -RIPA * both * (ah * rw(s.x, RIPW * fh, f, RIPNX) + av * rw(s.y, RIPW * fv, f, RIPNY)); }
    vec4 fx(vec2 uv){ vec2 p = uv - 0.5; float A = RIPA * both * (ah + av) + 1e-4;
      float t0 = 1.0 - A, g0 = t0 - 1.0 - rm(0.5 + p * t0), lo = -1.0, hi = -1.0;
      for (int i = 1; i <= 96; i++) { float t1 = 1.0 - A + 2.0 * A * float(i) / 96.0; vec2 s = 0.5 + p * t1; float g1 = t1 - 1.0 - rm(s);
        if (g0 <= 0.0 && g1 > 0.0) { lo = t0; hi = t1; break; }
        t0 = t1; g0 = g1; }
      if (hi < 0.0) return bgk(vec4(0.0));
      for (int i = 0; i < 10; i++) { float md = 0.5 * (lo + hi); if (md - 1.0 - rm(0.5 + p * md) <= 0.0) lo = md; else hi = md; }
      return bgk(tex(0.5 + p * 0.5 * (lo + hi))); }`.replace(/RIPA/g, '0.25').replace(/RIPW/g, '50.265482').replace(/RIPNX/g, '32.0').replace(/RIPNY/g, '32.0') }),
  // medido em quadros soltos (o efeito mexe sozinho): cada ponto busca a cor a (g − 0,5) × Height / 2 na direção do
  // ângulo, em uv; g = sen(f) na onda senoidal (por isso ela fica deslocada para um lado) e de 0 a 1 nas outras formas;
  // f = 45 × (1 − Width) × posição atravessada (as outras formas usam f sem o 2π: ficam 6,28 vezes mais apertadas).
  // Sem Black BG o que passa da borda esquerda/de baixo volta espelhado e o resto estica; com ele fica transparente.
  // A velocidade não dá para medir em foto (escolhida a olho) e Pin edges? não mostrou diferença: sem efeito ainda.
  def({ id: 'wavewarp', name: 'Wave Warp', desc: 'Ondula a imagem numa direção, em movimento.',
    params: [N('mode', 'Mode', 'Forma', 0, 0, 1), N('height', 'Height', 'Altura', 0.2, 0, 1), N('width', 'Width', 'Largura', 0.2, 0, 1), N('angle', 'Angle', 'Ângulo', 1, 0, 1), N('speed', 'Speed', 'Velocidade', 0.5, 0, 1), B('pin', 'Pin edges?', 'Prender bordas', 1), BG],
    glsl: `vec4 fx(vec2 uv){ float a = angle * 6.2831853; vec2 d = vec2(cos(a), sin(a));
      // a onda conta a posição a partir de cima e começa descendo: −sen (medido pelas bordas pretas com Pin edges desligado)
      float f = 45.0 * (1.0 - width) * dot(vec2(uv.x, 1.0 - uv.y), vec2(-1.0 * d.y, d.x)) + uTime * speed * 12.0, k = floor(mode * 4.0 + 0.5), q = fract(f);
      float g = k < 0.5 ? -sin(f) : k < 1.5 ? step(0.5, q) : k < 2.5 ? q : abs(2.0 * q - 1.0);
      vec2 p = uv + d * (g - 0.5) * height * 0.5;
      vec4 c = pin < 0.5 ? texIn(p) : tex(abs(p));   // sem prender as bordas, o que vem de fora do quadro fica transparente
      return blackbg > 0.5 ? vec4(c.rgb, 1.0) : c; }` }),
  // medido só em parte: cada linha inteira desliza para a direita (e volta pelo outro lado) 0,1 × Distort × o brilho
  // da própria linha num ponto fixo, a 84% da largura (achado por comparação linha a linha; erro médio de 12 px de 960
  // nas linhas da foto).
  def({ id: 'distortion', name: 'Distortion', desc: 'Desliza cada linha da imagem conforme o brilho dela.',
    params: [N('distort', 'Distort', 'Força', 0, 0, 1), N('radius', 'Radius', 'Raio', 0.55, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec3 d = un(tex(vec2((1.0 - uv.y) * uRes.y / (ceil(uRes.y / 16.0) * 16.0), uv.y))); float m = (d.r + d.g + d.b) / 3.0;
      return texture(uTex, vec2(fract(uv.x - 2.0 * distort * (radius - 0.5) * m), uv.y)); }` }),   // o brilho de cada linha é lido na diagonal da imagem (canto de cima à esquerda ao de baixo à direita), média de R, G e B; a diagonal é contada como se a imagem tivesse 1088 linhas (1080 arredondado para múltiplo de 16; só medido em 1080); Radius é o tamanho e o lado: 2 × (Radius − 0,5) (sondas/dist_mapa.py)
];
