// Efeitos refeitos com os controles e a imagem do Resolume 7.28 — lote 3. Ver tools/compare/LOTES.md.
// A conta de cada um foi deduzida das fotos do gabarito e conferida com tools/compare/confere.mjs.
import { N, B, L, C, E, def } from './effects-rk.js';

// amostras em fila com peso de sino: de −R a +R em n passos por lado, sigma = Gaussian × R (medido no Blur)
const FILA = `vec4 fila(sampler2D t, vec2 uv, vec2 passo, float n, float g){
  if (n < 0.5 || g <= 0.0005 || dot(passo, passo) <= 0.0) return texture(t, uv);
  vec4 s = vec4(0.0); float tt = 0.0;
  for (float i = -n; i <= n; i += 1.0) { vec2 q = uv + passo * i; if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) continue; float x = i / n / g, w = exp(-0.5 * x * x); s += texture(t, q) * w; tt += w; }
  return s / tt; }
`;

const PXB = `vec4 pxb(sampler2D t, vec2 uv, vec2 px, float R, float st, float g){
  float sg = g * R; if (R < 0.5 || sg <= 0.001) return texture(t, uv);
  vec4 s = vec4(0.0); float tt = 0.0;
  for (float o = -floor(R / st) * st; o <= R; o += st) { vec2 q = uv + px * o; if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) continue; float x = o / sg, w = exp(-0.5 * x * x); vec4 c = texture(t, q); s += c * c * w; tt += w; }
  return sqrt(s / tt); }
`;

// Bloom (medido na segunda passada com quadrados de brilho conhecido): o que passa do limiar (brilho; rampa suave ao quadrado de
// Threshold − Knee até Threshold) é primeiro REDUZIDO (média linear numa casa de ~0,55 × Gaussian × raio), entra pela RAIZ, é
// desfocado por 11 × 11 amostras (sino de sigma = Gaussian × R cortado em R, R = 46 px × Size em 1080 linhas, pesos divididos
// pela soma) e o brilho somado à imagem é (5 × Amount × soma das voltas)²: por isso cresce com o quadrado do Amount e do número
// de voltas e estoura para o branco. A volta k usa raio (e redução) 2^(k−1) vezes maior.
const BLM = `vec3 blmK(vec2 uv, float R, float sg, float lod){ vec3 s = vec3(0.0); float tt = 0.0, k = R / 5.0 / max(sg, 1e-4);
  for (float i = -5.0; i <= 5.0; i += 1.0) { float wi = exp(-0.5 * i * i * k * k); if (wi < 0.002) continue;
    for (float j = -5.0; j <= 5.0; j += 1.0) { float w = wi * exp(-0.5 * j * j * k * k); if (w < 0.002) continue;
      vec2 q = uv + vec2(i, j) * R / 5.0 / uRes; tt += w; if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) continue;
      s += sqrt(textureLod(uMid, q, lod).rgb) * w; } }
  return s / max(tt, 1e-5); }
`;

