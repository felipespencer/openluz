// Efeitos refeitos com os controles e a imagem do Resolume 7.28 — lote 6. Ver tools/compare/LOTES.md.
// As contas saíram das fotos do gabarito: a carta de prova diz, pela cor, de que ponto da entrada veio cada pixel,
// e com isso se acha o centro, o tamanho e o giro de cada cópia. Nenhum código do Resolume entra aqui.
import { N, B, L, C, E, def } from './effects-rk.js';

const ATRASO = ['New To Old', 'Old To New', 'Bounce', 'Random'], ATRASO_PT = ['Do novo ao velho', 'Do velho ao novo', 'Vai e volta', 'Sorteado'];

export const R6 = [
  // Cópias em caudas que saem do centro. Cópia i de n: posição na cauda fp = (i/(n−1))^p, tamanho e giro por fs = (i/n)^p,
  // p = 8^(Distribution/100 − 0,5). Centro da cópia = Center × L/2 + Tail Length × L × fp ao longo da cauda e
  // Distortion × L × fp(1−fp) de lado (L = largura). Tamanho = Start × (1 − fs(1 − End)); giro = Start − End × fs.
  // Cauda k de t: direção k × 360°/t; Tail Rotation gira as cópias da cauda k em TR × 3,6° × (1 + k/t).
  // Por cima fica a cópia do centro; entre caudas, a de número maior. (Medido: centros com erro de ~1 px.)
  def({ id: 'linearcloner', name: 'Linear Cloner', desc: 'Cópias em fila saindo do centro, diminuindo e girando ao longo de cada cauda.',
    params: [N('clones', 'Clones', 'Cópias', 25, 1, 50, 1), N('tails', 'Tails', 'Caudas', 2, 1, 8, 1), N('center', 'Center', 'Centro', 0, -1, 1), N('tlen', 'Tail Length', 'Comprimento da cauda', 0.5, -1, 1),
      N('sscale', 'Start Scale', 'Escala inicial', 50, 0, 100, 0.1, ' %'), N('srot', 'Start Rotation', 'Giro inicial', 0, -180, 180, 0.1, '°'), N('escale', 'End Scale', 'Escala final', 0, 0, 100, 0.1, ' %'), N('erot', 'End Rotation', 'Giro final', 90, 0, 360, 0.1, '°'),
      N('distrib', 'Distribution', 'Distribuição', 50, 0, 100, 0.1, ' %'), N('distort', 'Distortion', 'Curvatura', 45, -100, 100, 0.1, ' %'), B('reverse', 'Reverse', 'Inverter a ordem'),
      N('trot', 'Tail Rotation', 'Giro por cauda', 0, 0, 100, 0.1, ' %'), N('mrot', 'Master Rotation', 'Giro geral', 0, -180, 180, 0.1, '°'),
      B('den', 'Delay Enabled', 'Atraso ligado'), N('damt', 'Delay Amount', 'Quanto de atraso', 0.5, 0, 1),
      L('dord', 'Delay Order', 'Ordem do atraso', ['New To Old', 'Old To New', 'Bounce', 'Bounce Tail', 'Random'], ['Do novo ao velho', 'Do velho ao novo', 'Vai e volta', 'Vai e volta por cauda', 'Sorteado']),
      L('dfill', 'Delay Fill', 'Preenchimento do atraso', ['Repeat', 'Transparent'], ['Repetir', 'Transparente'])],
    glsl: `vec4 fx(vec2 uv){
      vec2 P = vec2(uv.x, 1.0 - uv.y) * uRes, Cn = uRes * 0.5; float W = uRes.x;
      int n = int(floor(clones + 0.001)), t = int(floor(tails + 0.001));
      float p = pow(8.0, distrib / 100.0 - 0.5), mr = radians(mrot);
      vec4 acc = vec4(0.0);
      for (int a = 0; a < 50; a++) { if (a >= n) break;
        int i = reverse > 0.5 ? n - 1 - a : a;
        float fs = i > 0 ? pow(float(i) / float(n), p) : 0.0, fp = i > 0 ? pow(float(i) / float(n - 1), p) : 0.0;
        float s = sscale / 100.0 * mix(1.0, escale / 100.0, fs);
        if (s <= 0.0) continue;
        float th0 = radians(srot - erot * fs) + mr;
        vec2 loc = vec2(center * 0.5 * W + tlen * W * fp, distort / 100.0 * W * fp * (1.0 - fp));
        for (int kk = 0; kk < 8; kk++) { if (kk >= t) break;
          int k = t - 1 - kk; float fk = float(k) / float(t);
          vec2 c = Cn + rot2(loc, 6.2831853 * fk + mr);
          float th = th0 + radians(trot * 3.6) * (1.0 + fk);
          vec2 q = rot2(P - c, -th) / (s * uRes) + 0.5;
          if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) continue;
          vec4 s4 = texture(uTex, vec2(q.x, 1.0 - q.y));
          acc += s4 * (1.0 - acc.a);
          if (acc.a > 0.999) return acc;
        }
      }
      return acc; }` }),
  // Cópias em roda. Cópia i de n: ângulo (a partir do alto, sentido horário) = Fan × 360° × (i + Fan Offset)/n;
  // raio = Start Radius × L/2 × (1 − (i/n)(1 − End Radius)); tamanho = Start × (1 − (i/n)(1 − End));
  // giro = Start + End × Fan × (i + Fan Offset)/n. Por cima fica a de número maior, contado a partir de Fan Offset × n (a ordem dá a volta). (Medido: centros com erro de ~1 px.)
  def({ id: 'radialcloner', name: 'Radial Cloner', desc: 'Cópias em roda em volta do centro, com raio, tamanho e giro mudando de uma para a outra.',
    params: [N('clones', 'Clones', 'Cópias', 8, 1, 50, 1), N('srad', 'Start Radius', 'Raio inicial', 0.5, 0, 1), N('sscale', 'Start Scale', 'Escala inicial', 25, 0, 100, 0.1, ' %'), N('srot', 'Start Rotation', 'Giro inicial', 0, -180, 180, 0.1, '°'),
      N('erad', 'End Radius', 'Raio final', 1, 0, 1), N('escale', 'End Scale', 'Escala final', 100, 0, 100, 0.1, ' %'), N('erot', 'End Rotation', 'Giro final', 360, 0, 360, 0.1, '°'),
      N('fan', 'Fan', 'Abertura do leque', 100, 0, 100, 0.1, ' %'), N('fanoff', 'Fan Offset', 'Deslocamento do leque', 0, 0, 100, 0.1, ' %'), N('mrot', 'Master Rotation', 'Giro geral', 0, -180, 180, 0.1, '°'),
      B('den', 'Delay Enabled', 'Atraso ligado'), N('damt', 'Delay Amount', 'Quanto de atraso', 0.5, 0, 1), L('dord', 'Delay Order', 'Ordem do atraso', ATRASO, ATRASO_PT), L('dfill', 'Delay Fill', 'Preenchimento do atraso', ['Repeat', 'Transparent'], ['Repetir', 'Transparente'])],
    glsl: `vec4 fx(vec2 uv){
      vec2 P = vec2(uv.x, 1.0 - uv.y) * uRes, Cn = uRes * 0.5; float W = uRes.x;
      int n = int(floor(clones + 0.001)); float mr = radians(mrot);
      vec4 acc = vec4(0.0);
      for (int a = 0; a < 50; a++) { if (a >= n) break;
        int i = ((n - 1 - a - int(floor(fanoff / 100.0 * float(n) + 0.001))) % n + n) % n; float f = float(i) / float(n), g = fan / 100.0 * (float(i) + fanoff / 100.0) / float(n);
        float s = sscale / 100.0 * mix(1.0, escale / 100.0, f);
        if (s <= 0.0) continue;
        float ang = 6.2831853 * g + mr, rad = srad * 0.5 * W * mix(1.0, erad, f);
        vec2 c = Cn + rad * vec2(sin(ang), -cos(ang));
        float th = radians(srot + erot * g) + mr;
        vec2 q = rot2(P - c, -th) / (s * uRes) + 0.5;
        if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) continue;
        vec4 s4 = texture(uTex, vec2(q.x, 1.0 - q.y));
        acc += s4 * (1.0 - acc.a);
        if (acc.a > 0.999) return acc;
      }
      return acc; }` }),
  // Parede de n × n telas vista em perspectiva. n = 2^(4 × Screens); a parede enche a tela com Zoom 1 e cresce 1/Zoom².
  // Giros de ±45° feitos no quadrado −1…1 (por isso a imagem inclina junto com a proporção da tela); perspectiva
  // z/3 antes do zoom (medido: 0,03 com Zoom 0,3). Pan anda meia parede para cada lado. GapSize² é a parte de cada
  // tela que vira vão. BrightnessVary escurece cada tela por um sorteio (os 4 valores medidos valem para 2 × 2).
  // SubscreenMode: até 0,25 a imagem inteira em cada tela; 0,5 o miolo ampliado 2×; daí em diante um recorte sorteado.
  def({ id: 'videowall', name: 'VideoWall', desc: 'Parede de telas repetindo a imagem, com zoom, giro em 3D, vão entre as telas e brilho variado.',
    params: [N('screens', 'Screens', 'Telas', 0.3, 0, 1), N('zoom', 'Zoom', 'Zoom', 0.3, 0, 1), N('rotx', 'RotateX', 'Giro X', 0.5, 0, 1), N('roty', 'RotateY', 'Giro Y', 0.5, 0, 1), N('rotz', 'RotateZ', 'Giro Z', 0.5, 0, 1),
      N('panx', 'PanX', 'Deslocamento X', 0.5, 0, 1), N('pany', 'PanY', 'Deslocamento Y', 0.5, 0, 1), N('subsize', 'SubscreenSize', 'Tamanho da tela maior', 0, 0, 1), N('submode', 'SubscreenMode', 'Modo das telas', 0, 0, 1),
      N('gap', 'GapSize', 'Vão', 0, 0, 1), N('vary', 'BrightnessVary', 'Variação de brilho', 0, 0, 1), B('blackbg', 'Black BG', 'Fundo preto')],
    glsl: `vec4 fx(vec2 uv){
      vec4 bg = vec4(0.0, 0.0, 0.0, blackbg > 0.5 ? 1.0 : 0.0);
      if (zoom <= 0.0) return bg;
      float S = 1.0 / (zoom * zoom), t = 1.0 / (3.0 * S);
      float ax = radians((rotx - 0.5) * 90.0), ay = radians((0.5 - roty) * 90.0), az = radians((0.5 - rotz) * 90.0);
      float cx = cos(ax), sx = sin(ax), cy = cos(ay), sy = sin(ay), cz = cos(az), sz = sin(az);
      mat3 RX = mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx), RY = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy), RZ = mat3(cz, sz, 0.0, -sz, cz, 0.0, 0.0, 0.0, 1.0);
      mat3 R = RZ * RY * RX;
      vec3 O = vec3(uv.x * 2.0 - 1.0, 1.0 - 2.0 * uv.y, 0.0), d = vec3(O.xy * t, 1.0), Nn = R[2];
      float dn = dot(d, Nn); if (abs(dn) < 1e-6) return bg;
      float z = -dot(O, Nn) / dn; if (1.0 + z * t <= 0.0) return bg;
      vec3 pw = (O + z * d) * R;
      vec2 X = pw.xy / S - vec2((panx - 0.5) * 2.0, (0.5 - pany) * 2.0);
      if (abs(X.x) > 1.0 || abs(X.y) > 1.0) return bg;
      float n = subsize > 0.0 ? 1.0 : floor(pow(2.0, 4.0 * screens) + 0.001);
      vec2 U = (X + 1.0) * 0.5 * n, cell = min(floor(U), n - 1.0), f = U - cell;
      float g = 1.0 - gap * gap; if (g <= 0.0) return bg;
      f = (f - 0.5) / g + 0.5;
      if (f.x < 0.0 || f.y < 0.0 || f.x > 1.0 || f.y > 1.0) return bg;
      float m = floor(submode * 3.0 + 0.001);
      if (m > 1.5) { float zf = 4.0 + 3.0 * hash(cell + 7.3); vec2 c = vec2(hash(cell + 1.7), hash(cell + 4.1)); f = mix(vec2(0.5 / zf), vec2(1.0 - 0.5 / zf), c) + (f - 0.5) / zf; }
      else if (m > 0.5) f = (f - 0.5) * 0.5 + 0.5;
      float r = n == 2.0 ? (cell.x < 0.5 ? (cell.y < 0.5 ? 0.885 : 0.9) : (cell.y < 0.5 ? 0.08 : 0.015)) : hash(cell + 2.9);
      vec4 c4 = texture(uTex, vec2(f.x, 1.0 - f.y));
      c4.rgb *= 1.0 - vary * r;
      return c4 + bg * (1.0 - c4.a); }` }),
  // Um cubo oco (aresta 2) com n × n ladrilhos por face, n = 2 + 14 × Resolution; cada ladrilho mostra a imagem
  // inteira e está presente por sorteio (Amount: de ~10 % a 100 %). Câmera com 45° de abertura a 9 − 8 × Zoom do centro;
  // giro X·Y·Z de (valor − 0,5) × 360°. Medido com o cubo cheio (contorno igual em 99,9 %); quais ladrilhos faltam
  // é sorteio, não bate por pixel. Num Cubes soma cubos girados ao acaso (a quantidade é palpite).
  def({ id: 'cubetiles', name: 'Cube Tiles', desc: 'Um cubo feito de ladrilhos com a imagem, alguns faltando, visto em perspectiva.',
    params: [N('res', 'Resolution', 'Resolução', 0.3, 0, 1), N('zoom', 'Zoom', 'Zoom', 0.75, 0, 1), N('amount', 'Amount', 'Quantidade', 0.5, 0, 1), E('rand', 'Randomize', 'Sortear de novo'),
      N('rotx', 'Rotate X', 'Giro X', 0.6, 0, 1), N('roty', 'Rotate Y', 'Giro Y', 0.6, 0, 1), N('rotz', 'Rotate Z', 'Giro Z', 0.5, 0, 1), N('ncubes', 'Num Cubes', 'Mais cubos', 0, 0, 1), B('blackbg', 'Black BG', 'Fundo preto')],
    glsl: `mat3 ctRX(float a){ float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
    mat3 ctRY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
    mat3 ctRZ(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
    bool ctTem(float eixo, float plano, vec2 ij, float seed, float p){ return hash(vec2(eixo * 17.0 + plano + seed * 53.0, ij.x + ij.y * 31.0 + seed * 7.0)) < p; }
    vec4 ctCor(int a, vec3 g){ vec3 f = fract(g); vec2 t = a == 0 ? vec2(f.z, f.y) : a == 1 ? vec2(f.x, 1.0 - f.z) : vec2(f.x, f.y); return texture(uTex, t); }
    // o cubo é oco: só as 6 faces têm ladrilhos, vistos pelos dois lados. Devolve a cor do primeiro presente e a distância em th
    vec4 ctCubo(vec3 o, vec3 d, float n, float p, float seed, out float th){
      th = 1e9;
      vec3 inv = 1.0 / d, t1 = (-1.0 - o) * inv, t2 = (1.0 - o) * inv, tn = min(t1, t2), tf = max(t1, t2);
      float tN = max(max(tn.x, tn.y), tn.z), tF = min(min(tf.x, tf.y), tf.z);
      if (tN >= tF || tF <= 0.0) return vec4(0.0);
      for (int k = 0; k < 2; k++) {
        float t = k == 0 ? tN : tF; if (t <= 0.0) continue;
        vec3 tt = k == 0 ? tn : tf;
        int a = k == 0 ? (tn.x >= tN ? 0 : tn.y >= tN ? 1 : 2) : (tf.x <= tF ? 0 : tf.y <= tF ? 1 : 2);
        vec3 pt = o + d * t, g = clamp((pt + 1.0) * 0.5 * n, 0.0, n - 0.0001), cell = floor(g);
        float lado = (a == 0 ? pt.x : a == 1 ? pt.y : pt.z) > 0.0 ? 1.0 : 0.0;
        vec2 ij = a == 0 ? cell.yz : a == 1 ? cell.xz : cell.xy;
        if (ctTem(float(a), lado, ij, seed, p)) { th = t; return ctCor(a, g); }
      }
      return vec4(0.0); }
    vec4 fx(vec2 uv){
      vec4 bg = vec4(0.0, 0.0, 0.0, blackbg > 0.5 ? 1.0 : 0.0);
      float n = 2.0 + floor(14.0 * res + 0.001), p = 0.1 + 0.9 * amount, f = 2.41421356;
      mat3 R = ctRX((rotx - 0.5) * 6.2831853) * ctRY((roty - 0.5) * 6.2831853) * ctRZ((rotz - 0.5) * 6.2831853);
      vec3 eye = vec3(0.0, 0.0, 9.0 - 8.0 * zoom), dir = vec3((uv.x - 0.5) * 2.0 * ar() / f, (uv.y - 0.5) * 2.0 / f, -1.0);
      vec3 o = eye * R, d = dir * R; d += vec3(equal(d, vec3(0.0))) * 1e-6;
      float best = 1e9, th; vec4 c = ctCubo(o, d, n, p, 0.0, th), r = vec4(0.0);
      if (th < best) { best = th; r = c; }
      int extra = int(ceil(ncubes * 8.0 - 0.001));
      for (int k = 1; k <= 8; k++) { if (k > extra) break; float fk = float(k);
        mat3 Rk = ctRX(hash(vec2(fk, 1.3)) * 6.2831853) * ctRY(hash(vec2(fk, 2.7)) * 6.2831853) * ctRZ(hash(vec2(fk, 4.1)) * 6.2831853);
        vec3 ok = o * Rk, dk = d * Rk; dk += vec3(equal(dk, vec3(0.0))) * 1e-6;
        c = ctCubo(ok, dk, n, p, fk, th); if (th < best) { best = th; r = c; } }
      return r + bg * (1.0 - r.a); }` }),
  // n = 50 × Iterations cópias somadas (cada soma arredondada em 8 bits, alfa = opacidade²); BlendMode ≥ 0,5 põe uma
  // sobre a outra. A cópia j (de 0) parte da anterior e anda (valor − 0,5)/15 da tela (os D… somam j vezes isso), gira
  // (valor − 0,5) × 24° e escala 1 + j(valor − 0,5)/15 (DScale: j(j−1)/2). Tudo no quadrado −1…1, sem perspectiva.
  // Medido só nos passos de deslocamento, escala, giro X e opacidade; o resto segue por analogia (a soma estoura
  // em branco e esconde quase tudo). TranslateZ não mudou nada no gabarito.
  def({ id: 'iterate', name: 'Iterate', desc: 'Cópias somadas em cadeia, cada uma deslocada, girada e escalada a partir da anterior.',
    params: [N('strength', 'TransformStrength', 'Força da transformação', 1, 0, 1), N('iter', 'Iterations', 'Repetições', 0.3, 0, 1), N('sop', 'StartOpacity', 'Opacidade inicial', 1, 0, 1), N('opc', 'OpacityChange', 'Mudança de opacidade', 0.5, 0, 1),
      N('tx', 'TranslateX', 'Deslocamento X', 0.5, 0, 1), N('ty', 'TranslateY', 'Deslocamento Y', 0.5, 0, 1), N('tz', 'TranslateZ', 'Deslocamento Z', 0.5, 0, 1), N('rx', 'RotateX', 'Giro X', 0.5, 0, 1), N('ry', 'RotateY', 'Giro Y', 0.5, 0, 1), N('rz', 'RotateZ', 'Giro Z', 0.5, 0, 1), N('sc', 'Scale', 'Escala', 0.5, 0, 1),
      N('dopc', 'DOpacityChange', 'Aceleração da opacidade', 0.5, 0, 1), N('dtx', 'DTranslateX', 'Aceleração: deslocamento x', 0.5, 0, 1), N('dty', 'DTranslateY', 'Aceleração: deslocamento y', 0.5, 0, 1), N('dtz', 'DTranslateZ', 'Aceleração: deslocamento z', 0.5, 0, 1), N('drx', 'DRotateX', 'Aceleração: giro x', 0.5, 0, 1), N('dry', 'DRotateY', 'Aceleração: giro y', 0.5, 0, 1), N('drz', 'DRotateZ', 'Aceleração: giro z', 0.5, 0, 1), N('dsc', 'DScale', 'Aceleração: escala', 0.5, 0, 1),
      N('blend', 'BlendMode', 'Modo de mistura', 0, 0, 1), N('grx', 'GRotateX', 'Giro geral X', 0.5, 0, 1), N('gry', 'GRotateY', 'Giro geral Y', 0.5, 0, 1), N('grz', 'GRotateZ', 'Giro geral Z', 0.5, 0, 1), B('blackbg', 'Black BG', 'Fundo preto')],
    glsl: `vec4 fx(vec2 uv){
      vec4 bg = vec4(0.0, 0.0, 0.0, blackbg > 0.5 ? 1.0 : 0.0);
      int n = int(floor(iter * 50.0 + 0.5));
      vec2 p = uv * 2.0 - 1.0;
      float gz = (grz - 0.5) * 6.2831853, cgx = cos((grx - 0.5) * 6.2831853), cgy = cos((gry - 0.5) * 6.2831853);
      if (abs(cgx) < 1e-4 || abs(cgy) < 1e-4) return bg;
      p = rot2(p, -gz); p /= vec2(cgy, cgx);
      vec4 acc = vec4(0.0); float st = strength, sax = 0.0, say = 0.0;
      for (int j = 0; j < 50; j++) { if (j >= n) break; float fj = float(j), fk = fj + 1.0, tri = fj * (fj - 1.0) * 0.5;
        vec2 t = (vec2(tx, ty) - 0.5 + (vec2(dtx, dty) - 0.5) * fj) * st / 3.75;
        float az = radians(((rz - 0.5) + (drz - 0.5) * fj) * 24.0) * st;
        sax += radians(((rx - 0.5) + (drx - 0.5) * fj) * 24.0) * st; say += radians(((ry - 0.5) + (dry - 0.5) * fj) * 24.0) * st;
        float sk = 1.0 + ((sc - 0.5) * fj + (dsc - 0.5) * tri) * st / 15.0;
        if (abs(sk) < 1e-4) break;
        p = rot2(p - t, -az) / sk;
        vec2 sq = vec2(cos(say), cos(sax));
        float op = clamp(sop + (opc - 0.5) * fk / 30.0 + (dopc - 0.5) * fk * (fk + 1.0) / 60.0, 0.0, 1.0);
        if (abs(sq.x) < 1e-4 || abs(sq.y) < 1e-4 || op <= 0.0) continue;
        vec2 q = p / sq;
        if (abs(q.x) > 1.0 || abs(q.y) > 1.0) continue;
        vec4 c = texture(uTex, q * 0.5 + 0.5);
        if (blend < 0.375) acc = min(acc + floor(vec4(c.rgb * op, c.a * op * op) * 255.0 + 0.5) / 255.0, 1.0);
        else { vec4 s4 = c * op; acc = s4 + acc * (1.0 - s4.a); }
      }
      acc.rgb = min(acc.rgb, vec3(acc.a));
      return acc + bg * (1.0 - acc.a); }` }),
  // Túnel: a largura da imagem dá a volta (u = 1 − ângulo/360°, horário), a altura vai para o fundo
  // (fundura = 1 − 0,0914/(ρ + 0,0907) − Position, ρ = raio/meia altura; cada volta mostra de 0,055 a 0,996 da altura;
  // lei ajustada às fotos, erro ~0,003).
  // Rotation soma (0,5 − valor) a u; Kaleidoscope repete o ângulo 2^(4 × valor) vezes; Twist torce u com a fundura.
  // TurnH/TurnV puxam o centro (valor − 0,5) × min(4 × fundura, 1,2). Speed 0,5 é parado; a escala da velocidade
  // e o Wobble são palpite (o gabarito não dá). As fotos tiradas depois dos casos de Speed ficaram com a fase andada (+0,092).
  def({ id: 'tunnel', name: 'Tunnel', desc: 'Túnel sem fim feito da imagem, com torção, caleidoscópio e curvas.',
    params: [N('pos', 'Position', 'Posição', 0, 0, 1), N('speed', 'Speed', 'Velocidade', 0.5, 0, 1), N('twist', 'Twist', 'Torção', 0.5, 0, 1), N('kal', 'Kaleidoscope', 'Caleidoscópio', 0, 0, 1), N('rot', 'Rotation', 'Giro', 0.5, 0, 1),
      N('turnh', 'TurnH', 'Curva horizontal', 0.5, 0, 1), N('turnv', 'TurnV', 'Curva vertical', 0.5, 0, 1), N('wobh', 'WobbleH', 'Balanço horizontal', 0, 0, 1), N('wobv', 'WobbleV', 'Balanço vertical', 0, 0, 1), B('blackbg', 'Black BG', 'Fundo preto')],
    glsl: `vec4 fx(vec2 uv){
      vec2 Q = (uv - 0.5) * uRes / (uRes.y * 0.5); Q.y = -Q.y;
      vec2 th = vec2(turnh - 0.5, 0.5 - turnv), wb = vec2(wobh, wobv), P = Q; float d = 0.0;
      for (int i = 0; i < 5; i++) { d = 0.0914 / (length(P) + 0.0907); 
        P = Q - th * min(4.0 * d, 1.2) - wb * 0.3 * min(4.0 * d, 1.0) * sin(uTime * 2.0 + 12.566 * d); }
      d = 0.0914 / (length(P) + 0.0907);
      float n = floor(pow(2.0, 4.0 * kal) + 0.001);
      float a = fract(atan(P.y, P.x) / 6.2831853 - (0.5 - rot) - (0.5 - twist) * 4.0 * (d - 0.0957));
      a = fract(a * n);
      float u = 1.0 - a;
      float v = 0.055 + 0.941 * fract(1.0 - d - pos + (speed - 0.5) * 2.0 * uTime);
      vec4 c = texture(uTex, vec2(u, 1.0 - v));
      vec4 bg = vec4(0.0, 0.0, 0.0, blackbg > 0.5 ? 1.0 : 0.0);
      return c + bg * (1.0 - c.a); }` }),
  // No Resolume, sem o arquivo de mapa (Image) a saída é vazia: é o que o gabarito mostra em todos os casos.
  // O motor ainda não carrega um arquivo por efeito, então os controles ficam e a saída sai vazia como lá.
  def({ id: 'uvmap', name: 'UV Map', desc: 'Redesenha a imagem seguindo um mapa de coordenadas (vermelho = horizontal, verde = vertical). Sem um mapa carregado a saída fica vazia, como no Resolume; carregar o mapa ainda não é possível aqui.',
    params: [B('flipu', 'Flip U', 'Espelhar U'), B('flipv', 'Flip V', 'Espelhar V'), N('offx', 'Offset X', 'Deslocamento X', 0, 0, 1), N('offy', 'Offset Y', 'Deslocamento Y', 0, 0, 1),
      N('fstr', 'Filter Strength', 'Força do filtro', 0.25, 0, 1), C('fcolor', 'Filter Color', 'Cor do filtro', '#00000000', true), B('blacktr', 'Black Is Transparent', 'Preto é transparente')],
    glsl: `vec4 fx(vec2 uv){ return vec4(0.0); }` }),
  // Mosaico de triângulos equiláteros de lado Scale × altura da tela, com um vértice no centro; cada nível seguinte
  // tem metade do tamanho e entra onde a cor muda. Cada triângulo leva a cor do seu centro. Threshold apaga os
  // triângulos mais escuros que o limiar. A regra exata de mistura dos níveis do Resolume não foi decifrada.
  def({ id: 'triangulate', name: 'Triangulate', desc: 'A imagem vira um mosaico de triângulos, menores onde há mais detalhe.',
    params: [N('scale', 'Scale', 'Escala', 0.125, 0, 1), N('levels', 'Levels', 'Níveis', 4, 1, 10, 1), B('flip', 'Flip Direction', 'Inverter a direção', 1), N('thresh', 'Threshold', 'Limiar', 0, 0, 1)],
    glsl: `vec4 trCor(vec2 p, float sd, out float sombra){
      float h = sd * 0.8660254; vec2 q = vec2(p.x / sd - p.y / (2.0 * h), p.y / h), c = floor(q), f = q - c;
      bool up = f.x + f.y < 1.0; vec2 g = c + (up ? vec2(1.0 / 3.0) : vec2(2.0 / 3.0));
      sombra = up ? f.y : 1.0 - f.y;
      vec2 ctr = vec2((g.x + g.y * 0.5) * sd, g.y * h);
      if (flip > 0.5) ctr.y = -ctr.y;
      return tex(ctr / uRes + 0.5); }
    vec4 fx(vec2 uv){
      if (scale <= 0.0) return tex(uv);
      vec2 p = (uv - 0.5) * uRes; if (flip > 0.5) p.y = -p.y;
      float sd = scale * uRes.y, sm, sm2; vec4 col = trCor(p, sd, sm);
      int n = int(floor(levels + 0.001));
      for (int i = 1; i < 10; i++) { if (i >= n) break; sd *= 0.5; if (sd < 2.0) break;
        vec4 c = trCor(p, sd, sm2); vec3 dv = abs(c.rgb - col.rgb);
        if (max(dv.r, max(dv.g, dv.b)) > 0.3) { col = c; sm = sm2; } }
      vec3 u = un(col) * (0.94 + 0.12 * sm);
      float a = lum(un(col)) < thresh ? 0.0 : col.a;
      return pre(u, a); }` }),
  // Camadas da imagem em escalas crescentes (Range), somadas e sempre avançando (Zoom) e girando (Rotation Speed).
  // Mexe sozinho: não bate por pixel; a conta do peso de cada camada é aproximada.
  def({ id: 'infinitezoom', name: 'Infinite Zoom', desc: 'Zoom sem fim: camadas da imagem em escalas crescentes, somadas, avançando e girando.',
    params: [N('rspeed', 'Rotation Speed', 'Velocidade do giro', 0, -2, 2), N('zoom', 'Zoom', 'Zoom', 0.05, -0.2, 0.2, 0.001), N('range', 'Range', 'Alcance', 3, 0, 20, 0.1), N('alpha', 'Alpha', 'Opacidade', 0.5, 0, 1), N('slices', 'Num Slices', 'Camadas', 10, 2, 30, 1), E('reset', 'Reset', 'Reiniciar')],
    glsl: `vec4 fx(vec2 uv){
      int n = int(floor(slices + 0.001)); float fn = float(n), ph = fract(uTime * zoom * 2.0), ang = uTime * rspeed;
      vec2 p = (uv - 0.5) * vec2(ar(), 1.0); vec4 acc = vec4(0.0);
      for (int i = 0; i < 30; i++) { if (i >= n) break;
        float t = (float(i) + ph) / fn, sc = exp(range * t), w = range > 0.0 ? sin(3.14159265 * t) : 1.0 / fn;
        vec2 q = rot2(p, ang * (1.0 + t)) / sc / vec2(ar(), 1.0) + 0.5;
        acc += texIn(q) * w * alpha * (range > 0.0 ? 0.3 : 2.0); }
      return min(acc, vec4(1.0)); }` }),
  // Os três abaixo são malhas 3D no Resolume (esfera de polígonos com pontas, esfera com espinhos, relevo); aqui são
  // aproximações por marcha de raio num passe só: a forma geral e a resposta dos controles, não a mesma malha.
  def({ id: 'sphere', name: 'Sphere', desc: 'Uma esfera de facetas com pontas, pintada com a imagem.',
    params: [N('size', 'Size', 'Tamanho', 0.3, 0, 1), N('res', 'Resolution', 'Resolução', 0.6, 0, 1), N('extr', 'Extrusion', 'Pontas', 0.1, 0, 1), B('invert', 'Invert', 'Inverter'), N('nphase', 'NoisePhase', 'Fase do ruído', 0, 0, 1),
      L('ntype', 'NoiseType', 'Tipo de ruído', ['Gradient', 'Value', 'Fractal'], ['Gradiente', 'Valor', 'Fractal']), C('cval', 'ColorValue', 'Cor', '#ffffffff', true), L('cmode', 'ColorMode', 'Modo da cor', ['Add', 'Multiply', 'Interpolate'], ['Somar', 'Multiplicar', 'Misturar'], 1),
      N('ccontrast', 'ColorContrast', 'Contraste da cor', 1.5, 1, 10, 0.01), N('tval', 'ThresholdValue', 'Limiar', 0.1, 0, 1), L('tmode', 'ThresholdMode', 'Modo do limiar', ['Color', 'Greyscale', 'Transparent'], ['Cor', 'Cinza', 'Transparente']),
      N('zoom', 'Zoom', 'Zoom', 0.5, 0, 1), N('rotx', 'Rotation X', 'Giro X', 0, -180, 180, 0.1, '°'), N('roty', 'Rotation Y', 'Giro Y', 0, -180, 180, 0.1, '°'), N('rotz', 'Rotation Z', 'Giro Z', 0, -180, 180, 0.1, '°'), B('blackbg', 'Black BG', 'Fundo preto')],
    glsl: `float spH(vec3 c){ return fract(sin(dot(c, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    vec3 spRot(vec3 p){ p.yz = rot2(p.yz, radians(rotx)); p.xz = rot2(p.xz, radians(roty)); p.xy = rot2(p.xy, radians(rotz)); return p; }
    // raio da superfície na direção d: facetas (células da direção) com uma ponta no meio de cada uma
    float spRaio(vec3 d, float R, out vec3 cel){
      float k = 1.0 + floor(res * 5.0); vec3 g = d * k; cel = floor(g + 0.5);
      float h = spH(cel + floor(nphase * 16.0)); if (ntype > 1.5) h = 0.5 * h + 0.5 * spH(cel * 2.0 + 3.0); if (ntype > 0.5 && ntype < 1.5) h = sqrt(h);
      if (invert > 0.5) h = 1.0 - h;
      float pico = max(0.0, 1.0 - 1.5 * length(g - cel));
      return R * (1.0 + extr * 14.0 * h * h * pico); }
    vec4 fx(vec2 uv){
      vec4 bg = vec4(0.0, 0.0, 0.0, blackbg > 0.5 ? 1.0 : 0.0);
      float R = 1.7 * size * 0.54 / max(1.04 - zoom, 0.05); if (R <= 0.0) return bg;
      vec2 s = (uv - 0.5) * vec2(ar(), 1.0) * 2.0;
      vec3 ro = spRot(vec3(0.0, 0.0, 4.0)), rd = spRot(normalize(vec3(s * 0.25, -1.0)));
      float lim = R * (1.0 + extr * 14.0); vec3 cel; bool hit = false;
      float b = dot(ro, rd), disc = b * b - dot(ro, ro) + lim * lim; if (disc < 0.0) return bg;
      float t = max(-b - sqrt(disc), 0.0), tmax = -b + sqrt(disc);
      for (int i = 0; i < 90; i++) { vec3 p = ro + rd * t; float r = length(p), f = r - spRaio(p / r, R, cel);
        if (f < 0.002) { hit = true; break; } t += max(f * 0.25, 0.004); if (t > tmax) break; }
      if (!hit) return bg;
      vec3 d = normalize(cel + 0.001);
      vec2 tq = vec2(atan(d.x, d.z) / 6.2831853 + 0.5, 0.5 + asin(clamp(d.y, -1.0, 1.0)) / 3.14159265);
      vec3 col = un(tex(tq));
      col = cmode < 0.5 ? col + cval.rgb : cmode < 1.5 ? col * cval.rgb : mix(col, cval.rgb, 0.5);
      col *= ccontrast * (0.45 + 0.5 * spH(cel + 9.0));
      if (lum(col) < tval) { if (tmode > 1.5) return bg; if (tmode > 0.5) col = vec3(lum(col)); }
      return pre(col, 1.0); }` }),
  def({ id: 'stingysphere', name: 'Stingy Sphere', desc: 'Uma esfera com a imagem enrolada; as partes claras saltam em espinhos.',
    params: [N('size', 'Sphere size', 'Tamanho da esfera', 0.5, 0, 1), N('extr', 'Extrusion', 'Espinhos', 0.5, 0, 1), B('fft', 'FFT', 'Seguir o som'), L('entrada', 'Input', 'Entrada', ['Local', 'Composition', 'External'], ['Local', 'Composição', 'Externa'], 1),
      N('fallback', 'Fallback', 'Queda', 1000, 100, 2000, 1), N('gain', 'Gain', 'Ganho', 0, -2, 24, 0.1), B('noise', 'Noise', 'Ruído'), N('namount', 'Noise Amount', 'Quanto de ruído', 0.5, 0, 1), B('light', 'Light', 'Luz'), B('lflat', 'Light Flat', 'Luz chapada'),
      N('minlight', 'Min Light', 'Luz mínima', 0.2, 0, 1), B('satur', 'Saturate', 'Saturar'), N('samount', 'Saturate Amount', 'Quanto saturar', 0.2, 0, 1), B('wired', 'Wired', 'Aramado'), B('invert', 'Invert', 'Inverter'),
      N('zoom', 'Zoom', 'Zoom', 0.5, 0, 1), N('res', 'Resolution', 'Resolução', 1, 0, 1), N('rotx', 'Rotate X', 'Giro X', 0, -180, 180, 0.1, '°'), N('roty', 'Rotate Y', 'Giro Y', 0, -180, 180, 0.1, '°'), N('rotz', 'Rotate Z', 'Giro Z', 0, -180, 180, 0.1, '°'), B('blackbg', 'Black BG', 'Fundo preto')],
    glsl: `vec3 ssRot(vec3 p){ p.yz = rot2(p.yz, radians(rotx)); p.xz = rot2(p.xz, radians(roty)); p.xy = rot2(p.xy, radians(rotz)); return p; }
    vec2 ssUV(vec3 d){ return vec2(atan(d.x, d.z) / 6.2831853 + 0.5, 0.5 + asin(clamp(d.y, -1.0, 1.0)) / 3.14159265); }
    float ssRaio(vec3 d, float R){ vec2 t = ssUV(d); float q = 8.0 + 248.0 * res; t = (floor(t * vec2(q * 2.0, q)) + 0.5) / vec2(q * 2.0, q);
      float l = lum(un(tex(t))); if (invert > 0.5) l = 1.0 - l;
      float h = smoothstep(0.7, 1.0, l); if (noise > 0.5) h += namount * hash(floor(t * 64.0));
      return R * (1.0 + 3.0 * extr * h); }
    vec4 fx(vec2 uv){
      vec4 bg = vec4(0.0, 0.0, 0.0, blackbg > 0.5 ? 1.0 : 0.0);
      float R = 0.318 * (0.2 + 0.6 * size) * 0.62 / max(1.12 - zoom, 0.05);
      vec3 ro = ssRot(vec3((uv - 0.5) * vec2(ar(), 1.0) * 2.0, 4.0)), rd = ssRot(vec3(0.0, 0.0, -1.0));
      float lim = R * (1.0 + 3.0 * extr * (1.0 + namount)), b = dot(ro, rd), disc = b * b - dot(ro, ro) + lim * lim; if (disc < 0.0) return bg;
      float t = -b - sqrt(disc), tmax = -b + sqrt(disc); bool hit = false; vec3 p;
      for (int i = 0; i < 80; i++) { p = ro + rd * t; float r = length(p), f = r - ssRaio(p / r, R);
        if (f < 0.001) { hit = true; break; } t += max(f * 0.3, 0.003); if (t > tmax) break; }
      if (!hit) return bg;
      vec3 d = normalize(p); vec3 col = un(tex(ssUV(d)));
      if (satur > 0.5) col = mix(vec3(lum(col)), col, 1.0 + 4.0 * samount);
      if (light > 0.5) col *= max(minlight, lflat > 0.5 ? 0.7 : dot(d, -rd));
      if (wired > 0.5) { vec2 g = abs(fract(ssUV(d) * vec2(48.0, 24.0)) - 0.5); if (max(g.x, g.y) < 0.42) return bg; }
      return pre(col, 1.0); }` }),
  def({ id: 'terrain', name: 'Terrain', desc: 'Um relevo ondulado pintado com a imagem, visto de dentro e sempre andando.',
    params: [N('tilt', 'Tilt', 'Inclinação', 1, 0, 90, 0.1, '°'), N('dir', 'Direction', 'Direção', 0, -180, 180, 0.1, '°'), N('posy', 'Position Y', 'Altura da câmera', 8, 0, 35, 0.1), N('height', 'Height', 'Altura do relevo', 15, 0, 23, 0.1), N('wobble', 'Wobble', 'Balanço', 0, 0, 0.02, 0.0005),
      N('speed', 'Speed', 'Velocidade', 1, -3, 3), N('jag', 'Jagginess', 'Aspereza', 0, 0, 1), N('atten', 'Attenuation', 'Atenuação', 100, 10, 300, 1), N('texrep', 'Texture Rep', 'Repetição da imagem', 0, 0, 12, 0.1), B('additive', 'Additive', 'Somar', 1)],
    glsl: `float teAlt(vec2 x){ float h = vnoise(x * 0.035) + 0.5 * vnoise(x * 0.08 + 7.0); h += jag * (vnoise(x * 0.3) + 0.5 * vnoise(x * 0.9)) * 0.5;
      return height * (h - 0.6) * 1.6 + wobble * 400.0 * sin(x.x * 0.05 + uTime * 3.0); }
    vec4 teCor(vec3 p, float t){ vec2 q = fract(p.xz * max(texrep, 1.0) / 120.0 + 0.5);
      vec4 c = tex(q); float k = clamp(atten / max(t, 1.0) * 0.5, 0.0, 1.0); return vec4(c.rgb * k, c.a); }
    vec4 fx(vec2 uv){
      vec2 s = (uv - 0.5) * vec2(ar(), 1.0) * 2.0;
      vec3 ro = vec3(0.0, posy, 0.0), rd = normalize(vec3(s.x, s.y, 1.6));
      rd.yz = rot2(rd.yz, -radians(tilt)); rd.xz = rot2(rd.xz, radians(dir)); ro.xz = rot2(vec2(0.0, uTime * speed * 12.0), radians(dir));
      float t = 1.0; vec4 acc = vec4(0.0);
      for (int i = 0; i < 90; i++) { vec3 p = ro + rd * t; float f = p.y - teAlt(p.xz);
        if (f < 0.02 * t) { vec4 c = teCor(p, t);
          if (additive < 0.5) return vec4(min(c.rgb, vec3(1.0)), 1.0) * c.a;
          acc.rgb += c.rgb * 0.6; acc.a = min(1.0, acc.a + 0.7); t += 6.0 + 0.05 * t; if (acc.a >= 1.0) break; continue; }
        t += max(f * 0.5, 0.05 * t + 0.2); if (t > 600.0) break; }
      return vec4(min(acc.rgb, vec3(acc.a)), acc.a); }` }),
];
