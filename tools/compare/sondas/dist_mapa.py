# Sonda do Distortion: de onde sai o "mapa" que desliza cada linha. Mostra imagens de teste (degradê deitado, degradê em pé
# com risca, metade branca, faixa em diagonal, faixas de cor) e grava a saída do Resolume em saida/sonda_dist/<imagem>_<caso>.png
# Uso: py tools/compare/sondas/dist_mapa.py [imagem ...]
import array, os, sys, time
import numpy as np
from PIL import Image
AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, AQUI)
import gabarito as G
OUT = os.path.join(AQUI, 'saida', 'sonda_dist'); os.makedirs(OUT, exist_ok=True)
W, H = 1920, 1080
X, Y = np.meshgrid(np.arange(W), np.arange(H))
def cinza(v): return np.dstack([v, v, v, np.full_like(v, 255)]).astype(np.uint8)
IM = {}
IM['hramp'] = cinza(np.round(X * 255 / (W - 1)))
v = np.round(Y * 255 / (H - 1)); v[:, 400:404] = 255; v[:, 404:408] = 0; IM['vramp'] = cinza(v)
IM['metade'] = cinza(np.where(X < W // 2, 255, 0))
IM['diag'] = cinza(np.where(np.abs(X - Y * W / H) < 40, 255, 0))
c = np.zeros((H, W, 4), np.uint8); c[..., 3] = 255
for i, cor in enumerate([(255, 0, 0), (0, 255, 0), (0, 0, 255), (0, 255, 255), (255, 0, 255), (255, 255, 0), (64, 64, 64), (128, 128, 128), (192, 192, 192)]):
    c[i * 120:(i + 1) * 120, :, :3] = cor
c[:, 960:966, :3] = 0; c[:, 966:972, :3] = 255; IM['cores'] = c
v = np.where((X // 240) % 2 == 0, 255, 0); v[540:] = np.where((X[540:] // 60) % 2 == 0, 255, 0); IM['xadrez'] = cinza(v)   # metade de cima barras largas, de baixo finas
rs = np.random.RandomState(7); IM['colunas'] = cinza(np.tile(rs.randint(0, 256, W), (H, 1)).astype(float))   # cada coluna com um cinza sorteado: diz qual coluna a linha leu
CASOS = {'d25r1': dict(Distort=0.25, Radius=1), 'd50r1': dict(Distort=0.5, Radius=1), 'd25r75': dict(Distort=0.25, Radius=0.75), 'd25r0': dict(Distort=0.25, Radius=0), 'd100r1': dict(Distort=1, Radius=1)}
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
quais = sys.argv[1:] or list(IM)
for nome in quais:
    arq = os.path.join(OUT, nome + '.png'); Image.fromarray(IM[nome]).save(arq)
    G.limpar(); G.abrir(arq); time.sleep(1.0)
    ps = G.por('Distortion')['params']; time.sleep(0.8)
    for rot, caso in CASOS.items():
        for k, val in caso.items(): G.req('PUT', f"/parameter/by-id/{ps[k]['id']}", {'value': val})
        time.sleep(1.0)
        qs = []
        for _ in range(5): qs.append(cru()); time.sleep(2.6)
        m = np.median(np.stack(qs), 0).astype(np.uint8)
        Image.fromarray(m).save(os.path.join(OUT, f'{nome}_{rot}.png')); print(nome, rot, flush=True)
G.limpar(); G.abrir(G.CARTA)
