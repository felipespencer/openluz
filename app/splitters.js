// Divisórias arrastáveis entre as caixas da janela, como no Resolume. Cada divisória muda uma
// variável CSS da página; os tamanhos são lembrados nas preferências.
const VARS = {
  splitMon: { v: '--monW', axis: 'x', from: 'right', min: 220, max: 900 },     // grade | monitores
  splitBot: { v: '--botH', axis: 'y', from: 'bottom', min: 120, max: 700 },   // meio | rodapé
  splitL: { v: '--leftW', axis: 'x', from: 'left', min: 200, max: 800 },     // Composição/Camada | Clipe
  splitR: { v: '--rightW', axis: 'x', from: 'right', min: 220, max: 900 },   // Clipe | navegador
  // 12-22: dentro da coluna da direita, medidas pela própria caixa e não pela borda da janela
  splitPar: { v: '--parL', rel: 'par' },     // Composição | Prévia: fração da largura (0,2 a 0,8), guardada como número
  splitProj: { v: '--parH', rel: 'proj' },   // par Composição/Prévia | Projetores: altura do par em px
};
const MIN_PAR = 90, MIN_PROJ = 190;
// valor guardado → variável CSS
function aplica(root, id, val) {
  if (id === 'splitPar') { root.style.setProperty('--parL', (val / (1 - val)).toFixed(4) + 'fr'); return; }
  if (id === 'splitProj') { root.style.setProperty('--parH', val + 'px'); const m = document.getElementById('mons'); if (m) m.classList.add('fixo'); return; }
  root.style.setProperty(VARS[id].v, val + 'px');
}
function limpa(root, id) {
  root.style.removeProperty(VARS[id].v);
  if (id === 'splitProj') { const m = document.getElementById('mons'); if (m) m.classList.remove('fixo'); }
}
// posição do mouse → valor (px ou fração)
function mede(id, cfg, ev) {
  if (id === 'splitPar') {
    const r = document.querySelector('#mons .par').getBoundingClientRect();
    return Math.round(Math.max(0.2, Math.min(0.8, (ev.clientX - r.left) / Math.max(1, r.width))) * 1000) / 1000;
  }
  if (id === 'splitProj') {   // a divisória fica embaixo do botão Saída avançada: desconta o botão e os vãos, para ela andar junto do mouse
    const m = document.getElementById('mons'), r = m.getBoundingClientRect(), cs = getComputedStyle(m);
    const pt = parseFloat(cs.paddingTop) || 0, gap = parseFloat(cs.rowGap) || 0, ao = (m.querySelector('.aoRow') || { offsetHeight: 0 }).offsetHeight;
    const util = m.clientHeight - pt - (parseFloat(cs.paddingBottom) || 0);
    return Math.round(Math.max(MIN_PAR, Math.min(util - ao - 5 - gap * 3 - MIN_PROJ, ev.clientY - r.top - pt - ao - gap * 2)));
  }
  let px;
  if (cfg.axis === 'x') px = cfg.from === 'left' ? ev.clientX : innerWidth - ev.clientX;
  else px = innerHeight - ev.clientY;
  return Math.round(Math.max(cfg.min, Math.min(cfg.max, px)));
}
export function initSplitters(prefs) {
  const root = document.documentElement, sizes = Object.assign({}, prefs && prefs.sizes || {});
  for (const id in VARS) if (sizes[id]) aplica(root, id, sizes[id]);
  let save = null;
  for (const id in VARS) {
    const d = document.getElementById(id), cfg = VARS[id]; if (!d) continue;
    d.addEventListener('pointerdown', (e) => {
      e.preventDefault(); d.setPointerCapture(e.pointerId); d.classList.add('drag');
      const move = (ev) => {
        const val = mede(id, cfg, ev);
        aplica(root, id, val); sizes[id] = val;
        dispatchEvent(new Event('resize'));
      };
      const up = () => { d.removeEventListener('pointermove', move); d.removeEventListener('pointerup', up); d.classList.remove('drag'); if (save) save(sizes); };
      d.addEventListener('pointermove', move); d.addEventListener('pointerup', up);
    });
    d.addEventListener('dblclick', () => { limpa(root, id); delete sizes[id]; dispatchEvent(new Event('resize')); if (save) save(sizes); });
  }
  return { onSave: (fn) => { save = fn; } };
}
