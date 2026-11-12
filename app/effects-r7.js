// Efeitos refeitos com os controles e a imagem do Resolume 7.28 — lote 7. Ver tools/compare/LOTES.md.
// Quase todos aqui são sorteados, mexem sozinhos ou têm memória: não batem por pixel. O que foi conferido com o
// gabarito é a aparência no padrão e a resposta de cada controle (estatísticas simples das fotos).
import { N, B, L, C, E, def } from './effects-rk.js';

// sorteio por inteiros (o fract(sin) da casa dá média e vizinhança erradas em 1920 pontos); k escolhe a série, e o quadro entra
// nela nos efeitos que mudam a cada quadro
const RND = `
uint r7p(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float r7h(vec2 p, float k){ ivec2 q = ivec2(floor(p)); return float(r7p(uint(q.x) + r7p(uint(q.y) + r7p(uint(k))))) / 4294967295.0; }
float r7f(){ return floor(mod(uTime * 60.0, 4096.0)) * 64.0; }
`;

// Stop Motion: o instante de pegar quadro novo é decidido aqui (relógio de verdade), não no shader
const SM = { k: -1 };

// Particle System: a simulação. Estado do módulo (um jato só, mesmo com o efeito em mais de um lugar); anda em passos de 1/60 s
// pelo relógio, então ser chamada duas vezes no mesmo quadro não acelera. Devolve, da mais velha para a mais nova (a nova por cima):
// uPa = x e y (12 bits cada, de −1,5 a 1,5 telas); uPb = largura na tela (10 bits, raiz, até 8 telas), giro (8 bits) e opacidade (6 bits).
const PS = { p: [], acc: 0, t: 0, ex: null, ey: null, a: new Array(256).fill(0), b: new Array(256).fill(0) };
function r7particulas(v) {
  const agora = performance.now(), R = (a, b) => a + (b - a) * Math.random();
  let passos = PS.t ? Math.round((agora - PS.t) / (1000 / 60)) : 1;
  if (passos > 0) PS.t = agora;
  if (passos > 30) { PS.p = []; passos = 1; }   // ficou parado um tempo: recomeça
  passos = Math.min(passos, 6);
  const n = Math.max(0, Math.round(v.n)), vida = Math.max(v.life, 1 / 60);
  for (let s = 0; s < passos; s++) {
    const evx = PS.ex === null ? 0 : v.px - PS.ex, evy = PS.ey === null ? 0 : v.py - PS.ey; PS.ex = v.px; PS.ey = v.py;
    if (v.spawn < 0.5 && n > 0) {
      PS.acc = Math.min(PS.acc + n / (vida * 60), 16);
      while (PS.acc >= 1) { PS.acc -= 1;
        PS.p.push({ x: v.px, y: v.py, z: v.pz, vx: R(v.vx0, v.vx1) + evx * v.inherit, vy: R(v.vy0, v.vy1) + evy * v.inherit, vz: R(v.vz0, v.vz1), rot: 0, vr: R(v.r0, v.r1), s: R(v.s0, v.s1), id: 0 }); }
    }
    for (const q of PS.p) {
      q.vx += v.wind; q.vy += v.grav; const f = 1 - v.fric; q.vx *= f; q.vy *= f; q.vz *= f;
      q.x += q.vx; q.y += q.vy; q.z += q.vz; q.rot += q.vr; q.id += 1 / 60;
    }
    PS.p = PS.p.filter(q => q.id < vida);
    if (PS.p.length > n) PS.p.splice(0, PS.p.length - n);
  }
  let k = 0;
  for (const q of PS.p) {
    if (k >= 256) break;
    const fr = q.id / vida, persp = 1 - 0.75 * q.z; if (persp <= 0.08) continue;
    const wf = 1.8 * q.s * (1 - v.sd * fr) / persp, op = 1 - v.od * fr;
    const x = q.x / persp, y = q.y / persp;
    if (wf <= 0 || op <= 0 || Math.abs(x) > 1.5 || Math.abs(y) > 1.5) continue;
    const qx = Math.round((x + 1.5) / 3 * 4095), qy = Math.round((y + 1.5) / 3 * 4095);
    const qs = Math.max(1, Math.round(Math.sqrt(Math.min(wf, 8) / 8) * 1023)), qr = ((Math.round(q.rot / 360 * 256) % 256) + 256) % 256, qo = Math.round(op * 63);
    PS.a[k] = qx + qy * 4096; PS.b[k] = qs + qr * 1024 + qo * 262144; k++;
  }
  return { uPa: PS.a, uPb: PS.b, uPn: [k] };
}

