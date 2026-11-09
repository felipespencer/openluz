// Texto com IA (plano 02-06): monta o pedido, valida a resposta e aplica uma versão no clipe de texto.
// A IA só devolve dados no formato de SCHEMA; quem desenha é o OpenLuz (text.js), e tudo fica editável à mão.
// O pedido vai pelo processo principal (ia-main.js), onde fica a chave.
import { STYLES, textDefaults, fontCss, EM, layoutText } from './text.js';
import { SHAPES, BEATS } from './beat.js';
import { PRESETS, presetsParaIA } from './text-presets.js';

export const FUNCOES = [['diagramar', 'Diagramar'], ['animar', 'Animar'], ['escrever', 'Escrever'], ['separar', 'Separar em clipes']];
export const ESTILOS = [['rua', 'Cartaz de rua'], ['limpo', 'Limpo'], ['mao', 'Escrito à mão'], ['ia', 'A IA escolhe']];
const ESTILO_TXT = { rua: 'cartaz de rua: letras grossas e condensadas, contraste forte, hierarquia marcada', limpo: 'limpo: poucas fontes sem serifa, muito respiro, cores sóbrias', mao: 'escrito à mão: fontes de caligrafia ou manuscritas, tom informal', ia: 'escolha o estilo que combina com o texto' };
const VALORES = ['aOpacity', 'aScale', 'aY', 'aX', 'aRot'];
const FORMAS = SHAPES.map(([k]) => k).filter(k => k !== 'fft');
const RANGES = ['all', 'lines', 'words', 'chars'], ORDERS = ['front', 'back', 'random'];

// formato da resposta (JSON Schema): três versões, cada uma com as linhas e o que mais a IA pode mudar
const LINHA = { type: 'object', additionalProperties: false, required: ['texto', 'fonte', 'estilo', 'tamanho', 'cor', 'espaco'], properties: {
  texto: { type: 'string' }, fonte: { type: 'string' }, estilo: { type: 'string', enum: STYLES }, tamanho: { type: 'number' }, cor: { type: 'string' }, espaco: { type: 'number' } } };
const ANIMAR = { type: 'object', additionalProperties: false, required: ['ligado', 'pedacos', 'ordem', 'atraso', 'valor', 'forma', 'batidas', 'de', 'ate'], properties: {
  ligado: { type: 'boolean' }, pedacos: { type: 'string', enum: RANGES }, ordem: { type: 'string', enum: ORDERS }, atraso: { type: 'number' },
  valor: { type: 'string', enum: VALORES }, forma: { type: 'string', enum: FORMAS }, batidas: { type: 'number' }, de: { type: 'number' }, ate: { type: 'number' } } };
const VERSAO = { type: 'object', additionalProperties: false, required: ['nome', 'linhas', 'alinhar', 'vertical', 'contorno', 'corContorno', 'brilhoFora', 'animar', 'clipes'], properties: {
  nome: { type: 'string' }, linhas: { type: 'array', items: LINHA }, alinhar: { type: 'string', enum: ['left', 'center', 'right'] }, vertical: { type: 'string', enum: ['top', 'center', 'bottom'] },
  contorno: { type: 'number' }, corContorno: { type: 'string' }, brilhoFora: { type: 'number' }, animar: ANIMAR, clipes: { type: 'array', items: { type: 'string' } } } };
export const SCHEMA = { type: 'object', additionalProperties: false, required: ['versoes'], properties: { versoes: { type: 'array', items: VERSAO } } };

