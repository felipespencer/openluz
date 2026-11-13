# Sonda do Bloom: fotografa o Resolume em resolução cheia com um quadrado escuro (16/255, 200 px) no centro, Threshold e Knee em 0, em vários
# Iterations/Size/Gaussian/Amount: cada amostra do efeito aparece como um ponto com o peso dela.
# Grava o recorte central (800x800) em saida/sonda_bloom/. Uso: py tools/compare/sondas/bloom_psf.py
import array, os, sys, time
import numpy as np
from PIL import Image
AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, AQUI)
import gabarito as G
OUT = os.path.join(AQUI, 'saida', 'sonda_bloom'); os.makedirs(OUT, exist_ok=True)
a = np.zeros((1080, 1920, 4), np.uint8); a[..., 3] = 255; a[540:542, 960:962, :3] = 255
Image.fromarray(a).save(os.path.join(OUT, 'ponto.png'))
casos = [dict(Iterations=1, Size=x) for x in (0.05, 0.1, 0.25, 0.5, 0.75, 1)]
casos += [dict(Iterations=1, Size=x, Gaussian=g) for x in (0.25, 1) for g in (0.1, 0.25, 0.75, 1)]
casos += [dict(Iterations=1, Amount=a) for a in (0.25, 0.5)]
casos += [dict(Iterations=i, Size=x) for i in (2, 3, 4, 5) for x in (0.25, 0.5, 1)]
casos += [dict(Iterations=i, Amount=0.5) for i in (2, 3)] + [dict(Iterations=3, Gaussian=g) for g in (0.25, 1)]
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
for lado in (200,):   # quadrado grande e escuro (16/255): não estoura e não se perde na redução
    a = np.zeros((1080, 1920, 4), np.uint8); a[..., 3] = 255; a[540 - lado // 2:540 + lado // 2, 960 - lado // 2:960 + lado // 2, :3] = 16
    Image.fromarray(a).save(os.path.join(OUT, f'ponto{lado}.png'))
    G.abrir(os.path.join(OUT, f'ponto{lado}.png')); time.sleep(1.0)
    ps = G.por('Bloom')['params']; time.sleep(0.8)
    for k in ('Threshold', 'Knee'): G.req('PUT', f"/parameter/by-id/{ps[k]['id']}", {'value': 0})   # tudo passa: o efeito fica linear
    for c in casos:
        for k, v in c.items(): G.req('PUT', f"/parameter/by-id/{ps[k]['id']}", {'value': v})
        time.sleep(1.0)
        qs = []
        for _ in range(3): qs.append(cru()); time.sleep(2.5)
        m = np.median(np.stack(qs), 0).astype(np.uint8); H, W = m.shape[:2]
        Image.fromarray(m[H // 2 - 400:H // 2 + 400]).save(os.path.join(OUT, f'q{lado}_' + '_'.join(f'{k[0]}{v}' for k, v in c.items()) + '.png'))
        for k in c: G.req('PUT', f"/parameter/by-id/{ps[k]['id']}", {'value': ps[k]['value']})
    print(lado, 'ok', flush=True)
print('feito', m.shape, flush=True)
G.limpar(); G.abrir(G.CARTA)
