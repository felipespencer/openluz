// Painéis de propriedades do rodapé, no formato do Resolume: Composição | Camada (esquerda),
// Clipe (meio). Autopilot, master, mistura, transição, transformação e a cadeia de efeitos.
import { el, ICON, propsKit, fmtN } from './panel.js';
import { FITS } from './engine.js';
import { MIXER_OPTS, MIXER_OPT, mixerById, mixerColor } from './mixers.js';
import { EFFECTS, effectById, mkFx } from './effects.js';
import { sourceById } from './sources.js';
import { mediaUrl, PARAMS_3D, info3d } from './clips.js';
import { PLAY_MODES, AWAY_MODES, BEATLOOPS, autoBeats, setBeatLoop, captureNavigate, renderText, textClip, playClip, pauseClip, seekClip, setRate, applyAudio, mediaOf, rebuildAudioFx, updateAudioFx } from './clips.js';
import { AUTOPILOT } from './composition.js';
import { SHAPES, BEATS, ANIM, animValue, dropAnim } from './beat.js';
import { AUDIO_FX, audioFxById, BANDS } from './audio.js';
import { isPrepared } from './player.js';
import { STYLES, RANGES, ORDERS, listFonts, drawText } from './text.js';
import { FUNCOES, ESTILOS, montarPedido, validarVersoes, aplicarVersao, fontesParaIA } from './ia.js';
import { PRESETS, versaoDoPreset } from './text-presets.js';
import { ehCartaz, textoDe, FUNDOS } from './cartaz.js';
import { BUILTIN_NAMES, putLutText } from './lut.js';
import { PARAMS_FACE, faceDefaults, stats as faceStats } from './face.js';

const $ = (id) => document.getElementById(id);
const fmtT = (s) => { s = Math.max(0, s || 0); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); };
const fmtT1 = (s) => { s = Math.max(0, s || 0); return Math.floor(s / 60) + ':' + (s % 60).toFixed(1).padStart(4, '0'); };
let fontsCache = null;   // fontes do Windows (text.js listFonts), lidas uma vez
const STYLE_PT = { Regular: 'Regular', Italic: 'Itálico', Bold: 'Negrito', 'Bold Italic': 'Negrito itálico', Black: 'Black' };

export class Panels {
  // ctx: { state, engine, laser, toast, renderGrid(), selectedClip(), drag(), trigger(li,col), removeLayer(li), applySpeed(), openLaser(frame) }
  constructor(ctx) {
    this.c = { onChange: () => { } }; this.ctx = ctx; this.tab = 'comp';
    Object.assign(this, propsKit(this));
    $('leftTabs').onclick = (e) => { const t = e.target.closest('[data-tab]'); if (t) { this.tab = t.dataset.tab; this.render(); } };
  }
  // o kit chama estes nomes
  pushUndo() { } draw() { } renderProps() { this.render(); } refresh() { this.render(); this.ctx.renderGrid(); }