export const R3 = [
  // Blur: 2N+1 amostras por eixo espalhadas até R = Blur × Distance × lado / 4, peso de sino com sigma = Gaussian × R.
  // N = 5 no padrão (Quality 0,15); o passo de N com Quality não deu para medir (ver relatório): N = 2 + 20 × Quality (5 no padrão; 7 e 12 foram os que melhor bateram em 0,25 e 0,5)
  def({ id: 'blur', name: 'Blur', desc: 'Desfoca a imagem, com distância separada para os lados e para cima e baixo.',
    params: [N('blur', 'Blur', 'Desfoque', 1, 0, 1), N('dx', 'Blur X Distance', 'Distância X', 0.05, 0, 1), N('dy', 'Blur Y Distance', 'Distância Y', 0.05, 0, 1), N('quality', 'Quality', 'Qualidade', 0.15, 0, 1), N('gaussian', 'Gaussian', 'Suavidade', 0.2, 0, 1)],
    stage: FILA + `vec4 fx(vec2 uv){ if (uPass > 0.5) return vec4(0.0); float n = (quality > 0.0 ? floor(quality * 20.0 + 2.5) : 0.0); return fila(uTex, uv, vec2(blur * dx * 0.25 / max(n, 1.0), 0.0), n, gaussian); }`,
    glsl: FILA + `vec4 fx(vec2 uv){ float n = (quality > 0.0 ? floor(quality * 20.0 + 2.5) : 0.0); return fila(uMid, uv, vec2(0.0, blur * dy * 0.25 / max(n, 1.0)), n, gaussian); }` }),
  // Pixel Blur: amostras em pixels inteiros, de −Distance a +Distance a cada Interval px, peso de sino (sigma = Gaussian × Distance),
  // com a média feita sobre a cor ao quadrado (por isso o claro avança sobre o escuro)
  def({ id: 'pixelblur', name: 'Pixel Blur', desc: 'Desfoque medido em pixels, com intervalo entre as amostras.',
    params: [N('blur', 'Blur', 'Desfoque', 1, 0, 1), N('dx', 'Distance X', 'Distância X', 20, 0, 250, 0.1, ' px'), N('dy', 'Distance Y', 'Distância Y', 20, 0, 250, 0.1, ' px'), N('interval', 'Interval', 'Intervalo', 2, 1, 6), N('gaussian', 'Gaussian', 'Suavidade', 0.2, 0, 1)],
    stage: PXB + `vec4 fx(vec2 uv){ if (uPass > 0.5) return vec4(0.0); return pxb(uTex, uv, vec2(1.0 / uRes.x, 0.0), blur * dx, floor(interval), gaussian); }`,
    glsl: PXB + `vec4 fx(vec2 uv){ return pxb(uMid, uv, vec2(0.0, 1.0 / uRes.y), blur * dy, floor(interval), gaussian); }` }),
  // Bloom: o 1º passe guarda o que passou do limiar; a redução vem dos mipmaps dessa imagem (stageMip). Em aberto: 5 voltas na
  // carta (12,9) e Knee longe do padrão
  def({ id: 'bloom', name: 'Bloom', desc: 'As partes claras brilham e vazam para fora.',
    params: [N('amount', 'Amount', 'Quantidade', 1, 0, 1), N('threshold', 'Threshold', 'Limiar', 0.9, 0, 1), N('knee', 'Knee', 'Joelho', 0.1, 0, 1), N('iterations', 'Iterations', 'Voltas', 2, 1, 5, 1), N('size', 'Size', 'Tamanho', 0.25, 0, 1), N('gaussian', 'Gaussian', 'Suavidade', 0.5, 0, 1)],
    stageMip: true,
    stage: `vec4 fx(vec2 uv){ if (uPass > 0.5) return vec4(0.0); vec4 c = texture(uTex, uv); float b = lum(c.rgb), m = knee > 0.0005 ? smoothstep(threshold - knee, threshold, b) : step(threshold, b); return vec4(c.rgb * m * m, 1.0); }`,
    glsl: BLM + `vec4 fx(vec2 uv){ vec4 c = texture(uTex, uv); float n = floor(iterations + 0.5), R = 46.0 * size * uRes.y / 1080.0, g = max(gaussian, 0.0005); vec3 e = vec3(0.0);
      for (float k = 1.0; k <= n; k += 1.0) { float f = pow(2.0, k - 1.0); e += R < 0.3 ? sqrt(texture(uMid, uv).rgb) : blmK(uv, f * R, g * f * R, max(0.0, log2(0.55 * g * f * R))); }
      e *= 5.0 * amount; return vec4(min(c.rgb + e * e, vec3(c.a)), c.a); }` }),
  // Pixel High Pass: cada canal abaixo do seu limiar vira zero; do limiar para cima passa como está (medido: exato nos cinzas)
  def({ id: 'pixelhighpass', name: 'Pixel High Pass', desc: 'Apaga, canal por canal, o que estiver abaixo do limiar.',
    params: [N('r', 'R', 'Vermelho', 0, 0, 1), N('g', 'G', 'Verde', 0, 0, 1), N('b', 'B', 'Azul', 0, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 u = un(c); return pre(u * step(vec3(r, g, b), u), c.a); }` }),
  // LoRez: bloco de 1 / (1 − Pixel Size) px (em 1 a imagem inteira vira a cor do centro); Bit Reduction é o tamanho do degrau
  // de cor (corta para baixo); Dither soma d × (d − 0,5) a tudo, alfa inclusive (medido nos cinzas)
  def({ id: 'lorez', name: 'LoRez', desc: 'Baixa a resolução e a quantidade de cores.',
    params: [N('size', 'Pixel Size', 'Tamanho do pixel', 0, 0, 1), N('bits', 'Bit Reduction', 'Redução de cores', 0, 0, 1), N('dither', 'Dither', 'Pontilhado', 0, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec2 n = max(uRes * (1.0 - size), vec2(1.0)); vec4 c = size > 0.0 ? texture(uTex, (floor(uv * n) + 0.5) / n) : texture(uTex, uv);
      c = clamp(c + dither * (dither - 0.5), 0.0, 1.0);
      if (bits > 0.0) c.rgb = floor(min(c.rgb, vec3(0.999)) / bits) * bits;
      return c; }` }),
  // Raster: só sobra o pixel cuja coluna é múltipla de Modulo X e cuja linha é múltipla de Modulo Y (contando do canto de cima,
  // à esquerda; a parte quebrada do número não conta). O resto fica transparente, ou preto com Black BG
  def({ id: 'raster', name: 'Raster', desc: 'Deixa só um pixel a cada tantos, em colunas e linhas.',
    params: [N('mx', 'Modulo X', 'Intervalo X', 2, 1, 100, 0.25, ' px'), N('my', 'Modulo Y', 'Intervalo Y', 2, 1, 100, 0.25, ' px'), B('black', 'Black BG', 'Fundo preto')],
    glsl: `vec4 fx(vec2 uv){ vec2 p = floor(vec2(uv.x, 1.0 - uv.y) * uRes), m = floor(vec2(mx, my) + 0.001);
      float k = (mod(p.x, m.x) < 0.5 && mod(p.y, m.y) < 0.5) ? 1.0 : 0.0; vec4 c = texture(uTex, uv) * k;
      return black > 0.5 ? vec4(c.rgb, 1.0) : c; }` }),
  // Kuwahara: quatro quadrantes de (Radius − 1) px em volta do ponto; vale a média do quadrante mais liso (Radius 1 = imagem intacta)
  def({ id: 'kuwahara', name: 'Kuwahara', desc: 'Pintura a óleo: manchas lisas com bordas firmes.',
    params: [N('radius', 'Radius', 'Raio', 5, 1, 25, 0.1, ' px')],
    glsl: `vec4 fx(vec2 uv){ float r = floor(radius - 1.0 + 0.001); vec4 c0 = texture(uTex, uv); if (r < 0.5) return c0;
      float st = max(1.0, ceil(r / 8.0)); vec4 best = c0; float bv = 1e9;
      for (int q = 0; q < 4; q++) { vec2 sg = vec2(q == 0 || q == 3 ? 1.0 : -1.0, q < 2 ? 1.0 : -1.0); vec4 m = vec4(0.0); vec3 m2 = vec3(0.0); float n = 0.0;
        for (float i = 0.0; i <= r; i += st) for (float j = 0.0; j <= r; j += st) { vec4 t = tex(uv + sg * vec2(i, j) / uRes); m += t; m2 += t.rgb * t.rgb; n += 1.0; }
        m /= n; m2 = m2 / n - m.rgb * m.rgb; float v = m2.r + m2.g + m2.b; if (v < bv) { bv = v; best = m; } }
      return best; }` }),
  // Edge Detection: Mode de 0,5 para cima é Sobel (tamanho do gradiente, canal a canal); abaixo é o laplaciano de 8 vizinhos,
  // só o lado claro. Ganho = 5 × Multiplier. Use Color: o brilho da borda pinta a cor escolhida (Amount = quanto da cor entra;
  // Color e Amount sem Use Color não mudam nada no Resolume, e com ele não há foto: mistura por dedução)
  def({ id: 'edgedetection', name: 'Edge Detection', desc: 'Deixa só as bordas da imagem, sobre preto.',
    params: [N('mode', 'Mode', 'Modo', 1, 0, 1), N('mult', 'Multiplier', 'Ganho', 0.2, 0, 1), B('usecolor', 'Use Color', 'Usar cor'), C('color', 'Color', 'Cor', '#ffffffff', true), N('amount', 'Amount', 'Quantidade', 1, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec2 d = 1.0 / uRes; vec4 c = texture(uTex, uv);
      vec3 a = tex(uv + d * vec2(-1.0, -1.0)).rgb, b = tex(uv + d * vec2(0.0, -1.0)).rgb, e = tex(uv + d * vec2(1.0, -1.0)).rgb, f = tex(uv + d * vec2(-1.0, 0.0)).rgb, g = tex(uv + d * vec2(1.0, 0.0)).rgb,
        h = tex(uv + d * vec2(-1.0, 1.0)).rgb, i = tex(uv + d * vec2(0.0, 1.0)).rgb, j = tex(uv + d * vec2(1.0, 1.0)).rgb, r;
      if (mode >= 0.5) { vec3 gx = (e + 2.0 * g + j) - (a + 2.0 * f + h), gy = (h + 2.0 * i + j) - (a + 2.0 * b + e); r = sqrt(gx * gx + gy * gy); }
      else r = max(8.0 * c.rgb - (a + b + e + f + g + h + i + j), 0.0);
      r = clamp(r * 5.0 * mult, 0.0, 1.0);
      if (usecolor > 0.5) r = mix(r, color.rgb * color.a * lum(r), amount);
      return vec4(r * c.a, c.a); }` }),
  // Dot Screen: cor = mistura da média dos três canais com a cor (Saturation), × 10 − 5, mais a retícula 4 × sen(x) × sen(y);
  // x, y em pixels × Scale, girados de Angle × 180° (medido: período de 2π / Scale px)
  def({ id: 'dotscreen', name: 'Dot Screen', desc: 'Retícula de pontos, como impressão.',
    params: [N('sat', 'Saturation', 'Saturação', 0.5, 0, 1), N('angle', 'Angle', 'Ângulo', 0, 0, 1), N('scale', 'Scale', 'Escala', 0.5, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = texture(uTex, uv); vec3 u = un(c); vec2 p = (uv - 0.5) * uRes; float a = -angle * 3.14159265;
      vec2 q = vec2(cos(a) * p.x - sin(a) * p.y, sin(a) * p.x + cos(a) * p.y) * scale;
      vec3 r = mix(vec3((u.r + u.g + u.b) / 3.0), u, sat) * 10.0 - 5.0 + sin(q.x) * sin(q.y) * 4.0;
      return pre(r, c.a); }` }),
  // Hatched: riscos de 1 px na cor Color1 sobre Color2; quanto mais claro o ponto, mais famílias de risco entram (brilho acima de
  // 0 / 0,3 / 0,5 / 0,7 / 0,8 / 0,9, medidos): diagonal /, diagonal \, as duas de novo meio passo ao lado, verticais e
  // horizontais (estas a cada meio passo). Levels = quantas famílias no máximo. Passo em px medido por Density: 1 → 32, 2 → 22,
  // 3 → 20, 4 → 18, 5 → 16, 6 → 10, 7 → 8, 8 → 5
  def({ id: 'hatched', name: 'Hatched', desc: 'Hachuras de desenho a traço: mais riscos onde a imagem é mais clara.',
    params: [N('density', 'Density', 'Densidade', 4, 1, 8), N('levels', 'Levels', 'Níveis', 6, 2, 6, 1), B('invert', 'Invert', 'Inverter'), C('color1', 'Color1', 'Cor do risco', '#ffffffff', true), C('color2', 'Color2', 'Cor do fundo', '#000000ff', true)],
    glsl: `bool hz(float v, float p){ float m = mod(v, p); return m < 0.01 || p - m < 0.01; }
    vec4 fx(vec2 uv){ vec4 c = texture(uTex, uv); float l = lum(un(c)); if (invert > 0.5) l = 1.0 - l;
      float d = floor(density + 0.001), p = d < 1.5 ? 32.0 : d < 2.5 ? 22.0 : d < 3.5 ? 20.0 : d < 4.5 ? 18.0 : d < 5.5 ? 16.0 : d < 6.5 ? 10.0 : d < 7.5 ? 8.0 : 5.0;
      vec2 q = floor(vec2(uv.x, 1.0 - uv.y) * uRes); float a = q.x + q.y + 1.0, b = q.x - q.y, n = floor(levels + 0.5); bool on = false;
      if (l > 0.0 && hz(a, p)) on = true;
      if (l > 0.3 && n > 1.5 && hz(b, p)) on = true;
      if (l > 0.5 && n > 2.5 && hz(a - p * 0.5, p)) on = true;
      if (l > 0.7 && n > 3.5 && hz(b - p * 0.5, p)) on = true;
      if (l > 0.8 && n > 4.5 && hz(q.x, p * 0.5)) on = true;
      if (l > 0.9 && n > 5.5 && hz(q.y, p * 0.5)) on = true;
      vec4 r = on ? color1 : color2; return vec4(r.rgb * r.a, r.a); }` }),
  // Dilate: máximo (Light) ou mínimo (Dark), canal a canal, de uma grade de amostras em volta: Size amostras para cada lado,
  // a 50 × Spread² px uma da outra (medido em 1920 de largura). Forma: retângulo, círculo, triângulo ou cruz em X com um passo a menos (triângulo por
  // dedução). Threshold: só entra na conta a amostra com brilho acima do limiar (no Dark, espelhado: dedução)
  def({ id: 'dilate', name: 'Dilate', desc: 'Engorda as partes claras (ou as escuras) da imagem.',
    params: [N('spread', 'Spread', 'Espalhamento', 0.15, 0, 1), N('size', 'Size', 'Tamanho', 3, 1, 10), N('threshold', 'Threshold', 'Limiar', 0, 0, 1),
      L('mode', 'Mode', 'Modo', ['Light', 'Dark'], ['Claro', 'Escuro']), L('shape', 'Shape', 'Forma', ['Rectangle', 'Circle', 'Triangle', 'Cross'], ['Retângulo', 'Círculo', 'Triângulo', 'Cruz'])],
    glsl: `vec4 fx(vec2 uv){ vec4 c = texture(uTex, uv); float n = floor(size + 0.001), st = 50.0 * spread * spread * uRes.x / 1920.0, l = lum(c.rgb);
      if (st <= 0.0) return c;
      vec4 r = c;
      for (float j = -n; j <= n; j += 1.0) for (float i = -n; i <= n; i += 1.0) {
        if (shape > 2.5) { if (abs(i) != abs(j) || abs(i) > n - 1.0) continue; }
        else if (shape > 1.5) { if (abs(i) > (n - j) * 0.5 - 0.6) continue; }
        else if (shape > 0.5) { if (i * i + j * j > n * n + 0.5) continue; }
        vec4 t = tex(uv + vec2(i, j) * st / uRes); float lt = lum(t.rgb); if (threshold > 0.0 && (mode < 0.5 ? lt <= threshold : 1.0 - lt <= threshold)) continue; r = mode < 0.5 ? max(r, t) : min(r, t); }
      return r; }` }),
  // RadialBlur (medido na segunda passada, cópia por cópia): N = 1 + 63 × Steps cópias (parte inteira) de peso 1/N; a cópia i
  // (0 a N−1) é ampliada a partir do centro por 1 + 10 × Distance × i/N e girada (no quadro esticado) de
  // (Rotation − 0,5) × uma volta × (i + 1)/N; fora da imagem é transparente. Sem High Quality cada cópia é somada já
  // arredondada em 8 bits (o degrau troca em 0,555, medido com um degradê), o que dá as faixas de cor; com High Quality não há
  // arredondamento. Black BG fecha o fundo em preto (sem foto que prove)
  def({ id: 'radialblur', name: 'RadialBlur', desc: 'Borrão em volta do centro, como zoom em movimento, com giro.',
    params: [N('steps', 'Steps', 'Passos', 0.3, 0, 1), N('dist', 'Distance', 'Distância', 0.1, 0, 1), N('rotation', 'Rotation', 'Giro', 0.5, 0, 1), B('hq', 'High Quality', 'Alta qualidade'), B('black', 'Black BG', 'Fundo preto')],
    glsl: `vec4 fx(vec2 uv){ float n = floor(1.0 + 63.0 * steps + 0.0001); if (steps <= 0.0) return texture(uTex, uv);
      float k = 10.0 * dist, ang = (rotation - 0.5) * -6.2831853, m = n;  vec2 p = uv - 0.5; vec4 s = vec4(0.0);
      for (float i = 0.0; i < m; i += 1.0) { float t = i / n, a = ang * (i + 1.0) / n; vec2 q = vec2(cos(a) * p.x - sin(a) * p.y, sin(a) * p.x + cos(a) * p.y) / (1.0 + k * t); vec4 c = texIn(q + 0.5);
        s += hq > 0.5 ? c : floor(c * 255.0 / n + 0.445) / 255.0; }
      if (hq > 0.5) s /= m; return black > 0.5 ? vec4(s.rgb, 1.0) : s; }` }),
  // Drop Shadow: conferido na segunda passada com um clipe transparente (degradê de alfa, sem bordas duras: o borrão do
  // Spread e do Strength segue sem prova): sombra da transparência, deslocada Distance px no ângulo dado, borrada por Spread (fração da largura),
  // com Strength amostras por lado
  def({ id: 'dropshadow', name: 'Drop Shadow', desc: 'Sombra atrás da imagem, onde ela é transparente.',
    params: [N('dist', 'Distance', 'Distância', 10, 0, 100, 0.1, ' px'), N('angle', 'Angle', 'Ângulo', 45, -180, 180, 1, '°'), C('color', 'Color', 'Cor', '#000000ff', true), N('spread', 'Spread', 'Espalhamento', 0.0013, 0, 0.005, 0.0001), N('strength', 'Strength', 'Força', 8, 1, 32, 1)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = texture(uTex, uv); float a = radians(angle), n = clamp(floor(strength + 0.5), 1.0, 32.0), st = spread * uRes.x / n;
      vec2 o = vec2(cos(a), sin(a)) * dist / uRes; float s = 0.0, tt = 0.0;
      for (float j = -4.0; j <= 4.0; j += 1.0) for (float i = -4.0; i <= 4.0; i += 1.0) { vec2 d = vec2(i, j) * 0.25 * n; float w = exp(-dot(d, d) / (0.5 * n * n + 0.0001));
        s += texIn(uv - o + d * st / uRes).a * w; tt += w; }
      vec4 sh = vec4(color.rgb, color.a) * (s / tt);   // medido com clipe transparente: o alfa da cor só entra no alfa da sombra, a cor vai inteira
      return c + sh * (1.0 - c.a); }` }),
  // Goo: malha de Resolution colunas; cada nó anda sozinho (Speed) até MaxDistortion para cada lado e a imagem estica junto.
  // Mexe sozinho e parte do repouso, como no Resolume: não bate por pixel. Tamanhos tirados das folhas, no olho
  def({ id: 'goo', name: 'Goo', desc: 'A imagem derrete numa malha que se mexe sozinha.',
    params: [N('res', 'Resolution', 'Resolução', 32, 4, 128, 1), N('speed', 'Speed', 'Velocidade', 0.14, 0, 1), N('mx', 'MaxDistortionX', 'Distorção X', 0.14, 0, 1), N('my', 'MaxDistortionY', 'Distorção Y', 0.14, 0, 1), N('mz', 'MaxDistortionZ', 'Distorção Z', 0, 0, 1), B('black', 'Black BG', 'Fundo preto')],
    glsl: `vec3 gooN(vec2 id, float t){ vec3 r = vec3(0.0); for (int k = 0; k < 3; k++) { float fk = float(k) * 17.3, h = hash(id + fk) * 6.2832, f = 0.6 + hash(id.yx + fk + 3.1);
        r[k] = sin(h + t * f) - sin(h) + 0.5 * (sin(2.3 * h + t * f * 1.7) - sin(2.3 * h)); } return r / 3.0; }
    vec4 fx(vec2 uv){ float n = floor(res + 0.5); vec2 g = uv * vec2(n, max(1.0, floor(n * uRes.y / uRes.x + 0.5))), id = floor(g), f = g - id; float t = uTime * speed * 4.0;
      vec3 a = gooN(id, t), b = gooN(id + vec2(1.0, 0.0), t), c = gooN(id + vec2(0.0, 1.0), t), d = gooN(id + vec2(1.0, 1.0), t);
      vec3 v = f.x + f.y < 1.0 ? a + (b - a) * f.x + (c - a) * f.y : d + (c - d) * (1.0 - f.x) + (b - d) * (1.0 - f.y);
      vec2 q = uv + v.xy * vec2(mx, my * uRes.x / uRes.y) * 3.0 / n; q = 0.5 + (q - 0.5) * (1.0 + v.z * mz * 6.0 / n);
      if (black > 0.5) { vec4 r = texIn(q); return vec4(r.rgb, 1.0); }
      return tex(q); }` }),
];