// fontes que a IA pode usar: as instaladas, filtradas para as que servem para cartaz (sem símbolos nem asiáticas)
export function fontesParaIA(todas) {
  const fora = /emoji|symbol|wingding|webdings|marlett|mdl2|fluent|icons|math|mingliu|simsun|gothic|yahei|jhenghei|malgun|yu |batang|gulim|nirmala|ebrima|gadugi|javanese|myanmar|mongolian|himalaya|tai le|tai lue|phagspa|yi baiti|sylfaen|leelawadee|kufi|naskh|arabic|hebrew|david|miriam|nachlieli|frank ru|amiri|scheherazade|alef|lao|armenian|georgian|lisu|cambria math|opensymbol|zwadobe|historic/i;
  const boas = todas.filter(f => !fora.test(f));
  // as fontes dos estilos prontos vão na frente (a IA tende a ficar nas primeiras da lista; em ordem alfabética, era o Arial)
  const deEstilo = new Set(PRESETS.flatMap(p => [...p.dest.f, ...p.apoio.f]).map(f => f.toLowerCase()));
  const frente = boas.filter(f => deEstilo.has(f.toLowerCase())), resto = boas.filter(f => !deEstilo.has(f.toLowerCase()) && !/^arial$/i.test(f));
  return [...frente, ...resto, ...boas.filter(f => /^arial$/i.test(f))].slice(0, 80);
}

export function montarPedido({ texto, funcoes, estilo, fontes, atual, bpm }) {
  const f = new Set(funcoes);
  const system = [
    'Você diagrama textos para projeção em shows, festas e eventos de rua, no programa OpenLuz (como o Text Block e o Text Animator do Resolume).',
    'A tela tem 1920 x 1080 px. Tamanho 1 = letra com 93 px de altura de maiúscula; vai de 0.5 a 10. Um título forte costuma ter de 1.5 a 3; linhas de apoio de 0.6 a 1.2.',
    'Cada linha do texto tem fonte, estilo (' + STYLES.join(', ') + '), tamanho, cor (#rrggbbaa) e espaço extra entre as letras (px no tamanho 1; 0 é o normal, use de -5 a 20).',
    'Use só estas fontes, escritas exatamente assim: ' + fontes.join(', ') + '.',
    'O texto inteiro precisa caber na tela: some os tamanhos e veja se as linhas cabem em 1080 px de altura (cada linha ocupa uns 148 px por unidade de tamanho) e se a linha mais comprida cabe em 1920 px.',
    'O fundo da projeção é PRETO: nada de texto preto ou cinza escuro (some na tela); use cores claras ou fortes.',
    'Cada versão leva TODA a informação do texto (datas, horários, preços, nomes): pode reorganizar, nunca cortar.',
    'contorno vai de 0 a 1 (0 = sem contorno); brilhoFora de 0 a 1; corContorno é a cor dos dois.',
    'animar: quando ligado, cada pedaço (all, lines, words, chars) recebe a animação com atraso (ms) um depois do outro, na ordem (front, back, random). valor é o que anima:',
    'aOpacity (de 0 a 1), aScale (de 0 a 3), aY ou aX (px, de -1080 a 1080), aRot (radianos). forma é o desenho da animação na batida (' + FORMAS.join(', ') + '), batidas é quanto dura um ciclo (' + BEATS.join(', ') + '); o valor vai de "de" até "ate". O BPM agora é ' + bpm + '.',
    'Bom cartaz: uma palavra ou linha de destaque bem maior (2,5 a 3,5) e o apoio pequeno (0,7 a 1,3); no máximo duas fontes e duas ou três cores por versão; caixa alta no que é título; contraste de peso (Black com Regular).',
    'Evite Arial, Calibri, Segoe UI e Times: prefira as fontes do começo da lista, que são de cartaz.',
    'Estes são os estilos prontos do programa; parta de um deles em cada versão (um diferente em cada uma) e adapte ao texto:',
    presetsParaIA(),
    'Devolva exatamente 3 versões diferentes entre si, cada uma com um nome curto (uma ou duas palavras, em português; pode ser o nome do estilo de partida).',
  ].join('\n');
  const regras = [];
  regras.push(f.has('escrever') ? '- ESCREVER: o texto abaixo é um pedido; escreva você o texto do cartaz (curto, em português, a não ser que o pedido diga outra língua).' : '- Não reescreva: use as palavras do texto abaixo (pode quebrar em linhas, mudar maiúsculas e tirar pontuação).');
  regras.push(f.has('diagramar') ? '- DIAGRAMAR: quebre em linhas com hierarquia, como um cartaz: o mais importante grande, o resto menor; fontes e cores com intenção. Estilo: ' + ESTILO_TXT[estilo] + '.' : '- Não diagrame: uma linha por linha do texto, todas com fonte ' + atual.font + ', estilo ' + atual.style + ', tamanho ' + atual.size + ' e cor ' + atual.color + '.');
  regras.push(f.has('animar') ? '- ANIMAR: ligue animar e escolha uma animação que combine com o texto e com a batida.' : '- Não anime: animar.ligado = false.');
  regras.push(f.has('separar') ? '- SEPARAR EM CLIPES: ponha em "clipes" o texto dividido em frases curtas, uma por clipe, na ordem (cada frase vira um clipe na grade, com o mesmo estilo). As "linhas" mostram só a primeira frase.' : '- "clipes" fica vazio.');
  const user = 'Regras:\n' + regras.join('\n') + '\n\nTEXTO:\n' + String(texto || '').trim() + '\n---';
  return { system, user, schema: SCHEMA };
}