  render() {
    this.animTicks = [];
    const S = this.ctx.state;
    const G = this.ctx.selectedGroup ? this.ctx.selectedGroup() : null;
    $('leftTabs').querySelector('[data-tab=group]').hidden = !S.groups || !S.groups.length;
    if (this.tab === 'group' && !G) this.tab = 'layer';
    $('leftTabs').querySelectorAll('[data-tab]').forEach(t => t.classList.toggle('on', t.dataset.tab === this.tab));
    const P = $('leftPan'); P.textContent = '';
    if (this.tab === 'comp') this.renderComp(P); else if (this.tab === 'group') this.renderGroup(P, G); else this.renderLayer(P, S.layers[S.selLayer]);
    this.renderClip($('clipPan'), this.ctx.selectedClip());
    this.fold(P, this.tab); this.fold($('clipPan'), 'clip');
  }
  // seções que dobram, como no Resolume: triângulo no cabeçalho, clique dobra e desdobra; o estado fica guardado entre aberturas.
  // Só os cabeçalhos soltos no painel dobram (os de dentro das caixas da IA ficam como estão). Cue Points nasce dobrado, como lá.
  fold(P, tab) {
    if (!this.folds) { try { this.folds = JSON.parse(localStorage.getItem('openluz.folds') || '{}'); } catch { this.folds = {}; } }
    const F = this.folds, DOBRADO = { 'clip/Cue Points': true }; let closed = false;
    for (const e of [...P.children]) {
      if (!e.classList.contains('phead')) { if (closed) e.classList.add('folded'); continue; }
      const sp = e.querySelector('span'), key = tab + '/' + (e.dataset.fk || (sp ? sp.textContent : e.textContent)).trim();
      const fechado = key in F ? !!F[key] : !!DOBRADO[key]; closed = fechado;
      const tri = el('i', 'tri' + (closed ? '' : ' open')); e.prepend(tri); e.classList.add('foldable'); e.dataset.fold = key;
      e.addEventListener('click', (ev) => { if (ev.target.closest('select, button, input, label, .ck, .mini')) return; F[key] = !fechado; try { localStorage.setItem('openluz.folds', JSON.stringify(F)); } catch { } this.render(); });
    }
  }
  autopilotRows(P, ap, onSet, help) {
    P.appendChild(this.phead('Autopilot', 'Autopilot|Quando o clipe acaba, a camada passa sozinha para o próximo, o anterior ou um ao acaso.' + (help || '')));
    P.appendChild(this.pseg('Direção', 'Direção|◀◀ anterior, OFF parado, ▶▶ próximo, ⤮ ao acaso.', [['prev', '◀◀'], ['off', 'OFF'], ['next', '▶▶'], ['random', '⤮']], ap.dir, v => onSet('dir', v)));
    P.appendChild(this.pselect('Duração', 'Duração|Quanto tempo cada clipe fica: o comprimento do próprio clipe ou um tempo fixo.', [['clip', 'Clipe inteiro'], ['fixed', 'Tempo fixo'], ['beats', 'Batidas']], ap.dur, v => onSet('dur', v)));
    if (ap.dur === 'beats') P.appendChild(this.pselect('Batidas', 'Batidas|Quantas batidas do relógio de BPM cada clipe fica.', BEATS.filter(b => b >= 1).map(b => [String(b), String(b)]), String(ap.beats || 4), v => onSet('beats', +v)));
    if (ap.dur === 'fixed') P.appendChild(this.pnum('Segundos', 'Segundos|Tempo fixo por clipe.', ap.secs, { min: 0.2, max: 600, step: 0.5, dec: 1, unit: ' s', bar: true, reset: 5 }, v => onSet('secs', v)));
    P.appendChild(this.pcheck('Loop', 'Loop|Chegando ao fim da fileira, volta ao começo.', ap.loop, v => onSet('loop', v), ap.loop ? 'dá a volta' : 'para no último'));
  }
  transformRows(P, tr, help) {
    P.appendChild(this.phead('Transform', 'Transform|Posição, escala e giro' + (help || '') + '.'));
    this.animRow(P, this.pnum('Posição X', 'Posição X|−100 é a esquerda, 100 a direita.', Math.round(tr.x * 100), { min: -200, max: 200, step: 1, bar: true, reset: 0 }, v => { tr.x = v / 100; }), 'Posição X', tr, '@x', { min: -200, max: 200, step: 1 });
    this.animRow(P, this.pnum('Posição Y', 'Posição Y|−100 é embaixo, 100 em cima.', Math.round(tr.y * 100), { min: -200, max: 200, step: 1, bar: true, reset: 0 }, v => { tr.y = v / 100; }), 'Posição Y', tr, '@y', { min: -200, max: 200, step: 1 });
    // Escala como no Resolume 7.28 (conferido na janela dele e pela API): um grupo que abre e fecha. Fechado: uma linha "Escala".
    // Aberto: o cabeçalho "Escala" e embaixo Escala, Largura e Altura, os três independentes (de 0 a 1000 %); o tamanho que vai
    // para a tela é Escala × Largura (e Escala × Altura). Não há tick de trava lá.
    const open = !!this.scaleOpen, sx = tr.sx ?? 1, sy = tr.sy ?? 1;
    const arrow = (row) => { const lb = row.querySelector('.pl'), a = el('span', 'tgl', open ? '▼' : '▶'); a.title = open ? 'Fechar' : 'Abrir Largura e Altura'; a.onclick = (e) => { e.stopPropagation(); this.scaleOpen = !open; this.render(); }; lb.prepend(a); lb.classList.add('hasTgl'); return row; };
    const escala = this.pnum('Escala', 'Escala|Tamanho, largura e altura juntas. 100 % é o tamanho normal.', Math.round(tr.scale * 100), { min: 0, max: 1000, step: 1, unit: ' %', bar: true, reset: 100 }, v => { tr.scale = v / 100; });
    if (!open) this.animRow(P, arrow(escala), 'Escala', tr, '@scale', { min: 0, max: 1000, step: 1, unit: ' %' });
    else {
      const gh = el('div', 'prow grp'); gh.append(el('span', 'pl hasTgl', ''), el('span', 'pv', '')); arrow(gh); gh.querySelector('.pl').append(el('span', 'tgn', 'Escala')); P.appendChild(gh);
      this.animRow(P, escala, 'Escala', tr, '@scale', { min: 0, max: 1000, step: 1, unit: ' %' });
      P.appendChild(this.pnum('Largura', 'Largura|Só a largura. 100 % é o tamanho normal; passa de 100 alarga, abaixo estreita. Multiplica a Escala.', Math.round(sx * 100), { min: 0, max: 1000, step: 1, unit: ' %', bar: true, reset: 100 }, v => { tr.sx = v / 100; }));
      P.appendChild(this.pnum('Altura', 'Altura|Só a altura. 100 % é o tamanho normal; passa de 100 estica, abaixo achata. Multiplica a Escala.', Math.round(sy * 100), { min: 0, max: 1000, step: 1, unit: ' %', bar: true, reset: 100 }, v => { tr.sy = v / 100; }));
    }
    this.animRow(P, this.pnum('Giro', 'Giro|Ângulo em graus.', tr.rot, { min: -180, max: 180, step: 1, unit: ' °', bar: true, reset: 0 }, v => { tr.rot = v; }), 'Giro', tr, '@rot', { min: -180, max: 180, step: 1, unit: ' °' });
  }
  // um parâmetro de efeito ou de fonte: a linha do valor e o botão ♪, que o anima na batida
  // (forma dos presets do Resolume, ciclo em batidas, mínimo e máximo)
  // engrenagem do parâmetro, como no Resolume: aparece na ponta esquerda da linha quando o mouse passa por cima e abre o menu de animação.
  // Do menu deles entram os modos que o OpenLuz tem: Basic, Timeline (ciclo em segundos), BPM Sync (ciclo em batidas), FFT (som) e os
  // Presets (as formas). Dashboard, Transition Phase, CrossFader Phase e Envelope ainda não existem aqui e ficam de fora do menu.
  animGear(row, name, holder, key, range, after) {
    const a = holder.panim && holder.panim[key], g = el('button', 'pgear' + (a ? ' on' : '')); g.type = 'button'; g.dataset.k = 'eng'; g.title = 'Animação do parâmetro';
    g.innerHTML = '<svg viewBox="0 0 16 16"><path d="M6.6 1h2.8l.4 1.9 1.2.5 1.6-1 2 2-1 1.600.5 1.200 1.900.4v2.800l-1.900.4-.5 1.200 1 1.600-2 2-1.600-1-1.200.5L9.400 15H6.600l-.4-1.900-1.200-.5-1.600 1-2-2 1-1.600-.5-1.200L0 9.400V6.600l1.900-.4.5-1.200-1-1.600 2-2 1.600 1 1.200-.5zM8 5.500a2.500 2.500 0 1 0 0 5 2.500 2.500 0 0 0 0-5z"/></svg>';
    const put = (fn) => { this.pushUndo(); holder.panim = holder.panim || {}; fn(); if (after) after(); this.c.onChange(); this.render(); };
    const base = () => ({ min: (a && a.min) ?? range.min, max: (a && a.max) ?? range.max });
    const forma = () => (a && a.shape && a.shape !== 'fft' ? a.shape : '4floor');
    g.onclick = (e) => {
      e.stopPropagation(); const r = g.getBoundingClientRect(); if (!this.ctx.menu) return;
      this.ctx.menu([
        { label: name, disabled: true }, '-',
        { label: 'Basic', check: !a, fn: () => put(() => { dropAnim(holder, key); }) },
        { label: 'Timeline', check: !!(a && a.secs && a.shape !== 'fft'), fn: () => put(() => { holder.panim[key] = { shape: a && a.shape && a.shape !== 'fft' ? a.shape : 'saw', beats: (a && a.beats) || 4, secs: (a && a.secs) || 5, ...base() }; }) },
        { label: 'BPM Sync', check: !!(a && !a.secs && a.shape !== 'fft'), fn: () => put(() => { holder.panim[key] = { shape: forma(), beats: (a && a.beats) || 4, ...base() }; }) },
        { label: 'FFT (som)', check: !!(a && a.shape === 'fft'), fn: () => put(() => { holder.panim[key] = { shape: 'fft', band: (a && a.band) || 'all', gain: (a && a.gain) || 1.4, beats: (a && a.beats) || 4, ...base() }; }) },   // padrão medido contra a Composition FFT do Resolume (sondas/fft-ajuste.py): espectro inteiro, ganho ~1,36
        '-',
        { label: 'Presets', sub: () => SHAPES.filter(([k]) => k !== 'fft').map(([k, t]) => ({ label: t, check: !!(a && a.shape === k), fn: () => put(() => { holder.panim[key] = { beats: (a && a.beats) || 4, secs: a && a.shape !== 'fft' ? a.secs : undefined, ...base(), shape: k }; }) })) },
      ], r.left, r.bottom + 2);
    };
    row.classList.add('hasGear'); row.appendChild(g);
  }
  // põe a engrenagem numa linha de valor "de casa" (opacidade, velocidade, volume, Transform) e, se estiver animada, as linhas da animação
  animRow(P, row, label, holder, key, o) {
    this.animGear(row, label, holder, key, o); P.appendChild(row);
    const a = holder.panim && holder.panim[key]; if (!a) return row;
    this.animBlock(P, a, o);
    return row;
  }
  // mini-transporte da animação, como o que o Resolume põe embaixo do parâmetro (fotografado em 2026-11-10): barra com a faixa do valor
  // (triângulos = mínimo e máximo, ▼ = o valor de agora), ◀ ‖ ▶, a forma, o ciclo em segundos ou batidas com /2 ×2 e a velocidade.
  // Na FFT: a faixa do som com o medidor, ganho e queda.
  animBlock(P, a, o, after, semFft) {
    const B = this.ctx.state.bpm, fft = a.shape === 'fft', span = (o.max - o.min) || 1, stp = o.step || 1, fr = (v) => Math.max(0, Math.min(1, (v - o.min) / span));
    const chg = (fn) => { this.pushUndo(); fn(); if (after) after(); this.c.onChange(); this.render(); };
    const fmt = (v) => (+v).toFixed(o.dec || 0).replace('.', ',') + (o.unit || '');
    const box = el('div', 'abox'); box.dataset.help = 'Animação do valor|A barra é a faixa por onde o valor anda: arraste os triângulos do mínimo e do máximo. O ▼ mostra o valor de agora.';
    const bar = el('div', 'abar'), range = el('div', 'range'), hin = el('div', 'hnd in'), hout = el('div', 'hnd out'), head = el('div', 'ahead'), ctl = el('div', 'actl');
    bar.append(range, hin, hout, head);
    if (!fft && !a.secs) { let n = Math.max(1, Math.round(a.beats || 4)); while (n > 32) n /= 2; for (let i = 1; i < n; i++) { const t = el('i', 'tk'); t.style.left = 'calc(6px + (100% - 12px) * ' + (i / n) + ')'; bar.appendChild(t); } }
    const X = (f) => 'calc(6px + (100% - 12px) * ' + f + ')';
    let meter = null;
    const place = () => { const f0 = fr(a.min), f1 = fr(a.max); range.style.left = X(Math.min(f0, f1)); range.style.width = 'calc((100% - 12px) * ' + Math.abs(f1 - f0) + ')'; hin.style.left = X(f0); hout.style.left = X(f1); hin.title = 'Mínimo ' + fmt(a.min); hout.title = 'Máximo ' + fmt(a.max);
      head.style.left = X(fr(animValue(a, B))); if (meter) meter.style.width = Math.round(Math.min(1, (B.audio ? (B.audio[a.band || 'bass'] || 0) : 0) * (a.gain ?? 1)) * 100) + '%'; };
    bar.onpointerdown = (e) => {
      if (e.button !== 0) return; e.preventDefault(); bar.setPointerCapture(e.pointerId); this.pushUndo();
      const r = bar.getBoundingClientRect(), val = (ev) => { const f = Math.max(0, Math.min(1, (ev.clientX - r.left - 6) / Math.max(1, r.width - 12))); return Math.round((o.min + f * span) / stp) * stp; };
      const v0 = val(e), what = e.target === hin ? 'min' : e.target === hout ? 'max' : (Math.abs(v0 - a.min) <= Math.abs(v0 - a.max) ? 'min' : 'max');
      const at = (ev) => { const v = val(ev); if (what === 'min') a.min = Math.min(v, a.max); else a.max = Math.max(v, a.min); place(); };
      at(e); bar.onpointermove = (ev) => { if (bar.hasPointerCapture(ev.pointerId)) at(ev); }; bar.onpointerup = () => { bar.onpointermove = null; bar.onpointerup = null; if (after) after(); this.c.onChange(); this.render(); };
    };
    const I = { back: '<svg viewBox="0 0 16 16"><path d="M11 2.5v11L3.5 8z"/></svg>', pause: '<svg viewBox="0 0 16 16"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/></svg>', fwd: '<svg viewBox="0 0 16 16"><path d="M5 2.5v11L12.5 8z"/></svg>' };
    const btn = (k, title, on, fn, svg) => { const b = el('button', 'ib' + (on ? ' on' : '')); b.type = 'button'; b.innerHTML = svg; b.dataset.k = k; b.title = title; b.onclick = (e) => { e.stopPropagation(); chg(fn); }; return b; };
    const sel = (k, title, opts, cur, set) => { const sl = el('select', 'asel'); sl.dataset.k = k; sl.title = title; for (const [val, tx] of opts) { const op = el('option', '', tx); op.value = val; sl.appendChild(op); } sl.value = cur; sl.onchange = () => chg(() => set(sl.value)); return sl; };
    if (fft) {
      const mw = el('div', 'ameter'); meter = el('i'); mw.appendChild(meter); mw.title = 'Nível da faixa agora (já com o ganho)';
      ctl.append(sel('a-faixa', 'Faixa: qual parte do som move o valor', BANDS, a.band || 'bass', v => { a.band = v; }), mw);
    } else {
      ctl.append(btn('a◀', 'Anda de trás para a frente', !a.paused && a.dir < 0, () => { a.dir = -1; a.paused = false; }, I.back), btn('a‖', 'Segura o valor onde está', !!a.paused, () => { a.paused = true; }, I.pause), btn('a▶', 'Anda para a frente', !a.paused && !(a.dir < 0), () => { a.dir = 1; a.paused = false; }, I.fwd),
        sel('a-forma', 'Forma: como o valor anda a cada ciclo (os presets de animação do Resolume)', SHAPES.filter(([k]) => k !== 'fft'), a.shape, v => { a.shape = v; }));
    }
    box.append(bar, ctl); P.appendChild(box); place(); (this.animTicks || (this.animTicks = [])).push(place);
    const half = (rowEl, get, set, lo) => { for (const [tx, k] of [['/2', 0.5], ['×2', 2]]) { const b = el('button', 'mini', tx); b.type = 'button'; b.dataset.k = 'a' + tx; b.onclick = (e) => { e.stopPropagation(); chg(() => set(Math.max(lo, get() * k))); }; rowEl.querySelector('.pv').appendChild(b); } return rowEl; };
    if (fft) {
      P.appendChild(this.pnum('· Ganho', 'Ganho|Multiplica o nível do som antes de mover o valor.', a.gain ?? 1, { min: 0, max: 8, step: 0.1, dec: 1, unit: 'x', bar: true, reset: 1 }, v => { a.gain = v; }));
      P.appendChild(this.pnum('· Queda', 'Queda (fall)|Quanto o nível pode cair por segundo depois de um pico. 0 acompanha o som sem amaciar.', a.fall ?? 0, { min: 0, max: 30, step: 0.5, dec: 1, unit: '/s', bar: true, reset: 0 }, v => { a.fall = v; }));
    } else {
      if (a.secs) P.appendChild(half(this.pnum('· Segundos', 'Segundos|Quanto dura um ciclo da forma, em segundos (modo Timeline: solto do BPM).', a.secs, { min: 0.05, max: 3600, step: 0.5, dec: 2, unit: ' s', reset: 5 }, v => { a.secs = Math.max(0.05, v); }), () => a.secs, v => { a.secs = v; }, 0.05));
      else P.appendChild(half(this.pnum('· Batidas', 'Batidas|Quantas batidas do relógio de BPM dura um ciclo da forma.', a.beats || 4, { min: 1 / 64, max: 1024, step: 1, dec: (a.beats || 4) % 1 ? 3 : 0, reset: 4 }, v => { a.beats = Math.max(1 / 64, v); }), () => a.beats || 4, v => { a.beats = v; }, 1 / 64));
      P.appendChild(this.pnum('· Velocidade', 'Velocidade da animação|Multiplica o andamento do ciclo: 2x anda o dobro.', a.speed ?? 1, { min: 0, max: 10, step: 0.01, dec: 2, unit: 'x', bar: true, reset: 1 }, v => { a.speed = v; }));
    }
  }
  paramRows(P, holder, p, help) {
    // cor e lista não animam na batida: só o controle
    if (p.color) { P.appendChild(this.pcolor(p.label, help, holder.params[p.key] ?? p.def, v => { holder.params[p.key] = v; }, p.alpha)); return; }
    if (p.opts) { P.appendChild(this.pselect(p.label, help, p.opts.map((t, i) => [String(i), t]), String(holder.params[p.key] ?? p.def), v => { holder.params[p.key] = +v; })); return; }
    const a = holder.panim && holder.panim[p.key];
    const o = { min: p.min, max: p.max, step: p.step, dec: p.step < 1 ? 2 : 0, unit: p.unit, bar: true };
    const row = this.pnum(p.label, help, holder.params[p.key] ?? p.def, { ...o, reset: p.def }, v => { holder.params[p.key] = v; });
    const b = el('button', 'anb' + (a ? ' on' : ''), '♪'); b.type = 'button'; b.title = a ? 'Parar a animação na batida (volta ao valor fixo)' : 'Animar este parâmetro na batida do BPM';
    b.onclick = (e) => { e.stopPropagation(); holder.panim = holder.panim || {}; if (a) delete holder.panim[p.key]; else holder.panim[p.key] = ANIM(p); this.render(); };
    row.querySelector('.pv').appendChild(b); this.animGear(row, p.label, holder, p.key, p); P.appendChild(row);
    if (!a) return;
    this.animBlock(P, a, { ...o, min: p.min, max: p.max });
  }
  // efeito LUT: a tabela 3D (as do OpenLuz ou um arquivo .cube do disco)
  lutRow(P, f, def) {
    const cur = f.lut || '', nome = (k) => k.split(/[\\/]/).pop().replace(/\.cube$/i, '');
    const ops = [['', '— nenhuma —'], ...BUILTIN_NAMES.map(n => ['builtin:' + n, n])];
    if (cur && !cur.startsWith('builtin:')) ops.push([cur, nome(cur) + ' (arquivo)']);
    ops.push(['__abrir', 'Abrir arquivo .cube…']);
    P.appendChild(this.pselect('LUT 3D', def.name + ' · LUT 3D|A tabela de cores. As do OpenLuz vêm prontas; "Abrir arquivo" aceita qualquer .cube 3D (DaVinci Resolve, Premiere, sites de LUT).', ops, cur, v => {
      if (v !== '__abrir') { f.lut = v; this.render(); return; }
      const inp = el('input'); inp.type = 'file'; inp.accept = '.cube'; inp.style.display = 'none'; document.body.appendChild(inp);
      inp.onchange = async () => {
        const file = inp.files && inp.files[0]; inp.remove(); if (!file) { this.render(); return; }
        const caminho = window.projDesktop && window.projDesktop.pathOf ? window.projDesktop.pathOf(file) : '';
        try { putLutText(caminho || 'arquivo:' + file.name, await file.text()); f.lut = caminho || 'arquivo:' + file.name; f._lutErr = ''; }
        catch (err) { f._lutErr = String(err.message || err); }
        this.render();
      };
      inp.click();
    }));
    if (f._lutErr) P.appendChild(el('div', 'pnote', 'Não deu para usar o arquivo: ' + f._lutErr));
  }
  // cadeia de efeitos: cabeçalho por efeito (nome, desvio, ✕) e os parâmetros; zona para soltar
  fxRows(P, owner, label) {
    const list = owner.fx || (owner.fx = []);
    P.appendChild(this.phead('Efeitos' + (label ? ' ' + label : ''), 'Efeitos|Arraste um efeito do painel Efeitos para cá, ou clique duas vezes nele. A ordem é de cima para baixo.'));
    list.forEach((f, i) => {
      const def = effectById(f.id); if (!def) return;
      const h = el('div', 'phead fxh'); h.dataset.help = def.name + '|' + def.desc;
      const by = el('label', 'ck' + (f.bypass ? '' : ' on')); by.innerHTML = f.bypass ? ICON.itemOff : ICON.item; by.title = 'Liga e desliga o efeito'; by.onclick = () => { f.bypass = !f.bypass; this.render(); };
      const nm = el('span', '', def.name);
      const up = el('button', 'mini', '▲'); up.type = 'button'; up.title = 'Subir'; up.disabled = i === 0; up.onclick = () => { list.splice(i - 1, 2, list[i], list[i - 1]); this.render(); };
      const x = el('button', 'mini', '✕'); x.type = 'button'; x.title = 'Tirar o efeito'; x.onclick = () => { list.splice(i, 1); this.render(); };
      h.append(by, nm, up, x); P.appendChild(h);
      if (f.bypass) return;
      P.appendChild(this.pnum('Opacidade', def.name + ' · Opacidade|Quanto do efeito entra: 0 % é a imagem sem o efeito.', Math.round((f.opacity ?? 1) * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { f.opacity = v / 100; }));
      if (def.presets) P.appendChild(this.pselect('Preset', def.name + ' · Preset|Conjuntos de valores prontos, os mesmos do Resolume. Escolher um troca todos os controles abaixo.', [['', '—'], ...def.presets.map(x => [x.name, x.name])], f.preset || '', v => { const pr = def.presets.find(x => x.name === v); if (pr) { for (const p of def.params) f.params[p.key] = pr.params[p.key] ?? p.def; } f.preset = v; this.render(); }));
      if (def.lut) this.lutRow(P, f, def);
      for (const p of def.params) this.paramRows(P, f, p, def.name + ' · ' + p.label + '|' + def.desc);
    });
    const dz = el('div', 'dropzone', list.length ? 'Solte outro efeito aqui' : 'Solte um efeito aqui'); dz.dataset.help = 'Soltar efeito|Arraste do painel Efeitos.';
    dz.ondragover = (e) => { const d = this.ctx.drag(); if (d && d.effect) { e.preventDefault(); dz.classList.add('over'); } };
    dz.ondragleave = () => dz.classList.remove('over');
    dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); const d = this.ctx.drag(); if (d && d.effect) { const f = mkFx(d.effect); if (f) { list.push(f); this.render(); } } };
    P.appendChild(dz);
  }

  renderComp(P) {
    const S = this.ctx.state, E = this.ctx.engine;
    $('leftTitle').textContent = S.name || 'Composição';
    this.autopilotRows(P, S.compAutopilot, (k, v) => { S.compAutopilot[k] = v; for (const L of S.layers) L.autopilot = { ...S.compAutopilot }; this.render(); }, ' Aqui vale para todas as camadas de uma vez.');
    P.appendChild(this.phead('Composição', 'Composição|Controles gerais.'));
    P.appendChild(this.pnum('Master', 'Master|Brilho geral de tudo que sai.', Math.round(S.master * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { S.master = v / 100; E.master = S.master * S.opacity; }));
    P.appendChild(this.pnum('Velocidade', 'Velocidade|Multiplica a velocidade de todos os vídeos.', S.speed, { min: 0.1, max: 4, step: 0.05, dec: 2, unit: 'x', bar: true, reset: 1 }, v => { S.speed = v; this.ctx.applySpeed(); }));
    P.appendChild(this.phead('Vídeo', 'Vídeo|Opacidade da composição.'));
    P.appendChild(this.pnum('Opacidade', 'Opacidade|Esmaece a composição inteira.', Math.round(S.opacity * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { S.opacity = v / 100; E.master = S.master * S.opacity; }));
    const AU = this.ctx.audio;
    if (AU) {
      P.appendChild(this.phead('Áudio e FFT', 'Áudio e FFT|A reação ao som: os níveis de graves, médios e agudos alimentam os parâmetros animados com a forma "FFT" (botão ♪ de cada parâmetro).'));
      P.appendChild(this.pselect('Fonte', 'Fonte da FFT|Composição: o som dos clipes. Microfone: a entrada de áudio do computador (placa de som ou microfone).', [['comp', 'Composição'], ['mic', 'Microfone / entrada']], AU.settings.source, v => { AU.setSource(v).then(() => this.render()); }));
      P.appendChild(this.pnum('Ganho', 'Ganho|Multiplica os níveis.', AU.settings.gain, { min: 0, max: 8, step: 0.1, dec: 1, unit: 'x', bar: true, reset: 1 }, v => { AU.settings.gain = v; }));
      P.appendChild(this.pnum('Queda', 'Queda (fallback)|Quão rápido o nível cai depois do pico, por segundo.', AU.settings.fallback, { min: 0.2, max: 30, step: 0.2, dec: 1, unit: '/s', bar: true, reset: 4 }, v => { AU.settings.fallback = v; }));
      const m = el('div', 'pv meters'); for (const [k, nm] of BANDS) { const w = el('div', 'meter'); w.dataset.band = k; w.title = nm; w.appendChild(el('i')); m.appendChild(w); } P.appendChild(this.prow('Níveis', 'Níveis|Graves, médios-graves, médios, agudos e tudo, agora.', m));
      if (AU.err) P.appendChild(this.prow('Aviso', '', el('span', 'pinfo', AU.err)));
    }
    const X = S.xfade;
    P.appendChild(this.phead('Crossfader', 'Crossfader|Camadas e grupos no bus A ficam de um lado, os do bus B do outro; o fader embaixo da grade passa de um para o outro. O bus de cada camada é escolhido no painel Camada.'));
    P.appendChild(this.pnum('Posição', 'Posição|0 % mostra só o bus A, 100 % só o bus B.', Math.round(X.pos * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 50 }, v => { X.pos = v / 100; X.target = null; this.ctx.renderDecks(); }));
    P.appendChild(this.pselect('Curva', 'Curva|Linear: proporcional. Potência igual: os dois lados somam sempre o mesmo brilho. Corte: troca seca no meio.', [['linear', 'Linear'], ['power', 'Potência igual'], ['cut', 'Corte']], X.curve, v => { X.curve = v; }));
    P.appendChild(this.pselect('Comportamento', 'Comportamento|O que os botões A e B fazem: cortam na hora ou esmaecem no tempo abaixo.', [['cut', 'Corta'], ['fade', 'Esmaece']], X.behaviour, v => { X.behaviour = v; }));
    if (X.behaviour === 'fade') P.appendChild(this.pnum('Tempo', 'Tempo|Quanto demora o esmaecer dos botões A e B.', X.secs, { min: 0.1, max: 30, step: 0.1, dec: 1, unit: ' s', bar: true, reset: 2 }, v => { X.secs = v; }));
    const xb = el('div', 'pv'); const fa = el('button', 'wide', 'Ir para A'); fa.type = 'button'; fa.onclick = () => this.ctx.fadeTo('A'); const fb = el('button', 'wide', 'Ir para B'); fb.type = 'button'; fb.onclick = () => this.ctx.fadeTo('B'); xb.append(fa, fb); P.appendChild(this.prow('Ir para', 'Ir para A / B|O mesmo que os botões ao lado do fader.', xb));
    this.transformRows(P, E.compTransform, ' da composição inteira');
    this.fxRows(P, { fx: E.compFx }, 'da composição');
  }
  // parâmetros que alguns modos de mistura/transição têm: cor (to Color) e suavidade (Luma Key, Dissolve, Wipe…)
  mixerOptRows(P, modeId, opt, what) {
    const m = mixerById(modeId);
    if (m.color) P.appendChild(this.pcolor('Cor', 'Cor ' + what + (m.id === 'chromakey' ? '|A cor que some da camada (o verde ou o azul do fundo).' : '|A cor pela qual o modo "' + m.name + '" passa.'), mixerColor(m.id, opt), v => { opt.color = v; }));
    if (m.smooth) P.appendChild(this.pnum('Suavidade', 'Suavidade ' + what + '|Borda macia do modo "' + m.name + '".', Math.round((opt.smooth ?? 0.1) * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 10 }, v => { opt.smooth = v / 100; }));
  }
  renderLayer(P, L) {
    if (!L) return; const S = this.ctx.state;
    $('leftTitle').textContent = L.name;
    P.appendChild(this.ptext('Nome', 'Nome|O nome da camada, como aparece na grade.', L.name, v => { L.name = v || L.name; this.ctx.renderGrid(); }));
    this.autopilotRows(P, L.autopilot || (L.autopilot = AUTOPILOT()), (k, v) => { L.autopilot[k] = v; this.render(); });
    P.appendChild(this.phead('Camada', 'Camada|Controles da camada.'));
    this.animRow(P, this.pnum('Master', 'Master|Opacidade da camada; o fader da grade é o mesmo.', Math.round(L.opacity * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { L.opacity = v / 100; this.ctx.renderGrid(); }), 'Master', L, '@opacity', { min: 0, max: 100, step: 1, unit: ' %' });
    P.appendChild(this.phead('Vídeo', 'Vídeo|Como a camada entra na composição.'));
    P.appendChild(this.pselect('Mistura', 'Mistura|Como a camada entra sobre o que está embaixo, com os modos do Resolume. Até 50 % do fader a camada mistura; de 50 a 100 % vai ficando normal por cima. Os modos "50" misturam no fader inteiro.', MIXER_OPTS, L.blend === 'normal' ? 'alpha' : L.blend, v => { L.blend = v; }));
    P.appendChild(this.pseg('Rápidos', 'Rápidos|Cinco modos de mistura a um clique; a lista acima tem todos os outros.', [['alpha', 'Alpha'], ['add', 'Add'], ['multiply', 'Mult'], ['screen', 'Screen'], ['overlay', 'Over']], L.blend === 'normal' ? 'alpha' : L.blend, v => { L.blend = v; }));
    this.mixerOptRows(P, L.blend, L.blendOpt || (L.blendOpt = MIXER_OPT()), 'da mistura');
    P.appendChild(this.pselect('Bus', 'Bus do crossfader|A ou B: o crossfader embaixo da grade esmaece entre os dois lados. Nenhum: a camada não entra no crossfader.', [['', 'Nenhum'], ['A', 'A'], ['B', 'B']], L.bus || '', v => { L.bus = v || null; }));
    P.appendChild(this.pselect('Grupo', 'Grupo|Em que grupo a camada está. Grupos juntam camadas vizinhas numa só, com opacidade, mistura e efeitos próprios.', [['', 'Nenhum'], ...S.groups.map(g => [String(g.id), g.name])], L.group != null ? String(L.group) : '', v => this.ctx.setLayerGroup(S.selLayer, v ? +v : null)));
    P.appendChild(this.prow('Largura', '', el('span', 'pinfo', String(this.ctx.engine.W))));
    P.appendChild(this.prow('Altura', '', el('span', 'pinfo', String(this.ctx.engine.H))));
    P.appendChild(this.phead('Transição', 'Transição|Ao disparar outro clipe nesta camada, o anterior sai e o novo entra pelo modo escolhido, durante a duração. Como no Resolume: a transição é um modo de mistura rodado no tempo.'));
    P.appendChild(this.pselect('Modo', 'Modo da transição|Escolha da lista ou "Ao acaso", que sorteia um modo a cada disparo.', [['random', 'Ao acaso'], ...MIXER_OPTS], L.transMode || 'alpha', v => { L.transMode = v; }));
    P.appendChild(this.pnum('Duração', 'Duração da transição|0 corta seco. Até 10 s, como no Resolume.', L.transition || 0, { min: 0, max: 10, step: 0.1, dec: 1, unit: ' s', bar: true, reset: 0 }, v => { L.transition = v; }));
    if (L.transMode !== 'random') this.mixerOptRows(P, L.transMode, L.transOpt || (L.transOpt = MIXER_OPT()), 'da transição');
    this.transformRows(P, L.transform || (L.transform = { x: 0, y: 0, scale: 1, rot: 0 }), ' da camada');
    this.fxRows(P, L, 'da camada');
    if (S.layers.length > 1) P.appendChild(this.pbutton('Remover esta camada', 'Remover camada|Apaga a camada e os clipes dela.', () => this.ctx.removeLayer(S.selLayer)));
  }
  renderGroup(P, g) {
    if (!g) return; const S = this.ctx.state;
    $('leftTitle').textContent = g.name;
    P.appendChild(this.ptext('Nome', 'Nome|O nome do grupo, como aparece na grade.', g.name, v => { g.name = v || g.name; this.ctx.renderGrid(); }));
    P.appendChild(this.phead('Grupo', 'Grupo|Controles do grupo inteiro: as camadas dele entram na composição como uma só.'));
    P.appendChild(this.pnum('Master', 'Master|Opacidade do grupo; o fader da grade é o mesmo.', Math.round(g.opacity * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { g.opacity = v / 100; this.ctx.renderGrid(); }));
    P.appendChild(this.pnum('Velocidade', 'Velocidade|Multiplica a velocidade dos vídeos das camadas do grupo.', g.speed, { min: 0.1, max: 4, step: 0.05, dec: 2, unit: 'x', bar: true, reset: 1 }, v => { g.speed = v; this.ctx.applySpeed(); }));
    P.appendChild(this.phead('Vídeo', 'Vídeo|Como o grupo entra na composição.'));
    P.appendChild(this.pselect('Mistura', 'Mistura do grupo|Os mesmos modos da camada.', MIXER_OPTS, g.blend || 'alpha', v => { g.blend = v; }));
    this.mixerOptRows(P, g.blend, g.blendOpt || (g.blendOpt = MIXER_OPT()), 'da mistura');
    P.appendChild(this.pselect('Bus', 'Bus do crossfader|A ou B: o grupo inteiro entra no crossfader.', [['', 'Nenhum'], ['A', 'A'], ['B', 'B']], g.bus || '', v => { g.bus = v || null; }));
    P.appendChild(this.prow('Camadas', '', el('span', 'pinfo', S.layers.filter(L => L.group === g.id).map(L => L.name).join(', ') || 'nenhuma')));
    this.transformRows(P, g.transform || (g.transform = { x: 0, y: 0, scale: 1, rot: 0 }), ' do grupo');
    this.fxRows(P, g, 'do grupo');
    P.appendChild(this.pbutton('Adicionar camada ao grupo', 'Adicionar camada|Uma camada nova por cima das do grupo.', () => this.ctx.addLayerToGroup(g)));
    P.appendChild(this.pbutton('Remover o grupo (manter as camadas)', 'Remover grupo|As camadas ficam, soltas.', () => this.ctx.removeGroup(g, false)));
  }
  // Transport do clipe, igual ao do Resolume 7.28 (medido em 2026-11-10 com mouse real e pela API, tools/compare/sondas/clip-transport.py):
  // tipo no cabeçalho; onda do áudio na linha do tempo (apagada fora da faixa IN–OUT); agulha em pentágono; tempo em ss.mmm no canto;
  // clique parado não pula, arrastar na onda leva a agulha, arrastar na barra de baixo leva a ponta (IN ou OUT) mais próxima;
  // botão direito abre o balão da agulha (um quadro para lá e para cá); modo e "ao voltar" são dois botões com ícone à direita.
  transportRows(P, clip) {
    const t = clip.tr, v = mediaOf(clip), S = this.ctx.state, dur = clip.dur || 0, isBpm = t.sync === 'bpm', B = this.ctx.state.bpm;
    const chg = (fn) => { this.pushUndo(); fn(); this.c.onChange(); this.refresh(); };
    const hd = this.phead('Transporte', 'Transporte|Linha do tempo, direção, modo, velocidade, entrada e saída. À direita, o tipo: Linha do tempo (a velocidade é a sua) ou BPM Sync (a faixa entre a entrada e a saída dura N batidas, presa ao relógio de BPM).');
    const ty = el('select', 'ttype'); ty.dataset.k = 'tipo'; for (const [val, tx] of [['timeline', 'Linha do tempo'], ['bpm', 'BPM Sync']]) { const o = el('option', '', tx); o.value = val; ty.appendChild(o); }
    ty.value = t.sync || 'timeline'; ty.onclick = (e) => e.stopPropagation();
    ty.onchange = () => chg(() => { t.sync = ty.value; if (t.sync === 'bpm') { if (!t.beatsSet) t.beats = autoBeats(((t.out || dur) - t.in), B ? B.bpm : 120); } else { setBeatLoop(clip, 0); setRate(clip, S.speed); } });
    hd.appendChild(ty); P.appendChild(hd);
    const tl = el('div', 'timeline'); tl.dataset.help = 'Linha do tempo|Arraste na onda para esfregar o clipe. Na barra de baixo, arraste os triângulos da entrada (cut in) e da saída (cut out). Botão direito: andar quadro a quadro.';
    const bar = el('div', 'tbar'), range = el('div', 'range'), wav0 = el('div', 'wave'), wav1 = el('div', 'wave on'), ticks = el('div', 'ticks'), head = el('div', 'head'), hin = el('div', 'hnd in'), hout = el('div', 'hnd out'), txt = el('div', 'ttxt');
    if (clip.waveTl) { wav0.style.backgroundImage = wav1.style.backgroundImage = 'url("' + clip.waveTl + '")'; }
    if (isBpm) { let n = Math.max(1, Math.round(t.beats || 8)); while (n > 48) n /= 2; let h = ''; for (let i = 0; i <= n; i++) h += '<i style="left:' + (i / n * 100).toFixed(3) + '%"></i>'; ticks.innerHTML = h; }
    bar.appendChild(range); tl.append(wav0, wav1, ticks, bar, head, hin, hout, txt);
    // a escala (0 a 100%) começa e termina 6 px para dentro da barra, como no Resolume: os triângulos de entrada e saída ficam dentro
    // das pontas da barra e a agulha, no 100%, termina rente ao fim da barra
    const X = (f) => 'calc(6px + (100% - 12px) * ' + f + ')';
    const fmtR = (s) => { s = Math.max(0, s || 0); return (dur >= 60 ? String(Math.floor(s / 60)).padStart(2, '0') + ':' : '') + (dur >= 60 ? s % 60 : s).toFixed(3).padStart(6, '0'); };
    const step = 1 / ((clip.player && clip.player.fps) || 30);
    let bub = null;
    const place = () => { const f0 = t.in / dur, f1 = (t.out || dur) / dur, fh = Math.max(0, Math.min(1, v.currentTime / dur)); range.style.left = X(f0); range.style.width = 'calc((100% - 12px) * ' + Math.max(0, f1 - f0) + ')'; hin.style.left = X(f0); hout.style.left = X(f1); head.style.left = X(fh);
      wav1.style.clipPath = 'inset(0 ' + ((1 - f1) * 100).toFixed(3) + '% 0 ' + (f0 * 100).toFixed(3) + '%)'; hin.title = 'Entrada ' + fmtR(t.in); hout.title = 'Saída ' + fmtR(t.out || dur); txt.textContent = fmtR(v.currentTime);
      if (bub) { bub.style.left = 'clamp(52px, ' + X(fh) + ', calc(100% - 52px))'; bub.querySelector('b').textContent = fmtR(v.currentTime); } };
    // como no Resolume: se o IN ou o OUT passam pela agulha, ela vem junto (é empurrada para a ponta); fora isso fica onde está
    const clampHead = () => { const lo = t.in, hi = t.out || dur, cur = v.currentTime; if (cur < lo) seekClip(clip, lo); else if (cur > hi) seekClip(clip, hi); };
    const openBub = () => { if (bub) return; clip._bub = true; bub = el('div', 'tbub'); const mk = (k, tx, help, fn) => { const b = el('button', '', tx); b.type = 'button'; b.dataset.k = k; b.title = help; b.onclick = (e) => { e.stopPropagation(); fn(); place(); }; return b; };
      bub.append(mk('|◀', '⏮', 'Ir para a entrada', () => seekClip(clip, t.in)), mk('−1q', '◂', 'Um quadro para trás', () => { pauseClip(clip); seekClip(clip, v.currentTime - step); }), el('b'), mk('+1q', '▸', 'Um quadro para a frente', () => { pauseClip(clip); seekClip(clip, v.currentTime + step); }), mk('▶|', '⏭', 'Ir para a saída', () => seekClip(clip, (t.out || dur) - 0.05)));
      bub.onpointerdown = (e) => e.stopPropagation(); tl.appendChild(bub); place(); };
    const closeBub = () => { clip._bub = false; if (bub) { bub.remove(); bub = null; } };
    if (clip._bub) openBub();
    place(); this.tl = { place, clip };
    tl.oncontextmenu = (e) => { e.preventDefault(); if (bub) closeBub(); else openBub(); };
    tl.onpointerdown = (e) => {
      if (e.button !== 0) return; e.preventDefault(); closeBub(); tl.setPointerCapture(e.pointerId);
      const r = tl.getBoundingClientRect(), fr = (ev) => Math.max(0, Math.min(1, (ev.clientX - r.left - 6) / Math.max(1, r.width - 12)));
      let what = 'seek';
      if (e.target === hin) what = 'in'; else if (e.target === hout) what = 'out';
      else if (e.clientY >= r.bottom - 11) { const s = fr(e) * dur; what = Math.abs(s - t.in) <= Math.abs(s - (t.out || dur)) ? 'in' : 'out'; }
      const x0 = e.clientX; let moved = false;
      const at = (ev) => { const s = fr(ev) * dur; if (what === 'in') { t.in = Math.min(s, t.out || dur); clampHead(); } else if (what === 'out') { t.out = Math.max(s, t.in, 0.001); clampHead(); } else seekClip(clip, s); place(); };
      tl.onpointermove = (ev) => { if (!tl.hasPointerCapture(ev.pointerId)) return; if (!moved && Math.abs(ev.clientX - x0) < 1) return; if (!moved) { moved = true; this.pushUndo(); } at(ev); };
      tl.onpointerup = () => { tl.onpointermove = null; tl.onpointerup = null; if (moved) { this.c.onChange(); this.render(); } };
    };
    const row = el('div', 'tlwrap'); row.appendChild(tl); P.appendChild(row);
    // ◀ ‖ ▶ à esquerda (o ativo em verde-menta); à direita o modo e o "ao voltar", cada um num botão com ícone e seta
    const I = { back: '<svg viewBox="0 0 16 16"><path d="M11 2.5v11L3.5 8z"/></svg>', pause: '<svg viewBox="0 0 16 16"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/></svg>', fwd: '<svg viewBox="0 0 16 16"><path d="M5 2.5v11L12.5 8z"/></svg>',
      caret: '<svg class="car" viewBox="0 0 8 8"><path d="M0 2h8L4 6.5z"/></svg>',
      loop: '<svg viewBox="0 0 16 16"><path d="M5 4h6a3 3 0 0 1 3 3v.5h-1.6V7A1.4 1.4 0 0 0 11 5.6H5V8L1.5 4.8 5 1.6zM11 12H5a3 3 0 0 1-3-3v-.5h1.6V9A1.4 1.4 0 0 0 5 10.4h6V8l3.5 3.2-3.5 3.2z"/></svg>',
      bounce: '<svg viewBox="0 0 16 16"><path d="M5 4.5v2.7h6V4.5L15 8l-4 3.5V8.8H5v2.7L1 8z"/></svg>',
      random: '<svg viewBox="0 0 16 16"><path d="M1 4.4h3c1.3 0 2.1.6 2.9 1.800l2 3c.5.800.9 1.200 1.700 1.200h1.400V8.600L15 11.200l-3 2.600V12h-1.400c-1.400 0-2.200-.6-3-1.800l-2-3C5.100 6.400 4.700 6 4 6H1zM12 2.200L15 4.800l-3 2.600V5.600h-1.400c-.4 0-.7.100-1 .4l-.9-1.300c.5-.4 1.200-.700 1.900-.700H12zM1 10.400h3c.4 0 .7-.1 1-.4l.9 1.300c-.5.4-1.200.7-1.900.7H1z"/></svg>',
      onceclear: '<svg viewBox="0 0 16 16"><path d="M2 7.200h8V4.500L14.500 8 10 11.500V8.800H2z"/></svg>',
      once: '<svg viewBox="0 0 16 16"><path d="M1 7.200h6.500V4.500L12 8l-4.500 3.500V8.800H1zM12.600 3.500h1.900v9h-1.900z"/></svg>',
      restart: '<svg viewBox="0 0 16 16"><path d="M2 3.500l5.500 4.500L2 12.500zM7.500 7.200H15v1.600H7.500z"/></svg>',
      continue: '<svg viewBox="0 0 16 16"><path d="M1 7.200h6v1.600H1zM8 3.500l5.500 4.500L8 12.500z"/></svg>',
      relative: '<svg viewBox="0 0 16 16"><path d="M1 4.200h5v1.600H1zM1 10.200h5v1.600H1zM8 3.500l5.500 4.500L8 12.500z"/></svg>' };
    const btn = (key, help, on, fn, svg) => { const b = el('button', 'ib' + (on ? ' on' : '')); b.innerHTML = svg; b.dataset.k = key; b.type = 'button'; b.dataset.help = help; b.onclick = () => { fn(); setTimeout(() => this.render(), 40); }; return b; };
    const dd = (key, help, opts, cur, set) => { const w = el('label', 'tdd'); w.dataset.help = help; w.innerHTML = (I[cur] || I.loop) + I.caret; const s = el('select'); s.dataset.k = key; for (const [val, tx] of opts) { const o = el('option', '', tx); o.value = val; s.appendChild(o); } s.value = cur; s.onchange = () => chg(() => set(s.value)); w.appendChild(s); return w; };
    const tr = el('div', 'tbtns'), gl = el('div', 'tg'), gr = el('div', 'tg');
    gl.append(
      btn('◀', 'Para trás|Toca de trás para a frente.', t.playing && t.dir < 0, () => playClip(clip, -1, S.speed), I.back),
      btn('‖', 'Pausar|Para onde está.', !t.playing, () => pauseClip(clip), I.pause),
      btn('▶', 'Para a frente|Toca normalmente.', t.playing && t.dir > 0, () => playClip(clip, 1, S.speed), I.fwd));
    gr.append(
      dd('modo', 'Modo|Loop repete. Vai e volta inverte nas pontas. Aleatório pula pelo clipe. Uma vez e limpa: no fim, a camada sai do ar. Uma vez e segura: no fim, fica no último quadro.', PLAY_MODES, t.mode, v2 => { t.mode = v2; }),
      dd('voltar', 'Ao voltar|O que acontece quando o clipe é disparado de novo depois de outro ter tocado na camada. Recomeça: da entrada. Continua: de onde parou. Relativo: na mesma altura em que estava o clipe que saiu.', AWAY_MODES, t.away || 'restart', v2 => { t.away = v2; }));
    tr.append(gl, gr); P.appendChild(tr);
    this.animRow(P, this.pnum('Velocidade', isBpm ? 'Velocidade|Multiplica o andamento do BPM Sync: 2x anda o dobro, 0,5x a metade. De 0 a 16x, como no Resolume.' : 'Velocidade|1x é a do arquivo; de 0 a 10x, como no Resolume.', clip.speed, { min: 0, max: isBpm ? 16 : 10, step: 0.01, dec: 2, unit: 'x', bar: true, reset: 1 }, v2 => { clip.speed = Math.max(0.01, v2); setRate(clip, S.speed); }), 'Velocidade', clip, '@speed', { min: 0, max: isBpm ? 16 : 10, step: 0.01, dec: 2, unit: 'x' });
    const faixa = (t.out || dur) - t.in;
    const mini = (rowEl, list) => { for (const [txt0, title, fn] of list) { const b = el('button', 'mini', txt0); b.type = 'button'; b.title = title; b.dataset.k = txt0; b.onclick = (e) => { e.stopPropagation(); chg(fn); }; rowEl.querySelector('.pv').appendChild(b); } };
    if (isBpm) {
      // Sync Mode do Resolume: Beats (a faixa dura N batidas) ou BPM (você diz o BPM do clipe e a conta das batidas sai dele)
      const byBpm = t.syncMode === 'bpm', nb = t.beats || 8, cb = faixa > 0 ? nb * 60 / faixa : 120;
      const setBeats = (n) => { t.beats = Math.max(1 / 128, Math.min(1048576, n)); t.beatsSet = true; };
      const srow = this.pnum('Sync Mode', byBpm ? 'BPM do clipe|O andamento do arquivo. O clipe acelera ou freia para bater com o relógio de BPM.' : 'Batidas|Quantas batidas do relógio de BPM a faixa entre a entrada e a saída dura.', byBpm ? +cb.toFixed(2) : nb, byBpm ? { min: 1, max: 999, step: 1, dec: 2 } : { min: 1 / 128, max: 1048576, step: 1, dec: nb % 1 ? 3 : 0 }, v2 => { if (byBpm) setBeats(faixa * Math.max(1, v2) / 60); else setBeats(v2); });
      mini(srow, [['/2', 'Metade das batidas (toca duas vezes mais rápido)', () => setBeats(nb / 2)], ['×2', 'Dobro das batidas (toca duas vezes mais devagar)', () => setBeats(nb * 2)]]);
      const sm = el('select', 'smode'); sm.dataset.k = 'syncmode'; for (const [val, tx] of [['beats', 'Batidas'], ['bpm', 'BPM']]) { const o = el('option', '', tx); o.value = val; sm.appendChild(o); } sm.value = byBpm ? 'bpm' : 'beats'; sm.onchange = () => chg(() => { t.syncMode = sm.value; });
      srow.querySelector('.pv').prepend(sm); P.appendChild(srow);
    } else {
      const curDur = faixa / (clip.speed * S.speed);
      const setDur = (d) => { clip.speed = Math.max(0.01, Math.min(10, faixa / (Math.max(0.05, d) * S.speed))); setRate(clip, S.speed); };
      const drow = this.pnum('Duração', 'Duração|Quanto tempo a faixa entre a entrada e a saída leva para tocar. Mudar aqui muda a velocidade. /2 toca duas vezes mais rápido, ×2 duas vezes mais devagar.', +curDur.toFixed(2), { min: 0.05, max: 3600, step: 0.1, dec: 2, unit: ' s', reset: +faixa.toFixed(2) }, setDur);
      mini(drow, [['/2', 'Metade da duração (velocidade em dobro)', () => setDur(curDur / 2)], ['×2', 'Dobro da duração (metade da velocidade)', () => setDur(curDur * 2)]]);
      P.appendChild(drow);
    }
    // Cue Points: seis marcas. A setinha grava a posição da agulha; o botão grande pula para ela (vazio, grava). Medido no Resolume;
    // lá não achei como apagar, aqui é o botão direito.
    P.appendChild(this.phead('Cue Points', 'Cue Points|Seis marcas no clipe. A setinha da esquerda grava a posição de agora; o botão ao lado pula para ela. Num botão vazio, o clique grava. Botão direito apaga.'));
    const cues = t.cues || (t.cues = [null, null, null, null, null, null]), cr = el('div', 'cues');
    cues.forEach((c0, i) => { const w = el('div', 'cue' + (c0 != null ? ' on' : '')), a = el('button', 'cset'), j = el('button', 'cjump'); a.type = j.type = 'button'; a.dataset.k = 'cset' + (i + 1); j.dataset.k = 'cue' + (i + 1);
      a.dataset.help = 'Gravar cue ' + (i + 1) + '|Grava aqui a posição da agulha.'; j.dataset.help = 'Cue ' + (i + 1) + (c0 != null ? ' · ' + fmtR(c0) : '') + '|Pula para a posição gravada. Vazio: grava. Botão direito apaga.';
      a.onclick = () => chg(() => { cues[i] = v.currentTime; }); j.onclick = () => { if (cues[i] == null) chg(() => { cues[i] = v.currentTime; }); else { seekClip(clip, cues[i]); place(); } };
      w.oncontextmenu = (e) => { e.preventDefault(); chg(() => { cues[i] = null; }); }; w.append(a, j); cr.appendChild(w); });
    P.appendChild(cr);
    if (isBpm) {
      // Beat Looper (só em BPM Sync): prende o clipe num laço de N batidas a partir de agora; "Alcança" decide se, ao soltar, o clipe
      // pula para onde estaria (ligado) ou segue de onde o laço parou
      P.appendChild(this.phead('Beat Looper', 'Beat Looper|Prende o clipe num laço do tamanho escolhido, em batidas, a partir de agora. Off solta.'));
      const br = el('div', 'bloop'), seg = el('div', 'bseg');
      for (const [val, tx] of BEATLOOPS) { const b = el('button', (t.loop || 0) === val ? 'on' : '', tx); b.type = 'button'; b.dataset.k = 'loop' + tx; b.onclick = () => chg(() => setBeatLoop(clip, val)); seg.appendChild(b); }
      const cu = el('button', 'catch' + (t.catchUp ? ' on' : ''), 'Alcança'); cu.type = 'button'; cu.dataset.k = 'catch'; cu.dataset.help = 'Alcança (catch up)|Ligado: ao soltar o laço, o clipe pula para onde estaria se nunca tivesse entrado nele. Desligado: segue de onde o laço parou.'; cu.onclick = () => chg(() => { t.catchUp = !t.catchUp; });
      br.append(seg, cu); P.appendChild(br);
    }
    P.appendChild(this.pnum('Entrada', 'Entrada (cut in)|Onde o clipe começa, em segundos.', t.in, { min: 0, max: dur, step: 0.1, dec: 1, unit: ' s', bar: true, reset: 0 }, v2 => { t.in = Math.min(v2, t.out || dur); clampHead(); }));
    P.appendChild(this.pnum('Saída', 'Saída (cut out)|Onde o clipe termina, em segundos.', t.out || dur, { min: 0, max: dur, step: 0.1, dec: 1, unit: ' s', bar: true, reset: dur }, v2 => { t.out = Math.max(v2, t.in, 0.001); clampHead(); }));
    P.appendChild(this.prow('Arquivo', 'Arquivo|Duração do arquivo inteiro.', el('span', 'pinfo', fmtT1(dur))));
    // arquivo preparado (H.264 todo intra ou DXV) toca no reprodutor próprio: ré e pulo lisos
    const prog = this.ctx.preparing(clip);
    if (clip.anim) P.appendChild(this.prow('Arquivo', 'Animação|GIF (ou WebP/AVIF) animado, quadro a quadro: ré, pulo e velocidade funcionam como num vídeo preparado.', el('span', 'pinfo ok', 'animação · ' + clip.player.frames + ' quadros · ' + clip.player.fps.toFixed(0) + ' fps')));
    else if (clip.player) P.appendChild(this.prow('Arquivo', 'Preparado|Cada quadro é chave e o OpenLuz decodifica por conta própria: ré, pulo e esfregar sem travar.', el('span', 'pinfo ok', 'preparado · ' + (clip.player.allIntra ? 'todo intra' : clip.player.codec) + ' · ' + clip.player.fps.toFixed(0) + ' fps')));
    else if (prog != null) P.appendChild(this.prow('Preparando', '', el('span', 'pinfo', Math.round(prog * 100) + ' %')));
    else if (clip.path && !isPrepared(clip.name)) { P.appendChild(this.pbutton('Preparar (H.264 todo intra)', 'Preparar|Converte para H.264 com todos os quadros chave, como o DXV do Resolume: ré, pulo e esfregar ficam lisos. Cria nome.proj.mp4 ao lado do original.', () => this.ctx.prepare('h264'))); }
    else P.appendChild(this.prow('Arquivo', '', el('span', 'pinfo', 'solto na janela sem caminho; abra pelo painel Arquivos para poder preparar')));
  }
  // bloco de trilha, como no Resolume: faixa colorida (rosa = áudio, verde = vídeo) com miniatura, nome do arquivo e dados; dobra como as seções
  track(cls, fk, help, title, lines, thumb, extra) {
    const h = el('div', 'phead trk ' + cls); h.dataset.fk = fk; h.dataset.help = help;
    const th = el('div', 'tth'); if (thumb) th.style.backgroundImage = 'url("' + thumb + '")';
    const inf = el('div', 'tinf'); inf.appendChild(el('span', '', title)); for (const l of lines) if (l) inf.appendChild(el('small', '', l));
    h.append(th, inf); for (const x of extra || []) h.appendChild(x); return h;
  }
  audioRows(P, clip) {
    const a = clip.audio, hms = (x) => { x = Math.max(0, x || 0); return String(Math.floor(x / 3600)).padStart(2, '0') + ':' + String(Math.floor(x / 60) % 60).padStart(2, '0') + ':' + (x % 60).toFixed(3).padStart(6, '0'); };
    P.appendChild(this.track('aud', 'Áudio', 'Áudio|O som do arquivo: volume, pan, mudo e os efeitos de áudio.', clip.name, ['Áudio' + (clip.wave ? '' : ' · sem onda (arquivo sem som ou grande demais)'), hms(clip.dur)], clip.wave));
    this.animRow(P, this.pnum('Volume', 'Volume|', Math.round(a.vol * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v2 => { a.vol = v2 / 100; applyAudio(clip); }), 'Volume', clip, '@vol', { min: 0, max: 100, step: 1, unit: ' %' });
    P.appendChild(this.pnum('Pan', 'Pan|Esquerda −100, direita 100.', Math.round(a.pan * 100), { min: -100, max: 100, step: 1, bar: true, reset: 0 }, v2 => { a.pan = v2 / 100; applyAudio(clip); }));
    P.appendChild(this.pcheck('Mudo', 'Mudo|', a.mute, v2 => { a.mute = v2; applyAudio(clip); }, a.mute ? 'sem som' : 'com som'));
    this.audioFxRows(P, clip);
  }
  // cadeia de efeitos de áudio do clipe (os seis do Resolume), com os parâmetros
  audioFxRows(P, clip) {
    const list = clip.afx || (clip.afx = []);
    P.appendChild(this.phead('Efeitos de áudio', 'Efeitos de áudio|Arraste um efeito de áudio do painel Efeitos para cá. A ordem é de cima para baixo.'));
    list.forEach((f, i) => {
      const def = audioFxById(f.id); if (!def) return;
      const h = el('div', 'phead fxh'); h.dataset.help = def.name + '|' + def.desc;
      const by = el('label', 'ck' + (f.bypass ? '' : ' on')); by.innerHTML = f.bypass ? ICON.itemOff : ICON.item; by.title = 'Liga e desliga o efeito'; by.onclick = () => { f.bypass = !f.bypass; rebuildAudioFx(clip); this.render(); };
      const up = el('button', 'mini', '▲'); up.type = 'button'; up.title = 'Subir'; up.disabled = i === 0; up.onclick = () => { list.splice(i - 1, 2, list[i], list[i - 1]); rebuildAudioFx(clip); this.render(); };
      const x = el('button', 'mini', '✕'); x.type = 'button'; x.title = 'Tirar o efeito'; x.onclick = () => { list.splice(i, 1); rebuildAudioFx(clip); this.render(); };
      h.append(by, el('span', '', def.name), up, x); P.appendChild(h);
      if (!f.bypass) for (const p of def.params) P.appendChild(this.pnum(p.label, def.name + ' · ' + p.label + '|' + def.desc, f.params[p.key] ?? p.def, { min: p.min, max: p.max, step: p.step, dec: p.step < 1 ? 2 : 0, unit: p.unit, bar: true, reset: p.def }, v => { f.params[p.key] = v; updateAudioFx(clip, f); }));
    });
    const dz = el('div', 'dropzone', list.length ? 'Solte outro efeito de áudio aqui' : 'Solte um efeito de áudio aqui'); dz.dataset.help = 'Soltar efeito de áudio|Arraste do painel Efeitos (parte de baixo).';
    dz.ondragover = (e) => { const d = this.ctx.drag(); if (d && d.afx) { e.preventDefault(); dz.classList.add('over'); } };
    dz.ondragleave = () => dz.classList.remove('over');
    dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); const d = this.ctx.drag(); if (d && d.afx) { const f = AUDIO_FX.find(a => a.id === d.afx); if (f) { const params = {}; for (const p of f.params) params[p.key] = p.def; list.push({ id: f.id, params, bypass: false }); rebuildAudioFx(clip); this.render(); } } };
    P.appendChild(dz);
  }
  // chamado a cada quadro: move o cursor da linha do tempo sem redesenhar o painel
  tick() {
    if (this.animTicks) for (const f of this.animTicks) { try { f(); } catch { } }
    if (this.tl && mediaOf(this.tl.clip) && document.body.contains(this.tl.place ? $('clipPan') : null)) { try { this.tl.place(); } catch { } }
    const AU = this.ctx.audio; if (AU && this.tab === 'comp') for (const w of $('leftPan').querySelectorAll('.meter')) w.firstChild.style.height = Math.round((AU.levels[w.dataset.band] || 0) * 100) + '%';
  }
  // ✦ Montar com IA (plano 02-06, maquete texto-ia-mockup.html): pedido, funções, estilo, três versões; clicar troca
  iaRows(P, clip) {
    const D = window.projDesktop, st = clip._ia || (clip._ia = { pedido: null, funcoes: ['diagramar'], estilo: 'ia', versoes: null, escolhida: -1, status: '', servico: '' });
    const box = el('div', 'iabox'); P.appendChild(box);
    box.appendChild(this.phead('✦ Montar com IA', '✦ Montar com IA|Escreva do jeito que sair: a IA monta o cartaz, anima na batida, escreve a partir de um pedido e separa texto longo em clipes. Quem desenha é o OpenLuz: depois dá para mexer em tudo à mão. Serviço em Configuração › IA.'));
    box.appendChild(this.parea('Pedido', 'Pedido|O texto (ou, com Escrever, o que você quer que a IA escreva).', st.pedido ?? clip.text.content, v => { st.pedido = v; }));
    const fr = el('div', 'iafun'); fr.dataset.help = 'O que a IA faz|Ligue uma ou mais funções.';
    for (const [k, nome] of FUNCOES) { const b = el('button', st.funcoes.includes(k) ? 'on' : '', nome); b.type = 'button'; b.dataset.f = k; b.onclick = () => { st.funcoes = st.funcoes.includes(k) ? st.funcoes.filter(x => x !== k) : [...st.funcoes, k]; this.render(); }; fr.appendChild(b); }
    box.appendChild(this.prow('Funções', 'O que a IA faz|Diagramar, Animar, Escrever e Separar em clipes.', fr));
    box.appendChild(this.pselect('Estilo do cartaz', 'Estilo do cartaz|O jeito do cartaz quando a IA diagrama.', ESTILOS, st.estilo, v => { st.estilo = v; }));
    const go = el('button', 'wide iago', st.status === 'montando' ? 'Montando…' : '✦ Montar'); go.type = 'button'; go.disabled = st.status === 'montando'; go.dataset.k = 'montar';
    go.onclick = () => this.iaMontar(clip);
    box.appendChild(go);
    const info = el('div', 'iainfo');
    info.append(el('span', '', st.erro ? st.erro : st.servico ? 'Serviço: ' + st.servico : 'Três versões por vez.'));
    const tr = el('a', 'ialink', 'trocar serviço'); tr.onclick = () => this.ctx.iaDialog(() => this.render()); info.appendChild(tr);
    box.appendChild(info);
    if (st.versoes) {
      const row = el('div', 'iaver');
      st.versoes.forEach((v, i) => {
        const b = el('button', 'iav' + (i === st.escolhida ? ' on' : '')); b.type = 'button'; b.dataset.v = i; b.title = v.nome + (v.animar.ligado ? ' · anima' : '') + (v.clipes.length > 1 ? ' · ' + v.clipes.length + ' clipes' : '');
        const cv = el('canvas'); cv.width = 192; cv.height = 108; b.appendChild(cv); b.appendChild(el('span', '', v.nome));
        try { const big = document.createElement('canvas'); big.width = 1920; big.height = 1080; const k = aplicarVersao({ text: { ...clip.text }, panim: {} }, v); drawText(big, k.text, null); const x = cv.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 192, 108); x.drawImage(big, 0, 0, 192, 108); } catch { }
        b.onclick = () => this.iaEscolher(clip, i);
        row.appendChild(b);
      });
      box.appendChild(row);
    }
  }
  // clipe "Texto" (cartaz com caixas, plano 09-01): o editor faz o trabalho; aqui só o botão, as caixas e o fundo
  cartazRows(P, clip) {
    const t = clip.text, up = () => { renderText(clip); this.ctx.renderGrid(); };
    P.appendChild(this.phead('Texto', 'Texto|Cartaz no jeito do Canva: várias caixas, cor e fonte por pedaço, efeitos e animação na batida. Tudo se mexe no editor.'));
    const b = el('button', 'wide edbt', '✎ Editar texto'); b.type = 'button'; b.dataset.k = 'editar'; b.dataset.help = 'Editar texto|Abre o editor: mova, aumente e gire as caixas na tela, escreva com dois cliques, escolha estilos, fontes, efeitos e animação. Dois cliques no clipe também abrem.';
    b.onclick = () => this.ctx.editarTexto(clip); P.appendChild(b);
    P.appendChild(this.phead('Caixas', 'Caixas|As caixas de texto deste clipe; a de baixo fica na frente.'));
    for (const k of t.caixas || []) {
      const r = el('div', 'cartaz-cx'); const s = el('span', '', (textoDe(k).split('\n')[0] || '(vazia)').slice(0, 40)); s.style.cssText = `font-family:"${k.f}";color:${k.c}`;
      r.append(s, el('small', '', (k.fx && k.fx.tipo !== 'nenhum' ? k.fx.tipo : '') + (k.an && k.an.tipo !== 'nenhuma' ? ' ♪' : ''))); r.ondblclick = () => this.ctx.editarTexto(clip); P.appendChild(r);
    }
    P.appendChild(this.pselect('Fundo', 'Fundo|Transparente deixa ver as camadas de baixo.', FUNDOS, t.fundo || 'none', v => { this.ctx.markUndo(); t.fundo = v; up(); }));
  }
  // ✦ IA generativa (plano 09-02, maquete ia-generativa-mockup.html): pedido, estilo, proporção, quantas, depois; Gerar; versões
  iagenRows(P, clip) {
    const st = clip.iagen, D = window.projDesktop;
    const box = el('div', 'iabox iagen'); P.appendChild(box);
    box.appendChild(this.phead('✦ IA generativa', '✦ IA generativa|Escreva o que quer ver: a IA faz a imagem e ela vira este clipe. Serviço em Configuração › IA (imagens).'));
    box.appendChild(this.parea('Pedido', 'Pedido|Descreva a imagem do jeito que sair, em português.', st.pedido, v => { st.pedido = v; }));
    const chips = el('div', 'iachips');
    for (const s of ['floresta neon com fumaça', 'mandala fractal, cores quentes', 'cidade à noite chovendo, reflexos', 'tinta escorrendo, preto e dourado', 'onda do mar em xilogravura']) { const b = el('button', '', s); b.type = 'button'; b.onclick = () => { st.pedido = s; this.render(); }; chips.appendChild(b); }
    box.appendChild(this.prow('Ideias', 'Ideias|Um clique põe a ideia no pedido.', chips));
    const seg = (lab, help, opts, key, conv = (v) => v) => { const r = el('div', 'iafun'); for (const [v, n] of opts) { const b = el('button', String(st[key]) === String(v) ? 'on' : '', n); b.type = 'button'; b.dataset[key] = v; b.onclick = () => { st[key] = conv(v); if (key === 'depois') { this.ctx.markUndo(); this.aplicarDepois(clip); } this.render(); }; r.appendChild(b); } box.appendChild(this.prow(lab, help, r)); };
    seg('Estilo', 'Estilo|O jeito da imagem.', [['ia', 'A IA escolhe'], ['foto', 'Foto'], ['ilustracao', 'Ilustração'], ['neon', 'Neon'], ['aquarela', 'Aquarela'], ['psicodelico', 'Psicodélico'], ['xilogravura', 'Xilogravura'], ['vj', 'Fundo p/ VJ'], ['textura', 'Textura em loop']], 'estilo');
    seg('Proporção', 'Proporção|16:9 enche a tela de projeção; 9:16 é de celular em pé.', [['16:9', '16:9'], ['9:16', '9:16'], ['1:1', '1:1'], ['4:3', '4:3']], 'prop');
    seg('Quantas', 'Quantas|Quantas versões por vez.', [[1, '1'], [2, '2'], [4, '4']], 'qtd', Number);
    seg('Depois', 'Depois|O que a imagem faz no ar: fica parada, Ken Burns (zoom lento) ou pulsa na batida.', [['parada', 'Imagem parada'], ['kenburns', 'Ken Burns'], ['batida', 'Loop na batida']], 'depois');
    const go = el('button', 'wide iago', st.gerando ? (st.espera ? `O serviço pede um tempo: próxima em ${st.espera} s (${st.feitas || 0} de ${st.total})` : `Gerando… ${(st.feitas || 0) + 1} de ${st.total || st.qtd}`) : '✦ Gerar'); go.type = 'button'; go.disabled = !!st.gerando; go.dataset.k = 'gerar';
    go.onclick = () => this.iaGerar(clip, {}); box.appendChild(go);
    if (st.gerando) { const b = el('div', 'iaprog'); b.appendChild(el('i')); box.appendChild(b); }
    const NOMES = { pollinations: 'Pollinations', gemini: 'Gemini', comfyui: 'ComfyUI', openai: 'OpenAI', higgsfield: 'Higgsfield' };
    const sp = el('span', '', st.erro ? 'Não deu: ' + st.erro : 'Serviço: …');
    const info = el('div', 'iainfo'); info.append(sp);
    const tr = el('a', 'ialink', 'trocar serviço'); tr.onclick = () => this.ctx.iaImgDialog(() => { st.erro = ''; st.trocar = false; this.render(); }); info.appendChild(tr); box.appendChild(info);
    if (st.erro && st.trocar && !st.gerando) {   // não adianta insistir com este serviço: um clique passa para o grátis e gera de novo
      const b = el('button', 'wide', 'Usar o Pollinations (grátis) e gerar'); b.type = 'button'; b.dataset.k = 'usarGratis';
      b.onclick = async () => { await D.iaImg.servico('pollinations'); st.servico = 'pollinations'; st.trocar = false; this.iaGerar(clip, {}); };
      box.appendChild(b);
    }
    // o serviço vem SEMPRE da configuração (antes ficava guardado no clipe e não mudava ao trocar em Configuração › IA)
    if (D && D.iaImg) D.iaImg.config().then(c => { st.servico = c.servico; if (!st.erro) sp.textContent = 'Serviço: ' + (NOMES[c.servico] || c.servico); });
    if (st.versoes && st.versoes.length) {
      const row = el('div', 'iaver');
      st.versoes.forEach((p, i) => {
        const b = el('div', 'iav' + (i === st.esc ? ' on' : '')); b.dataset.v = i;
        const im = el('img'); im.src = mediaUrl(p); im.draggable = false; b.appendChild(im);
        const ac = el('div', 'iaac'); const va = el('button', '', '↻'); va.type = 'button'; va.title = 'Variar: outras parecidas com esta'; va.dataset.k = 'variar';
        va.onclick = (e) => { e.stopPropagation(); this.iaGerar(clip, { base: p }); };
        const mx = el('button', '', '⤢'); mx.type = 'button'; mx.title = 'Maior: refaz esta em resolução mais alta'; mx.dataset.k = 'maior';
        mx.onclick = (e) => { e.stopPropagation(); this.iaGerar(clip, { base: p, maior: true, n: 1 }); };
        ac.append(va, mx); b.appendChild(ac);
        b.onclick = () => this.iaEscolherImg(clip, i);
        row.appendChild(b);
      });
      box.appendChild(row);
    }
  }
  async iaGerar(clip, o) {
    const D = window.projDesktop, st = clip.iagen; if (!D || !D.iaImg || st.gerando) return;
    if (!String(st.pedido || '').trim()) { st.erro = 'escreva o pedido primeiro'; this.render(); return; }
    // uma imagem por pedido: a primeira já entra no clipe enquanto as outras chegam; serviço que limita ("1 a cada 45 s",
    // como o Pollinations sem chave) faz esperar com contagem na tela e tenta de novo
    const n = o.n || st.qtd, novas = [];
    st.gerando = true; st.erro = ''; st.feitas = 0; st.total = n; st.espera = 0; this.render();
    for (let k = 0; k < n; k++) {
      let r = null;
      for (let tent = 0; tent < 4; tent++) {
        r = await D.iaImg.gerar({ pedido: st.pedido, estilo: st.estilo, prop: st.prop, n: 1, base: o.base, maior: !!o.maior, servico: window.__iaImgServico });
        if (r.ok || !r.esperar) break;   // só espera quando o serviço disse que é questão de tempo (o Pollinations grátis: 1 a cada 45 s)
        let t = Math.min(120, r.esperar);
        while (t > 0) { st.espera = t; this.render(); await new Promise(z => setTimeout(z, 1000)); t--; }
        st.espera = 0;
      }
      if (!r.ok) { st.erro = r.erro; st.trocar = !!r.trocar && r.servico !== 'pollinations'; if (r.semChave) this.ctx.iaImgDialog(() => this.render()); break; }
      st.trocar = false;
      st.servico = r.servico; novas.push(...r.arquivos); st.versoes = [...r.arquivos, ...(st.versoes || [])].slice(0, 12); st.feitas = k + 1;
      if (k === 0) { const c2 = await this.iaEscolherImg(clip, 0); if (c2) clip = c2; } else { st.esc = (st.esc ?? 0) + 1; this.render(); }
    }
    st.gerando = false; st.espera = 0; this.render();
  }
  async iaEscolherImg(clip, i) {
    const st = clip.iagen, p = st.versoes[i]; if (!p) return;
    st.esc = i;
    const n = await this.ctx.iaTrocarImagem(clip, p);
    if (n) this.aplicarDepois(n);
    this.render(); return n;
  }
  // Depois: Ken Burns e Loop na batida são um Transform com ♪ na escala (dá para ver e mexer na lista de efeitos)
  aplicarDepois(clip) {
    const st = clip.iagen; clip.fx = (clip.fx || []).filter(f => !f.iagen);
    if (st.depois === 'kenburns') clip.fx.push({ id: 'transform', params: { x: 0, y: 0, scale: 1.08, rot: 0 }, bypass: false, iagen: true, panim: { scale: { shape: 'lfo', beats: 32, min: 1.0, max: 1.18 }, x: { shape: 'lfo', beats: 64, min: -0.04, max: 0.04 } } });
    if (st.depois === 'batida') clip.fx.push({ id: 'transform', params: { x: 0, y: 0, scale: 1, rot: 0 }, bypass: false, iagen: true, panim: { scale: { shape: '1floor', beats: 1, min: 1.0, max: 1.07 } } });
  }
  // Estilos prontos (maquete presets-texto-mockup.html): um clique quebra o texto e aplica fonte, cor, tamanho e animação
  presetRows(P, clip) {
    const t = clip.text, row = el('div', 'presets'); row.dataset.help = 'Estilos prontos|Um clique monta o cartaz no estilo: a palavra forte fica grande, o resto vira apoio. Depois dá para mexer em tudo à mão; Ctrl+Z volta.';
    for (const p of PRESETS) {
      const b = el('button', t.preset === p.id ? 'on' : '', p.nome); b.type = 'button'; b.dataset.preset = p.id; b.title = p.desc + (p.anim ? ' (anima na batida)' : '');
      b.onclick = () => this.aplicarPreset(clip, p); row.appendChild(b);
    }
    P.appendChild(this.prow('Estilo pronto', 'Estilos prontos|Lambe-lambe, Neon, Protesto, Festa, Elegante, Letreiro, Cordel, Manuscrito e Tecno.', row));
  }
  async aplicarPreset(clip, p) {
    const t = clip.text, bruto = t.presetSaida === t.content && t.presetFonte != null ? t.presetFonte : t.content;   // trocar de estilo volta ao texto como foi escrito
    const v = versaoDoPreset(p, bruto, await listFonts());
    if (!v.linhas.length) { this.ctx.toast('Escreva o texto primeiro'); return; }
    this.ctx.markUndo();
    // estilo que anima transforma o Text Block em Text Animator; o próximo estilo sem animação devolve o Text Block
    const eraBloco = t.preset ? !!t.presetEraBloco : !t.animator;
    if (!p.anim && eraBloco) t.animator = false;
    aplicarVersao(clip, v); Object.assign(clip.text, { preset: p.id, presetFonte: bruto, presetSaida: clip.text.content, presetEraBloco: eraBloco }); renderText(clip);
    this.ctx.renderGrid(); this.render();
  }
  async iaMontar(clip) {
    const D = window.projDesktop, st = clip._ia;
    if (!D || !D.ia) { this.ctx.toast('A IA só funciona no programa instalado no Windows'); return; }
    const fontes = fontesParaIA(await listFonts());
    const req = montarPedido({ texto: st.pedido ?? clip.text.content, funcoes: st.funcoes, estilo: st.estilo, fontes, atual: clip.text, bpm: this.ctx.bpm() });
    if (window.__iaServico) req.servico = window.__iaServico;   // a bateria usa o serviço de mentira
    st.status = 'montando'; st.erro = ''; this.render();
    const r = await D.ia.pedir(req);
    st.status = '';
    if (!r.ok) { st.erro = 'Não deu: ' + r.erro; this.render(); if (r.semServico) this.ctx.iaDialog(() => this.render()); return; }
    try { st.versoes = validarVersoes(r.resposta, fontes); } catch (e) { st.erro = 'Não deu: ' + e.message; this.render(); return; }
    st.servico = (r.servico || 'teste') + (r.modelo ? ' · ' + r.modelo : '');
    this.iaEscolher(clip, 0);
  }
  // aplica a versão i; com Separar em clipes, uma casa por frase, para a direita, na mesma camada (só em casa vazia ou de texto da IA)
  iaEscolher(clip, i) {
    const st = clip._ia, v = st.versoes && st.versoes[i]; if (!v) return;
    this.ctx.markUndo();
    st.escolhida = i;
    const sep = st.funcoes.includes('separar') && v.clipes.length > 1;
    aplicarVersao(clip, v, sep ? v.clipes[0] : null); renderText(clip);
    if (sep) {
      const cell = this.ctx.selectedCell(); const L = cell && cell.L, li = this.ctx.state.layers.indexOf(L);
      if (L && cell.clip === clip) {
        let col = cell.idx;
        for (let k = 1; k < v.clipes.length; k++) {
          col++; if (col >= this.ctx.cols()) break;
          const o = L.clips[col]; if (o && !(o.kind === 'text' && o.text.ia)) break;   // não passa por cima do que não é dela
          const n = textClip(null, false); aplicarVersao(n, v, v.clipes[k]); renderText(n); n._ia = { ...st, versoes: null };
          this.ctx.putClip(li, col, n);
        }
        this.ctx.state.sel = { l: li, c: cell.idx }; this.ctx.state.selLayer = li;   // pôr as casas novas não tira a seleção da que montou
      }
    }
    this.ctx.renderGrid(); this.render();
  }
  renderClip(P, clip) {
    this.tl = null;
    P.textContent = '';
    if (!clip) { $('clipTitle').textContent = 'Clipe'; P.appendChild(el('div', 'vazio', 'Nenhum clipe selecionado. Clique no nome de um clipe para ver a prévia, ou na miniatura para pôr no ar. Solte aqui um arquivo, uma fonte ou um efeito.')); return; }
    $('clipTitle').textContent = clip.name;
    { const hd = el('div', 'chead'); hd.dataset.help = 'Clipe|O nome do clipe (clique para mudar) e, na engrenagem, o menu do clipe.';
      if (clip.thumb) { const bg = el('div', 'cbg'); bg.style.backgroundImage = 'url("' + clip.thumb + '")'; hd.appendChild(bg); }
      const nm = el('input', 'cname'); nm.type = 'text'; nm.value = clip.name; nm.spellcheck = false; nm.dataset.k = 'nome'; nm.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') nm.blur(); if (e.key === 'Escape') { nm.value = clip.name; nm.blur(); } };
      nm.onchange = () => { this.pushUndo(); clip.name = nm.value.trim() || clip.name; this.c.onChange(); this.refresh(); };
      const gear = el('button', 'cgear'); gear.type = 'button'; gear.dataset.k = 'engrenagem'; gear.title = 'Menu do clipe'; gear.innerHTML = '<svg viewBox="0 0 16 16"><path d="M6.6 1h2.8l.4 1.9 1.2.5 1.6-1 2 2-1 1.600.5 1.200 1.900.4v2.800l-1.900.4-.5 1.200 1 1.600-2 2-1.600-1-1.200.5L9.400 15H6.600l-.4-1.900-1.200-.5-1.600 1-2-2 1-1.600-.5-1.200L0 9.400V6.600l1.900-.4.5-1.200-1-1.600 2-2 1.600 1 1.200-.5zM8 5.500a2.500 2.500 0 1 0 0 5 2.500 2.500 0 0 0 0-5z"/></svg>';
      gear.onclick = (e) => { e.stopPropagation(); const r = gear.getBoundingClientRect(); if (this.ctx.clipMenu) this.ctx.clipMenu(r.left, r.bottom); };
      hd.append(nm, gear); P.appendChild(hd); }
    if (clip.iagen) this.iagenRows(P, clip);
    if (clip.kind === 'video') this.transportRows(P, clip);
    else if (clip.kind === 'source') {
      const def = sourceById(clip.source);
      P.appendChild(this.phead(def.name, def.name + '|' + def.desc));
      for (const p of def.params) this.paramRows(P, clip, p, def.name + ' · ' + p.label + '|' + def.desc);
    } else if (clip.kind === 'model3d') {
      // modelo 3D: o que veio no arquivo, a animação dele e os controles (♪ na batida nos números)
      const inf = info3d(clip), H = (t) => 'Modelo 3D · ' + t;
      P.appendChild(this.phead('◆ Modelo 3D', H('O arquivo 3D desenhado ao vivo, com fundo transparente: fica por cima das camadas de baixo.')));
      P.appendChild(this.prow('Arquivo', H('Formato, triângulos, materiais e animações que vieram no arquivo.'), el('span', 'pinfo', inf ? inf.fmt + ' · ' + inf.tri.toLocaleString('pt-BR') + ' triângulos · ' + inf.mats + ' materiais' : 'abrindo…')));
      for (const p of PARAMS_3D) {
        if (p.grupo) {
          P.appendChild(this.phead(p.grupo, H(p.grupo)));
          if (p.grupo === 'Animação do arquivo') {
            const lista = inf && inf.anims.length ? inf.anims.map((n, i) => [String(i), n]) : [['0', '— o arquivo não tem animação —']];
            P.appendChild(this.pselect('Animação', H('Qual animação do arquivo toca (GLB, FBX e DAE podem trazer várias).'), lista, String(clip.params.anim | 0), v => { clip.params.anim = +v; }));
          }
          continue;
        }
        this.paramRows(P, clip, p, H(p.label + '|' + p.help));
      }
    } else if (clip.kind === 'text' && ehCartaz(clip.text)) {
      this.cartazRows(P, clip);
    } else if (clip.kind === 'text') {
      const t = clip.text, up = () => { renderText(clip); this.ctx.renderGrid(); }, A = t.animator, nm = A ? 'Text Animator' : 'Text Block';
      const H = (rname, txt) => nm + ' · ' + rname + '|' + txt;
      // valor com ♪: anima na batida do BPM (forma, batidas, mín e máx), como os parâmetros das fontes geradas
      const num = (label, rname, help, key, o) => {
        const row = this.pnum(label, H(rname, help), t[key], { bar: true, ...o }, v => { t[key] = v; up(); }); P.appendChild(row);
        if (o.noAnim) return;
        const a = clip.panim && clip.panim[key];
        const b = el('button', 'anb' + (a ? ' on' : ''), '♪'); b.type = 'button'; b.title = a ? 'Parar a animação na batida (volta ao valor fixo)' : 'Animar este valor na batida do BPM';
        b.onclick = (e) => { e.stopPropagation(); clip.panim = clip.panim || {}; if (a) delete clip.panim[key]; else clip.panim[key] = ANIM({ min: o.min, max: o.max }); up(); this.render(); };
        row.querySelector('.pv').appendChild(b); this.animGear(row, label, clip, key, o, up);
        if (!a) return;
        this.animBlock(P, a, o, up, true);
      };
      const deg = (label, rname, help, key) => P.appendChild(this.pnum(label, H(rname, help), Math.round(t[key] * 1800 / Math.PI) / 10, { min: -180, max: 180, step: 1, dec: 1, unit: '°', bar: true, reset: 0 }, v => { t[key] = v * Math.PI / 180; up(); }));
      P.appendChild(this.phead(nm, nm + '|' + (A ? 'Cada letra, palavra ou linha recebe os valores animados com um atraso (Delay): mude um valor animado, ou ponha um LFO nele, e os pedaços seguem um depois do outro.' : 'Texto escrito com as fontes do Windows, como o Text Block do Resolume.')));
      if (t.iaFonte || t.ia) this.iaRows(P, clip);   // a fonte "Texto com IA" (e o texto que a IA já montou nas composições antigas)
      this.presetRows(P, clip);
      P.appendChild(this.parea('Texto', H('Text', 'O texto. Enter quebra a linha.'), t.content, v => { t.content = v; renderText(clip); }, () => this.ctx.renderGrid()));
      const fonts = fontsCache || [t.font]; if (!fontsCache) listFonts().then(f => { fontsCache = f; this.render(); });
      P.appendChild(this.pselect('Fonte', H('Font', 'Fontes instaladas no Windows.'), (fonts.includes(t.font) ? fonts : [t.font, ...fonts]).map(f => [f, f]), t.font, v => { t.font = v; up(); }));
      P.appendChild(this.pselect('Estilo', H('Style', 'Regular, itálico, negrito, negrito itálico ou Black (a versão mais grossa da fonte).'), STYLES.map(x => [x, STYLE_PT[x]]), t.style, v => { t.style = v; up(); }));
      P.appendChild(this.pcolor('Cor', H('Color', 'Cor e alfa da letra.'), t.color, v => { t.color = v; up(); }, true));
      num('Tamanho', 'Size', 'Tamanho da letra: 1 = um H de 93 px numa composição 1080.', 'size', { min: 0.5, max: 10, step: 0.01, dec: 2, reset: 1 });
      P.appendChild(this.pseg('Alinhar', H('Alignment', 'Alinhamento das linhas' + (A ? ' dentro do bloco (o bloco fica no meio).' : ' dentro da largura da linha.')), [['left', 'Esq.'], ['center', 'Centro'], ['right', 'Dir.']], t.align, v => { t.align = v; up(); }));
      P.appendChild(this.pseg('Vertical', H('Alignment Vertically', 'Bloco em cima, no meio ou embaixo da tela.'), [['top', 'Cima'], ['center', 'Meio'], ['bottom', 'Baixo']], t.valign, v => { t.valign = v; up(); }));
      if (!A) num('Largura da linha', 'Line Width', 'Largura em px em que o texto quebra por palavra; a caixa fica centrada na tela.', 'lineWidth', { min: 10, max: 32768, step: 10, unit: ' px', bar: false, reset: 1920, noAnim: true });
      num('Posição X', 'Position X', 'Desloca o texto em px.', 'x', { min: -1920, max: 1920, step: 1, unit: ' px', reset: 0 });
      num('Posição Y', 'Position Y', 'Desloca o texto em px (positivo desce).', 'y', { min: -1080, max: 1080, step: 1, unit: ' px', reset: 0 });
      if (!A) deg('Rotação', 'Rotation', 'Gira o bloco em volta do centro dele (positivo, horário).', 'rotation');
      if (!A) num('Escala', 'Scale', 'Aumenta tudo em volta do centro da tela.', 'scale', { min: 0, max: 10, step: 0.01, dec: 2, reset: 1 });
      num('Espaço X', 'Spacing X', 'Espaço a mais entre as letras (px no Tamanho 1).', 'spacingX', { min: -20, max: 200, step: 1, reset: 0 });
      num('Espaço Y', 'Spacing Y', 'Espaço a mais entre as linhas, em % da altura da linha.', 'spacingY', { min: -100, max: 200, step: 1, unit: ' %', reset: 0 });
      P.appendChild(this.pcolor('Cor do contorno', H('Outline Color', 'Cor do contorno e do brilho.'), t.outlineColor, v => { t.outlineColor = v; up(); }, true));
      num('Contorno', 'Outline Width', 'Faixa em volta da borda da letra (1 = 6 px de cada lado no Tamanho 1).', 'outlineWidth', { min: 0, max: 1, step: 0.01, dec: 2, reset: 0 });
      num('Brilho dentro', 'Glow In', 'Brilho na cor do contorno, da borda para dentro.', 'glowIn', { min: 0, max: 1, step: 0.01, dec: 2, reset: 0 });
      num('Brilho fora', 'Glow Out', 'Brilho na cor do contorno, da borda para fora.', 'glowOut', { min: 0, max: 1, step: 0.01, dec: 2, reset: 0 });
      if (A) {
        P.appendChild(this.phead('Animação', 'Animação|Os valores daqui chegam a cada pedaço com um atraso de Delay vezes a posição dele na ordem.'));
        P.appendChild(this.pcheck('Animado', H('Animated', 'Liga os valores animados.'), t.animated, v => { t.animated = v; clip.animHist = null; up(); }));
        P.appendChild(this.pselect('Pedaços', H('Range', 'O que se move junto: tudo, cada linha, cada palavra ou cada letra.'), RANGES, t.range, v => { t.range = v; up(); }));
        P.appendChild(this.pselect('Ordem', H('Order', 'Quem recebe o valor primeiro.'), ORDERS, t.order, v => { t.order = v; up(); }));
        num('Atraso', 'Delay', 'Tempo entre um pedaço e o seguinte.', 'delay', { min: 0, max: 2000, step: 10, unit: ' ms', reset: 100, noAnim: true });
        num('Opacidade', 'Opacity', 'Alfa de cada pedaço.', 'aOpacity', { min: 0, max: 1, step: 0.01, dec: 2, reset: 1 });
        num('Escala', 'Scale', 'Escala de cada pedaço, em volta do centro dele.', 'aScale', { min: 0, max: 10, step: 0.01, dec: 2, reset: 1 });
        num('Posição X', 'Animated Position X', 'Desloca cada pedaço em px.', 'aX', { min: -1920, max: 1920, step: 1, unit: ' px', reset: 0 });
        num('Posição Y', 'Animated Position Y', 'Desloca cada pedaço em px (positivo desce).', 'aY', { min: -1080, max: 1080, step: 1, unit: ' px', reset: 0 });
        deg('Rotação', 'Rotation', 'Gira cada pedaço em volta do centro dele.', 'aRot');
        num('Âncora X', 'Anchor X', 'Tira o centro do giro e da escala do meio do pedaço (px).', 'anchorX', { min: -1920, max: 1920, step: 1, unit: ' px', reset: 0 });
        num('Âncora Y', 'Anchor Y', 'Tira o centro do giro e da escala do meio do pedaço (px).', 'anchorY', { min: -1080, max: 1080, step: 1, unit: ' px', reset: 0 });
        num('Contorno', 'Animated Outline Width', 'Soma ao contorno de cada pedaço.', 'aOutline', { min: 0, max: 1, step: 0.01, dec: 2, reset: 0 });
        num('Brilho dentro', 'Animated Glow In', 'Soma ao brilho de dentro de cada pedaço.', 'aGlowIn', { min: 0, max: 1, step: 0.01, dec: 2, reset: 0 });
        num('Brilho fora', 'Animated Glow Out', 'Soma ao brilho de fora de cada pedaço.', 'aGlowOut', { min: 0, max: 1, step: 0.01, dec: 2, reset: 0 });
      }
    } else if (clip.kind === 'camera') {
      P.appendChild(this.prow('Câmera', '', el('span', 'pinfo', clip.name + ' · ' + clip.w + ' × ' + clip.h)));
      // Seguir rosto (11-01): acha o rosto no próprio PC e recorta a imagem em volta dele, acompanhando a pessoa
      const f = clip.face || (clip.face = faceDefaults()), H = (t) => 'Seguir rosto · ' + t;
      P.appendChild(this.phead('Seguir rosto', H('Acha o rosto na imagem da câmera, aqui no PC e sem internet, e recorta em volta dele como um cinegrafista. Não sabe de quem é o rosto e não guarda nada.')));
      P.appendChild(this.pcheck('Seguir rosto', H('Liga o recorte que acompanha o rosto. Desligado, a câmera fica inteira, como sempre.'), !!f.on, v => { f.on = v; this.render(); }, f.on ? 'ligado' : 'desligado'));
      if (f.on) {
        for (const p of PARAMS_FACE) this.paramRows(P, f, p, H(p.label + '|' + p.help));
        const st = faceStats, n = (clip._faces || []).length;
        P.appendChild(this.prow('Rostos', H('Quantos rostos o detector está vendo agora e quanto ele leva.'), el('span', 'pinfo', st.err ? st.err : n + (n === 1 ? ' rosto' : ' rostos') + (st.ms ? ' · ' + st.ms.toFixed(1) + ' ms' + (st.ep ? ' (' + (st.ep === 'dml' ? 'placa' : 'processador') + ')' : '') : ''))));
      }
    }
    else if (clip.kind === 'capture') {
      if (clip.cap.url) P.appendChild(this.ptext('Endereço', 'Endereço|A página que o navegador escondido mostra. Mudar aqui abre outra página no mesmo clipe.', clip.cap.url, v => { if (v && v !== clip.cap.url) { captureNavigate(clip, v); this.ctx.renderGrid(); } }));
      P.appendChild(this.prow('Captura', '', el('span', 'pinfo', (clip.cap.url ? 'página web' : clip.cap.srcName) + ' · ' + clip.w + ' × ' + clip.h)));
    }
    else if (clip.kind === 'laser') { P.appendChild(this.prow('Tipo', '', el('span', 'pinfo', 'Quadro do laser'))); P.appendChild(this.pbutton('Abrir no Laser', 'Abrir no Laser|Edita este quadro no módulo do laser.', () => { const f = this.ctx.laser.byId(clip.laserId); if (f) this.ctx.openLaser(f); })); return; }
    // para onde este clipe manda quando acaba
    const ap = clip.ap || (clip.ap = { mode: 'layer', l: 0, c: 0, dur: 'clip', secs: 5 }), S = this.ctx.state;
    P.appendChild(this.phead('Autopilot do clipe', 'Autopilot do clipe|Quando este clipe acaba, para onde a camada vai. "Como a camada" segue o Autopilot da camada.'));
    P.appendChild(this.pselect('Destino', 'Destino|Próximo, anterior, ao acaso, uma casa específica, parar (tira a camada do ar) ou como a camada manda.', [['layer', 'Como a camada'], ['next', 'Próximo'], ['prev', 'Anterior'], ['random', 'Ao acaso'], ['cell', 'Casa específica'], ['stop', 'Parar']], ap.mode, v => { ap.mode = v; }));
    if (ap.mode === 'cell') {
      P.appendChild(this.pselect('Camada', 'Camada de destino|Em qual camada está a casa.', S.layers.map((L, i) => [String(i), L.name]), String(Math.min(ap.l, S.layers.length - 1)), v => { ap.l = +v; }));
      const cols = S.layers[Math.min(ap.l, S.layers.length - 1)].clips.map((c, i) => [String(i), (i + 1) + (c ? ' · ' + c.name.slice(0, 14) : ' · vazia')]);
      P.appendChild(this.pselect('Coluna', 'Coluna de destino|Qual casa disparar.', cols, String(ap.c), v => { ap.c = +v; }));
    }
    if (ap.mode !== 'layer') {
      P.appendChild(this.pselect('Quando', 'Quando|No fim do clipe (vídeo) ou depois de um tempo fixo.', [['clip', 'No fim do clipe'], ['fixed', 'Tempo fixo']], ap.dur, v => { ap.dur = v; }));
      if (ap.dur === 'fixed') P.appendChild(this.pnum('Segundos', '', ap.secs, { min: 0.2, max: 600, step: 0.5, dec: 1, unit: ' s', bar: true, reset: 5 }, v => { ap.secs = v; }));
    }
    // Transição do clipe (no Resolume: Layer Determined, ou duração e modo só deste clipe, usados quando ELE entra)
    const T = clip.trans || (clip.trans = { own: false, dur: 0, mode: 'alpha' });
    P.appendChild(this.phead('Transição', 'Transição do clipe|Como este clipe entra na camada. "Como a camada" usa a transição da camada; desligado, o clipe tem duração e modo próprios.'));
    P.appendChild(this.pcheck('Como a camada', 'Como a camada|Ligado: vale a transição da camada. Desligado: este clipe entra com a duração e o modo daqui.', !T.own, v => { T.own = !v; }, T.own ? 'transição própria' : 'usa a da camada'));
    if (T.own) {
      P.appendChild(this.pnum('Duração', 'Duração da transição|0 corta seco. Até 10 s, como no Resolume.', T.dur || 0, { min: 0, max: 10, step: 0.1, dec: 1, unit: ' s', bar: true, reset: 0 }, v => { T.dur = v; }));
      P.appendChild(this.pselect('Modo', 'Modo da transição|Escolha da lista ou "Ao acaso".', [['random', 'Ao acaso'], ...MIXER_OPTS], T.mode || 'alpha', v => { T.mode = v; }));
    }
    if (clip.kind === 'video') this.audioRows(P, clip);
    // bloco de vídeo, como no Resolume: dados do arquivo, ajuste na tela (⤢) e tirar o clipe (✕)
    { const hms = (x) => { x = Math.max(0, x || 0); return String(Math.floor(x / 3600)).padStart(2, '0') + ':' + String(Math.floor(x / 60) % 60).padStart(2, '0') + ':' + (x % 60).toFixed(3).padStart(6, '0'); };
      const extra = [];
      if (clip.kind !== 'source' && clip.kind !== 'text') { const w = el('label', 'hsel'); w.title = 'Ajuste na tela: encaixar, preencher ou esticar'; w.innerHTML = '<svg viewBox="0 0 16 16"><path d="M9.500 2H14v4.500l-1.600-1.600-2.300 2.300-1.300-1.300 2.300-2.300zM6.500 14H2V9.500l1.600 1.600 2.300-2.300 1.300 1.300-2.300 2.300z"/></svg>'; const sl = el('select'); sl.dataset.k = 'ajuste'; for (const [val, tx] of Object.entries(FITS)) { const o = el('option', '', tx); o.value = val; sl.appendChild(o); } sl.value = clip.fit; sl.onchange = () => { this.pushUndo(); clip.fit = sl.value; this.c.onChange(); this.refresh(); }; w.appendChild(sl); extra.push(w); }
      const x = el('button', 'hx', '✕'); x.type = 'button'; x.dataset.k = 'tirar'; x.title = 'Tirar o clipe da casa (Ctrl+Z desfaz)'; x.onclick = (e) => { e.stopPropagation(); if (this.ctx.clearSelected) this.ctx.clearSelected(); }; extra.push(x);
      const fps = clip.kind === 'video' ? ((clip.player && clip.player.fps) || clip.fps) : 0, tipo = { video: 'Vídeo', image: 'Imagem', source: 'Fonte', text: 'Texto', camera: 'Câmera', capture: 'Captura', model3d: 'Modelo 3D' }[clip.kind] || clip.kind;
      P.appendChild(this.track('vid', 'Vídeo', 'Vídeo|Os dados do arquivo e, embaixo, opacidade, tamanho e mistura só deste clipe.', clip.name, [tipo + (clip.w ? ', ' + clip.w + 'x' + clip.h : '') + (fps ? ', ' + fps.toFixed(2) + ' Fps' : ''), clip.kind === 'video' ? hms(clip.dur) : ''], clip.thumb, extra)); }
    this.animRow(P, this.pnum('Opacidade', 'Opacidade do clipe|Multiplica a da camada.', Math.round((clip.opacity ?? 1) * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { clip.opacity = v / 100; }), 'Opacidade', clip, '@opacity', { min: 0, max: 100, step: 1, unit: ' %' });
    P.appendChild(this.pselect('Mistura', 'Mistura do clipe|Vazio usa a da camada.', [['', 'Como a camada'], ...MIXER_OPTS], clip.blend === 'normal' ? 'alpha' : (clip.blend || ''), v => { clip.blend = v; }));
    if (clip.kind !== 'source' && clip.kind !== 'text') { P.appendChild(this.prow('Largura', 'Largura|Largura da imagem do clipe, em pixels.', el('span', 'pinfo', String(clip.w)))); P.appendChild(this.prow('Altura', 'Altura|Altura da imagem do clipe, em pixels.', el('span', 'pinfo', String(clip.h)))); }
    P.appendChild(this.phead('Disparo', 'Disparo|Como a casa reage ao clique.'));
    P.appendChild(this.pseg('Estilo', 'Estilo de disparo|Normal: clique dispara. Piano: fica no ar só enquanto o botão está apertado. Alternar: clicar de novo tira do ar.', [['normal', 'Normal'], ['piano', 'Piano'], ['toggle', 'Alternar']], clip.trig || 'normal', v => { clip.trig = v; this.ctx.renderGrid(); }));
    P.appendChild(this.pcheck('Coluna', 'Ignorar disparo de coluna|A casa não entra quando a coluna inteira é disparada.', !!clip.ignoreColumn, v => { clip.ignoreColumn = v; }, clip.ignoreColumn ? 'ignora o disparo da coluna' : 'entra com a coluna'));
    if (clip.kind !== 'source' && clip.kind !== 'text') P.appendChild(this.pselect('Ajuste', 'Ajuste na tela|Encaixar mantém a proporção com faixas; Preencher corta; Esticar deforma.', Object.entries(FITS), clip.fit, v => { clip.fit = v; }));
    this.transformRows(P, clip.transform, ' do clipe');
    this.fxRows(P, clip, 'do clipe');
  }
}
