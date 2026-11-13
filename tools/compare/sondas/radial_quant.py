# Sonda do RadialBlur: degradê de cinza 0..255 parado (Distance 0, Rotation 0,5) em vários Steps, sem High Quality:
# mostra para que valor cada nível de entrada vai (o arredondamento por cópia). Uso: py tools/compare/sondas/radial_quant.py
import array, json, os, sys, time
import numpy as np
from PIL import Image
AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, AQUI)
import gabarito as G
OUT = os.path.join(AQUI, 'saida', 'sonda_radial'); os.makedirs(OUT, exist_ok=True)
a = np.zeros((1080, 1920, 4), np.uint8); a[..., 3] = 255; a[..., :3] = (np.arange(1920) * 256 // 1920)[None, :, None]
Image.fromarray(a).save(os.path.join(OUT, 'rampa.png'))
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
G.abrir(os.path.join(OUT, 'rampa.png')); time.sleep(1.0)
ps = G.por('RadialBlur')['params']; time.sleep(0.8)
G.req('PUT', f"/parameter/by-id/{ps['Distance']['id']}", {'value': 0})
res = {}
for st in (0.1, 0.3, 0.5, 0.75, 1):
    G.req('PUT', f"/parameter/by-id/{ps['Steps']['id']}", {'value': st}); time.sleep(1.0)
    qs = []
    for _ in range(3): qs.append(cru()); time.sleep(2.5)
    m = np.median(np.stack(qs), 0).astype(np.uint8)
    res[str(st)] = [int(m[100, int((v + 0.5) * 7.5), 0]) for v in range(256)]
    print(st, res[str(st)][::8], flush=True)
json.dump(res, open(os.path.join(OUT, 'curvas.json'), 'w'))
G.limpar(); G.abrir(G.CARTA)
