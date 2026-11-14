# Sonda do CRT em resolução cheia: a grade de fósforo (passo de colunas e fileiras, fendas, deslocamento), de onde sai a cor de
# cada célula e qual fenda acende com cada cor. Tudo com Bloom Amount 0, para ver só a máscara.
# Uso: py tools/compare/sondas/crt_celula.py [filtro]   -> saida/sonda_crt/<imagem>__<caso>.png
import array, os, sys, time
import numpy as np
from PIL import Image
AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, AQUI)
import gabarito as G
OUT = os.path.join(AQUI, 'saida', 'sonda_crt'); os.makedirs(OUT, exist_ok=True)
W, H = 1920, 1080
X, Y = np.meshgrid(np.arange(W), np.arange(H))
def rgba(r, g, b): return np.dstack([r, g, b, np.full((H, W), 255)]).astype(np.uint8)
IM = {}
um = np.full((H, W), 255)
IM['branco'] = rgba(um, um, um)
c = np.zeros((H, W, 3)); c[:270] = (255, 0, 0); c[270:540] = (0, 255, 0); c[540:810] = (0, 0, 255); c[810:] = (255, 255, 255)
IM['cores'] = rgba(c[..., 0], c[..., 1], c[..., 2])
rs = np.random.RandomState(11); v = np.tile(rs.randint(0, 256, W), (H, 1)); IM['colunas'] = rgba(v, v, v)   # cinza sorteado por coluna
v = np.tile(rs.randint(0, 256, H)[:, None], (1, W)); IM['linhas'] = rgba(v, v, v)                           # cinza sorteado por linha
v = np.round(X * 255 / (W - 1)); IM['rampa'] = rgba(v, v, v)                                                # brilho conhecido: 0 a 255 da esquerda à direita
B = {'Bloom Amount': 0}
G4 = dict(B, Columns=40, Rows=20)
CASOS = [('branco', dict(B))]
CASOS += [('branco', dict(B, Columns=v)) for v in (20, 40, 100, 200, 500, 720)] + [('branco', dict(B, Rows=v)) for v in (10, 20, 60, 240)]
CASOS += [('branco', dict(G4))]
CASOS += [('branco', dict(G4, **{k: v})) for k, vs in (('Between Slots', (0, 0.5, 1.5, 2)), ('Left/Right', (0, 1.25, 2.5, 5)), ('Top/Bottom', (0, 1.25, 2.5, 5)),
                                                       ('Height Scale', (1, 3.25, 5.5, 10)), ('Shift', (0, 25, 50, 75))) for v in vs]
CASOS += [('branco', dict(B, **{'Display Mode': 'Native'})), ('branco', dict(G4, **{'Display Mode': 'Native'}))]
CASOS += [('cores', dict(G4))] + [('cores', dict(G4, **{k: v})) for k, v in (('Color Left', 'G'), ('Color Middle', 'R'), ('Color Right', 'R'), ('Power Left', 0.5), ('Power Middle', 0.25),
                                                                               ('Tilt Left', 1), ('Tilt Middle', -0.5), ('Tilt Right', 0.5))]
CASOS += [('colunas', dict(G4)), ('colunas', dict(B)), ('linhas', dict(G4)), ('linhas', dict(B)), ('rampa', dict(G4)), ('rampa', dict(B))]
sp = G.Spout()
def cru():
    r, fim, novos = sp.r, time.time() + 6, 0
    while time.time() < fim:
        ok = r.receiveImage(sp.buf, G.GL_RGBA, False, 0)
        if r.isUpdated():
            sp.buf = array.array('B', bytes(r.getSenderWidth() * r.getSenderHeight() * 4)); continue
        if sp.buf is not None and ok and r.isFrameNew():
            novos += 1
            if novos > 3:
                return np.frombuffer(sp.buf, np.uint8).reshape(r.getSenderHeight(), r.getSenderWidth(), 4).copy()
        r.waitFrameSync(G.NOME, 100)
filtro = sys.argv[1] if len(sys.argv) > 1 else ''
atual = None
for nome, caso in CASOS:
    rot = nome + '__' + ('_'.join(f"{k.replace('/', '-').replace(' ', '')}_{v}" for k, v in caso.items() if k != 'Bloom Amount') or 'padrao')
    if filtro and filtro not in rot: continue
    if nome != atual:
        arq = os.path.join(OUT, nome + '.png'); Image.fromarray(IM[nome]).save(arq)
        G.limpar(); G.abrir(arq); time.sleep(1.0); ps = G.por('CRT')['params']; time.sleep(0.8); atual = nome
    for k, val in caso.items(): G.req('PUT', f"/parameter/by-id/{ps[k]['id']}", {'value': val})
    time.sleep(1.0)
    qs = []
    for _ in range(5): qs.append(cru()); time.sleep(2.6)
    Image.fromarray(np.median(np.stack(qs), 0).astype(np.uint8)).save(os.path.join(OUT, rot + '.png')); print(rot, flush=True)
    for k in caso: G.req('PUT', f"/parameter/by-id/{ps[k]['id']}", {'value': ps[k]['value']})
G.limpar(); G.abrir(G.CARTA)