// confere e limpa uma versão: o que vier fora da faixa ou desconhecido vira o valor seguro
const num = (v, a, b, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
const cor = (v, d) => { const s = String(v || '').trim(); return /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(s) ? (s.length === 7 ? s + 'ff' : s).toLowerCase() : d; };
// fundo preto: cor de letra escura demais (azul puro, cinza escuro) é clareada até aparecer, mantendo o tom
function clara(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16), a = hex.slice(7, 9);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum >= 0.22) return hex;
  const k = (0.3 - lum) / (1 - lum);   // mistura com branco até a luminância 0,3
  const m = (c) => Math.round(c + (255 - c) * k).toString(16).padStart(2, '0');
  return '#' + m(r) + m(g) + m(b) + a;
}
export function validarVersoes(r, fontes) {
  if (!r || !Array.isArray(r.versoes)) throw new Error('a resposta não trouxe versões');
  const ok = new Map(fontes.map(f => [f.toLowerCase(), f]));
  const out = r.versoes.slice(0, 3).map((v, i) => {
    const linhas = (Array.isArray(v.linhas) ? v.linhas : []).filter(l => l && String(l.texto || '').trim()).slice(0, 12).map(l => ({
      texto: String(l.texto).replace(/\s+/g, ' ').trim().slice(0, 200),
      fonte: ok.get(String(l.fonte || '').toLowerCase()) || 'Arial', estilo: STYLES.includes(l.estilo) ? l.estilo : 'Bold',
      tamanho: num(l.tamanho, 0.5, 10, 1), cor: clara(cor(l.cor, '#ffffffff')), espaco: num(l.espaco, -10, 30, 0) }));   // espaço: os modelos pequenos espalham as letras (50 a 150)
    const a = v.animar || {};
    return {
      nome: String(v.nome || 'Versão ' + (i + 1)).slice(0, 24), linhas,
      alinhar: ['left', 'center', 'right'].includes(v.alinhar) ? v.alinhar : 'center', vertical: ['top', 'center', 'bottom'].includes(v.vertical) ? v.vertical : 'center',
      contorno: num(v.contorno, 0, 1, 0), corContorno: cor(v.corContorno, '#000000ff'), brilhoFora: num(v.brilhoFora, 0, 1, 0),
      animar: { ligado: !!a.ligado, pedacos: RANGES.includes(a.pedacos) ? a.pedacos : 'chars', ordem: ORDERS.includes(a.ordem) ? a.ordem : 'front', atraso: num(a.atraso, 0, 2000, 100),
        valor: VALORES.includes(a.valor) ? a.valor : 'aOpacity', forma: FORMAS.includes(a.forma) ? a.forma : '4floor', batidas: BEATS.includes(Number(a.batidas)) ? Number(a.batidas) : 4, de: Number(a.de) || 0, ate: Number.isFinite(Number(a.ate)) ? Number(a.ate) : 1 },
      clipes: (Array.isArray(v.clipes) ? v.clipes : []).map(x => String(x).trim()).filter(Boolean).slice(0, 64),
    };
  }).filter(v => v.linhas.length);
  if (!out.length) throw new Error('nenhuma versão veio com texto');
  return out;
}
const FAIXA = { aOpacity: [0, 1], aScale: [0, 10], aY: [-1080, 1080], aX: [-1920, 1920], aRot: [-Math.PI, Math.PI] };

