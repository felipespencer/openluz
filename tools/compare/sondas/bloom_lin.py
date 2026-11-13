# Sonda do Bloom: quanto o centro de um quadrado grande (300 px) clareia conforme o brilho dele, o Amount, o Threshold e o Knee.
# Uso: py tools/compare/sondas/bloom_lin.py   -> saida/sonda_bloom/lin.json
import array, json, os, sys, time
import numpy as np
from PIL import Image
AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, AQUI)
import gabarito as G
OUT = os.path.join(AQUI, 'saida', 'sonda_bloom'); os.makedirs(OUT, exist_ok=True)
VAL = [2, 4, 8, 16, 32, 64, 128, 160, 192, 208, 224, 240, 255]
a = np.zeros((1080, 1920, 4), np.uint8); a[..., 3] = 255
for i, v in enumerate(VAL): a[390:690, 60 + i * 140:60 + i * 140 + 120, :3] = v     # 13 barras de 120 px, uma por valor
a[100:300, 60:260, :3] = (255, 0, 0); a[100:300, 360:560, :3] = (0, 255, 0); a[100:300, 660:860, :3] = (0, 0, 255); a[100:300, 960:1160, :3] = (255, 255, 0)
a[100:300, 1260:1460, :3] = (40, 20, 10)
Image.fromarray(a).save(os.path.join(OUT, 'barras.png'))
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
G.abrir(os.path.join(OUT, 'barras.png')); time.sleep(1.0)
ps = G.por('Bloom')['params']; time.sleep(0.8)
casos = [dict(Iterations=1, Threshold=0, Knee=0, Amount=x) for x in (0.1, 0.25, 0.5, 0.75, 1)]
casos += [dict(Iterations=1, Threshold=t, Knee=k, Amount=0.25) for t, k in ((0.9, 0.1), (0.5, 0), (0.5, 0.1), (0.5, 0.25), (0.5, 0.5), (0.5, 1), (0.25, 0), (0.75, 0), (0.9, 0), (0, 0.5), (1, 0.1), (1, 0.5))]
casos += [dict(Iterations=i, Threshold=0, Knee=0, Amount=x) for i in (2, 3, 4, 5) for x in (0.1, 0.25, 0.5)]
casos += [dict(Iterations=1, Threshold=0, Knee=0, Amount=0.25, Gaussian=g) for g in (0.1, 0.25, 0.75, 1)] + [dict(Iterations=1, Threshold=0, Knee=0, Amount=0.25, Size=x) for x in (0.05, 0.5, 1)]
res = []
for c in casos:
    for k, v in c.items(): G.req('PUT', f"/parameter/by-id/{ps[k]['id']}", {'value': v})
    time.sleep(1.0)
    qs = []
    for _ in range(3): qs.append(cru()); time.sleep(2.5)
    m = np.median(np.stack(qs), 0).astype(np.uint8)
    barras = [int(m[540, 120 + i * 140, 0]) for i in range(len(VAL))]
    cores = [[int(x) for x in m[200, cx, :3]] for cx in (160, 460, 760, 1060, 1360)]
    res.append({'caso': c, 'barras': barras, 'cores': cores}); print(c, barras, cores, flush=True)
    for k in c: G.req('PUT', f"/parameter/by-id/{ps[k]['id']}", {'value': ps[k]['value']})
json.dump({'val': VAL, 'res': res}, open(os.path.join(OUT, 'lin.json'), 'w'))
G.limpar(); G.abrir(G.CARTA)