export const R7 = [
  // ---------- Static ----------
  // A imagem some: cada ponto vira um sorteio novo a cada quadro. Medido na foto de 960 (cada ponto dela é a média de 4 dos 1920):
  // média 128; Grayscale com desvio 36,8 = média de 4 sorteios iguais de 0 a 1; Color = o mesmo em cada canal, independentes;
  // Two-tone = só os níveis 0, 64, 128, 192, 255 nas proporções 1:4:6:4:1 = média de 4 pontos que são preto ou branco.
  def({ id: 'static', name: 'Static', desc: 'Troca a imagem por chuvisco de TV sem sinal.',
    params: [L('mode', 'Mode', 'Modo', ['Color', 'Grayscale', 'Two-tone'], ['Colorido', 'Cinza', 'Dois tons'], 1)],
    glsl: RND + `vec4 fx(vec2 uv){ vec2 q = uv * uRes; float f = r7f();
      vec3 c = mode < 0.5 ? vec3(r7h(q, f), r7h(q, f + 1.0), r7h(q, f + 2.0)) : mode < 1.5 ? vec3(r7h(q, f)) : vec3(step(0.5, r7h(q, f)));
      return vec4(c, 1.0); }` }),

  // ---------- Noisy ----------
  // Um ruído parado (não muda com o tempo) diz de onde cada ponto tira a cor. Deduzido do degradê da carta, que entrega a posição
  // de origem de cada ponto: uv' = mistura(uv, P, Noise × Noise X/Y), com P = centro do bloco do ruído + sorteio de −0,5 a 0,5,
  // preso em 0..1. Com um bloco por ponto (Resolution 1) é um espalhado de ±Noise/2 da tela; com blocos grandes, cada bloco mostra a
  // imagem ampliada 1/(1 − Noise) e fora do lugar; perto das bordas muitos pontos caem no canto e desenham uma cópia ampliada nítida.
  // Noise S tira saturação: mistura com o brilho, 1,5 × Noise × S (medido 0,19 em S = 1 e 0,095 em S = 0,5; 0,375 com Noise 0,25).
  // Noise C clareia: cor × (1 + ~3 × Noise × C), com um pouco de sorteio (medido: mediana 1,35 em C = 1 e 1,18 em C = 0,5).
  // Resolution é o tamanho do ruído: 4/(1 − r) blocos na largura (medido 4, 5, 8 e 16 colunas; 2, 3, 4 e 9 linhas); em 1, um por ponto.
  def({ id: 'noisy', name: 'Noisy', desc: 'Espalha os pontos da imagem por um ruído parado, do chuvisco fino aos blocos fora do lugar.',
    params: [N('noise', 'Noise', 'Ruído', 0.125, 0, 1), N('nx', 'Noise X', 'Ruído em X', 1, 0, 1), N('ny', 'Noise Y', 'Ruído em Y', 1, 0, 1),
      N('ns', 'Noise S', 'Ruído na saturação', 1, 0, 1), N('nc', 'Noise C', 'Ruído no brilho', 0, 0, 1), N('res', 'Resolution', 'Resolução', 1, 0, 1), B('interp', 'Interpolate', 'Interpolar')],
    glsl: RND + `vec3 r7n(vec2 c){ return vec3(r7h(c, 1.0), r7h(c, 2.0), r7h(c, 3.0)); }
    vec4 fx(vec2 uv){
      float cols = res > 0.995 ? uRes.x : min(uRes.x, floor(4.0 / (1.0 - res) + 0.5));
      float rows = res > 0.995 ? uRes.y : min(uRes.y, max(1.0, floor(cols * 9.0 / 16.0 + 0.49)));
      vec2 cr = vec2(cols, rows), g = uv * cr, c = floor(g), cc = (c + 0.5) / cr;
      vec3 n = r7n(c);
      if (interp > 0.5) { vec2 h = g - 0.5, i = floor(h), f = h - i; cc = uv;
        n = mix(mix(r7n(i), r7n(i + vec2(1.0, 0.0)), f.x), mix(r7n(i + vec2(0.0, 1.0)), r7n(i + vec2(1.0, 1.0)), f.x), f.y); }
      vec2 P = clamp(cc + n.xy - 0.5, 0.0, 1.0);
      vec4 s = tex(mix(uv, P, clamp(noise * vec2(nx, ny), 0.0, 1.0)));
      vec3 u = un(s);
      u = mix(u, vec3(lum(u)), clamp(1.5 * noise * ns, 0.0, 1.0));
      u *= 1.0 + noise * nc * (2.25 + 1.5 * n.z);
      return pre(u, s.a); }` }),

  // ---------- Strobe ----------
  // Pisca: a cor inteira no lugar da imagem (medido: no clarão a saída é a cor × o alfa dela, com o alfa dela; fora dele, a imagem
  // intacta). Frequency 1 = cor o tempo todo; 0 = não pisca. Fade: a cor entra cheia e se desfaz até o próximo clarão (medido dois
  // momentos: quase branco e quase a imagem). O número de piscadas por segundo de cada valor de Frequency NÃO foi medido.
  def({ id: 'strobe', name: 'Strobe', desc: 'Pisca uma cor por cima da imagem.',
    params: [N('freq', 'Frequency', 'Frequência', 0.5, 0, 1), B('fade', 'Fade', 'Esmaecer'), C('color', 'Color', 'Cor', '#ffffffff', true)],
    glsl: `vec4 fx(vec2 uv){ vec4 c = tex(uv), k = vec4(color.rgb * color.a, color.a);
      if (freq <= 0.0) return c; if (freq >= 0.999) return k;
      float ph = fract(uTime * 30.0 * freq * freq);
      float o = fade > 0.5 ? 1.0 - ph : step(ph, 0.5);
      return mix(c, k, o); }` }),

  // ---------- Snow ----------
  // No Resolume a imagem some: fica só a neve (flocos brancos de seis pontas, de vários tamanhos, sobre transparente; Black BG
  // põe preto opaco atrás). Medido nas fotos em regime: ~230 flocos na tela com Amount 0,75, cobrindo ~5% do quadro; diâmetro
  // mediano 1% da largura, 10% deles acima de 1,8%, uns poucos bem grandes (perto da câmera). Textured é a parcela dos flocos que
  // nasce com a imagem de entrada desenhada dentro (a imagem inteira em cada floco) em vez de branco. A frente da neve desceu
  // ~0,35 da altura por segundo com Speed 0,4. Aqui é neve em 6 camadas de profundidade, sem memória (a do Resolume é em 3D e
  // enche a tela aos poucos a partir do topo): View X/Y só inclinam a queda — a perspectiva de lá não foi medida.
  def({ id: 'snow', name: 'Snow', desc: 'Troca a imagem por neve caindo; os flocos podem levar a imagem dentro.',
    params: [N('amount', 'Amount', 'Quantidade', 0.75, 0, 1), N('speed', 'Speed', 'Velocidade', 0.4, 0, 1), N('textured', 'Textured', 'Com a imagem', 0.05, 0, 1),
      N('viewy', 'View Y', 'Vista Y', 0.5, 0, 1), N('viewx', 'View X', 'Vista X', 0.5, 0, 1), B('blackbg', 'Black BG', 'Fundo preto')],
    glsl: RND + `float r7floco(vec2 q, float v, float px){
      float r = length(q); if (r > 1.0) return 0.0;
      float a = mod(atan(q.y, q.x), 1.0471976) - 0.5235988, al = r * cos(a), ac = r * abs(sin(a)), m;
      if (v < 0.4) m = max(smoothstep(0.16 + px, 0.16 - px, ac) * smoothstep(0.95, 0.95 - px, al), smoothstep(0.26 + px, 0.26 - px, r));
      else if (v < 0.7) m = smoothstep(px, -px, ac - 0.3 * (1.0 - al));
      else { m = smoothstep(0.07 + px, 0.07 - px, ac) * smoothstep(0.95, 0.95 - px, al);
        m = max(m, smoothstep(0.15 + px, 0.15 - px, length(vec2(al - 0.5, ac))));
        m = max(m, smoothstep(0.13 + px, 0.13 - px, length(vec2(al - 0.82, ac)))); m = max(m, smoothstep(0.2 + px, 0.2 - px, r)); }
      return m; }
    vec4 fx(vec2 uv){
      vec2 p = vec2(uv.x, (1.0 - uv.y) * uRes.y / uRes.x);   // unidades de largura, y para baixo
      vec4 o = vec4(0.0);
      float pit = cos((viewy - 0.5) * 2.5), lado = (viewx - 0.5) * 2.0;
      for (int k = 5; k >= 0; k--) {   // do fundo para a frente
        float fk = float(k), d = 0.06 * pow(0.72, fk), c = d * (k == 0 ? 7.2 : k == 1 ? 6.0 : 5.1);
        float v = (0.04 + 0.86 * speed) * sqrt(d / 0.06) * uRes.y / uRes.x;
        vec2 g = (p + vec2(-lado * v * uTime + fk * 0.37, -pit * v * uTime)) / c, ci = floor(g);
        float h0 = r7h(ci, 10.0 + fk * 8.0);
        if (h0 >= amount) continue;
        float h1 = r7h(ci, 11.0 + fk * 8.0), h2 = r7h(ci, 12.0 + fk * 8.0), h3 = r7h(ci, 13.0 + fk * 8.0), h4 = r7h(ci, 14.0 + fk * 8.0);
        float dd = d * (0.6 + 0.8 * h4), fol = 1.0 - dd / c - 0.06;
        vec2 ce = (ci + 0.5 + (vec2(h1, h2) - 0.5) * fol + vec2(sin(uTime * (0.4 + h3) + h1 * 40.0) * 0.03, 0.0)) * c;
        vec2 q = rot2(((g * c) - ce) / (dd * 0.5), h3 * 6.2832 + uTime * (h1 - 0.5) * 0.6);
        float m = r7floco(q, h2 * 3.7 - floor(h2 * 3.7), 3.0 / (dd * uRes.x));
        if (m <= 0.0) continue;
        vec3 cor = vec3(1.0);
        if (r7h(ci, 15.0 + fk * 8.0) < textured) { vec4 t = tex(vec2(q.x, -q.y) * 0.5 + 0.5); cor = t.rgb; m *= t.a > 0.0 ? 1.0 : 0.0; }
        o = o * (1.0 - m) + vec4(cor * m, m);
      }
      if (blackbg > 0.5) o = vec4(o.rgb, 1.0);
      return o; }` }),

  // ---------- Freeze ----------
  // O gabarito é uma imagem parada: a foto não mostra nada (todos os casos saíram iguais ao padrão). Feito pela ficha e pelo nome
  // dos controles: Frozen solid segura o quadro inteiro; X e Y seguram uma faixa a partir da esquerda / de cima, do tamanho do valor;
  // Black BG põe preto opaco atrás. O que X e Y fazem de verdade no Resolume NÃO foi medido (precisa de clipe em movimento).
  def({ id: 'freeze', name: 'Freeze', desc: 'Congela a imagem: inteira, ou só uma faixa dela.', feedback: true,
    params: [N('x', 'X', 'X', 0, 0, 1), N('y', 'Y', 'Y', 0, 0, 1), B('solid', 'Frozen solid', 'Congelar tudo'), B('blackbg', 'Black BG', 'Fundo preto')],
    glsl: `vec4 fx(vec2 uv){ bool f = solid > 0.5 || uv.x < x || (1.0 - uv.y) < y;
      vec4 pv = prv(uv), c = f && pv.a > 0.0 ? pv : tex(uv);   // sem quadro guardado ainda (efeito recém-posto), vale a imagem
      if (blackbg > 0.5) c = vec4(c.rgb, 1.0);
      return c; }` }),

  // ---------- Stop Motion ----------
  // Também sem foto que mostre (imagem parada). Segura cada quadro por um tempo: Frequency é quantas vezes por segundo pega um
  // quadro novo (aqui 30 × valor; em 1 passa tudo, em 0 fica parado) — a escala verdadeira NÃO foi medida. Frame Count: sem efeito
  // ainda (não se sabe o que faz; padrão 0). Black BG põe preto opaco atrás.
  def({ id: 'stopmotion', name: 'Stop Motion', desc: 'Segura cada quadro por um tempo, como animação quadro a quadro.', feedback: true,
    params: [N('freq', 'Frequency', 'Frequência', 0.5, 0, 1), N('count', 'Frame Count', 'Número de quadros', 0, 0, 1), B('blackbg', 'Black BG', 'Fundo preto')],
    uniforms: (v) => { const k = Math.floor(performance.now() / 1000 * 30 * v.freq), novo = v.freq >= 0.999 || (v.freq > 0 && k !== SM.k); SM.k = k; return { uSmNovo: [novo ? 1 : 0] }; },
    glsl: `uniform float uSmNovo[1];
    vec4 fx(vec2 uv){ vec4 pv = prv(uv), c = uSmNovo[0] > 0.5 || pv.a <= 0.0 ? tex(uv) : pv;   // sem quadro guardado ainda, vale a imagem
      if (blackbg > 0.5) c = vec4(c.rgb, 1.0);
      return c; }` }),

  // ---------- Twitch ----------
  // Nas fotos do gabarito cada controle foi mexido sozinho e nada mudou: cada tremor só aparece com o "Max" E a "Frequency" dele
  // acima de zero (os dois têm padrão 0). Então o padrão (imagem intacta) bate, e o resto foi feito pela ficha: a cada quadro, cada
  // tremor (posição, escala, opacidade, luz, separação RGB, borrão) acontece com chance = Frequency × Global Twitch e força sorteada
  // até o Max. As forças de verdade NÃO foram medidas (precisa de gabarito com Max e Frequency juntos).
  def({ id: 'twitch', name: 'Twitch', desc: 'Tremores nervosos sorteados: pulo, zoom, piscada, clarão, separação de cores e borrão.',
    params: [N('global', 'Global Twitch', 'Tremor geral', 1, 0, 1),
      N('posx', 'Max Pos X', 'Pulo máximo em X', 0, 0, 1), N('posy', 'Max Pos Y', 'Pulo máximo em Y', 0, 0, 1), N('posf', 'Pos Frequency', 'Frequência do pulo', 0, 0, 1),
      N('scale', 'Max Scale', 'Zoom máximo', 0, 0, 1), N('scalef', 'Scale Frequency', 'Frequência do zoom', 0, 0, 1),
      N('opac', 'Max Opacity', 'Apagão máximo', 0, 0, 1), N('opacf', 'Opacity Frequency', 'Frequência do apagão', 0, 0, 1),
      N('light', 'Max Light', 'Clarão máximo', 0, 0, 1), N('lightf', 'Light Frequency', 'Frequência do clarão', 0, 0, 1),
      N('rgb', 'Max RGB Shift', 'Separação RGB máxima', 0, 0, 1), N('rgbf', 'RGB Frequency', 'Frequência da separação', 0, 0, 1),
      N('blur', 'Max Blur', 'Borrão máximo', 0, 0, 1), N('blurf', 'Blur Frequency', 'Frequência do borrão', 0, 0, 1), B('blackbg', 'Black BG', 'Fundo preto')],
    glsl: RND + `float r7tw(float k, float f){ vec2 q = vec2(k, 0.0); return r7h(q, r7f()) < f * global ? r7h(q, r7f() + 1.0) : -1.0; }
    vec4 r7ts(vec2 u, float sh){ if (sh <= 0.0) return texIn(u);
      vec4 c = texIn(u); float r = texIn(u + vec2(sh, 0.0)).r, b = texIn(u - vec2(sh, 0.0)).b; return vec4(r, c.g, b, c.a); }
    vec4 fx(vec2 uv){
      float tp = r7tw(1.0, posf), tz = r7tw(2.0, scalef), to = r7tw(3.0, opacf), tl = r7tw(4.0, lightf), tr = r7tw(5.0, rgbf), tb = r7tw(6.0, blurf);
      vec2 u = uv;
      if (tz >= 0.0) u = (u - 0.5) / (1.0 + tz * scale) + 0.5;
      if (tp >= 0.0) u -= (vec2(tp, r7h(vec2(7.0, 0.0), r7f() + 2.0)) * 2.0 - 1.0) * vec2(posx, posy) * 0.5;
      float sh = tr >= 0.0 ? tr * rgb * 0.05 : 0.0;
      vec4 c;
      if (tb >= 0.0 && blur > 0.0) { float rad = tb * blur * 0.03; c = vec4(0.0);
        for (int i = 0; i < 16; i++) { float a = float(i) * 2.399963, rr = sqrt((float(i) + 0.5) / 16.0) * rad; c += r7ts(u + vec2(cos(a), sin(a) * uRes.x / uRes.y) * rr, sh); }
        c /= 16.0; }
      else c = r7ts(u, sh);
      if (tl >= 0.0) c.rgb = min(c.rgb + tl * light * c.a, vec3(c.a));
      if (to >= 0.0) c *= 1.0 - to * opac;
      if (blackbg > 0.5) c = vec4(c.rgb, 1.0);
      return c; }` }),

  // ---------- Snowy ----------
  // Neve fofa caindo por cima da imagem, que junta em cima das bordas claras (Smart Edges). Medido nas fotos: grão de diâmetro
  // mediano 4,2 px em 960 (0,44% da largura) com Size 1 e 6,5 com Size 2; algumas centenas de flocos na tela no padrão; Show Image
  // desligado deixa só a neve sobre transparente. O do Resolume tem memória (os flocos pousam e ficam); aqui é sem memória: os flocos
  // caem em camadas e a neve pousada é desenhada onde a imagem tem uma borda clara logo abaixo. Velocidade de queda, Spread (aqui:
  // o quanto os flocos derivam para os lados) e a escala do Threshold (aqui: contraste mínimo da borda) NÃO foram medidos.
  def({ id: 'snowy', name: 'Snowy', desc: 'Neve fofa caindo sobre a imagem e juntando em cima das bordas.',
    params: [N('size', 'Size', 'Tamanho', 1, 1, 2), N('speed', 'Speed', 'Velocidade', 1, 0.2, 5), N('amount', 'Amount', 'Quantidade', 10, 1, 200, 1), N('spread', 'Spread', 'Espalhar', 0.25, 0.005, 0.5, 0.005),
      N('threshold', 'Threshold', 'Limiar', 0.5, 0.25, 1), B('showimg', 'Show Image', 'Mostrar a imagem', 1), B('edges', 'Smart Edges', 'Juntar nas bordas', 1)],
    glsl: RND + `vec4 fx(vec2 uv){
      vec2 p = vec2(uv.x, (1.0 - uv.y) * uRes.y / uRes.x);
      float neve = 0.0, alvo = 500.0 * sqrt(amount / 10.0), c = 0.0317, prob = alvo / (4.0 * 0.5625 / (c * c));
      for (int k = 0; k < 4; k++) {
        float fk = float(k), v = 0.07 * speed * (0.7 + 0.2 * fk) * uRes.y / uRes.x, lado = (r7h(vec2(fk, 3.0), 77.0) - 0.5) * 4.0 * spread;
        vec2 g = (p + vec2(lado * v * uTime + fk * 0.413, -v * uTime)) / c, ci = floor(g);
        if (r7h(ci, 20.0 + fk * 8.0) >= prob) continue;
        float h1 = r7h(ci, 21.0 + fk * 8.0), h2 = r7h(ci, 22.0 + fk * 8.0), h3 = r7h(ci, 23.0 + fk * 8.0);
        float d = 0.0049 * size * (0.75 + 1.3 * h3 * h3), fol = 1.0 - d / c - 0.1;
        vec2 ce = ci + 0.5 + (vec2(h1, h2) - 0.5) * fol + vec2(sin(uTime * (0.6 + h3) + h1 * 30.0) * 0.04, 0.0);
        vec2 q = (g - ce) * c / (d * 0.5);
        float r = length(q) + 0.07 * sin(atan(q.y, q.x) * 5.0 + h2 * 20.0);
        neve = max(neve, smoothstep(1.0, 0.35, r) * 0.95);
      }
      if (edges > 0.5) {   // neve pousada: logo abaixo há um ponto bem mais claro que este
        vec2 px = 1.0 / uRes; float aqui = lum(un(tex(uv))), alt = (3.0 + 4.0 * vnoise(vec2(uv.x * uRes.x * 0.08, floor(uv.y * 40.0)))) * size * uRes.x / 960.0;
        float m = 0.0;
        for (int i = 1; i <= 4; i++) { float dy = alt * float(i) / 4.0; m = max(m, (lum(un(tex(uv - vec2(0.0, dy) * px))) - aqui) * (1.0 - 0.15 * float(i))); }
        float junta = smoothstep(0.35, 0.65, vnoise(vec2(uv.x * 14.0, floor(uv.y * 12.0) * 7.3 + floor(uTime * 0.25)))) * smoothstep(1.0, 20.0, amount * 2.0);
        neve = max(neve, smoothstep(0.2 * threshold, 0.2 * threshold + 0.08, m) * junta * 0.95);
      }
      vec4 b = showimg > 0.5 ? tex(uv) : vec4(0.0);
      return b * (1.0 - neve) + vec4(vec3(0.96) * neve, neve); }` }),

  // ---------- Sparkles ----------
  // Faíscas (estrelinhas de 4 pontas, miolo branco e brilho da cor do Color) somadas por cima da imagem; nascem nas bordas e
  // detalhes dela (medido: ficam junto das letras, linhas, círculo e da foto; com Threshold baixo, mais dentro da foto) e, com Move,
  // se afastam um pouco. Medido: diâmetro mediano 3 px em 960 com Size 1 e 5,3 com Size 2; Color é a matiz (0 vermelho, 0,5 ciano);
  // menos faíscas na tela quanto maior o Speed (vivem menos); ~60 com Amount 1, ~260 com 10, ~2700 com 2500. Texture Input desenha
  // a imagem inteira em miniatura no lugar da estrelinha. Show Image desligado deixa só as faíscas sobre transparente.
  // O do Resolume tem memória; aqui cada casa de uma grade sorteia um ponto de borda por ciclo. Spawn Mode Manual: a ficha não tem
  // botão de disparo, então aqui só para de nascer faísca. A escala do Threshold e o caminho das faíscas NÃO foram medidos.
  def({ id: 'sparkles', name: 'Sparkles', desc: 'Faíscas que nascem nas bordas e detalhes da imagem.',
    params: [L('sprite', 'Texture', 'Textura', ['Sparkle', 'Input'], ['Faísca', 'Imagem']), L('spawn', 'Spawn Mode', 'Nascimento', ['Auto', 'Manual'], ['Automático', 'Manual']),
      N('size', 'Size', 'Tamanho', 1, 1, 2), N('color', 'Color', 'Cor', 0, 0, 0.999, 0.001), N('speed', 'Speed', 'Velocidade', 1, 0.2, 5), N('amount', 'Amount', 'Quantidade', 10, 1, 2500, 1),
      N('spread', 'Spread', 'Espalhar', 0.25, 0.005, 0.5, 0.005), N('threshold', 'Threshold', 'Limiar', 128, 64, 255, 1), B('move', 'Move', 'Mover', 1), B('showimg', 'Show Image', 'Mostrar a imagem', 1)],
    glsl: RND + `float r7borda(vec2 u){ vec2 d = 2.0 / uRes; float a = lum(un(tex(u))); return abs(a - lum(un(tex(u + vec2(d.x, 0.0))))) + abs(a - lum(un(tex(u + vec2(0.0, d.y))))); }
    vec4 fx(vec2 uv){
      vec4 base = showimg > 0.5 ? tex(uv) : vec4(0.0);
      if (spawn > 0.5) return base;
      float asp = uRes.y / uRes.x; vec2 p = vec2(uv.x, uv.y * asp);
      float alvo = 110.0 * sqrt(amount), c = clamp(sqrt(0.5625 / (2.5 * alvo)), 0.006, 0.06);
      float spr = sprite > 0.5 ? 0.02 * size : 0.0;   // meio lado da miniatura
      if (sprite > 0.5) c = max(c, 0.07 * size);
      vec2 ci = floor(p / c);
      float fase = r7h(ci, 40.0), T = 1.6 / speed, tt = uTime / T + fase, ciclo = floor(tt), ph = tt - ciclo, k0 = 50.0 + mod(ciclo, 512.0) * 16.0;
      float thr = pow(threshold / 255.0, 2.0) * 0.5, melhor = -1.0; vec2 pos = vec2(0.0);
      float mg = sprite > 0.5 ? spr / c + 0.05 : 0.22;
      for (int i = 0; i < 8; i++) { vec2 h = vec2(r7h(ci, k0 + float(i)), r7h(ci + 91.0, k0 + float(i)));
        vec2 cand = (ci + mg + h * (1.0 - 2.0 * mg)) * c; float e = r7borda(vec2(cand.x, cand.y / asp));
        if (e > thr && e > melhor) { melhor = e; pos = cand; } }
      if (melhor < 0.0) return base;
      if (move > 0.5) { float a = r7h(ci, k0 + 9.0) * 6.2832; pos += vec2(cos(a), sin(a)) * min(spread * 0.06, c * (mg - 0.04)) * ph; }
      float env = sin(3.14159 * ph); env *= env;
      vec2 q = p - pos; vec3 luz;
      vec3 tinta = hsv2rgb(vec3(color, 1.0, 1.0));
      if (sprite > 0.5) { vec2 l = q / (2.0 * spr) + 0.5; if (l.x < 0.0 || l.x > 1.0 || l.y < 0.0 || l.y > 1.0) return base;
        luz = tex(l).rgb * mix(vec3(1.0), tinta, 0.35) * env * 0.9; }
      else { float s = 0.0012 * size, r = length(q) / s;
        float nucleo = exp(-r * r * 0.9), halo = exp(-r * 0.9) * 0.55;
        float raio = (exp(-abs(q.x) / (s * 0.22)) * exp(-abs(q.y) / (s * 1.6)) + exp(-abs(q.y) / (s * 0.22)) * exp(-abs(q.x) / (s * 1.6))) * 0.8;
        luz = (vec3(nucleo) + tinta * (halo + raio)) * env; }
      luz = clamp(luz, 0.0, 1.0);
      float a = max(base.a, max(luz.r, max(luz.g, luz.b)));
      return vec4(min(base.rgb + luz, vec3(1.0)), a); }` }),

  // ---------- Particle System ----------
  // No Resolume a imagem some e sai um jato de cópias dela (a imagem inteira em cada partícula), sobre transparente. As fotos do
  // gabarito pegaram o jato sempre no meio de uma mudança (cada troca de valor recomeça o jato), então servem para o sentido de
  // cada controle, não para números finos. Tirado delas: posição 1 = uma tela inteira (−0,5 em X ou Y põe o emissor na borda
  // esquerda / de cima); Y, Gravity e as velocidades em Y positivas descem; Wind negativo vai para a esquerda; Z positivo vem para
  // perto (maior); Friction ≥ 0,25 deixa tudo parado no emissor; a maior partícula no padrão tem ~0,26 da tela (Scale 0,15).
  // Velocidades, Gravity e Wind são por quadro (1/60 s), como a faixa da ficha sugere. Scale Delta e Opacity Delta: aqui a partícula
  // perde essa fração do tamanho / da opacidade ao longo da vida (NÃO medido). Spawn Mode Manual: sem botão de disparo na ficha,
  // só para de nascer. A conta é uma simulação de verdade, feita no programa (até 256 partículas) e desenhada pelo shader.
  def({ id: 'particlesystem', name: 'Particle System', desc: 'Troca a imagem por um jato de cópias dela, com velocidade, giro, gravidade e vento.',
    params: [N('n', 'Particles', 'Partículas', 64, 0, 256, 1), N('life', 'Lifetime', 'Tempo de vida', 3.5, 0, 10, 0.05, ' s'), L('spawn', 'Spawn Mode', 'Nascimento', ['Auto', 'Manual'], ['Automático', 'Manual']),
      N('px', 'X Pos', 'Posição X', 0, -1, 1), N('py', 'Y Pos', 'Posição Y', 0, -1, 1), N('pz', 'Z Pos', 'Posição Z', 0, -1, 1),
      N('vx0', 'X Vel Min', 'Velocidade X mínima', -0.002, -0.02, 0.02, 0.0005), N('vx1', 'X Vel Max', 'Velocidade X máxima', 0.002, -0.02, 0.02, 0.0005),
      N('vy0', 'Y Vel Min', 'Velocidade Y mínima', -0.002, -0.02, 0.02, 0.0005), N('vy1', 'Y Vel Max', 'Velocidade Y máxima', 0.002, -0.02, 0.02, 0.0005),
      N('vz0', 'Z Vel Min', 'Velocidade Z mínima', 0, -0.02, 0.02, 0.0005), N('vz1', 'Z Vel Max', 'Velocidade Z máxima', 0, -0.02, 0.02, 0.0005),
      N('r0', 'Rotate Min', 'Giro mínimo', 0, -5, 5, 0.05), N('r1', 'Rotate Max', 'Giro máximo', 0, -5, 5, 0.05),
      N('s0', 'Scale Min', 'Escala mínima', 0.1, 0, 0.25, 0.005), N('s1', 'Scale Max', 'Escala máxima', 0.15, 0, 0.25, 0.005),
      N('sd', 'Scale Delta', 'Perda de escala', 0.93, 0, 1), N('od', 'Opacity Delta', 'Perda de opacidade', 0.93, 0, 1), N('inherit', 'Inherit Vel', 'Herdar velocidade', 0, 0, 1),
      N('grav', 'Gravity', 'Gravidade', 0, -0.002, 0.002, 0.0001), N('wind', 'Wind', 'Vento', 0, -0.002, 0.002, 0.0001), N('fric', 'Friction', 'Atrito', 0, 0, 1)],
    uniforms: (v) => r7particulas(v),
    glsl: `uniform float uPa[256]; uniform float uPb[256]; uniform float uPn[1];
    vec4 fx(vec2 uv){
      vec2 P = vec2(uv.x, 1.0 - uv.y) - 0.5; vec4 o = vec4(0.0); int n = int(uPn[0] + 0.5);
      for (int i = 0; i < 256; i++) { if (i >= n) break;
        float a = uPa[i], qy = floor(a / 4096.0), qx = a - qy * 4096.0;
        float b = uPb[i], qo = floor(b / 262144.0), rb = b - qo * 262144.0, qr = floor(rb / 1024.0), qs = rb - qr * 1024.0;
        float wf = qs / 1023.0; wf = wf * wf * 8.0; if (wf <= 0.0) continue;
        vec2 d = (P - (vec2(qx, qy) / 4095.0 * 3.0 - 1.5)) * uRes, hs = wf * uRes * 0.5;
        if (dot(d, d) > dot(hs, hs)) continue;
        d = rot2(d, -qr / 256.0 * 6.2831853);
        if (abs(d.x) > hs.x || abs(d.y) > hs.y) continue;
        vec4 s = tex(vec2(d.x / (2.0 * hs.x) + 0.5, 0.5 - d.y / (2.0 * hs.y))) * (qo / 63.0);
        o = o * (1.0 - s.a) + s; }
      return o; }` }),
];
