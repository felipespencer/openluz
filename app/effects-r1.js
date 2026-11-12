// Efeitos refeitos com os controles e a imagem do Resolume 7.28 — lote 1 (cor e máscara simples).
// A conta de cada um foi deduzida das fotos do gabarito (tools/compare/gabarito.py + pontos.py) e conferida com
// tools/compare/confere.mjs. Nenhum código do Resolume entra aqui.
import { N, B, L, def } from './effects-rk.js';

export const R1 = [
  // saída = entrada + valor, canal a canal (medido: exato)
  def({ id: 'addsubtract', name: 'Add Subtract', desc: 'Soma ou tira um tanto de cada canal de cor.',
    params: [N('r', 'R', 'Vermelho', 0, -1, 1), N('g', 'G', 'Verde', 0, -1, 1), N('b', 'B', 'Azul', 0, -1, 1)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); return pre(un(c) + vec3(r, g, b), c.a); }` }),
  // alfa = valor × ganho; valor = brilho (Rec. 601) ou, escolhido um canal, a soma dos outros dois (a cor pura do canal some).
  // ganho: 2 × Contrast até 0,5; daí em diante 1 + 5 × (2 × Contrast − 1)
  def({ id: 'automask', name: 'Auto Mask', desc: 'O brilho da própria imagem vira a transparência dela.',
    params: [L('channel', 'Channel', 'Canal', ['Luminance', 'Red', 'Green', 'Blue'], ['Brilho', 'Vermelho', 'Verde', 'Azul']), N('contrast', 'Contrast', 'Contraste', 0.5, 0, 1), B('invert', 'Invert', 'Inverter')],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); vec3 u = un(c);
      float v = channel < 0.5 ? lum(u) : channel < 1.5 ? u.g + u.b : channel < 2.5 ? u.r + u.b : u.r + u.g;
      float g = contrast <= 0.5 ? 2.0 * contrast : 1.0 + 5.0 * (2.0 * contrast - 1.0);
      float a = clamp(v * g, 0.0, 1.0); if (invert > 0.5) a = 1.0 - a;
      return pre(u, c.a * a); }` }),
  // Brightness soma; Contrast multiplica a partir do preto: 1 + c abaixo de zero, 1 + 5c acima
  def({ id: 'brightcontrast', name: 'Bright.Contrast', desc: 'Ajusta brilho e contraste.',
    params: [N('bright', 'Brightness', 'Brilho', 0, -1, 1), N('contrast', 'Contrast', 'Contraste', 0, -1, 1)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv); float g = contrast < 0.0 ? 1.0 + contrast : 1.0 + 5.0 * contrast;
      return pre((un(c) + bright) * g, c.a); }` }),
];
