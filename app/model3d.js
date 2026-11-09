// Modelos 3D como clipe (Fase 10): GLB/GLTF, OBJ (+MTL), FBX, STL, PLY, 3MF e DAE, desenhados pelo three.js (MIT) num
// canvas com fundo transparente que vira a textura do clipe, como o texto. Um só desenhista WebGL para todos os clipes 3D:
// cada clipe tem a sua cena e copia o quadro para o próprio canvas 2D (o motor sobe esse canvas quando rev muda).
// Recurso só do OpenLuz (o Resolume não abre 3D sem o Wire). Maquete aprovada: modelo-3d-mockup.html.
import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from './vendor/three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from './vendor/three/addons/libs/meshopt_decoder.module.js';
import { OBJLoader } from './vendor/three/addons/loaders/OBJLoader.js';
import { MTLLoader } from './vendor/three/addons/loaders/MTLLoader.js';
import { STLLoader } from './vendor/three/addons/loaders/STLLoader.js';
import { PLYLoader } from './vendor/three/addons/loaders/PLYLoader.js';
import { FBXLoader } from './vendor/three/addons/loaders/FBXLoader.js';
import { ColladaLoader } from './vendor/three/addons/loaders/ColladaLoader.js';
import { ThreeMFLoader } from './vendor/three/addons/loaders/3MFLoader.js';
import { animValue } from './beat.js';

export const is3dName = (n) => /\.(glb|gltf|obj|fbx|stl|ply|3mf|dae)$/i.test(n || '');
export const W = 1920, H = 1080;

// os controles do painel (mesma forma dos parâmetros das fontes: ♪ na batida nos números)
export const LUZES = ['Estúdio', 'Palco', 'Contraluz', 'Neon', 'Chapada'];
export const MATS = ['Original', 'Cor sólida', 'Arame', 'Só contorno', 'Arco-íris', 'Branco p/ mapping'];
export const PARAMS = [
  { grupo: 'Movimento' },
  { key: 'autoRot', label: 'Girar sozinho', min: -2, max: 2, step: 0.01, def: 0.3, help: 'Voltas por segundo × 2π: 0 para, negativo gira ao contrário.' },
  { key: 'eixo', label: 'Eixo do giro', opts: ['Em pé (Y)', 'Cambalhota (X)', 'Roda (Z)'], def: 0, help: 'Em volta de qual eixo o modelo gira sozinho.' },
  { key: 'rx', label: 'Giro X', min: -180, max: 180, step: 1, def: 0, unit: '°', help: 'Inclina o modelo para frente e para trás.' },
  { key: 'ry', label: 'Giro Y', min: -180, max: 180, step: 1, def: 0, unit: '°', help: 'Vira o modelo para os lados.' },
  { key: 'rz', label: 'Giro Z', min: -180, max: 180, step: 1, def: 0, unit: '°', help: 'Gira o modelo como uma roda.' },
  { key: 'escala', label: 'Escala', min: 0.05, max: 4, step: 0.01, def: 1, help: 'Tamanho do modelo; 1 = cabe na tela.' },
  { key: 'px', label: 'Posição X', min: -3, max: 3, step: 0.01, def: 0, help: 'Desloca para os lados.' },
  { key: 'py', label: 'Posição Y', min: -3, max: 3, step: 0.01, def: 0, help: 'Desloca para cima e para baixo.' },
  { key: 'pulo', label: 'Pular na batida', min: 0, max: 0.6, step: 0.01, def: 0, help: 'Quanto o modelo pula a cada batida do BPM.' },
  { grupo: 'Câmera' },
  { key: 'lente', label: 'Lente', opts: ['Perspectiva', 'Ortográfica (sem fuga)'], def: 0, help: 'Ortográfica não tem ponto de fuga: linhas paralelas ficam paralelas, bom para mapping.' },
  { key: 'dist', label: 'Distância', min: 0.5, max: 15, step: 0.01, def: 4, help: 'Quão longe a câmera fica (zoom).' },
  { key: 'orbita', label: 'Volta', min: -180, max: 180, step: 1, def: 0, unit: '°', help: 'Leva a câmera em volta do modelo.' },
  { key: 'alt', label: 'Altura', min: -85, max: 85, step: 1, def: 15, unit: '°', help: 'Câmera de cima (positivo) ou de baixo (negativo).' },
  { key: 'fov', label: 'Abertura', min: 10, max: 100, step: 1, def: 40, unit: '°', help: 'Abertura da lente em perspectiva: maior = grande-angular.' },
  { grupo: 'Luz' },
  { key: 'luz', label: 'Luz pronta', opts: LUZES, def: 0, help: 'Arranjo de luzes pronto.' },
  { key: 'luzI', label: 'Intensidade', min: 0, max: 3, step: 0.01, def: 1, help: 'Força de todas as luzes.' },
  { key: 'luzCor', label: 'Cor da luz', color: true, def: '#ffffff', help: 'Tinge todas as luzes.' },
  { grupo: 'Material' },
  { key: 'mat', label: 'Aparência', opts: MATS, def: 0, help: 'Original = como veio no arquivo. Branco p/ mapping = branco chapado, para projetar por cima.' },
  { key: 'matCor', label: 'Cor', color: true, def: '#7fd6c2', help: 'Cor de Cor sólida, Arame e Só contorno.' },
  { key: 'emis', label: 'Brilho próprio', min: 0, max: 1, step: 0.01, def: 0, help: 'O modelo acende sem depender da luz.' },
  { grupo: 'Animação do arquivo' },
  { key: 'animV', label: 'Velocidade', min: 0, max: 3, step: 0.01, def: 1, help: 'Velocidade da animação que veio no arquivo.' },
  { key: 'animT', label: 'Tempo', opts: ['Livre', 'Um ciclo a cada 4 batidas'], def: 0, help: 'Livre segue a Velocidade; na batida, um ciclo dura 4 batidas do BPM.' },
];
export const defaults = () => { const p = { anim: 0 }; for (const d of PARAMS) if (d.key) p[d.key] = d.def; return p; };

