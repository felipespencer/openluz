// Estilos prontos do Text Block (maquete presets-texto-mockup.html, aprovada em 2026-11-07).
// Cada estilo quebra o texto (a palavra forte fica grande) e dá fonte, cor, tamanho e espaço ao "destaque" e ao "apoio";
// sai no mesmo formato de versão do ✦ Montar com IA (ia.js), então é aplicado por aplicarVersao e fica editável à mão.
// Só usa o que o Text Block já desenha. Fontes: a primeira da lista que estiver instalada; senão, a de reserva.

// esp = espaço entre letras em fração do em (o Text Block usa px no tamanho 1: em = 128 px)
export const PRESETS = [
  { id: 'lambe', nome: 'Lambe-lambe', desc: 'Cartaz de rua: caixa alta, letra grossa, amarelo e branco.', quebra: 'destaque',
    apoio: { f: ['Archivo Black', 'Archivo', 'Impact'], e: 'Black', c: '#ffffffff', t: 0.9, caixa: 1, esp: -0.01 },
    dest: { f: ['Archivo Black', 'Archivo', 'Impact'], e: 'Black', c: '#ffd400ff', t: 3.2, caixa: 1, esp: -0.03 } },
  { id: 'neon', nome: 'Neon', desc: 'Letra fina com brilho em volta, ciano e magenta; pisca na batida.', quebra: 'destaque',
    apoio: { f: ['Michroma', 'Bahnschrift', 'Segoe UI'], e: 'Regular', c: '#7ff6ffff', t: 0.8, caixa: 1, esp: 0.12 },
    dest: { f: ['Bricolage Grotesque 96pt', 'Bricolage Grotesque', 'Rubik', 'Segoe UI'], e: 'Black', c: '#ff4fd8ff', t: 2.8, caixa: 1, esp: 0.02 },
    brilho: { cor: '#ff2bd0ff', forca: 0.7 },
    anim: { pedacos: 'all', valor: 'aOpacity', forma: 'lfo', batidas: 4, de: 0.55, ate: 1, atraso: 0 } },
  { id: 'protesto', nome: 'Protesto', desc: 'Palavras de ordem: uma por linha, branco e o destaque em vermelho.', quebra: 'palavras',
    apoio: { f: ['Black Ground', 'Ground Black', 'Anybody', 'Impact'], e: 'Black', c: '#ffffffff', t: 1.5, caixa: 1, esp: 0 },
    dest: { f: ['Black Ground', 'Ground Black', 'Anybody', 'Impact'], e: 'Black', c: '#ff2a2aff', t: 2.6, caixa: 1, esp: 0 },
    contorno: { cor: '#ffffffff', largura: 0.12 } },
  { id: 'festa', nome: 'Festa', desc: 'Passion One rosa e amarelo; cada palavra pula na batida.', quebra: 'destaque',
    apoio: { f: ['Passion One', 'Impact'], e: 'Bold', c: '#ffe14dff', t: 1.3, caixa: 0, esp: 0 },
    dest: { f: ['Passion One', 'Impact'], e: 'Bold', c: '#ff3c9eff', t: 3.4, caixa: 1, esp: 0 },
    anim: { pedacos: 'words', valor: 'aScale', forma: '1floor', batidas: 1, de: 1, ate: 1.12, atraso: 120 } },
  { id: 'elegante', nome: 'Elegante', desc: 'Serifa itálica dourada e linha de apoio pequena bem espaçada.', quebra: 'destaque',
    apoio: { f: ['EB Garamond', 'Georgia'], e: 'Regular', c: '#e8d6b0ff', t: 0.7, caixa: 1, esp: 0.35 },
    dest: { f: ['EB Garamond', 'Georgia'], e: 'Italic', c: '#e8c27aff', t: 3, caixa: 0, esp: 0 } },
  { id: 'letreiro', nome: 'Letreiro', desc: 'Slab grossa laranja com contorno claro, como fachada de bar.', quebra: 'destaque',
    apoio: { f: ['Alfa Slab One', 'Rockwell', 'Georgia'], e: 'Regular', c: '#fff3dfff', t: 1, caixa: 1, esp: 0.02 },
    dest: { f: ['Alfa Slab One', 'Rockwell', 'Georgia'], e: 'Regular', c: '#ff7a1aff', t: 3, caixa: 1, esp: 0.01 },
    contorno: { cor: '#fff3dfff', largura: 0.1 } },
  { id: 'cordel', nome: 'Cordel', desc: 'Xilogravura: fonte de cordel em creme sobre o preto.', quebra: 'meio',
    apoio: { f: ['Xilosa', 'Cratense', 'Alfa Slab One'], e: 'Regular', c: '#f3e6c4ff', t: 1.6, caixa: 1, esp: 0.02 },
    dest: { f: ['Xilosa', 'Cratense', 'Alfa Slab One'], e: 'Regular', c: '#f3e6c4ff', t: 2.6, caixa: 1, esp: 0.02 } },
  { id: 'manuscrito', nome: 'Manuscrito', desc: 'Grande escrito à mão, com uma linha pequena de apoio.', quebra: 'destaque',
    apoio: { f: ['Rubik', 'Segoe UI'], e: 'Bold', c: '#ffffffff', t: 0.75, caixa: 1, esp: 0.25 },
    dest: { f: ['Yesteryear', 'Segoe Script', 'Ink Free'], e: 'Regular', c: '#ffd9a8ff', t: 3.4, caixa: 0, esp: 0 } },
  { id: 'tecno', nome: 'Tecno', desc: 'Largo e espaçado, brilho azul; as letras entram uma depois da outra.', quebra: 'iguais',
    apoio: { f: ['Michroma', 'Bahnschrift', 'Segoe UI'], e: 'Regular', c: '#e6f7ffff', t: 1.05, caixa: 1, esp: 0.22 },
    dest: { f: ['Michroma', 'Bahnschrift', 'Segoe UI'], e: 'Regular', c: '#ffffffff', t: 1.6, caixa: 1, esp: 0.22 },
    brilho: { cor: '#5fb8ffff', forca: 0.5 },
    anim: { pedacos: 'chars', valor: 'aOpacity', forma: '1floor', batidas: 4, de: 1, ate: 0, atraso: 60 } },
];

