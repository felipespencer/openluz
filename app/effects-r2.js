// Efeitos refeitos com os controles e a imagem do Resolume 7.28 — lote 2. Ver tools/compare/LOTES.md.
// A conta de cada um foi deduzida das fotos do gabarito e conferida com tools/compare/confere.mjs.
import { N, B, L, C, E, def } from './effects-rk.js';

export const R2 = [
  // ganho medido: 0 → 0; 0,25 → 0,439; 0,5 → 1; 0,75 → 1,467; 1 → 1,867 (duas parábolas pelos pontos medidos)
  def({ id: 'exposure', name: 'Exposure', desc: 'Clareia ou escurece multiplicando a cor.',
    params: [N('exposure', 'Exposure', 'Exposição', 0.5, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); float e = exposure;
      float g = e < 0.5 ? e * (1.5136 + 0.9728 * e) : 1.0 + (e - 0.5) * (2.0 - 0.5333 * (e - 0.5));
      return pre(un(c) * g, c.a); }` }),
  // mistura entre o cinza (0,3 R + 0,59 G + 0,11 B) e a cor: fator 2 × valor até 0,5; acima cresce depressa (2,1 em 0,75; ~15,7 em 1)
  def({ id: 'saturation', name: 'Saturation', desc: 'Mais ou menos cor.',
    params: [N('saturation', 'Saturation', 'Saturação', 0.5, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 u = un(c); float t = 2.0 * saturation - 1.0;
      float k = 1.0 + t;
      if (t > 0.0) {   // medido em 0,55/0,6/0,7/0,75/0,8 (segunda passada): 1/fator cai quase em reta; tabela ligada por retas
        float q = t < 0.1 ? mix(1.0, 0.899, t / 0.1) : t < 0.2 ? mix(0.899, 0.796, (t - 0.1) / 0.1) : t < 0.4 ? mix(0.796, 0.583, (t - 0.2) / 0.2)
          : t < 0.5 ? mix(0.583, 0.4746, (t - 0.4) / 0.1) : t < 0.6 ? mix(0.4746, 0.3685, (t - 0.5) / 0.1) : t < 0.8 ? mix(0.3685, 0.185, (t - 0.6) / 0.2) : mix(0.185, 0.0637, (t - 0.8) / 0.2);
        k = 1.0 / q; }
      float l = dot(u, vec3(0.3, 0.59, 0.11));
      return pre(l + (u - l) * k, c.a); }` }),
  // níveis = 1 / valor; cada canal desce para o degrau de baixo
  def({ id: 'posterize', name: 'Posterize', desc: 'Reduz as cores a poucos níveis.',
    params: [N('posterize', 'Posterize', 'Posterizar', 0.5, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); if (posterize < 0.001) return c; float n = 1.0 / posterize;
      return pre(floor(un(c) * n + 0.0001) / n, c.a); }` }),
  // matiz/saturação/claridade (HSL), com o matiz de −1/6 a 5/6 (magenta-vermelho é negativo): matiz × Hue Scale + Hue Rotate;
  // saturação × 2 × Sat. Scale (medido: média ≤ 0,2)
  def({ id: 'huerotate', name: 'Hue Rotate', desc: 'Gira, encolhe e satura as cores pela roda de matiz.',
    params: [N('hscale', 'Hue Scale', 'Escala do matiz', 1, 0, 1), N('hrot', 'Hue Rotate', 'Giro do matiz', 0, 0, 1), N('sscale', 'Sat. Scale', 'Saturação', 0.5, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 u = un(c);
      float mx = max(u.r, max(u.g, u.b)), mn = min(u.r, min(u.g, u.b)), d = mx - mn, l = 0.5 * (mx + mn);
      float h = d < 1e-6 ? 0.0 : (mx == u.r ? (u.g - u.b) / d : mx == u.g ? (u.b - u.r) / d + 2.0 : (u.r - u.g) / d + 4.0) / 6.0;
      float den = 1.0 - abs(2.0 * l - 1.0); float s = den < 1e-6 ? 0.0 : d / den;
      h = fract(h * hscale + hrot); s = clamp(s * 2.0 * sscale, 0.0, 1.0);
      float ch = den * s; vec3 k = mod(vec3(0.0, 8.0, 4.0) + h * 12.0, 12.0);
      vec3 o = l - 0.5 * ch * clamp(min(k - 3.0, 9.0 - k), -1.0, 1.0);
      return pre(o, c.a); }` }),
  // cada canal vira |canal − valor| (0 = igual, 1 = invertido); o alfa também: |alfa − A|
  def({ id: 'invertrgb', name: 'Invert RGB', desc: 'Inverte cada canal de cor, e o alfa.',
    params: [N('r', 'R', 'Vermelho', 1, 0, 1), N('g', 'G', 'Verde', 1, 0, 1), N('b', 'B', 'Azul', 1, 0, 1), N('a', 'A', 'Alfa', 0, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); return pre(abs(un(c) - vec3(r, g, b)), abs(c.a - a)); }` }),
  // gama = 2 − 2 × Midpoint; ganho = (2 × Ratio)²; Base soma (0,25 já dá tudo preto e 0,75 tudo branco: a inclinação não foi medida)
  def({ id: 'levels', name: 'Levels', desc: 'Base, meio-tom e ganho da imagem.',
    params: [N('base', 'Base', 'Base', 0.5, 0, 1), N('midpoint', 'Midpoint', 'Meio-tom', 0.5, 0, 1), N('ratio', 'Ratio', 'Ganho', 0.5, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); float gm = 2.0 - 2.0 * midpoint;
      vec3 u = gm < 0.001 ? vec3(1.0) : pow(max(un(c), 0.0), vec3(gm));
      return pre(u * 4.0 * ratio * ratio + (base - 0.5) * 4.0, c.a); }` }),
  // a cor de Black To no preto e a de White To no branco, misturadas pelo brilho (com o alfa delas); onde a cor é
  // transparente aparece a imagem original
  def({ id: 'tint', name: 'Tint', desc: 'Pinta os escuros com uma cor e os claros com outra.',
    params: [C('black', 'Black To', 'Preto vira', '#ff0000ff', true), C('white', 'White To', 'Branco vira', '#ccff00ff', true)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 u = un(c);
      vec4 p = mix(vec4(black.rgb * black.a, black.a), vec4(white.rgb * white.a, white.a), lum(u));
      return pre(p.rgb + (1.0 - p.a) * u, c.a); }` }),
  // negativo: em luz linear (gama 2,2) mistura com a média dos três canais, fator −v × (0,25 + 0,5 × (máx − mín)) (medido: ≤ 0,4).
  // positivo: aumenta a saturação (HSV) mais onde ela é pouca e acerta o brilho para a média linear não mudar (aproximação: ~1)
  def({ id: 'vibrance', name: 'Vibrance', desc: 'Dá cor às partes sem cor, sem estourar as já saturadas.',
    params: [N('vibrance', 'Vibrance', 'Vibração', 0, -1, 1)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 u = clamp(un(c), 0.0, 1.0); vec3 l = pow(u, vec3(2.2)); float av = (l.r + l.g + l.b) / 3.0;
      if (vibrance <= 0.0) { float s = max(l.r, max(l.g, l.b)) - min(l.r, min(l.g, l.b));
        return pre(pow(clamp(mix(l, vec3(av), -vibrance * (0.25 + 0.5 * s)), 0.0, 1.0), vec3(1.0 / 2.2)), c.a); }
      float mx = max(u.r, max(u.g, u.b)), mn = min(u.r, min(u.g, u.b)); if (mx < 1e-5) return c;
      float s = (mx - mn) / mx; if (s < 1e-5) return c;
      float s2 = clamp(s + vibrance * s * (1.0 - s) * (1.3 - 0.6 * s), 0.0, 1.0);
      vec3 o = clamp(mx + (u - mx) * (s2 / s), 0.0, 1.0); vec3 ol = pow(o, vec3(2.2));
      float k = pow(av / max((ol.r + ol.g + ol.b) / 3.0, 1e-6), 1.0 / 2.2);
      return pre(o * k, c.a); }` }),
  // a cor lisa no lugar da imagem (o alfa da cor entra duas vezes no alfa da saída, como medido); Show Image põe a imagem por cima
  def({ id: 'solidcolor', name: 'Solid Color', desc: 'Troca a imagem por uma cor lisa.',
    params: [C('color', 'Color', 'Cor', '#ff0000ff', true), B('show', 'Show Image', 'Mostrar a imagem')],
    glsl: `vec4 fx(vec2 uv){ vec4 s = vec4(color.rgb * color.a, color.a * color.a);
      return show > 0.5 ? over(s, tex(uv)) : s; }` }),
  // posição na paleta = brilho × 2 × Heat; paleta azul → verde → amarelo → vermelho, com as rampas medidas nos cinzas
  def({ id: 'heat', name: 'Heat', desc: 'Câmera térmica: azul, verde, amarelo, vermelho.',
    params: [N('heat', 'Heat', 'Calor', 0.5, 0, 1)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); float t = lum(un(c)) * 2.0 * heat;
      float g1 = clamp(4.77 * (t - 0.024), 0.0, 1.0);
      return pre(vec3(clamp(4.77 * (t - 0.272), 0.0, 1.0), min(g1, clamp(1.0 - 2.0 * (t - 0.513), 0.0, 1.0)), 1.0 - g1), c.a); }` }),
  // valor = 0,36 R + 0,40 G + 0,24 B (Weighted) ou (máx + mín) / 2; × 5 × Contrast (medido igual em 0,75 e 1); a cor × valor,
  // misturada com a imagem pelo alfa da cor. Palette: 9 cores a cada 1/8 do valor. GreysKeep: a imagem original volta onde a saturação (HSL)
  // é menor que GreysTolerance, em rampa suave (medido só com a tolerância 0,3)
  def({ id: 'colorize', name: 'Colorize', desc: 'Pinta a imagem com uma cor só, ou com uma paleta, pelo brilho.',
    params: [C('color', 'Color', 'Cor', '#ff0000ff', true), L('mode', 'Mode', 'Modo', ['Color', 'Palette'], ['Cor', 'Paleta']), B('weighted', 'Weighted', 'Pesado pelo olho', 1),
      B('greyskeep', 'GreysKeep', 'Manter os cinzas'), N('greystol', 'GreysTolerance', 'Tolerância dos cinzas', 0.3, 0, 1), B('invert', 'Invert', 'Inverter'), N('contrast', 'Contrast', 'Contraste', 0.2, 0, 1)],
    glsl: `vec3 czPal(float v){ vec3 p[9] = vec3[9](vec3(0.0), vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), vec3(0.5), vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), vec3(1.0));
      float t = clamp(v, 0.0, 1.0) * 8.0; int i = int(min(floor(t), 7.0)); return mix(p[i], p[i + 1], t - float(i)); }
    vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 u = un(c);
      float mx = max(u.r, max(u.g, u.b)), mn = min(u.r, min(u.g, u.b));
      float w = weighted > 0.5 ? dot(u, vec3(0.36, 0.40, 0.24)) : 0.5 * (mx + mn);
      if (invert > 0.5) w = 1.0 - w;
      w = clamp(w * 5.0 * min(contrast, 0.75), 0.0, 1.0);
      vec3 o = mode > 0.5 ? czPal(w) : color.rgb * w;
      o = mix(u, o, mode > 0.5 ? 1.0 : color.a);
      if (greyskeep > 0.5) { float den = 1.0 - abs(mx + mn - 1.0); float sat = den < 1e-5 ? 0.0 : (mx - mn) / den; o = mix(u, o, smoothstep(0.0, max(greystol, 1e-4), sat)); }
      return pre(o, c.a); }` }),
  // só os matizes entre Hue 1 e Hue 2 ficam coloridos (borda suave de 0,05 para fora); o resto vira cinza (0,3 R + 0,59 G + 0,11 B).
  // O matiz é contado de −1/6 a 5/6 e sem sinal (o magenta-vermelho cai em 0…1/6), como medido
  def({ id: 'colorpass', name: 'Color Pass', desc: 'Só uma faixa de cor fica colorida; o resto vira cinza.',
    params: [N('hue1', 'Hue 1', 'Matiz 1', 0.5, 0, 1), N('hue2', 'Hue 2', 'Matiz 2', 1, 0, 1), B('invert', 'Invert', 'Inverter')],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 u = un(c);
      float mx = max(u.r, max(u.g, u.b)), mn = min(u.r, min(u.g, u.b)), d = mx - mn;
      float h = d < 1e-6 ? 0.0 : abs((mx == u.r ? (u.g - u.b) / d : mx == u.g ? (u.b - u.r) / d + 2.0 : (u.r - u.g) / d + 4.0) / 6.0);
      float k = smoothstep(hue1 - 0.05, hue1, h) * (1.0 - smoothstep(hue2, hue2 + 0.05, h));
      if (hue1 <= 0.0 && hue2 >= 1.0) k = 1.0;
      if (invert > 0.5) k = 1.0 - k;
      return pre(mix(vec3(dot(u, vec3(0.3, 0.59, 0.11))), u, k), c.a); }` }),
  // o brilho escolhe a cor numa paleta: posição = Floor + brilho × (Ceiling − Floor) + Cycle Phase (dá a volta; o branco puro cai no
  // começo). As nove paletas (33 pontos cada) foram lidas das fotos e de uma varredura do controle de 0,01 em 0,01. Cycle Speed gira a paleta sozinha (0,5 = parada; o ritmo é estimado). Use Alpha mantém a transparência do clipe
  def({ id: 'recolor', name: 'Recolor', desc: 'Troca as cores da imagem pelas de uma paleta, pelo brilho.',
    params: [N('palette', 'Palette', 'Paleta', 0, 0, 1), N('piso', 'Floor', 'Piso', 0, 0, 1), N('teto', 'Ceiling', 'Teto', 1, 0, 1),
      N('phase', 'Cycle Phase', 'Fase do ciclo', 0, 0, 1), N('speed', 'Cycle Speed', 'Velocidade do ciclo', 0.5, 0, 1), B('usealpha', 'Use Alpha', 'Usar o alfa')],
    glsl: `const vec3 RCP[297] = vec3[297](vec3(0.002, 0.014, 0.169), vec3(0.008, 0.022, 0.182), vec3(0.014, 0.033, 0.194), vec3(0.018, 0.043, 0.208), vec3(0.022, 0.053, 0.220), vec3(0.027, 0.063, 0.231), vec3(0.031, 0.073, 0.243), vec3(0.037, 0.084, 0.255), vec3(0.041, 0.092, 0.267), vec3(0.045, 0.102, 0.278), vec3(0.049, 0.114, 0.290), vec3(0.055, 0.124, 0.302), vec3(0.059, 0.133, 0.314), vec3(0.065, 0.143, 0.325), vec3(0.069, 0.155, 0.339), vec3(0.075, 0.163, 0.353), vec3(0.078, 0.175, 0.365), vec3(0.084, 0.184, 0.376), vec3(0.088, 0.194, 0.388), vec3(0.098, 0.216, 0.412), vec3(0.114, 0.247, 0.449), vec3(0.129, 0.278, 0.488), vec3(0.143, 0.310, 0.527), vec3(0.157, 0.345, 0.567), vec3(0.173, 0.376, 0.606), vec3(0.169, 0.429, 0.645), vec3(0.147, 0.496, 0.686), vec3(0.125, 0.569, 0.729), vec3(0.104, 0.641, 0.774), vec3(0.080, 0.718, 0.820), vec3(0.057, 0.801, 0.867), vec3(0.033, 0.882, 0.914), vec3(0.010, 0.963, 0.961), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.000, 0.069), vec3(0.000, 0.002, 0.155), vec3(0.000, 0.004, 0.241), vec3(0.000, 0.004, 0.320), vec3(0.000, 0.004, 0.394), vec3(0.000, 0.004, 0.463), vec3(0.006, 0.004, 0.524), vec3(0.029, 0.004, 0.539), vec3(0.106, 0.004, 0.473), vec3(0.190, 0.004, 0.404), vec3(0.275, 0.004, 0.333), vec3(0.357, 0.004, 0.267), vec3(0.439, 0.002, 0.198), vec3(0.524, 0.000, 0.131), vec3(0.604, 0.000, 0.063), vec3(0.684, 0.002, 0.008), vec3(0.716, 0.075, 0.000), vec3(0.735, 0.188, 0.000), vec3(0.757, 0.298, 0.000), vec3(0.778, 0.408, 0.000), vec3(0.798, 0.522, 0.000), vec3(0.818, 0.635, 0.000), vec3(0.837, 0.745, 0.000), vec3(0.859, 0.859, 0.000), vec3(0.875, 0.904, 0.067), vec3(0.890, 0.916, 0.182), vec3(0.908, 0.929, 0.310), vec3(0.925, 0.942, 0.435), vec3(0.942, 0.957, 0.570), vec3(0.961, 0.968, 0.709), vec3(0.980, 0.981, 0.848), vec3(0.998, 0.994, 0.986), vec3(0.000, 0.000, 0.004), vec3(0.031, 0.016, 0.065), vec3(0.067, 0.029, 0.129), vec3(0.102, 0.045, 0.194), vec3(0.137, 0.055, 0.253), vec3(0.182, 0.075, 0.310), vec3(0.224, 0.094, 0.359), vec3(0.235, 0.110, 0.400), vec3(0.257, 0.125, 0.424), vec3(0.324, 0.149, 0.373), vec3(0.386, 0.163, 0.317), vec3(0.445, 0.198, 0.269), vec3(0.508, 0.224, 0.218), vec3(0.575, 0.182, 0.167), vec3(0.635, 0.143, 0.114), vec3(0.698, 0.106, 0.061), vec3(0.757, 0.073, 0.012), vec3(0.784, 0.112, 0.002), vec3(0.798, 0.167, 0.004), vec3(0.814, 0.280, 0.004), vec3(0.827, 0.412, 0.004), vec3(0.845, 0.541, 0.004), vec3(0.861, 0.671, 0.004), vec3(0.875, 0.792, 0.004), vec3(0.890, 0.849, 0.004), vec3(0.904, 0.847, 0.063), vec3(0.916, 0.806, 0.145), vec3(0.927, 0.763, 0.249), vec3(0.943, 0.771, 0.357), vec3(0.461, 0.408, 0.176), vec3(0.473, 0.388, 0.188), vec3(0.482, 0.449, 0.292), vec3(0.247, 0.237, 0.173), vec3(0.002, 0.004, 0.000), vec3(0.139, 0.055, 0.000), vec3(0.290, 0.112, 0.000), vec3(0.437, 0.167, 0.000), vec3(0.610, 0.229, 0.000), vec3(0.798, 0.300, 0.000), vec3(0.961, 0.371, 0.000), vec3(0.996, 0.447, 0.000), vec3(1.000, 0.525, 0.000), vec3(1.000, 0.606, 0.000), vec3(1.000, 0.702, 0.000), vec3(1.000, 0.849, 0.000), vec3(1.000, 0.945, 0.000), vec3(1.000, 0.800, 0.002), vec3(1.000, 0.620, 0.004), vec3(0.996, 0.455, 0.004), vec3(0.996, 0.314, 0.008), vec3(0.996, 0.175, 0.008), vec3(0.996, 0.053, 0.008), vec3(0.996, 0.194, 0.008), vec3(0.996, 0.396, 0.008), vec3(0.996, 0.592, 0.008), vec3(0.996, 0.782, 0.008), vec3(0.996, 0.941, 0.008), vec3(0.996, 0.824, 0.008), vec3(0.992, 0.649, 0.008), vec3(0.992, 0.435, 0.008), vec3(0.990, 0.214, 0.008), vec3(0.985, 0.199, 0.011), vec3(0.978, 0.362, 0.012), vec3(0.971, 0.568, 0.016), vec3(0.963, 0.769, 0.019), vec3(0.955, 0.971, 0.022), vec3(0.231, 0.004, 0.000), vec3(0.335, 0.082, 0.000), vec3(0.447, 0.167, 0.000), vec3(0.565, 0.255, 0.000), vec3(0.692, 0.337, 0.000), vec3(0.835, 0.435, 0.000), vec3(0.919, 0.504, 0.000), vec3(0.924, 0.563, 0.000), vec3(0.890, 0.635, 0.000), vec3(0.847, 0.698, 0.000), vec3(0.806, 0.765, 0.000), vec3(0.776, 0.882, 0.010), vec3(0.776, 0.975, 0.051), vec3(0.776, 0.841, 0.096), vec3(0.775, 0.706, 0.141), vec3(0.773, 0.580, 0.186), vec3(0.773, 0.475, 0.231), vec3(0.773, 0.325, 0.235), vec3(0.769, 0.176, 0.237), vec3(0.769, 0.249, 0.237), vec3(0.769, 0.363, 0.237), vec3(0.769, 0.473, 0.237), vec3(0.792, 0.600, 0.237), vec3(0.837, 0.739, 0.237), vec3(0.875, 0.643, 0.237), vec3(0.916, 0.500, 0.237), vec3(0.951, 0.318, 0.237), vec3(0.992, 0.169, 0.227), vec3(0.988, 0.133, 0.188), vec3(0.586, 0.249, 0.108), vec3(0.610, 0.161, 0.094), vec3(0.606, 0.239, 0.049), vec3(0.422, 0.159, 0.031), vec3(1.000, 0.008, 0.000), vec3(1.000, 0.180, 0.000), vec3(1.000, 0.357, 0.000), vec3(1.000, 0.541, 0.000), vec3(1.000, 0.729, 0.000), vec3(1.000, 0.914, 0.000), vec3(0.847, 0.988, 0.000), vec3(0.663, 1.000, 0.000), vec3(0.522, 1.000, 0.000), vec3(0.329, 1.000, 0.000), vec3(0.145, 1.000, 0.000), vec3(0.000, 1.000, 0.047), vec3(0.000, 1.000, 0.227), vec3(0.000, 1.000, 0.424), vec3(0.000, 1.000, 0.608), vec3(0.000, 1.000, 0.796), vec3(0.000, 1.000, 0.980), vec3(0.000, 0.835, 1.000), vec3(0.000, 0.647, 1.000), vec3(0.000, 0.463, 1.000), vec3(0.000, 0.275, 1.000), vec3(0.000, 0.086, 1.000), vec3(0.106, 0.000, 1.000), vec3(0.294, 0.000, 1.000), vec3(0.475, 0.000, 1.000), vec3(0.655, 0.000, 1.000), vec3(0.816, 0.000, 1.000), vec3(0.996, 0.000, 0.941), vec3(1.000, 0.000, 0.780), vec3(0.886, 0.004, 0.439), vec3(1.000, 0.004, 0.380), vec3(1.000, 0.004, 0.192), vec3(1.000, 0.008, 0.098), vec3(0.667, 0.008, 0.000), vec3(0.667, 0.120, 0.000), vec3(0.667, 0.239, 0.000), vec3(0.667, 0.363, 0.000), vec3(0.667, 0.488, 0.000), vec3(0.667, 0.608, 0.000), vec3(0.567, 0.659, 0.000), vec3(0.445, 0.667, 0.000), vec3(0.349, 0.667, 0.000), vec3(0.227, 0.731, 0.014), vec3(0.110, 0.804, 0.024), vec3(0.020, 0.912, 0.080), vec3(0.024, 1.000, 0.216), vec3(0.024, 1.000, 0.345), vec3(0.024, 1.000, 0.467), vec3(0.024, 1.000, 0.592), vec3(0.024, 1.000, 0.714), vec3(0.024, 0.890, 0.729), vec3(0.024, 0.763, 0.729), vec3(0.024, 0.639, 0.729), vec3(0.024, 0.512, 0.729), vec3(0.024, 0.388, 0.729), vec3(0.100, 0.333, 0.729), vec3(0.227, 0.333, 0.729), vec3(0.343, 0.333, 0.729), vec3(0.467, 0.333, 0.729), vec3(0.573, 0.333, 0.729), vec3(0.690, 0.333, 0.690), vec3(0.694, 0.333, 0.584), vec3(0.605, 0.178, 0.325), vec3(0.680, 0.171, 0.282), vec3(0.680, 0.171, 0.159), vec3(0.675, 0.090, 0.098), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.000, 0.000), vec3(0.004, 0.008, 0.004), vec3(0.000, 0.000, 0.000), vec3(0.016, 0.192, 0.039), vec3(0.035, 0.404, 0.078), vec3(0.059, 0.722, 0.137), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.082, 1.000, 0.192), vec3(0.043, 0.502, 0.098), vec3(0.043, 0.502, 0.098), vec3(0.043, 0.502, 0.098), vec3(0.024, 0.251, 0.051), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.000, 0.000), vec3(0.000, 0.008, 0.002), vec3(0.006, 0.090, 0.018), vec3(0.016, 0.196, 0.039), vec3(0.029, 0.355, 0.067), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094), vec3(0.039, 0.498, 0.094));
    vec3 rcPal(int p, float t){ float x = clamp(t, 0.0, 1.0) * 32.0; int i = int(min(floor(x), 31.0)); return mix(RCP[p * 33 + i], RCP[p * 33 + i + 1], x - float(i)); }
    vec4 fx(vec2 uv){ vec4 c = tex(uv); float l = lum(c.rgb); if (l >= 0.999) l = 0.0;
      if (usealpha < 0.5) c.a = 1.0;   // sem Use Alpha a paleta cobre o quadro todo, pelo brilho já multiplicado pelo alfa (medido com clipe transparente)
      float t = clamp(piso + l * (teto - piso), 0.0, 1.0); float gira = phase + (speed - 0.5) * uTime; if (gira != 0.0) t = fract(t + gira);
      // nove paletas; o controle fica parado numa e troca depressa para a seguinte em 0,2, 0,35, 0,4, 0,55, 0,6, 0,75, 0,8 e de 0,975 a 1
      float pl = clamp(palette, 0.0, 1.0), pa = 0.0, pf = 0.0;
      if (pl < 0.225) { pa = 0.0; pf = (pl - 0.175) / 0.05; } else if (pl < 0.375) { pa = 1.0; pf = (pl - 0.325) / 0.05; }
      else if (pl < 0.425) { pa = 2.0; pf = (pl - 0.375) / 0.05; } else if (pl < 0.575) { pa = 3.0; pf = (pl - 0.525) / 0.05; }
      else if (pl < 0.625) { pa = 4.0; pf = (pl - 0.575) / 0.05; } else if (pl < 0.775) { pa = 5.0; pf = (pl - 0.725) / 0.05; }
      else if (pl < 0.825) { pa = 6.0; pf = (pl - 0.775) / 0.05; } else { pa = 7.0; pf = (pl - 0.975) / 0.025; }
      int pi = int(pa);
      return pre(mix(rcPal(pi, t), rcPal(pi + 1, t), clamp(pf, 0.0, 1.0)), c.a); }` }),
  // cada ponto fica aceso (com a cor original) ou preto: aceso se o brilho ≥ (ordem de Bayer + 1) / n², com a malha de 2×2 ou 4×4
  // contada do canto de cima à esquerda. No 8x o Resolume mostra uma malha FIXA de 8×8 com 47 pontos acesos, que não olha o brilho:
  // copiada como medida (a foto do gabarito é de meia resolução: sabe-se quantos acendem em cada 2×2, não quais)
  def({ id: 'dither', name: 'Dither', desc: 'Pontilhado: cada ponto aceso ou apagado, numa malha.',
    params: [L('mode', 'Mode', 'Modo', ['2x', '4x', '8x'])],
    glsl: `const int DT8[16] = int[16](2, 3, 4, 4, 3, 3, 2, 3, 1, 3, 4, 4, 2, 3, 3, 3);
    vec4 fx(vec2 uv){ vec4 c = tex(uv); vec2 p = floor(vec2(uv.x, 1.0 - uv.y) * uRes);
      float on;
      if (mode > 1.5) { vec2 b = mod(floor(p * 0.5), 4.0); vec2 m = mod(p, 2.0); int k = DT8[int(b.y) * 4 + int(b.x)];
        int o = m.x < 0.5 ? (m.y < 0.5 ? 0 : 3) : (m.y < 0.5 ? 2 : 1); on = o < k ? 1.0 : 0.0; }
      else { float n = mode > 0.5 ? 4.0 : 2.0; vec2 q = mod(p, n);
        float v;
        // Bayer recursivo: ordem(x, y) = 4 × ordem(x / 2, y / 2) da malha menor + posição dentro do 2×2
        vec2 m = mod(q, 2.0); float fino = m.x < 0.5 ? (m.y < 0.5 ? 0.0 : 3.0) : (m.y < 0.5 ? 2.0 : 1.0);
        if (n > 3.0) { vec2 g = floor(q * 0.5); float grosso = g.x < 0.5 ? (g.y < 0.5 ? 0.0 : 3.0) : (g.y < 0.5 ? 2.0 : 1.0); v = 4.0 * fino + grosso; } else v = fino;
        on = lum(un(c)) >= (v + 1.0) / (n * n) - 1e-5 ? 1.0 : 0.0; }
      return vec4(c.rgb * on, c.a); }` }),
  // máscara = (v ^ (2 × Roundness) − Size) × ganho, com v = 16 × x(1 − x) × y(1 − y) (1 no centro, 0 nas bordas);
  // ganho = 43,25 × (1 − Softness) de 0,75 para cima (medido em 0,75 e 0,96) e perto de 40 de 0,5 para baixo.
  // Sem Black BG a máscara vira transparência; com ele, preto
  def({ id: 'vignette', name: 'Vignette', desc: 'Escurece (ou recorta) as bordas e os cantos.',
    params: [N('roundness', 'Roundness', 'Arredondamento', 0.3, 0, 1), N('size', 'Size', 'Tamanho', 0, 0, 1), N('softness', 'Softness', 'Suavidade', 0.96, 0, 1), B('blackbg', 'Black BG', 'Fundo preto')],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); float v = 16.0 * uv.x * (1.0 - uv.x) * uv.y * (1.0 - uv.y);
      float g = softness >= 0.75 ? 43.25 * (1.0 - softness) : mix(40.0, 10.8, clamp((softness - 0.5) * 4.0, 0.0, 1.0));
      float m = clamp((pow(max(v, 0.0), 2.0 * roundness) - size) * g, 0.0, 1.0);
      return blackbg > 0.5 ? vec4(c.rgb * m, c.a) : c * m; }` }),
  // cada canal de cor vai para um lado: em Shift X anda valor × Distance × a largura (positivo = direita), sem dar a volta, e
  // o que fica de fora some (medido: exato). Shift Y, Rotate X/Y e Zoom medidos na segunda passada (2026-11-12)
  def({ id: 'shiftrgb', name: 'Shift RGB', desc: 'Separa o vermelho, o verde e o azul, cada um para um lado.',
    params: [N('distance', 'Distance', 'Distância', 1, 0, 1), L('mode', 'Mode', 'Modo', ['Shift X', 'Shift Y', 'Rotate X', 'Rotate Y', 'Rotate Z', 'Zoom'], ['Deslocar X', 'Deslocar Y', 'Girar X', 'Girar Y', 'Girar Z', 'Zoom']),
      N('r', 'R', 'Vermelho', 0, -1, 1), N('g', 'G', 'Verde', 0, -1, 1), N('b', 'B', 'Azul', 0, -1, 1), B('blackbg', 'Black BG', 'Fundo preto')],
    glsl: `mat3 sgX(float a){ float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
    mat3 sgY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
    vec4 srgbS(vec2 uv, float v){ float k = v * distance; vec2 p = uv - 0.5;
      if (mode < 0.5) p.x -= k;
      else if (mode < 1.5) p.y += k;
      else if (mode < 3.5) {   // giro no espaço, com a mesma câmera do Transform (45° de abertura vertical); meia volta em 1
        float D = 0.5 * uRes.y * 2.4142136; mat3 R = mode < 2.5 ? sgX(-1.0 * k * 3.14159265) : sgY(-1.0 * k * 3.14159265);
        vec3 E = vec3(0.0, 0.0, D), e = E * R, d = (vec3(p.x * uRes.x, -p.y * uRes.y, 0.0) - E) * R;
        if (abs(d.z) < 1e-6) return vec4(0.0); float t = -e.z / d.z; if (t <= 0.0) return vec4(0.0);
        vec2 q = e.xy + t * d.xy; p = vec2(q.x / uRes.x, -q.y / uRes.y); }
      else if (mode < 4.5) p = rot2(p * vec2(ar(), 1.0), -k * 3.14159265) / vec2(ar(), 1.0);
      else { float z = 1.0 - (v < 0.0 ? 17.0 * k : 1.9 * k * distance); if (z < 1e-4) return vec4(0.0); p *= z; }   // medido: 1/escala = 1 − 17 × valor × Distance para longe e 1 − 1,9 × valor × Distance² para perto
      return texIn(p + 0.5); }
    vec4 fx(vec2 uv){ vec4 cr = srgbS(uv, r), cg = srgbS(uv, g), cb = srgbS(uv, b);
      return vec4(cr.r, cg.g, cb.b, blackbg > 0.5 ? 1.0 : max(cr.a, max(cg.a, cb.a))); }` }),
  // ChromaKey, medido na terceira rodada com uma carta de matiz × saturação e matiz × brilho (Show Mask): a distância à chave é
  // o seno de π × diferença de matiz (0 na chave, 1 no matiz oposto); fica o que passa de Hue Threshold, com rampa suave do
  // tamanho de Hue Softness. Brancos e pretos escapam: ficam abaixo de White Threshold de saturação e de Black Threshold de
  // brilho (HSV), com rampa do tamanho da Softness. Spill tira a cor (média dos canais) com a mesma régua do matiz.
  // Edge Shrink come 8 px × valor da borda (1º passe) e Edge Blur desfoca a máscara (sigma 10,4 px × valor; em 1 medido 14 px).
  def({ id: 'chromakey', name: 'ChromaKey', desc: 'Tira uma cor (o verde do fundo, por exemplo).',
    params: [B('showmask', 'Show Mask', 'Mostrar a máscara'), N('keyhue', 'Key Hue', 'Matiz da chave', 0.4401114284992218, 0, 1),
      N('huethr', 'Hue Threshold', 'Limiar do matiz', 0.1, 0, 1), N('huesoft', 'Hue Softness', 'Suavidade do matiz', 0.25, 0, 1),
      N('whitethr', 'White Threshold', 'Limiar do branco', 0.2, 0, 1), N('whitesoft', 'White Softness', 'Suavidade do branco', 0.2, 0, 1),
      N('blackthr', 'Black Threshold', 'Limiar do preto', 0.2, 0, 1), N('blacksoft', 'Black Softness', 'Suavidade do preto', 0.1, 0, 1),
      N('spillthr', 'Spill Threshold', 'Limiar do vazamento', 0.2, 0, 1), N('spillsoft', 'Spill Softness', 'Suavidade do vazamento', 0.1, 0, 1),
      N('shrink', 'Edge Shrink', 'Encolher a borda', 0.125, 0, 1), N('eblur', 'Edge Blur', 'Desfocar a borda', 0.125, 0, 1)],
    stage: `float ckRamp(float a, float w, float x){ return w < 1e-4 ? step(a, x) : smoothstep(a, a + w, x); }
    float ckD(vec3 h){ return abs(sin(3.14159265 * (h.x - keyhue))); }
    float ckM(vec2 q){ vec3 h = rgb2hsv(un(tex(q)));
      return max(ckRamp(huethr, huesoft, ckD(h)), max(1.0 - ckRamp(whitethr, whitesoft, h.y), 1.0 - ckRamp(blackthr, blacksoft, h.z))); }
    vec4 fx(vec2 uv){ if (uPass > 0.5) return vec4(0.0); float a = ckM(uv), r = 8.0 * shrink * uRes.y / 1080.0;
      if (r > 0.25) for (float i = -1.0; i <= 1.0; i += 1.0) for (float j = -1.0; j <= 1.0; j += 1.0) { if (i == 0.0 && j == 0.0) continue;
        a = min(a, ckM(uv + vec2(i, j) * r / uRes)); if (r > 2.5) a = min(a, ckM(uv + vec2(i, j) * 0.5 * r / uRes)); }
      return vec4(a); }`,
    glsl: `float ckRamp(float a, float w, float x){ return w < 1e-4 ? step(a, x) : smoothstep(a, a + w, x); }
    float ckD(vec3 h){ return abs(sin(3.14159265 * (h.x - keyhue))); }
    float ckM(vec2 q){ vec3 h = rgb2hsv(un(tex(q)));
      return max(ckRamp(huethr, huesoft, ckD(h)), max(1.0 - ckRamp(whitethr, whitesoft, h.y), 1.0 - ckRamp(blackthr, blacksoft, h.z))); }
    vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 u = un(c); float d = ckD(rgb2hsv(u)), sg = (eblur <= 0.5 ? 10.4 * eblur : 5.2 + (eblur - 0.5) * 17.6) * uRes.y / 1080.0, a = 0.0, tt = 0.0;
      if (sg < 0.2) a = texture(uMid, uv).r;
      else { for (float i = -6.0; i <= 6.0; i += 1.0) for (float j = -6.0; j <= 6.0; j += 1.0) { float w = exp(-0.125 * (i * i + j * j)); a += texture(uMid, clamp(uv + vec2(i, j) * 0.5 * sg / uRes, 0.0, 1.0)).r * w; tt += w; } a /= tt; }
      if (showmask > 0.5) return vec4(vec3(a) * c.a, c.a);
      u = mix(vec3((u.r + u.g + u.b) / 3.0), u, ckRamp(spillthr, spillsoft, d));
      return pre(u, c.a * a); }` }),
  // ponto × (1 + 8 × Strength) − Strength × os 8 vizinhos a Distance pontos (em cruz e nas diagonais), medido
  def({ id: 'sharpen', name: 'Sharpen', desc: 'Realça os detalhes.',
    params: [N('strength', 'Strength', 'Força', 0.5, 0, 1), N('distance', 'Distance', 'Distância', 1, 1, 25, 1, ' px')],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec2 d = floor(distance + 0.5) / uRes; vec3 n = vec3(0.0);
      for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) { if (i == 0 && j == 0) continue; n += tex(uv + vec2(float(i), float(j)) * d).rgb; }
      return vec4(clamp(c.rgb * (1.0 + 8.0 * strength) - strength * n, 0.0, c.a), c.a); }` }),
];