const LUZ_SET = [
  { amb: [0xffffff, 0x222233, .6], key: [0xffffff, 1.6], fill: [0xffffff, .5], back: [0xffffff, .8] },
  { amb: [0x442244, 0x000000, .2], key: [0xfff1d6, 2.6], fill: [0x4060ff, .4], back: [0xff3080, 1.2] },
  { amb: [0x111122, 0x000000, .15], key: [0xffffff, .2], fill: [0xffffff, .1], back: [0xffffff, 3.5] },
  { amb: [0x200030, 0x001020, .3], key: [0xff2bd6, 2.2], fill: [0x00e5ff, 2.2], back: [0x7a2bff, 1.5] },
  { amb: [0xffffff, 0xffffff, 2.2], key: [0xffffff, 0], fill: [0xffffff, 0], back: [0xffffff, 0] },
];

// o desenhista compartilhado
let R = null;
function renderer() {
  if (R) return R;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: false });
  R.setPixelRatio(1); R.setSize(W, H, false); R.setClearColor(0x000000, 0); R.outputColorSpace = THREE.SRGBColorSpace;
  return R;
}

// arquivos ao lado do modelo (texturas, .bin, .mtl): o carregador pede "app://projecionista/m3d/<nome>"; aqui vira o caminho do disco
let mediaUrlFn = null;
export const setMediaUrl = (f) => { mediaUrlFn = f; };
const RES = 'app://projecionista/m3d/';
function manager(dir) {
  const m = new THREE.LoadingManager();
  m.setURLModifier((u) => {
    if (u.startsWith(RES)) { const rel = decodeURIComponent(u.slice(RES.length)).replace(/\//g, '\\'); return mediaUrlFn(dir + '\\' + rel); }
    return u;
  });
  return m;
}
let draco = null;
const dracoLoader = () => { if (!draco) { draco = new DRACOLoader(); draco.setDecoderPath('vendor/three/addons/libs/draco/gltf/'); draco.setDecoderConfig({ type: 'wasm' }); } return draco; };

// lê o arquivo e devolve { obj, anims, fmt }
export async function carregar(path) {
  const ext = path.split('.').pop().toLowerCase(), dir = path.replace(/[\\/][^\\/]*$/, ''), url = mediaUrlFn(path), mg = manager(dir);
  if (ext === 'glb' || ext === 'gltf') {
    const l = new GLTFLoader(mg); l.setDRACOLoader(dracoLoader()); l.setMeshoptDecoder(MeshoptDecoder); l.setResourcePath(RES);
    const g = await l.loadAsync(url); return { obj: g.scene, anims: g.animations || [], fmt: ext.toUpperCase() };
  }
  if (ext === 'obj') {
    const l = new OBJLoader(mg);
    try {
      const mtlPath = path.replace(/\.obj$/i, '.mtl'), r = await fetch(mediaUrlFn(mtlPath));
      if (r.ok) { const ml = new MTLLoader(mg); ml.setResourcePath(RES); const mats = ml.parse(await r.text(), RES); mats.preload(); l.setMaterials(mats); }
    } catch { }
    return { obj: await l.loadAsync(url), anims: [], fmt: 'OBJ' };
  }
  if (ext === 'fbx') { const l = new FBXLoader(mg); l.setResourcePath(RES); const o = await l.loadAsync(url); return { obj: o, anims: o.animations || [], fmt: 'FBX' }; }
  if (ext === 'dae') { const l = new ColladaLoader(mg); l.setResourcePath(RES); const d = await l.loadAsync(url); return { obj: d.scene, anims: d.scene.animations || [], fmt: 'DAE' }; }
  if (ext === '3mf') return { obj: await new ThreeMFLoader(mg).loadAsync(url), anims: [], fmt: '3MF' };
  const geo = await (ext === 'stl' ? new STLLoader(mg) : new PLYLoader(mg)).loadAsync(url);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const cor = !!geo.attributes.color;
  return { obj: new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cor ? 0xffffff : 0xbbbbbb, vertexColors: cor, roughness: .5, metalness: .1 })), anims: [], fmt: ext.toUpperCase() };
}

