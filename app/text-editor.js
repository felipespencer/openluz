// ✎ Editar texto (plano 09-01, maquete editor-texto-mockup.html aprovada em 2026-11-07): editor do clipe "Texto" no jeito do Canva.
// Palco 16:9 desenhado por cartaz.js (o mesmo desenho da projeção), caixas por cima para selecionar, mover, aumentar e girar;
// dois cliques escrevem (cor e fonte por pedaço selecionado); barra de cima, abas Estilos/Fontes/Efeitos/Animar, lista das caixas.
import { novaCaixa, layoutCaixa, desenharCartaz, desenharCaixa, EFEITOS, ANIMS, POR, BATIDAS, FUNDOS, ESTILOS_CARTAZ, caixasDoEstilo, textoDe } from './cartaz.js';
import { listFonts } from './text.js';

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const COMBOS = [['Archivo', 'Rubik'], ['Alfa Slab One', 'Michroma'], ['EB Garamond', 'Bahnschrift'], ['Passion One', 'Rubik'], ['Yesteryear', 'Michroma'], ['Black Ground', 'Anybody']];
const PREFERIDAS = ['Archivo', 'Archivo Black', 'Passion One', 'Michroma', 'Alfa Slab One', 'Bricolage Grotesque 96pt', 'Anybody', 'Rubik', 'EB Garamond', 'Yesteryear', 'Xilosa', 'Cratense', 'Black Ground', 'Impact', 'Bahnschrift'];
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class EditorTexto {
  constructor(ctx) { this.ctx = ctx; this.open = false; }

  async abrir(clip) {
    if (this.open || this.abrindo) return;
    this.abrindo = true;   // a lista de fontes demora na primeira vez: um segundo clique nesse meio-tempo não abre outro editor
    this.clip = clip; this.t = JSON.parse(JSON.stringify(clip.text)); this.sel = this.t.caixas.length ? this.t.caixas.length - 1 : -1;
    this.aba = 'estilos'; this.hist = [JSON.stringify(this.t)]; this.hi = 0; this.editando = -1; this.busca = '';
    try { this.fontes = (await listFonts()).filter(f => !/emoji|symbol|wingding|webdings|marlett|mdl2|fluent|icons|math/i.test(f)); } catch (e) { this.abrindo = false; throw e; }
    this.fontes = [...PREFERIDAS.filter(f => this.fontes.includes(f)), ...this.fontes.filter(f => !PREFERIDAS.includes(f))];
    this.open = true; this.abrindo = false; this.montar(); this.tudo();
    const loop = () => { if (!this.open) return; this.palco(); this.raf = requestAnimationFrame(loop); }; loop();
  }
  fechar(aplicar) {
    if (!this.open) return;
    if (this.editando >= 0) this.fimEdicao();
    if (aplicar) this.ctx.aplicar(this.clip, this.t);
    this.open = false; cancelAnimationFrame(this.raf); this.root.remove(); removeEventListener('keydown', this.onKey, true);
  }
  get k() { return this.t.caixas[this.sel]; }
  // desfazer dentro do editor: uma foto por mudança (arrastar conta uma)
  marca() { const s = JSON.stringify(this.t); if (s === this.hist[this.hi]) return; this.hist.length = this.hi + 1; this.hist.push(s); this.hi++; if (this.hist.length > 200) { this.hist.shift(); this.hi--; } }
  desfaz(d) { const i = this.hi + d; if (i < 0 || i >= this.hist.length) return; this.hi = i; this.t = JSON.parse(this.hist[i]); if (this.sel >= this.t.caixas.length) this.sel = this.t.caixas.length - 1; this.tudo(); }
  muda(fn, redesenha = true) { fn(); this.marca(); if (redesenha) this.tudo(); }

  // ---------- montagem da janela ----------
  montar() {
    const R = this.root = el('div', 'edtx'); R.dataset.k = 'editor';
    const ed = el('div', 'ed'); R.appendChild(ed);
    const tit = el('div', 'edtit'); tit.append(el('b', '', '✎ Editar texto'), el('span', 'mut', this.clip.name || 'Texto'), el('span', 'sp'), el('span', 'mut', 'Ctrl+Z desfaz · Esc fecha sem aplicar'));
    const lado = el('div', 'lado'); this.abas = el('div', 'abas'); this.cont = el('div', 'cont'); lado.append(this.abas, this.cont);
    for (const [k, n] of [['estilos', 'Estilos'], ['fontes', 'Fontes'], ['efeitos', 'Efeitos'], ['animar', 'Animar']]) { const b = el('button', '', n); b.type = 'button'; b.dataset.a = k; b.onclick = () => { this.aba = k; this.lado(); }; this.abas.appendChild(b); }
    this.tool = el('div', 'tool');
    const pal = el('div', 'palco'); this.tela = el('div', 'tela'); this.cv = el('canvas'); this.cv.width = 1280; this.cv.height = 720; this.tela.appendChild(this.cv);
    this.gv = el('div', 'guia v'); this.gh = el('div', 'guia hz'); this.tela.append(this.gv, this.gh); pal.appendChild(this.tela);
    this.tela.onpointerdown = (e) => { if (e.target === this.cv) { if (this.editando >= 0) this.fimEdicao(); this.sel = -1; this.tudo(); } };
    this.dir = el('div', 'dir');
    const rod = el('div', 'rod');
    const add = (n, o) => { const b = el('button', 'bt', '+ ' + n); b.type = 'button'; b.dataset.add = n; b.onclick = () => this.adicionar(o); return b; };
    const cancel = el('button', 'bt', 'Cancelar'); cancel.type = 'button'; cancel.onclick = () => this.fechar(false);
    const ok = el('button', 'bt pri', 'Aplicar no clipe'); ok.type = 'button'; ok.dataset.k = 'aplicar'; ok.onclick = () => this.fechar(true);
    rod.append(add('Título', { trechos: [{ t: 'TÍTULO' }], f: this.achar('Archivo'), peso: 900, s: 10 }), add('Subtítulo', { trechos: [{ t: 'Subtítulo' }], f: this.achar('Rubik'), peso: 700, s: 5, y: 70 }), add('Texto', { trechos: [{ t: 'Um texto pequeno' }], f: this.achar('Rubik'), s: 3, y: 80 }),
      el('span', 'sp'), el('span', 'mut', 'Tudo fica dentro deste clipe; cada caixa pode animar na batida.'), cancel, ok);
    ed.append(tit, lado, this.tool, pal, this.dir, rod);
    document.body.appendChild(R);
    this.onKey = (e) => {
      if (!this.open) return;
      const emTexto = this.editando >= 0 || /INPUT|SELECT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (this.editando >= 0) this.fimEdicao(); else if (emTexto) document.activeElement.blur(); else this.fechar(false); return; }   // num campo (buscar fonte, tamanho), Esc só sai do campo
      if (emTexto) { e.stopPropagation(); return; }
      if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.stopPropagation(); this.desfaz(e.shiftKey ? 1 : -1); return; }
      if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); e.stopPropagation(); this.desfaz(1); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.k) { e.preventDefault(); e.stopPropagation(); this.muda(() => { this.t.caixas.splice(this.sel, 1); this.sel = -1; }); return; }
      if (e.key === 'Enter' && this.k) { e.preventDefault(); e.stopPropagation(); this.editar(this.sel); return; }
      e.stopPropagation();   // nenhum atalho do programa por trás enquanto o editor está aberto
    };
    addEventListener('keydown', this.onKey, true);
  }
  achar(f) { return this.fontes.find(x => x.toLowerCase() === f.toLowerCase()) || this.fontes.find(x => x.toLowerCase().startsWith(f.toLowerCase())) || 'Arial'; }
  adicionar(o) { this.muda(() => { this.t.caixas.push(novaCaixa(o)); this.sel = this.t.caixas.length - 1; }); }
  tudo() { this.barra(); this.lado(); this.direita(); this.caixasDom(); this.palco(); }

  // ---------- palco ----------
  palco() {
    const B = this.ctx.clock ? this.ctx.clock() : null;
    desenharCartaz(this.cv, this.t, B, performance.now() / 1000, this.editando);
    this.tela.style.setProperty('--xadrez', this.t.fundo === 'none' ? '1' : '0');
  }
  // caixas de seleção por cima do desenho (o tamanho vem da mesma medida do desenho)
  caixasDom() {
    this.tela.querySelectorAll('.cx-hit').forEach(e => { if (!e.classList.contains('editando')) e.remove(); });
    const Wd = this.tela.clientWidth || 960, Hd = this.tela.clientHeight || 540;
    this.t.caixas.forEach((k, i) => {
      if (i === this.editando) return;
      const L = layoutCaixa(k, Wd), d = el('div', 'cx-hit' + (i === this.sel ? ' sel' : '')); d.dataset.i = i;
      const pad = L.px * 0.12;
      Object.assign(d.style, { left: (k.x / 100 * Wd) + 'px', top: (k.y / 100 * Hd) + 'px', width: (L.w + pad * 2) + 'px', height: (L.h + pad * 2) + 'px', transform: `translate(-50%,-50%) rotate(${k.r || 0}deg)` });
      for (const h of ['tl', 'tr', 'bl', 'br', 'rot']) { const e = el('div', 'h ' + h); e.dataset.h = h; d.appendChild(e); }
      d.onpointerdown = (e) => this.arrastar(e, i);
      d.ondblclick = (e) => { e.stopPropagation(); this.editar(i); };
      this.tela.appendChild(d);
    });
  }
  arrastar(e, i) {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    if (this.editando >= 0 && this.editando !== i) this.fimEdicao();
    const mudouSel = this.sel !== i; this.sel = i; if (mudouSel) { this.barra(); this.lado(); this.direita(); }
    this.tela.querySelectorAll('.cx-hit').forEach(d => d.classList.toggle('sel', +d.dataset.i === i));
    const k = this.k, R = this.tela.getBoundingClientRect(), h = e.target.dataset.h;
    const x0 = e.clientX, y0 = e.clientY, kx = k.x, ky = k.y, ks = k.s;
    const cx = R.left + k.x / 100 * R.width, cy = R.top + k.y / 100 * R.height;
    let moveu = false;
    const mv = (ev) => {
      if (!moveu && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 3) return; moveu = true;
      if (h === 'rot') { let r = Math.round(Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90); if (r > 180) r -= 360; if (Math.abs(r) < 4) r = 0; k.r = r; }
      else if (h) { const d0 = Math.max(4, Math.hypot(x0 - cx, y0 - cy)), d1 = Math.hypot(ev.clientX - cx, ev.clientY - cy); k.s = Math.max(0.5, Math.min(60, ks * d1 / d0)); }
      else {
        k.x = kx + (ev.clientX - x0) / R.width * 100; k.y = ky + (ev.clientY - y0) / R.height * 100;
        const sx = Math.abs(k.x - 50) < 1.2, sy = Math.abs(k.y - 50) < 1.2; if (sx) k.x = 50; if (sy) k.y = 50;
        this.gv.style.display = sx ? 'block' : 'none'; this.gh.style.display = sy ? 'block' : 'none';
      }
      this.caixasDom(); this.direita(true); this.barra();
    };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); this.gv.style.display = this.gh.style.display = 'none'; if (moveu) { this.marca(); this.caixasDom(); } };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  }

  // ---------- escrever na caixa (dois cliques): cor e fonte por pedaço ----------
  editar(i) {
    if (this.editando >= 0) this.fimEdicao();
    this.sel = i; this.editando = i; const k = this.k;
    const Wd = this.tela.clientWidth, Hd = this.tela.clientHeight, L = layoutCaixa(k, Wd);
    const d = el('div', 'cx-hit sel editando'); d.dataset.i = i;
    Object.assign(d.style, { left: (k.x / 100 * Wd) + 'px', top: (k.y / 100 * Hd) + 'px', transform: `translate(-50%,-50%) rotate(${k.r || 0}deg)` });
    const tx = el('div', 'cx-txt'); tx.contentEditable = 'true'; tx.spellcheck = false;
    Object.assign(tx.style, { fontFamily: `"${k.f}"`, fontSize: L.px + 'px', fontWeight: k.b ? Math.max(700, k.peso) : k.peso, fontStyle: k.it ? 'italic' : '', color: k.c, letterSpacing: (k.ls / 100) + 'em', lineHeight: (k.lh / 100 * 1.12), textAlign: k.al, textTransform: k.caixa ? 'uppercase' : '' });
    tx.innerHTML = (k.trechos || []).map(r => {
      const st = [r.c && 'color:' + r.c, r.f && `font-family:"${r.f}"`, r.b != null && 'font-weight:' + (r.b ? 700 : 400), r.it != null && 'font-style:' + (r.it ? 'italic' : 'normal')].filter(Boolean).join(';');
      const h = esc(r.t).replace(/\n/g, '<br>'); return st ? `<span style='${st}'>${h}</span>` : h;
    }).join('');
    d.appendChild(tx); this.tela.appendChild(d); this.caixasDom();
    tx.focus(); const s = getSelection(); s.removeAllRanges(); const rg = document.createRange(); rg.selectNodeContents(tx); s.addRange(rg);
    tx.oninput = () => { this.lerEdicao(tx); this.direita(); };
    tx.onpointerdown = (e) => e.stopPropagation();
    this.txEd = tx;
  }
  // DOM do campo -> trechos (o estilo vem dos spans de cima)
  lerEdicao(tx) {
    const k = this.t.caixas[this.editando]; if (!k) return;
    const out = [];
    const push = (t, st) => { if (!t) return; const u = out[out.length - 1]; if (u && u.c === st.c && u.f === st.f && u.b === st.b && u.it === st.it) u.t += t; else out.push({ t, ...st }); };
    const walk = (n, st) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) push(c.data.replace(/ /g, ' '), st);
        else if (c.nodeName === 'BR') push('\n', st);
        else if (c.nodeType === 1) {
          const s = { ...st }, cs = c.style;
          if (cs.color) s.c = rgbHex(cs.color); if (cs.fontFamily) s.f = cs.fontFamily.replace(/["']/g, '').split(',')[0].trim();
          if (cs.fontWeight) s.b = +cs.fontWeight >= 600 || cs.fontWeight === 'bold'; if (cs.fontStyle) s.it = cs.fontStyle === 'italic';
          if (c.nodeName === 'B' || c.nodeName === 'STRONG') s.b = true; if (c.nodeName === 'I' || c.nodeName === 'EM') s.it = true;
          if (c.nodeName === 'FONT' && c.color) s.c = c.color;
          if ((c.nodeName === 'DIV' || c.nodeName === 'P') && out.length && !out[out.length - 1].t.endsWith('\n')) push('\n', st);
          walk(c, s);
        }
      }
    };
    walk(tx, {});
    for (const r of out) for (const key of ['c', 'f', 'b', 'it']) if (r[key] === undefined) delete r[key];
    k.trechos = out.length ? out : [{ t: '' }];
  }
  fimEdicao() {
    if (this.editando < 0) return;
    if (this.txEd) this.lerEdicao(this.txEd);
    const k = this.t.caixas[this.editando];
    this.tela.querySelectorAll('.cx-hit.editando').forEach(e => e.remove());
    if (k && !textoDe(k).trim()) { this.t.caixas.splice(this.editando, 1); this.sel = -1; }
    this.editando = -1; this.txEd = null; this.marca(); this.tudo();
  }
  // pedaço selecionado dentro da caixa em edição: o estilo vale só para ele
  pedaco(css) {
    if (this.editando < 0 || !this.txEd) return false;
    const s = getSelection(); if (!s.rangeCount || s.isCollapsed || !this.txEd.contains(s.anchorNode)) return false;
    const sp = document.createElement('span'); sp.style.cssText = css;
    try { sp.appendChild(s.getRangeAt(0).extractContents()); s.getRangeAt(0).insertNode(sp); } catch { return false; }
    s.removeAllRanges(); const rg = document.createRange(); rg.selectNodeContents(sp); s.addRange(rg);
    this.lerEdicao(this.txEd); this.marca(); return true;
  }

  // ---------- barra de cima ----------
  barra() {
    const T = this.tool, k = this.k; T.textContent = '';
    const g = () => { const d = el('div', 'g'); T.appendChild(d); return d; };
    const tb = (gr, c, html, title, on) => { const b = el('button', 'tb' + (on ? ' on' : '')); b.type = 'button'; b.dataset.c = c; b.innerHTML = html; b.title = title; b.disabled = !k; b.onmousedown = (e) => e.preventDefault(); b.onclick = () => this.cmd(c); gr.appendChild(b); return b; };
    const g1 = g(), fs = el('select'); fs.dataset.k = 'fonte'; fs.disabled = !k;
    for (const f of this.fontes.slice(0, 400)) { const o = el('option', '', f); o.value = f; fs.appendChild(o); }
    if (k) { if (!this.fontes.includes(k.f)) { const o = el('option', '', k.f); fs.prepend(o); } fs.value = k.f; }
    fs.onchange = () => { if (this.pedaco(`font-family:"${fs.value}"`)) return; this.muda(() => { k.f = fs.value; }); };
    g1.appendChild(fs);
    const g2 = g(); tb(g2, 'menos', '−', 'Diminuir');
    const tam = el('input'); tam.type = 'number'; tam.min = 8; tam.max = 1200; tam.dataset.k = 'tamanho'; tam.disabled = !k; if (k) tam.value = Math.round(k.s * 19.2); tam.title = 'Tamanho em px numa tela de 1920';
    tam.onchange = () => this.muda(() => { k.s = Math.max(0.5, +tam.value / 19.2); }); g2.appendChild(tam); tb(g2, 'mais', '+', 'Aumentar');
    const g3 = g(), cor = el('label', 'cor'); cor.title = 'Cor (do pedaço selecionado ou da caixa)'; const ci = el('input'); ci.type = 'color'; ci.dataset.k = 'cor'; ci.disabled = !k;
    if (k) { ci.value = k.c; cor.style.background = k.c; }
    ci.oninput = () => { if (this.pedaco('color:' + ci.value)) return; k.c = ci.value; cor.style.background = k.c; this.palco(); };
    ci.onchange = () => { if (this.editando < 0) this.muda(() => { }); };
    cor.appendChild(ci); g3.appendChild(cor);
    const g4 = g(); tb(g4, 'b', '<b>B</b>', 'Negrito', k && k.b); tb(g4, 'i', '<i>I</i>', 'Itálico', k && k.it); tb(g4, 'u', '<u>U</u>', 'Sublinhado', k && k.u); tb(g4, 's', '<s>S</s>', 'Riscado', k && k.st); tb(g4, 'caixa', 'aA', 'Maiúsculas', k && k.caixa);
    const g5 = g(); tb(g5, 'left', '⯇', 'Alinhar à esquerda', k && k.al === 'left'); tb(g5, 'center', '≡', 'Centralizar', k && k.al === 'center'); tb(g5, 'right', '⯈', 'Alinhar à direita', k && k.al === 'right');
    const g6 = g(); g6.title = 'Espaço entre letras e entre linhas';
    const num = (key, min, max, step, lab) => { g6.appendChild(el('span', 'mut', lab)); const n = el('input'); n.type = 'number'; n.min = min; n.max = max; n.step = step; n.dataset.k = key; n.disabled = !k; if (k) n.value = k[key]; n.onchange = () => this.muda(() => { k[key] = +n.value; }); g6.appendChild(n); };
    num('ls', -20, 100, 1, '↔'); num('lh', 50, 250, 5, '↕');
    const g7 = g(); for (const [c, n] of [['efeitos', 'Efeitos'], ['animar', 'Animar']]) { const b = el('button', 'tb' + (this.aba === c ? ' on' : ''), n); b.type = 'button'; b.dataset.c = c; b.onclick = () => { this.aba = c; this.lado(); this.barra(); }; g7.appendChild(b); }
    const g8 = g(); g8.classList.add('fim'); tb(g8, 'frente', '⬒', 'Trazer para a frente'); tb(g8, 'dup', '⧉', 'Duplicar'); tb(g8, 'apaga', '🗑', 'Apagar a caixa');
  }
  cmd(c) {
    const k = this.k; if (!k) return;
    if (c === 'b' && this.pedaco('font-weight:' + (k.b ? 400 : 700))) return;
    if (c === 'i' && this.pedaco('font-style:' + (k.it ? 'normal' : 'italic'))) return;
    this.muda(() => {
      if (c === 'mais') k.s *= 1.1; if (c === 'menos') k.s /= 1.1;
      if (c === 'b') k.b = !k.b; if (c === 'i') k.it = !k.it; if (c === 'u') k.u = !k.u; if (c === 's') k.st = !k.st; if (c === 'caixa') k.caixa = !k.caixa;
      if (c === 'left' || c === 'center' || c === 'right') k.al = c;
      if (c === 'dup') { const n = JSON.parse(JSON.stringify(k)); n.x += 3; n.y += 3; this.t.caixas.push(n); this.sel = this.t.caixas.length - 1; }
      if (c === 'apaga') { this.t.caixas.splice(this.sel, 1); this.sel = -1; }
      if (c === 'frente') { this.t.caixas.push(this.t.caixas.splice(this.sel, 1)[0]); this.sel = this.t.caixas.length - 1; }
    });
    if (this.editando >= 0 && this.txEd) { const i = this.editando; this.editando = -1; this.txEd = null; this.tela.querySelectorAll('.cx-hit.editando').forEach(e => e.remove()); if (this.t.caixas[i]) this.editar(i); }
  }

  // ---------- painel da esquerda ----------
  lado() {
    this.abas.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.a === this.aba));
    const C = this.cont, k = this.k; C.textContent = '';
    const h4 = (t) => C.appendChild(el('h4', '', t));
    if (this.aba === 'estilos') {
      h4('Adicionar texto');
      for (const [n, o, px] of [['título', { trechos: [{ t: 'TÍTULO' }], f: this.achar('Archivo'), peso: 900, s: 10 }, 20], ['subtítulo', { trechos: [{ t: 'Subtítulo' }], f: this.achar('Rubik'), peso: 700, s: 5, y: 70 }, 15], ['texto', { trechos: [{ t: 'Um texto pequeno' }], f: this.achar('Rubik'), s: 3, y: 80 }, 12]]) {
        const b = el('button', 'add'); b.type = 'button'; b.dataset.add = n; const s = el('span', '', 'Adicionar ' + n); s.style.cssText = `font-family:"${o.f}";font-size:${px}px;font-weight:${o.peso || 400}`; b.appendChild(s); b.onclick = () => this.adicionar(o); C.appendChild(b);
      }
      h4('Estilos prontos');
      const g = el('div', 'estilos'); C.appendChild(g);
      const texto = this.t.caixas.map(textoDe).join(' ').replace(/\s+/g, ' ').trim() || 'Seu texto aqui';
      for (const p of ESTILOS_CARTAZ) {
        const b = el('button', 'est'); b.type = 'button'; b.title = p.nome; b.dataset.estilo = p.id;
        const cv = el('canvas'); cv.width = 320; cv.height = 180; b.append(cv, el('span', '', p.nome));
        const caixas = caixasDoEstilo(p, texto, this.fontes);
        try { desenharCartaz(cv, { fundo: '#000000', caixas: caixas.map(x => ({ ...x, an: { tipo: 'nenhuma' } })) }, null, 0); } catch { }
        b.onclick = () => this.muda(() => { this.t.caixas = caixasDoEstilo(p, texto, this.fontes); this.sel = this.t.caixas.length - 1; });
        g.appendChild(b);
      }
    }
    if (this.aba === 'fontes') {
      const i = el('input', 'busca'); i.placeholder = 'Buscar fonte'; i.value = this.busca; C.appendChild(i);
      const L = el('div', 'fontes'); C.appendChild(L);
      const pinta = () => {
        L.textContent = ''; const q = i.value.toLowerCase(); this.busca = i.value;
        for (const f of this.fontes.filter(f => f.toLowerCase().includes(q)).slice(0, 120)) {
          const d = el('div', 'fonte' + (k && k.f === f ? ' on' : ''), f); d.style.fontFamily = `"${f}"`; d.dataset.fonte = f;
          d.onmousedown = (e) => e.preventDefault();
          d.onclick = () => { if (!this.k) return; if (this.pedaco(`font-family:"${f}"`)) return; this.muda(() => { this.k.f = f; }); };
          L.appendChild(d);
        }
      };
      i.oninput = pinta; pinta();
      h4('Combinações');
      for (const [a, b] of COMBOS) {
        const fa = this.achar(a), fb = this.achar(b), d = el('button', 'combo'); d.type = 'button';
        const s1 = el('span', '', 'TÍTULO'); s1.style.fontFamily = `"${fa}"`; s1.style.fontWeight = 900; const s2 = el('span', '', 'apoio do cartaz'); s2.style.fontFamily = `"${fb}"`;
        d.append(s1, s2); d.title = fa + ' + ' + fb;
        d.onclick = () => this.muda(() => { const ks = [...this.t.caixas].sort((x, y) => y.s - x.s); ks.forEach((x, j) => { x.f = j === 0 ? fa : fb; }); });
        C.appendChild(d);
      }
    }
    if (this.aba === 'efeitos') {
      if (!k) { C.appendChild(el('div', 'vazio', 'Selecione uma caixa de texto.')); return; }
      const g = el('div', 'efx'); C.appendChild(g);
      for (const [id, n] of EFEITOS) {
        const d = el('button', 'ef' + (k.fx.tipo === id ? ' on' : '')); d.type = 'button'; d.dataset.fx = id;
        const cv = el('canvas'); cv.width = 120; cv.height = 70; const x = cv.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, 120, 70);
        x.save(); x.translate(60, 36); try { desenharCaixa(x, novaCaixa({ trechos: [{ t: 'Ag' }], f: this.achar('Archivo'), peso: 900, s: 34, c: '#ffffff', fx: { tipo: id, forca: 60, cor: '#ff3c9e' } }), 120, null, 0); } catch { } x.restore();
        d.append(cv, el('span', '', n)); d.onclick = () => this.muda(() => { k.fx.tipo = id; }); g.appendChild(d);
      }
      if (k.fx.tipo !== 'nenhum') {
        h4('Ajuste');
        const r = el('div', 'ctl'); const inp = el('input'); inp.type = 'range'; inp.min = 0; inp.max = 100; inp.value = k.fx.forca; inp.dataset.k = 'forca'; const o = el('output', '', String(k.fx.forca));
        inp.oninput = () => { k.fx.forca = +inp.value; o.textContent = inp.value; this.palco(); }; inp.onchange = () => this.marca();
        r.append(el('span', '', 'Força'), inp, o); C.appendChild(r);
        if (!['sombra', 'elevar', 'vazado', 'glitch', 'curva'].includes(k.fx.tipo)) {
          const r2 = el('div', 'ctl'); const ci = el('input'); ci.type = 'color'; ci.value = k.fx.cor; ci.dataset.k = 'fxcor';
          ci.oninput = () => { k.fx.cor = ci.value; this.palco(); }; ci.onchange = () => this.marca();
          r2.append(el('span', '', k.fx.tipo === 'degrade' ? 'Até a cor' : 'Cor'), ci, el('span')); C.appendChild(r2);
        }
      }
    }
    if (this.aba === 'animar') {
      if (!k) { C.appendChild(el('div', 'vazio', 'Selecione uma caixa de texto.')); return; }
      const g = el('div', 'anims'); C.appendChild(g);
      for (const [id, n, desc] of ANIMS) { const b = el('button', 'an' + (k.an.tipo === id ? ' on' : '')); b.type = 'button'; b.dataset.an = id; b.append(el('i', '', n), el('span', '', desc)); b.onclick = () => this.muda(() => { k.an.tipo = id; }); g.appendChild(b); }
      h4('Ritmo');
      const sel = (lab, key, opts) => { const r = el('div', 'ctl'); const s = el('select'); s.dataset.k = key; for (const [v, t] of opts) { const o = el('option', '', t); o.value = String(v); s.appendChild(o); } s.value = String(k.an[key]); s.onchange = () => this.muda(() => { k.an[key] = key === 'batidas' ? +s.value : s.value; }); r.append(el('span', '', lab), s); C.appendChild(r); };
      sel('Batidas', 'batidas', BATIDAS.map(b => [b, b < 1 ? '1/' + Math.round(1 / b) : String(b)]));
      sel('Por', 'por', POR);
      C.appendChild(el('div', 'nota', 'Segue o BPM do OpenLuz, como o ♪ dos controles.'));
    }
  }

  // ---------- direita: caixas, posição e fundo ----------
  direita(sóNúmeros = false) {
    const D = this.dir, k = this.k;
    if (sóNúmeros && this.rng) { for (const [key, inp, out, f] of this.rng) { if (!k) continue; inp.value = k[key]; out.textContent = f(k[key]); } return; }
    D.textContent = ''; D.appendChild(el('h4', '', 'Caixas de texto'));
    this.t.caixas.forEach((x, i) => {
      const r = el('div', 'cxl' + (i === this.sel ? ' on' : '')); r.dataset.i = i;
      const s = el('span', '', (textoDe(x).split('\n')[0] || '(vazia)').slice(0, 24)); s.style.cssText = `font-family:"${x.f}";color:${x.c}`;
      r.append(s, el('small', '', (x.fx.tipo !== 'nenhum' ? x.fx.tipo : '') + (x.an.tipo !== 'nenhuma' ? ' ♪' : '')));
      r.onclick = () => { if (this.editando >= 0) this.fimEdicao(); this.sel = i; this.tudo(); };
      D.appendChild(r);
    });
    D.appendChild(el('h4', '', 'Posição'));
    this.rng = [];
    for (const [key, lab, min, max, f] of [['x', 'X', 0, 100, v => Math.round(v) + '%'], ['y', 'Y', 0, 100, v => Math.round(v) + '%'], ['r', 'Giro', -180, 180, v => Math.round(v) + '°'], ['o', 'Opacidade', 0, 100, v => Math.round(v) + '%']]) {
      const r = el('div', 'ctl'), inp = el('input'); inp.type = 'range'; inp.min = min; inp.max = max; inp.step = key === 'o' ? 1 : 0.5; inp.dataset.k = key; inp.disabled = !k; const o = el('output');
      if (k) { inp.value = k[key]; o.textContent = f(k[key]); }
      inp.oninput = () => { k[key] = +inp.value; o.textContent = f(k[key]); this.caixasDom(); this.palco(); }; inp.onchange = () => this.marca();
      r.append(el('span', '', lab), inp, o); D.appendChild(r); this.rng.push([key, inp, o, f]);
    }
    D.appendChild(el('h4', '', 'Fundo do clipe'));
    const fs = el('select'); fs.dataset.k = 'fundo'; for (const [v, t] of FUNDOS) { const o = el('option', '', t); o.value = v; fs.appendChild(o); } fs.value = this.t.fundo || 'none';
    fs.onchange = () => this.muda(() => { this.t.fundo = fs.value; });
    const r = el('div', 'ctl'); r.append(el('span', '', 'Fundo'), fs); D.appendChild(r);
  }
}
function rgbHex(c) { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c); return m ? '#' + [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('') : c; }
