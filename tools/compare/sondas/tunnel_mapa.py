# Sonda do Tunnel: imagem em que cada pixel carrega a própria posição (vermelho = x, verde = y, azul = 128) para ler da saída
# do Resolume o mapa "pixel da tela -> ponto da imagem". Efeito recolocado a cada caso (fase zerada), Speed 0,5 (parado).
# Uso: py tools/compare/sondas/tunnel_mapa.py [filtro]   -> saida/sonda_tunnel/<caso>.png e mexe.json (quanto a foto anda em 5 s)
import array, json, os, sys, time
import numpy as np
from PIL import Image
AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, AQUI)
import gabarito as G
OUT = os.path.join(AQUI, 'saida', 'sonda_tunnel'); os.makedirs(OUT, exist_ok=True)
W, H = 1920, 1080
X, Y = np.meshgrid(np.arange(W), np.arange(H))
im = np.dstack([np.round(X * 255 / (W - 1)), np.round(Y * 255 / (H - 1)), np.full((H, W), 128), np.full((H, W), 255)]).astype(np.uint8)
ARQ = os.path.join(OUT, 'posicao.png'); Image.fromarray(im).save(ARQ)
CASOS = [{}]
CASOS += [{'Position': v} for v in (0.1, 0.25, 0.5, 0.75)] + [{'Twist': v} for v in (0, 0.25, 0.4, 0.75, 1)]
CASOS += [{'Kaleidoscope': v} for v in (0.05, 0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9, 1)] + [{'Rotation': v} for v in (0.25, 0.6)]
CASOS += [{k: v} for k in ('TurnH', 'TurnV') for v in (0, 0.25, 0.75, 1)]
CASOS += [{'WobbleH': v} for v in (0.1, 0.25, 0.5, 0.75, 1)] + [{'WobbleV': v} for v in (0.25, 0.5, 1)]
CASOS += [{'WobbleH': 0.5, 'WobbleV': 0.5}, {'WobbleH': 0.5, 'Position': 0.25}, {'WobbleH': 0.5, 'Twist': 0.25}, {'Kaleidoscope': 0.5, 'Twist': 0.25}, {'Kaleidoscope': 0.5, 'Rotation': 0.6}]
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
G.limpar(); G.abrir(ARQ); time.sleep(1.0)
mexe = {}
for caso in CASOS:
    rot = '_'.join(f'{k}_{v}' for k, v in caso.items()) or 'padrao'
    if filtro and filtro not in rot: continue
    G.limpar(); time.sleep(0.4)
    ps = G.por('Tunnel')['params']; time.sleep(0.5)
    for k, val in caso.items(): G.req('PUT', f"/parameter/by-id/{ps[k]['id']}", {'value': val})
    time.sleep(1.0)
    qs = []
    for _ in range(3): qs.append(cru()); time.sleep(2.6)
    m = np.median(np.stack(qs), 0).astype(np.uint8)
    mexe[rot] = round(float(np.abs(qs[0].astype(float) - qs[2].astype(float)).mean()), 2)
    Image.fromarray(m).save(os.path.join(OUT, rot + '.png')); print(rot, 'anda', mexe[rot], flush=True)
json.dump(mexe, open(os.path.join(OUT, 'mexe.json'), 'w'))
G.limpar(); G.abrir(G.CARTA)