// monta a cena de um clipe com o modelo já lido
export function montar(c, lido) {
  const scene = new THREE.Scene(), pivo = new THREE.Group(); scene.add(pivo);
  const persp = new THREE.PerspectiveCamera(40, W / H, 0.01, 2000), orto = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 2000);
  const amb = new THREE.HemisphereLight(0xffffff, 0x222233, .6), key = new THREE.DirectionalLight(0xffffff, 1.6), fill = new THREE.DirectionalLight(0xffffff, .5), back = new THREE.DirectionalLight(0xffffff, .8);
  key.position.set(3, 4, 5); fill.position.set(-4, 1, 2); back.position.set(0, 3, -5); scene.add(amb, key, fill, back);
  const obj = lido.obj;
  // centra e põe do tamanho da tela (2 unidades no maior lado)
  const box = new THREE.Box3().setFromObject(obj), tam = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const s = 2 / (Math.max(tam.x, tam.y, tam.z) || 1); const raiz = new THREE.Group(); raiz.add(obj); obj.position.sub(ctr); raiz.scale.setScalar(s); pivo.add(raiz);
  const orig = new Map(); let tri = 0; const mats = new Set();
  obj.traverse(o => { if (o.isMesh || o.isPoints) { orig.set(o, o.material); [].concat(o.material).forEach(m => mats.add(m)); const g = o.geometry; if (g) tri += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
  const mixer = new THREE.AnimationMixer(obj), acoes = (lido.anims || []).map(a => mixer.clipAction(a));
  c.m3 = { scene, pivo, persp, orto, amb, key, fill, back, obj, orig, mixer, acoes, anim: -1, matKey: '', giro: 0, info: { fmt: lido.fmt, tri: Math.round(tri), mats: mats.size, anims: (lido.anims || []).map((a, i) => a.name || 'Animação ' + (i + 1)) } };
}

// valor agora: o guardado, ou o da batida (♪)
const val = (c, k, clock) => { const a = c.panim && c.panim[k]; if (a && a.shape && clock) return animValue(a, clock); return c.params[k] ?? PARAMS.find(p => p.key === k)?.def; };

function aplicaMat(c, mat, cor, emis) {
  const M = c.m3, k = mat + '|' + cor + '|' + (mat === 0 ? '' : emis.toFixed(2)); if (M.matKey === k) return; M.matKey = k;
  const col = new THREE.Color(cor);
  M.obj.traverse(o => {
    if (!M.orig.has(o)) return;
    if (o.userData.linhas) { o.remove(o.userData.linhas); o.userData.linhas.geometry.dispose(); o.userData.linhas = null; }
    const g = o.geometry;
    if (mat === 0) o.material = M.orig.get(o);
    else if (mat === 1) o.material = new THREE.MeshStandardMaterial({ color: col, roughness: .5, emissive: col, emissiveIntensity: emis });
    else if (mat === 2) o.material = new THREE.MeshBasicMaterial({ color: col, wireframe: true });
    else if (mat === 4) o.material = new THREE.MeshNormalMaterial();
    else if (mat === 5) o.material = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: emis });
    else if (mat === 3) {
      o.material = new THREE.MeshBasicMaterial({ colorWrite: false });   // esconde a face mas tapa as linhas de trás
      if (g && !o.isSkinnedMesh) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), new THREE.LineBasicMaterial({ color: col })); o.add(l); o.userData.linhas = l; }
    }
  });
}