// quebra: "destaque" põe a palavra forte (a primeira toda em maiúsculas, ou a última) sozinha numa linha grande;
// "palavras" uma palavra por linha; "meio" duas linhas (a de baixo é o destaque); "iguais" 2 ou 3 linhas parecidas.
// Texto que já vem com várias linhas: cada linha fica como está e a mais curta em maiúsculas (ou a última) é o destaque.
export function quebrar(txt, modo) {
  const brutas = String(txt || '').split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!brutas.length) return [];
  const forte = (x) => x.length > 2 && x === x.toUpperCase() && /[A-ZÀ-Ý]/.test(x);
  if (brutas.length > 1) {
    let iD = brutas.findIndex(forte); if (iD < 0) iD = brutas.length - 1;
    return brutas.map((s, i) => ({ s, d: i === iD }));
  }
  const w = brutas[0].split(' ');
  let iD = w.findIndex(forte); if (iD < 0) iD = w.length - 1;
  if (w.length === 1) return [{ s: w[0], d: true }];
  if (modo === 'palavras') return w.map((s, i) => ({ s, d: i === iD }));
  if (modo === 'meio') { const m = Math.ceil(w.length / 2); return [{ s: w.slice(0, m).join(' '), d: false }, { s: w.slice(m).join(' '), d: true }]; }
  if (modo === 'iguais') {
    const n = w.length > 4 ? 3 : 2, k = Math.ceil(w.length / n), out = [];
    for (let i = 0; i < w.length; i += k) out.push({ s: w.slice(i, i + k).join(' '), d: false });
    out[out.length - 1].d = true; return out;
  }
  const antes = w.slice(0, iD).join(' '), depois = w.slice(iD + 1).join(' '), out = [];
  if (antes) out.push({ s: antes, d: false }); out.push({ s: w[iD], d: true }); if (depois) out.push({ s: depois, d: false });
  return out;
}

function escolherFonte(lista, instaladas) {
  const tem = new Map(instaladas.map(f => [f.toLowerCase(), f]));
  for (const f of lista) { const k = tem.get(f.toLowerCase()); if (k) return k; }
  for (const f of lista) { const k = instaladas.find(x => x.toLowerCase().startsWith(f.toLowerCase())); if (k) return k; }
  return 'Arial';
}

// estilo + texto -> versão no formato do ia.js (validarVersoes/aplicarVersao)
export function versaoDoPreset(p, texto, instaladas) {
  const linhas = quebrar(texto, p.quebra).map(({ s, d }) => {
    const e = d ? p.dest : p.apoio;
    return { texto: e.caixa ? s.toLocaleUpperCase('pt-BR') : s, fonte: escolherFonte(e.f, instaladas), estilo: e.e, tamanho: e.t, cor: e.c, espaco: Math.round(e.esp * 128) };
  });
  const a = p.anim;
  return {
    nome: p.nome, linhas, alinhar: 'center', vertical: 'center',
    contorno: p.contorno ? p.contorno.largura : 0, corContorno: p.contorno ? p.contorno.cor : p.brilho ? p.brilho.cor : '#000000ff', brilhoFora: p.brilho ? p.brilho.forca : 0,
    animar: a ? { ligado: true, pedacos: a.pedacos, ordem: 'front', atraso: a.atraso, valor: a.valor, forma: a.forma, batidas: a.batidas, de: a.de, ate: a.ate }
      : { ligado: false, pedacos: 'chars', ordem: 'front', atraso: 100, valor: 'aOpacity', forma: '4floor', batidas: 4, de: 0, ate: 1 },
    clipes: [], preset: p.id,
  };
}

// resumo para o pedido da IA: ela parte destes estilos em vez de começar do zero
export function presetsParaIA() {
  return PRESETS.map(p => `${p.nome}: ${p.desc} Destaque em ${p.dest.f[0]} ${p.dest.e} ${p.dest.c.slice(0, 7)} tamanho ${p.dest.t}; apoio em ${p.apoio.f[0]} ${p.apoio.e} ${p.apoio.c.slice(0, 7)} tamanho ${p.apoio.t}` +
    (p.contorno ? `; contorno ${p.contorno.largura} ${p.contorno.cor.slice(0, 7)}` : '') + (p.brilho ? `; brilhoFora ${p.brilho.forca} cor ${p.brilho.cor.slice(0, 7)}` : '') +
    (p.anim ? `; anima ${p.anim.valor} por ${p.anim.pedacos} na forma ${p.anim.forma}` : '') + '.').join('\n');
}