// aplica a versão no clipe: o texto vira linhas com estilo próprio; com animação, o clipe vira Text Animator com ♪ no valor
// o Text Animator não quebra linha (como no Resolume): a versão que anima já vem com as linhas compridas quebradas por palavra
let mctx = null;
function quebrar(linhas, largura = 1800) {
  mctx = mctx || document.createElement('canvas').getContext('2d');
  const out = [];
  for (const l of linhas) {
    mctx.font = fontCss({ font: l.fonte, style: l.estilo }, EM * l.tamanho);
    const larg = (x) => mctx.measureText(x).width + (l.espaco || 0) * l.tamanho * Math.max(0, x.length - 1);
    let cur = '';
    for (const w of l.texto.split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && larg(t) > largura) { out.push({ ...l, texto: cur }); cur = w; } else cur = t; }
    out.push({ ...l, texto: cur });
  }
  return out;
}
export function aplicarVersao(clip, v, texto = null) {
  const anima = v.animar.ligado || clip.text.animator;
  const base = textDefaults(anima);
  let linhas = texto != null ? [{ ...v.linhas[0], texto }] : v.linhas;
  if (anima) linhas = quebrar(linhas);
  const t = { ...base, font: linhas[0].fonte, style: linhas[0].estilo, size: linhas[0].tamanho, color: linhas[0].cor, spacingX: linhas[0].espaco,
    content: linhas.map(l => l.texto).join('\n'), lines: linhas.map(l => ({ font: l.fonte, style: l.estilo, size: l.tamanho, color: l.cor, spacingX: l.espaco })),
    align: v.alinhar, valign: v.vertical, outlineWidth: v.contorno, outlineColor: v.corContorno, glowOut: v.brilhoFora, ia: v.nome };
  const panim = {};
  if (v.animar.ligado) {
    const a = v.animar, [lo, hi] = FAIXA[a.valor];
    Object.assign(t, { animated: true, range: a.pedacos, order: a.ordem, delay: a.atraso });
    panim[a.valor] = { shape: a.forma, beats: a.batidas, min: Math.min(hi, Math.max(lo, a.de)), max: Math.min(hi, Math.max(lo, a.ate)) };
  }
  caber(t);
  clip.text = t; clip.panim = panim; clip.animHist = null;
  return clip;
}
// encaixe: a IA erra a conta do tamanho; mede o desenho e diminui todas as linhas juntas até caber (92 % da altura, 95 % da largura)
function caber(t, W = 1920, H = 1080) {
  mctx = mctx || document.createElement('canvas').getContext('2d');
  for (let k = 0; k < 4; k++) {
    const L = layoutText(mctx, t, W, H); if (!L.glyphs.length) return;
    const hgt = Math.max(...L.glyphs.map(g => g.b)) - Math.min(...L.glyphs.map(g => g.t)), wid = Math.max(...L.glyphs.map(g => g.r)) - Math.min(...L.glyphs.map(g => g.l));
    const f = Math.min(1, 0.92 * H / hgt, 0.95 * W / wid);
    if (f > 0.98) return;
    t.size = Math.max(0.5, t.size * f); for (const l of t.lines) l.size = Math.max(0.5, Math.round(l.size * f * 100) / 100);
  }
}