// um quadro do clipe: anda o relógio, desenha e copia para c.el
export function tick(c, now, clock) {
  const M = c.m3; if (!M || !c.el || M.last === now) return;   // no ar e na prévia ao mesmo tempo: um desenho só por quadro
  const dt = Math.min(0.1, M.last ? now - M.last : 0); M.last = now;
  const B = clock ? clock.beat : now * 2, fase = ((B % 1) + 1) % 1, pulso = Math.exp(-fase * 6);
  const v = (k) => val(c, k, clock);
  // movimento
  M.giro += v('autoRot') * dt;
  const e = ['y', 'x', 'z'][v('eixo') | 0] || 'y', d2r = Math.PI / 180;
  M.pivo.rotation.set(v('rx') * d2r, v('ry') * d2r, v('rz') * d2r); M.pivo.rotation[e] += M.giro;
  M.pivo.scale.setScalar(Math.max(0.001, v('escala')));
  M.pivo.position.set(v('px'), v('py') + v('pulo') * pulso, 0);
  // câmera
  const dist = Math.max(0.1, v('dist')), az = v('orbita') * d2r, el = v('alt') * d2r;
  const pos = new THREE.Vector3(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
  const orto = (v('lente') | 0) === 1, cam = orto ? M.orto : M.persp;
  M.persp.fov = v('fov'); M.persp.aspect = W / H; M.persp.updateProjectionMatrix();
  if (orto) { const h = dist * 0.36, w = h * W / H; Object.assign(M.orto, { left: -w, right: w, top: h, bottom: -h }); M.orto.updateProjectionMatrix(); }
  cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0);
  // luz
  const L = LUZ_SET[v('luz') | 0] || LUZ_SET[0], I = v('luzI'), tint = new THREE.Color(c.params.luzCor || '#ffffff');
  M.amb.color.set(L.amb[0]).multiply(tint); M.amb.groundColor.set(L.amb[1]); M.amb.intensity = L.amb[2] * I;
  for (const [l, s] of [[M.key, L.key], [M.fill, L.fill], [M.back, L.back]]) { l.color.set(s[0]).multiply(tint); l.intensity = s[1] * I; }
  // material
  aplicaMat(c, v('mat') | 0, c.params.matCor || '#7fd6c2', v('emis'));
  if ((v('mat') | 0) === 0) { const em = v('emis'); M.orig.forEach(m => [].concat(m).forEach(x => { if (x.emissive) { if (!x.userData.em0) x.userData.em0 = x.emissive.clone(); if (em > 0) { x.emissive.copy(x.color || x.userData.em0); x.emissiveIntensity = em; } else { x.emissive.copy(x.userData.em0); x.emissiveIntensity = 1; } } })); }
  // animação do arquivo
  const ai = c.params.anim | 0;
  if (ai !== M.anim) { M.acoes.forEach(a => a.stop()); const a = M.acoes[ai]; if (a) a.play(); M.anim = ai; }
  const at = M.acoes[ai];
  if (at) { const ritmo = (v('animT') | 0) === 1 && clock ? at.getClip().duration / (4 * 60 / clock.bpm) : v('animV'); M.mixer.update(dt * ritmo); }
  // desenha e copia
  const r = renderer(); r.render(M.scene, cam);
  const g = c.el.getContext('2d'); g.clearRect(0, 0, W, H); g.drawImage(r.domElement, 0, 0);
  c.rev = (c.rev || 0) + 1;
}

// miniatura (160×90, PNG com fundo transparente)
export function miniatura(c, clock) {
  tick(c, performance.now() / 1000, clock);
  const t = document.createElement('canvas'); t.width = 240; t.height = 135; t.getContext('2d').drawImage(c.el, 0, 0, 240, 135);
  return t.toDataURL('image/png');
}

// cópia para outra casa: a mesma cena seria dividida; cada casa lê o arquivo de novo (o cache do navegador ajuda)
export function liberar(c) {
  const M = c.m3; if (!M) return; c.m3 = null;
  M.mixer.stopAllAction();
  M.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
}
